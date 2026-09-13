import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";

type MercadoPagoPayment = {
  id?: string | number;
  status?: string;
  status_detail?: string;
  amount?: number | string;
  paid_amount?: number | string;
};

type MercadoPagoOrder = {
  id?: string | number;
  type?: string;
  status?: string;
  status_detail?: string;
  external_reference?: string;
  total_amount?: number | string;
  total_paid_amount?: number | string;
  transactions?: {
    payments?: MercadoPagoPayment[];
  };
};

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurado."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function normalizeAmount(value: unknown): number {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return 0;
  }

  return Math.round(amount * 100) / 100;
}

function validateMercadoPagoSignature(
  request: Request,
  dataId: string
): boolean {
  const secret =
    process.env.MERCADO_PAGO_WEBHOOK_SECRET;

  if (!secret) {
    console.error(
      "[MERCADO PAGO WEBHOOK] MERCADO_PAGO_WEBHOOK_SECRET não configurado."
    );

    return false;
  }

  const signature =
    request.headers.get("x-signature");

  const requestId =
    request.headers.get("x-request-id");

  if (!signature || !requestId || !dataId) {
    console.error(
      "[MERCADO PAGO WEBHOOK] Headers de assinatura ausentes."
    );

    return false;
  }

  let ts = "";
  let v1 = "";

  const parts = signature.split(",");

  for (const part of parts) {
    const separatorIndex = part.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = part
      .slice(0, separatorIndex)
      .trim();

    const value = part
      .slice(separatorIndex + 1)
      .trim();

    if (key === "ts") {
      ts = value;
    }

    if (key === "v1") {
      v1 = value;
    }
  }

  if (!ts || !v1) {
    console.error(
      "[MERCADO PAGO WEBHOOK] Assinatura sem ts ou v1."
    );

    return false;
  }

  /*
   * Formato oficial do Mercado Pago:
   *
   * id:{data.id};
   * request-id:{x-request-id};
   * ts:{ts};
   */
  const manifest =
    `id:${dataId};request-id:${requestId};ts:${ts};`;

  const expectedSignature =
    createHmac("sha256", secret)
      .update(manifest)
      .digest("hex");

  try {
    const receivedBuffer =
      Buffer.from(v1, "hex");

    const expectedBuffer =
      Buffer.from(
        expectedSignature,
        "hex"
      );

    if (
      receivedBuffer.length !==
      expectedBuffer.length
    ) {
      return false;
    }

    return timingSafeEqual(
      receivedBuffer,
      expectedBuffer
    );
  } catch (error) {
    console.error(
      "[MERCADO PAGO WEBHOOK] Erro ao validar assinatura:",
      error
    );

    return false;
  }
}

function extractInstallmentId(
  externalReference:
    | string
    | null
    | undefined
): string | null {
  if (!externalReference) {
    return null;
  }

  const prefix =
    "loancontrol-installment-";

  if (
    !externalReference.startsWith(
      prefix
    )
  ) {
    return null;
  }

  const installmentId =
    externalReference
      .slice(prefix.length)
      .trim();

  /*
   * UUID padrão.
   */
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(installmentId)) {
    return null;
  }

  return installmentId;
}

