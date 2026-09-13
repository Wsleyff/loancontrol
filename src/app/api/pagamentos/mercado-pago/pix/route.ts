import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Configuração do Supabase não encontrada no servidor."
    );
  }

  return createAdminClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function normalizeAmount(value: unknown): number {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  return Math.round(amount * 100) / 100;
}

function getErrorMessage(data: any): string {
  if (!data) {
    return "O Mercado Pago recusou a criação do PIX.";
  }

  if (
    typeof data.message === "string" &&
    data.message.trim()
  ) {
    return data.message;
  }

  if (
    typeof data.error === "string" &&
    data.error.trim()
  ) {
    return data.error;
  }

  if (
    Array.isArray(data.cause) &&
    data.cause.length > 0
  ) {
    const firstCause = data.cause[0];

    if (typeof firstCause === "string") {
      return firstCause;
    }

    if (
      firstCause &&
      typeof firstCause.description === "string" &&
      firstCause.description.trim()
    ) {
      return firstCause.description;
    }

    if (
      firstCause &&
      typeof firstCause.code === "string" &&
      firstCause.code.trim()
    ) {
      return `Mercado Pago: ${firstCause.code}`;
    }
  }

  if (
    data.cause &&
    typeof data.cause === "string" &&
    data.cause.trim()
  ) {
    return data.cause;
  }

  if (
    typeof data.raw_response === "string" &&
    data.raw_response.trim()
  ) {
    return data.raw_response;
  }

  return "O Mercado Pago recusou a criação do PIX.";
}

