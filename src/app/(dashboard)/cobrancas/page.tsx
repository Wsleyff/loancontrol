"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  MessageCircle,
  RefreshCw,
  Search,
  UserRound,
  Wallet,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { PageTitle } from "@/components/ui/PageTitle";

type Installment = {
  id: string;
  loan_id: string;
  company_id: string;
  installment_number: number;
  due_date: string;
  principal_amount: number;
  interest_amount: number;
  amount: number;
  paid_amount: number;
  discount_amount: number;
  late_fee_amount: number;
  remaining_amount: number;
  status: string;
  paid_at: string | null;
};

type Loan = {
  id: string;
  customer_id: string;
};

type Customer = {
  id: string;
  full_name: string;
  cpf: string | null;
  phone: string | null;
  whatsapp: string | null;
};

type FilterType =
  | "all"
  | "overdue"
  | "today"
  | "upcoming";

type CollectionRow = {
  installment: Installment;
  loan: Loan | null;
  customer: Customer | null;
  situation: "overdue" | "today" | "upcoming";
  days: number;
};

function money(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function startOfDay(date: Date) {
  const result = new Date(date);

  result.setHours(0, 0, 0, 0);

  return result;
}

function parseDueDate(value: string) {
  return startOfDay(new Date(`${value}T12:00:00`));
}

function differenceInDays(
  date1: Date,
  date2: Date
) {
  const oneDay = 1000 * 60 * 60 * 24;

  return Math.round(
    (startOfDay(date1).getTime() -
      startOfDay(date2).getTime()) /
      oneDay
  );
}

function normalizePhone(phone: string | null) {
  if (!phone) {
    return "";
  }

  return phone.replace(/\D/g, "");
}

function getWhatsAppUrl(
  customer: Customer | null
) {
  if (!customer) {
    return null;
  }

  const phone =
    normalizePhone(customer.whatsapp) ||
    normalizePhone(customer.phone);

  if (!phone) {
    return null;
  }

  let finalPhone = phone;

  if (finalPhone.length === 10 || finalPhone.length === 11) {
    finalPhone = `55${finalPhone}`;
  }

  return `https://wa.me/${finalPhone}`;
}

function getGreetingMessage(
  row: CollectionRow
) {
  const customerName =
    row.customer?.full_name || "cliente";

  const installmentNumber =
    row.installment.installment_number;

  const amount =
    row.installment.remaining_amount;

  const value = money(amount);

  if (row.situation === "overdue") {
    return encodeURIComponent(
      `Olá, ${customerName}! Tudo bem? Identificamos que a parcela ${installmentNumber} do seu empréstimo, no valor de ${value}, está em aberto. Podemos verificar uma forma de regularização?`
    );
  }

  if (row.situation === "today") {
    return encodeURIComponent(
      `Olá, ${customerName}! Tudo bem? Passando para lembrar que a parcela ${installmentNumber} do seu empréstimo, no valor de ${value}, vence hoje.`
    );
  }

  return encodeURIComponent(
    `Olá, ${customerName}! Tudo bem? Estamos entrando em contato para lembrar da próxima parcela ${installmentNumber} do seu empréstimo, no valor de ${value}, com vencimento em ${formatDate(
      row.installment.due_date
    )}.`
  );
}

function situationLabel(
  situation: CollectionRow["situation"]
) {
  if (situation === "overdue") {
    return "Atrasada";
  }

  if (situation === "today") {
    return "Vence hoje";
  }

  return "Próxima";
}

function situationClass(
  situation: CollectionRow["situation"]
) {
  if (situation === "overdue") {
    return "danger";
  }

  if (situation === "today") {
    return "warning";
  }

  return "normal";
}

function getErrorMessage(error: unknown) {
  if (!error) {
    return "Erro desconhecido.";
  }

  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object") {
    const err = error as Record<string, unknown>;

    const message =
      err.message ||
      err.error_description ||
      err.details ||
      err.hint ||
      err.code;

    if (
      typeof message === "string" &&
      message.trim()
    ) {
      return message;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return "Erro desconhecido ao carregar as cobranças.";
    }
  }

  return "Não foi possível carregar as cobranças.";
}

