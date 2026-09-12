"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FileBarChart,
  Loader2,
  RefreshCw,
  Users,
  WalletCards,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Loan = {
  id: string;
  customer_id: string | null;
  amount: number | null;
  principal_amount: number | null;
  interest_rate: number | null;
  term: number | null;
  frequency: string | null;
  start_date: string | null;
  first_due_date: string | null;
  total_interest: number | null;
  total_amount: number | null;
  installment_amount: number | null;
  status: string | null;
  created_at: string | null;
};

type Installment = {
  id: string;
  loan_id: string;
  customer_id?: string | null;
  installment_number: number;
  due_date: string;
  principal_amount: number | null;
  interest_amount: number | null;
  amount: number | null;
  paid_amount: number | null;
  discount_amount: number | null;
  late_fee_amount: number | null;
  remaining_amount: number | null;
  status: string | null;
  paid_at: string | null;
};

type Customer = {
  id: string;
  full_name: string;
  status?: string | null;
};

type Period = "7" | "30" | "90" | "365" | "all";

function numberValue(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numberValue(value));
}

function dateBR(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(`${value.slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("pt-BR");
}

function normalizeStatus(status: string | null | undefined) {
  return String(status || "").toUpperCase();
}

function statusLabel(status: string | null | undefined) {
  const value = normalizeStatus(status);

  const labels: Record<string, string> = {
    PENDING: "Pendente",
    ACTIVE: "Ativo",
    PAID: "Pago",
    OVERDUE: "Em atraso",
    CANCELLED: "Cancelado",
    CANCELED: "Cancelado",
    DEFAULTED: "Inadimplente",
    PARTIAL: "Parcial",
  };

  return labels[value] || status || "Não informado";
}

function isPaid(status: string | null | undefined) {
  return ["PAID"].includes(normalizeStatus(status));
}

function isOverdue(status: string | null | undefined) {
  return ["OVERDUE", "DEFAULTED"].includes(normalizeStatus(status));
}

function isActiveLoan(status: string | null | undefined) {
  return ["ACTIVE"].includes(normalizeStatus(status));
}

function isCancelled(status: string | null | undefined) {
  return ["CANCELLED", "CANCELED"].includes(normalizeStatus(status));
}

function startDateForPeriod(period: Period) {
  if (period === "all") return null;

  const days = Number(period);
  const date = new Date();

  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);

  return date;
}

function formatMonth(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    month: "short",
  }).replace(".", "");
}

export default function RelatoriosPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [period, setPeriod] = useState<Period>("30");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const supabase = useMemo(() => createClient(), []);

  const carregarDados = useCallback(async () => {
    if (!supabase) {
      setError("Supabase não está configurado.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const {
        data: userData,
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      const user = userData.user;

      if (!user) {
        throw new Error("Usuário não autenticado.");
      }

      const {
        data: memberships,
        error: membershipError,
      } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", user.id)
        .eq("status", "ACTIVE")
        .limit(1);

      if (membershipError) throw membershipError;

      const companyId = memberships?.[0]?.company_id;

      if (!companyId) {
        throw new Error(
          "Nenhuma empresa ativa foi encontrada para este usuário."
        );
      }

      const [
        loansResponse,
        installmentsResponse,
        customersResponse,
      ] = await Promise.all([
        supabase
          .from("loans")
          .select(
            `
              id,
              customer_id,
              amount,
              principal_amount,
              interest_rate,
              term,
              frequency,
              start_date,
              first_due_date,
              total_interest,
              total_amount,
              installment_amount,
              status,
              created_at
            `
          )
          .eq("company_id", companyId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false }),

        supabase
          .from("loan_installments")
          .select(
            `
              id,
              loan_id,
              installment_number,
              due_date,
              principal_amount,
              interest_amount,
              amount,
              paid_amount,
              discount_amount,
              late_fee_amount,
              remaining_amount,
              status,
              paid_at
            `
          )
          .eq("company_id", companyId)
          .order("due_date", { ascending: true }),

        supabase
          .from("customers")
          .select("id, full_name, status")
          .eq("company_id", companyId)
          .is("deleted_at", null)
          .order("full_name", { ascending: true }),
      ]);

      if (loansResponse.error) throw loansResponse.error;
      if (installmentsResponse.error) throw installmentsResponse.error;
      if (customersResponse.error) throw customersResponse.error;

      setLoans((loansResponse.data || []) as Loan[]);
      setInstallments(
        (installmentsResponse.data || []) as Installment[]
      );
      setCustomers((customersResponse.data || []) as Customer[]);
    } catch (err) {
      console.error("[RELATORIOS] Erro:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar os relatórios."
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const filteredLoans = useMemo(() => {
    const start = startDateForPeriod(period);

    if (!start) return loans;

    return loans.filter((loan) => {
      if (!loan.created_at) return false;

      const date = new Date(loan.created_at);

      return date >= start;
    });
  }, [loans, period]);

  const filteredInstallments = useMemo(() => {
    const start = startDateForPeriod(period);

    if (!start) return installments;

    return installments.filter((installment) => {
      const date = new Date(`${installment.due_date}T00:00:00`);

      return date >= start;
    });
  }, [installments, period]);

  const customerMap = useMemo(() => {
    return new Map(
      customers.map((customer) => [customer.id, customer.full_name])
    );
  }, [customers]);

  const loanMap = useMemo(() => {
    return new Map(loans.map((loan) => [loan.id, loan]));
  }, [loans]);

  const metrics = useMemo(() => {
    const totalEmprestado = filteredLoans.reduce(
      (total, loan) =>
        total + numberValue(loan.principal_amount ?? loan.amount),
      0
    );

    const jurosPrevistos = filteredLoans.reduce(
      (total, loan) => total + numberValue(loan.total_interest),
      0
    );

    const totalAReceber = filteredLoans.reduce(
      (total, loan) => total + numberValue(loan.total_amount),
      0
    );

    const recebido = filteredInstallments.reduce(
      (total, installment) => total + numberValue(installment.paid_amount),
      0
    );

    const emAberto = filteredInstallments.reduce(
      (total, installment) =>
        total + numberValue(installment.remaining_amount),
      0
    );

    const vencido = filteredInstallments
      .filter((installment) => isOverdue(installment.status))
      .reduce(
        (total, installment) =>
          total + numberValue(installment.remaining_amount),
        0
      );

    const quantidadeEmprestimos = filteredLoans.filter(
      (loan) => !isCancelled(loan.status)
    ).length;

    const quantidadePagas = filteredInstallments.filter((installment) =>
      isPaid(installment.status)
    ).length;

    const quantidadeAtrasadas = filteredInstallments.filter((installment) =>
      isOverdue(installment.status)
    ).length;

    const quantidadeAtivos = filteredLoans.filter((loan) =>
      isActiveLoan(loan.status)
    ).length;

    const quantidadeClientes = new Set(
      filteredLoans
        .map((loan) => loan.customer_id)
        .filter(Boolean)
    ).size;

    const taxaRecebimento =
      totalAReceber > 0
        ? Math.min((recebido / totalAReceber) * 100, 100)
        : 0;

    return {
      totalEmprestado,
      jurosPrevistos,
      totalAReceber,
      recebido,
      emAberto,
      vencido,
      quantidadeEmprestimos,
      quantidadePagas,
      quantidadeAtrasadas,
      quantidadeAtivos,
      quantidadeClientes,
      taxaRecebimento,
    };
  }, [filteredLoans, filteredInstallments]);

  const monthlyData = useMemo(() => {
    const months: {
      label: string;
      value: number;
      received: number;
    }[] = [];

    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - i,
        1
      );

      const year = date.getFullYear();
      const month = date.getMonth();

      const loanValue = loans
        .filter((loan) => {
          if (!loan.created_at) return false;

          const loanDate = new Date(loan.created_at);

          return (
            loanDate.getFullYear() === year &&
            loanDate.getMonth() === month &&
            !isCancelled(loan.status)
          );
        })
        .reduce(
          (total, loan) =>
            total + numberValue(loan.principal_amount ?? loan.amount),
          0
        );

      const receivedValue = installments
        .filter((installment) => {
          if (!installment.paid_at) return false;

          const paymentDate = new Date(installment.paid_at);

          return (
            paymentDate.getFullYear() === year &&
            paymentDate.getMonth() === month
          );
        })
        .reduce(
          (total, installment) =>
            total + numberValue(installment.paid_amount),
          0
        );

      months.push({
        label: formatMonth(date),
        value: loanValue,
        received: receivedValue,
      });
    }

    return months;
  }, [loans, installments]);

  const statusData = useMemo(() => {
    const groups = {
      active: 0,
      paid: 0,
      overdue: 0,
      pending: 0,
      cancelled: 0,
    };

    filteredLoans.forEach((loan) => {
      const status = normalizeStatus(loan.status);

      if (status === "ACTIVE") groups.active++;
      else if (status === "PAID") groups.paid++;
      else if (status === "OVERDUE" || status === "DEFAULTED") {
        groups.overdue++;
      } else if (status === "PENDING") {
        groups.pending++;
      } else if (status === "CANCELLED" || status === "CANCELED") {
        groups.cancelled++;
      }
    });

    return groups;
  }, [filteredLoans]);

  const topCustomers = useMemo(() => {
    const grouped = new Map<
      string,
      {
        customerId: string;
        name: string;
        total: number;
        loans: number;
      }
    >();

    filteredLoans.forEach((loan) => {
      if (!loan.customer_id) return;
      if (isCancelled(loan.status)) return;

      const current = grouped.get(loan.customer_id);

      const amount = numberValue(
        loan.principal_amount ?? loan.amount
      );

      if (current) {
        current.total += amount;
        current.loans += 1;
      } else {
        grouped.set(loan.customer_id, {
          customerId: loan.customer_id,
          name:
            customerMap.get(loan.customer_id) ||
            "Cliente não identificado",
          total: amount,
          loans: 1,
        });
      }
    });

    return Array.from(grouped.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [filteredLoans, customerMap]);

  const upcomingInstallments = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return filteredInstallments
      .filter((installment) => {
        if (isPaid(installment.status)) return false;
        if (isCancelled(installment.status)) return false;

        const due = new Date(`${installment.due_date}T00:00:00`);

        return due >= today;
      })
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
      .slice(0, 6);
  }, [filteredInstallments]);

  function exportCSV() {
    const rows = filteredLoans.map((loan) => {
      const customer = loan.customer_id
        ? customerMap.get(loan.customer_id) || ""
        : "";

      return [
        customer,
        numberValue(loan.principal_amount ?? loan.amount)
          .toFixed(2)
          .replace(".", ","),
        numberValue(loan.total_interest)
          .toFixed(2)
          .replace(".", ","),
        numberValue(loan.total_amount)
          .toFixed(2)
          .replace(".", ","),
        loan.term ?? "",
        loan.frequency ?? "",
        statusLabel(loan.status),
        dateBR(loan.created_at),
      ];
    });

    const header = [
      "Cliente",
      "Valor emprestado",
      "Juros previstos",
      "Total a receber",
      "Parcelas",
      "Frequência",
      "Status",
      "Data",
    ];

    const csv = [
      header,
      ...rows,
    ]
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(";")
      )
      .join("\n");

    const blob = new Blob(["\ufeff" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `relatorio-loancontrol-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <main className="container">
        <div
          style={{
            minHeight: "70vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <Loader2
            size={32}
            style={{ animation: "spin 1s linear infinite" }}
          />

          <strong>Carregando relatórios...</strong>

          <span className="muted">
            Estamos analisando sua carteira.
          </span>
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

  return (
    <main className="container">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 20,
          marginBottom: 22,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "#2563eb",
              fontSize: 12,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: ".08em",
              marginBottom: 8,
            }}
          >
            <FileBarChart size={16} />
            Inteligência financeira
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 30,
              fontWeight: 800,
              letterSpacing: "-.03em",
            }}
          >
            Relatórios
          </h1>

          <p
            className="muted"
            style={{
              marginTop: 7,
              fontSize: 14,
            }}
          >
            Analise o desempenho da sua carteira de empréstimos.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <select
            className="input"
            value={period}
            onChange={(e) =>
              setPeriod(e.target.value as Period)
            }
            style={{
              minWidth: 170,
              height: 42,
            }}
          >
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
            <option value="365">Último ano</option>
            <option value="all">Todo o período</option>
          </select>

          <button
            className="btn"
            onClick={carregarDados}
            style={{
              height: 42,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <RefreshCw size={16} />
            Atualizar
          </button>

          <button
            className="btn btn-primary"
            onClick={exportCSV}
            style={{
              height: 42,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Download size={16} />
            Exportar CSV
          </button>
        </div>
      </div>

      {error && (
        <div
          className="card"
          style={{
            padding: 18,
            marginBottom: 20,
            border: "1px solid #fecaca",
            background: "#fff7f7",
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
          }}
        >
          <AlertCircle
            size={20}
            style={{ color: "#dc2626", flexShrink: 0 }}
          />

          <div style={{ flex: 1 }}>
            <strong style={{ color: "#b91c1c" }}>
              Não foi possível carregar os relatórios
            </strong>

            <p
              style={{
                margin: "5px 0 12px",
                color: "#7f1d1d",
                fontSize: 13,
              }}
            >
              {error}
            </p>

            <button
              className="btn"
              onClick={carregarDados}
              style={{
                height: 34,
                fontSize: 12,
              }}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(190px,1fr))",
          gap: 14,
          marginBottom: 18,
        }}
      >
        <MetricCard
          icon={<WalletCards size={19} />}
          title="Total emprestado"
          value={money(metrics.totalEmprestado)}
          description={`${metrics.quantidadeEmprestimos} empréstimos`}
          tone="blue"
        />

        <MetricCard
          icon={<ArrowUpRight size={19} />}
          title="Total recebido"
          value={money(metrics.recebido)}
          description={`${metrics.quantidadePagas} parcelas pagas`}
          tone="green"
        />

        <MetricCard
          icon={<Clock3 size={19} />}
          title="Em aberto"
          value={money(metrics.emAberto)}
          description="Valores ainda pendentes"
          tone="orange"
        />

        <MetricCard
          icon={<AlertCircle size={19} />}
          title="Em atraso"
          value={money(metrics.vencido)}
          description={`${metrics.quantidadeAtrasadas} parcelas atrasadas`}
          tone="red"
        />
      </div>

      {/* RESUMO */}
      <div
        className="card"
        style={{
          padding: 24,
          marginBottom: 18,
          background:
            "linear-gradient(135deg,#111c36 0%,#172554 100%)",
          color: "#fff",
          border: "none",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 260,
            height: 260,
            borderRadius: "50%",
            background: "rgba(255,255,255,.04)",
            right: -100,
            top: -120,
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "grid",
            gridTemplateColumns:
              "minmax(220px,1.5fr) repeat(3,minmax(130px,1fr))",
            gap: 24,
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                fontWeight: 800,
                opacity: 0.75,
                textTransform: "uppercase",
                letterSpacing: ".08em",
              }}
            >
              <BarChart3 size={16} />
              Visão da carteira
            </div>

            <div
              style={{
                fontSize: 30,
                fontWeight: 800,
                marginTop: 8,
              }}
            >
              {money(metrics.totalAReceber)}
            </div>

            <div
              style={{
                fontSize: 12,
                opacity: 0.72,
                marginTop: 4,
              }}
            >
              Total previsto para receber
            </div>
          </div>

          <SummaryItem
            label="Juros previstos"
            value={money(metrics.jurosPrevistos)}
          />

          <SummaryItem
            label="Taxa recebimento"
            value={`${metrics.taxaRecebimento.toFixed(1)}%`}
          />

          <SummaryItem
            label="Clientes"
            value={String(metrics.quantidadeClientes)}
          />
        </div>
      </div>

      {/* GRÁFICO */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(0,1.65fr) minmax(300px,1fr)",
          gap: 18,
          marginBottom: 18,
        }}
      >
        <section className="card" style={{ padding: 24 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 15,
              marginBottom: 25,
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 17,
                  fontWeight: 800,
                }}
              >
                Evolução da carteira
              </h2>

              <p
                className="muted"
                style={{
                  margin: "5px 0 0",
                  fontSize: 12,
                }}
              >
                Empréstimos concedidos x recebimentos
              </p>
            </div>

            <CalendarDays size={19} />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 18,
              height: 230,
              padding: "10px 4px 0",
            }}
          >
            {monthlyData.map((item, index) => {
              const maxValue = Math.max(
                ...monthlyData.flatMap((month) => [
                  month.value,
                  month.received,
                ]),
                1
              );

              const loanHeight =
                (item.value / maxValue) * 170;

              const receivedHeight =
                (item.received / maxValue) * 170;

              return (
                <div
                  key={`${item.label}-${index}`}
                  style={{
                    flex: 1,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    minWidth: 35,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-end",
                      justifyContent: "center",
                      gap: 4,
                      height: 185,
                    }}
                  >
                    <div
                      title={`Emprestado: ${money(item.value)}`}
                      style={{
                        width: 13,
                        height: Math.max(
                          loanHeight,
                          item.value > 0 ? 4 : 0
                        ),
                        background: "#2563eb",
                        borderRadius: "5px 5px 2px 2px",
                        transition: "height .3s ease",
                      }}
                    />

                    <div
                      title={`Recebido: ${money(item.received)}`}
                      style={{
                        width: 13,
                        height: Math.max(
                          receivedHeight,
                          item.received > 0 ? 4 : 0
                        ),
                        background: "#22c55e",
                        borderRadius: "5px 5px 2px 2px",
                        transition: "height .3s ease",
                      }}
                    />
                  </div>

                  <div
                    style={{
                      textAlign: "center",
                      fontSize: 11,
                      color: "#64748b",
                      marginTop: 8,
                      textTransform: "capitalize",
                    }}
                  >
                    {item.label}
                  </div>
                </div>
              );
            })}
          </div>

          <div
            style={{
              display: "flex",
              gap: 18,
              marginTop: 18,
              fontSize: 11,
              color: "#64748b",
            }}
          >
            <Legend color="#2563eb" label="Emprestado" />
            <Legend color="#22c55e" label="Recebido" />
          </div>
        </section>

        {/* STATUS */}
        <section className="card" style={{ padding: 24 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 800,
            }}
          >
            Status dos empréstimos
          </h2>

          <p
            className="muted"
            style={{
              margin: "5px 0 22px",
              fontSize: 12,
            }}
          >
            Distribuição atual da carteira
          </p>

          <StatusRow
            label="Ativos"
            value={statusData.active}
            total={filteredLoans.length}
            tone="blue"
          />

          <StatusRow
            label="Pagos"
            value={statusData.paid}
            total={filteredLoans.length}
            tone="green"
          />

          <StatusRow
            label="Em atraso"
            value={statusData.overdue}
            total={filteredLoans.length}
            tone="red"
          />

          <StatusRow
            label="Pendentes"
            value={statusData.pending}
            total={filteredLoans.length}
            tone="orange"
          />

          <StatusRow
            label="Cancelados"
            value={statusData.cancelled}
            total={filteredLoans.length}
            tone="gray"
          />
        </section>
      </div>

      {/* SEGUNDA LINHA */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(0,1fr) minmax(0,1fr)",
          gap: 18,
          marginBottom: 18,
        }}
      >
        {/* TOP CLIENTES */}
        <section className="card" style={{ padding: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                display: "grid",
                placeItems: "center",
                background: "#eff6ff",
                color: "#2563eb",
              }}
            >
              <Users size={19} />
            </div>

            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 800,
                }}
              >
                Maiores clientes
              </h2>

              <p
                className="muted"
                style={{
                  margin: "3px 0 0",
                  fontSize: 12,
                }}
              >
                Volume emprestado no período
              </p>
            </div>
          </div>

          {topCustomers.length === 0 ? (
            <EmptyState text="Nenhum empréstimo encontrado no período." />
          ) : (
            <div>
              {topCustomers.map((customer, index) => (
                <div
                  key={customer.customerId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 0",
                    borderTop:
                      index === 0
                        ? "none"
                        : "1px solid #eef2f7",
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      background: "#f1f5f9",
                      fontWeight: 800,
                      fontSize: 12,
                      color: "#334155",
                    }}
                  >
                    {index + 1}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 13,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {customer.name}
                    </div>

                    <div
                      className="muted"
                      style={{
                        fontSize: 11,
                        marginTop: 3,
                      }}
                    >
                      {customer.loans}{" "}
                      {customer.loans === 1
                        ? "empréstimo"
                        : "empréstimos"}
                    </div>
                  </div>

                  <strong
                    style={{
                      fontSize: 13,
                    }}
                  >
                    {money(customer.total)}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* PRÓXIMOS VENCIMENTOS */}
        <section className="card" style={{ padding: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                display: "grid",
                placeItems: "center",
                background: "#fff7ed",
                color: "#f97316",
              }}
            >
              <CalendarDays size={19} />
            </div>

            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 800,
                }}
              >
                Próximos vencimentos
              </h2>

              <p
                className="muted"
                style={{
                  margin: "3px 0 0",
                  fontSize: 12,
                }}
              >
                Parcelas ainda não pagas
              </p>
            </div>
          </div>

          {upcomingInstallments.length === 0 ? (
            <EmptyState text="Nenhum vencimento próximo encontrado." />
          ) : (
            <div>
              {upcomingInstallments.map((installment, index) => {
                const loan = loanMap.get(installment.loan_id);

                const customerName = loan?.customer_id
                  ? customerMap.get(loan.customer_id) ||
                    "Cliente não identificado"
                  : "Cliente não identificado";

                return (
                  <div
                    key={installment.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "11px 0",
                      borderTop:
                        index === 0
                          ? "none"
                          : "1px solid #eef2f7",
                    }}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        display: "grid",
                        placeItems: "center",
                        background: "#f8fafc",
                        color: "#475569",
                        fontSize: 11,
                        fontWeight: 800,
                      }}
                    >
                      #{installment.installment_number}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 12,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {customerName}
                      </div>

                      <div
                        className="muted"
                        style={{
                          fontSize: 11,
                          marginTop: 3,
                        }}
                      >
                        Vencimento{" "}
                        {dateBR(installment.due_date)}
                      </div>
                    </div>

                    <strong style={{ fontSize: 12 }}>
                      {money(
                        numberValue(
                          installment.remaining_amount ??
                            installment.amount
                        )
                      )}
                    </strong>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* RESUMO OPERACIONAL */}
      <section className="card" style={{ padding: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 15,
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 17,
                fontWeight: 800,
              }}
            >
              Resumo operacional
            </h2>

            <p
              className="muted"
              style={{
                margin: "5px 0 0",
                fontSize: 12,
              }}
            >
              Indicadores importantes da carteira
            </p>
          </div>

          <CheckCircle2
            size={20}
            style={{ color: "#22c55e" }}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(170px,1fr))",
            gap: 12,
          }}
        >
          <OperationalCard
            label="Empréstimos ativos"
            value={String(metrics.quantidadeAtivos)}
            icon={<WalletCards size={17} />}
          />

          <OperationalCard
            label="Parcelas pagas"
            value={String(metrics.quantidadePagas)}
            icon={<CheckCircle2 size={17} />}
          />

          <OperationalCard
            label="Parcelas atrasadas"
            value={String(metrics.quantidadeAtrasadas)}
            icon={<AlertCircle size={17} />}
          />

          <OperationalCard
            label="Clientes atendidos"
            value={String(metrics.quantidadeClientes)}
            icon={<Users size={17} />}
          />

          <OperationalCard
            label="Taxa de recebimento"
            value={`${metrics.taxaRecebimento.toFixed(1)}%`}
            icon={<ArrowUpRight size={17} />}
          />
        </div>
      </section>

      <style jsx>{`
        @media (max-width: 900px) {
          .card {
            min-width: 0;
          }
        }

        @media (max-width: 760px) {
          .container {
            padding-left: 14px !important;
            padding-right: 14px !important;
          }
        }
      `}</style>
    </main>
  );
}

