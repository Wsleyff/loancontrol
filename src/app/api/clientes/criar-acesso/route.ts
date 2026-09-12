import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    const customerId =
      typeof body?.customerId === "string" ? body.customerId.trim() : "";

    const temporaryPassword =
      typeof body?.temporaryPassword === "string"
        ? body.temporaryPassword
        : "";

    if (!customerId) {
      return NextResponse.json(
        { error: "Cliente não informado." },
        { status: 400 }
      );
    }

    if (temporaryPassword.length < 6) {
      return NextResponse.json(
        { error: "A senha temporária precisa ter pelo menos 6 caracteres." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Sua sessão expirou. Faça login novamente." },
        { status: 401 }
      );
    }

    const { data: memberships, error: membershipError } = await supabase
      .from("company_users")
      .select("company_id, role, status")
      .eq("user_id", user.id)
      .eq("status", "ACTIVE");

    if (membershipError || !memberships?.length) {
      return NextResponse.json(
        { error: "Usuário sem empresa ativa ou sem permissão." },
        { status: 403 }
      );
    }

    const companyIds = memberships.map((m) => m.company_id);

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: "Cliente não encontrado." },
        { status: 404 }
      );
    }

    if (!companyIds.includes(customer.company_id)) {
      return NextResponse.json(
        { error: "Você não tem permissão para este cliente." },
        { status: 403 }
      );
    }

    const email =
      typeof customer.email === "string"
        ? customer.email.trim().toLowerCase()
        : "";

    if (!email) {
      return NextResponse.json(
        {
          error:
            "O cliente precisa ter um e-mail cadastrado antes de liberar o acesso.",
        },
        { status: 400 }
      );
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json(
        {
          error:
            "SUPABASE_SERVICE_ROLE_KEY não está configurada no .env.local.",
        },
        { status: 500 }
      );
    }

    const admin = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    let authUserId =
      typeof customer.auth_user_id === "string" && customer.auth_user_id
        ? customer.auth_user_id
        : null;

    if (authUserId) {
      const { data, error } = await admin.auth.admin.updateUserById(
        authUserId,
        {
          password: temporaryPassword,
          email,
          email_confirm: true,
          user_metadata: {
            customer_id: customer.id,
            role: "CUSTOMER",
          },
        }
      );

      if (error || !data.user) {
        console.error("[CRIAR ACESSO] updateUserById:", error);
        return NextResponse.json(
          { error: error?.message || "Não foi possível atualizar o acesso." },
          { status: 500 }
        );
      }
    } else {
      const { data: usersData, error: listError } =
        await admin.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });

      if (listError) {
        console.error("[CRIAR ACESSO] listUsers:", listError);
      }

      const existing = usersData?.users?.find(
        (u) => u.email?.trim().toLowerCase() === email
      );

      if (existing) {
        const { data, error } = await admin.auth.admin.updateUserById(
          existing.id,
          {
            password: temporaryPassword,
            email,
            email_confirm: true,
            user_metadata: {
              customer_id: customer.id,
              role: "CUSTOMER",
            },
          }
        );

        if (error || !data.user) {
          return NextResponse.json(
            {
              error:
                error?.message ||
                "Não foi possível atualizar o usuário existente.",
            },
            { status: 500 }
          );
        }

        authUserId = existing.id;
      } else {
        const { data, error } = await admin.auth.admin.createUser({
          email,
          password: temporaryPassword,
          email_confirm: true,
          user_metadata: {
            customer_id: customer.id,
            role: "CUSTOMER",
          },
        });

        if (error || !data.user) {
          console.error("[CRIAR ACESSO] createUser:", error);
          return NextResponse.json(
            {
              error:
                error?.message ||
                "Não foi possível criar o acesso do cliente.",
            },
            { status: 500 }
          );
        }

        authUserId = data.user.id;
      }
    }

    const { error: linkError } = await admin
      .from("customers")
      .update({
        auth_user_id: authUserId,
        portal_enabled: true,
        email,
      })
      .eq("id", customer.id);

    if (linkError) {
      console.error("[CRIAR ACESSO] customers:", linkError);
      return NextResponse.json(
        {
          error:
            "O usuário foi criado, mas não foi possível vincular o acesso ao cliente.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Acesso liberado com sucesso.",
    });
  } catch (error) {
    console.error("[CRIAR ACESSO] erro inesperado:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao liberar acesso.",
      },
      { status: 500 }
    );
  }
}
