import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // =========================================================
    // 1. USUÁRIO LOGADO
    // =========================================================
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error(
        "[ASSINATURA] Usuário não autenticado:",
        authError?.message
      );

      return NextResponse.json(
        {
          allowed: false,
          reason: "UNAUTHENTICATED",
          error: "Usuário não autenticado.",
        },
        { status: 401 }
      );
    }

    // =========================================================
    // 2. ENCONTRA A EMPRESA DO USUÁRIO
    // =========================================================
    const { data: membership, error: membershipError } =
      await supabase
        .from("company_users")
        .select(
          "id, company_id, user_id, role, status"
        )
        .eq("user_id", user.id)
        .eq("status", "ACTIVE")
        .limit(1)
        .maybeSingle();

    if (membershipError) {
      console.error(
        "[ASSINATURA] Erro ao buscar empresa:",
        membershipError
      );

      return NextResponse.json(
        {
          allowed: false,
          reason: "MEMBERSHIP_ERROR",
          error: membershipError.message,
        },
        { status: 500 }
      );
    }

    if (!membership) {
      console.error(
        "[ASSINATURA] Usuário sem empresa:",
        user.id
      );

      return NextResponse.json(
        {
          allowed: false,
          reason: "NO_COMPANY",
          error:
            "Sua conta não está vinculada a uma empresa.",
        },
        { status: 403 }
      );
    }

    const companyId = membership.company_id;

    // =========================================================
    // 3. BUSCA A ASSINATURA
    // =========================================================
    const { data: subscription, error: subscriptionError } =
      await supabase
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
            updated_at,
            plans (
              id,
              name,
              description,
              price,
              trial_days,
              active
            )
          `
        )
        .eq("company_id", companyId)
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

    if (subscriptionError) {
      console.error(
        "[ASSINATURA] Erro ao buscar assinatura:",
        subscriptionError
      );

      return NextResponse.json(
        {
          allowed: false,
          reason: "SUBSCRIPTION_ERROR",
          error: subscriptionError.message,
        },
        { status: 500 }
      );
    }

    // =========================================================
    // 4. SEM ASSINATURA
    // =========================================================
    if (!subscription) {
      console.warn(
        "[ASSINATURA] Nenhuma assinatura encontrada para:",
        companyId
      );

      return NextResponse.json(
        {
          allowed: false,
          reason: "NO_SUBSCRIPTION",
          companyId,
          companyName: null,
          status: "NONE",
          trialEndsAt: null,
          currentPeriodStart: null,
          currentPeriodEnd: null,
          daysRemaining: 0,
          plan: null,
        },
        { status: 200 }
      );
    }

    // =========================================================
    // 5. PLANO
    // =========================================================
    const plan = Array.isArray(subscription.plans)
      ? subscription.plans[0] || null
      : subscription.plans || null;

    // =========================================================
    // 6. DATAS
    // =========================================================
    const now = new Date();

    const trialEndsAt =
      subscription.trial_ends_at
        ? new Date(subscription.trial_ends_at)
        : null;

    const currentPeriodEnd =
      subscription.current_period_end
        ? new Date(subscription.current_period_end)
        : null;

    let expirationDate: Date | null = null;

    if (subscription.status === "TRIAL") {
      expirationDate = trialEndsAt;
    } else if (currentPeriodEnd) {
      expirationDate = currentPeriodEnd;
    }

    const expiredByDate =
      expirationDate !== null &&
      expirationDate.getTime() <= now.getTime();

    // =========================================================
    // 7. STATUS PERMITIDOS
    // =========================================================
    const validStatuses = [
      "TRIAL",
      "ACTIVE",
      "PAID",
      "APPROVED",
      "AUTHORIZED",
    ];

    const normalizedStatus = String(
      subscription.status || ""
    ).toUpperCase();

    const statusAllowsAccess =
      validStatuses.includes(normalizedStatus);

    const allowed =
      statusAllowsAccess && !expiredByDate;

    // =========================================================
    // 8. DIAS RESTANTES
    // =========================================================
    let daysRemaining = 0;

    if (expirationDate && !expiredByDate) {
      const difference =
        expirationDate.getTime() -
        now.getTime();

      daysRemaining = Math.ceil(
        difference /
          (1000 * 60 * 60 * 24)
      );

      if (daysRemaining < 0) {
        daysRemaining = 0;
      }
    }

    // =========================================================
    // 9. MOTIVO
    // =========================================================
    let reason = "ACTIVE";

    if (
      normalizedStatus === "TRIAL" &&
      expiredByDate
    ) {
      reason = "TRIAL_EXPIRED";
    } else if (!statusAllowsAccess) {
      reason = "SUBSCRIPTION_INACTIVE";
    } else if (expiredByDate) {
      reason = "SUBSCRIPTION_EXPIRED";
    }

    // =========================================================
    // 10. RESPOSTA
    // =========================================================
    const response = {
      allowed,
      reason,

      companyId,

      // Não dependemos da tabela companies aqui.
      companyName: null,

      status: normalizedStatus,

      trialEndsAt:
        subscription.trial_ends_at || null,

      currentPeriodStart:
        subscription.current_period_start || null,

      currentPeriodEnd:
        subscription.current_period_end || null,

      daysRemaining,

      plan: plan
        ? {
            id: plan.id,
            name: plan.name,
            description:
              plan.description || null,
            price: plan.price,
            trialDays: plan.trial_days,
            active: plan.active,
          }
        : null,
    };

    console.log(
      "[ASSINATURA] Verificação OK:",
      {
        userId: user.id,
        companyId,
        status: normalizedStatus,
        allowed,
        daysRemaining,
      }
    );

    return NextResponse.json(
      response,
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "[ASSINATURA] Erro inesperado:",
      error
    );

    return NextResponse.json(
      {
        allowed: false,
        reason: "INTERNAL_ERROR",
        error:
          error instanceof Error
            ? error.message
            : "Erro interno.",
      },
      { status: 500 }
    );
  }
}