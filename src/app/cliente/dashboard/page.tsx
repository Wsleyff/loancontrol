"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  DollarSign,
  FileText,
  LogOut,
  ShieldCheck,
  User,
  WalletCards,
  AlertCircle,
  Loader2,
  QrCode,
  Smartphone,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Customer = Record<string, any>;
type Loan = Record<string, any>;
type Installment = Record<string, any>;

type PixData = {
  installmentId: string;
  amount: number;
  orderId?: string;
  qrCode?: string;
  qrCodeBase64?: string;
  ticketUrl?: string;
  status?: string;
};

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

  // PIX
  const [pixLoading, setPixLoading] = useState(false);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [pixError, setPixError] = useState("");
  const [pixCopied, setPixCopied] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);

  useEffect(() => {
    loadPortal();
  }, []);

  async function loadPortal(showLoading = true) {
    if (showLoading) {
      setLoading(true);
    }

    setError("");

    const supabase = createClient();

    if (!supabase) {
      setError("Não foi possível conectar ao sistema.");

      if (showLoading) {
        setLoading(false);
      }

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

      setError("Não foi possível carregar seus dados.");

      if (showLoading) {
        setLoading(false);
      }

      return;
    }

    if (!customerData) {
      setError(
        "Sua conta ainda não está vinculada a um cliente do LoanControl."
      );

      if (showLoading) {
        setLoading(false);
      }

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

      setError("Não foi possível carregar seus empréstimos.");

      if (showLoading) {
        setLoading(false);
      }

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

      const {
        data: installmentsData,
        error: installmentsError,
      } = await supabase
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

        setError("Não foi possível carregar suas parcelas.");

        if (showLoading) {
          setLoading(false);
        }

        return;
      }

      loadedInstallments = installmentsData || [];
    }

    setInstallments(loadedInstallments);

    if (showLoading) {
      setLoading(false);
    }
  }

  async function logout() {
    const supabase = createClient();

    if (!supabase) return;

    setLoggingOut(true);

    await supabase.auth.signOut();

    router.replace("/cliente/login");
    router.refresh();
  }

  /*
   * Gera um PIX através do Mercado Pago.
   */
  async function generatePix(installment: Installment) {
    if (!installment?.id) {
      setPixError("Não foi possível identificar a parcela.");
      return;
    }

    const amount = Number(
      installment.remaining_amount ??
        installment.amount ??
        0
    );

    if (!amount || amount <= 0) {
      setPixError("O valor da parcela é inválido.");
      return;
    }

    setPixLoading(true);
    setPixError("");
    setPixCopied(false);
    setPixData(null);

    try {
      const response = await fetch(
        "/api/pagamentos/mercado-pago/pix",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            installmentId: installment.id,
            amount,
            payerEmail:
              customer?.email ||
              "cliente@loancontrol.com",
          }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Não foi possível gerar o PIX."
        );
      }

      /*
       * Normaliza possíveis nomes vindos da API.
       */
      const newPixData: PixData = {
        installmentId:
          data?.installmentId ||
          data?.installment_id ||
          installment.id,

        amount: Number(
          data?.amount ??
            amount
        ),

        orderId:
          data?.orderId ||
          data?.order_id ||
          data?.id,

        qrCode:
          data?.qrCode ||
          data?.qr_code ||
          data?.qr_code_text ||
          data?.point_of_interaction?.transaction_data?.qr_code,

        qrCodeBase64:
          data?.qrCodeBase64 ||
          data?.qr_code_base64 ||
          data?.point_of_interaction?.transaction_data?.qr_code_base64,

        ticketUrl:
          data?.ticketUrl ||
          data?.ticket_url,

        status:
          data?.status,
      };

      if (
        !newPixData.qrCode &&
        !newPixData.qrCodeBase64 &&
        !newPixData.ticketUrl
      ) {
        throw new Error(
          "O Mercado Pago não retornou os dados do PIX."
        );
      }

      setPixData(newPixData);
    } catch (err: any) {
      console.error("[PIX]", err);

      setPixError(
        err?.message ||
          "Não foi possível gerar o PIX."
      );
    } finally {
      setPixLoading(false);
    }
  }

  /*
   * Copia o PIX Copia e Cola.
   */
  async function copyPix() {
    if (!pixData?.qrCode) return;

    try {
      await navigator.clipboard.writeText(
        pixData.qrCode
      );

      setPixCopied(true);

      setTimeout(() => {
        setPixCopied(false);
      }, 2500);
    } catch (err) {
      console.error(
        "[PIX] Erro ao copiar:",
        err
      );
    }
  }

  /*
   * Fecha o modal do PIX.
   */
  function closePix() {
    setPixData(null);
    setPixError("");
    setPixCopied(false);
  }

  /*
   * Atualiza os dados das parcelas para verificar
   * se o webhook do Mercado Pago já confirmou o pagamento.
   */
  async function checkPayment() {
    setCheckingPayment(true);

    /*
     * IMPORTANTE:
     * O código anterior tentava acessar pixData.installmentId
     * sem garantir que pixData existia.
     *
     * Aqui fazemos a proteção antes de usar qualquer dado.
     */
    const currentPix = pixData;

    if (!currentPix?.installmentId) {
      setCheckingPayment(false);
      return;
    }

    const supabase = createClient();

    if (!supabase) {
      setCheckingPayment(false);
      return;
    }

    try {
      const { data, error: installmentError } =
        await supabase
          .from("loan_installments")
          .select("*")
          .eq("id", currentPix.installmentId)
          .maybeSingle();

      if (installmentError) {
        console.error(
          "[PIX] Verificação:",
          installmentError
        );

        return;
      }

      /*
       * Se a parcela já estiver paga, atualiza o portal
       * e fecha o PIX.
       */
      if (
        data &&
        String(data.status || "").toUpperCase() ===
          "PAID"
      ) {
        setInstallments((previous) =>
          previous.map((item) =>
            item.id === data.id
              ? data
              : item
          )
        );

        setPixData(null);

        await loadPortal(false);

        return;
      }

      /*
       * Mesmo que ainda não tenha pago, atualizamos
       * a parcela na tela caso exista alteração.
       */
      if (data) {
        setInstallments((previous) =>
          previous.map((item) =>
            item.id === data.id
              ? data
              : item
          )
        );
      }
    } finally {
      setCheckingPayment(false);
    }
  }

  /*
   * Enquanto o modal PIX estiver aberto, verifica
   * periodicamente se o pagamento foi confirmado.
   */
  useEffect(() => {
    if (!pixData?.installmentId) {
      return;
    }

    const interval = window.setInterval(() => {
      checkPayment();
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [pixData?.installmentId]);

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
      overdueCount:
        overdueInstallments.length,
      openCount:
        openInstallments.length,
    };
  }, [installments]);

  const nextInstallment = useMemo(() => {
    return installments.find(
      (item) =>
        !isPaid(item) &&
        !isOverdue(item)
    );
  }, [installments]);

  const recentInstallments = useMemo(() => {
    return [...installments]
      .sort((a, b) => {
        const dateA = new Date(
          a.due_date ||
            "2999-01-01"
        ).getTime();

        const dateB = new Date(
          b.due_date ||
            "2999-01-01"
        ).getTime();

        return dateA - dateB;
      })
      .slice(0, 8);
  }, [installments]);

  if (loading) {
    return (
      <main style={styles.loadingPage}>
        <div style={styles.loadingBox}>
          <div style={styles.loadingIcon}>
            <Loader2
              size={30}
              className="loancontrol-spin"
            />
          </div>

          <strong>
            Carregando seu portal...
          </strong>

          <span>
            Estamos buscando seus empréstimos
            e parcelas.
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
          <AlertCircle
            size={34}
            color="#dc2626"
          />

          <h2>
            Não foi possível acessar o portal
          </h2>

          <p>{error}</p>

          <button
            onClick={() =>
              router.replace(
                "/cliente/login"
              )
            }
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
      .split(" ")[0] ||
    "Cliente";

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div
          className="header-inner"
          style={styles.headerInner}
        >
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

          <div
            className="header-actions"
            style={styles.headerActions}
          >
            <div style={styles.userMini}>
              <div style={styles.userAvatar}>
                <User size={17} />
              </div>

              <div style={styles.userMiniText}>
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
                {loggingOut
                  ? "Saindo..."
                  : "Sair"}
              </span>
            </button>
          </div>
        </div>
      </header>

      <section
        className="content"
        style={styles.content}
      >
        <div
          className="welcome"
          style={styles.welcome}
        >
          <div>
            <div style={styles.eyebrow}>
              VISÃO GERAL DA SUA CONTA
            </div>

            <h1 style={styles.welcomeTitle}>
              Olá, {firstName}! 👋
            </h1>

            <p style={styles.welcomeText}>
              Aqui você acompanha seus
              empréstimos, parcelas e
              pagamentos.
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

        <div
          className="stats-grid"
          style={styles.statsGrid}
        >
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
                    summary.overdueCount >
                    0
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

        <div
          className="main-grid"
          style={styles.mainGrid}
        >
          <section style={styles.panel}>
            <div style={styles.panelHeader}>
              <div>
                <h2 style={styles.panelTitle}>
                  Próximo vencimento
                </h2>

                <p
                  style={
                    styles.panelDescription
                  }
                >
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
                <div
                  style={
                    styles.nextPaymentTop
                  }
                >
                  <div
                    style={
                      styles.nextPaymentIcon
                    }
                  >
                    <FileText size={23} />
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <span
                      style={
                        styles.installmentLabel
                      }
                    >
                      Parcela{" "}
                      {nextInstallment.installment_number ??
                        "-"}
                    </span>

                    <strong
                      style={styles.nextAmount}
                    >
                      {money(
                        nextInstallment.remaining_amount ??
                          nextInstallment.amount ??
                          0
                      )}
                    </strong>
                  </div>
                </div>

                <div
                  className="next-payment-info"
                  style={
                    styles.nextPaymentInfo
                  }
                >
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

                    <strong
                      style={{
                        color: "#d97706",
                      }}
                    >
                      {statusLabel(
                        nextInstallment.status
                      )}
                    </strong>
                  </div>
                </div>

                <button
                  style={
                    styles.pixButton
                  }
                  onClick={() =>
                    generatePix(
                      nextInstallment
                    )
                  }
                  disabled={pixLoading}
                >
                  {pixLoading ? (
                    <Loader2
                      size={19}
                      className="loancontrol-spin"
                    />
                  ) : (
                    <QrCode size={19} />
                  )}

                  <span>
                    {pixLoading
                      ? "Gerando PIX..."
                      : "Pagar com PIX"}
                  </span>

                  {!pixLoading && (
                    <ChevronRight
                      size={17}
                    />
                  )}
                </button>

                <div style={styles.pixHint}>
                  <Smartphone size={15} />

                  <span>
                    Pague pelo PIX usando
                    QR Code ou Pix Copia e
                    Cola.
                  </span>
                </div>
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
                  Você não possui uma próxima
                  parcela pendente no momento.
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

                <p
                  style={
                    styles.panelDescription
                  }
                >
                  Situação geral das suas
                  parcelas
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
                      summary.totalOverdue >
                      0
                        ? "#dc2626"
                        : "#0f172a",
                  }}
                >
                  {money(
                    summary.totalOverdue
                  )}
                </strong>
              </div>

              <div
                style={{
                  ...styles.financeRow,
                  borderBottom: "none",
                }}
              >
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

              <p
                style={
                  styles.panelDescription
                }
              >
                Consulte vencimentos e pague
                suas parcelas
              </p>
            </div>

            <span style={styles.countBadge}>
              {installments.length} parcelas
            </span>
          </div>

          {recentInstallments.length ===
          0 ? (
            <div style={styles.emptyTable}>
              <FileText
                size={35}
                color="#94a3b8"
              />

              <strong>
                Nenhuma parcela encontrada
              </strong>

              <span>
                Quando houver parcelas
                cadastradas, elas aparecerão
                aqui.
              </span>
            </div>
          ) : (
            <div style={styles.installmentsList}>
              {recentInstallments.map(
                (installment, index) => {
                  const overdue =
                    isOverdue(installment);

                  const paid =
                    isPaid(installment);

                  return (
                    <div
                      key={
                        installment.id ||
                        `${installment.loan_id}-${index}`
                      }
                      style={
                        styles.installmentMobileCard
                      }
                    >
                      <div
                        style={
                          styles.installmentMobileTop
                        }
                      >
                        <div>
                          <span
                            style={
                              styles.mobileMuted
                            }
                          >
                            Parcela
                          </span>

                          <strong
                            style={
                              styles.mobileInstallmentNumber
                            }
                          >
                            #
                            {installment.installment_number ??
                              index + 1}
                          </strong>
                        </div>

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
                      </div>

                      <div
                        style={
                          styles.installmentMobileDetails
                        }
                      >
                        <div>
                          <span
                            style={
                              styles.mobileMuted
                            }
                          >
                            Vencimento
                          </span>

                          <strong>
                            {dateBR(
                              installment.due_date
                            )}
                          </strong>
                        </div>

                        <div>
                          <span
                            style={
                              styles.mobileMuted
                            }
                          >
                            Valor
                          </span>

                          <strong>
                            {money(
                              installment.remaining_amount ??
                                installment.amount ??
                                0
                            )}
                          </strong>
                        </div>
                      </div>

                      {!paid && (
                        <button
                          style={
                            styles.mobilePayButton
                          }
                          onClick={() =>
                            generatePix(
                              installment
                            )
                          }
                          disabled={pixLoading}
                        >
                          <QrCode size={17} />

                          <span>
                            Pagar com PIX
                          </span>

                          <ChevronRight
                            size={16}
                          />
                        </button>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          )}

          <div
            className="desktop-table"
            style={styles.tableWrapper}
          >
            {recentInstallments.length >
              0 && (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Parcela</th>
                    <th>Vencimento</th>
                    <th>Valor</th>
                    <th>Situação</th>
                    <th>Ação</th>
                  </tr>
                </thead>

                <tbody>
                  {recentInstallments.map(
                    (
                      installment,
                      index
                    ) => {
                      const overdue =
                        isOverdue(
                          installment
                        );

                      const paid =
                        isPaid(
                          installment
                        );

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
                                  styles.smallPayButton
                                }
                                onClick={() =>
                                  generatePix(
                                    installment
                                  )
                                }
                                disabled={
                                  pixLoading
                                }
                              >
                                <QrCode
                                  size={15}
                                />

                                Pagar PIX
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section style={styles.profilePanel}>
          <div style={styles.profileIcon}>
            <User size={21} />
          </div>

          <div style={{ flex: 1 }}>
            <h3 style={styles.profileTitle}>
              Seus dados
            </h3>

            <div
              className="profile-grid"
              style={styles.profileGrid}
            >
              <div>
                <span>Nome</span>

                <strong>
                  {customer?.full_name ||
                    "-"}
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
          LoanControl • Portal seguro do
          cliente
        </span>
      </footer>

      {/* =====================================================
          MODAL PIX
      ====================================================== */}

      {pixData && (
        <div style={styles.pixOverlay}>
          <div
            className="pix-modal"
            style={styles.pixModal}
          >
            <button
              onClick={closePix}
              style={styles.pixClose}
              aria-label="Fechar"
            >
              <X size={20} />
            </button>

            <div style={styles.pixHeader}>
              <div style={styles.pixHeaderIcon}>
                <QrCode size={24} />
              </div>

              <div>
                <h2 style={styles.pixTitle}>
                  Pagar com PIX
                </h2>

                <p style={styles.pixSubtitle}>
                  Escaneie o QR Code ou copie
                  o código abaixo.
                </p>
              </div>
            </div>

            <div style={styles.pixAmountBox}>
              <span>
                Valor da parcela
              </span>

              <strong>
                {money(pixData.amount)}
              </strong>
            </div>

            {pixData.qrCodeBase64 ? (
              <div style={styles.qrContainer}>
                <img
                  src={
                    pixData.qrCodeBase64.startsWith(
                      "data:"
                    )
                      ? pixData.qrCodeBase64
                      : `data:image/png;base64,${pixData.qrCodeBase64}`
                  }
                  alt="QR Code PIX"
                  style={styles.qrImage}
                />
              </div>
            ) : (
              <div style={styles.qrFallback}>
                <QrCode size={80} />

                <span>
                  Use o Pix Copia e Cola
                  abaixo.
                </span>
              </div>
            )}

            {pixData.qrCode && (
              <div style={styles.copySection}>
                <label
                  style={styles.copyLabel}
                >
                  PIX Copia e Cola
                </label>

                <div
                  style={
                    styles.copyInputWrapper
                  }
                >
                  <input
                    readOnly
                    value={pixData.qrCode}
                    style={styles.copyInput}
                    onFocus={(event) =>
                      event.currentTarget.select()
                    }
                  />

                  <button
                    onClick={copyPix}
                    style={styles.copyButton}
                  >
                    {pixCopied ? (
                      <CheckCircle2
                        size={18}
                      />
                    ) : (
                      <Copy size={18} />
                    )}

                    <span>
                      {pixCopied
                        ? "Copiado"
                        : "Copiar"}
                    </span>
                  </button>
                </div>
              </div>
            )}

            <div style={styles.pixInstructions}>
              <div>
                <Smartphone size={17} />

                <span>
                  Abra o aplicativo do seu
                  banco.
                </span>
              </div>

              <div>
                <QrCode size={17} />

                <span>
                  Escaneie o QR Code ou use
                  Pix Copia e Cola.
                </span>
              </div>

              <div>
                <CheckCircle2 size={17} />

                <span>
                  Após o pagamento, a
                  confirmação será automática.
                </span>
              </div>
            </div>

            <button
              onClick={checkPayment}
              disabled={checkingPayment}
              style={
                styles.checkPaymentButton
              }
            >
              {checkingPayment ? (
                <Loader2
                  size={17}
                  className="loancontrol-spin"
                />
              ) : (
                <CheckCircle2 size={17} />
              )}

              {checkingPayment
                ? "Verificando pagamento..."
                : "Já fiz o pagamento"}
            </button>

            {pixData.ticketUrl && (
              <a
                href={pixData.ticketUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.ticketLink}
              >
                Abrir página de pagamento
                <ChevronRight size={15} />
              </a>
            )}

            <div style={styles.securePix}>
              <ShieldCheck size={15} />

              <span>
                Pagamento processado com
                segurança pelo Mercado Pago.
              </span>
            </div>
          </div>
        </div>
      )}

      {pixError && !pixData && (
        <div style={styles.toastError}>
          <AlertCircle size={18} />

          <span>{pixError}</span>

          <button
            onClick={() => setPixError("")}
            style={styles.toastClose}
          >
            <X size={16} />
          </button>
        </div>
      )}

      <style jsx>{`
        button,
        input {
          font-family: inherit;
        }

        button:not(:disabled) {
          transition: all 0.2s ease;
        }

        button:hover:not(:disabled) {
          transform: translateY(-1px);
        }

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

        @media (max-width: 900px) {
          .main-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 700px) {
          .header-inner {
            padding: 13px 16px !important;
          }

          .content {
            padding: 24px 15px 35px !important;
          }

          .welcome {
            flex-direction: column !important;
            gap: 15px !important;
            margin-bottom: 20px !important;
          }

          .welcome h1 {
            font-size: 28px !important;
          }

          .account-badge {
            align-self: flex-start;
          }

          .stats-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 10px !important;
          }

          .stat-card {
            padding: 14px !important;
            min-width: 0 !important;
          }

          .stat-card strong {
            font-size: 19px !important;
          }

          .stat-label {
            font-size: 10px !important;
          }

          .stat-icon {
            width: 37px !important;
            height: 37px !important;
          }

          .profile-grid {
            grid-template-columns: 1fr !important;
            gap: 13px !important;
          }

          .desktop-table {
            display: none !important;
          }

          .pix-modal {
            width: calc(100% - 24px) !important;
            max-height: calc(100vh - 24px) !important;
            overflow-y: auto !important;
            border-radius: 22px !important;
          }
        }

        @media (min-width: 701px) {
          .installments-list {
            display: none !important;
          }
        }

        @media (max-width: 500px) {
          .header-actions {
            width: 100% !important;
          }

          .user-mini-text {
            display: block !important;
          }

          .logout-button span {
            display: none !important;
          }

          .logout-button {
            width: 40px !important;
            padding: 0 !important;
            justify-content: center !important;
          }

          .stats-grid {
            grid-template-columns: 1fr 1fr !important;
          }

          .stat-card {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 9px !important;
          }

          .stat-card strong {
            font-size: 20px !important;
          }

          .main-grid {
            gap: 12px !important;
          }

          .panel {
            border-radius: 15px !important;
            margin-bottom: 12px !important;
          }

          .panel-header {
            padding: 16px !important;
          }

          .next-payment {
            padding: 16px !important;
          }

          .next-amount {
            font-size: 24px !important;
          }

          .next-payment-info {
            grid-template-columns: 1fr !important;
          }

          .profile-panel {
            padding: 16px !important;
          }

          .pix-modal {
            padding: 20px !important;
          }

          .pix-title {
            font-size: 20px !important;
          }

          .qr-image {
            width: 190px !important;
            height: 190px !important;
          }
        }

        @media (max-width: 360px) {
          .stats-grid {
            grid-template-columns: 1fr !important;
          }

          .welcome h1 {
            font-size: 25px !important;
          }
        }
      `}</style>
    </main>
  );
}

const styles: Record<
  string,
  React.CSSProperties
> = {
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

  loadingIcon: {
    width: 58,
    height: 58,
    borderRadius: 17,
    background: "#eff6ff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
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
    boxShadow:
      "0 20px 50px rgba(15,23,42,.08)",
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
    flexShrink: 0,
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

  userMiniText: {
    display: "flex",
    flexDirection: "column",
    gap: 1,
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
    flexShrink: 0,
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
    lineHeight: 1.6,
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
    flexShrink: 0,
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
    boxShadow:
      "0 5px 18px rgba(15,23,42,.03)",
    minWidth: 0,
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
    flexShrink: 0,
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
    flexShrink: 0,
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
    flexShrink: 0,
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
    flexShrink: 0,
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
    whiteSpace: "nowrap",
  },

  mainGrid: {
    display: "grid",
    gridTemplateColumns: "1.15fr .85fr",
    gap: 18,
    marginBottom: 0,
  },

  panel: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 17,
    overflow: "hidden",
    boxShadow:
      "0 5px 18px rgba(15,23,42,.03)",
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
    lineHeight: 1.5,
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
    flexShrink: 0,
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

  pixButton: {
    width: "100%",
    minHeight: 46,
    marginTop: 16,
    border: "none",
    borderRadius: 11,
    background:
      "linear-gradient(135deg,#2563eb,#1d4ed8)",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    cursor: "pointer",
    fontWeight: 750,
    fontSize: 13,
    boxShadow:
      "0 8px 18px rgba(37,99,235,.20)",
  },

  pixHint: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 6,
    color: "#64748b",
    fontSize: 10.5,
    lineHeight: 1.45,
    marginTop: 9,
    textAlign: "center",
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
    whiteSpace: "nowrap",
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

  smallPayButton: {
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    color: "#1d4ed8",
    borderRadius: 8,
    padding: "7px 10px",
    cursor: "pointer",
    fontSize: 10,
    fontWeight: 750,
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
  },

  installmentsList: {
    display: "none",
    padding: 12,
  },

  installmentMobileCard: {
    border: "1px solid #e2e8f0",
    borderRadius: 13,
    padding: 14,
    marginBottom: 10,
    background: "#ffffff",
  },

  installmentMobileTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },

  mobileMuted: {
    display: "block",
    fontSize: 10,
    color: "#94a3b8",
    marginBottom: 3,
  },

  mobileInstallmentNumber: {
    fontSize: 16,
  },

  installmentMobileDetails: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 15,
    marginTop: 14,
    paddingTop: 13,
    borderTop: "1px solid #f1f5f9",
  },

  mobilePayButton: {
    width: "100%",
    minHeight: 42,
    border: "none",
    borderRadius: 9,
    background: "#2563eb",
    color: "#ffffff",
    marginTop: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 750,
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
    padding: 20,
  },

  profilePanel: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 17,
    padding: 21,
    display: "flex",
    gap: 15,
    marginTop: 0,
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

  /* PIX MODAL */

  pixOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 100,
    background:
      "rgba(15,23,42,.62)",
    backdropFilter: "blur(5px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },

  pixModal: {
    position: "relative",
    width: "100%",
    maxWidth: 470,
    background: "#ffffff",
    borderRadius: 24,
    padding: 26,
    boxShadow:
      "0 30px 80px rgba(15,23,42,.28)",
  },

  pixClose: {
    position: "absolute",
    top: 15,
    right: 15,
    width: 35,
    height: 35,
    borderRadius: "50%",
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    color: "#64748b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },

  pixHeader: {
    display: "flex",
    alignItems: "center",
    gap: 13,
    paddingRight: 35,
  },

  pixHeaderIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    background: "#ecfdf5",
    color: "#059669",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  pixTitle: {
    margin: 0,
    fontSize: 22,
    fontWeight: 850,
  },

  pixSubtitle: {
    margin: "4px 0 0",
    fontSize: 11.5,
    color: "#64748b",
    lineHeight: 1.5,
  },

  pixAmountBox: {
    marginTop: 20,
    padding: "13px 15px",
    borderRadius: 12,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 15,
  },

  qrContainer: {
    margin: "20px auto 16px",
    width: 230,
    height: 230,
    borderRadius: 17,
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },

  qrImage: {
    width: 205,
    height: 205,
    objectFit: "contain",
    display: "block",
  },

  qrFallback: {
    margin: "20px auto 16px",
    width: 230,
    height: 180,
    borderRadius: 17,
    background: "#f8fafc",
    color: "#2563eb",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  copySection: {
    marginTop: 5,
  },

  copyLabel: {
    display: "block",
    fontSize: 10,
    fontWeight: 750,
    color: "#475569",
    marginBottom: 6,
  },

  copyInputWrapper: {
    display: "flex",
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    overflow: "hidden",
    background: "#ffffff",
  },

  copyInput: {
    minWidth: 0,
    flex: 1,
    height: 42,
    border: "none",
    outline: "none",
    padding: "0 10px",
    fontSize: 10,
    color: "#475569",
    background: "#f8fafc",
  },

  copyButton: {
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    padding: "0 13px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 750,
    flexShrink: 0,
  },

  pixInstructions: {
    marginTop: 18,
    padding: 14,
    borderRadius: 12,
    background: "#f8fafc",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  checkPaymentButton: {
    width: "100%",
    height: 44,
    marginTop: 15,
    border: "1px solid #bbf7d0",
    borderRadius: 10,
    background: "#f0fdf4",
    color: "#15803d",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 750,
  },

  ticketLink: {
    marginTop: 10,
    color: "#2563eb",
    fontSize: 11,
    fontWeight: 700,
    textDecoration: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },

  securePix: {
    marginTop: 15,
    paddingTop: 13,
    borderTop: "1px solid #f1f5f9",
    color: "#94a3b8",
    fontSize: 9.5,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    textAlign: "center",
  },

  toastError: {
    position: "fixed",
    right: 20,
    bottom: 20,
    zIndex: 200,
    maxWidth: 390,
    background: "#ffffff",
    color: "#991b1b",
    border: "1px solid #fecaca",
    borderRadius: 12,
    padding: "12px 12px 12px 14px",
    boxShadow:
      "0 15px 40px rgba(15,23,42,.15)",
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12,
  },

  toastClose: {
    border: "none",
    background: "transparent",
    color: "#991b1b",
    cursor: "pointer",
    padding: 3,
    display: "flex",
  },
};