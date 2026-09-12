import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabaseServer = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabaseServer.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Não autenticado." },
        { status: 401 }
      );
    }

    const metadataRole = String(
      user.user_metadata?.role || ""
    ).toUpperCase();

    const masterEmail = String(
      process.env.MASTER_EMAIL || ""
    )
      .trim()
      .toLowerCase();

    const userEmail = String(
      user.email || ""
    )
      .trim()
      .toLowerCase();

    const isMaster =
      metadataRole === "MASTER" ||
      (masterEmail &&
        userEmail &&
        userEmail === masterEmail);

    if (!isMaster) {
      return NextResponse.json(
        { error: "Acesso negado." },
        { status: 403 }
      );
    }

    const url =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
      return NextResponse.json(
        {
          error:
            "Service Role não configurada.",
        },
        { status: 500 }
      );
    }

    const supabaseAdmin =
      createSupabaseClient(
        url,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

    const [
      companiesResult,
      subscriptionsResult,
      plansResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("companies")
        .select("id", {
          count: "exact",
          head: true,
        }),

      supabaseAdmin
        .from("subscriptions")
        .select(
          "id,company_id,status,current_period_start,current_period_end"
        ),

      supabaseAdmin
        .from("plans")
        .select("id,price"),
    ]);

    if (companiesResult.error) {
      throw companiesResult.error;
    }

    if (subscriptionsResult.error) {
      throw subscriptionsResult.error;
    }

    if (plansResult.error) {
      throw plansResult.error;
    }

    const companies =
      companiesResult.count || 0;

    const subscriptions =
      subscriptionsResult.data || [];

    const plans =
      plansResult.data || [];

    const trials =
      subscriptions.filter(
        (item) =>
          String(item.status)
            .toUpperCase() ===
          "TRIAL"
      ).length;

    const activeSubscriptions =
      subscriptions.filter(
        (item) =>
          String(item.status)
            .toUpperCase() ===
          "ACTIVE"
      ).length;

    const expiredSubscriptions =
      subscriptions.filter((item) => {
        const status =
          String(item.status)
            .toUpperCase();

        return [
          "EXPIRED",
          "CANCELLED",
          "CANCELED",
          "PAST_DUE",
        ].includes(status);
      }).length;

    /*
     * Receita mensal estimada:
     * soma o preço do plano das assinaturas
     * ACTIVE.
     *
     * Depois vamos substituir isso pelos
     * pagamentos reais do Mercado Pago.
     */
    let monthlyRevenue = 0;

    for (const subscription of subscriptions) {
      if (
        String(subscription.status)
          .toUpperCase() !==
        "ACTIVE"
      ) {
        continue;
      }

      /*
       * Atualmente subscriptions possui
       * plan_id, mas não retornamos ele acima.
       * O cálculo real será conectado quando
       * fizermos a gestão completa de planos.
       */
    }

    /*
     * Por enquanto não inventamos receita.
     * O valor será calculado corretamente na
     * próxima etapa usando os pagamentos.
     */
    monthlyRevenue = 0;

    /*
     * A tabela de saques ainda será criada.
     * Portanto não fazemos uma consulta
     * inexistente aqui.
     */
    const pendingWithdrawals = 0;

    return NextResponse.json({
      companies,
      trials,
      activeSubscriptions,
      expiredSubscriptions,
      pendingWithdrawals,
      monthlyRevenue,
      plans: plans.length,
    });
  } catch (error) {
    console.error(
      "[MASTER DASHBOARD] Erro:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Erro ao carregar dados do Dashboard Master.",
      },
      { status: 500 }
    );
  }
}