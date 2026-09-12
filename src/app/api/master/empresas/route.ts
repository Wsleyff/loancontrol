import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

type AuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

function isMasterUser(user: AuthUser) {
  const metadataRole =
    user.user_metadata?.role;

  const masterEmail =
    process.env.MASTER_EMAIL;

  const emailIsMaster =
    Boolean(
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

export async function GET() {
  try {
    console.log(
      "[MASTER EMPRESAS] Iniciando busca..."
    );

    /*
     * =====================================================
     * 1. VERIFICAR USUÁRIO LOGADO
     * =====================================================
     */

    const authClient =
      await createServerClient();

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (
      authError ||
      !user
    ) {
      console.error(
        "[MASTER EMPRESAS] Usuário não autenticado:",
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
      "[MASTER EMPRESAS] Usuário:",
      user.email
    );

    /*
     * =====================================================
     * 2. VERIFICAR SE É MASTER
     * =====================================================
     */

    if (
      !isMasterUser(user as AuthUser)
    ) {
      console.error(
        "[MASTER EMPRESAS] Usuário sem permissão Master."
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
     * 3. PEGAR CREDENCIAIS DO SUPABASE
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
        "[MASTER EMPRESAS] Variáveis do Supabase ausentes."
      );

      return NextResponse.json(
        {
          error:
            "SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_URL não configurado no .env.local.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * IMPORTANTE:
     * Esta chave fica SOMENTE no servidor.
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
     * 4. BUSCAR EMPRESAS
     * =====================================================
     */

    console.log(
      "[MASTER EMPRESAS] Buscando companies..."
    );

    const {
      data: companies,
      error: companiesError,
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
      .is("deleted_at", null)
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

    if (companiesError) {
      console.error(
        "[MASTER EMPRESAS] ERRO AO BUSCAR COMPANIES:",
        companiesError
      );

      return NextResponse.json(
        {
          error:
            companiesError.message ||
            "Erro ao buscar empresas.",
          details:
            companiesError,
        },
        {
          status: 500,
        }
      );
    }

    console.log(
      "[MASTER EMPRESAS] Empresas encontradas:",
      companies?.length || 0
    );

    /*
     * =====================================================
     * 5. BUSCAR ASSINATURAS
     * =====================================================
     */

    let subscriptions: any[] =
      [];

    if (
      companies &&
      companies.length > 0
    ) {
      const companyIds =
        companies.map(
          (company) =>
            company.id
        );

      console.log(
        "[MASTER EMPRESAS] Buscando assinaturas..."
      );

      const {
        data: subscriptionData,
        error: subscriptionError,
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
          created_at,
          updated_at
        `
        )
        .in(
          "company_id",
          companyIds
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

      if (
        subscriptionError
      ) {
        console.warn(
          "[MASTER EMPRESAS] Não foi possível buscar assinaturas:",
          subscriptionError
        );

        /*
         * A empresa continua sendo
         * mostrada mesmo sem assinatura.
         */
      } else {
        subscriptions =
          subscriptionData || [];
      }
    }

    /*
     * =====================================================
     * 6. BUSCAR PLANOS
     * =====================================================
     */

    let plans: any[] = [];

    if (
      subscriptions.length > 0
    ) {
      const planIds = Array.from(
        new Set(
          subscriptions
            .map(
              (subscription) =>
                subscription.plan_id
            )
            .filter(Boolean)
        )
      );

      if (planIds.length > 0) {
        const {
          data: planData,
          error: planError,
        } = await supabase
          .from("plans")
          .select(
            `
            id,
            name,
            price,
            trial_days,
            active
          `
          )
          .in(
            "id",
            planIds
          );

        if (planError) {
          console.warn(
            "[MASTER EMPRESAS] Não foi possível buscar planos:",
            planError
          );
        } else {
          plans =
            planData || [];
        }
      }
    }

    /*
     * =====================================================
     * 7. PEGAR A ASSINATURA MAIS RECENTE
     * DE CADA EMPRESA
     * =====================================================
     */

    const latestSubscription =
      new Map<string, any>();

    for (
      const subscription of
        subscriptions
    ) {
      if (
        !latestSubscription.has(
          subscription.company_id
        )
      ) {
        latestSubscription.set(
          subscription.company_id,
          subscription
        );
      }
    }

    /*
     * =====================================================
     * 8. MAPEAR PLANOS
     * =====================================================
     */

    const planMap =
      new Map<string, any>();

    for (
      const plan of plans
    ) {
      planMap.set(
        plan.id,
        plan
      );
    }

    /*
     * =====================================================
     * 9. MONTAR RESULTADO FINAL
     * =====================================================
     */

    const result =
      (companies || []).map(
        (company) => {
          const subscription =
            latestSubscription.get(
              company.id
            );

          const plan =
            subscription
              ? planMap.get(
                  subscription.plan_id
                )
              : null;

          return {
            ...company,

            subscription:
              subscription
                ? {
                    ...subscription,
                    plan:
                      plan || null,
                  }
                : null,
          };
        }
      );

    /*
     * =====================================================
     * 10. RETORNO
     * =====================================================
     */

    console.log(
      "[MASTER EMPRESAS] Retornando:",
      result.length,
      "empresas"
    );

    return NextResponse.json(
      {
        success: true,
        companies: result,
        total: result.length,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "[MASTER EMPRESAS] ERRO INESPERADO:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao carregar empresas.",
      },
      {
        status: 500,
      }
    );
  }
}