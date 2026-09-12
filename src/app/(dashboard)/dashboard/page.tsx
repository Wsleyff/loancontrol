"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  DollarSign,
  Download,
  FileText,
  Landmark,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/utils/format-currency";

type Loan = {
  id: string;
  customer_id: string;
  status: string;
  amount: number;
  total_amount: number;
};

type Installment = {
  id: string;
  loan_id: string;
  due_date: string;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: string;
  installment_number: number;
};

type Payment = {
  id: string;
  amount: number;
  paid_at: string;
  payment_method?: string | null;
};

type Customer = {
  id: string;
  full_name: string;
  status: string;
};

type DashboardData = {
  carteiraAtiva: number;
  totalEmprestado: number;
  totalAReceber: number;
  recebidoMes: number;
  vencido: number;
  clientesAtivos: number;
  emprestimosAtivos: number;
  parcelasAtrasadas: number;
  parcelasHoje: number;
  parcelasProximas: number;
  taxaInadimplencia: number;
  totalRecebidoHistorico: number;
  proximosVencimentos: Installment[];
  parcelasVencidas: Installment[];
  ultimosPagamentos: Payment[];
  clientes: Customer[];
  pagamentos: Payment[];
};

type ChartItem = {
  label: string;
  value: number;
};

const EMPTY_DATA: DashboardData = {
  carteiraAtiva: 0,
  totalEmprestado: 0,
  totalAReceber: 0,
  recebidoMes: 0,
  vencido: 0,
  clientesAtivos: 0,
  emprestimosAtivos: 0,
  parcelasAtrasadas: 0,
  parcelasHoje: 0,
  parcelasProximas: 0,
  taxaInadimplencia: 0,
  totalRecebidoHistorico: 0,
  proximosVencimentos: [],
  parcelasVencidas: [],
  ultimosPagamentos: [],
  clientes: [],
  pagamentos: [],
};

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("pt-BR");
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function paymentMethodLabel(method?: string | null) {
  const methods: Record<string, string> = {
    CASH: "Dinheiro",
    PIX: "PIX",
    TRANSFER: "Transferência",
    DEBIT_CARD: "Débito",
    CREDIT_CARD: "Crédito",
    OTHER: "Outro",
  };

  return methods[method || ""] || method || "Pagamento";
}

function isOpenInstallment(installment: Installment) {
  return (
    installment.status !== "PAID" &&
    installment.status !== "CANCELLED" &&
    Number(installment.remaining_amount || 0) > 0
  );
}

function isOverdue(installment: Installment, today: Date) {
  const due = new Date(`${installment.due_date}T00:00:00`);

  return isOpenInstallment(installment) && due < today;
}

function isToday(installment: Installment, today: Date) {
  return (
    isOpenInstallment(installment) &&
    installment.due_date ===
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(today.getDate()).padStart(2, "0")}`
  );
}

function getMonthLabel(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    month: "short",
  }).replace(".", "");
}

function buildLastSixMonths(payments: Payment[]): ChartItem[] {
  const result: ChartItem[] = [];
  const today = new Date();

  for (let i = 5; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);

    const year = date.getFullYear();
    const month = date.getMonth();

    const total = payments
      .filter((payment) => {
        const paid = new Date(payment.paid_at);

        return (
          paid.getFullYear() === year &&
          paid.getMonth() === month
        );
      })
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    result.push({
      label: getMonthLabel(date),
      value: total,
    });
  }

  return result;
}

function percentage(value: number) {
  if (!Number.isFinite(value)) return "0,0%";

  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

function MiniProgress({
  value,
  max,
}: {
  value: number;
  max: number;
}) {
  const width =
    max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div
      style={{
        height: 7,
        width: "100%",
        background: "#eef2f7",
        borderRadius: 999,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${width}%`,
          height: "100%",
          background: "#111827",
          borderRadius: 999,
          transition: "width .4s ease",
        }}
      />
    </div>
  );
}

