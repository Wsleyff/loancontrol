import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

async function verificarMaster() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      allowed: false,
      user: null,
    };
  }

  const masterEmail =
    process.env.MASTER_EMAIL
      ?.trim()
      .toLowerCase();

  const metadataRole =
    String(
      user.user_metadata?.role || ""
    ).toUpperCase();

  const isMaster =
    metadataRole === "MASTER" ||
    (!!masterEmail &&
      user.email?.toLowerCase() ===
        masterEmail);

  return {
    allowed: isMaster,
    user,
  };
}

function getAdminClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Configuração administrativa do Supabase não encontrada."
    );
  }

  return createSupabaseClient(
    url,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export async function GET() {
  try {
    const auth = await verificarMaster();

    if (!auth.allowed) {
      return NextResponse.json(
        {
          error: "Acesso restrito à Área Master.",
        },
        { status: 403 }
      );
    }

    const supabase = getAdminClient();

    const { data, error } =
      await supabase
        .from("platform_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

    if (error) {
      console.error(
        "[MASTER CONFIG] GET:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Não foi possível carregar as configurações.",
        },
        { status: 500 }
      );
    }

    if (!data) {
      const { data: created, error: createError } =
        await supabase
          .from("platform_settings")
          .insert({
            platform_name: "LoanControl",
            default_trial_days: 7,
            allow_new_registrations: true,
            maintenance_mode: false,
            withdrawal_enabled: true,
            withdrawal_minimum: 0,
            email_notifications: true,
            whatsapp_notifications: false,
          })
          .select("*")
          .single();

      if (createError) {
        console.error(
          "[MASTER CONFIG] CREATE:",
          createError
        );

        return NextResponse.json(
          {
            error:
              "Não foi possível criar as configurações.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        settings: created,
      });
    }

    return NextResponse.json({
      settings: data,
    });
  } catch (error) {
    console.error(
      "[MASTER CONFIG] GET inesperado:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await verificarMaster();

    if (!auth.allowed) {
      return NextResponse.json(
        {
          error: "Acesso restrito à Área Master.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const supabase = getAdminClient();

    const { data: existing } =
      await supabase
        .from("platform_settings")
        .select("id")
        .limit(1)
        .maybeSingle();

    const payload = {
      platform_name:
        String(
          body.platform_name ||
            "LoanControl"
        ).trim(),

      support_email:
        body.support_email
          ? String(
              body.support_email
            ).trim()
          : null,

      support_whatsapp:
        body.support_whatsapp
          ? String(
              body.support_whatsapp
            ).trim()
          : null,

      logo_url:
        body.logo_url
          ? String(
              body.logo_url
            ).trim()
          : null,

      default_trial_days:
        Math.max(
          0,
          Number(
            body.default_trial_days ?? 7
          )
        ),

      allow_new_registrations:
        Boolean(
          body.allow_new_registrations
        ),

      maintenance_mode:
        Boolean(
          body.maintenance_mode
        ),

      mercado_pago_access_token:
        body.mercado_pago_access_token
          ? String(
              body.mercado_pago_access_token
            ).trim()
          : null,

      mercado_pago_public_key:
        body.mercado_pago_public_key
          ? String(
              body.mercado_pago_public_key
            ).trim()
          : null,

      withdrawal_enabled:
        Boolean(
          body.withdrawal_enabled
        ),

      withdrawal_minimum:
        Math.max(
          0,
          Number(
            body.withdrawal_minimum ?? 0
          )
        ),

      email_notifications:
        Boolean(
          body.email_notifications
        ),

      whatsapp_notifications:
        Boolean(
          body.whatsapp_notifications
        ),
    };

    let data;
    let error;

    if (existing?.id) {
      const result =
        await supabase
          .from("platform_settings")
          .update(payload)
          .eq("id", existing.id)
          .select("*")
          .single();

      data = result.data;
      error = result.error;
    } else {
      const result =
        await supabase
          .from("platform_settings")
          .insert(payload)
          .select("*")
          .single();

      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error(
        "[MASTER CONFIG] PUT:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Não foi possível salvar as configurações.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      settings: data,
    });
  } catch (error) {
    console.error(
      "[MASTER CONFIG] PUT inesperado:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno.",
      },
      { status: 500 }
    );
  }
}