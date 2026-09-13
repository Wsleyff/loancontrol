import { NextRequest, NextResponse } from "next/server";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Configuração do Supabase não encontrada no servidor."
    );
  }

  return createAdminClient(
    url,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

function normalizeAmount(
  value: unknown
) {
  const amount = Number(value);

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return 0;
  }

  return Math.round(
    amount * 100
  ) / 100;
}

export async function POST(
  request: NextRequest
) {
  try {
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

    const body = await request.json();

    const installmentId =
      String(
        body?.installment_id || ""
      ).trim();

    if (!installmentId) {
      return NextResponse.json(
        {
          error:
            "Parcela não informada.",
        },
        { status: 400 }
      );
    }

    /*
     * Cliente autenticado no portal.
     */
    const supabase =
      await createServerClient();

    const {
      data: {
        user,
      },
      error: userError,
    } =
      await supabase.auth.getUser();

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
     * Cliente vinculado ao usuário.
     */
    const {
      data: customer,
      error: customerError,
    } =
      await supabase
        .from("customers")
        .select("*")
        .eq(
          "auth_user_id",
          user.id
        )
        .eq(
          "portal_enabled",
          true
        )
        .maybeSingle();

    if (customerError) {
      console.error(
        "[PIX] Cliente:",
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
     * Admin client somente no servidor.
     */
    const admin =
      getAdminClient();

    /*
     * Busca a parcela.
     */
    const {
      data: installment,
      error: installmentError,
    } =
      await admin
        .from("loan_installments")
        .select("*")
        .eq(
          "id",
          installmentId
        )
        .maybeSingle();

    if (installmentError) {
      console.error(
        "[PIX] Parcela:",
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
          error:
            "Parcela não encontrada.",
        },
        { status: 404 }
      );
    }

    /*
     * Busca o empréstimo para garantir
     * que a parcela pertence ao cliente
     * autenticado.
     */
    const {
      data: loan,
      error: loanError,
    } =
      await admin
        .from("loans")
        .select("*")
        .eq(
          "id",
          installment.loan_id
        )
        .maybeSingle();

    if (loanError) {
      console.error(
        "[PIX] Empréstimo:",
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
     * Não permite gerar PIX para parcela
     * já quitada.
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
     * O valor do PIX é somente o saldo atual
     * da parcela.
     */
    const remaining =
      normalizeAmount(
        installment.remaining_amount
      );

    const originalAmount =
      normalizeAmount(
        installment.amount
      );

    const amount =
      remaining > 0
        ? remaining
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
     * E-mail do cliente.
     *
     * Se o cadastro não possuir e-mail,
     * usamos o e-mail autenticado.
     */
    const payerEmail =
      String(
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
     * O external_reference identifica
     * exatamente qual parcela será atualizada
     * pelo Webhook.
     *
     * IMPORTANTE:
     * somente letras, números e hífen.
     */
    const externalReference =
      `loancontrol-installment-${installment.id}`;

    /*
     * Idempotência da requisição.
     */
    const idempotencyKey =
      `loancontrol-${installment.id}-${Date.now()}`;

    const mercadoPagoResponse =
      await fetch(
        "https://api.mercadopago.com/v1/orders",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type":
              "application/json",
            "X-Idempotency-Key":
              idempotencyKey,
          },
          body: JSON.stringify({
            type: "online",
            processing_mode:
              "automatic",
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
              email:
                payerEmail,
            },
          }),
        }
      );

    const mercadoPagoData =
      await mercadoPagoResponse.json();

    if (!mercadoPagoResponse.ok) {
      console.error(
        "[PIX] Mercado Pago:",
        JSON.stringify(
          mercadoPagoData,
          null,
          2
        )
      );

      return NextResponse.json(
        {
          error:
            mercadoPagoData?.message ||
            mercadoPagoData?.error ||
            "O Mercado Pago recusou a criação do PIX.",
          details:
            mercadoPagoData,
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

    const qrCode =
      mercadoPagoData?.transactions
        ?.payments?.[0]
        ?.payment_method
        ?.qr_code ||
      mercadoPagoData?.qr_code ||
      "";

    const qrCodeBase64 =
      mercadoPagoData?.transactions
        ?.payments?.[0]
        ?.payment_method
        ?.qr_code_base64 ||
      mercadoPagoData?.qr_code_base64 ||
      "";

    const ticketUrl =
      mercadoPagoData?.transactions
        ?.payments?.[0]
        ?.payment_method
        ?.ticket_url ||
      mercadoPagoData?.ticket_url ||
      null;

    /*
     * Dependendo da resposta do Orders API,
     * os dados podem estar em estruturas
     * ligeiramente diferentes.
     */
    if (
      !qrCode ||
      !qrCodeBase64
    ) {
      console.error(
        "[PIX] Resposta sem QR Code:",
        JSON.stringify(
          mercadoPagoData,
          null,
          2
        )
      );

      return NextResponse.json(
        {
          error:
            "O Mercado Pago criou a cobrança, mas não retornou o QR Code PIX.",
          order_id:
            mercadoPagoData?.id ||
            null,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,

      order_id:
        mercadoPagoData.id,

      installment_id:
        installment.id,

      amount,

      qr_code:
        qrCode,

      qr_code_base64:
        qrCodeBase64,

      ticket_url:
        ticketUrl,

      status:
        mercadoPagoData.status ||
        "action_required",

      status_detail:
        mercadoPagoData.status_detail ||
        "waiting_transfer",
    });
  } catch (error: any) {
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

export async function GET() {
  return NextResponse.json({
    ok: true,
    service:
      "LoanControl Mercado Pago PIX",
  });
}