function MetricCard({
  icon,
  title,
  value,
  description,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
  tone: "blue" | "green" | "orange" | "red";
}) {
  const tones = {
    blue: {
      background: "#eff6ff",
      color: "#2563eb",
    },
    green: {
      background: "#f0fdf4",
      color: "#16a34a",
    },
    orange: {
      background: "#fff7ed",
      color: "#ea580c",
    },
    red: {
      background: "#fef2f2",
      color: "#dc2626",
    },
  };

  return (
    <div
      className="card"
      style={{
        padding: 18,
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div>
          <div
            className="muted"
            style={{
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {title}
          </div>

          <div
            style={{
              fontSize: 19,
              fontWeight: 800,
              marginTop: 7,
            }}
          >
            {value}
          </div>

          <div
            className="muted"
            style={{
              fontSize: 10,
              marginTop: 5,
            }}
          >
            {description}
          </div>
        </div>

        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            display: "grid",
            placeItems: "center",
            background: tones[tone].background,
            color: tones[tone].color,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          opacity: 0.65,
          marginBottom: 6,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 17,
          fontWeight: 800,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Legend({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
        }}
      />

      {label}
    </div>
  );
}

function StatusRow({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: "blue" | "green" | "red" | "orange" | "gray";
}) {
  const colors = {
    blue: "#2563eb",
    green: "#22c55e",
    red: "#ef4444",
    orange: "#f97316",
    gray: "#94a3b8",
  };

  const percentage =
    total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div style={{ marginBottom: 17 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 7,
          fontSize: 12,
        }}
      >
        <span>{label}</span>

        <strong>
          {value}{" "}
          <span
            style={{
              color: "#94a3b8",
              fontWeight: 500,
            }}
          >
            ({percentage}%)
          </span>
        </strong>
      </div>

      <div
        style={{
          height: 7,
          background: "#f1f5f9",
          borderRadius: 99,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${percentage}%`,
            background: colors[tone],
            borderRadius: 99,
            transition: "width .3s ease",
          }}
        />
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div
      style={{
        minHeight: 130,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        color: "#94a3b8",
        fontSize: 12,
        padding: 20,
      }}
    >
      {text}
    </div>
  );
}

function OperationalCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: 15,
        background: "#fafcff",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "#64748b",
          fontSize: 11,
        }}
      >
        {icon}
        {label}
      </div>

      <div
        style={{
          fontSize: 20,
          fontWeight: 800,
          marginTop: 8,
        }}
      >
        {value}
      </div>
    </div>
  );
}