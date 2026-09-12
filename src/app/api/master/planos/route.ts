import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Variáveis do Supabase não configuradas no servidor."
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function verificarMaster() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      autorizado: false,
      status: 401,
      mensagem: "Usuário não autenticado.",
    };
  }

  const masterEmail = process.env.MASTER_EMAIL
    ?.trim()
    .toLowerCase();

  const metadataRole =
    typeof user.user_metadata?.role === "string"
      ? user.user_metadata.role.toUpperCase()
      : "";

  const isMaster =
    metadataRole === "MASTER" ||
    (!!masterEmail &&
      !!user.email &&
      user.email.toLowerCase() === masterEmail);

  if (!isMaster) {
    return {
      autorizado: false,
      status: 403,
      mensagem: "Acesso restrito ao administrador Master.",
    };
  }

  return {
    autorizado: true,
    user,
  };
}

/**
 * GET
 *
 * Lista todos os planos e mostra quantas empresas
 * possuem assinatura vinculada a cada plano.
 */
export async function GET() {
  try {
    const master = await verificarMaster();

    if (!master.autorizado) {
      return NextResponse.json(
        { error: master.mensagem },
        { status: master.status }
      );
    }

    const supabase = getServiceClient();

    const { data: plans, error: plansError } =
      await supabase
        .from("plans")
        .select(
          "id,name,description,price,trial_days,active,created_at,updated_at"
        )
        .order("price", {
          ascending: true,
        });

    if (plansError) {
      console.error(
        "[MASTER PLANOS] Erro ao buscar planos:",
        plansError
      );

      return NextResponse.json(
        {
          error:
            plansError.message ||
            "Não foi possível carregar os planos.",
        },
        { status: 500 }
      );
    }

    const { data: subscriptions, error: subscriptionsError } =
      await supabase
        .from("subscriptions")
        .select("id,company_id,plan_id,status");

    if (subscriptionsError) {
      console.error(
        "[MASTER PLANOS] Erro ao buscar assinaturas:",
        subscriptionsError
      );

      return NextResponse.json(
        {
          error:
            subscriptionsError.message ||
            "Não foi possível carregar as assinaturas.",
        },
        { status: 500 }
      );
    }

    const companyCountByPlan = new Map<string, number>();

    for (const subscription of subscriptions || []) {
      if (!subscription.plan_id) continue;

      const current =
        companyCountByPlan.get(subscription.plan_id) || 0;

      companyCountByPlan.set(
        subscription.plan_id,
        current + 1
      );
    }

    const result = (plans || []).map((plan) => ({
      ...plan,
      companies_count:
        companyCountByPlan.get(plan.id) || 0,
    }));

    return NextResponse.json(
      {
        plans: result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "[MASTER PLANOS] Erro inesperado no GET:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao carregar planos.",
      },
      { status: 500 }
    );
  }
}

/**
 * POST
 *
 * Cria um novo plano.
 */
