"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  CreditCard,
  DollarSign,
  FileText,
  HelpCircle,
  Home,
  Loader2,
  LogOut,
  Menu,
  Percent,
  QrCode,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  User,
  WalletCards,
  X,
  Zap,
  AlertCircle,
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

type AnticipationData = {
  installment: Installment;
  originalAmount: number;
  discountPercent: number;
  discountAmount: number;
  finalAmount: number;
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

function isFutureInstallment(item: Installment) {
  if (!item?.id || isPaid(item) || isOverdue(item)) {
    return false;
  }

  if (!item.due_date) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(`${item.due_date}T00:00:00`);

  return due.getTime() > today.getTime();
}

function getRemainingAmount(item: Installment) {
  const remaining = Number(item?.remaining_amount);

  if (Number.isFinite(remaining) && remaining > 0) {
    return remaining;
  }

  const amount = Number(item?.amount || 0);
  const paid = Number(item?.paid_amount || 0);

  return Math.max(0, amount - paid);
}

/*
 * Regra inicial de antecipação.
 *
 * O desconto fica limitado para proteger a margem:
 *
 * 1 a 7 dias       = 1%
 * 8 a 15 dias      = 2%
 * 16 a 30 dias     = 3%
 * acima de 30 dias = 4%
 *
 * Depois essa regra pode ser transformada em configuração
 * da empresa no painel administrativo.
 */
function getAnticipationPercent(dueDate: any) {
  if (!dueDate) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(`${dueDate}T00:00:00`);

  const diff =
    due.getTime() - today.getTime();

  const days = Math.ceil(
    diff / (1000 * 60 * 60 * 24)
  );

  if (days <= 0) return 0;
  if (days <= 7) return 1;
  if (days <= 15) return 2;
  if (days <= 30) return 3;

  return 4;
}

function calculateAnticipation(
  installment: Installment
): AnticipationData | null {
  if (!isFutureInstallment(installment)) {
    return null;
  }

  const originalAmount =
    getRemainingAmount(installment);

  if (originalAmount <= 0) {
    return null;
  }

  const discountPercent =
    getAnticipationPercent(
      installment.due_date
    );

  const discountAmount = Number(
    (
      originalAmount *
      (discountPercent / 100)
    ).toFixed(2)
  );

  const finalAmount = Number(
    Math.max(
      0,
      originalAmount - discountAmount
    ).toFixed(2)
  );

  return {
    installment,
    originalAmount,
    discountPercent,
    discountAmount,
    finalAmount,
  };
}

export default function ClienteDashboardPage() {
  const router = useRouter();

  const [loading, setLoading] =
    useState(true);

  const [loggingOut, setLoggingOut] =
    useState(false);

  const [customer, setCustomer] =
    useState<Customer | null>(null);

  const [loans, setLoans] =
    useState<Loan[]>([]);

  const [installments, setInstallments] =
    useState<Installment[]>([]);

  const [error, setError] =
    useState("");

  const [mobileMenu, setMobileMenu] =
    useState(false);

  /*
   * PIX
   */
  const [pixLoading, setPixLoading] =
    useState(false);

  const [pixData, setPixData] =
    useState<PixData | null>(null);

  const [pixError, setPixError] =
    useState("");

  const [pixCopied, setPixCopied] =
    useState(false);

  const [checkingPayment, setCheckingPayment] =
    useState(false);

  /*
   * Antecipação
   */
  const [
    anticipation,
    setAnticipation,
  ] = useState<AnticipationData | null>(
    null
  );

  const [
    anticipationLoading,
    setAnticipationLoading,
  ] = useState(false);

  /*
   * ID separado da parcela atualmente
   * utilizada pelo PIX.
   *
   * Isso evita depender exclusivamente
   * do estado do modal.
   */
  const [
    activeInstallmentId,
    setActiveInstallmentId,
  ] = useState<string | null>(null);

  useEffect(() => {
    loadPortal();
  }, []);

  async function loadPortal(
    showLoading = true
  ) {
    if (showLoading) {
      setLoading(true);
    }

    setError("");

    const supabase = createClient();

    if (!supabase) {
      setError(
        "Não foi possível conectar ao sistema."
      );

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

    const {
      data: customerData,
      error: customerError,
    } = await supabase
      .from("customers")
      .select("*")
      .eq("auth_user_id", user.id)
      .eq("portal_enabled", true)
      .maybeSingle();

    if (customerError) {
      console.error(
        "[PORTAL] Cliente:",
        customerError
      );

      setError(
        "Não foi possível carregar seus dados."
      );

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

    const {
      data: loansData,
      error: loansError,
    } = await supabase
      .from("loans")
      .select("*")
      .eq("customer_id", customerData.id)
      .order("created_at", {
        ascending: false,
      });

    if (loansError) {
      console.error(
        "[PORTAL] Empréstimos:",
        loansError
      );

      setError(
        "Não foi possível carregar seus empréstimos."
      );

      if (showLoading) {
        setLoading(false);
      }

      return;
    }

    const loadedLoans = loansData || [];

    setLoans(loadedLoans);

    let loadedInstallments: Installment[] =
      [];

    if (loadedLoans.length > 0) {
      const loanIds = loadedLoans.map(
        (loan) => loan.id
      );

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

        setError(
          "Não foi possível carregar suas parcelas."
        );

        if (showLoading) {
          setLoading(false);
        }

        return;
      }

      loadedInstallments =
        installmentsData || [];
    }

    setInstallments(
      loadedInstallments
    );

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
   * Geração do PIX.
   *
   * O ponto principal da correção:
   * - valida o objeto inteiro;
   * - valida o ID;
   * - guarda o ID em estado separado;
   * - envia installmentId;
   * - também envia installment_id para
   *   compatibilidade com versões da API.
   */
  async function generatePix(
    installment: Installment,
    customAmount?: number
  ) {
    const installmentId = String(
      installment?.id || ""
    ).trim();

    if (!installmentId) {
      setPixError(
        "Não foi possível identificar a parcela. Atualize a página e tente novamente."
      );
      return;
    }

    const amount = Number(
      customAmount ??
        getRemainingAmount(installment)
    );

    if (!Number.isFinite(amount) || amount <= 0) {
      setPixError(
        "O valor da parcela é inválido."
      );
      return;
    }

    setActiveInstallmentId(
      installmentId
    );

    setPixLoading(true);
    setPixError("");
    setPixCopied(false);
    setPixData(null);

    try {
      const payload = {
        installmentId,
        installment_id: installmentId,
        amount,
        payerEmail:
          customer?.email ||
          "cliente@loancontrol.com",
      };

      console.log(
        "[PIX] Enviando parcela:",
        installmentId
      );

      const response = await fetch(
        "/api/pagamentos/mercado-pago/pix",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Não foi possível gerar o PIX."
        );
      }

      const returnedInstallmentId =
        String(
          data?.installmentId ||
            data?.installment_id ||
            installmentId
        ).trim();

      /*
       * Mesmo que a API não devolva o ID,
       * usamos o ID original que já foi
       * validado antes da chamada.
       */
      const newPixData: PixData = {
        installmentId:
          returnedInstallmentId ||
          installmentId,

        amount: Number(
          data?.amount ?? amount
        ),

        orderId:
          data?.orderId ||
          data?.order_id ||
          data?.id,

        qrCode:
          data?.qrCode ||
          data?.qr_code ||
          data?.qr_code_text ||
          data
            ?.point_of_interaction
            ?.transaction_data
            ?.qr_code,

        qrCodeBase64:
          data?.qrCodeBase64 ||
          data?.qr_code_base64 ||
          data
            ?.point_of_interaction
            ?.transaction_data
            ?.qr_code_base64,

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
      console.error(
        "[PIX] Erro:",
        err
      );

      setPixError(
        err?.message ||
          "Não foi possível gerar o PIX."
      );
    } finally {
      setPixLoading(false);
    }
  }

  /*
   * Abre antecipação.
   */
  function openAnticipation(
    installment: Installment
  ) {
    const calculated =
      calculateAnticipation(
        installment
      );

    if (!calculated) {
      setPixError(
        "Essa parcela não pode ser antecipada."
      );
      return;
    }

    setAnticipation(
      calculated
    );
  }

  /*
   * Confirma antecipação e gera PIX
   * pelo valor com desconto.
   *
   * O backend de desconto definitivo
   * será conectado na etapa SQL/RPC.
   */
  async function confirmAnticipation() {
    if (!anticipation) return;

    if (
      anticipation.finalAmount <= 0
    ) {
      setPixError(
        "O valor final da antecipação é inválido."
      );
      return;
    }

    setAnticipationLoading(true);

    try {
      await generatePix(
        anticipation.installment,
        anticipation.finalAmount
      );

      setAnticipation(null);
    } finally {
      setAnticipationLoading(false);
    }
  }

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

  function closePix() {
    setPixData(null);
    setPixError("");
    setPixCopied(false);
    setActiveInstallmentId(null);
  }

  function closeAnticipation() {
    if (anticipationLoading) return;

    setAnticipation(null);
  }

  async function checkPayment() {
    const currentPix = pixData;

    if (!currentPix?.installmentId) {
      return;
    }

    setCheckingPayment(true);

    const supabase = createClient();

    if (!supabase) {
      setCheckingPayment(false);
      return;
    }

    try {
      const {
        data,
        error: installmentError,
      } = await supabase
        .from("loan_installments")
        .select("*")
        .eq(
          "id",
          currentPix.installmentId
        )
        .maybeSingle();

      if (installmentError) {
        console.error(
          "[PIX] Verificação:",
          installmentError
        );
        return;
      }

      if (
        data &&
        String(
          data.status || ""
        ).toUpperCase() === "PAID"
      ) {
        setInstallments(
          (previous) =>
            previous.map((item) =>
              item.id === data.id
                ? data
                : item
            )
        );

        setPixData(null);
        setActiveInstallmentId(null);

        await loadPortal(false);

        return;
      }

      if (data) {
        setInstallments(
          (previous) =>
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

  useEffect(() => {
    if (!pixData?.installmentId) {
      return;
    }

    const interval =
      window.setInterval(() => {
        checkPayment();
      }, 5000);

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [pixData?.installmentId]);

  const summary = useMemo(() => {
    const openInstallments =
      installments.filter(
        (item) => !isPaid(item)
      );

    const overdueInstallments =
      installments.filter(
        (item) => isOverdue(item)
      );

    const totalOpen =
      openInstallments.reduce(
        (sum, item) =>
          sum +
          getRemainingAmount(item),
        0
      );

    const totalOverdue =
      overdueInstallments.reduce(
        (sum, item) =>
          sum +
          getRemainingAmount(item),
        0
      );

    const paidCount =
      installments.filter(
        (item) => isPaid(item)
      ).length;

    const anticipationCount =
      installments.filter(
        (item) =>
          !!calculateAnticipation(item)
      ).length;

    return {
      totalOpen,
      totalOverdue,
      paidCount,
      overdueCount:
        overdueInstallments.length,
      openCount:
        openInstallments.length,
      anticipationCount,
    };
  }, [installments]);

  const nextInstallment =
    useMemo(() => {
      return installments.find(
        (item) =>
          !isPaid(item) &&
          !isOverdue(item)
      );
    }, [installments]);

  const recentInstallments =
    useMemo(() => {
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
        .slice(0, 12);
    }, [installments]);

  const anticipationOptions =
    useMemo(() => {
      return installments
        .map((item) =>
          calculateAnticipation(item)
        )
        .filter(
          (
            item
          ): item is AnticipationData =>
            item !== null
        );
    }, [installments]);

  if (loading) {
    return (
      <main
        style={styles.loadingPage}
      >
        <div
          style={styles.loadingBox}
        >
          <div
            style={
              styles.loadingIcon
            }
          >
            <Loader2
              size={30}
              className="loancontrol-spin"
            />
          </div>

          <strong>
            Carregando seu portal...
          </strong>

          <span>
            Estamos buscando seus
            empréstimos e parcelas.
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
      <main
        style={styles.loadingPage}
      >
        <div
          style={styles.errorBox}
        >
          <AlertCircle
            size={34}
            color="#dc2626"
          />

          <h2>
            Não foi possível acessar
            o portal
          </h2>

          <p>{error}</p>

          <button
            onClick={() =>
              router.replace(
                "/cliente/login"
              )
            }
            style={
              styles.primaryButton
            }
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
      {/* =====================================================
          CABEÇALHO
      ====================================================== */}

      <header
        style={styles.header}
      >
        <div
          className="header-inner"
          style={styles.headerInner}
        >
          <div
            style={styles.brandArea}
          >
            <div
              style={styles.logo}
            >
              <ShieldCheck
                size={22}
              />
            </div>

            <div>
              <div
                style={styles.brand}
              >
                LoanControl
              </div>

              <div
                style={
                  styles.portalLabel
                }
              >
                Portal do cliente
              </div>
            </div>
          </div>

          {/* MENU DESKTOP */}

          <nav
            className="desktop-nav"
            style={styles.desktopNav}
          >
            <button
              onClick={() =>
                window.scrollTo({
                  top: 0,
                  behavior: "smooth",
                })
              }
              style={
                styles.navButtonActive
              }
            >
              <Home size={15} />
              Início
            </button>

            <button
              onClick={() =>
                document
                  .getElementById(
                    "emprestimos"
                  )
                  ?.scrollIntoView({
                    behavior:
                      "smooth",
                  })
              }
              style={
                styles.navButton
              }
            >
              <CreditCard
                size={15}
              />
              Empréstimos
            </button>

            <button
              onClick={() =>
                document
                  .getElementById(
                    "parcelas"
                  )
                  ?.scrollIntoView({
                    behavior:
                      "smooth",
                  })
              }
              style={
                styles.navButton
              }
            >
              <CalendarDays
                size={15}
              />
              Parcelas
            </button>

            <button
              onClick={() =>
                document
                  .getElementById(
                    "antecipar"
                  )
                  ?.scrollIntoView({
                    behavior:
                      "smooth",
                  })
              }
              style={
                styles.navButton
              }
            >
              <Zap size={15} />
              Antecipar
            </button>

            <button
              onClick={() =>
                document
                  .getElementById(
                    "pagamentos"
                  )
                  ?.scrollIntoView({
                    behavior:
                      "smooth",
                  })
              }
              style={
                styles.navButton
              }
            >
              <ReceiptText
                size={15}
              />
              Pagamentos
            </button>
          </nav>

          <div
            className="header-actions"
            style={
              styles.headerActions
            }
          >
            <button
              className="desktop-help"
              style={
                styles.iconHeaderButton
              }
              title="Ajuda"
            >
              <HelpCircle
                size={18}
              />
            </button>

            <div
              style={styles.userMini}
            >
              <div
                style={
                  styles.userAvatar
                }
              >
                <User size={17} />
              </div>

              <div
                className="user-mini-text"
                style={
                  styles.userMiniText
                }
              >
                <strong>
                  {firstName}
                </strong>

                <span>Cliente</span>
              </div>
            </div>

            <button
              onClick={logout}
              disabled={loggingOut}
              className="desktop-logout"
              style={
                styles.logoutButton
              }
            >
              <LogOut size={17} />

              <span>
                {loggingOut
                  ? "Saindo..."
                  : "Sair"}
              </span>
            </button>

            <button
              className="mobile-menu-button"
              onClick={() =>
                setMobileMenu(
                  (value) => !value
                )
              }
              style={
                styles.mobileMenuButton
              }
              aria-label="Abrir menu"
            >
              {mobileMenu ? (
                <X size={22} />
              ) : (
                <Menu size={22} />
              )}
            </button>
          </div>
        </div>

        {/* MENU MOBILE */}

        {mobileMenu && (
          <div
            className="mobile-menu"
            style={
              styles.mobileMenu
            }
          >
            <button
              onClick={() => {
                setMobileMenu(false);

                window.scrollTo({
                  top: 0,
                  behavior:
                    "smooth",
                });
              }}
              style={
                styles.mobileMenuItem
              }
            >
              <Home size={18} />
              <span>Início</span>
            </button>

            <button
              onClick={() => {
                setMobileMenu(false);

                document
                  .getElementById(
                    "emprestimos"
                  )
                  ?.scrollIntoView({
                    behavior:
                      "smooth",
                  });
              }}
              style={
                styles.mobileMenuItem
              }
            >
              <CreditCard
                size={18}
              />
              <span>
                Meus empréstimos
              </span>
            </button>

            <button
              onClick={() => {
                setMobileMenu(false);

                document
                  .getElementById(
                    "parcelas"
                  )
                  ?.scrollIntoView({
                    behavior:
                      "smooth",
                  });
              }}
              style={
                styles.mobileMenuItem
              }
            >
              <CalendarDays
                size={18}
              />
              <span>Parcelas</span>
            </button>

            <button
              onClick={() => {
                setMobileMenu(false);

                document
                  .getElementById(
                    "antecipar"
                  )
                  ?.scrollIntoView({
                    behavior:
                      "smooth",
                  });
              }}
              style={
                styles.mobileMenuItem
              }
            >
              <Zap size={18} />
              <span>
                Antecipar parcela
              </span>
            </button>

            <button
              onClick={() => {
                setMobileMenu(false);

                document
                  .getElementById(
                    "pagamentos"
                  )
                  ?.scrollIntoView({
                    behavior:
                      "smooth",
                  });
              }}
              style={
                styles.mobileMenuItem
              }
            >
              <ReceiptText
                size={18}
              />
              <span>
                Pagamentos
              </span>
            </button>

            <button
              style={
                styles.mobileMenuItem
              }
            >
              <HelpCircle
                size={18}
              />
              <span>Ajuda</span>
            </button>

            <button
              onClick={logout}
              disabled={loggingOut}
              style={
                styles.mobileLogoutItem
              }
            >
              <LogOut size={18} />

              <span>
                {loggingOut
                  ? "Saindo..."
                  : "Sair da conta"}
              </span>
            </button>
          </div>
        )}
      </header>

      <section
        className="content"
        style={styles.content}
      >
        {/* =====================================================
            BOAS-VINDAS
        ====================================================== */}

        <div
          className="welcome"
          style={styles.welcome}
        >
          <div>
            <div
              style={styles.eyebrow}
            >
              VISÃO GERAL DA SUA CONTA
            </div>

            <h1
              style={
                styles.welcomeTitle
              }
            >
              Olá, {firstName}! 👋
            </h1>

            <p
              style={
                styles.welcomeText
              }
            >
              Acompanhe seus
              empréstimos, parcelas,
              pagamentos e aproveite
              descontos para antecipar
              suas parcelas.
            </p>
          </div>

          <div
            style={
              styles.accountBadge
            }
          >
            <CheckCircle2
              size={18}
            />

            <span>
              Conta ativa
            </span>
          </div>
        </div>

        {error && (
          <div
            style={styles.warning}
          >
            <AlertCircle
              size={18}
            />

            <span>{error}</span>
          </div>
        )}

        {/* =====================================================
            ESTATÍSTICAS
        ====================================================== */}

        <div
          className="stats-grid"
          style={styles.statsGrid}
        >
          <div
            className="stat-card"
            style={styles.statCard}
          >
            <div
              style={
                styles.statIconBlue
              }
            >
              <WalletCards
                size={21}
              />
            </div>

            <div>
              <span
                style={
                  styles.statLabel
                }
              >
                Empréstimos
              </span>

              <strong
                style={
                  styles.statValue
                }
              >
                {loans.length}
              </strong>
            </div>
          </div>

          <div
            className="stat-card"
            style={styles.statCard}
          >
            <div
              style={
                styles.statIconOrange
              }
            >
              <Clock3 size={21} />
            </div>

            <div>
              <span
                style={
                  styles.statLabel
                }
              >
                Parcelas em aberto
              </span>

              <strong
                style={
                  styles.statValue
                }
              >
                {summary.openCount}
              </strong>
            </div>
          </div>

          <div
            className="stat-card"
            style={styles.statCard}
          >
            <div
              style={
                styles.statIconRed
              }
            >
              <AlertCircle
                size={21}
              />
            </div>

            <div>
              <span
                style={
                  styles.statLabel
                }
              >
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

          <div
            className="stat-card"
            style={styles.statCard}
          >
            <div
              style={
                styles.statIconGreen
              }
            >
              <DollarSign
                size={21}
              />
            </div>

            <div>
              <span
                style={
                  styles.statLabel
                }
              >
                Total em aberto
              </span>

              <strong
                style={
                  styles.moneyValue
                }
              >
                {money(
                  summary.totalOpen
                )}
              </strong>
            </div>
          </div>
        </div>

        {/* =====================================================
            DESTAQUE ANTECIPAÇÃO
        ====================================================== */}

        {anticipationOptions.length >
          0 && (
          <section
            id="antecipar"
            className="anticipation-banner"
            style={
              styles.anticipationBanner
            }
          >
            <div
              style={
                styles.anticipationIcon
              }
            >
              <Zap size={24} />
            </div>

            <div
              style={
                styles.anticipationContent
              }
            >
              <span
                style={
                  styles.anticipationEyebrow
                }
              >
                BENEFÍCIO PARA VOCÊ
              </span>

              <h2
                style={
                  styles.anticipationTitle
                }
              >
                Antecipe suas
                parcelas e economize
              </h2>

              <p
                style={
                  styles.anticipationText
                }
              >
                Você possui{" "}
                <strong>
                  {
                    anticipationOptions.length
                  }
                </strong>{" "}
                parcela(s) que podem
                ser antecipadas com
                desconto calculado
                automaticamente.
              </p>
            </div>

            <button
              onClick={() =>
                openAnticipation(
                  anticipationOptions[0]
                    .installment
                )
              }
              style={
                styles.anticipationButton
              }
            >
              Ver desconto
              <ArrowRight
                size={17}
              />
            </button>
          </section>
        )}

        {/* =====================================================
            PRINCIPAL
        ====================================================== */}

        <div
          id="emprestimos"
          className="main-grid"
          style={styles.mainGrid}
        >
          <section
            style={styles.panel}
          >
            <div
              style={
                styles.panelHeader
              }
            >
              <div>
                <h2
                  style={
                    styles.panelTitle
                  }
                >
                  Próximo vencimento
                </h2>

                <p
                  style={
                    styles.panelDescription
                  }
                >
                  Sua próxima parcela
                  a pagar
                </p>
              </div>

              <CalendarDays
                size={21}
                color="#64748b"
              />
            </div>

            {nextInstallment ? (
              <div
                style={
                  styles.nextPayment
                }
              >
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
                    <FileText
                      size={23}
                    />
                  </div>

                  <div
                    style={{
                      minWidth: 0,
                    }}
                  >
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
                      style={
                        styles.nextAmount
                      }
                    >
                      {money(
                        getRemainingAmount(
                          nextInstallment
                        )
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
                    <span>
                      Vencimento
                    </span>

                    <strong>
                      {dateBR(
                        nextInstallment.due_date
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Situação
                    </span>

                    <strong
                      style={{
                        color:
                          "#d97706",
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
                  disabled={
                    pixLoading
                  }
                >
                  {pixLoading ? (
                    <Loader2
                      size={19}
                      className="loancontrol-spin"
                    />
                  ) : (
                    <QrCode
                      size={19}
                    />
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

                {isFutureInstallment(
                  nextInstallment
                ) && (
                  <button
                    style={
                      styles.anticipateSecondary
                    }
                    onClick={() =>
                      openAnticipation(
                        nextInstallment
                      )
                    }
                  >
                    <Zap size={16} />

                    Antecipar com
                    desconto
                  </button>
                )}

                <div
                  style={
                    styles.pixHint
                  }
                >
                  <Smartphone
                    size={15}
                  />

                  <span>
                    Pague pelo PIX
                    usando QR Code ou
                    Pix Copia e Cola.
                  </span>
                </div>
              </div>
            ) : (
              <div
                style={styles.empty}
              >
                <CheckCircle2
                  size={36}
                  color="#16a34a"
                />

                <strong>
                  Nenhum vencimento
                  pendente
                </strong>

                <span>
                  Você não possui uma
                  próxima parcela
                  pendente no momento.
                </span>
              </div>
            )}
          </section>

          <section
            style={styles.panel}
          >
            <div
              style={
                styles.panelHeader
              }
            >
              <div>
                <h2
                  style={
                    styles.panelTitle
                  }
                >
                  Resumo financeiro
                </h2>

                <p
                  style={
                    styles.panelDescription
                  }
                >
                  Situação geral das
                  suas parcelas
                </p>
              </div>

              <DollarSign
                size={21}
                color="#64748b"
              />
            </div>

            <div
              style={
                styles.financeRows
              }
            >
              <div
                style={
                  styles.financeRow
                }
              >
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
                  {money(
                    summary.totalOpen
                  )}
                </strong>
              </div>

              <div
                style={
                  styles.financeRow
                }
              >
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
                  borderBottom:
                    "none",
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

        {/* =====================================================
            PARCELAS
        ====================================================== */}

        <section
          id="parcelas"
          style={styles.panel}
        >
          <div
            style={
              styles.panelHeader
            }
          >
            <div>
              <h2
                style={
                  styles.panelTitle
                }
              >
                Minhas parcelas
              </h2>

              <p
                style={
                  styles.panelDescription
                }
              >
                Consulte vencimentos,
                pague ou antecipe
                parcelas
              </p>
            </div>

            <span
              style={
                styles.countBadge
              }
            >
              {installments.length}{" "}
              parcelas
            </span>
          </div>

          {recentInstallments.length ===
          0 ? (
            <div
              style={
                styles.emptyTable
              }
            >
              <FileText
                size={35}
                color="#94a3b8"
              />

              <strong>
                Nenhuma parcela
                encontrada
              </strong>

              <span>
                Quando houver
                parcelas cadastradas,
                elas aparecerão aqui.
              </span>
            </div>
          ) : (
            <>
              <div
                className="installments-list"
                style={
                  styles.installmentsList
                }
              >
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

                    const canAnticipate =
                      isFutureInstallment(
                        installment
                      );

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
                                getRemainingAmount(
                                  installment
                                )
                              )}
                            </strong>
                          </div>
                        </div>

                        {!paid && (
                          <div
                            style={
                              styles.mobileActions
                            }
                          >
                            <button
                              style={
                                styles.mobilePayButton
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
                                size={17}
                              />

                              <span>
                                Pagar PIX
                              </span>
                            </button>

                            {canAnticipate && (
                              <button
                                style={
                                  styles.mobileAnticipateButton
                                }
                                onClick={() =>
                                  openAnticipation(
                                    installment
                                  )
                                }
                              >
                                <Zap
                                  size={17}
                                />

                                <span>
                                  Antecipar
                                </span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }
                )}
              </div>

              <div
                className="desktop-table"
                style={
                  styles.tableWrapper
                }
              >
                <table
                  style={
                    styles.table
                  }
                >
                  <thead>
                    <tr>
                      <th>
                        Parcela
                      </th>

                      <th>
                        Vencimento
                      </th>

                      <th>
                        Valor
                      </th>

                      <th>
                        Situação
                      </th>

                      <th>
                        Ações
                      </th>
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

                        const canAnticipate =
                          isFutureInstallment(
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
                                  getRemainingAmount(
                                    installment
                                  )
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
                                <div
                                  style={
                                    styles.desktopActions
                                  }
                                >
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

                                  {canAnticipate && (
                                    <button
                                      style={
                                        styles.smallAnticipateButton
                                      }
                                      onClick={() =>
                                        openAnticipation(
                                          installment
                                        )
                                      }
                                    >
                                      <Zap
                                        size={14}
                                      />

                                      Antecipar
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        {/* =====================================================
            ANTECIPAÇÃO
        ====================================================== */}

        {anticipationOptions.length >
          0 && (
          <section
            className="anticipation-section"
            style={
              styles.anticipationSection
            }
          >
            <div
              style={
                styles.anticipationSectionHeader
              }
            >
              <div>
                <span
                  style={
                    styles.sectionEyebrow
                  }
                >
                  ECONOMIZE
                </span>

                <h2
                  style={
                    styles.anticipationSectionTitle
                  }
                >
                  Antecipe suas
                  parcelas
                </h2>

                <p
                  style={
                    styles.anticipationSectionDescription
                  }
                >
                  O sistema calcula
                  automaticamente um
                  desconto de acordo com
                  quanto tempo falta para
                  o vencimento.
                </p>
              </div>

              <div
                style={
                  styles.percentIcon
                }
              >
                <Percent size={23} />
              </div>
            </div>

            <div
              className="anticipation-grid"
              style={
                styles.anticipationGrid
              }
            >
              {anticipationOptions
                .slice(0, 6)
                .map((item) => (
                  <div
                    key={
                      item.installment
                        .id
                    }
                    style={
                      styles.anticipationCard
                    }
                  >
                    <div
                      style={
                        styles.anticipationCardTop
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

                        <strong>
                          #
                          {
                            item
                              .installment
                              .installment_number
                          }
                        </strong>
                      </div>

                      <span
                        style={
                          styles.discountBadge
                        }
                      >
                        {
                          item.discountPercent
                        }
                        % OFF
                      </span>
                    </div>

                    <div
                      style={
                        styles.anticipationValues
                      }
                    >
                      <div>
                        <span>
                          Valor normal
                        </span>

                        <strong
                          style={
                            styles.strikeValue
                          }
                        >
                          {money(
                            item.originalAmount
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Você paga
                        </span>

                        <strong
                          style={
                            styles.finalAnticipationValue
                          }
                        >
                          {money(
                            item.finalAmount
                          )}
                        </strong>
                      </div>
                    </div>

                    <div
                      style={
                        styles.savingsLine
                      }
                    >
                      <CheckCircle2
                        size={15}
                      />

                      Economia de{" "}
                      <strong>
                        {money(
                          item.discountAmount
                        )}
                      </strong>
                    </div>

                    <div
                      style={
                        styles.anticipationDue
                      }
                    >
                      <CalendarDays
                        size={14}
                      />

                      Vencimento{" "}
                      {dateBR(
                        item
                          .installment
                          .due_date
                      )}
                    </div>

                    <button
                      style={
                        styles.anticipationCardButton
                      }
                      onClick={() =>
                        openAnticipation(
                          item.installment
                        )
                      }
                    >
                      Antecipar agora
                      <ChevronRight
                        size={16}
                      />
                    </button>
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* =====================================================
            PAGAMENTOS / RESUMO
        ====================================================== */}

        <section
          id="pagamentos"
          style={styles.profilePanel}
        >
          <div
            style={styles.profileIcon}
          >
            <ReceiptText size={21} />
          </div>

          <div
            style={{ flex: 1 }}
          >
            <h3
              style={
                styles.profileTitle
              }
            >
              Pagamentos e segurança
            </h3>

            <div
              className="profile-grid"
              style={
                styles.profileGrid
              }
            >
              <div>
                <span>
                  Pagamentos
                </span>

                <strong>
                  {summary.paidCount}{" "}
                  parcela(s) paga(s)
                </strong>
              </div>

              <div>
                <span>
                  E-mail
                </span>

                <strong>
                  {customer?.email ||
                    "-"}
                </strong>
              </div>

              <div>
                <span>
                  Segurança
                </span>

                <strong>
                  Mercado Pago
                </strong>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            DADOS
        ====================================================== */}

        <section
          style={styles.profilePanel}
        >
          <div
            style={styles.profileIcon}
          >
            <User size={21} />
          </div>

          <div
            style={{ flex: 1 }}
          >
            <h3
              style={
                styles.profileTitle
              }
            >
              Seus dados
            </h3>

            <div
              className="profile-grid"
              style={
                styles.profileGrid
              }
            >
              <div>
                <span>
                  Nome
                </span>

                <strong>
                  {customer?.full_name ||
                    "-"}
                </strong>
              </div>

              <div>
                <span>
                  E-mail
                </span>

                <strong>
                  {customer?.email ||
                    "-"}
                </strong>
              </div>

              <div>
                <span>
                  Telefone
                </span>

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

      {/* =====================================================
          FOOTER
      ====================================================== */}

      <footer
        style={styles.footer}
      >
        <ShieldCheck size={15} />

        <span>
          LoanControl • Portal
          seguro do cliente
        </span>
      </footer>

      {/* =====================================================
          MODAL PIX
      ====================================================== */}

      {pixData && (
        <div
          style={styles.pixOverlay}
        >
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

            <div
              style={styles.pixHeader}
            >
              <div
                style={
                  styles.pixHeaderIcon
                }
              >
                <QrCode size={24} />
              </div>

              <div>
                <h2
                  style={styles.pixTitle}
                >
                  Pagar com PIX
                </h2>

                <p
                  style={
                    styles.pixSubtitle
                  }
                >
                  Escaneie o QR Code
                  ou copie o código
                  abaixo.
                </p>
              </div>
            </div>

            <div
              style={
                styles.pixAmountBox
              }
            >
              <div>
                <span>
                  Valor do pagamento
                </span>

                <strong
                  style={{
                    display:
                      "block",
                    marginTop: 3,
                    fontSize: 24,
                  }}
                >
                  {money(
                    pixData.amount
                  )}
                </strong>
              </div>

              <ShieldCheck
                size={24}
                color="#16a34a"
              />
            </div>

            {pixData.qrCodeBase64 ? (
              <div
                style={
                  styles.qrContainer
                }
              >
                <img
                  src={
                    pixData.qrCodeBase64.startsWith(
                      "data:"
                    )
                      ? pixData.qrCodeBase64
                      : `data:image/png;base64,${pixData.qrCodeBase64}`
                  }
                  alt="QR Code PIX"
                  style={
                    styles.qrImage
                  }
                />
              </div>
            ) : (
              <div
                style={
                  styles.qrFallback
                }
              >
                <QrCode size={80} />

                <span>
                  Use o Pix Copia
                  e Cola abaixo.
                </span>
              </div>
            )}

            {pixData.qrCode && (
              <div
                style={styles.copySection}
              >
                <label
                  style={
                    styles.copyLabel
                  }
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
                    value={
                      pixData.qrCode
                    }
                    style={
                      styles.copyInput
                    }
                    onFocus={(
                      event
                    ) =>
                      event.currentTarget.select()
                    }
                  />

                  <button
                    onClick={
                      copyPix
                    }
                    style={
                      styles.copyButton
                    }
                  >
                    {pixCopied ? (
                      <CheckCircle2
                        size={18}
                      />
                    ) : (
                      <Copy
                        size={18}
                      />
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

            <div
              style={
                styles.pixInstructions
              }
            >
              <div>
                <Smartphone
                  size={17}
                />

                <span>
                  Abra o aplicativo
                  do seu banco.
                </span>
              </div>

              <div>
                <QrCode size={17} />

                <span>
                  Escaneie o QR Code
                  ou use Pix Copia
                  e Cola.
                </span>
              </div>

              <div>
                <CheckCircle2
                  size={17}
                />

                <span>
                  Após o pagamento,
                  a confirmação será
                  automática.
                </span>
              </div>
            </div>

            <button
              onClick={
                checkPayment
              }
              disabled={
                checkingPayment
              }
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
                <CheckCircle2
                  size={17}
                />
              )}

              {checkingPayment
                ? "Verificando pagamento..."
                : "Já fiz o pagamento"}
            </button>

            {pixData.ticketUrl && (
              <a
                href={
                  pixData.ticketUrl
                }
                target="_blank"
                rel="noopener noreferrer"
                style={
                  styles.ticketLink
                }
              >
                Abrir página de
                pagamento
                <ChevronRight
                  size={15}
                />
              </a>
            )}

            <div
              style={
                styles.securePix
              }
            >
              <ShieldCheck
                size={15}
              />

              <span>
                Pagamento processado
                com segurança pelo
                Mercado Pago.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          MODAL ANTECIPAÇÃO
      ====================================================== */}

      {anticipation && (
        <div
          style={
            styles.pixOverlay
          }
        >
          <div
            className="anticipation-modal"
            style={
              styles.anticipationModal
            }
          >
            <button
              onClick={
                closeAnticipation
              }
              style={
                styles.pixClose
              }
              disabled={
                anticipationLoading
              }
              aria-label="Fechar"
            >
              <X size={20} />
            </button>

            <div
              style={
                styles.modalSuccessIcon
              }
            >
              <Zap size={27} />
            </div>

            <div
              style={
                styles.modalCenter
              }
            >
              <span
                style={
                  styles.modalEyebrow
                }
              >
                DESCONTO POR ANTECIPAÇÃO
              </span>

              <h2
                style={
                  styles.modalTitle
                }
              >
                Antecipe a parcela #
                {
                  anticipation
                    .installment
                    .installment_number
                }
              </h2>

              <p
                style={
                  styles.modalDescription
                }
              >
                Quanto antes você
                pagar, maior pode ser
                o benefício aplicado
                automaticamente dentro
                da regra da empresa.
              </p>
            </div>

            <div
              style={
                styles.anticipationCalculation
              }
            >
              <div
                style={
                  styles.calculationRow
                }
              >
                <span>
                  Valor normal
                </span>

                <strong
                  style={
                    styles.originalPrice
                  }
                >
                  {money(
                    anticipation.originalAmount
                  )}
                </strong>
              </div>

              <div
                style={
                  styles.calculationRow
                }
              >
                <span>
                  Desconto (
                  {
                    anticipation.discountPercent
                  }
                  %)
                </span>

                <strong
                  style={
                    styles.discountPrice
                  }
                >
                  -{" "}
                  {money(
                    anticipation.discountAmount
                  )}
                </strong>
              </div>

              <div
                style={
                  styles.calculationDivider
                }
              />

              <div
                style={
                  styles.calculationFinal
                }
              >
                <div>
                  <span>
                    Você paga hoje
                  </span>

                  <small>
                    Economia de{" "}
                    {money(
                      anticipation.discountAmount
                    )}
                  </small>
                </div>

                <strong>
                  {money(
                    anticipation.finalAmount
                  )}
                </strong>
              </div>
            </div>

            <div
              style={
                styles.modalInfoBox
              }
            >
              <CheckCircle2
                size={18}
              />

              <div>
                <strong>
                  Pagamento via PIX
                </strong>

                <span>
                  O QR Code será gerado
                  pelo valor já com o
                  desconto.
                </span>
              </div>
            </div>

            <button
              onClick={
                confirmAnticipation
              }
              disabled={
                anticipationLoading
              }
              style={
                styles.confirmAnticipationButton
              }
            >
              {anticipationLoading ? (
                <Loader2
                  size={19}
                  className="loancontrol-spin"
                />
              ) : (
                <QrCode size={19} />
              )}

              {anticipationLoading
                ? "Gerando PIX..."
                : `Pagar ${money(
                    anticipation.finalAmount
                  )} via PIX`}
            </button>

            <button
              onClick={
                closeAnticipation
              }
              disabled={
                anticipationLoading
              }
              style={
                styles.cancelAnticipationButton
              }
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* =====================================================
          ERRO
      ====================================================== */}

      {pixError && !pixData && (
        <div
          style={
            styles.toastError
          }
        >
          <AlertCircle
            size={18}
          />

          <span>{pixError}</span>

          <button
            onClick={() =>
              setPixError("")
            }
            style={
              styles.toastClose
            }
          >
            <X size={16} />
          </button>
        </div>
      )}

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        button,
        input {
          font-family: inherit;
        }

        button:not(:disabled) {
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            background 0.2s ease,
            border-color 0.2s ease;
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

        .mobile-menu-button {
          display: none !important;
        }

        .mobile-menu {
          display: none !important;
        }

        .installments-list {
          display: none;
        }

        @media (max-width: 1100px) {
          .desktop-nav {
            gap: 2px !important;
          }

          .desktop-nav button {
            padding-left: 8px !important;
            padding-right: 8px !important;
          }
        }

        @media (max-width: 950px) {
          .desktop-nav {
            display: none !important;
          }

          .mobile-menu-button {
            display: flex !important;
          }

          .desktop-help {
            display: none !important;
          }

          .desktop-logout {
            display: none !important;
          }

          .main-grid {
            grid-template-columns: 1fr !important;
          }

          .anticipation-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr))
              !important;
          }
        }

        @media (max-width: 700px) {
          .header-inner {
            padding: 12px 15px !important;
          }

          .content {
            padding:
              22px 13px 38px
              !important;
          }

          .brand {
            font-size: 16px !important;
          }

          .portal-label {
            font-size: 10px !important;
          }

          .logo {
            width: 39px !important;
            height: 39px !important;
          }

          .user-mini-text {
            display: none !important;
          }

          .mobile-menu {
            display: flex !important;
          }

          .welcome {
            flex-direction: column !important;
            gap: 14px !important;
            margin-bottom: 20px !important;
          }

          .welcome h1 {
            font-size: 27px !important;
          }

          .welcome p {
            font-size: 13px !important;
          }

          .account-badge {
            align-self: flex-start;
          }

          .stats-grid {
            grid-template-columns:
              1fr 1fr !important;
            gap: 9px !important;
          }

          .stat-card {
            padding: 13px !important;
            min-width: 0 !important;
          }

          .stat-card strong {
            font-size: 19px !important;
          }

          .stat-label {
            font-size: 9.5px !important;
          }

          .stat-icon {
            width: 37px !important;
            height: 37px !important;
          }

          .panel {
            border-radius: 15px !important;
            margin-bottom: 12px !important;
          }

          .panel-header {
            padding: 15px !important;
          }

          .panel-title {
            font-size: 14px !important;
          }

          .next-payment {
            padding: 15px !important;
          }

          .next-amount {
            font-size: 24px !important;
          }

          .next-payment-info {
            grid-template-columns:
              1fr !important;
          }

          .desktop-table {
            display: none !important;
          }

          .installments-list {
            display: block !important;
          }

          .anticipation-banner {
            flex-direction: column !important;
            align-items: stretch !important;
          }

          .anticipation-button {
            width: 100% !important;
            justify-content: center !important;
          }

          .anticipation-grid {
            grid-template-columns:
              1fr !important;
          }

          .profile-grid {
            grid-template-columns:
              1fr !important;
            gap: 13px !important;
          }

          .profile-panel {
            padding: 16px !important;
          }

          .pix-modal,
          .anticipation-modal {
            width:
              calc(100% - 20px)
              !important;
            max-height:
              calc(100vh - 20px)
              !important;
            overflow-y: auto !important;
            border-radius: 21px !important;
            padding: 20px !important;
          }

          .pix-title {
            font-size: 20px !important;
          }

          .qr-image {
            width: 190px !important;
            height: 190px !important;
          }

          .anticipation-section {
            padding: 16px !important;
          }

          .anticipationSectionTitle {
            font-size: 21px !important;
          }
        }

        @media (max-width: 500px) {
          .stats-grid {
            grid-template-columns:
              1fr 1fr !important;
          }

          .stat-card {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 8px !important;
          }

          .main-grid {
            gap: 0 !important;
          }

          .financeRows {
            padding-left: 15px !important;
            padding-right: 15px !important;
          }

          .mobile-actions {
            display: grid !important;
            grid-template-columns:
              1fr 1fr !important;
          }

          .pix-modal {
            padding: 18px !important;
          }

          .pix-title {
            font-size: 19px !important;
          }

          .qr-container {
            width: 210px !important;
            height: 210px !important;
          }

          .qr-image {
            width: 185px !important;
            height: 185px !important;
          }

          .copy-input {
            font-size: 9px !important;
          }

          .copy-button {
            padding:
              0 10px
              !important;
          }
        }

        @media (max-width: 360px) {
          .stats-grid {
            grid-template-columns:
              1fr !important;
          }

          .welcome h1 {
            font-size: 24px !important;
          }

          .mobile-actions {
            grid-template-columns:
              1fr !important;
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
    background:
      "linear-gradient(180deg,#f8fafc 0%,#f1f5f9 100%)",
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
    background:
      "rgba(255,255,255,.96)",
    borderBottom:
      "1px solid #e2e8f0",
    position: "sticky",
    top: 0,
    zIndex: 50,
    backdropFilter: "blur(14px)",
  },

  headerInner: {
    maxWidth: 1280,
    margin: "0 auto",
    minHeight: 70,
    padding: "12px 24px",
    display: "flex",
    alignItems: "center",
    gap: 20,
  },

  brandArea: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexShrink: 0,
  },

  logo: {
    width: 42,
    height: 42,
    borderRadius: 13,
    background:
      "linear-gradient(135deg,#2563eb,#1d4ed8)",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    boxShadow:
      "0 7px 18px rgba(37,99,235,.20)",
  },

  brand: {
    fontWeight: 850,
    fontSize: 17,
    letterSpacing: "-.3px",
  },

  portalLabel: {
    fontSize: 10.5,
    color: "#64748b",
    marginTop: 1,
  },

  desktopNav: {
    display: "flex",
    alignItems: "center",
    gap: 3,
    marginLeft: 20,
    flex: 1,
  },

  navButton: {
    height: 38,
    border: "none",
    background: "transparent",
    color: "#64748b",
    borderRadius: 9,
    padding: "0 10px",
    display: "flex",
    alignItems: "center",
    gap: 6,
    cursor: "pointer",
    fontSize: 11.5,
    fontWeight: 700,
  },

  navButtonActive: {
    height: 38,
    border:
      "1px solid #dbeafe",
    background: "#eff6ff",
    color: "#1d4ed8",
    borderRadius: 9,
    padding: "0 10px",
    display: "flex",
    alignItems: "center",
    gap: 6,
    cursor: "pointer",
    fontSize: 11.5,
    fontWeight: 750,
  },

  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginLeft: "auto",
  },

  iconHeaderButton: {
    width: 37,
    height: 37,
    borderRadius: 9,
    border:
      "1px solid #e2e8f0",
    background: "#ffffff",
    color: "#64748b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },

  userMini: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    paddingRight: 3,
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
    height: 37,
    padding: "0 11px",
    border:
      "1px solid #e2e8f0",
    borderRadius: 9,
    background: "#ffffff",
    color: "#475569",
    display: "flex",
    alignItems: "center",
    gap: 6,
    cursor: "pointer",
    fontSize: 11.5,
    fontWeight: 700,
  },

  mobileMenuButton: {
    width: 39,
    height: 39,
    border:
      "1px solid #dbe3ed",
    borderRadius: 10,
    background: "#ffffff",
    color: "#334155",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },

  mobileMenu: {
    maxWidth: 1280,
    margin: "0 auto",
    padding: "8px 13px 13px",
    flexDirection: "column",
    gap: 4,
    borderTop:
      "1px solid #f1f5f9",
  },

  mobileMenuItem: {
    width: "100%",
    minHeight: 46,
    border: "none",
    borderRadius: 10,
    background: "#f8fafc",
    color: "#334155",
    display: "flex",
    alignItems: "center",
    gap: 11,
    padding: "0 13px",
    cursor: "pointer",
    textAlign: "left",
    fontSize: 13,
    fontWeight: 700,
  },

  mobileLogoutItem: {
    width: "100%",
    minHeight: 46,
    border:
      "1px solid #fee2e2",
    borderRadius: 10,
    background: "#fff7f7",
    color: "#b91c1c",
    display: "flex",
    alignItems: "center",
    gap: 11,
    padding: "0 13px",
    cursor: "pointer",
    textAlign: "left",
    fontSize: 13,
    fontWeight: 700,
    marginTop: 4,
  },

  content: {
    maxWidth: 1280,
    margin: "0 auto",
    padding: "32px 24px 50px",
  },

  welcome: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 20,
    marginBottom: 25,
  },

  eyebrow: {
    fontSize: 9.5,
    fontWeight: 850,
    color: "#2563eb",
    letterSpacing: "1.1px",
    marginBottom: 7,
  },

  welcomeTitle: {
    margin: 0,
    fontSize: 30,
    fontWeight: 850,
    letterSpacing: "-.7px",
  },

  welcomeText: {
    margin: "7px 0 0",
    color: "#64748b",
    fontSize: 13.5,
    lineHeight: 1.6,
    maxWidth: 650,
  },

  accountBadge: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    padding: "9px 12px",
    borderRadius: 10,
    background: "#f0fdf4",
    color: "#15803d",
    fontSize: 11.5,
    fontWeight: 750,
    border:
      "1px solid #bbf7d0",
    flexShrink: 0,
  },

  warning: {
    marginBottom: 18,
    padding: "12px 15px",
    background: "#fffbeb",
    color: "#92400e",
    border:
      "1px solid #fde68a",
    borderRadius: 11,
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12.5,
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(4,minmax(0,1fr))",
    gap: 13,
    marginBottom: 16,
  },

  statCard: {
    background: "#ffffff",
    border:
      "1px solid #e2e8f0",
    borderRadius: 15,
    padding: 17,
    display: "flex",
    alignItems: "center",
    gap: 12,
    boxShadow:
      "0 5px 18px rgba(15,23,42,.035)",
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
    fontSize: 10.5,
    color: "#64748b",
    marginBottom: 4,
  },

  statValue: {
    display: "block",
    fontSize: 21,
    fontWeight: 850,
  },

  moneyValue: {
    display: "block",
    fontSize: 16.5,
    fontWeight: 850,
    whiteSpace: "nowrap",
  },

  anticipationBanner: {
    background:
      "linear-gradient(135deg,#0f172a,#172554)",
    color: "#ffffff",
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    display: "flex",
    alignItems: "center",
    gap: 16,
    boxShadow:
      "0 12px 30px rgba(15,23,42,.14)",
  },

  anticipationIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    background:
      "rgba(255,255,255,.10)",
    color: "#facc15",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  anticipationContent: {
    flex: 1,
  },

  anticipationEyebrow: {
    fontSize: 9,
    fontWeight: 850,
    letterSpacing: "1px",
    color: "#93c5fd",
  },

  anticipationTitle: {
    margin: "4px 0 3px",
    fontSize: 18,
    fontWeight: 850,
  },

  anticipationText: {
    margin: 0,
    color: "#cbd5e1",
    fontSize: 11.5,
    lineHeight: 1.5,
  },

  anticipationButton: {
    minHeight: 42,
    padding: "0 15px",
    border: "none",
    borderRadius: 10,
    background: "#ffffff",
    color: "#172554",
    display: "flex",
    alignItems: "center",
    gap: 7,
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 11.5,
    flexShrink: 0,
  },

  mainGrid: {
    display: "grid",
    gridTemplateColumns:
      "1.15fr .85fr",
    gap: 16,
  },

  panel: {
    background: "#ffffff",
    border:
      "1px solid #e2e8f0",
    borderRadius: 17,
    overflow: "hidden",
    boxShadow:
      "0 5px 18px rgba(15,23,42,.035)",
    marginBottom: 16,
  },

  panelHeader: {
    padding: "18px 20px",
    borderBottom:
      "1px solid #f1f5f9",
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
    fontSize: 11,
    color: "#64748b",
    lineHeight: 1.5,
  },

  nextPayment: {
    padding: 20,
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
    gridTemplateColumns:
      "1fr 1fr",
    gap: 12,
    borderTop:
      "1px solid #f1f5f9",
    borderBottom:
      "1px solid #f1f5f9",
    marginTop: 19,
    padding: "14px 0",
  },

  pixButton: {
    width: "100%",
    minHeight: 46,
    marginTop: 15,
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
    fontWeight: 800,
    fontSize: 12.5,
    boxShadow:
      "0 8px 18px rgba(37,99,235,.20)",
  },

  anticipateSecondary: {
    width: "100%",
    minHeight: 42,
    marginTop: 8,
    border:
      "1px solid #bbf7d0",
    borderRadius: 10,
    background: "#f0fdf4",
    color: "#15803d",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 11.5,
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
    padding: "7px 20px 14px",
  },

  financeRow: {
    minHeight: 56,
    borderBottom:
      "1px solid #f1f5f9",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 15,
    fontSize: 12.5,
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
    fontSize: 11.5,
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

  desktopActions: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },

  smallPayButton: {
    border:
      "1px solid #bfdbfe",
    background: "#eff6ff",
    color: "#1d4ed8",
    borderRadius: 8,
    padding: "7px 9px",
    cursor: "pointer",
    fontSize: 10,
    fontWeight: 750,
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
  },

  smallAnticipateButton: {
    border:
      "1px solid #bbf7d0",
    background: "#f0fdf4",
    color: "#15803d",
    borderRadius: 8,
    padding: "7px 9px",
    cursor: "pointer",
    fontSize: 10,
    fontWeight: 750,
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
  },

  installmentsList: {
    padding: 12,
  },

  installmentMobileCard: {
    border:
      "1px solid #e2e8f0",
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
    gridTemplateColumns:
      "1fr 1fr",
    gap: 15,
    marginTop: 14,
    paddingTop: 13,
    borderTop:
      "1px solid #f1f5f9",
  },

  mobileActions: {
    display: "grid",
    gridTemplateColumns:
      "1fr 1fr",
    gap: 7,
    marginTop: 13,
  },

  mobilePayButton: {
    width: "100%",
    minHeight: 42,
    border: "none",
    borderRadius: 9,
    background: "#2563eb",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    cursor: "pointer",
    fontSize: 11.5,
    fontWeight: 750,
  },

  mobileAnticipateButton: {
    width: "100%",
    minHeight: 42,
    border:
      "1px solid #bbf7d0",
    borderRadius: 9,
    background: "#f0fdf4",
    color: "#15803d",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    cursor: "pointer",
    fontSize: 11.5,
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

  anticipationSection: {
    background: "#ffffff",
    border:
      "1px solid #e2e8f0",
    borderRadius: 17,
    padding: 20,
    marginBottom: 16,
    boxShadow:
      "0 5px 18px rgba(15,23,42,.035)",
  },

  anticipationSectionHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 15,
    marginBottom: 17,
  },

  sectionEyebrow: {
    display: "block",
    fontSize: 9,
    fontWeight: 850,
    letterSpacing: "1px",
    color: "#16a34a",
    marginBottom: 4,
  },

  anticipationSectionTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 850,
  },

  anticipationSectionDescription: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: 11.5,
    lineHeight: 1.5,
    maxWidth: 650,
  },

  percentIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: "#f0fdf4",
    color: "#16a34a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  anticipationGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3,minmax(0,1fr))",
    gap: 12,
  },

  anticipationCard: {
    border:
      "1px solid #dcfce7",
    background:
      "linear-gradient(180deg,#ffffff,#f8fff9)",
    borderRadius: 14,
    padding: 15,
  },

  anticipationCardTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  discountBadge: {
    background: "#dcfce7",
    color: "#15803d",
    borderRadius: 20,
    padding: "5px 8px",
    fontSize: 9.5,
    fontWeight: 850,
  },

  anticipationValues: {
    display: "grid",
    gridTemplateColumns:
      "1fr 1fr",
    gap: 10,
    marginTop: 15,
  },

  strikeValue: {
    display: "block",
    marginTop: 4,
    color: "#94a3b8",
    textDecoration:
      "line-through",
    fontSize: 12,
  },

  finalAnticipationValue: {
    display: "block",
    marginTop: 4,
    color: "#15803d",
    fontSize: 17,
    fontWeight: 850,
  },

  savingsLine: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    color: "#15803d",
    background: "#f0fdf4",
    borderRadius: 8,
    padding: "7px 8px",
    marginTop: 12,
    fontSize: 10,
  },

  anticipationDue: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    color: "#64748b",
    fontSize: 10,
    marginTop: 10,
  },

  anticipationCardButton: {
    width: "100%",
    minHeight: 39,
    marginTop: 12,
    border: "none",
    borderRadius: 9,
    background: "#15803d",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 800,
  },

  profilePanel: {
    background: "#ffffff",
    border:
      "1px solid #e2e8f0",
    borderRadius: 17,
    padding: 20,
    display: "flex",
    gap: 15,
    marginBottom: 16,
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
      "repeat(3,minmax(0,1fr))",
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
    maxWidth: 1280,
    margin: "0 auto",
    padding: "0 24px 30px",
    color: "#94a3b8",
    fontSize: 10,
    display: "flex",
    alignItems: "center",
    gap: 6,
  },

  pixOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 100,
    background:
      "rgba(15,23,42,.66)",
    backdropFilter: "blur(6px)",
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
    border:
      "1px solid #e2e8f0",
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
    border:
      "1px solid #e2e8f0",
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
    border:
      "1px solid #e2e8f0",
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
    border:
      "1px solid #cbd5e1",
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
    border:
      "1px solid #bbf7d0",
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
    borderTop:
      "1px solid #f1f5f9",
    color: "#94a3b8",
    fontSize: 9.5,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    textAlign: "center",
  },

  anticipationModal: {
    position: "relative",
    width: "100%",
    maxWidth: 470,
    background: "#ffffff",
    borderRadius: 24,
    padding: 27,
    boxShadow:
      "0 30px 80px rgba(15,23,42,.28)",
  },

  modalSuccessIcon: {
    width: 58,
    height: 58,
    borderRadius: 17,
    background: "#f0fdf4",
    color: "#16a34a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 15px",
  },

  modalCenter: {
    textAlign: "center",
  },

  modalEyebrow: {
    fontSize: 9,
    fontWeight: 850,
    letterSpacing: "1px",
    color: "#16a34a",
  },

  modalTitle: {
    margin: "6px 25px 0",
    fontSize: 22,
    fontWeight: 850,
    letterSpacing: "-.3px",
  },

  modalDescription: {
    margin: "8px auto 0",
    maxWidth: 390,
    color: "#64748b",
    fontSize: 11.5,
    lineHeight: 1.55,
  },

  anticipationCalculation: {
    marginTop: 20,
    padding: 16,
    borderRadius: 15,
    background: "#f8fafc",
    border:
      "1px solid #e2e8f0",
  },

  calculationRow: {
    minHeight: 36,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 15,
    fontSize: 12,
    color: "#64748b",
  },

  originalPrice: {
    color: "#64748b",
    textDecoration:
      "line-through",
  },

  discountPrice: {
    color: "#16a34a",
    fontWeight: 800,
  },

  calculationDivider: {
    height: 1,
    background: "#e2e8f0",
    margin: "7px 0",
  },

  calculationFinal: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 15,
    paddingTop: 3,
  },




  modalInfoBox: {
    marginTop: 13,
    padding: 12,
    borderRadius: 11,
    background: "#eff6ff",
    color: "#1d4ed8",
    display: "flex",
    alignItems: "flex-start",
    gap: 9,
    fontSize: 11,
  },

  confirmAnticipationButton: {
    width: "100%",
    minHeight: 47,
    marginTop: 15,
    border: "none",
    borderRadius: 11,
    background:
      "linear-gradient(135deg,#16a34a,#15803d)",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    cursor: "pointer",
    fontWeight: 850,
    fontSize: 12.5,
    boxShadow:
      "0 8px 18px rgba(22,163,74,.18)",
  },

  cancelAnticipationButton: {
    width: "100%",
    minHeight: 40,
    marginTop: 7,
    border:
      "1px solid #e2e8f0",
    borderRadius: 10,
    background: "#ffffff",
    color: "#64748b",
    cursor: "pointer",
    fontSize: 11.5,
    fontWeight: 700,
  },

  toastError: {
    position: "fixed",
    right: 20,
    bottom: 20,
    zIndex: 200,
    maxWidth: 390,
    background: "#ffffff",
    color: "#991b1b",
    border:
      "1px solid #fecaca",
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