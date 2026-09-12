import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type CadastroBody = {
  companyName?: string;
  document?: string;
  phone?: string;
  responsibleName?: string;
  email?: string;
  password?: string;
  planId?: string;
};

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Variáveis do Supabase não configuradas. Verifique NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function POST(request: Request) {
  let body: CadastroBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Dados do cadastro inválidos." },
      { status: 400 }
    );
  }

  const companyName = body.companyName?.trim();
  const document = body.document?.trim() || null;
  const phone = body.phone?.trim() || null;
  const responsibleName = body.responsibleName?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  const planId = body.planId;

  if (!companyName) {
    return NextResponse.json(
      { error: "Informe o nome da empresa." },
      { status: 400 }
    );
  }

  if (!responsibleName) {
    return NextResponse.json(
      { error: "Informe o nome do responsável." },
      { status: 400 }
    );
  }

  if (!email) {
    return NextResponse.json(
      { error: "Informe o e-mail." },
      { status: 400 }
    );
  }

  if (!password || password.length < 6) {
    return NextResponse.json(
      { error: "A senha precisa ter pelo menos 6 caracteres." },
      { status: 400 }
    );
  }

  if (!planId) {
    return NextResponse.json(
      { error: "Selecione um plano." },
      { status: 400 }
    );
  }

  const supabase = getAdminClient();

  let createdUserId: string | null = null;
  let createdCompanyId: string | null = null;

  try {
    // =====================================================
    // 1. CONFERE O PLANO
    // =====================================================

    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("id,name,price,trial_days,active")
      .eq("id", planId)
      .eq("active", true)
      .maybeSingle();

    if (planError) {
      console.error("[CADASTRO] Erro ao consultar plano:", planError);

      return NextResponse.json(
        { error: "Não foi possível verificar o plano selecionado." },
        { status: 500 }
      );
    }

    if (!plan) {
      return NextResponse.json(
        { error: "O plano selecionado não está disponível." },
        { status: 400 }
      );
    }

    // =====================================================
    // 2. VERIFICA SE O E-MAIL JÁ EXISTE
    // =====================================================

    const { data: existingUsers, error: usersError } =
      await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

    if (usersError) {
      console.error("[CADASTRO] Erro ao verificar usuários:", usersError);

      return NextResponse.json(
        { error: "Não foi possível verificar o e-mail informado." },
        { status: 500 }
      );
    }

    const emailExists = existingUsers.users.some(
      (user) => user.email?.toLowerCase() === email
    );

    if (emailExists) {
      return NextResponse.json(
        {
          error:
            "Este e-mail já está cadastrado. Se você já possui uma conta, faça login.",
        },
        { status: 409 }
      );
    }

    // =====================================================
    // 3. CRIA USUÁRIO NO SUPABASE AUTH
    // =====================================================

    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: responsibleName,
          role: "ADMIN",
        },
      });

    if (authError || !authData.user) {
      console.error("[CADASTRO] Erro Auth:", authError);

      return NextResponse.json(
        {
          error:
            authError?.message ||
            "Não foi possível criar o usuário.",
        },
        { status: 400 }
      );
    }

    createdUserId = authData.user.id;

    // =====================================================
    // 4. CRIA A EMPRESA
    // =====================================================

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert({
        name: companyName,
        document,
        email,
        phone,
      })
      .select("*")
      .single();

    if (companyError || !company) {
      console.error("[CADASTRO] Erro empresa:", companyError);

      await supabase.auth.admin.deleteUser(createdUserId);

      return NextResponse.json(
        {
          error:
            companyError?.message ||
            "Não foi possível criar a empresa.",
        },
        { status: 400 }
      );
    }

    createdCompanyId = company.id;

    // =====================================================
    // 5. CRIA O PERFIL DO RESPONSÁVEL
    // =====================================================

    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: createdUserId,
        full_name: responsibleName,
        email,
        phone,
      });

    if (profileError) {
      console.error("[CADASTRO] Erro perfil:", profileError);

      await supabase
        .from("companies")
        .delete()
        .eq("id", createdCompanyId);

      await supabase.auth.admin.deleteUser(createdUserId);

      return NextResponse.json(
        {
          error:
            profileError.message ||
            "Não foi possível criar o perfil do responsável.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 6. VINCULA O USUÁRIO À EMPRESA
    // =====================================================

    const { error: companyUserError } = await supabase
      .from("company_users")
      .insert({
        company_id: createdCompanyId,
        user_id: createdUserId,
        role: "ADMIN",
        status: "ACTIVE",
      });

    if (companyUserError) {
      console.error(
        "[CADASTRO] Erro company_users:",
        companyUserError
      );

      await supabase
        .from("profiles")
        .delete()
        .eq("id", createdUserId);

      await supabase
        .from("companies")
        .delete()
        .eq("id", createdCompanyId);

      await supabase.auth.admin.deleteUser(createdUserId);

      return NextResponse.json(
        {
          error:
            companyUserError.message ||
            "Não foi possível vincular o responsável à empresa.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 7. CRIA O PERÍODO DE TESTE
    // =====================================================

    const trialDays =
      Number.isInteger(plan.trial_days) && plan.trial_days > 0
        ? plan.trial_days
        : 7;

    const trialStartedAt = new Date();
    const trialEndsAt = new Date(
      trialStartedAt.getTime() +
        trialDays * 24 * 60 * 60 * 1000
    );

    const { error: subscriptionError } = await supabase
      .from("subscriptions")
      .insert({
        company_id: createdCompanyId,
        plan_id: plan.id,
        status: "TRIAL",
        trial_started_at: trialStartedAt.toISOString(),
        trial_ends_at: trialEndsAt.toISOString(),
        current_period_start: trialStartedAt.toISOString(),
        current_period_end: trialEndsAt.toISOString(),
      });

    if (subscriptionError) {
      console.error(
        "[CADASTRO] Erro assinatura:",
        subscriptionError
      );

      await supabase
        .from("company_users")
        .delete()
        .eq("user_id", createdUserId);

      await supabase
        .from("profiles")
        .delete()
        .eq("id", createdUserId);

      await supabase
        .from("companies")
        .delete()
        .eq("id", createdCompanyId);

      await supabase.auth.admin.deleteUser(createdUserId);

      return NextResponse.json(
        {
          error:
            subscriptionError.message ||
            "Não foi possível criar o período de teste.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 8. RETORNO
    // =====================================================

    return NextResponse.json(
      {
        success: true,
        message: "Empresa cadastrada com sucesso!",
        companyId: createdCompanyId,
        userId: createdUserId,
        plan: {
          id: plan.id,
          name: plan.name,
          price: plan.price,
          trialDays,
        },
        trialEndsAt: trialEndsAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[CADASTRO] Erro inesperado:", error);

    // Limpeza de segurança caso alguma etapa tenha falhado.
    if (createdCompanyId) {
      await supabase
        .from("subscriptions")
        .delete()
        .eq("company_id", createdCompanyId);

      await supabase
        .from("company_users")
        .delete()
        .eq("company_id", createdCompanyId);

      if (createdUserId) {
        await supabase
          .from("profiles")
          .delete()
          .eq("id", createdUserId);
      }

      await supabase
        .from("companies")
        .delete()
        .eq("id", createdCompanyId);
    }

    if (createdUserId) {
      await supabase.auth.admin.deleteUser(createdUserId);
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao realizar o cadastro.",
      },
      { status: 500 }
    );
  }
}