export async function POST(request: Request) {
  try {
    const master = await verificarMaster();

    if (!master.autorizado) {
      return NextResponse.json(
        { error: master.mensagem },
        { status: master.status }
      );
    }

    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const description =
      typeof body.description === "string"
        ? body.description.trim() || null
        : null;

    const price = Number(body.price);

    const trialDays = Number(body.trial_days);

    const active =
      typeof body.active === "boolean"
        ? body.active
        : true;

    if (!name) {
      return NextResponse.json(
        {
          error: "Informe o nome do plano.",
        },
        { status: 400 }
      );
    }

    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json(
        {
          error: "Informe um preço válido.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(trialDays) ||
      trialDays < 0
    ) {
      return NextResponse.json(
        {
          error:
            "Informe uma quantidade válida de dias de teste.",
        },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    const { data: existingPlan, error: existingError } =
      await supabase
        .from("plans")
        .select("id")
        .ilike("name", name)
        .maybeSingle();

    if (existingError) {
      console.error(
        "[MASTER PLANOS] Erro ao verificar plano existente:",
        existingError
      );

      return NextResponse.json(
        {
          error:
            existingError.message ||
            "Não foi possível verificar o plano.",
        },
        { status: 500 }
      );
    }

    if (existingPlan) {
      return NextResponse.json(
        {
          error:
            "Já existe um plano com esse nome.",
        },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("plans")
      .insert({
        name,
        description,
        price,
        trial_days: trialDays,
        active,
      })
      .select(
        "id,name,description,price,trial_days,active,created_at,updated_at"
      )
      .single();

    if (error) {
      console.error(
        "[MASTER PLANOS] Erro ao criar plano:",
        error
      );

      return NextResponse.json(
        {
          error:
            error.message ||
            "Não foi possível criar o plano.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Plano criado com sucesso.",
        plan: {
          ...data,
          companies_count: 0,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "[MASTER PLANOS] Erro inesperado no POST:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao criar plano.",
      },
      { status: 500 }
    );
  }
}

/**
 * PUT
 *
 * Edita um plano ou altera seu status.
 */
export async function PUT(request: Request) {
  try {
    const master = await verificarMaster();

    if (!master.autorizado) {
      return NextResponse.json(
        { error: master.mensagem },
        { status: master.status }
      );
    }

    const body = await request.json();

    const id =
      typeof body.id === "string"
        ? body.id.trim()
        : "";

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const description =
      typeof body.description === "string"
        ? body.description.trim() || null
        : null;

    const price = Number(body.price);

    const trialDays = Number(body.trial_days);

    const active =
      typeof body.active === "boolean"
        ? body.active
        : true;

    if (!id) {
      return NextResponse.json(
        {
          error: "ID do plano não informado.",
        },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        {
          error: "Informe o nome do plano.",
        },
        { status: 400 }
      );
    }

    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json(
        {
          error: "Informe um preço válido.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(trialDays) ||
      trialDays < 0
    ) {
      return NextResponse.json(
        {
          error:
            "Informe uma quantidade válida de dias de teste.",
        },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    const { data: duplicatePlan, error: duplicateError } =
      await supabase
        .from("plans")
        .select("id")
        .ilike("name", name)
        .neq("id", id)
        .maybeSingle();

    if (duplicateError) {
      console.error(
        "[MASTER PLANOS] Erro ao verificar nome duplicado:",
        duplicateError
      );

      return NextResponse.json(
        {
          error:
            duplicateError.message ||
            "Não foi possível verificar o plano.",
        },
        { status: 500 }
      );
    }

    if (duplicatePlan) {
      return NextResponse.json(
        {
          error:
            "Já existe outro plano com esse nome.",
        },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("plans")
      .update({
        name,
        description,
        price,
        trial_days: trialDays,
        active,
      })
      .eq("id", id)
      .select(
        "id,name,description,price,trial_days,active,created_at,updated_at"
      )
      .single();

    if (error) {
      console.error(
        "[MASTER PLANOS] Erro ao atualizar plano:",
        error
      );

      return NextResponse.json(
        {
          error:
            error.message ||
            "Não foi possível atualizar o plano.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Plano atualizado com sucesso.",
        plan: data,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "[MASTER PLANOS] Erro inesperado no PUT:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao atualizar plano.",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE
 *
 * Exclui um plano somente se ele não estiver
 * sendo utilizado por nenhuma assinatura.
 */
export async function DELETE(request: Request) {
  try {
    const master = await verificarMaster();

    if (!master.autorizado) {
      return NextResponse.json(
        { error: master.mensagem },
        { status: master.status }
      );
    }

    const { searchParams } =
      new URL(request.url);

    const id = searchParams.get("id")?.trim();

    if (!id) {
      return NextResponse.json(
        {
          error: "ID do plano não informado.",
        },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    const { count, error: countError } =
      await supabase
        .from("subscriptions")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("plan_id", id);

    if (countError) {
      console.error(
        "[MASTER PLANOS] Erro ao verificar dependências:",
        countError
      );

      return NextResponse.json(
        {
          error:
            countError.message ||
            "Não foi possível verificar o uso do plano.",
        },
        { status: 500 }
      );
    }

    if ((count || 0) > 0) {
      return NextResponse.json(
        {
          error:
            "Este plano possui empresas/assinaturas vinculadas. Desative o plano em vez de excluí-lo.",
        },
        { status: 409 }
      );
    }

    const { error } = await supabase
      .from("plans")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(
        "[MASTER PLANOS] Erro ao excluir plano:",
        error
      );

      return NextResponse.json(
        {
          error:
            error.message ||
            "Não foi possível excluir o plano.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Plano excluído com sucesso.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "[MASTER PLANOS] Erro inesperado no DELETE:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao excluir plano.",
      },
      { status: 500 }
    );
  }
}