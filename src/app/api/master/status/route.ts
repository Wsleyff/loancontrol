import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        {
          isMaster: false,
        },
        { status: 401 }
      );
    }

    /*
     * Primeira forma de identificar MASTER:
     * metadata do usuário do Supabase Auth.
     *
     * Exemplo:
     * user_metadata: { role: "MASTER" }
     */
    const metadataRole = String(
      user.user_metadata?.role || ""
    ).toUpperCase();

    if (metadataRole === "MASTER") {
      return NextResponse.json({
        isMaster: true,
      });
    }

    /*
     * Segunda forma:
     * permitir definir o e-mail MASTER no .env.local.
     *
     * Exemplo:
     * MASTER_EMAIL=seuemail@gmail.com
     */
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

    if (
      masterEmail &&
      userEmail &&
      userEmail === masterEmail
    ) {
      return NextResponse.json({
        isMaster: true,
      });
    }

    return NextResponse.json({
      isMaster: false,
    });
  } catch (error) {
    console.error(
      "[MASTER STATUS] Erro:",
      error
    );

    return NextResponse.json(
      {
        isMaster: false,
      },
      { status: 500 }
    );
  }
}