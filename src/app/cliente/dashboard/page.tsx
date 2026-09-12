"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  DollarSign,
  FileText,
  LogOut,
  ShieldCheck,
  User,
  WalletCards,
  AlertCircle,
  Loader2,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Customer = Record<string, any>;
type Loan = Record<string, any>;
type Installment = Record<string, any>;

function money(value: any) {
  const number = Number(value || 0);

  return number.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function dateBR(value: any) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("pt-BR");
}

function statusLabel(status: any) {
  const normalized = String(status || "").toUpperCase();

  if (normalized === "PAID") return "Pago";
  if (normalized === "OVERDUE") return "Em atraso";
  if (normalized === "PARTIAL") return "Parcial";
  if (normalized === "CANCELLED") return "Cancelada";
  if (normalized === "ACTIVE") return "Ativo";
  if (normalized === "PENDING") return "Pendente";

  return status || "Pendente";
}

function isPaid(item: Installment) {
  return String(item.status || "").toUpperCase() === "PAID";
}

function isOverdue(item: Installment) {
  if (isPaid(item)) return false;

  const status = String(item.status || "").toUpperCase();

  if (status === "OVERDUE") return true;

  if (!item.due_date) return false;

  const due = new Date(`${item.due_date}T23:59:59`);

  return due.getTime() < Date.now();
}

