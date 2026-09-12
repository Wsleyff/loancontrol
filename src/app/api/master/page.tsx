"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  CreditCard,
  Users,
  Wallet,
  TrendingUp,
  Clock3,
  ShieldCheck,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";

type MasterData = {
  companies: number;
  trials: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  pendingWithdrawals: number;
  monthlyRevenue: number;
};

export default function MasterDashboard() {
  const [data, setData] = useState<MasterData>({
    companies: 0,
    trials: 0,
    activeSubscriptions: 0,
    expiredSubscriptions: 0,
    pendingWithdrawals: 0,
    monthlyRevenue: 0,
  });

  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      setLoading(true);

      const response = await fetch(
        "/api/master/dashboard",
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Não foi possível carregar o Dashboard Master."
        );
      }

      const result = await response.json();

      setData({
        companies: Number(result.companies || 0),
        trials: Number(result.trials || 0),
        activeSubscriptions: Number(
          result.activeSubscriptions || 0
        ),
        expiredSubscriptions: Number(
          result.expiredSubscriptions || 0
        ),
        pendingWithdrawals: Number(
          result.pendingWithdrawals || 0
        ),
        monthlyRevenue: Number(
          result.monthlyRevenue || 0
        ),
      });
    } catch (error) {
      console.error(
        "[MASTER DASHBOARD]",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const money = new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  );

  const cards = [
    {
      title: "Empresas cadastradas",
      value: data.companies,
      icon: Building2,
      description:
        "Total de empresas no LoanControl",
    },
    {
      title: "Períodos de teste",
      value: data.trials,
      icon: Clock3,
      description:
        "Empresas atualmente em teste",
    },
    {
      title: "Assinaturas ativas",
      value: data.activeSubscriptions,
      icon: CreditCard,
      description:
        "Clientes com assinatura ativa",
    },
    {
      title: "Assinaturas expiradas",
      value: data.expiredSubscriptions,
      icon: Users,
      description:
        "Empresas que precisam renovar",
    },
    {
      title: "Saques pendentes",
      value: data.pendingWithdrawals,
      icon: Wallet,
      description:
        "Solicitações aguardando aprovação",
    },
    {
      title: "Receita mensal",
      value: money.format(
        data.monthlyRevenue
      ),
      icon: TrendingUp,
      description:
        "Receita das assinaturas",
    },
  ];

  return (
    <main
      style={{
        padding: 28,
        background: "#f7f9fc",
        minHeight:
          "calc(100vh - 70px)",
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "flex-start",
            gap: 20,
            marginBottom: 28,
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding:
                  "6px 10px",
                borderRadius: 999,
                background: "#eef2ff",
                color: "#4338ca",
                fontSize: 11,
                fontWeight: 800,
                marginBottom: 10,
              }}
            >
              <ShieldCheck size={14} />
              ADMINISTRAÇÃO MASTER
            </div>

            <h1
              style={{
                margin: 0,
                color: "#101828",
                fontSize: 32,
                fontWeight: 850,
                letterSpacing: "-0.8px",
              }}
            >
              Central de controle
            </h1>

            <p
              style={{
                margin:
                  "8px 0 0",
                color: "#667085",
                fontSize: 14,
              }}
            >
              Gerencie empresas,
              planos, assinaturas e
              operações do LoanControl.
            </p>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            style={{
              height: 42,
              padding:
                "0 14px",
              display: "flex",
              alignItems:
                "center",
              gap: 8,
              border:
                "1px solid #d0d5dd",
              borderRadius: 10,
              background: "#fff",
              color: "#344054",
              fontWeight: 700,
              cursor:
                loading
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            <RefreshCw
              size={16}
              style={{
                animation:
                  loading
                    ? "masterRefresh 1s linear infinite"
                    : undefined,
              }}
            />
            Atualizar
          </button>
        </div>

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(210px, 1fr))",
            gap: 16,
          }}
        >
          {cards.map((card) => {
            const Icon =
              card.icon;

            return (
              <div
                key={card.title}
                style={{
                  padding: 21,
                  background: "#fff",
                  border:
                    "1px solid #e4e7ec",
                  borderRadius: 18,
                  boxShadow:
                    "0 8px 24px rgba(16,24,40,.04)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "center",
                  }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      display:
                        "grid",
                      placeItems:
                        "center",
                      borderRadius: 12,
                      background:
                        "#eef2ff",
                      color:
                        "#4f46e5",
                    }}
                  >
                    <Icon size={20} />
                  </div>

                  <ArrowUpRight
                    size={17}
                    color="#98a2b3"
                  />
                </div>

                <div
                  style={{
                    marginTop: 19,
                    color: "#667085",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {card.title}
                </div>

                <div
                  style={{
                    marginTop: 5,
                    color: "#101828",
                    fontSize: 25,
                    fontWeight: 850,
                    letterSpacing:
                      "-0.5px",
                  }}
                >
                  {loading
                    ? "..."
                    : card.value}
                </div>

                <div
                  style={{
                    marginTop: 5,
                    color: "#98a2b3",
                    fontSize: 11,
                    lineHeight: 1.4,
                  }}
                >
                  {card.description}
                </div>
              </div>
            );
          })}
        </section>

        <section
          style={{
            marginTop: 22,
            padding: 24,
            background: "#fff",
            border:
              "1px solid #e4e7ec",
            borderRadius: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems:
                "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                display: "grid",
                placeItems: "center",
                borderRadius: 13,
                background:
                  "#f0fdf4",
                color: "#16a34a",
              }}
            >
              <ShieldCheck
                size={21}
              />
            </div>

            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 17,
                  color: "#101828",
                }}
              >
                Área Master protegida
              </h2>

              <p
                style={{
                  margin:
                    "4px 0 0",
                  color: "#667085",
                  fontSize: 13,
                }}
              >
                Este painel é exclusivo
                para administração do
                SaaS.
              </p>
            </div>
          </div>
        </section>
      </div>

      <style jsx>{`
        @keyframes masterRefresh {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 700px) {
          main {
            padding: 18px !important;
          }
        }
      `}</style>
    </main>
  );
}