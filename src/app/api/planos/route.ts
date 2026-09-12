import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
      console.error(
        "[PLANOS] Variáveis do Supabase não configuradas."
      );

      return NextResponse.json(
        {
          error:
            "Configuração do Supabase incompleta.",
        },
        { status: 500 }
      );
    }

    /*
     * IMPORTANTE:
     * O cadastro é público, então o visitante ainda não está
     * autenticado. Por isso usamos a Service Role somente no
     * servidor para consultar os planos ativos.
     *
     * Esta chave NUNCA é enviada para o navegador.
     */
    const supabase = createClient(
      url,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { data, error } = await supabase
      .from("plans")
      .select(
        "id,name,description,price,trial_days"
      )
      .eq("active", true)
      .order("price", {
        ascending: true,
      });

    if (error) {
      console.error(
        "[PLANOS] Erro Supabase:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Não foi possível carregar os planos.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        plans: data || [],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "[PLANOS] Erro inesperado:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Erro interno ao carregar os planos.",
      },
      { status: 500 }
    );
  }
}