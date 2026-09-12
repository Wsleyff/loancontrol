import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Variáveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas."
    );
  }

  return createSupabaseClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function isMasterUser(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}) {
  const metadataRole = String(user.user_metadata?.role || "").toUpperCase();
  const masterEmail = String(process.env.MASTER_EMAIL || "")
    .trim()
    .toLowerCase();

  const email = String(user.email || "")
    .trim()
    .toLowerCase();

  return metadataRole === "MASTER" || (!!masterEmail && email === masterEmail);
}

function money(value: unknown) {
  const number = Number(value || 0);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return number;
}

export async function GET() {
  try {
    /*
     * 1. Verifica o usuário logado
     */
    const authClient = await createClient();

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    /*
     * 2. Verifica se é MASTER
     */
    if (!isMasterUser(user)) {
      return NextResponse.json(
        { error: "Acesso permitido somente ao MASTER." },
        { status: 403 }
      );
    }

    /*
     * 3. Cliente com Service Role
     */
    const supabase = getServiceClient();

    /*
     * 4. Busca empresas
     */
    const { data: companies, error: companiesError } = await supabase
      .from("companies")
      .select("id,name,email,created_at,deleted_at")
      .is("deleted_at", null);

    if (companiesError) {
      console.error("[MASTER FINANCEIRO] Empresas:", companiesError);

      return NextResponse.json(
        {
          error: companiesError.message || "Erro ao carregar empresas.",
        },
        { status: 500 }
      );
    }

    /*
     * 5. Busca planos
     */
    const { data: plans, error: plansError } = await supabase
      .from("plans")
      .select("id,name,price,trial_days,active")
      .order("price", { ascending: true });

    if (plansError) {
      console.error("[MASTER FINANCEIRO] Planos:", plansError);

      return NextResponse.json(
        {
          error: plansError.message || "Erro ao carregar planos.",
        },
        { status: 500 }
      );
    }

    /*
     * 6. Busca assinaturas
     */
    const { data: subscriptions, error: subscriptionsError } = await supabase
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
      .order("created_at", { ascending: false });

    if (subscriptionsError) {
      console.error(
        "[MASTER FINANCEIRO] Assinaturas:",
        subscriptionsError
      );

      return NextResponse.json(
        {
          error:
            subscriptionsError.message ||
            "Erro ao carregar assinaturas.",
        },
        { status: 500 }
      );
    }

    const companyMap = new Map<
      string,
      {
        id: string;
        name: string;
        email: string | null;
        created_at: string;
      }
    >();

    for (const company of companies || []) {
      companyMap.set(company.id, {
        id: company.id,
        name: company.name,
        email: company.email || null,
        created_at: company.created_at,
      });
    }

    const planMap = new Map<
      string,
      {
        id: string;
        name: string;
        price: number;
        trial_days: number;
        active: boolean;
      }
    >();

    for (const plan of plans || []) {
      planMap.set(plan.id, {
        id: plan.id,
        name: plan.name,
        price: money(plan.price),
        trial_days: Number(plan.trial_days || 0),
        active: Boolean(plan.active),
      });
    }

    /*
     * Uma empresa deve ter apenas uma assinatura atual.
     *
     * Caso existam registros históricos, usamos a assinatura
     * mais recente de cada empresa.
     */
    const latestSubscriptionByCompany = new Map<string, any>();

    for (const subscription of subscriptions || []) {
      if (!latestSubscriptionByCompany.has(subscription.company_id)) {
        latestSubscriptionByCompany.set(
          subscription.company_id,
          subscription
        );
      }
    }

    const now = new Date();

    let activeCount = 0;
    let trialCount = 0;
    let pastDueCount = 0;
    let expiredCount = 0;
    let cancelledCount = 0;
    let trialExpiredCount = 0;

    let mrr = 0;
    let trialPotential = 0;

    let newSubscriptions30Days = 0;

    const thirtyDaysAgo = new Date(
      now.getTime() - 30 * 24 * 60 * 60 * 1000
    );

    const planStats = new Map<
      string,
      {
        id: string;
        name: string;
        price: number;
        active_count: number;
        trial_count: number;
        mrr: number;
      }
    >();

    for (const plan of plans || []) {
      planStats.set(plan.id, {
        id: plan.id,
        name: plan.name,
        price: money(plan.price),
        active_count: 0,
        trial_count: 0,
        mrr: 0,
      });
    }

    /*
     * Conta novas assinaturas nos últimos 30 dias
     */
    for (const subscription of subscriptions || []) {
      if (!subscription.created_at) {
        continue;
      }

      const createdAt = new Date(subscription.created_at);

      if (createdAt >= thirtyDaysAgo) {
        newSubscriptions30Days++;
      }
    }

    /*
     * Calcula situação atual de cada empresa
     */
    const currentSubscriptions = Array.from(
      latestSubscriptionByCompany.values()
    );

    const recentSubscriptions = currentSubscriptions
      .sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();

        return dateB - dateA;
      })
      .slice(0, 30)
      .map((subscription) => {
        const company = companyMap.get(subscription.company_id);
        const plan = planMap.get(subscription.plan_id);

        const price = money(plan?.price);

        return {
          id: subscription.id,
          company_id: subscription.company_id,
          company_name: company?.name || "Empresa",
          company_email: company?.email || null,
          plan_id: subscription.plan_id,
          plan_name: plan?.name || "Plano",
          price,
          status: subscription.status,
          trial_started_at: subscription.trial_started_at,
          trial_ends_at: subscription.trial_ends_at,
          current_period_start: subscription.current_period_start,
          current_period_end: subscription.current_period_end,
          mercado_pago_subscription_id:
            subscription.mercado_pago_subscription_id || null,
          created_at: subscription.created_at,
        };
      });

    for (const subscription of currentSubscriptions) {
      const plan = planMap.get(subscription.plan_id);

      const price = money(plan?.price);

      const status = String(subscription.status || "").toUpperCase();

      const trialEnd = subscription.trial_ends_at
        ? new Date(subscription.trial_ends_at)
        : null;

      const periodEnd = subscription.current_period_end
        ? new Date(subscription.current_period_end)
        : null;

      const trialIsValid =
        status === "TRIAL" &&
        (!trialEnd || trialEnd.getTime() >= now.getTime());

      const activeIsValid =
        status === "ACTIVE" &&
        (!periodEnd || periodEnd.getTime() >= now.getTime());

      if (status === "TRIAL") {
        if (trialIsValid) {
          trialCount++;
          trialPotential += price;

          const stat = planStats.get(subscription.plan_id);

          if (stat) {
            stat.trial_count++;
          }
        } else {
          trialExpiredCount++;
        }
      }

      if (activeIsValid) {
        activeCount++;
        mrr += price;

        const stat = planStats.get(subscription.plan_id);

        if (stat) {
          stat.active_count++;
          stat.mrr += price;
        }
      }

      if (status === "PAST_DUE") {
        pastDueCount++;
      }

      if (status === "EXPIRED") {
        expiredCount++;
      }

      if (status === "CANCELLED") {
        cancelledCount++;
      }

      /*
       * Caso uma assinatura ACTIVE tenha período vencido,
       * consideramos como atrasada operacionalmente.
       */
      if (
        status === "ACTIVE" &&
        periodEnd &&
        periodEnd.getTime() < now.getTime()
      ) {
        pastDueCount++;
      }
    }

    const potentialMonthlyRevenue = mrr + trialPotential;

    const activePlans = Array.from(planStats.values()).filter(
      (plan) => plan.active_count > 0
    ).length;

    const companiesWithSubscription =
      latestSubscriptionByCompany.size;

    const totalCompanies = (companies || []).length;

    const planBreakdown = Array.from(planStats.values())
      .filter(
        (plan) =>
          plan.active_count > 0 ||
          plan.trial_count > 0 ||
          plan.price > 0
      )
      .sort((a, b) => {
        if (b.mrr !== a.mrr) {
          return b.mrr - a.mrr;
        }

        return b.active_count - a.active_count;
      });

    /*
     * IMPORTANTE:
     *
     * Ainda não existe no banco uma tabela específica de pagamentos
     * das assinaturas SaaS/Mercado Pago.
     *
     * Portanto "mrr" é uma estimativa baseada no preço dos planos
     * ativos. Não estamos fingindo que esse valor já foi recebido.
     */
    return NextResponse.json(
      {
        generated_at: now.toISOString(),

        financial: {
          mrr,
          trial_potential: trialPotential,
          potential_monthly_revenue: potentialMonthlyRevenue,
          received_revenue: null,
          received_revenue_available: false,
        },

        stats: {
          total_companies: totalCompanies,
          companies_with_subscription: companiesWithSubscription,
          active_count: activeCount,
          trial_count: trialCount,
          past_due_count: pastDueCount,
          expired_count: expiredCount,
          cancelled_count: cancelledCount,
          trial_expired_count: trialExpiredCount,
          active_plans: activePlans,
          new_subscriptions_30_days: newSubscriptions30Days,
        },

        plan_breakdown: planBreakdown,

        recent_subscriptions: recentSubscriptions,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[MASTER FINANCEIRO] Erro geral:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno no financeiro.",
      },
      { status: 500 }
    );
  }
}