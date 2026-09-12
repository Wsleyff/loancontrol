"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  CalendarDays,
  CreditCard,
  Eye,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  Smartphone,
  Wallet,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { PageTitle } from "@/components/ui/PageTitle";

type Payment = {
  id: string;
  company_id: string;
  loan_id: string | null;
  installment_id: string | null;
  amount: number;
  payment_method: string | null;
  paid_at: string | null;
  created_at: string;
};

type Customer = {
  id: string;
  full_name: string;
  cpf: string | null;
};

type Loan = {
  id: string;
  customer_id: string;
};

type Installment = {
  id: string;
  loan_id: string;
  installment_number: number;
};

function money(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function methodLabel(method: string | null) {
  if (!method) {
    return "Não informado";
  }

  const normalized = method.toLowerCase();

  const methods: Record<string, string> = {
    pix: "PIX",
    dinheiro: "Dinheiro",
    cash: "Dinheiro",
    transfer: "Transferência",
    transferencia: "Transferência",
    bank_transfer: "Transferência",
    debit_card: "Cartão de débito",
    debito: "Cartão de débito",
    credito: "Cartão de crédito",
    credit_card: "Cartão de crédito",
    card: "Cartão",
    customer_account: "Conta do cliente",
    other: "Outro",
    outro: "Outro",
  };

  return methods[normalized] || method;
}

function methodIcon(method: string | null) {
  const normalized = (method || "").toLowerCase();

  if (normalized.includes("pix")) {
    return <Smartphone size={17} />;
  }

  if (
    normalized.includes("cash") ||
    normalized.includes("dinheiro")
  ) {
    return <Wallet size={17} />;
  }

  if (
    normalized.includes("card") ||
    normalized.includes("credito") ||
    normalized.includes("crédito") ||
    normalized.includes("debito") ||
    normalized.includes("débito")
  ) {
    return <CreditCard size={17} />;
  }

  return <ArrowDownLeft size={17} />;
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
      return JSON.stringify(error, null, 2);
    } catch {
      return "Erro desconhecido ao consultar o Supabase.";
    }
  }

  return "Não foi possível carregar os pagamentos.";
}