export default function CobrancasPage() {
  const [installments, setInstallments] =
    useState<Installment[]>([]);

  const [loans, setLoans] =
    useState<Loan[]>([]);

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState<FilterType>("all");

  async function carregarDados() {
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();

      if (!supabase) {
        throw new Error(
          "Supabase não configurado. Verifique o arquivo .env.local."
        );
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error(
          "Usuário não autenticado. Faça login novamente."
        );
      }

      /*
       * ======================================================
       * EMPRESA DO USUÁRIO
       * ======================================================
       */

      const {
        data: membership,
        error: membershipError,
      } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", user.id)
        .eq("status", "ACTIVE")
        .limit(1)
        .maybeSingle();

      if (membershipError) {
        throw membershipError;
      }

      if (!membership?.company_id) {
        throw new Error(
          "Nenhuma empresa ativa foi encontrada para este usuário."
        );
      }

      const companyId =
        membership.company_id;

      /*
       * ======================================================
       * PARCELAS
       * ======================================================
       */

      const installmentsResponse =
        await supabase
          .from("loan_installments")
          .select(
            `
              id,
              loan_id,
              company_id,
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
          .neq("status", "PAID")
          .neq("status", "CANCELLED")
          .order("due_date", {
            ascending: true,
          });

      if (installmentsResponse.error) {
        throw installmentsResponse.error;
      }

      /*
       * ======================================================
       * EMPRÉSTIMOS
       * ======================================================
       */

      const loansResponse =
        await supabase
          .from("loans")
          .select(
            `
              id,
              customer_id
            `
          )
          .eq("company_id", companyId);

      if (loansResponse.error) {
        throw loansResponse.error;
      }

      /*
       * ======================================================
       * CLIENTES
       * ======================================================
       */

      const customersResponse =
        await supabase
          .from("customers")
          .select(
            `
              id,
              full_name,
              cpf,
              phone,
              whatsapp
            `
          )
          .eq("company_id", companyId);

      if (customersResponse.error) {
        throw customersResponse.error;
      }

      setInstallments(
        (installmentsResponse.data ||
          []) as Installment[]
      );

      setLoans(
        (loansResponse.data ||
          []) as Loan[]
      );

      setCustomers(
        (customersResponse.data ||
          []) as Customer[]
      );
    } catch (err) {
      console.error(
        "[COBRANCAS] Erro:",
        err
      );

      setError(
        getErrorMessage(err)
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  /*
   * ========================================================
   * MAPAS
   * ========================================================
   */

  const loanMap = useMemo(() => {
    return new Map(
      loans.map((loan) => [
        loan.id,
        loan,
      ])
    );
  }, [loans]);

  const customerMap = useMemo(() => {
    return new Map(
      customers.map((customer) => [
        customer.id,
        customer,
      ])
    );
  }, [customers]);

  /*
   * ========================================================
   * COBRANÇAS
   * ========================================================
   */

  const collectionRows = useMemo(() => {
    const today = startOfDay(
      new Date()
    );

    return installments
      .map((installment) => {
        const loan =
          loanMap.get(
            installment.loan_id
          ) || null;

        const customer = loan
          ? customerMap.get(
              loan.customer_id
            ) || null
          : null;

        const dueDate =
          parseDueDate(
            installment.due_date
          );

        const days =
          differenceInDays(
            today,
            dueDate
          );

        let situation:
          | "overdue"
          | "today"
          | "upcoming";

        if (days > 0) {
          situation = "overdue";
        } else if (days === 0) {
          situation = "today";
        } else {
          situation = "upcoming";
        }

        return {
          installment,
          loan,
          customer,
          situation,
          days,
        };
      })
      .sort((a, b) => {
        /*
         * Atrasadas primeiro,
         * depois as de hoje,
         * depois as próximas.
         */

        const priority = {
          overdue: 0,
          today: 1,
          upcoming: 2,
        };

        if (
          priority[a.situation] !==
          priority[b.situation]
        ) {
          return (
            priority[a.situation] -
            priority[b.situation]
          );
        }

        return (
          new Date(
            a.installment.due_date
          ).getTime() -
          new Date(
            b.installment.due_date
          ).getTime()
        );
      });
  }, [
    installments,
    loanMap,
    customerMap,
  ]);

  /*
   * ========================================================
   * ESTATÍSTICAS
   * ========================================================
   */

  const overdueRows = useMemo(
    () =>
      collectionRows.filter(
        (row) =>
          row.situation ===
          "overdue"
      ),
    [collectionRows]
  );

  const todayRows = useMemo(
    () =>
      collectionRows.filter(
        (row) =>
          row.situation ===
          "today"
      ),
    [collectionRows]
  );

  const upcomingRows = useMemo(
    () =>
      collectionRows.filter(
        (row) =>
          row.situation ===
          "upcoming"
      ),
    [collectionRows]
  );

  const overdueAmount = useMemo(
    () =>
      overdueRows.reduce(
        (total, row) =>
          total +
          Number(
            row.installment
              .remaining_amount || 0
          ),
        0
      ),
    [overdueRows]
  );

  const todayAmount = useMemo(
    () =>
      todayRows.reduce(
        (total, row) =>
          total +
          Number(
            row.installment
              .remaining_amount || 0
          ),
        0
      ),
    [todayRows]
  );

  const upcomingAmount = useMemo(
    () =>
      upcomingRows.reduce(
        (total, row) =>
          total +
          Number(
            row.installment
              .remaining_amount || 0
          ),
        0
      ),
    [upcomingRows]
  );

  /*
   * ========================================================
   * FILTRO + BUSCA
   * ========================================================
   */

  const filteredRows = useMemo(() => {
    const text =
      search
        .trim()
        .toLowerCase();

    return collectionRows.filter(
      (row) => {
        const matchesFilter =
          filter === "all" ||
          row.situation === filter;

        if (!matchesFilter) {
          return false;
        }

        if (!text) {
          return true;
        }

        const customerName =
          row.customer?.full_name
            ?.toLowerCase() || "";

        const cpf =
          row.customer?.cpf
            ?.toLowerCase() || "";

        const phone =
          row.customer?.phone
            ?.toLowerCase() || "";

        const whatsapp =
          row.customer?.whatsapp
            ?.toLowerCase() || "";

        const loanId =
          row.loan?.id
            ?.toLowerCase() || "";

        return (
          customerName.includes(
            text
          ) ||
          cpf.includes(text) ||
          phone.includes(text) ||
          whatsapp.includes(text) ||
          loanId.includes(text)
        );
      }
    );
  }, [
    collectionRows,
    search,
    filter,
  ]);

  return (
    <main className="container">
      <PageTitle
        title="Cobranças"
        description="Acompanhe parcelas em atraso e organize os recebimentos da sua carteira."
      />

      <div className="top-actions">
        <button
          type="button"
          className="refresh-button"
          onClick={carregarDados}
          disabled={loading}
        >
          <RefreshCw
            size={17}
            className={
              loading ? "spin" : ""
            }
          />

          Atualizar
        </button>
      </div>

      {error && (
        <div className="error-box">
          <div className="error-title">
            <AlertCircle size={20} />

            <strong>
              Não foi possível carregar as cobranças
            </strong>
          </div>

          <pre>{error}</pre>

          <button
            type="button"
            className="retry-button"
            onClick={carregarDados}
          >
            Tentar novamente
          </button>
        </div>
      )}

      <section className="stats-grid">
        <button
          type="button"
          className={`stat-card ${
            filter === "overdue"
              ? "selected-danger"
              : ""
          }`}
          onClick={() =>
            setFilter(
              filter === "overdue"
                ? "all"
                : "overdue"
            )
          }
        >
          <div className="stat-icon danger-icon">
            <AlertCircle size={21} />
          </div>

          <div className="stat-content">
            <span>Em atraso</span>

            <strong>
              {loading
                ? "..."
                : overdueRows.length}
            </strong>

            <small>
              {money(overdueAmount)}
            </small>
          </div>
        </button>

        <button
          type="button"
          className={`stat-card ${
            filter === "today"
              ? "selected-warning"
              : ""
          }`}
          onClick={() =>
            setFilter(
              filter === "today"
                ? "all"
                : "today"
            )
          }
        >
          <div className="stat-icon warning-icon">
            <Clock size={21} />
          </div>

          <div className="stat-content">
            <span>Vencem hoje</span>

            <strong>
              {loading
                ? "..."
                : todayRows.length}
            </strong>

            <small>
              {money(todayAmount)}
            </small>
          </div>
        </button>

        <button
          type="button"
          className={`stat-card ${
            filter === "upcoming"
              ? "selected-normal"
              : ""
          }`}
          onClick={() =>
            setFilter(
              filter === "upcoming"
                ? "all"
                : "upcoming"
            )
          }
        >
          <div className="stat-icon normal-icon">
            <Calendar size={21} />
          </div>

          <div className="stat-content">
            <span>Próximas</span>

            <strong>
              {loading
                ? "..."
                : upcomingRows.length}
            </strong>

            <small>
              {money(upcomingAmount)}
            </small>
          </div>
        </button>

        <div className="stat-card">
          <div className="stat-icon total-icon">
            <Wallet size={21} />
          </div>

          <div className="stat-content">
            <span>Total em aberto</span>

            <strong>
              {loading
                ? "..."
                : collectionRows.length}
            </strong>

            <small>
              {money(
                overdueAmount +
                  todayAmount +
                  upcomingAmount
              )}
            </small>
          </div>
        </div>
      </section>

      <section className="priority-banner">
        <div className="priority-icon">
          <AlertCircle size={23} />
        </div>

        <div className="priority-content">
          <strong>
            {overdueRows.length > 0
              ? `${overdueRows.length} ${
                  overdueRows.length ===
                  1
                    ? "parcela precisa"
                    : "parcelas precisam"
                } de atenção`
              : "Carteira sem parcelas atrasadas"}
          </strong>

          <span>
            {overdueRows.length > 0
              ? `Existem ${money(
                  overdueAmount
                )} em valores atrasados para cobrança.`
              : "Continue acompanhando os próximos vencimentos."}
          </span>
        </div>

        {overdueRows.length > 0 && (
          <button
            type="button"
            onClick={() =>
              setFilter("overdue")
            }
            className="priority-button"
          >
            Ver atrasadas
            <ArrowRight size={16} />
          </button>
        )}
      </section>

      <section className="card filters-card">
        <div className="search-box">
          <Search size={18} />

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Buscar por cliente, CPF ou empréstimo..."
          />
        </div>

        <div className="filter-buttons">
          <button
            type="button"
            className={
              filter === "all"
                ? "filter-active"
                : ""
            }
            onClick={() =>
              setFilter("all")
            }
          >
            Todas
          </button>

          <button
            type="button"
            className={
              filter === "overdue"
                ? "filter-active-danger"
                : ""
            }
            onClick={() =>
              setFilter("overdue")
            }
          >
            Atrasadas
          </button>

          <button
            type="button"
            className={
              filter === "today"
                ? "filter-active-warning"
                : ""
            }
            onClick={() =>
              setFilter("today")
            }
          >
            Hoje
          </button>

          <button
            type="button"
            className={
              filter === "upcoming"
                ? "filter-active-normal"
                : ""
            }
            onClick={() =>
              setFilter("upcoming")
            }
          >
            Próximas
          </button>
        </div>
      </section>

      <section className="card table-card">
        <div className="table-header">
          <div>
            <h2>
              Central de cobranças
            </h2>

            <p>
              {loading
                ? "Carregando..."
                : `${filteredRows.length} ${
                    filteredRows.length ===
                    1
                      ? "registro"
                      : "registros"
                  } encontrado${
                    filteredRows.length ===
                    1
                      ? ""
                      : "s"
                  }`}
            </p>
          </div>

          {filter !== "all" && (
            <button
              type="button"
              className="clear-filter"
              onClick={() =>
                setFilter("all")
              }
            >
              Limpar filtro
            </button>
          )}
        </div>

        {loading ? (
          <div className="empty-state">
            <Loader2
              size={34}
              className="spin"
            />

            <strong>
              Carregando cobranças...
            </strong>

            <span>
              Consultando parcelas da sua carteira.
            </span>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="empty-state">
            <CheckCircle2
              size={40}
            />

            <strong>
              Nenhuma cobrança encontrada
            </strong>

            <span>
              Não existem parcelas correspondentes
              aos filtros selecionados.
            </span>

            {(search ||
              filter !== "all") && (
              <button
                type="button"
                className="clear-empty"
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                }}
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="collection-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Parcela</th>
                  <th>Vencimento</th>
                  <th>Situação</th>
                  <th>Em aberto</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.map(
                  (row) => {
                    const whatsappUrl =
                      getWhatsAppUrl(
                        row.customer
                      );

                    const situation =
                      situationClass(
                        row.situation
                      );

                    return (
                      <tr
                        key={
                          row.installment.id
                        }
                      >
                        <td>
                          <div className="customer-cell">
                            <div className="avatar">
                              {(row
                                .customer
                                ?.full_name ||
                                "C")
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div className="customer-info">
                              <strong>
                                {row
                                  .customer
                                  ?.full_name ||
                                  "Cliente não identificado"}
                              </strong>

                              <span>
                                {row.customer
                                  ?.cpf ||
                                  "CPF não informado"}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="installment-info">
                            <strong>
                              Parcela{" "}
                              {
                                row
                                  .installment
                                  .installment_number
                              }
                            </strong>

                            {row.loan && (
                              <span>
                                Empréstimo #
                                {row.loan.id.slice(
                                  0,
                                  8
                                )}
                              </span>
                            )}
                          </div>
                        </td>

                        <td>
                          <div className="date-info">
                            <Calendar
                              size={16}
                            />

                            <span>
                              {formatDate(
                                row
                                  .installment
                                  .due_date
                              )}
                            </span>
                          </div>
                        </td>

                        <td>
                          <span
                            className={`status-badge ${situation}`}
                          >
                            {row.situation ===
                              "overdue" && (
                              <AlertCircle
                                size={14}
                              />
                            )}

                            {row.situation ===
                              "today" && (
                              <Clock
                                size={14}
                              />
                            )}

                            {row.situation ===
                              "upcoming" && (
                              <Calendar
                                size={14}
                              />
                            )}

                            {situationLabel(
                              row.situation
                            )}
                          </span>

                          {row.situation ===
                            "overdue" && (
                            <small className="days-late">
                              {row.days}{" "}
                              {row.days ===
                              1
                                ? "dia"
                                : "dias"}{" "}
                              em atraso
                            </small>
                          )}
                        </td>

                        <td>
                          <strong className="amount-open">
                            {money(
                              Number(
                                row
                                  .installment
                                  .remaining_amount ||
                                  0
                              )
                            )}
                          </strong>
                        </td>

                        <td>
                          <div className="action-buttons">
                            {whatsappUrl && (
                              <a
                                href={`${whatsappUrl}?text=${getGreetingMessage(
                                  row
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="whatsapp-button"
                                title="Cobrar pelo WhatsApp"
                              >
                                <MessageCircle
                                  size={16}
                                />

                                WhatsApp
                              </a>
                            )}

                            <Link
                              href={`/pagamentos/novo?parcela=${row.installment.id}`}
                              className="receive-button"
                            >
                              Receber
                            </Link>
                          </div>
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

      <style jsx>{`
        .top-actions {
          display: flex;
          justify-content: flex-end;
          margin: -54px 0 24px;
        }

        .refresh-button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 40px;
          padding: 0 15px;
          border-radius: 10px;
          border: 1px solid #dbe1ea;
          background: #ffffff;
          color: #334155;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .refresh-button:hover {
          background: #f8fafc;
        }

        .refresh-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .error-box {
          margin-bottom: 20px;
          padding: 17px;
          border: 1px solid #fecaca;
          border-radius: 13px;
          background: #fff7f7;
          color: #991b1b;
        }

        .error-title {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 7px;
        }

        .error-box pre {
          margin: 0;
          white-space: pre-wrap;
          word-break: break-word;
          font-family: monospace;
          font-size: 12px;
        }

        .retry-button {
          margin-top: 13px;
          padding: 8px 13px;
          border-radius: 8px;
          border: 1px solid #fecaca;
          background: #ffffff;
          color: #991b1b;
          font-weight: 700;
          cursor: pointer;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 15px;
          margin-bottom: 18px;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 13px;
          min-width: 0;
          padding: 18px;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          background: #ffffff;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.035);
          text-align: left;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .stat-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 5px 15px rgba(15, 23, 42, 0.07);
        }

        .selected-danger {
          border-color: #fca5a5;
          background: #fffafa;
        }

        .selected-warning {
          border-color: #fcd34d;
          background: #fffdf5;
        }

        .selected-normal {
          border-color: #93c5fd;
          background: #f8fbff;
        }

        .stat-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          width: 43px;
          height: 43px;
          border-radius: 11px;
        }

        .danger-icon {
          background: #fef2f2;
          color: #dc2626;
        }

        .warning-icon {
          background: #fffbeb;
          color: #d97706;
        }

        .normal-icon {
          background: #eff6ff;
          color: #2563eb;
        }

        .total-icon {
          background: #f0fdf4;
          color: #16a34a;
        }

        .stat-content {
          min-width: 0;
        }

        .stat-content span {
          display: block;
          color: #64748b;
          font-size: 12px;
          margin-bottom: 3px;
        }

        .stat-content strong {
          display: block;
          color: #111827;
          font-size: 21px;
          line-height: 1.15;
        }

        .stat-content small {
          display: block;
          margin-top: 3px;
          color: #94a3b8;
          font-size: 11px;
        }

        .priority-banner {
          display: flex;
          align-items: center;
          gap: 13px;
          margin-bottom: 18px;
          padding: 14px 16px;
          border: 1px solid #fed7aa;
          border-radius: 13px;
          background: #fffaf3;
        }

        .priority-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 39px;
          height: 39px;
          border-radius: 10px;
          background: #ffedd5;
          color: #ea580c;
          flex-shrink: 0;
        }

        .priority-content {
          flex: 1;
          min-width: 0;
        }

        .priority-content strong {
          display: block;
          color: #9a3412;
          font-size: 14px;
        }

        .priority-content span {
          display: block;
          margin-top: 2px;
          color: #c2410c;
          font-size: 12px;
        }

        .priority-button {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 12px;
          border: 1px solid #fed7aa;
          border-radius: 8px;
          background: #ffffff;
          color: #c2410c;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
        }

        .filters-card {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 14px;
          padding: 13px;
          margin-bottom: 18px;
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 9px;
          min-height: 42px;
          padding: 0 12px;
          border: 1px solid #dbe1ea;
          border-radius: 10px;
          background: #ffffff;
          color: #64748b;
        }

        .search-box input {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: #111827;
          font-size: 14px;
        }

        .filter-buttons {
          display: flex;
          gap: 5px;
          padding: 3px;
          border-radius: 10px;
          background: #f1f5f9;
        }

        .filter-buttons button {
          min-height: 35px;
          padding: 0 11px;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: #64748b;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .filter-buttons button:hover {
          color: #334155;
          background: #ffffff;
        }

        .filter-buttons .filter-active {
          color: #111827;
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
        }

        .filter-buttons .filter-active-danger {
          color: #b91c1c;
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
        }

        .filter-buttons .filter-active-warning {
          color: #b45309;
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
        }

        .filter-buttons .filter-active-normal {
          color: #1d4ed8;
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
        }

        .table-card {
          overflow: hidden;
        }

        .table-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 19px 21px;
          border-bottom: 1px solid #eef0f4;
        }

        .table-header h2 {
          margin: 0 0 4px;
          color: #111827;
          font-size: 17px;
        }

        .table-header p {
          margin: 0;
          color: #64748b;
          font-size: 12px;
        }

        .clear-filter {
          border: 0;
          background: transparent;
          color: #2563eb;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .table-wrap {
          width: 100%;
          overflow-x: auto;
        }

        .collection-table {
          width: 100%;
          min-width: 1050px;
          border-collapse: collapse;
        }

        .collection-table th {
          padding: 12px 17px;
          text-align: left;
          background: #f8fafc;
          border-bottom: 1px solid #e5e7eb;
          color: #64748b;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .collection-table td {
          padding: 14px 17px;
          border-bottom: 1px solid #eef0f4;
          color: #374151;
          font-size: 13px;
          vertical-align: middle;
        }

        .collection-table tbody tr:hover {
          background: #fafbfc;
        }

        .customer-cell {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #eaf2ff;
          color: #2563eb;
          font-size: 13px;
          font-weight: 800;
          flex-shrink: 0;
        }

        .customer-info strong,
        .customer-info span,
        .installment-info strong,
        .installment-info span {
          display: block;
        }

        .customer-info strong {
          color: #111827;
          font-size: 13px;
        }

        .customer-info span,
        .installment-info span {
          margin-top: 3px;
          color: #94a3b8;
          font-size: 11px;
        }

        .installment-info strong {
          color: #334155;
          font-size: 13px;
        }

        .date-info {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #475569;
          white-space: nowrap;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 8px;
          border-radius: 7px;
          font-size: 11px;
          font-weight: 800;
        }

        .status-badge.danger {
          background: #fef2f2;
          color: #dc2626;
        }

        .status-badge.warning {
          background: #fffbeb;
          color: #b45309;
        }

        .status-badge.normal {
          background: #eff6ff;
          color: #2563eb;
        }

        .days-late {
          display: block;
          margin-top: 4px;
          color: #dc2626;
          font-size: 10px;
          font-weight: 600;
        }

        .amount-open {
          color: #111827;
          font-size: 14px;
          white-space: nowrap;
        }

        .action-buttons {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .whatsapp-button,
        .receive-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          min-height: 34px;
          padding: 0 9px;
          border-radius: 8px;
          text-decoration: none;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
        }

        .whatsapp-button {
          border: 1px solid #bbf7d0;
          background: #f0fdf4;
          color: #15803d;
        }

        .whatsapp-button:hover {
          background: #dcfce7;
        }

        .receive-button {
          border: 1px solid #dbeafe;
          background: #eff6ff;
          color: #2563eb;
        }

        .receive-button:hover {
          background: #dbeafe;
        }

        .empty-state {
          min-height: 300px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 40px;
          text-align: center;
          color: #64748b;
        }

        .empty-state strong {
          color: #334155;
          font-size: 16px;
        }

        .empty-state span {
          color: #94a3b8;
          font-size: 13px;
          margin-bottom: 9px;
        }

        .clear-empty {
          padding: 8px 12px;
          border: 1px solid #dbe1ea;
          border-radius: 8px;
          background: #ffffff;
          color: #334155;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .spin {
          animation: spin 0.9s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 1100px) {
          .stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .filters-card {
            grid-template-columns: 1fr;
          }

          .filter-buttons {
            justify-content: flex-start;
            width: fit-content;
          }
        }

        @media (max-width: 700px) {
          .top-actions {
            margin: 0 0 18px;
            justify-content: stretch;
          }

          .refresh-button {
            width: 100%;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .priority-banner {
            align-items: flex-start;
            flex-wrap: wrap;
          }

          .priority-content {
            min-width: calc(100% - 60px);
          }

          .priority-button {
            margin-left: 52px;
          }

          .filter-buttons {
            width: 100%;
            overflow-x: auto;
          }

          .filter-buttons button {
            flex: 1;
          }
        }
      `}</style>
    </main>
  );
}