function StatusPill({
  children,
  type = "neutral",
}: {
  children: React.ReactNode;
  type?: "success" | "danger" | "warning" | "neutral";
}) {
  const styles = {
    success: {
      background: "#ecfdf5",
      color: "#047857",
      border: "#a7f3d0",
    },
    danger: {
      background: "#fef2f2",
      color: "#b91c1c",
      border: "#fecaca",
    },
    warning: {
      background: "#fffbeb",
      color: "#b45309",
      border: "#fde68a",
    },
    neutral: {
      background: "#f8fafc",
      color: "#475569",
      border: "#e2e8f0",
    },
  };

  const current = styles[type];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 9px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        background: current.background,
        color: current.color,
        border: `1px solid ${current.border}`,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  danger,
  loading,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  trend?: string;
  danger?: boolean;
  loading?: boolean;
}) {
  return (
    <div
      className="card"
      style={{
        padding: 20,
        position: "relative",
        overflow: "hidden",
        minHeight: 150,
        border: danger
          ? "1px solid #fee2e2"
          : "1px solid #e5e7eb",
        background: "#ffffff",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 15,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 13,
            display: "grid",
            placeItems: "center",
            background: danger ? "#fef2f2" : "#f3f4f6",
            color: danger ? "#dc2626" : "#111827",
          }}
        >
          {icon}
        </div>

        {trend && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: danger ? "#dc2626" : "#059669",
              background: danger ? "#fef2f2" : "#ecfdf5",
              padding: "5px 8px",
              borderRadius: 999,
            }}
          >
            {trend}
          </span>
        )}
      </div>

      <div style={{ marginTop: 18 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#64748b",
          }}
        >
          {title}
        </div>

        <div
          style={{
            marginTop: 5,
            fontSize: 25,
            lineHeight: 1.15,
            fontWeight: 800,
            letterSpacing: "-0.6px",
            color: danger ? "#b91c1c" : "#111827",
          }}
        >
          {loading ? (
            <span style={{ color: "#94a3b8" }}>...</span>
          ) : (
            value
          )}
        </div>

        <div
          style={{
            marginTop: 6,
            fontSize: 11,
            color: "#94a3b8",
          }}
        >
          {subtitle}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 15,
        marginBottom: 18,
      }}
    >
      <div>
        <h2
          style={{
            margin: 0,
            fontSize: 17,
            fontWeight: 800,
            color: "#111827",
            letterSpacing: "-0.2px",
          }}
        >
          {title}
        </h2>

        {subtitle && (
          <p
            style={{
              margin: "5px 0 0",
              color: "#94a3b8",
              fontSize: 12,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {action}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const carregarDashboard = useCallback(async () => {
    try {
      setError("");

      const supabase = createClient();

      if (!supabase) {
        throw new Error("Supabase não configurado.");
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error("Usuário não autenticado.");
      }

      const { data: companyUser, error: companyError } =
        await supabase
          .from("company_users")
          .select("company_id")
          .eq("user_id", user.id)
          .eq("status", "ACTIVE")
          .limit(1)
          .maybeSingle();

      if (companyError) {
        throw companyError;
      }

      if (!companyUser?.company_id) {
        throw new Error(
          "Seu usuário ainda não está vinculado a uma empresa."
        );
      }

      const companyId = companyUser.company_id;

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const inicioMes = new Date(
        hoje.getFullYear(),
        hoje.getMonth(),
        1
      );

      const inicioSeisMeses = new Date(
        hoje.getFullYear(),
        hoje.getMonth() - 5,
        1
      );

      const proximoMes = new Date(
        hoje.getFullYear(),
        hoje.getMonth() + 1,
        1
      );

      const em30Dias = new Date(hoje);
      em30Dias.setDate(em30Dias.getDate() + 30);

      const [
        loansResult,
        installmentsResult,
        paymentsResult,
        customersResult,
      ] = await Promise.all([
        supabase
          .from("loans")
          .select(
            "id, customer_id, status, amount, total_amount"
          )
          .eq("company_id", companyId)
          .is("deleted_at", null),

        supabase
          .from("loan_installments")
          .select(
            "id, loan_id, due_date, amount, paid_amount, remaining_amount, status, installment_number"
          )
          .eq("company_id", companyId)
          .order("due_date", { ascending: true }),

        supabase
          .from("payments")
          .select("id, amount, paid_at, payment_method")
          .eq("company_id", companyId)
          .is("cancelled_at", null)
          .gte("paid_at", inicioSeisMeses.toISOString())
          .lt("paid_at", proximoMes.toISOString())
          .order("paid_at", { ascending: false }),

        supabase
          .from("customers")
          .select("id, full_name, status")
          .eq("company_id", companyId)
          .is("deleted_at", null)
          .order("full_name", { ascending: true }),
      ]);

      if (loansResult.error) {
        throw loansResult.error;
      }

      if (installmentsResult.error) {
        throw installmentsResult.error;
      }

      if (paymentsResult.error) {
        throw paymentsResult.error;
      }

      if (customersResult.error) {
        throw customersResult.error;
      }

      const loans = (loansResult.data || []) as Loan[];
      const installments =
        (installmentsResult.data || []) as Installment[];
      const payments =
        (paymentsResult.data || []) as Payment[];
      const customers =
        (customersResult.data || []) as Customer[];

      const loansAtivos = loans.filter(
        (loan) => loan.status === "ACTIVE"
      );

      const idsLoansAtivos = new Set(
        loansAtivos.map((loan) => loan.id)
      );

      const parcelasAbertas = installments.filter(
        isOpenInstallment
      );

      const carteiraAtiva = parcelasAbertas
        .filter((parcela) =>
          idsLoansAtivos.has(parcela.loan_id)
        )
        .reduce(
          (total, parcela) =>
            total + Number(parcela.remaining_amount || 0),
          0
        );

      const totalEmprestado = loansAtivos.reduce(
        (total, loan) =>
          total + Number(loan.amount || 0),
        0
      );

      const totalAReceber = parcelasAbertas.reduce(
        (total, parcela) =>
          total + Number(parcela.remaining_amount || 0),
        0
      );

      const recebidoMes = payments
        .filter((payment) => {
          const date = new Date(payment.paid_at);

          return (
            date >= inicioMes &&
            date < proximoMes
          );
        })
        .reduce(
          (total, payment) =>
            total + Number(payment.amount || 0),
          0
        );

      const parcelasVencidas = parcelasAbertas.filter(
        (parcela) => isOverdue(parcela, hoje)
      );

      const vencido = parcelasVencidas.reduce(
        (total, parcela) =>
          total + Number(parcela.remaining_amount || 0),
        0
      );

      const parcelasHoje = parcelasAbertas.filter(
        (parcela) => isToday(parcela, hoje)
      );

      const proximasParcelas = parcelasAbertas.filter(
        (parcela) => {
          const due = new Date(
            `${parcela.due_date}T00:00:00`
          );

          return (
            due >= hoje &&
            due <= em30Dias
          );
        }
      );

      const taxaInadimplencia =
        totalAReceber > 0
          ? (vencido / totalAReceber) * 100
          : 0;

      const totalRecebidoHistorico = payments.reduce(
        (total, payment) =>
          total + Number(payment.amount || 0),
        0
      );

      setData({
        carteiraAtiva,
        totalEmprestado,
        totalAReceber,
        recebidoMes,
        vencido,
        clientesAtivos: customers.filter(
          (customer) => customer.status === "ACTIVE"
        ).length,
        emprestimosAtivos: loansAtivos.length,
        parcelasAtrasadas: parcelasVencidas.length,
        parcelasHoje: parcelasHoje.length,
        parcelasProximas: proximasParcelas.length,
        taxaInadimplencia,
        totalRecebidoHistorico,
        proximosVencimentos: proximasParcelas.slice(0, 6),
        parcelasVencidas: parcelasVencidas.slice(0, 6),
        ultimosPagamentos: payments.slice(0, 6),
clientes: customers,        pagamentos: payments,
      });
    } catch (err) {
      console.error("Erro no Dashboard:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar o Dashboard."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    carregarDashboard();
  }, [carregarDashboard]);

  function atualizar() {
    setRefreshing(true);
    carregarDashboard();
  }

  const chartData = useMemo(
    () => buildLastSixMonths(data.pagamentos),
    [data.pagamentos]
  );

  const maxChartValue = Math.max(
    ...chartData.map((item) => item.value),
    1
  );

  const mediaRecebimento =
    chartData.length > 0
      ? chartData.reduce(
          (total, item) => total + item.value,
          0
        ) / chartData.length
      : 0;

  const carteiraPercentage =
    data.totalAReceber > 0
      ? Math.min(
          100,
          (data.carteiraAtiva / data.totalAReceber) * 100
        )
      : 0;

  if (loading) {
    return (
      <main className="container">
        <div
          style={{
            minHeight: "70vh",
            display: "grid",
            placeItems: "center",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <Loader2
              size={34}
              style={{
                animation: "spin 1s linear infinite",
                margin: "0 auto 15px",
              }}
            />

            <strong
              style={{
                display: "block",
                fontSize: 16,
              }}
            >
              Carregando seu painel
            </strong>

            <span
              style={{
                display: "block",
                marginTop: 6,
                color: "#94a3b8",
                fontSize: 13,
              }}
            >
              Buscando informações financeiras...
            </span>
          </div>
        </div>

        <style jsx>{`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container">
        <div
          className="card"
          style={{
            padding: 35,
            maxWidth: 650,
            margin: "70px auto",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: 18,
              display: "grid",
              placeItems: "center",
              margin: "0 auto 18px",
              background: "#fef2f2",
              color: "#dc2626",
            }}
          >
            <AlertCircle size={28} />
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: 20,
            }}
          >
            Não foi possível carregar o Dashboard
          </h2>

          <p
            style={{
              color: "#64748b",
              marginTop: 10,
              lineHeight: 1.6,
            }}
          >
            {error}
          </p>

          <button
            onClick={atualizar}
            style={{
              border: 0,
              borderRadius: 10,
              padding: "11px 17px",
              background: "#111827",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              marginTop: 10,
            }}
          >
            <RefreshCw size={16} />
            Tentar novamente
          </button>
        </div>
      </main>
    );
  }

  return (
    <main
      className="container"
      style={{
        paddingBottom: 45,
      }}
    >
      {/* CABEÇALHO */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 20,
          marginBottom: 28,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "#64748b",
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            <ShieldCheck size={15} />
            PAINEL FINANCEIRO
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 30,
              fontWeight: 850,
              letterSpacing: "-1px",
              color: "#0f172a",
            }}
          >
            Visão geral
          </h1>

          <p
            style={{
              margin: "7px 0 0",
              color: "#64748b",
              fontSize: 13,
            }}
          >
            Acompanhe sua carteira, recebimentos e inadimplência.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 9,
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={atualizar}
            disabled={refreshing}
            style={{
              border: "1px solid #e2e8f0",
              background: "#fff",
              color: "#334155",
              borderRadius: 10,
              padding: "10px 13px",
              fontWeight: 700,
              cursor: refreshing
                ? "not-allowed"
                : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              opacity: refreshing ? 0.7 : 1,
            }}
          >
            <RefreshCw
              size={15}
              style={{
                animation: refreshing
                  ? "spin 1s linear infinite"
                  : undefined,
              }}
            />
            Atualizar
          </button>

          <Link
            href="/clientes/novo"
            style={{
              textDecoration: "none",
              borderRadius: 10,
              padding: "10px 13px",
              background: "#111827",
              color: "#fff",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            <UserPlus size={15} />
            Novo cliente
          </Link>
        </div>
      </div>

      {/* CARDS PRINCIPAIS */}
      <div
        className="grid"
        style={{
          gridTemplateColumns:
            "repeat(4, minmax(0, 1fr))",
          gap: 14,
        }}
      >
        <MetricCard
          title="Carteira ativa"
          value={money(data.carteiraAtiva)}
          subtitle={`${data.emprestimosAtivos} empréstimos ativos`}
          icon={<Wallet size={21} />}
          trend="Em carteira"
        />

        <MetricCard
          title="A receber"
          value={money(data.totalAReceber)}
          subtitle={`${data.parcelasProximas} parcelas nos próximos 30 dias`}
          icon={<Landmark size={21} />}
          trend="Recebíveis"
        />

        <MetricCard
          title="Recebido este mês"
          value={money(data.recebidoMes)}
          subtitle="Pagamentos confirmados"
          icon={<ArrowDownRight size={21} />}
          trend="Entradas"
        />

        <MetricCard
          title="Total vencido"
          value={money(data.vencido)}
          subtitle={`${data.parcelasAtrasadas} parcelas em atraso`}
          icon={<AlertCircle size={21} />}
          trend={
            data.taxaInadimplencia > 0
              ? percentage(data.taxaInadimplencia)
              : "0%"
          }
          danger={data.vencido > 0}
        />
      </div>

      {/* SEGUNDO BLOCO */}
      <div
        className="grid"
        style={{
          gridTemplateColumns:
            "repeat(4, minmax(0, 1fr))",
          gap: 14,
          marginTop: 14,
        }}
      >
        <div
          className="card"
          style={{
            padding: 18,
            border: "1px solid #e5e7eb",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                background: "#f8fafc",
                display: "grid",
                placeItems: "center",
                color: "#334155",
              }}
            >
              <Users size={18} />
            </div>

            <div>
              <div
                style={{
                  fontSize: 11,
                  color: "#94a3b8",
                  fontWeight: 600,
                }}
              >
                Clientes ativos
              </div>

              <strong
                style={{
                  display: "block",
                  marginTop: 2,
                  fontSize: 21,
                }}
              >
                {data.clientesAtivos}
              </strong>
            </div>
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: 18,
            border: "1px solid #e5e7eb",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                background: "#eff6ff",
                display: "grid",
                placeItems: "center",
                color: "#2563eb",
              }}
            >
              <CreditCard size={18} />
            </div>

            <div>
              <div
                style={{
                  fontSize: 11,
                  color: "#94a3b8",
                  fontWeight: 600,
                }}
              >
                Empréstimos ativos
              </div>

              <strong
                style={{
                  display: "block",
                  marginTop: 2,
                  fontSize: 21,
                }}
              >
                {data.emprestimosAtivos}
              </strong>
            </div>
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: 18,
            border: "1px solid #e5e7eb",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                background: "#fff7ed",
                display: "grid",
                placeItems: "center",
                color: "#ea580c",
              }}
            >
              <CalendarDays size={18} />
            </div>

            <div>
              <div
                style={{
                  fontSize: 11,
                  color: "#94a3b8",
                  fontWeight: 600,
                }}
              >
                Vencem hoje
              </div>

              <strong
                style={{
                  display: "block",
                  marginTop: 2,
                  fontSize: 21,
                }}
              >
                {data.parcelasHoje}
              </strong>
            </div>
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: 18,
            border: "1px solid #e5e7eb",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                background:
                  data.taxaInadimplencia > 0
                    ? "#fef2f2"
                    : "#ecfdf5",
                display: "grid",
                placeItems: "center",
                color:
                  data.taxaInadimplencia > 0
                    ? "#dc2626"
                    : "#059669",
              }}
            >
              {data.taxaInadimplencia > 0 ? (
                <TrendingDown size={18} />
              ) : (
                <TrendingUp size={18} />
              )}
            </div>

            <div>
              <div
                style={{
                  fontSize: 11,
                  color: "#94a3b8",
                  fontWeight: 600,
                }}
              >
                Inadimplência
              </div>

              <strong
                style={{
                  display: "block",
                  marginTop: 2,
                  fontSize: 21,
                  color:
                    data.taxaInadimplencia > 0
                      ? "#dc2626"
                      : "#059669",
                }}
              >
                {percentage(data.taxaInadimplencia)}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* GRÁFICO + RESUMO */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: "2fr 1fr",
          gap: 14,
          marginTop: 18,
        }}
      >
        <section
          className="card"
          style={{
            padding: 22,
            border: "1px solid #e5e7eb",
          }}
        >
          <SectionHeader
            title="Evolução dos recebimentos"
            subtitle="Valores recebidos nos últimos 6 meses"
            action={
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  fontSize: 11,
                  color: "#64748b",
                  fontWeight: 600,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: "#111827",
                  }}
                />
                Recebimentos
              </div>
            }
          />

          <div
            style={{
              height: 280,
              display: "flex",
              alignItems: "flex-end",
              gap: 12,
              paddingTop: 20,
              borderBottom: "1px solid #eef2f7",
            }}
          >
            {chartData.map((item, index) => {
              const height =
                item.value <= 0
                  ? 4
                  : Math.max(
                      8,
                      (item.value / maxChartValue) *
                        210
                    );

              return (
                <div
                  key={`${item.label}-${index}`}
                  style={{
                    flex: 1,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    minWidth: 35,
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      maxWidth: 54,
                      height,
                      background:
                        item.value > 0
                          ? "#111827"
                          : "#e5e7eb",
                      borderRadius:
                        "8px 8px 3px 3px",
                      position: "relative",
                      transition:
                        "height .4s ease",
                    }}
                    title={`${item.label}: ${money(
                      item.value
                    )}`}
                  >
                    {item.value > 0 && (
                      <span
                        style={{
                          position: "absolute",
                          top: -22,
                          left: "50%",
                          transform:
                            "translateX(-50%)",
                          fontSize: 9,
                          fontWeight: 700,
                          color: "#64748b",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {money(item.value)}
                      </span>
                    )}
                  </div>

                  <span
                    style={{
                      marginTop: 11,
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#94a3b8",
                      textTransform: "capitalize",
                    }}
                  >
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 18,
              gap: 15,
              flexWrap: "wrap",
            }}
          >
            <div>
              <span
                style={{
                  fontSize: 11,
                  color: "#94a3b8",
                }}
              >
                Média mensal
              </span>

              <strong
                style={{
                  display: "block",
                  marginTop: 3,
                  fontSize: 16,
                }}
              >
                {money(mediaRecebimento)}
              </strong>
            </div>

            <div>
              <span
                style={{
                  fontSize: 11,
                  color: "#94a3b8",
                }}
              >
                Recebido no período
              </span>

              <strong
                style={{
                  display: "block",
                  marginTop: 3,
                  fontSize: 16,
                }}
              >
                {money(data.totalRecebidoHistorico)}
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                color: "#059669",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              <TrendingUp size={15} />
              Dados reais
            </div>
          </div>
        </section>

        <section
          className="card"
          style={{
            padding: 22,
            border: "1px solid #e5e7eb",
          }}
        >
          <SectionHeader
            title="Saúde da carteira"
            subtitle="Resumo atual dos recebíveis"
          />

          <div
            style={{
              marginTop: 25,
              display: "grid",
              placeItems: "center",
            }}
          >
            <div
              style={{
                width: 180,
                height: 180,
                borderRadius: "50%",
                background: `conic-gradient(
                  #111827 ${carteiraPercentage}%,
                  #e2e8f0 ${carteiraPercentage}% 100%
                )`,
                display: "grid",
                placeItems: "center",
              }}
            >
              <div
                style={{
                  width: 138,
                  height: 138,
                  borderRadius: "50%",
                  background: "#fff",
                  display: "grid",
                  placeItems: "center",
                  textAlign: "center",
                }}
              >
                <div>
                  <strong
                    style={{
                      display: "block",
                      fontSize: 25,
                      color: "#111827",
                    }}
                  >
                    {percentage(carteiraPercentage)}
                  </strong>

                  <span
                    style={{
                      display: "block",
                      marginTop: 3,
                      color: "#94a3b8",
                      fontSize: 10,
                    }}
                  >
                    carteira em aberto
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: 15,
              marginTop: 25,
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 7,
                  fontSize: 11,
                }}
              >
                <span style={{ color: "#64748b" }}>
                  Carteira ativa
                </span>

                <strong>
                  {money(data.carteiraAtiva)}
                </strong>
              </div>

              <MiniProgress
                value={data.carteiraAtiva}
                max={data.totalAReceber}
              />
            </div>

            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 7,
                  fontSize: 11,
                }}
              >
                <span style={{ color: "#64748b" }}>
                  Vencido
                </span>

                <strong
                  style={{
                    color:
                      data.vencido > 0
                        ? "#dc2626"
                        : "#111827",
                  }}
                >
                  {money(data.vencido)}
                </strong>
              </div>

              <MiniProgress
                value={data.vencido}
                max={data.totalAReceber}
              />
            </div>
          </div>
        </section>
      </div>

      {/* ATALHOS */}
      <section style={{ marginTop: 18 }}>
        <SectionHeader
          title="Ações rápidas"
          subtitle="Acesse as operações mais utilizadas"
        />

        <div
          className="grid"
          style={{
            gridTemplateColumns:
              "repeat(3, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          <Link
            href="/clientes/novo"
            style={{
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div
              className="card"
              style={{
                padding: 18,
                display: "flex",
                alignItems: "center",
                gap: 14,
                border: "1px solid #e5e7eb",
                transition: "transform .15s ease",
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: "#f1f5f9",
                  display: "grid",
                  placeItems: "center",
                  color: "#111827",
                }}
              >
                <UserPlus size={19} />
              </div>

              <div style={{ flex: 1 }}>
                <strong
                  style={{
                    display: "block",
                    fontSize: 13,
                  }}
                >
                  Novo cliente
                </strong>

                <span
                  style={{
                    display: "block",
                    marginTop: 3,
                    fontSize: 11,
                    color: "#94a3b8",
                  }}
                >
                  Cadastrar novo cliente
                </span>
              </div>

              <ChevronRight size={17} color="#94a3b8" />
            </div>
          </Link>

          <Link
            href="/emprestimos/novo"
            style={{
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div
              className="card"
              style={{
                padding: 18,
                display: "flex",
                alignItems: "center",
                gap: 14,
                border: "1px solid #e5e7eb",
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: "#f1f5f9",
                  display: "grid",
                  placeItems: "center",
                  color: "#111827",
                }}
              >
                <Plus size={20} />
              </div>

              <div style={{ flex: 1 }}>
                <strong
                  style={{
                    display: "block",
                    fontSize: 13,
                  }}
                >
                  Novo empréstimo
                </strong>

                <span
                  style={{
                    display: "block",
                    marginTop: 3,
                    fontSize: 11,
                    color: "#94a3b8",
                  }}
                >
                  Criar uma nova operação
                </span>
              </div>

              <ChevronRight size={17} color="#94a3b8" />
            </div>
          </Link>

          <Link
            href="/pagamentos/novo"
            style={{
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div
              className="card"
              style={{
                padding: 18,
                display: "flex",
                alignItems: "center",
                gap: 14,
                border: "1px solid #e5e7eb",
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: "#f1f5f9",
                  display: "grid",
                  placeItems: "center",
                  color: "#111827",
                }}
              >
                <DollarSign size={19} />
              </div>

              <div style={{ flex: 1 }}>
                <strong
                  style={{
                    display: "block",
                    fontSize: 13,
                  }}
                >
                  Registrar pagamento
                </strong>

                <span
                  style={{
                    display: "block",
                    marginTop: 3,
                    fontSize: 11,
                    color: "#94a3b8",
                  }}
                >
                  Registrar recebimento
                </span>
              </div>

              <ChevronRight size={17} color="#94a3b8" />
            </div>
          </Link>
        </div>
      </section>

      {/* VENCIMENTOS + ATRASADOS */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
          marginTop: 18,
        }}
      >
        <section
          className="card"
          style={{
            padding: 22,
            border: "1px solid #e5e7eb",
          }}
        >
          <SectionHeader
            title="Próximos vencimentos"
            subtitle="Parcelas que precisam de atenção"
            action={
              <Link
                href="/cobrancas"
                style={{
                  color: "#334155",
                  fontSize: 11,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Ver cobranças
              </Link>
            }
          />

          {data.proximosVencimentos.length === 0 ? (
            <div
              style={{
                minHeight: 180,
                display: "grid",
                placeItems: "center",
                textAlign: "center",
              }}
            >
              <div>
                <CheckCircle2
                  size={30}
                  color="#10b981"
                  style={{
                    margin: "0 auto 10px",
                  }}
                />

                <strong
                  style={{
                    display: "block",
                    fontSize: 13,
                  }}
                >
                  Tudo em dia
                </strong>

                <span
                  style={{
                    display: "block",
                    marginTop: 5,
                    color: "#94a3b8",
                    fontSize: 11,
                  }}
                >
                  Nenhuma parcela próxima do vencimento.
                </span>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 9,
              }}
            >
              {data.proximosVencimentos.map(
                (parcela) => (
                  <Link
                    key={parcela.id}
                    href={`/emprestimos/${parcela.loan_id}`}
                    style={{
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: 12,
                        borderRadius: 11,
                        border:
                          "1px solid #eef2f7",
                        background: "#fff",
                      }}
                    >
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 10,
                          background: "#f8fafc",
                          display: "grid",
                          placeItems: "center",
                          color: "#475569",
                        }}
                      >
                        <CalendarDays size={17} />
                      </div>

                      <div style={{ flex: 1 }}>
                        <strong
                          style={{
                            display: "block",
                            fontSize: 12,
                          }}
                        >
                          Parcela #
                          {parcela.installment_number}
                        </strong>

                        <span
                          style={{
                            display: "block",
                            marginTop: 3,
                            color: "#94a3b8",
                            fontSize: 10,
                          }}
                        >
                          Vencimento{" "}
                          {formatDate(
                            parcela.due_date
                          )}
                        </span>
                      </div>

                      <div
                        style={{
                          textAlign: "right",
                        }}
                      >
                        <strong
                          style={{
                            display: "block",
                            fontSize: 12,
                          }}
                        >
                          {money(
                            parcela.remaining_amount
                          )}
                        </strong>

                        <StatusPill
                          type={
                            parcela.due_date ===
                            new Date()
                              .toISOString()
                              .slice(0, 10)
                              ? "warning"
                              : "neutral"
                          }
                        >
                          {parcela.due_date ===
                          new Date()
                            .toISOString()
                            .slice(0, 10)
                            ? "Hoje"
                            : "Pendente"}
                        </StatusPill>
                      </div>
                    </div>
                  </Link>
                )
              )}
            </div>
          )}
        </section>

        <section
          className="card"
          style={{
            padding: 22,
            border: "1px solid #fee2e2",
          }}
        >
          <SectionHeader
            title="Parcelas em atraso"
            subtitle="Valores que precisam de cobrança"
            action={
              <StatusPill type="danger">
                {data.parcelasAtrasadas} atrasadas
              </StatusPill>
            }
          />

          {data.parcelasVencidas.length === 0 ? (
            <div
              style={{
                minHeight: 180,
                display: "grid",
                placeItems: "center",
                textAlign: "center",
              }}
            >
              <div>
                <CheckCircle2
                  size={30}
                  color="#10b981"
                  style={{
                    margin: "0 auto 10px",
                  }}
                />

                <strong
                  style={{
                    display: "block",
                    fontSize: 13,
                  }}
                >
                  Nenhuma parcela atrasada
                </strong>

                <span
                  style={{
                    display: "block",
                    marginTop: 5,
                    color: "#94a3b8",
                    fontSize: 11,
                  }}
                >
                  Sua carteira está sem parcelas vencidas.
                </span>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 9,
              }}
            >
              {data.parcelasVencidas.map(
                (parcela) => (
                  <Link
                    key={parcela.id}
                    href={`/emprestimos/${parcela.loan_id}`}
                    style={{
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: 12,
                        borderRadius: 11,
                        border:
                          "1px solid #fee2e2",
                        background: "#fffafa",
                      }}
                    >
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 10,
                          background: "#fef2f2",
                          display: "grid",
                          placeItems: "center",
                          color: "#dc2626",
                        }}
                      >
                        <XCircle size={17} />
                      </div>

                      <div style={{ flex: 1 }}>
                        <strong
                          style={{
                            display: "block",
                            fontSize: 12,
                          }}
                        >
                          Parcela #
                          {parcela.installment_number}
                        </strong>

                        <span
                          style={{
                            display: "block",
                            marginTop: 3,
                            color: "#b91c1c",
                            fontSize: 10,
                          }}
                        >
                          Vencida em{" "}
                          {formatDate(
                            parcela.due_date
                          )}
                        </span>
                      </div>

                      <div
                        style={{
                          textAlign: "right",
                        }}
                      >
                        <strong
                          style={{
                            display: "block",
                            fontSize: 12,
                            color: "#b91c1c",
                          }}
                        >
                          {money(
                            parcela.remaining_amount
                          )}
                        </strong>

                        <span
                          style={{
                            display: "block",
                            marginTop: 4,
                            color: "#94a3b8",
                            fontSize: 9,
                          }}
                        >
                          Em aberto
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              )}
            </div>
          )}
        </section>
      </div>

      {/* ÚLTIMOS PAGAMENTOS */}
      <section
        className="card"
        style={{
          marginTop: 18,
          padding: 22,
          border: "1px solid #e5e7eb",
        }}
      >
        <SectionHeader
          title="Últimos pagamentos"
          subtitle="Recebimentos registrados recentemente"
          action={
            <Link
              href="/pagamentos"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                color: "#334155",
                fontSize: 11,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Ver todos
              <ChevronRight size={14} />
            </Link>
          }
        />

        {data.ultimosPagamentos.length === 0 ? (
          <div
            style={{
              padding: 35,
              textAlign: "center",
              color: "#94a3b8",
              fontSize: 12,
            }}
          >
            Nenhum pagamento registrado no período.
          </div>
        ) : (
          <div
            style={{
              overflowX: "auto",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 550,
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "10px 8px",
                      fontSize: 10,
                      color: "#94a3b8",
                      fontWeight: 700,
                      borderBottom:
                        "1px solid #eef2f7",
                    }}
                  >
                    DATA
                  </th>

                  <th
                    style={{
                      textAlign: "left",
                      padding: "10px 8px",
                      fontSize: 10,
                      color: "#94a3b8",
                      fontWeight: 700,
                      borderBottom:
                        "1px solid #eef2f7",
                    }}
                  >
                    MÉTODO
                  </th>

                  <th
                    style={{
                      textAlign: "right",
                      padding: "10px 8px",
                      fontSize: 10,
                      color: "#94a3b8",
                      fontWeight: 700,
                      borderBottom:
                        "1px solid #eef2f7",
                    }}
                  >
                    VALOR
                  </th>

                  <th
                    style={{
                      textAlign: "right",
                      padding: "10px 8px",
                      fontSize: 10,
                      color: "#94a3b8",
                      fontWeight: 700,
                      borderBottom:
                        "1px solid #eef2f7",
                    }}
                  >
                    STATUS
                  </th>
                </tr>
              </thead>

              <tbody>
                {data.ultimosPagamentos.map(
                  (payment) => (
                    <tr key={payment.id}>
                      <td
                        style={{
                          padding: "13px 8px",
                          borderBottom:
                            "1px solid #f1f5f9",
                          fontSize: 12,
                          color: "#475569",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 7,
                          }}
                        >
                          <Clock3 size={14} />
                          {formatDateTime(
                            payment.paid_at
                          )}
                        </div>
                      </td>

                      <td
                        style={{
                          padding: "13px 8px",
                          borderBottom:
                            "1px solid #f1f5f9",
                          fontSize: 12,
                        }}
                      >
                        <StatusPill>
                          <CreditCard size={12} />
                          {paymentMethodLabel(
                            payment.payment_method
                          )}
                        </StatusPill>
                      </td>

                      <td
                        style={{
                          padding: "13px 8px",
                          borderBottom:
                            "1px solid #f1f5f9",
                          textAlign: "right",
                          fontSize: 13,
                          fontWeight: 800,
                          color: "#059669",
                        }}
                      >
                        + {money(payment.amount)}
                      </td>

                      <td
                        style={{
                          padding: "13px 8px",
                          borderBottom:
                            "1px solid #f1f5f9",
                          textAlign: "right",
                        }}
                      >
                        <StatusPill type="success">
                          <CheckCircle2 size={12} />
                          Confirmado
                        </StatusPill>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* RODAPÉ INFORMATIVO */}
      <div
        style={{
          marginTop: 18,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 15,
          padding: "12px 2px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            color: "#94a3b8",
            fontSize: 10,
          }}
        >
          <ShieldCheck size={13} />
          Dados protegidos e sincronizados com o banco.
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "#94a3b8",
            fontSize: 10,
          }}
        >
          <BarChart3 size={13} />
          Painel atualizado em tempo real
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 1100px) {
          :global(.grid) {
            grid-template-columns: 1fr 1fr !important;
          }
        }

        @media (max-width: 700px) {
          :global(.grid) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}