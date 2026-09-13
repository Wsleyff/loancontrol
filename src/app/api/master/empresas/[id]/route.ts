import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

type AuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

function isMasterUser(user: AuthUser) {
  const metadataRole = user.user_metadata?.role;

  const masterEmail = process.env.MASTER_EMAIL;

  const emailIsMaster = Boolean(
    masterEmail &&
      user.email &&
      user.email.toLowerCase() ===
        masterEmail.toLowerCase()
  );

  return (
    metadataRole === "MASTER" ||
    emailIsMaster
  );
}

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    console.log(
      "[MASTER EMPRESA DETALHE] Iniciando busca..."
    );

    /*
     * =====================================================
     * 1. PEGAR ID DA EMPRESA
     * =====================================================
     */

    const { id } = await context.params;

    const companyId = String(id || "").trim();

    if (!companyId) {
      return NextResponse.json(
        {
          error: "ID da empresa não informado.",
        },
        {
          status: 400,
        }
      );
    }

    console.log(
      "[MASTER EMPRESA DETALHE] Company ID:",
      companyId
    );

    /*
     * =====================================================
     * 2. VERIFICAR USUÁRIO LOGADO
     * =====================================================
     */

    const authClient =
      await createServerClient();

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      console.error(
        "[MASTER EMPRESA DETALHE] Usuário não autenticado:",
        authError
      );

      return NextResponse.json(
        {
          error:
            "Usuário não autenticado.",
        },
        {
          status: 401,
        }
      );
    }

    console.log(
      "[MASTER EMPRESA DETALHE] Usuário:",
      user.email
    );

    /*
     * =====================================================
     * 3. VERIFICAR MASTER
     * =====================================================
     */

    if (
      !isMasterUser(user as AuthUser)
    ) {
      console.error(
        "[MASTER EMPRESA DETALHE] Usuário sem permissão Master."
      );

      return NextResponse.json(
        {
          error:
            "Acesso permitido somente ao administrador Master.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * =====================================================
     * 4. CREDENCIAIS DO SUPABASE
     * =====================================================
     */

    const supabaseUrl =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env
        .SUPABASE_SERVICE_ROLE_KEY;

    if (
      !supabaseUrl ||
      !serviceRoleKey
    ) {
      console.error(
        "[MASTER EMPRESA DETALHE] Variáveis do Supabase ausentes."
      );

      return NextResponse.json(
        {
          error:
            "SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_URL não configurado.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * IMPORTANTE:
     * A SERVICE ROLE fica somente no servidor.
     */

    const supabase =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken:
              false,
            persistSession:
              false,
          },
        }
      );

    /*
     * =====================================================
     * 5. BUSCAR EMPRESA
     * =====================================================
     */

    const {
      data: company,
      error: companyError,
    } = await supabase
      .from("companies")
      .select(
        `
        id,
        name,
        legal_name,
        document,
        email,
        phone,
        whatsapp,
        logo_url,
        address,
        city,
        state,
        zip_code,
        created_at,
        updated_at
      `
      )
      .eq("id", companyId)
      .is("deleted_at", null)
      .maybeSingle();

    if (companyError) {
      console.error(
        "[MASTER EMPRESA DETALHE] Erro ao buscar empresa:",
        companyError
      );

      return NextResponse.json(
        {
          error:
            companyError.message ||
            "Erro ao buscar empresa.",
        },
        {
          status: 500,
        }
      );
    }

    if (!company) {
      return NextResponse.json(
        {
          error:
            "Empresa não encontrada.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * =====================================================
     * 6. BUSCAR ASSINATURAS
     * =====================================================
     */

    const {
      data: subscriptions,
      error: subscriptionsError,
    } = await supabase
      .from("subscriptions")
      .select(
        `
        id,
        company_id,
        plan_id,
        status,
        trial_started_at,
        trial_ends_at,
        current_period_start,
        current_period_end,
        mercado_pago_subscription_id,
        created_at,
        updated_at
      `
      )
      .eq(
        "company_id",
        companyId
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

    if (subscriptionsError) {
      console.warn(
        "[MASTER EMPRESA DETALHE] Erro ao buscar assinaturas:",
        subscriptionsError
      );
    }

    const subscriptionList =
      subscriptions || [];

    const subscription =
      subscriptionList.length > 0
        ? subscriptionList[0]
        : null;

    /*
     * =====================================================
     * 7. BUSCAR PLANO
     * =====================================================
     */

    let plan: any = null;

    if (
      subscription?.plan_id
    ) {
      const {
        data: planData,
        error: planError,
      } = await supabase
        .from("plans")
        .select(
          `
          id,
          name,
          description,
          price,
          trial_days,
          active,
          created_at,
          updated_at
        `
        )
        .eq(
          "id",
          subscription.plan_id
        )
        .maybeSingle();

      if (planError) {
        console.warn(
          "[MASTER EMPRESA DETALHE] Erro ao buscar plano:",
          planError
        );
      } else {
        plan = planData;
      }
    }

    /*
     * =====================================================
     * 8. BUSCAR USUÁRIOS DA EMPRESA
     * =====================================================
     */

    const {
      data: companyUsers,
      error: usersError,
    } = await supabase
      .from("company_users")
      .select(
        `
        id,
        company_id,
        user_id,
        role,
        status,
        created_at,
        updated_at
      `
      )
      .eq(
        "company_id",
        companyId
      )
      .order(
        "created_at",
        {
          ascending: true,
        }
      );

    if (usersError) {
      console.warn(
        "[MASTER EMPRESA DETALHE] Erro ao buscar usuários:",
        usersError
      );
    }

    const usersList =
      companyUsers || [];

    /*
     * =====================================================
     * 9. BUSCAR PERFIS DOS USUÁRIOS
     * =====================================================
     */

    const userIds =
      usersList
        .map(
          (item) =>
            item.user_id
        )
        .filter(Boolean);

    let profiles: any[] = [];

    if (userIds.length > 0) {
      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(
          `
          id,
          full_name,
          email,
          phone,
          avatar_url,
          created_at,
          updated_at
        `
        )
        .in(
          "id",
          userIds
        );

      if (profileError) {
        console.warn(
          "[MASTER EMPRESA DETALHE] Erro ao buscar perfis:",
          profileError
        );
      } else {
        profiles =
          profileData || [];
      }
    }

    const profileMap =
      new Map<string, any>();

    for (
      const profile of profiles
    ) {
      profileMap.set(
        profile.id,
        profile
      );
    }

    const users =
      usersList.map(
        (companyUser) => {
          const profile =
            profileMap.get(
              companyUser.user_id
            );

          return {
            id: companyUser.id,
            user_id:
              companyUser.user_id,
            role:
              companyUser.role,
            status:
              companyUser.status,
            created_at:
              companyUser.created_at,
            updated_at:
              companyUser.updated_at,

            profile:
              profile || null,

            name:
              profile?.full_name ||
              profile?.email ||
              "Usuário",

            email:
              profile?.email ||
              null,

            phone:
              profile?.phone ||
              null,

            avatar_url:
              profile?.avatar_url ||
              null,
          };
        }
      );

    /*
     * =====================================================
     * 10. ESTATÍSTICAS
     * =====================================================
     */

    const [
      customersResult,
      loansResult,
      installmentsResult,
      paymentsResult,
      cashResult,
    ] = await Promise.all([
      supabase
        .from("customers")
        .select(
          "id",
          {
            count: "exact",
            head: true,
          }
        )
        .eq(
          "company_id",
          companyId
        )
        .is(
          "deleted_at",
          null
        ),

      supabase
        .from("loans")
        .select(
          "id",
          {
            count: "exact",
            head: true,
          }
        )
        .eq(
          "company_id",
          companyId
        )
        .is(
          "deleted_at",
          null
        ),

      supabase
        .from("loan_installments")
        .select(
          "id",
          {
            count: "exact",
            head: true,
          }
        )
        .eq(
          "company_id",
          companyId
        ),

      supabase
        .from("payments")
        .select(
          "id",
          {
            count: "exact",
            head: true,
          }
        )
        .eq(
          "company_id",
          companyId
        ),

      supabase
        .from("cash_movements")
        .select(
          "id",
          {
            count: "exact",
            head: true,
          }
        )
        .eq(
          "company_id",
          companyId
        ),
    ]);

    /*
     * =====================================================
     * 11. BUSCAR VALORES FINANCEIROS
     * =====================================================
     */

    const {
      data: financialPayments,
      error:
        financialPaymentsError,
    } = await supabase
      .from("payments")
      .select(
        `
        amount,
        payment_source,
        gateway_status
      `
      )
      .eq(
        "company_id",
        companyId
      );

    if (financialPaymentsError) {
      console.warn(
        "[MASTER EMPRESA DETALHE] Erro ao buscar pagamentos financeiros:",
        financialPaymentsError
      );
    }

    const paymentRows =
      financialPayments || [];

    let totalPaid = 0;
    let totalMercadoPago = 0;

    for (
      const payment of paymentRows
    ) {
      const amount =
        Number(
          payment.amount || 0
        );

      totalPaid += amount;

      if (
        payment.payment_source ===
          "MERCADO_PAGO" &&
        payment.gateway_status ===
          "APPROVED"
      ) {
        totalMercadoPago +=
          amount;
      }
    }

    /*
     * =====================================================
     * 12. BUSCAR EMPRÉSTIMOS PARA
     * CALCULAR VALORES
     * =====================================================
     */

    const {
      data: loansData,
      error: loansDataError,
    } = await supabase
      .from("loans")
      .select(
        `
        id,
        amount,
        principal_amount,
        total_amount,
        installment_amount,
        status
      `
      )
      .eq(
        "company_id",
        companyId
      )
      .is(
        "deleted_at",
        null
      );

    if (loansDataError) {
      console.warn(
        "[MASTER EMPRESA DETALHE] Erro ao buscar valores dos empréstimos:",
        loansDataError
      );
    }

    const loanRows =
      loansData || [];

    let totalLoanAmount = 0;
    let activeLoanAmount = 0;

    for (
      const loan of loanRows
    ) {
      const amount =
        Number(
          loan.total_amount ??
            loan.amount ??
            loan.principal_amount ??
            0
        );

      totalLoanAmount +=
        amount;

      if (
        loan.status ===
          "ACTIVE" ||
        loan.status ===
          "OVERDUE" ||
        loan.status ===
          "DEFAULTED"
      ) {
        activeLoanAmount +=
          amount;
      }
    }

    /*
     * =====================================================
     * 13. CALCULAR STATUS DA ASSINATURA
     * =====================================================
     */

    const now =
      new Date();

    let daysRemaining:
      number | null = null;

    if (
      subscription?.status ===
        "TRIAL" &&
      subscription.trial_ends_at
    ) {
      const trialEnd =
        new Date(
          subscription.trial_ends_at
        );

      const difference =
        trialEnd.getTime() -
        now.getTime();

      daysRemaining =
        Math.max(
          0,
          Math.ceil(
            difference /
              (1000 *
                60 *
                60 *
                24)
          )
        );
    }

    if (
      subscription?.status ===
        "ACTIVE" &&
      subscription.current_period_end
    ) {
      const periodEnd =
        new Date(
          subscription.current_period_end
        );

      const difference =
        periodEnd.getTime() -
        now.getTime();

      daysRemaining =
        Math.max(
          0,
          Math.ceil(
            difference /
              (1000 *
                60 *
                60 *
                24)
          )
        );
    }

    /*
     * =====================================================
     * 14. RESULTADO FINAL
     * =====================================================
     */

    const result = {
      company: {
        ...company,
      },

      subscription:
        subscription
          ? {
              ...subscription,

              plan:
                plan || null,

              days_remaining:
                daysRemaining,
            }
          : null,

      users,

      stats: {
        customers:
          customersResult.count ||
          0,

        loans:
          loansResult.count ||
          0,

        installments:
          installmentsResult.count ||
          0,

        payments:
          paymentsResult.count ||
          0,

        cash_movements:
          cashResult.count ||
          0,

        total_paid:
          totalPaid,

        total_mercado_pago:
          totalMercadoPago,

        total_loan_amount:
          totalLoanAmount,

        active_loan_amount:
          activeLoanAmount,
      },

      totals: {
        customers:
          customersResult.count ||
          0,

        loans:
          loansResult.count ||
          0,

        installments:
          installmentsResult.count ||
          0,

        payments:
          paymentsResult.count ||
          0,

        cash_movements:
          cashResult.count ||
          0,

        total_paid:
          totalPaid,

        total_mercado_pago:
          totalMercadoPago,

        total_loan_amount:
          totalLoanAmount,

        active_loan_amount:
          activeLoanAmount,
      },
    };

    console.log(
      "[MASTER EMPRESA DETALHE] Empresa carregada:",
      company.name
    );

    /*
     * =====================================================
     * 15. RETORNO
     * =====================================================
     */

    return NextResponse.json(
      {
        success: true,
        ...result,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "[MASTER EMPRESA DETALHE] ERRO INESPERADO:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao carregar empresa.",
      },
      {
        status: 500,
      }
    );
  }
}