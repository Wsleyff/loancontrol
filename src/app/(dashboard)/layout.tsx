"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";

type SubscriptionStatus = {
  allowed: boolean;
  reason?: string;
  companyId?: string;
  companyName?: string | null;
  status?: string;
  trialEndsAt?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  daysRemaining?: number;
  plan?: {
    id: string;
    name: string;
    description?: string | null;
    price?: number;
    trialDays?: number;
    active?: boolean;
  } | null;
  error?: string;
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] =
    useState<SubscriptionStatus | null>(null);

  useEffect(() => {
    let mounted = true;

    async function checkAccess() {
      try {
        setLoading(true);

        // =====================================================
        // 1. PRIMEIRO: VERIFICA SE É MASTER
        // =====================================================
        const masterResponse = await fetch(
          "/api/master/status",
          {
            method: "GET",
            cache: "no-store",
            headers: {
              "Cache-Control": "no-cache",
            },
          }
        );

        let masterData: {
          isMaster?: boolean;
        } = {};

        try {
          masterData = await masterResponse.json();
        } catch {
          masterData = {};
        }

        console.log(
          "[MASTER] Status:",
          masterResponse.status,
          masterData
        );

        // =====================================================
        // 2. MASTER NÃO PRECISA DE ASSINATURA
        // =====================================================
        if (masterData?.isMaster === true) {
          console.log(
            "[MASTER] Usuário MASTER detectado. Acesso liberado."
          );

          if (mounted) {
            setSubscription({
              allowed: true,
              reason: "MASTER",
              status: "MASTER",
            });
          }

          return;
        }

        // =====================================================
        // 3. USUÁRIO NORMAL: VERIFICA ASSINATURA
        // =====================================================
        const response = await fetch(
          "/api/assinatura/status",
          {
            method: "GET",
            cache: "no-store",
            headers: {
              "Cache-Control": "no-cache",
            },
          }
        );

        let data: SubscriptionStatus = {
          allowed: false,
        };

        try {
          const json = await response.json();

          if (json && typeof json === "object") {
            data = {
              allowed: Boolean(json.allowed),
              reason: json.reason,
              companyId: json.companyId,
              companyName: json.companyName,
              status: json.status,
              trialEndsAt: json.trialEndsAt,
              currentPeriodStart:
                json.currentPeriodStart,
              currentPeriodEnd:
                json.currentPeriodEnd,
              daysRemaining:
                json.daysRemaining,
              plan: json.plan || null,
              error: json.error,
            };
          }
        } catch {
          data = {
            allowed: false,
            reason: "INVALID_RESPONSE",
            error:
              "A API retornou uma resposta inválida.",
          };
        }

        console.log(
          "[ASSINATURA] Resposta:",
          response.status,
          data
        );

        if (!mounted) return;

        // =====================================================
        // 4. SEM LOGIN
        // =====================================================
        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        setSubscription(data);

        if (!response.ok) {
          console.error(
            "[ASSINATURA] Erro:",
            data
          );
        }
      } catch (error) {
        console.error(
          "[ASSINATURA] Falha na verificação:",
          error
        );

        if (!mounted) return;

        setSubscription({
          allowed: false,
          reason: "NETWORK_ERROR",
          error:
            "Não foi possível verificar o acesso.",
        });
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    checkAccess();

    return () => {
      mounted = false;
    };
  }, [router]);

  // ===========================================================
  // CARREGANDO
  // ===========================================================
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg,#f8fafc,#eef2ff)",
          fontFamily:
            "Inter, Arial, sans-serif",
        }}
      >
        <div
          style={{
            width: "420px",
            maxWidth: "90%",
            background: "#ffffff",
            borderRadius: "20px",
            padding: "35px",
            textAlign: "center",
            boxShadow:
              "0 20px 60px rgba(15,23,42,.10)",
          }}
        >
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "15px",
              margin: "0 auto 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background:
                "linear-gradient(135deg,#2563eb,#3b82f6)",
              color: "#fff",
              fontSize: "22px",
              fontWeight: 900,
            }}
          >
            LC
          </div>

          <h2
            style={{
              margin: 0,
              color: "#0f172a",
              fontSize: "20px",
            }}
          >
            LoanControl
          </h2>

          <p
            style={{
              marginTop: "8px",
              color: "#64748b",
              fontSize: "14px",
            }}
          >
            Verificando acesso...
          </p>

          <div
            style={{
              width: "32px",
              height: "32px",
              border: "3px solid #dbeafe",
              borderTopColor: "#2563eb",
              borderRadius: "50%",
              margin: "22px auto 0",
              animation:
                "loancontrol-spin 0.8s linear infinite",
            }}
          />

          <style jsx>{`
            @keyframes loancontrol-spin {
              to {
                transform: rotate(360deg);
              }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // ===========================================================
  // MASTER
  // ===========================================================
  if (subscription?.reason === "MASTER") {
    return <AppShell>{children}</AppShell>;
  }

  // ===========================================================
  // USUÁRIO SEM ACESSO
  // ===========================================================
  if (!subscription?.allowed) {
    const trialExpired =
      subscription?.reason === "TRIAL_EXPIRED";

    const noSubscription =
      subscription?.reason === "NO_SUBSCRIPTION";

    const title = trialExpired
      ? "Seu período de teste terminou"
      : noSubscription
        ? "Nenhuma assinatura encontrada"
        : "Acesso temporariamente bloqueado";

    const description = trialExpired
      ? "Seu período gratuito chegou ao fim. Escolha um plano para continuar usando o LoanControl."
      : noSubscription
        ? "Sua empresa ainda não possui uma assinatura ativa."
        : subscription?.error ||
          "Sua assinatura não está ativa neste momento.";

    return (
      <div
        style={{
          minHeight: "100vh",
          background:
            "linear-gradient(135deg,#f8fafc,#eef2ff)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          fontFamily:
            "Inter, Arial, sans-serif",
        }}
      >
        <div
          style={{
            width: "560px",
            maxWidth: "100%",
            background: "#fff",
            borderRadius: "24px",
            padding: "42px",
            boxShadow:
              "0 25px 80px rgba(15,23,42,.12)",
            border: "1px solid #e2e8f0",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "70px",
              height: "70px",
              borderRadius: "20px",
              margin: "0 auto 22px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#fff7ed",
              border: "1px solid #fed7aa",
              fontSize: "32px",
            }}
          >
            🔒
          </div>

          <div
            style={{
              fontSize: "12px",
              fontWeight: 800,
              color: "#2563eb",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "8px",
            }}
          >
            LoanControl
          </div>

          <h1
            style={{
              margin: "0 0 12px",
              color: "#0f172a",
              fontSize: "28px",
              fontWeight: 850,
              letterSpacing: "-0.6px",
            }}
          >
            {title}
          </h1>

          <p
            style={{
              margin: "0 auto",
              maxWidth: "440px",
              color: "#64748b",
              fontSize: "15px",
              lineHeight: 1.7,
            }}
          >
            {description}
          </p>

          {subscription?.companyName && (
            <div
              style={{
                marginTop: "24px",
                padding: "14px 16px",
                borderRadius: "12px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                color: "#475569",
                fontSize: "13px",
              }}
            >
              Empresa:{" "}
              <strong>
                {subscription.companyName}
              </strong>
            </div>
          )}

          {subscription?.plan?.name && (
            <div
              style={{
                marginTop: "10px",
                color: "#64748b",
                fontSize: "13px",
              }}
            >
              Plano atual:{" "}
              <strong
                style={{
                  color: "#0f172a",
                }}
              >
                {subscription.plan.name}
              </strong>
            </div>
          )}

          <button
            type="button"
            onClick={() =>
              router.push("/assinatura")
            }
            style={{
              width: "100%",
              height: "50px",
              marginTop: "28px",
              border: 0,
              borderRadius: "12px",
              background:
                "linear-gradient(135deg,#2563eb,#3b82f6)",
              color: "#fff",
              fontSize: "14px",
              fontWeight: 800,
              cursor: "pointer",
              boxShadow:
                "0 10px 25px rgba(37,99,235,.25)",
            }}
          >
            Ver planos e continuar
          </button>

          <button
            type="button"
            onClick={() =>
              router.push("/login")
            }
            style={{
              width: "100%",
              height: "46px",
              marginTop: "10px",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              background: "#fff",
              color: "#475569",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Voltar para o login
          </button>
        </div>
      </div>
    );
  }

  // ===========================================================
  // EMPRESA NORMAL COM ASSINATURA ATIVA
  // ===========================================================
  return <AppShell>{children}</AppShell>;
}