export async function POST(
  request: NextRequest
) {
  try {
    /*
     * ============================================================
     * MERCADO PAGO
     * ============================================================
     */

    const accessToken =
      process.env.MERCADO_PAGO_ACCESS_TOKEN;

    if (!accessToken) {
      return NextResponse.json(
        {
          error:
            "MERCADO_PAGO_ACCESS_TOKEN não configurado no servidor.",
        },
        { status: 500 }
      );
    }

    /*
     * ============================================================
     * LÊ O BODY
     * ============================================================
     */

    const body = await request.json();

    /*
     * Aceita os dois formatos:
     *
     * installmentId
     * installment_id
     *
     * Isso evita o erro "Parcela não informada"
     * caso o frontend esteja usando camelCase.
     */

    const installmentId = String(
      body?.installmentId ??
        body?.installment_id ??
        ""
    ).trim();

    if (!installmentId) {
      return NextResponse.json(
        {
          error: "Parcela não informada.",
        },
        { status: 400 }
      );
    }

    /*
     * ============================================================
     * CLIENTE AUTENTICADO
     * ============================================================
     */

    const supabase =
      await createServerClient();

    const {
      data: {
        user,
      },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error:
            "Sua sessão expirou. Faça login novamente.",
        },
        { status: 401 }
      );
    }

    /*
     * ============================================================
     * CLIENTE DO PORTAL
     * ============================================================
     */

    const {
      data: customer,
      error: customerError,
    } = await supabase
      .from("customers")
      .select("*")
      .eq("auth_user_id", user.id)
      .eq("portal_enabled", true)
      .maybeSingle();

    if (customerError) {
      console.error(
        "[PIX] Erro ao buscar cliente:",
        customerError
      );

      return NextResponse.json(
        {
          error:
            "Não foi possível validar seu cadastro.",
        },
        { status: 500 }
      );
    }

    if (!customer) {
      return NextResponse.json(
        {
          error:
            "Cliente não encontrado ou portal desativado.",
        },
        { status: 403 }
      );
    }

    /*
     * ============================================================
     * CLIENTE ADMINISTRATIVO DO SUPABASE
     * ============================================================
     *
     * O service role fica somente no servidor.
     */

    const admin = getAdminClient();

    /*
     * ============================================================
     * BUSCA A PARCELA
     * ============================================================
     */

    const {
      data: installment,
      error: installmentError,
    } = await admin
      .from("loan_installments")
      .select("*")
      .eq("id", installmentId)
      .maybeSingle();

    if (installmentError) {
      console.error(
        "[PIX] Erro ao buscar parcela:",
        installmentError
      );

      return NextResponse.json(
        {
          error:
            "Não foi possível localizar a parcela.",
        },
        { status: 500 }
      );
    }

    if (!installment) {
      return NextResponse.json(
        {
          error: "Parcela não encontrada.",
        },
        { status: 404 }
      );
    }

    /*
     * ============================================================
     * BUSCA O EMPRÉSTIMO
     * ============================================================
     */

    const {
      data: loan,
      error: loanError,
    } = await admin
      .from("loans")
      .select("*")
      .eq("id", installment.loan_id)
      .maybeSingle();

    if (loanError) {
      console.error(
        "[PIX] Erro ao buscar empréstimo:",
        loanError
      );

      return NextResponse.json(
        {
          error:
            "Não foi possível validar o empréstimo.",
        },
        { status: 500 }
      );
    }

    if (!loan) {
      return NextResponse.json(
        {
          error:
            "Empréstimo não encontrado.",
        },
        { status: 404 }
      );
    }

    /*
     * ============================================================
     * SEGURANÇA
     * ============================================================
     *
     * Garante que a parcela pertence ao cliente logado.
     */

    if (
      String(loan.customer_id) !==
      String(customer.id)
    ) {
      return NextResponse.json(
        {
          error:
            "Esta parcela não pertence à sua conta.",
        },
        { status: 403 }
      );
    }

    /*
     * ============================================================
     * NÃO PERMITE PAGAMENTO DE PARCELA QUITADA
     * ============================================================
     */

    if (
      String(
        installment.status || ""
      ).toUpperCase() === "PAID"
    ) {
      return NextResponse.json(
        {
          error:
            "Esta parcela já está paga.",
        },
        { status: 409 }
      );
    }

    /*
     * ============================================================
     * CALCULA O VALOR REAL
     * ============================================================
     *
     * O valor enviado pelo navegador NÃO é confiado.
     *
     * O servidor calcula o saldo diretamente no banco.
     */

    const remainingAmount =
      normalizeAmount(
        installment.remaining_amount
      );

    const originalAmount =
      normalizeAmount(
        installment.amount
      );

    const amount =
      remainingAmount > 0
        ? remainingAmount
        : originalAmount;

    if (amount <= 0) {
      return NextResponse.json(
        {
          error:
            "Esta parcela não possui saldo para pagamento.",
        },
        { status: 400 }
      );
    }

    /*
     * ============================================================
     * E-MAIL DO PAGADOR
     * ============================================================
     */

    const payerEmail = String(
      customer.email ||
        user.email ||
        ""
    ).trim();

    if (!payerEmail) {
      return NextResponse.json(
        {
          error:
            "O cliente precisa possuir um e-mail cadastrado para gerar o PIX.",
        },
        { status: 400 }
      );
    }

    /*
     * ============================================================
     * REFERÊNCIA EXTERNA
     * ============================================================
     *
     * O webhook utiliza essa referência para descobrir
     * qual parcela foi paga.
     *
     * Somente letras, números e hífen.
     */

    const externalReference =
      `loancontrol-installment-${installment.id}`;

    /*
     * ============================================================
     * IDEMPOTÊNCIA
     * ============================================================
     */

    const idempotencyKey =
      `loancontrol-pix-${randomUUID()}`;

    /*
     * ============================================================
     * PAYLOAD MERCADO PAGO
     * ============================================================
     */

    const payload = {
      type: "online",

      processing_mode: "automatic",

      total_amount:
        amount.toFixed(2),

      external_reference:
        externalReference,

      transactions: {
        payments: [
          {
            amount:
              amount.toFixed(2),

            payment_method: {
              id: "pix",
              type: "bank_transfer",
            },
          },
        ],
      },

      payer: {
        email: payerEmail,
      },

      /*
       * Expiração de 1 dia.
       */
      expiration_time: "P1D",
    };

    console.log(
      "[PIX] Criando cobrança Mercado Pago:",
      {
        installmentId:
          installment.id,

        amount,

        externalReference,
      }
    );

    /*
     * ============================================================
     * CRIA PEDIDO NO MERCADO PAGO
     * ============================================================
     */

    const mercadoPagoResponse =
      await fetch(
        "https://api.mercadopago.com/v1/orders",
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${accessToken}`,

            Accept:
              "application/json",

            "Content-Type":
              "application/json",

            "X-Idempotency-Key":
              idempotencyKey,
          },

          body:
            JSON.stringify(payload),

          cache: "no-store",
        }
      );

    /*
     * ============================================================
     * LÊ RESPOSTA
     * ============================================================
     */

    const responseText =
      await mercadoPagoResponse.text();

    let mercadoPagoData: any = {};

    try {
      mercadoPagoData =
        responseText
          ? JSON.parse(responseText)
          : {};
    } catch {
      mercadoPagoData = {
        raw_response:
          responseText,
      };
    }

    /*
     * ============================================================
     * ERRO DO MERCADO PAGO
     * ============================================================
     */

    if (!mercadoPagoResponse.ok) {
      console.error(
        "[PIX] Mercado Pago recusou:",
        JSON.stringify(
          mercadoPagoData,
          null,
          2
        )
      );

      const message =
        getErrorMessage(
          mercadoPagoData
        );

      return NextResponse.json(
        {
          error: message,

          details:
            mercadoPagoData,

          mercado_pago_status:
            mercadoPagoResponse.status,
        },
        {
          status:
            mercadoPagoResponse.status >=
              400 &&
            mercadoPagoResponse.status <
              500
              ? 400
              : 502,
        }
      );
    }

    /*
     * ============================================================
     * LOCALIZA OS DADOS DO PIX
     * ============================================================
     */

    const payment =
      mercadoPagoData
        ?.transactions
        ?.payments?.[0];

    const paymentMethod =
      payment?.payment_method;

    const qrCode =
      paymentMethod?.qr_code ||
      mercadoPagoData?.qr_code ||
      "";

    const qrCodeBase64 =
      paymentMethod?.qr_code_base64 ||
      mercadoPagoData?.qr_code_base64 ||
      "";

    const ticketUrl =
      paymentMethod?.ticket_url ||
      mercadoPagoData?.ticket_url ||
      null;

    /*
     * ============================================================
     * VERIFICA QR CODE
     * ============================================================
     */

    if (!qrCode) {
      console.error(
        "[PIX] Mercado Pago não retornou QR Code:",
        JSON.stringify(
          mercadoPagoData,
          null,
          2
        )
      );

      return NextResponse.json(
        {
          error:
            "O Mercado Pago criou a cobrança, mas não retornou o código PIX.",

          order_id:
            mercadoPagoData?.id ||
            null,

          details:
            mercadoPagoData,
        },
        { status: 502 }
      );
    }

    /*
     * ============================================================
     * RESPOSTA PARA O PORTAL DO CLIENTE
     * ============================================================
     */

    return NextResponse.json({
      success: true,

      order_id:
        mercadoPagoData?.id ||
        null,

      orderId:
        mercadoPagoData?.id ||
        null,

      installment_id:
        installment.id,

      installmentId:
        installment.id,

      amount,

      qr_code:
        qrCode,

      qrCode:
        qrCode,

      qr_code_base64:
        qrCodeBase64,

      qrCodeBase64:
        qrCodeBase64,

      ticket_url:
        ticketUrl,

      ticketUrl:
        ticketUrl,

      status:
        mercadoPagoData?.status ||
        "action_required",

      status_detail:
        mercadoPagoData?.status_detail ||
        "waiting_transfer",
    });
  } catch (error: any) {
    /*
     * ============================================================
     * ERRO GERAL
     * ============================================================
     */

    console.error(
      "[PIX] Erro inesperado:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Erro interno ao gerar o PIX.",
      },
      { status: 500 }
    );
  }
}

/*
 * ================================================================
 * HEALTH CHECK
 * ================================================================
 */

export async function GET() {
  return NextResponse.json({
    ok: true,

    service:
      "LoanControl Mercado Pago PIX",

    environment:
      process.env.VERCEL_ENV ||
      "development",
  });
}