export default function ClienteDashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);

  const [error, setError] = useState("");

  useEffect(() => {
    loadPortal();
  }, []);

  async function loadPortal() {
    setLoading(true);
    setError("");

    const supabase = createClient();

    if (!supabase) {
      setError("Não foi possível conectar ao sistema.");
      setLoading(false);
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.replace("/cliente/login");
      return;
    }

    /*
     * Localiza o cliente vinculado ao usuário autenticado.
     */
    const { data: customerData, error: customerError } =
      await supabase
        .from("customers")
        .select("*")
        .eq("auth_user_id", user.id)
        .eq("portal_enabled", true)
        .maybeSingle();

    if (customerError) {
      console.error("[PORTAL] Cliente:", customerError);

      setError(
        "Não foi possível carregar seus dados."
      );

      setLoading(false);
      return;
    }

    if (!customerData) {
      setError(
        "Sua conta ainda não está vinculada a um cliente do LoanControl."
      );

      setLoading(false);
      return;
    }

    setCustomer(customerData);

    /*
     * Empréstimos do cliente.
     */
    const { data: loansData, error: loansError } =
      await supabase
        .from("loans")
        .select("*")
        .eq("customer_id", customerData.id)
        .order("created_at", {
          ascending: false,
        });

    if (loansError) {
      console.error("[PORTAL] Empréstimos:", loansError);

      setError(
        "Não foi possível carregar seus empréstimos."
      );

      setLoading(false);
      return;
    }

    const loadedLoans = loansData || [];

    setLoans(loadedLoans);

    /*
     * Parcelas dos empréstimos.
     */
    let loadedInstallments: Installment[] = [];

    if (loadedLoans.length > 0) {
      const loanIds = loadedLoans.map((loan) => loan.id);

      const { data: installmentsData, error: installmentsError } =
        await supabase
          .from("loan_installments")
          .select("*")
          .in("loan_id", loanIds)
          .order("due_date", {
            ascending: true,
          });

      if (installmentsError) {
        console.error(
          "[PORTAL] Parcelas:",
          installmentsError
        );

        setError(
          "Não foi possível carregar suas parcelas."
        );

        setLoading(false);
        return;
      }

      loadedInstallments = installmentsData || [];
    }

    setInstallments(loadedInstallments);
    setLoading(false);
  }

  async function logout() {
    const supabase = createClient();

    if (!supabase) return;

    setLoggingOut(true);

    await supabase.auth.signOut();

    router.replace("/cliente/login");
    router.refresh();
  }

  const summary = useMemo(() => {
    const openInstallments = installments.filter(
      (item) => !isPaid(item)
    );

    const overdueInstallments = installments.filter(
      (item) => isOverdue(item)
    );

    const totalOpen = openInstallments.reduce(
      (sum, item) =>
        sum +
        Number(
          item.remaining_amount ??
            item.amount ??
            0
        ),
      0
    );

    const totalOverdue = overdueInstallments.reduce(
      (sum, item) =>
        sum +
        Number(
          item.remaining_amount ??
            item.amount ??
            0
        ),
      0
    );

    const paidCount = installments.filter(
      (item) => isPaid(item)
    ).length;

    return {
      totalOpen,
      totalOverdue,
      paidCount,
      overdueCount: overdueInstallments.length,
      openCount: openInstallments.length,
    };
  }, [installments]);

  const nextInstallment = useMemo(() => {
    return installments.find(
      (item) => !isPaid(item) && !isOverdue(item)
    );
  }, [installments]);

  const recentInstallments = useMemo(() => {
    return [...installments]
      .sort((a, b) => {
        const dateA = new Date(
          a.due_date || "2999-01-01"
        ).getTime();

        const dateB = new Date(
          b.due_date || "2999-01-01"
        ).getTime();

        return dateA - dateB;
      })
      .slice(0, 8);
  }, [installments]);

  if (loading) {
    return (
      <main style={styles.loadingPage}>
        <div style={styles.loadingBox}>
          <Loader2
            size={32}
            className="loancontrol-spin"
          />

          <strong>Carregando seu portal...</strong>

          <span>
            Estamos buscando seus empréstimos e parcelas.
          </span>
        </div>

        <style jsx>{`
          .loancontrol-spin {
            animation: spin 1s linear infinite;
          }

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

  if (error && !customer) {
    return (
      <main style={styles.loadingPage}>
        <div style={styles.errorBox}>
          <AlertCircle size={34} />

          <h2>Não foi possível acessar o portal</h2>

          <p>{error}</p>

          <button
            onClick={() => router.replace("/cliente/login")}
            style={styles.primaryButton}
          >
            Voltar para o login
          </button>
        </div>
      </main>
    );
  }

  const customerName =
    customer?.full_name ||
    customer?.name ||
    "Cliente";

  const firstName =
    String(customerName)
      .trim()
      .split(" ")[0] || "Cliente";

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.brandArea}>
            <div style={styles.logo}>
              <ShieldCheck size={23} />
            </div>

            <div>
              <div style={styles.brand}>
                LoanControl
              </div>

              <div style={styles.portalLabel}>
                Portal do cliente
              </div>
            </div>
          </div>

          <div style={styles.headerActions}>
            <div style={styles.userMini}>
              <div style={styles.userAvatar}>
                <User size={17} />
              </div>

              <div>
                <strong>{firstName}</strong>
                <span>Cliente</span>
              </div>
            </div>

            <button
              onClick={logout}
              disabled={loggingOut}
              style={styles.logoutButton}
            >
              <LogOut size={17} />

              <span>
                {loggingOut ? "Saindo..." : "Sair"}
              </span>
            </button>
          </div>
        </div>
      </header>

      <section style={styles.content}>
        <div style={styles.welcome}>
          <div>
            <div style={styles.eyebrow}>
              VISÃO GERAL DA SUA CONTA
            </div>

            <h1 style={styles.welcomeTitle}>
              Olá, {firstName}! 👋
            </h1>

            <p style={styles.welcomeText}>
              Aqui você acompanha seus empréstimos,
              parcelas e próximos vencimentos.
            </p>
          </div>

          <div style={styles.accountBadge}>
            <CheckCircle2 size={18} />

            <span>Conta ativa</span>
          </div>
        </div>

        {error && (
          <div style={styles.warning}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statIconBlue}>
              <WalletCards size={21} />
            </div>

            <div>
              <span style={styles.statLabel}>
                Empréstimos
              </span>

              <strong style={styles.statValue}>
                {loans.length}
              </strong>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIconOrange}>
              <Clock3 size={21} />
            </div>

            <div>
              <span style={styles.statLabel}>
                Parcelas em aberto
              </span>

              <strong style={styles.statValue}>
                {summary.openCount}
              </strong>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIconRed}>
              <AlertCircle size={21} />
            </div>

            <div>
              <span style={styles.statLabel}>
                Em atraso
              </span>

              <strong
                style={{
                  ...styles.statValue,
                  color:
                    summary.overdueCount > 0
                      ? "#dc2626"
                      : "#0f172a",
                }}
              >
                {summary.overdueCount}
              </strong>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIconGreen}>
              <DollarSign size={21} />
            </div>

            <div>
              <span style={styles.statLabel}>
                Total em aberto
              </span>

              <strong style={styles.moneyValue}>
                {money(summary.totalOpen)}
              </strong>
            </div>
          </div>
        </div>

        <div style={styles.mainGrid}>
          <section style={styles.panel}>
            <div style={styles.panelHeader}>
              <div>
                <h2 style={styles.panelTitle}>
                  Próximo vencimento
                </h2>

                <p style={styles.panelDescription}>
                  Sua próxima parcela a pagar
                </p>
              </div>

              <CalendarDays
                size={21}
                color="#64748b"
              />
            </div>

            {nextInstallment ? (
              <div style={styles.nextPayment}>
                <div style={styles.nextPaymentTop}>
                  <div style={styles.nextPaymentIcon}>
                    <FileText size={23} />
                  </div>

                  <div>
                    <span style={styles.installmentLabel}>
                      Parcela{" "}
                      {nextInstallment.installment_number ??
                        "-"}
                    </span>

                    <strong style={styles.nextAmount}>
                      {money(
                        nextInstallment.remaining_amount ??
                          nextInstallment.amount ??
                          0
                      )}
                    </strong>
                  </div>
                </div>

                <div style={styles.nextPaymentInfo}>
                  <div>
                    <span>Vencimento</span>
                    <strong>
                      {dateBR(
                        nextInstallment.due_date
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Situação</span>
                    <strong style={{ color: "#d97706" }}>
                      {statusLabel(
                        nextInstallment.status
                      )}
                    </strong>
                  </div>
                </div>

                <button
                  style={styles.boletoButton}
                  onClick={() => {
                    alert(
                      "A geração do boleto bancário será conectada na próxima etapa."
                    );
                  }}
                >
                  <FileText size={18} />
                  Consultar boleto
                  <ChevronRight size={17} />
                </button>
              </div>
            ) : (
              <div style={styles.empty}>
                <CheckCircle2
                  size={36}
                  color="#16a34a"
                />

                <strong>
                  Nenhum vencimento pendente
                </strong>

                <span>
                  Você não possui uma próxima parcela
                  pendente no momento.
                </span>
              </div>
            )}
          </section>

          <section style={styles.panel}>
            <div style={styles.panelHeader}>
              <div>
                <h2 style={styles.panelTitle}>
                  Resumo financeiro
                </h2>

                <p style={styles.panelDescription}>
                  Situação geral das suas parcelas
                </p>
              </div>

              <DollarSign
                size={21}
                color="#64748b"
              />
            </div>

            <div style={styles.financeRows}>
              <div style={styles.financeRow}>
                <div>
                  <ArrowDownLeft
                    size={17}
                    color="#2563eb"
                  />

                  <span>
                    Total em aberto
                  </span>
                </div>

                <strong>
                  {money(summary.totalOpen)}
                </strong>
              </div>

              <div style={styles.financeRow}>
                <div>
                  <AlertCircle
                    size={17}
                    color="#dc2626"
                  />

                  <span>
                    Total em atraso
                  </span>
                </div>

                <strong
                  style={{
                    color:
                      summary.totalOverdue > 0
                        ? "#dc2626"
                        : "#0f172a",
                  }}
                >
                  {money(summary.totalOverdue)}
                </strong>
              </div>

              <div style={styles.financeRow}>
                <div>
                  <CheckCircle2
                    size={17}
                    color="#16a34a"
                  />

                  <span>
                    Parcelas pagas
                  </span>
                </div>

                <strong>
                  {summary.paidCount}
                </strong>
              </div>
            </div>
          </section>
        </div>

        <section style={styles.panel}>
          <div style={styles.panelHeader}>
            <div>
              <h2 style={styles.panelTitle}>
                Minhas parcelas
              </h2>

              <p style={styles.panelDescription}>
                Consulte vencimentos e valores
              </p>
            </div>

            <span style={styles.countBadge}>
              {installments.length} parcelas
            </span>
          </div>

          {recentInstallments.length === 0 ? (
            <div style={styles.emptyTable}>
              <FileText size={35} color="#94a3b8" />

              <strong>
                Nenhuma parcela encontrada
              </strong>

              <span>
                Quando houver parcelas cadastradas,
                elas aparecerão aqui.
              </span>
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Parcela</th>
                    <th>Vencimento</th>
                    <th>Valor</th>
                    <th>Situação</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {recentInstallments.map(
                    (installment, index) => {
                      const overdue =
                        isOverdue(installment);

                      const paid =
                        isPaid(installment);

                      return (
                        <tr
                          key={
                            installment.id ||
                            `${installment.loan_id}-${index}`
                          }
                        >
                          <td>
                            <strong>
                              #
                              {installment.installment_number ??
                                index + 1}
                            </strong>
                          </td>

                          <td>
                            {dateBR(
                              installment.due_date
                            )}
                          </td>

                          <td>
                            <strong>
                              {money(
                                installment.remaining_amount ??
                                  installment.amount ??
                                  0
                              )}
                            </strong>
                          </td>

                          <td>
                            <span
                              style={{
                                ...styles.statusBadge,
                                ...(paid
                                  ? styles.statusPaid
                                  : overdue
                                    ? styles.statusOverdue
                                    : styles.statusPending),
                              }}
                            >
                              {statusLabel(
                                installment.status
                              )}
                            </span>
                          </td>

                          <td>
                            {!paid && (
                              <button
                                style={
                                  styles.smallButton
                                }
                                onClick={() => {
                                  alert(
                                    "A emissão do boleto será conectada na próxima etapa."
                                  );
                                }}
                              >
                                Boleto
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section style={styles.profilePanel}>
          <div style={styles.profileIcon}>
            <User size={21} />
          </div>

          <div style={{ flex: 1 }}>
            <h3 style={styles.profileTitle}>
              Seus dados
            </h3>

            <div style={styles.profileGrid}>
              <div>
                <span>Nome</span>
                <strong>
                  {customer?.full_name || "-"}
                </strong>
              </div>

              <div>
                <span>E-mail</span>
                <strong>
                  {customer?.email || "-"}
                </strong>
              </div>

              <div>
                <span>Telefone</span>
                <strong>
                  {customer?.phone ||
                    customer?.whatsapp ||
                    "-"}
                </strong>
              </div>
            </div>
          </div>
        </section>
      </section>

      <footer style={styles.footer}>
        <ShieldCheck size={15} />

        <span>
          LoanControl • Portal seguro do cliente
        </span>
      </footer>

      <style jsx>{`
        button {
          font-family: inherit;
        }

        button:not(:disabled) {
          transition: all 0.2s ease;
        }

        button:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        @media (max-width: 850px) {
          .main-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 650px) {
          .header-inner {
            flex-direction: column !important;
            align-items: flex-start !important;
          }

          .header-actions {
            width: 100%;
            justify-content: space-between !important;
          }

          .stats-grid {
            grid-template-columns: 1fr 1fr !important;
          }

          .profile-grid {
            grid-template-columns: 1fr !important;
          }

          table {
            min-width: 650px;
          }
        }

        @media (max-width: 450px) {
          .stats-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f8fafc",
    color: "#0f172a",
  },

  loadingPage: {
    minHeight: "100vh",
    background: "#f8fafc",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  loadingBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
    color: "#475569",
    textAlign: "center",
  },

  errorBox: {
    width: "100%",
    maxWidth: 430,
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 20,
    padding: 30,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: 10,
    boxShadow: "0 20px 50px rgba(15,23,42,.08)",
  },

  header: {
    background: "#ffffff",
    borderBottom: "1px solid #e2e8f0",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },

  headerInner: {
    maxWidth: 1250,
    margin: "0 auto",
    padding: "15px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
  },

  brandArea: {
    display: "flex",
    alignItems: "center",
    gap: 11,
  },

  logo: {
    width: 42,
    height: 42,
    borderRadius: 12,
    background: "#2563eb",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  brand: {
    fontWeight: 800,
    fontSize: 17,
  },

  portalLabel: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 1,
  },

  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: 15,
  },

  userMini: {
    display: "flex",
    alignItems: "center",
    gap: 9,
  },

  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "#eff6ff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  logoutButton: {
    height: 38,
    padding: "0 12px",
    border: "1px solid #e2e8f0",
    borderRadius: 9,
    background: "#ffffff",
    color: "#475569",
    display: "flex",
    alignItems: "center",
    gap: 7,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 650,
  },

  content: {
    maxWidth: 1250,
    margin: "0 auto",
    padding: "34px 24px 50px",
  },

  welcome: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 20,
    marginBottom: 27,
  },

  eyebrow: {
    fontSize: 10,
    fontWeight: 800,
    color: "#2563eb",
    letterSpacing: "1px",
    marginBottom: 7,
  },

  welcomeTitle: {
    margin: 0,
    fontSize: 30,
    fontWeight: 800,
    letterSpacing: "-0.6px",
  },

  welcomeText: {
    margin: "7px 0 0",
    color: "#64748b",
    fontSize: 14,
  },

  accountBadge: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    padding: "9px 12px",
    borderRadius: 10,
    background: "#f0fdf4",
    color: "#15803d",
    fontSize: 12,
    fontWeight: 700,
    border: "1px solid #bbf7d0",
  },

  warning: {
    marginBottom: 20,
    padding: "12px 15px",
    background: "#fffbeb",
    color: "#92400e",
    border: "1px solid #fde68a",
    borderRadius: 11,
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(4, minmax(0, 1fr))",
    gap: 15,
    marginBottom: 18,
  },

  statCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 15,
    padding: 18,
    display: "flex",
    alignItems: "center",
    gap: 13,
    boxShadow: "0 5px 18px rgba(15,23,42,.03)",
  },

  statIconBlue: {
    width: 42,
    height: 42,
    borderRadius: 11,
    background: "#eff6ff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  statIconOrange: {
    width: 42,
    height: 42,
    borderRadius: 11,
    background: "#fff7ed",
    color: "#ea580c",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  statIconRed: {
    width: 42,
    height: 42,
    borderRadius: 11,
    background: "#fef2f2",
    color: "#dc2626",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  statIconGreen: {
    width: 42,
    height: 42,
    borderRadius: 11,
    background: "#f0fdf4",
    color: "#16a34a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  statLabel: {
    display: "block",
    fontSize: 11,
    color: "#64748b",
    marginBottom: 4,
  },

  statValue: {
    display: "block",
    fontSize: 22,
    fontWeight: 800,
  },

  moneyValue: {
    display: "block",
    fontSize: 17,
    fontWeight: 800,
  },

  mainGrid: {
    display: "grid",
    gridTemplateColumns: "1.15fr .85fr",
    gap: 18,
    marginBottom: 18,
  },

  panel: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 17,
    overflow: "hidden",
    boxShadow: "0 5px 18px rgba(15,23,42,.03)",
    marginBottom: 18,
  },

  panelHeader: {
    padding: "19px 21px",
    borderBottom: "1px solid #f1f5f9",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 15,
  },

  panelTitle: {
    margin: 0,
    fontSize: 15,
    fontWeight: 800,
  },

  panelDescription: {
    margin: "4px 0 0",
    fontSize: 11.5,
    color: "#64748b",
  },

  nextPayment: {
    padding: 21,
  },

  nextPaymentTop: {
    display: "flex",
    alignItems: "center",
    gap: 13,
  },

  nextPaymentIcon: {
    width: 48,
    height: 48,
    borderRadius: 13,
    background: "#eff6ff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  installmentLabel: {
    display: "block",
    color: "#64748b",
    fontSize: 11,
    marginBottom: 4,
  },

  nextAmount: {
    fontSize: 25,
    fontWeight: 850,
  },

  nextPaymentInfo: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    borderTop: "1px solid #f1f5f9",
    borderBottom: "1px solid #f1f5f9",
    marginTop: 20,
    padding: "15px 0",
  },

  boletoButton: {
    width: "100%",
    height: 44,
    marginTop: 16,
    border: "none",
    borderRadius: 10,
    background: "#2563eb",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 12,
  },

  financeRows: {
    padding: "7px 21px 14px",
  },

  financeRow: {
    minHeight: 58,
    borderBottom: "1px solid #f1f5f9",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 15,
    fontSize: 13,
  },

  empty: {
    minHeight: 190,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    gap: 8,
    padding: 25,
    color: "#475569",
  },

  countBadge: {
    background: "#f1f5f9",
    color: "#475569",
    borderRadius: 20,
    padding: "6px 10px",
    fontSize: 10,
    fontWeight: 700,
  },

  tableWrapper: {
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 12,
  },

  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 20,
    padding: "5px 9px",
    fontSize: 10,
    fontWeight: 750,
  },

  statusPaid: {
    background: "#f0fdf4",
    color: "#15803d",
  },

  statusOverdue: {
    background: "#fef2f2",
    color: "#b91c1c",
  },

  statusPending: {
    background: "#fff7ed",
    color: "#c2410c",
  },

  smallButton: {
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    color: "#1d4ed8",
    borderRadius: 8,
    padding: "6px 9px",
    cursor: "pointer",
    fontSize: 10,
    fontWeight: 700,
  },

  emptyTable: {
    minHeight: 180,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    color: "#64748b",
    textAlign: "center",
  },

  profilePanel: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 17,
    padding: 21,
    display: "flex",
    gap: 15,
  },

  profileIcon: {
    width: 42,
    height: 42,
    borderRadius: 11,
    background: "#f1f5f9",
    color: "#475569",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  profileTitle: {
    margin: "0 0 15px",
    fontSize: 14,
    fontWeight: 800,
  },

  profileGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, minmax(0, 1fr))",
    gap: 20,
  },

  primaryButton: {
    marginTop: 10,
    height: 44,
    padding: "0 18px",
    border: "none",
    borderRadius: 10,
    background: "#2563eb",
    color: "#ffffff",
    fontWeight: 700,
    cursor: "pointer",
  },

  footer: {
    maxWidth: 1250,
    margin: "0 auto",
    padding: "0 24px 30px",
    color: "#94a3b8",
    fontSize: 10,
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
};