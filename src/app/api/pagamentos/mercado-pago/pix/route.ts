import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";

type Installment = {
  id: string;
  company_id: string;
  loan_id: string;
  amount: number | string;
  paid_amount: number | string;
  discount_amount: number | string;
  late_fee_amount: number | string;
  remaining_amount: number | string;
  status: string;
};

type Loan = {
  id: string;
  customer_id: string;
};

type Customer = {
  id: string;
  full_name: string;
  email: string | null;
};

export async function POST(request: Request) {
  try {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

    if (!accessToken) {
      return NextResponse.json(
        {
          error:
            "MERCADO_PAGO_ACCESS_TOKEN não está configurado no .env.local.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const installmentId =
      typeof body?.installmentId === "string"
        ? body.installmentId.trim()
        : "";

    if (!installmentId) {
      return NextResponse.json(
        {
          error: "installmentId é obrigatório.",
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Usuário não autenticado.",
        },
        { status: 401 }
      );
    }

    const { data: installmentData, error: installmentError } =
      await supabase
        .from("loan_installments")
        .select(
          `
          id,
          company_id,
          loan_id,
          amount,
          paid_amount,
          discount_amount,
          late_fee_amount,
          remaining_amount,
          status
        `
        )
        .eq("id", installmentId)
        .maybeSingle();

    if (installmentError) {
      console.error(
        "[MERCADO PAGO] Erro ao buscar parcela:",
        installmentError
      );

      return NextResponse.json(
        {
          error: "Não foi possível consultar a parcela.",
          details: installmentError.message,
        },
        { status: 500 }
      );
    }

    if (!installmentData) {
      return NextResponse.json(
        {
          error: "Parcela não encontrada.",
        },
        { status: 404 }
      );
    }

    const installment = installmentData as Installment;

    const { data: membership, error: membershipError } =
      await supabase
        .from("company_users")
        .select("id, role, status")
        .eq("company_id", installment.company_id)
        .eq("user_id", user.id)
        .eq("status", "ACTIVE")
        .maybeSingle();

    if (membershipError) {
      console.error(
        "[MERCADO PAGO] Erro ao verificar empresa:",
        membershipError
      );

      return NextResponse.json(
        {
          error: "Não foi possível validar o acesso à empresa.",
        },
        { status: 500 }
      );
    }

    if (!membership) {
      return NextResponse.json(
        {
          error: "Você não possui acesso a esta empresa.",
        },
        { status: 403 }
      );
    }

    if (installment.status === "PAID") {
      return NextResponse.json(
        {
          error: "Esta parcela já está paga.",
        },
        { status: 400 }
      );
    }

    const amount = Number(installment.amount || 0);
    const paidAmount = Number(installment.paid_amount || 0);
    const discountAmount = Number(installment.discount_amount || 0);
    const lateFeeAmount = Number(installment.late_fee_amount || 0);

    const calculatedRemaining =
      amount + lateFeeAmount - discountAmount - paidAmount;

    const databaseRemaining = Number(
      installment.remaining_amount ?? calculatedRemaining
    );

    const remainingAmount =
      databaseRemaining > 0 ? databaseRemaining : calculatedRemaining;

    if (!Number.isFinite(remainingAmount) || remainingAmount <= 0) {
      return NextResponse.json(
        {
          error: "Esta parcela não possui saldo para pagamento.",
        },
        { status: 400 }
      );
    }

    const { data: loanData, error: loanError } = await supabase
      .from("loans")
      .select("id, customer_id")
      .eq("id", installment.loan_id)
      .maybeSingle();

    if (loanError) {
      console.error(
        "[MERCADO PAGO] Erro ao buscar empréstimo:",
        loanError
      );

      return NextResponse.json(
        {
          error: "Não foi possível consultar o empréstimo.",
        },
        { status: 500 }
      );
    }

    if (!loanData) {
      return NextResponse.json(
        {
          error: "Empréstimo não encontrado.",
        },
        { status: 404 }
      );
    }

    const loan = loanData as Loan;

    const { data: customerData, error: customerError } =
      await supabase
        .from("customers")
        .select("id, full_name, email")
        .eq("id", loan.customer_id)
        .maybeSingle();

    if (customerError) {
      console.error(
        "[MERCADO PAGO] Erro ao buscar cliente:",
        customerError
      );

      return NextResponse.json(
        {
          error: "Não foi possível consultar o cliente.",
        },
        { status: 500 }
      );
    }

    if (!customerData) {
      return NextResponse.json(
        {
          error: "Cliente não encontrado.",
        },
        { status: 404 }
      );
    }

    const customer = customerData as Customer;

    const customerEmail = customer.email?.trim();

    if (!customerEmail) {
      return NextResponse.json(
        {
          error:
            "O cliente precisa ter um e-mail cadastrado para gerar o pagamento Pix.",
        },
        { status: 400 }
      );
    }

    /*
     * IMPORTANTE:
     * O Mercado Pago aceita somente letras, números, hífen e underscore
     * em external_reference.
     *
     * Esse formato também será usado posteriormente pelo webhook
     * para localizar a parcela.
     */
    const externalReference =
      `loancontrol-installment-${installment.id}`;

    const idempotencyKey = randomUUID();

    const amountFormatted = remainingAmount.toFixed(2);

    const mercadoPagoResponse = await fetch(
      "https://api.mercadopago.com/v1/orders",
      {
        method: "POST",

        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "X-Idempotency-Key": idempotencyKey,
        },

        body: JSON.stringify({
          type: "online",

          processing_mode: "automatic",

          total_amount: amountFormatted,

          external_reference: externalReference,

          transactions: {
            payments: [
              {
                amount: amountFormatted,

                payment_method: {
                  id: "pix",
                  type: "bank_transfer",
                },
              },
            ],
          },

          payer: {
            email: customerEmail,
          },
        }),
      }
    );

    const mercadoPagoData = await mercadoPagoResponse.json();

    if (!mercadoPagoResponse.ok) {
      console.error(
        "[MERCADO PAGO] Erro ao criar order:",
        mercadoPagoResponse.status,
        mercadoPagoData
      );

      return NextResponse.json(
        {
          error: "O Mercado Pago recusou a criação da cobrança.",

          mercado_pago_status: mercadoPagoResponse.status,

          details:
            mercadoPagoData?.message ||
            mercadoPagoData?.error ||
            "Erro desconhecido no Mercado Pago.",
        },
        { status: 502 }
      );
    }

    const payment =
      mercadoPagoData?.transactions?.payments?.[0] ?? null;

    const paymentMethod = payment?.payment_method ?? null;

    const orderId = mercadoPagoData?.id ?? null;

    const mercadoPagoPaymentId = payment?.id ?? null;

    const qrCode = paymentMethod?.qr_code ?? null;

    const qrCodeBase64 =
      paymentMethod?.qr_code_base64 ?? null;

    const ticketUrl =
      paymentMethod?.ticket_url ?? null;

    if (!orderId || !qrCode) {
      console.error(
        "[MERCADO PAGO] Order criada, mas dados Pix não retornados:",
        mercadoPagoData
      );

      return NextResponse.json(
        {
          error:
            "O Mercado Pago criou a cobrança, mas não retornou o código Pix esperado.",

          order_id: orderId,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,

      order_id: orderId,

      mercado_pago_payment_id:
        mercadoPagoPaymentId,

      installment_id: installment.id,

      customer_id: customer.id,

      customer_name: customer.full_name,

      amount: Number(amountFormatted),

      status:
        mercadoPagoData?.status ??
        "action_required",

      status_detail:
        mercadoPagoData?.status_detail ??
        "waiting_transfer",

      pix: {
        qr_code: qrCode,

        qr_code_base64:
          qrCodeBase64,

        ticket_url:
          ticketUrl,
      },
    });
  } catch (error) {
    console.error(
      "[MERCADO PAGO] Erro inesperado:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Erro interno ao gerar pagamento Pix.",
      },
      { status: 500 }
    );
  }
}