async function registerDirectly(
  supabase: ReturnType<typeof getAdminClient>,
  installmentId: string,
  mercadoPagoPaymentId: string,
  mercadoPagoStatus: string,
  amount: number,
  confirmedAt: string
) {
  /*
   * Primeiro verificamos se esse pagamento já foi
   * registrado.
   *
   * Isso deixa o webhook idempotente.
   */
  const {
    data: existingPayment,
    error: existingPaymentError,
  } = await supabase
    .from("payments")
    .select("*")
    .eq(
      "mercado_pago_payment_id",
      mercadoPagoPaymentId
    )
    .maybeSingle();

  if (existingPaymentError) {
    throw new Error(
      `Erro ao verificar pagamento existente: ${existingPaymentError.message}`
    );
  }

  if (existingPayment) {
    console.log(
      "[MERCADO PAGO WEBHOOK] Pagamento já registrado:",
      existingPayment.id
    );

    return {
      paymentId: existingPayment.id,
      alreadyRegistered: true,
    };
  }

  /*
   * Busca a parcela.
   */
  const {
    data: installment,
    error: installmentError,
  } = await supabase
    .from("loan_installments")
    .select("*")
    .eq("id", installmentId)
    .maybeSingle();

  if (installmentError) {
    throw new Error(
      `Erro ao buscar parcela: ${installmentError.message}`
    );
  }

  if (!installment) {
    throw new Error(
      "Parcela não encontrada para o pagamento Mercado Pago."
    );
  }

  /*
   * Se já estiver paga, não criamos outro pagamento.
   */
  if (
    String(
      installment.status || ""
    ).toUpperCase() === "PAID"
  ) {
    console.log(
      "[MERCADO PAGO WEBHOOK] Parcela já está paga:",
      installmentId
    );

    return {
      paymentId: null,
      alreadyRegistered: true,
      installmentAlreadyPaid: true,
    };
  }

  const installmentAmount =
    normalizeAmount(
      installment.amount
    );

  const currentPaid =
    normalizeAmount(
      installment.paid_amount
    );

  const discount =
    normalizeAmount(
      installment.discount_amount
    );

  const lateFee =
    normalizeAmount(
      installment.late_fee_amount
    );

  const calculatedRemaining =
    Math.max(
      0,
      Math.round(
        (
          installmentAmount +
          lateFee -
          discount -
          currentPaid
        ) * 100
      ) / 100
    );

  const currentRemaining =
    normalizeAmount(
      installment.remaining_amount
    );

  /*
   * Usamos o menor saldo positivo disponível.
   */
  const remaining =
    currentRemaining > 0
      ? currentRemaining
      : calculatedRemaining;

  if (remaining <= 0) {
    throw new Error(
      "A parcela não possui saldo pendente."
    );
  }

  /*
   * Nunca deixamos um webhook pagar mais
   * que o saldo da parcela.
   */
  const paymentAmount =
    Math.min(
      amount,
      remaining
    );

  if (paymentAmount <= 0) {
    throw new Error(
      "Valor do pagamento Mercado Pago inválido."
    );
  }

  const newPaidAmount =
    Math.round(
      (
        currentPaid +
        paymentAmount
      ) * 100
    ) / 100;

  const newRemaining =
    Math.max(
      0,
      Math.round(
        (
          installmentAmount +
          lateFee -
          discount -
          newPaidAmount
        ) * 100
      ) / 100
    );

  const newStatus =
    newRemaining <= 0
      ? "PAID"
      : "PARTIAL";

  /*
   * Registra o pagamento Mercado Pago.
   */
  const {
    data: payment,
    error: paymentInsertError,
  } = await supabase
    .from("payments")
    .insert({
      company_id:
        installment.company_id,

      loan_id:
        installment.loan_id,

      installment_id:
        installment.id,

      customer_id:
        null,

      received_by:
        null,

      amount:
        paymentAmount,

      payment_method:
        "PIX",

      notes:
        "Pagamento PIX confirmado pelo Mercado Pago.",

      payment_source:
        "MERCADO_PAGO",

      gateway_status:
        "APPROVED",

      mercado_pago_payment_id:
        mercadoPagoPaymentId,

      mercado_pago_status:
        mercadoPagoStatus,

      confirmed_at:
        confirmedAt,
    })
    .select("id")
    .single();

  if (paymentInsertError) {
    /*
     * Pode acontecer uma corrida de webhook:
     * outro webhook pode ter inserido o mesmo pagamento
     * entre a verificação e o INSERT.
     *
     * Tentamos localizar novamente.
     */
    const {
      data: duplicatedPayment,
    } = await supabase
      .from("payments")
      .select("id")
      .eq(
        "mercado_pago_payment_id",
        mercadoPagoPaymentId
      )
      .maybeSingle();

    if (duplicatedPayment) {
      return {
        paymentId:
          duplicatedPayment.id,
        alreadyRegistered: true,
      };
    }

    throw new Error(
      `Erro ao registrar pagamento: ${paymentInsertError.message}`
    );
  }

  /*
   * Atualiza a parcela.
   */
  const {
    error: installmentUpdateError,
  } = await supabase
    .from("loan_installments")
    .update({
      paid_amount:
        newPaidAmount,

      remaining_amount:
        newRemaining,

      status:
        newStatus,

      paid_at:
        newStatus === "PAID"
          ? confirmedAt
          : installment.paid_at,
    })
    .eq(
      "id",
      installment.id
    );

  if (installmentUpdateError) {
    console.error(
      "[MERCADO PAGO WEBHOOK] Erro ao atualizar parcela depois de registrar pagamento:",
      installmentUpdateError
    );

    throw new Error(
      `Pagamento registrado, mas não foi possível atualizar a parcela: ${installmentUpdateError.message}`
    );
  }

  /*
   * Verifica se todas as parcelas do empréstimo
   * foram pagas.
   */
  const {
    data: allInstallments,
    error: allInstallmentsError,
  } = await supabase
    .from("loan_installments")
    .select(
      "id,status,remaining_amount"
    )
    .eq(
      "loan_id",
      installment.loan_id
    );

  if (!allInstallmentsError &&
      allInstallments) {
    const allPaid =
      allInstallments.length > 0 &&
      allInstallments.every(
        (item) =>
          String(
            item.status || ""
          ).toUpperCase() === "PAID" ||
          normalizeAmount(
            item.remaining_amount
          ) <= 0
      );

    if (allPaid) {
      const {
        error: loanUpdateError,
      } = await supabase
        .from("loans")
        .update({
          status: "PAID",
        })
        .eq(
          "id",
          installment.loan_id
        );

      if (loanUpdateError) {
        console.error(
          "[MERCADO PAGO WEBHOOK] Erro ao atualizar empréstimo para PAID:",
          loanUpdateError
        );
      }
    }
  }

  /*
   * Registra o movimento financeiro.
   *
   * Não usamos received_by/auth.uid aqui porque
   * webhook não possui sessão de usuário.
   */
  try {
    const {
      error: cashError,
    } = await supabase
      .from("cash_movements")
      .insert({
        company_id:
          installment.company_id,

        type:
          "INCOME",

        category:
          "PAYMENT",

        description:
          "Pagamento PIX Mercado Pago",

        amount:
          paymentAmount,

        reference_type:
          "PAYMENT",

        reference_id:
          payment.id,

        created_by:
          null,
      });

    if (cashError) {
      console.error(
        "[MERCADO PAGO WEBHOOK] Pagamento confirmado, mas erro ao registrar caixa:",
        cashError
      );
    }
  } catch (cashError) {
    console.error(
      "[MERCADO PAGO WEBHOOK] Erro inesperado ao registrar caixa:",
      cashError
    );
  }

  return {
    paymentId:
      payment.id,
    alreadyRegistered:
      false,
    installmentAlreadyPaid:
      false,
  };
}

