"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ShieldCheck,
  Loader2,
  LogOut,
} from "lucide-react";

export default function MasterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkMasterAccess() {
      try {
        const supabase = createClient();

        if (!supabase) {
          router.replace("/login");
          return;
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/login");
          return;
        }

        const response = await fetch(
          "/api/master/status",
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!mounted) return;

        if (data?.isMaster !== true) {
          setAllowed(false);
          setChecking(false);
          return;
        }

        setAllowed(true);
        setChecking(false);
      } catch (error) {
        console.error(
          "[MASTER] Erro ao verificar acesso:",
          error
        );

        if (!mounted) return;

        setAllowed(false);
        setChecking(false);
      }
    }

    checkMasterAccess();

    return () => {
      mounted = false;
    };
  }, [router]);

  async function logout() {
    const supabase = createClient();

    if (supabase) {
      await supabase.auth.signOut();
    }

    router.replace("/login");
  }

  if (checking) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f5f7fb",
          padding: 24,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            padding: 36,
            background: "#fff",
            border: "1px solid #e4e7ec",
            borderRadius: 24,
            textAlign: "center",
            boxShadow:
              "0 20px 60px rgba(16,24,40,.08)",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              margin: "0 auto 20px",
              display: "grid",
              placeItems: "center",
              borderRadius: 18,
              background: "#eef2ff",
              color: "#4f46e5",
            }}
          >
            <ShieldCheck size={30} />
          </div>

          <Loader2
            size={24}
            style={{
              margin: "0 auto 16px",
              animation:
                "masterSpin 1s linear infinite",
              color: "#4f46e5",
            }}
          />

          <h1
            style={{
              margin: 0,
              color: "#101828",
              fontSize: 21,
            }}
          >
            Verificando acesso Master
          </h1>

          <p
            style={{
              margin: "10px 0 0",
              color: "#667085",
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            Aguarde enquanto verificamos suas
            permissões administrativas.
          </p>
        </div>

        <style jsx>{`
          @keyframes masterSpin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </main>
    );
  }

  if (!allowed) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          background:
            "radial-gradient(circle at top, #eef2ff, #f8fafc 45%, #f5f7fb)",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 500,
            padding: 40,
            background: "#fff",
            border: "1px solid #e4e7ec",
            borderRadius: 26,
            textAlign: "center",
            boxShadow:
              "0 25px 70px rgba(16,24,40,.10)",
          }}
        >
          <div
            style={{
              width: 74,
              height: 74,
              margin: "0 auto 20px",
              display: "grid",
              placeItems: "center",
              borderRadius: 22,
              background: "#fef2f2",
              color: "#dc2626",
            }}
          >
            <ShieldCheck size={34} />
          </div>

          <h1
            style={{
              margin: 0,
              color: "#101828",
              fontSize: 28,
              fontWeight: 800,
            }}
          >
            Acesso restrito
          </h1>

          <p
            style={{
              margin: "12px auto 0",
              maxWidth: 400,
              color: "#667085",
              fontSize: 14,
              lineHeight: 1.7,
            }}
          >
            Esta área é exclusiva para o
            administrador MASTER do LoanControl.
          </p>

          <button
            onClick={() => router.push("/dashboard")}
            style={{
              width: "100%",
              height: 50,
              marginTop: 24,
              border: 0,
              borderRadius: 12,
              background: "#111827",
              color: "#fff",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Voltar ao Dashboard
          </button>

          <button
            onClick={logout}
            style={{
              width: "100%",
              height: 46,
              marginTop: 9,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              border: "1px solid #d0d5dd",
              borderRadius: 12,
              background: "#fff",
              color: "#344054",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <LogOut size={17} />
            Sair da conta
          </button>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}