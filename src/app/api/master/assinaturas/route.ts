import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

type SubscriptionRow = {
  id: string;
  company_id: string;
  plan_id: string;
  status: string;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  mercado_pago_subscription_id: string | null;
  created_at: string;
  updated_at: string;
};

type CompanyRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

type PlanRow = {
  id: string;
  name: string;
  price: number;
  trial_days: number;
};

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Variáveis do Supabase não configuradas."
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function isMasterUser() {
  const authClient = await createClient();

  const {
    data: { user },
    error,
  } = await authClient.auth.getUser();

  if (error || !user) {
    return false;
  }

  const metadataRole =
    user.user_metadata?.role;

  const masterEmail =
    process.env.MASTER_EMAIL?.trim().toLowerCase();

  const userEmail =
    user.email?.trim().toLowerCase();

  return (
    metadataRole === "MASTER" ||
    (!!masterEmail && userEmail === masterEmail)
  );
}

function daysBetween(
  target: string | null
): number | null {
  if (!target) return null;

  const targetDate = new Date(target);

  if (Number.isNaN(targetDate.getTime())) {
    return null;
  }

  const now = new Date();

  const difference =
    targetDate.getTime() - now.getTime();

  return Math.ceil(
    difference / (1000 * 60 * 60 * 24)
  );
}