export default function PagamentosPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [installments, setInstallments] = useState<
    Installment[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");

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

      const { data: membership, error: membershipError } =
        await supabase
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

      const companyId = membership.company_id;

      /*
       * ======================================================
       * PAGAMENTOS
       * ======================================================
       *
       * Usamos somente colunas existentes na estrutura
       * atual do LoanControl.
       */

      const paymentsResponse = await supabase
        .from("payments")
        .select(
          `
            id,
            company_id,
            loan_id,
            installment_id,
            amount,
            payment_method,
            paid_at,
            created_at
          `
        )
        .eq("company_id", companyId)
        .order("created_at", {
          ascending: false,
        });

      if (paymentsResponse.error) {
        console.error(
          "[PAGAMENTOS] Erro:",
          paymentsResponse.error
        );

        throw paymentsResponse.error;
      }

      const paymentsData =
        (paymentsResponse.data || []) as Payment[];

      /*
       * ======================================================
       * CLIENTES
       * ======================================================
       */

      const customersResponse = await supabase
        .from("customers")
        .select(
          "id, full_name, cpf"
        )
        .eq("company_id", companyId);

      if (customersResponse.error) {
        throw customersResponse.error;
      }

      /*
       * ======================================================
       * EMPRÉSTIMOS
       * ======================================================
       */

      const loansResponse = await supabase
        .from("loans")
        .select(
          "id, customer_id"
        )
        .eq("company_id", companyId);

      if (loansResponse.error) {
        throw loansResponse.error;
      }

      /*
       * ======================================================
       * PARCELAS
       * ======================================================
       */

      const installmentsResponse = await supabase
        .from("loan_installments")
        .select(
          "id, loan_id, installment_number"
        )
        .eq("company_id", companyId);

      if (installmentsResponse.error) {
        throw installmentsResponse.error;
      }

      setPayments(paymentsData);

      setCustomers(
        (customersResponse.data || []) as Customer[]
      );

      setLoans(
        (loansResponse.data || []) as Loan[]
      );

      setInstallments(
        (installmentsResponse.data || []) as Installment[]
      );
    } catch (err) {
      console.error(
        "[PAGAMENTOS] ERRO COMPLETO:",
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

  const customerMap = useMemo(() => {
    return new Map(
      customers.map((customer) => [
        customer.id,
        customer,
      ])
    );
  }, [customers]);

  const loanMap = useMemo(() => {
    return new Map(
      loans.map((loan) => [
        loan.id,
        loan,
      ])
    );
  }, [loans]);

  const installmentMap = useMemo(() => {
    return new Map(
      installments.map((installment) => [
        installment.id,
        installment,
      ])
    );
  }, [installments]);

  const pagamentosComDados = useMemo(() => {
    return payments.map((payment) => {
      const loan = payment.loan_id
        ? loanMap.get(payment.loan_id)
        : null;

      const customer = loan
        ? customerMap.get(loan.customer_id)
        : null;

      const installment =
        payment.installment_id
          ? installmentMap.get(
              payment.installment_id
            )
          : null;

      return {
        payment,
        loan,
        customer,
        installment,
      };
    });
  }, [
    payments,
    loanMap,
    customerMap,
    installmentMap,
  ]);

  const filteredPayments = useMemo(() => {
    const text = search
      .trim()
      .toLowerCase();

    return pagamentosComDados.filter(
      ({
        payment,
        customer,
        loan,
      }) => {
        const matchesSearch =
          !text ||
          customer?.full_name
            ?.toLowerCase()
            .includes(text) ||
          customer?.cpf
            ?.toLowerCase()
            .includes(text) ||
          loan?.id
            ?.toLowerCase()
            .includes(text) ||
          payment.id
            ?.toLowerCase()
            .includes(text);

        const matchesMethod =
          methodFilter === "all" ||
          payment.payment_method ===
            methodFilter;

        return (
          matchesSearch &&
          matchesMethod
        );
      }
    );
  }, [
    pagamentosComDados,
    search,
    methodFilter,
  ]);

  const totalReceived = useMemo(() => {
    return payments.reduce(
      (total, payment) =>
        total +
        Number(payment.amount || 0),
      0
    );
  }, [payments]);

  const todayReceived = useMemo(() => {
    const today = new Date();

    return payments
      .filter((payment) => {
        const date = new Date(
          payment.paid_at ||
            payment.created_at
        );

        return (
          date.getDate() ===
            today.getDate() &&
          date.getMonth() ===
            today.getMonth() &&
          date.getFullYear() ===
            today.getFullYear()
        );
      })
      .reduce(
        (total, payment) =>
          total +
          Number(payment.amount || 0),
        0
      );
  }, [payments]);

  const monthReceived = useMemo(() => {
    const today = new Date();

    return payments
      .filter((payment) => {
        const date = new Date(
          payment.paid_at ||
            payment.created_at
        );

        return (
          date.getMonth() ===
            today.getMonth() &&
          date.getFullYear() ===
            today.getFullYear()
        );
      })
      .reduce(
        (total, payment) =>
          total +
          Number(payment.amount || 0),
        0
      );
  }, [payments]);

  return (
    <main className="container">
      <PageTitle
        title="Pagamentos"
        description="Controle e acompanhe todos os recebimentos da sua carteira."
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

        <Link
          href="/pagamentos/novo"
          className="primary-button"
        >
          + Registrar pagamento
        </Link>
      </div>

      {error && (
        <div className="error-box">
          <strong>
            Não foi possível carregar os pagamentos
          </strong>

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
        <div className="stat-card">
          <div className="stat-icon">
            <Wallet size={20} />
          </div>

          <div>
            <span>Total recebido</span>

            <strong>
              {money(totalReceived)}
            </strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <CalendarDays size={20} />
          </div>

          <div>
            <span>Recebido hoje</span>

            <strong>
              {money(todayReceived)}
            </strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <ArrowDownLeft size={20} />
          </div>

          <div>
            <span>Recebido este mês</span>

            <strong>
              {money(monthReceived)}
            </strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <CreditCard size={20} />
          </div>

          <div>
            <span>Pagamentos registrados</span>

            <strong>
              {payments.length}
            </strong>
          </div>
        </div>
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
            placeholder="Buscar cliente, CPF ou ID..."
          />
        </div>

        <div className="filter-item">
          <Filter size={17} />

          <select
            value={methodFilter}
            onChange={(event) =>
              setMethodFilter(
                event.target.value
              )
            }
          >
            <option value="all">
              Todas as formas
            </option>

            <option value="pix">
              PIX
            </option>

            <option value="cash">
              Dinheiro
            </option>

            <option value="transfer">
              Transferência
            </option>

            <option value="debit_card">
              Cartão de débito
            </option>

            <option value="credit_card">
              Cartão de crédito
            </option>

            <option value="other">
              Outro
            </option>
          </select>
        </div>
      </section>

      <section className="card table-card">
        <div className="table-header">
          <div>
            <h2>
              Histórico de pagamentos
            </h2>

            <p>
              {filteredPayments.length} pagamento
              {filteredPayments.length === 1
                ? ""
                : "s"}{" "}
              encontrado
              {filteredPayments.length === 1
                ? ""
                : "s"}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">
            <Loader2
              size={32}
              className="spin"
            />

            <strong>
              Carregando pagamentos...
            </strong>

            <span>
              Consultando os dados da sua carteira.
            </span>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="empty-state">
            <Wallet size={36} />

            <strong>
              Nenhum pagamento encontrado
            </strong>

            <span>
              Os recebimentos registrados
              aparecerão aqui.
            </span>

            <Link
              href="/pagamentos/novo"
              className="primary-button"
            >
              Registrar pagamento
            </Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="payments-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Parcela</th>
                  <th>Forma</th>
                  <th>Data</th>
                  <th>Valor</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {filteredPayments.map(
                  ({
                    payment,
                    loan,
                    customer,
                    installment,
                  }) => {
                    const paymentDate =
                      payment.paid_at ||
                      payment.created_at;

                    return (
                      <tr
                        key={payment.id}
                      >
                        <td>
                          <div className="customer-cell">
                            <div className="avatar">
                              {(
                                customer?.full_name ||
                                "C"
                              )
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div>
                              <strong>
                                {customer?.full_name ||
                                  "Cliente não identificado"}
                              </strong>

                              <span>
                                {customer?.cpf ||
                                  "CPF não informado"}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="installment-cell">
                            <strong>
                              {installment
                                ? `Parcela ${installment.installment_number}`
                                : "—"}
                            </strong>

                            {loan && (
                              <span>
                                Empréstimo #
                                {loan.id.slice(
                                  0,
                                  8
                                )}
                              </span>
                            )}
                          </div>
                        </td>

                        <td>
                          <div className="method-cell">
                            <span className="method-icon">
                              {methodIcon(
                                payment.payment_method
                              )}
                            </span>

                            <span>
                              {methodLabel(
                                payment.payment_method
                              )}
                            </span>
                          </div>
                        </td>

                        <td>
                          <div className="date-cell">
                            <strong>
                              {formatDate(
                                paymentDate
                              )}
                            </strong>

                            <span>
                              {formatTime(
                                paymentDate
                              )}
                            </span>
                          </div>
                        </td>

                        <td>
                          <strong className="amount">
                            {money(
                              Number(
                                payment.amount ||
                                  0
                              )
                            )}
                          </strong>
                        </td>

                        <td>
                          {payment.loan_id ? (
                            <Link
                              href={`/emprestimos/${payment.loan_id}`}
                              className="icon-button"
                              title="Ver empréstimo"
                            >
                              <Eye size={17} />
                            </Link>
                          ) : (
                            <span className="icon-button disabled">
                              <Eye size={17} />
                            </span>
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

      <style jsx>{`
        .top-actions {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 10px;
          margin: -54px 0 24px;
        }

        .primary-button,
        .refresh-button,
        .retry-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 40px;
          padding: 0 16px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .primary-button {
          background: #111827;
          color: #ffffff;
          border: 1px solid #111827;
        }

        .primary-button:hover {
          background: #1f2937;
          transform: translateY(-1px);
        }

        .refresh-button {
          background: #ffffff;
          color: #374151;
          border: 1px solid #dbe1ea;
        }

        .refresh-button:hover {
          background: #f8fafc;
        }

        .refresh-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .retry-button {
          align-self: flex-start;
          margin-top: 6px;
          background: #ffffff;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .error-box {
          display: flex;
          flex-direction: column;
          gap: 7px;
          padding: 16px 18px;
          margin-bottom: 20px;
          border: 1px solid #fecaca;
          background: #fff7f7;
          color: #991b1b;
          border-radius: 12px;
        }

        .error-box pre {
          margin: 0;
          white-space: pre-wrap;
          word-break: break-word;
          font-family: monospace;
          font-size: 12px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 20px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
        }

        .stat-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          border-radius: 11px;
          background: #eff6ff;
          color: #2563eb;
          flex-shrink: 0;
        }

        .stat-card span {
          display: block;
          color: #64748b;
          font-size: 12px;
          margin-bottom: 4px;
        }

        .stat-card strong {
          display: block;
          color: #111827;
          font-size: 20px;
          line-height: 1.2;
        }

        .filters-card {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 220px;
          gap: 12px;
          padding: 14px;
          margin-bottom: 20px;
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 9px;
          min-height: 42px;
          padding: 0 12px;
          border: 1px solid #dbe1ea;
          border-radius: 10px;
          color: #64748b;
          background: #ffffff;
        }

        .search-box input {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: #111827;
          font-size: 14px;
        }

        .filter-item {
          display: flex;
          align-items: center;
          gap: 8px;
          min-height: 42px;
          padding: 0 11px;
          border: 1px solid #dbe1ea;
          border-radius: 10px;
          color: #64748b;
          background: #ffffff;
        }

        .filter-item select {
          width: 100%;
          height: 40px;
          border: 0;
          padding: 0;
          background: transparent;
          color: #374151;
          outline: none;
          font-size: 14px;
        }

        .table-card {
          overflow: hidden;
        }

        .table-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 22px;
          border-bottom: 1px solid #eef0f4;
        }

        .table-header h2 {
          margin: 0 0 4px;
          font-size: 17px;
          color: #111827;
        }

        .table-header p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
        }

        .table-wrap {
          width: 100%;
          overflow-x: auto;
        }

        .payments-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 900px;
        }

        .payments-table th {
          padding: 12px 18px;
          text-align: left;
          color: #64748b;
          background: #f8fafc;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          font-weight: 800;
          border-bottom: 1px solid #e5e7eb;
        }

        .payments-table td {
          padding: 15px 18px;
          border-bottom: 1px solid #eef0f4;
          color: #374151;
          font-size: 14px;
          vertical-align: middle;
        }

        .payments-table tbody tr:hover {
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
          flex-shrink: 0;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #eaf2ff;
          color: #2563eb;
          font-weight: 800;
        }

        .customer-cell strong,
        .customer-cell span,
        .installment-cell strong,
        .installment-cell span,
        .date-cell strong,
        .date-cell span {
          display: block;
        }

        .customer-cell strong {
          color: #111827;
          font-size: 13px;
        }

        .customer-cell span,
        .installment-cell span,
        .date-cell span {
          margin-top: 3px;
          color: #94a3b8;
          font-size: 11px;
        }

        .installment-cell strong {
          color: #374151;
          font-size: 13px;
        }

        .method-cell {
          display: flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
        }

        .method-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: 8px;
          background: #f1f5f9;
          color: #475569;
        }

        .date-cell strong {
          color: #374151;
          font-size: 13px;
        }

        .amount {
          color: #047857;
          font-size: 14px;
          white-space: nowrap;
        }

        .icon-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border: 1px solid #e2e8f0;
          border-radius: 9px;
          color: #475569;
          background: #ffffff;
          text-decoration: none;
        }

        .icon-button:hover {
          background: #f8fafc;
        }

        .icon-button.disabled {
          opacity: 0.4;
        }

        .empty-state {
          min-height: 300px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 40px;
          color: #64748b;
          text-align: center;
        }

        .empty-state strong {
          color: #334155;
          font-size: 16px;
        }

        .empty-state span {
          font-size: 13px;
          margin-bottom: 10px;
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

        @media (max-width: 1000px) {
          .stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 800px) {
          .filters-card {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .top-actions {
            margin: 0 0 20px;
            justify-content: stretch;
          }

          .top-actions > * {
            flex: 1;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}