export async function POST(
  request: Request
) {
  try {
    const accessToken =
      process.env.MERCADO_PAGO_ACCESS_TOKEN;

    if (!accessToken) {
      console.error(
        "[MERCADO PAGO WEBHOOK] Access Token não configurado."
      );

      return NextResponse.json(
        {
          error:
            "MERCADO_PAGO_ACCESS_TOKEN não configurado.",
        },
        { status: 500 }
      );
    }

    const url =
      new URL(request.url);

    const type =
      url.searchParams.get("type") ||
      url.searchParams.get("topic");

    const queryDataId =
      url.searchParams.get("data.id") ||
      url.searchParams.get("id");

    let body:
      Record<string, any> = {};

    try {
      body =
        await request.json();
    } catch {
      body = {};
    }

    const bodyData =
      body?.data &&
      typeof body.data === "object"
        ? body.data
        : null;

    const bodyDataId =
      bodyData?.id != null
        ? String(bodyData.id)
        : "";

    /*
     * O Mercado Pago envia data.id tanto
     * no query parameter quanto no body.
     */
    const dataId =
      bodyDataId ||
      queryDataId ||
      "";

    console.log(
      "[MERCADO PAGO WEBHOOK] Notificação recebida:",
      {
        type,
        dataId,
        action:
          body?.action ||
          null,
        liveMode:
          body?.live_mode ??
          null,
      }
    );

    /*
     * O produto usa notificações de Order.
     */
    if (
      type &&
      type !== "order"
    ) {
      console.log(
        "[MERCADO PAGO WEBHOOK] Evento ignorado:",
        type
      );

      return NextResponse.json({
        received: true,
        processed: false,
        reason:
          "Evento não utilizado.",
      });
    }

    if (!dataId) {
      console.error(
        "[MERCADO PAGO WEBHOOK] ID da Order não encontrado."
      );

      /*
       * Respondemos 200 para evitar loops
       * quando a notificação não contém recurso.
       */
      return NextResponse.json({
        received: true,
        processed: false,
        reason:
          "ID da Order não informado.",
      });
    }

    /*
     * Validação obrigatória da assinatura.
     */
    const signatureValid =
      validateMercadoPagoSignature(
        request,
        dataId
      );

    if (!signatureValid) {
      console.error(
        "[MERCADO PAGO WEBHOOK] Assinatura inválida."
      );

      return NextResponse.json(
        {
          error:
            "Assinatura inválida.",
        },
        { status: 401 }
      );
    }

    /*
     * Consulta a Order diretamente no Mercado Pago.
     *
     * Não confiamos somente no payload recebido.
     */
    const mercadoPagoResponse =
      await fetch(
        `https://api.mercadopago.com/v1/orders/${encodeURIComponent(
          dataId
        )}`,
        {
          method: "GET",

          headers: {
            Accept:
              "application/json",

            Authorization:
              `Bearer ${accessToken}`,
          },

          cache:
            "no-store",
        }
      );

    const responseText =
      await mercadoPagoResponse.text();

    let mercadoPagoData:
      MercadoPagoOrder = {};

    try {
      mercadoPagoData =
        responseText
          ? JSON.parse(
              responseText
            )
          : {};
    } catch {
      mercadoPagoData = {};
    }

    if (!mercadoPagoResponse.ok) {
      console.error(
        "[MERCADO PAGO WEBHOOK] Erro ao consultar Order:",
        {
          status:
            mercadoPagoResponse.status,

          response:
            mercadoPagoData,
        }
      );

      return NextResponse.json(
        {
          error:
            "Não foi possível consultar a Order no Mercado Pago.",
        },
        { status: 502 }
      );
    }

    const order =
      mercadoPagoData;

    console.log(
      "[MERCADO PAGO WEBHOOK] Order consultada:",
      {
        orderId:
          order.id ||
          dataId,

        status:
          order.status,

        statusDetail:
          order.status_detail,

        externalReference:
          order.external_reference,
      }
    );

    const installmentId =
      extractInstallmentId(
        order.external_reference
      );

    if (!installmentId) {
      console.error(
        "[MERCADO PAGO WEBHOOK] Referência inválida:",
        order.external_reference
      );

      return NextResponse.json({
        received: true,
        processed: false,
        reason:
          "Order sem referência válida do LoanControl.",
      });
    }

    const payment =
      order.transactions
        ?.payments?.[0];

    if (!payment) {
      console.error(
        "[MERCADO PAGO WEBHOOK] Order sem pagamento."
      );

      return NextResponse.json({
        received: true,
        processed: false,
        reason:
          "Order sem pagamento.",
      });
    }

    const paymentId =
      payment.id != null
        ? String(payment.id)
        : "";

    const paymentStatus =
      String(
        payment.status ||
          order.status ||
          ""
      ).toLowerCase();

    const paymentStatusDetail =
      payment.status_detail ||
      order.status_detail ||
      "";

    console.log(
      "[MERCADO PAGO WEBHOOK] Status do pagamento:",
      {
        orderId:
          dataId,

        paymentId,

        paymentStatus,

        paymentStatusDetail,
      }
    );

    /*
     * Somente pagamento PROCESSADO/ACREDITADO
     * pode quitar a parcela e entrar no saldo
     * sacável da empresa.
     */
    if (
      paymentStatus !==
      "processed"
    ) {
      console.log(
        "[MERCADO PAGO WEBHOOK] Pagamento ainda não processado."
      );

      return NextResponse.json({
        received: true,

        processed: false,

        payment_status:
          paymentStatus,

        status_detail:
          paymentStatusDetail,
      });
    }

    if (!paymentId) {
      return NextResponse.json(
        {
          error:
            "Mercado Pago não retornou o ID do pagamento.",
        },
        { status: 502 }
      );
    }

    const amount =
      normalizeAmount(
        payment.paid_amount ??
          payment.amount ??
          order.total_paid_amount ??
          order.total_amount ??
          0
      );

    if (amount <= 0) {
      return NextResponse.json(
        {
          error:
            "Valor confirmado pelo Mercado Pago inválido.",
        },
        { status: 502 }
      );
    }

    const supabase =
      getAdminClient();

    const confirmedAt =
      new Date().toISOString();

    /*
     * PRIMEIRA TENTATIVA
     *
     * Usa a função SQL existente.
     */
    const {
      data: registeredPaymentId,
      error: registerError,
    } = await supabase.rpc(
      "register_mercado_pago_payment",
      {
        p_installment_id:
          installmentId,

        p_mercado_pago_payment_id:
          paymentId,

        p_mercado_pago_status:
          paymentStatus,

        p_amount:
          amount,

        p_confirmed_at:
          confirmedAt,
      }
    );

    if (!registerError) {
      console.log(
        "[MERCADO PAGO WEBHOOK] Pagamento registrado pela RPC:",
        {
          orderId:
            dataId,

          paymentId,

          installmentId,

          registeredPaymentId,

          amount,
        }
      );

      return NextResponse.json({
        received: true,

        processed: true,

        method:
          "rpc",

        order_id:
          dataId,

        mercado_pago_payment_id:
          paymentId,

        installment_id:
          installmentId,

        payment_id:
          registeredPaymentId,

        amount,

        status:
          "APPROVED",
      });
    }

    /*
     * A RPC falhou.
     *
     * Em vez de perder o pagamento,
     * fazemos o registro diretamente usando
     * a Service Role.
     */
    console.error(
      "[MERCADO PAGO WEBHOOK] RPC falhou. Ativando fallback:",
      {
        message:
          registerError.message,

        details:
          registerError.details,

        hint:
          registerError.hint,

        code:
          registerError.code,
      }
    );

    const fallback =
      await registerDirectly(
        supabase,
        installmentId,
        paymentId,
        paymentStatus,
        amount,
        confirmedAt
      );

    console.log(
      "[MERCADO PAGO WEBHOOK] Pagamento registrado pelo fallback:",
      {
        orderId:
          dataId,

        paymentId,

        installmentId,

        registeredPaymentId:
          fallback.paymentId,

        amount,

        alreadyRegistered:
          fallback.alreadyRegistered,
      }
    );

    return NextResponse.json({
      received: true,

      processed: true,

      method:
        "direct-fallback",

      order_id:
        dataId,

      mercado_pago_payment_id:
        paymentId,

      installment_id:
        installmentId,

      payment_id:
        fallback.paymentId,

      amount,

      status:
        "APPROVED",

      already_registered:
        fallback.alreadyRegistered,
    });
  } catch (error: any) {
    console.error(
      "[MERCADO PAGO WEBHOOK] ERRO FATAL:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Erro interno no webhook do Mercado Pago.",

        message:
          error?.message ||
          "Erro desconhecido.",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service:
      "LoanControl Mercado Pago Webhook",

    status:
      "online",

    environment:
      process.env.VERCEL_ENV ||
      "development",
  });
}