export async function GET() {
  try {
    const master = await isMasterUser();

    if (!master) {
      return NextResponse.json(
        {
          error: "Acesso negado.",
        },
        {
          status: 403,
        }
      );
    }

    const supabase = getServiceClient();

    const {
      data: subscriptions,
      error: subscriptionsError,
    } = await supabase
      .from("subscriptions")
      .select(
        "id,company_id,plan_id,status,trial_started_at,trial_ends_at,current_period_start,current_period_end,mercado_pago_subscription_id,created_at,updated_at"
      )
      .order("created_at", {
        ascending: false,
      });

    if (subscriptionsError) {
      console.error(
        "[MASTER ASSINATURAS] subscriptions:",
        subscriptionsError
      );

      return NextResponse.json(
        {
          error:
            "Não foi possível carregar as assinaturas.",
        },
        {
          status: 500,
        }
      );
    }

    const subscriptionRows =
      (subscriptions || []) as SubscriptionRow[];

    if (subscriptionRows.length === 0) {
      return NextResponse.json({
        subscriptions: [],
        stats: {
          total: 0,
          active: 0,
          trial: 0,
          expired: 0,
          past_due: 0,
          cancelled: 0,
          monthly_revenue: 0,
        },
      });
    }

    const companyIds = Array.from(
      new Set(
        subscriptionRows
          .map((item) => item.company_id)
          .filter(Boolean)
      )
    );

    const planIds = Array.from(
      new Set(
        subscriptionRows
          .map((item) => item.plan_id)
          .filter(Boolean)
      )
    );

    const [
      companiesResult,
      plansResult,
    ] = await Promise.all([
      supabase
        .from("companies")
        .select("id,name,email,phone")
        .in("id", companyIds),

      supabase
        .from("plans")
        .select("id,name,price,trial_days")
        .in("id", planIds),
    ]);

    if (companiesResult.error) {
      console.error(
        "[MASTER ASSINATURAS] companies:",
        companiesResult.error
      );

      return NextResponse.json(
        {
          error:
            "Não foi possível carregar as empresas.",
        },
        {
          status: 500,
        }
      );
    }

    if (plansResult.error) {
      console.error(
        "[MASTER ASSINATURAS] plans:",
        plansResult.error
      );

      return NextResponse.json(
        {
          error:
            "Não foi possível carregar os planos.",
        },
        {
          status: 500,
        }
      );
    }

    const companies =
      (companiesResult.data || []) as CompanyRow[];

    const plans =
      (plansResult.data || []) as PlanRow[];

    const companyMap = new Map(
      companies.map((company) => [
        company.id,
        company,
      ])
    );

    const planMap = new Map(
      plans.map((plan) => [
        plan.id,
        plan,
      ])
    );

    const result = subscriptionRows.map(
      (subscription) => {
        const company =
          companyMap.get(
            subscription.company_id
          );

        const plan =
          planMap.get(subscription.plan_id);

        const expiration =
          subscription.status === "TRIAL"
            ? subscription.trial_ends_at
            : subscription.current_period_end ||
              subscription.trial_ends_at;

        return {
          id: subscription.id,

          company_id:
            subscription.company_id,

          company_name:
            company?.name ||
            "Empresa não encontrada",

          company_email:
            company?.email || null,

          company_phone:
            company?.phone || null,

          plan_id:
            subscription.plan_id,

          plan_name:
            plan?.name ||
            "Plano não encontrado",

          plan_price:
            Number(plan?.price || 0),

          trial_days:
            Number(plan?.trial_days || 0),

          status:
            subscription.status,

          trial_started_at:
            subscription.trial_started_at,

          trial_ends_at:
            subscription.trial_ends_at,

          current_period_start:
            subscription.current_period_start,

          current_period_end:
            subscription.current_period_end,

          mercado_pago_subscription_id:
            subscription.mercado_pago_subscription_id,

          created_at:
            subscription.created_at,

          updated_at:
            subscription.updated_at,

          days_remaining:
            daysBetween(expiration),
        };
      }
    );

    const total =
      result.length;

    const active =
      result.filter(
        (item) => item.status === "ACTIVE"
      ).length;

    const trial =
      result.filter(
        (item) => item.status === "TRIAL"
      ).length;

    const expired =
      result.filter(
        (item) => item.status === "EXPIRED"
      ).length;

    const past_due =
      result.filter(
        (item) => item.status === "PAST_DUE"
      ).length;

    const cancelled =
      result.filter(
        (item) => item.status === "CANCELLED"
      ).length;

    /*
     * Receita mensal estimada:
     * somente assinaturas ACTIVE.
     */
    const monthly_revenue =
      result
        .filter(
          (item) => item.status === "ACTIVE"
        )
        .reduce(
          (totalValue, item) =>
            totalValue +
            Number(item.plan_price || 0),
          0
        );

    return NextResponse.json({
      subscriptions: result,

      stats: {
        total,
        active,
        trial,
        expired,
        past_due,
        cancelled,
        monthly_revenue,
      },
    });
  } catch (error) {
    console.error(
      "[MASTER ASSINATURAS] GET:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Erro interno.";

    if (
      message.toLowerCase().includes(
        "invalid api key"
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Chave do Supabase inválida. Verifique SUPABASE_SERVICE_ROLE_KEY no .env.local.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(
      {
        error:
          "Erro interno ao carregar assinaturas.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PUT(
  request: Request
) {
  try {
    const master = await isMasterUser();

    if (!master) {
      return NextResponse.json(
        {
          error: "Acesso negado.",
        },
        {
          status: 403,
        }
      );
    }

    const body = await request.json();

    const id =
      typeof body?.id === "string"
        ? body.id.trim()
        : "";

    const status =
      typeof body?.status === "string"
        ? body.status.trim().toUpperCase()
        : "";

    const allowedStatuses = [
      "TRIAL",
      "ACTIVE",
      "PAST_DUE",
      "CANCELLED",
      "EXPIRED",
    ];

    if (!id) {
      return NextResponse.json(
        {
          error:
            "ID da assinatura não informado.",
        },
        {
          status: 400,
        }
      );
    }

    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        {
          error:
            "Status de assinatura inválido.",
        },
        {
          status: 400,
        }
      );
    }

    const supabase = getServiceClient();

    const {
      data: existing,
      error: findError,
    } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (findError) {
      console.error(
        "[MASTER ASSINATURAS] find:",
        findError
      );

      return NextResponse.json(
        {
          error:
            "Não foi possível localizar a assinatura.",
        },
        {
          status: 500,
        }
      );
    }

    if (!existing) {
      return NextResponse.json(
        {
          error:
            "Assinatura não encontrada.",
        },
        {
          status: 404,
        }
      );
    }

    const updateData: Record<
      string,
      unknown
    > = {
      status,
      updated_at:
        new Date().toISOString(),
    };

    /*
     * Quando a Master ativa manualmente uma assinatura,
     * criamos/renovamos o período atual caso não exista.
     *
     * Isso deixa o cadastro preparado para a futura
     * integração automática com Mercado Pago.
     */
    if (
      status === "ACTIVE" &&
      !existing.current_period_start
    ) {
      const start =
        new Date();

      const end =
        new Date(start);

      end.setMonth(
        end.getMonth() + 1
      );

      updateData.current_period_start =
        start.toISOString();

      updateData.current_period_end =
        end.toISOString();
    }

    const {
      data: updated,
      error: updateError,
    } = await supabase
      .from("subscriptions")
      .update(updateData)
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) {
      console.error(
        "[MASTER ASSINATURAS] update:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "Não foi possível atualizar a assinatura.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      subscription: updated,
    });
  } catch (error) {
    console.error(
      "[MASTER ASSINATURAS] PUT:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Erro interno ao atualizar assinatura.",
      },
      {
        status: 500,
      }
    );
  }
}