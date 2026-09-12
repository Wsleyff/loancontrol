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
  status?: string;
  status_detail?: string;
  external_reference?: string;
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

function validateMercadoPagoSignature(
  request: Request,
  dataId: string
): boolean {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;

  /*
   * Durante o desenvolvimento, se ainda não configuramos
   * o segredo do webhook, não conseguimos validar a assinatura.
   *
   * Depois que configurarmos o webhook no Mercado Pago,
   * essa variável será obrigatória.
   */
  if (!secret) {
    console.error(
      "[MERCADO PAGO WEBHOOK] MERCADO_PAGO_WEBHOOK_SECRET não configurado."
    );

    return false;
  }

  const signature = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");

  if (!signature || !requestId || !dataId) {
    return false;
  }

  let ts = "";
  let v1 = "";

  const parts = signature.split(",");

  for (const part of parts) {
    const [key, value] = part.trim().split("=");

    if (key === "ts") {
      ts = value;
    }

    if (key === "v1") {
      v1 = value;
    }
  }

  if (!ts || !v1) {
    return false;
  }

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;

  const expectedSignature = createHmac(
    "sha256",
    secret
  )
    .update(manifest)
    .digest("hex");

  try {
    const receivedBuffer = Buffer.from(v1, "hex");
    const expectedBuffer = Buffer.from(
      expectedSignature,
      "hex"
    );

    if (receivedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(
      receivedBuffer,
      expectedBuffer
    );
  } catch {
    return false;
  }
}

function extractInstallmentId(
  externalReference: string | null | undefined
): string | null {
  if (!externalReference) {
    return null;
  }

  const prefix = "loancontrol-installment-";

  if (!externalReference.startsWith(prefix)) {
    return null;
  }

  const installmentId =
    externalReference.slice(prefix.length).trim();

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

export async function POST(request: Request) {
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

    const url = new URL(request.url);

    const type =
      url.searchParams.get("type") ||
      url.searchParams.get("topic");

    const queryDataId =
      url.searchParams.get("data.id") ||
      url.searchParams.get("id");

    let body: Record<string, unknown> = {};

    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const bodyData =
      body?.data &&
      typeof body.data === "object"
        ? (body.data as Record<string, unknown>)
        : null;

    const bodyDataId =
      typeof bodyData?.id === "string" ||
      typeof bodyData?.id === "number"
        ? String(bodyData.id)
        : "";

    const dataId =
      bodyDataId ||
      queryDataId ||
      "";

    console.log(
      "[MERCADO PAGO WEBHOOK] Recebido:",
      {
        type,
        dataId,
      }
    );

    /*
     * Só processamos notificações de Order.
     */
    if (
      type &&
      type !== "order" &&
      type !== "merchant_order"
    ) {
      return NextResponse.json({
        received: true,
        processed: false,
        reason: "Evento não utilizado.",
      });
    }

    if (!dataId) {
      return NextResponse.json(
        {
          error:
            "ID da Order não informado pelo Mercado Pago.",
        },
        { status: 400 }
      );
    }

    /*
     * A assinatura precisa ser validada antes
     * de processar a Order.
     */
    const signatureValid =
      validateMercadoPagoSignature(
        request,
        dataId
      );

    if (!signatureValid) {
      console.error(
        "[MERCADO PAGO WEBHOOK] Assinatura inválida ou segredo não configurado."
      );

      return NextResponse.json(
        {
          error: "Assinatura inválida.",
        },
        { status: 401 }
      );
    }

    /*
     * Consulta a Order diretamente na API do Mercado Pago.
     *
     * Nunca confiamos apenas no conteúdo enviado
     * pela notificação.
     */
    const mercadoPagoResponse = await fetch(
      `https://api.mercadopago.com/v1/orders/${encodeURIComponent(
        dataId
      )}`,
      {
        method: "GET",

        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },

        cache: "no-store",
      }
    );

    const mercadoPagoData =
      (await mercadoPagoResponse.json()) as MercadoPagoOrder;

    if (!mercadoPagoResponse.ok) {
      console.error(
        "[MERCADO PAGO WEBHOOK] Erro ao consultar Order:",
        mercadoPagoResponse.status,
        mercadoPagoData
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

    const externalReference =
      order.external_reference;

    const installmentId =
      extractInstallmentId(
        externalReference
      );

    if (!installmentId) {
      console.error(
        "[MERCADO PAGO WEBHOOK] external_reference inválida:",
        externalReference
      );

      /*
       * A Order não pertence ao nosso sistema.
       * Respondemos 200 para não ficar gerando
       * novas tentativas desnecessárias.
       */
      return NextResponse.json({
        received: true,
        processed: false,
        reason:
          "Order sem referência válida do LoanControl.",
      });
    }

    const payment =
      order.transactions?.payments?.[0];

    if (!payment) {
      console.error(
        "[MERCADO PAGO WEBHOOK] Order sem pagamento."
      );

      return NextResponse.json({
        received: true,
        processed: false,
        reason: "Order sem pagamento.",
      });
    }

    const paymentId =
      payment.id != null
        ? String(payment.id)
        : "";

    const paymentStatus =
      String(
        payment.status || ""
      ).toLowerCase();

    const paymentStatusDetail =
      payment.status_detail || "";

    /*
     * O pagamento só entra no saldo sacável
     * quando estiver efetivamente PROCESSADO.
     */
    if (paymentStatus !== "processed") {
      console.log(
        "[MERCADO PAGO WEBHOOK] Pagamento ainda não confirmado:",
        {
          orderId: dataId,
          paymentId,
          status: paymentStatus,
          statusDetail: paymentStatusDetail,
        }
      );

      return NextResponse.json({
        received: true,
        processed: false,
        payment_status: paymentStatus,
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
      Number(
        payment.paid_amount ??
          payment.amount ??
          0
      );

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        {
          error:
            "Valor confirmado pelo Mercado Pago inválido.",
        },
        { status: 502 }
      );
    }

    /*
     * Cria cliente administrativo.
     *
     * O webhook não possui sessão de usuário,
     * por isso usamos a Service Role exclusivamente
     * no servidor.
     */
    const supabase =
      getAdminClient();

    /*
     * A função SQL faz toda a operação de maneira
     * transacional e idempotente:
     *
     * - cria payment
     * - marca payment_source = MERCADO_PAGO
     * - marca gateway_status = APPROVED
     * - atualiza parcela
     * - atualiza empréstimo
     * - registra caixa
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
          new Date().toISOString(),
      }
    );

    if (registerError) {
      console.error(
        "[MERCADO PAGO WEBHOOK] Erro ao registrar pagamento:",
        registerError
      );

      return NextResponse.json(
        {
          error:
            "Não foi possível registrar o pagamento confirmado.",
          details:
            registerError.message,
        },
        { status: 500 }
      );
    }

    console.log(
      "[MERCADO PAGO WEBHOOK] Pagamento confirmado com sucesso:",
      {
        orderId: dataId,
        paymentId,
        installmentId,
        registeredPaymentId,
        amount,
      }
    );

    return NextResponse.json({
      received: true,

      processed: true,

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
  } catch (error) {
    console.error(
      "[MERCADO PAGO WEBHOOK] Erro inesperado:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Erro interno no webhook do Mercado Pago.",
      },
      { status: 500 }
    );
  }
}

/*
 * Alguns testes/serviços podem enviar GET
 * para verificar se a URL responde.
 */
export async function GET() {
  return NextResponse.json({
    service:
      "LoanControl Mercado Pago Webhook",
    status: "online",
  });
}