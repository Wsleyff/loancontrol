"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  Phone,
  User,
  Wallet,
  AlertTriangle,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/utils/format-currency";

type Cliente = {
  id: string;
  full_name: string;
  cpf?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
};

type Emprestimo = {
  id: string;
  customer_id: string;
  amount: number;
  principal_amount: number;
  interest_rate: number;
  interest_type: string;
  term: number;
  frequency: string;
  start_date: string;
  first_due_date: string;
  last_due_date: string;
  total_interest: number;
  total_amount: number;
  installment_amount: number;
  status: string;
  notes?: string | null;
  customers?: Cliente | null;
};

type Parcela = {
  id: string;
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
  paid_at?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "-";

  const [year, month, day] = value.split("-");

  if (!year || !month || !day) return value;

  return `${day}/${month}/${year}`;
}

function statusLoan(status: string) {
  const map: Record<string, string> = {
    PENDING: "Pendente",
    ACTIVE: "Ativo",
    PAID: "Quitado",
    OVERDUE: "Em atraso",
    CANCELLED: "Cancelado",
    DEFAULTED: "Inadimplente",
  };

  return map[status] || status;
}

function statusInstallment(status: string) {
  const map: Record<string, string> = {
    PENDING: "Pendente",
    PARTIAL: "Parcial",
    PAID: "Paga",
    OVERDUE: "Vencida",
    CANCELLED: "Cancelada",
  };

  return map[status] || status;
}

function frequencyLabel(value: string) {
  const map: Record<string, string> = {
    DAILY: "Diária",
    WEEKLY: "Semanal",
    BIWEEKLY: "Quinzenal",
    MONTHLY: "Mensal",
  };

  return map[value] || value;
}

function interestLabel(value: string) {
  const map: Record<string, string> = {
    SIMPLE: "Juros simples",
    COMPOUND: "Juros compostos",
    FIXED: "Juros fixos",
  };

  return map[value] || value;
}

function isOverdue(parcela: Parcela) {
  if (parcela.status === "PAID" || parcela.status === "CANCELLED") {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(`${parcela.due_date}T00:00:00`);

  return due < today;
}

function parcelaVisualStatus(parcela: Parcela) {
  if (parcela.status === "PAID") return "PAID";
  if (parcela.status === "CANCELLED") return "CANCELLED";
  if (isOverdue(parcela)) return "OVERDUE";
  if (parcela.status === "PARTIAL") return "PARTIAL";
  return "PENDING";
}

function statusClass(status: string) {
  switch (status) {
    case "PAID":
      return "status status-paid";

    case "OVERDUE":
      return "status status-overdue";

    case "PARTIAL":
      return "status status-partial";

    case "CANCELLED":
      return "status status-cancelled";

    default:
      return "status status-pending";
  }
}

export default function DetalhesEmprestimo() {
  const params = useParams();
  const router = useRouter();

  const id = params.id as string;

  const [emprestimo, setEmprestimo] = useState<Emprestimo | null>(null);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      setErro("");

      const supabase = createClient();

      if (!supabase) {
        setErro("Supabase não configurado.");
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: membership, error: membershipError } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", user.id)
        .eq("status", "ACTIVE")
        .limit(1)
        .maybeSingle();

      if (membershipError || !membership) {
        setErro("Seu usuário não está vinculado a uma empresa.");
        setLoading(false);
        return;
      }

      const { data: loan, error: loanError } = await supabase
        .from("loans")
        .select(`
          id,
          customer_id,
          amount,
          principal_amount,
          interest_rate,
          interest_type,
          term,
          frequency,
          start_date,
          first_due_date,
          last_due_date,
          total_interest,
          total_amount,
          installment_amount,
          status,
          notes,
          customers (
            id,
            full_name,
            cpf,
            phone,
            whatsapp,
            email
          )
        `)
        .eq("id", id)
        .eq("company_id", membership.company_id)
        .maybeSingle();

      if (loanError) {
        setErro(loanError.message);
        setLoading(false);
        return;
      }

      if (!loan) {
        setErro("Empréstimo não encontrado.");
        setLoading(false);
        return;
      }

      const { data: installments, error: installmentsError } = await supabase
        .from("loan_installments")
        .select(`
          id,
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
        `)
        .eq("loan_id", id)
        .eq("company_id", membership.company_id)
        .order("installment_number", { ascending: true });

      if (installmentsError) {
        setErro(installmentsError.message);
        setLoading(false);
        return;
      }

      setEmprestimo(loan as unknown as Emprestimo);
      setParcelas((installments || []) as Parcela[]);
      setLoading(false);
    }

    if (id) {
      carregar();
    }
  }, [id, router]);

  const resumo = useMemo(() => {
    const total = parcelas.reduce(
      (acc, parcela) => acc + Number(parcela.amount || 0),
      0
    );

    const pago = parcelas.reduce(
      (acc, parcela) => acc + Number(parcela.paid_amount || 0),
      0
    );

    const restante = parcelas.reduce(
      (acc, parcela) => acc + Number(parcela.remaining_amount || 0),
      0
    );

    const vencidas = parcelas.filter(
      (parcela) => parcelaVisualStatus(parcela) === "OVERDUE"
    );

    const pagas = parcelas.filter(
      (parcela) => parcelaVisualStatus(parcela) === "PAID"
    );

    const pendentes = parcelas.filter((parcela) => {
      const status = parcelaVisualStatus(parcela);

      return (
        status === "PENDING" ||
        status === "PARTIAL" ||
        status === "OVERDUE"
      );
    });

    return {
      total,
      pago,
      restante,
      vencidas,
      pagas,
      pendentes,
    };
  }, [parcelas]);

  if (loading) {
    return (
      <main className="container">
        <div
          className="card"
          style={{
            padding: 40,
            textAlign: "center",
            marginTop: 20,
          }}
        >
          Carregando empréstimo...
        </div>
      </main>
    );
  }

  if (erro || !emprestimo) {
    return (
      <main className="container">
        <button
          className="btn"
          onClick={() => router.push("/emprestimos")}
          style={{ marginBottom: 18 }}
        >
          <ArrowLeft size={17} />
          Voltar para empréstimos
        </button>

        <div
          className="card"
          style={{
            padding: 30,
            border: "1px solid #fecaca",
          }}
        >
          <h2>Não foi possível carregar</h2>

          <p className="muted">
            {erro || "Empréstimo não encontrado."}
          </p>
        </div>
      </main>
    );
  }

  const cliente = emprestimo.customers;

  return (
    <main className="container">
      <style jsx>{`
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 22px;
        }

        .header-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .back-button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 0;
          background: transparent;
          padding: 0;
          cursor: pointer;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .title {
          margin: 0;
          font-size: 28px;
        }

        .subtitle {
          margin: 6px 0 0;
        }

        .grid-cards {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 18px;
        }

        .summary-card {
          padding: 20px;
        }

        .summary-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }

        .summary-label {
          font-size: 13px;
          font-weight: 600;
          color: #64748b;
        }

        .summary-value {
          font-size: 24px;
          font-weight: 800;
          margin-top: 10px;
        }

        .main-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
          margin-bottom: 18px;
        }

        .section-card {
          padding: 22px;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 9px;
          margin: 0 0 18px;
          font-size: 18px;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .info-label {
          font-size: 12px;
          color: #64748b;
          margin-bottom: 4px;
        }

        .info-value {
          font-weight: 650;
        }

        .customer-box {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: #eef2ff;
          color: #3730a3;
          flex-shrink: 0;
        }

        .customer-name {
          font-size: 17px;
          font-weight: 750;
        }

        .customer-contact {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 5px;
          color: #64748b;
          font-size: 13px;
        }

        .notes {
          margin-top: 18px;
          padding: 14px;
          border-radius: 10px;
          background: #f8fafc;
          color: #475569;
          line-height: 1.6;
        }

        .table-wrap {
          overflow-x: auto;
        }

        .installment-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 800px;
        }

        .installment-table th {
          text-align: left;
          padding: 13px 14px;
          font-size: 12px;
          color: #64748b;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }

        .installment-table td {
          padding: 14px;
          border-bottom: 1px solid #e2e8f0;
          vertical-align: middle;
        }

        .installment-table tr:last-child td {
          border-bottom: 0;
        }

        .status {
          display: inline-flex;
          align-items: center;
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
        }

        .status-paid {
          background: #dcfce7;
          color: #166534;
        }

        .status-overdue {
          background: #fee2e2;
          color: #991b1b;
        }

        .status-partial {
          background: #fef3c7;
          color: #92400e;
        }

        .status-pending {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .status-cancelled {
          background: #e2e8f0;
          color: #475569;
        }

        .payment-button {
          border: 0;
          border-radius: 8px;
          padding: 8px 11px;
          font-weight: 700;
          cursor: pointer;
          background: #111827;
          color: white;
        }

        .payment-button:hover {
          opacity: 0.9;
        }

        .overdue-row {
          background: #fff7f7;
        }

        .empty {
          padding: 35px;
          text-align: center;
          color: #64748b;
        }

        @media (max-width: 1000px) {
          .grid-cards {
            grid-template-columns: repeat(2, 1fr);
          }

          .main-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .header {
            align-items: flex-start;
            flex-direction: column;
          }

          .grid-cards {
            grid-template-columns: 1fr;
          }

          .info-grid {
            grid-template-columns: 1fr;
          }

          .title {
            font-size: 23px;
          }
        }
      `}</style>

      <div className="header">
        <div>
          <button
            className="back-button"
            onClick={() => router.push("/emprestimos")}
          >
            <ArrowLeft size={17} />
            Voltar para empréstimos
          </button>

          <h1 className="title">Detalhes do empréstimo</h1>

          <p className="subtitle muted">
            Consulte valores, cliente e situação das parcelas.
          </p>
        </div>

        <div className="header-actions">
          <button
            className="btn"
            onClick={() => router.push(`/clientes/${emprestimo.customer_id}`)}
          >
            <User size={17} />
            Ver cliente
          </button>
        </div>
      </div>

      <div className="grid-cards">
        <div className="card summary-card">
          <div className="summary-top">
            <span className="summary-label">Valor emprestado</span>
            <Wallet size={20} />
          </div>

          <div className="summary-value">
            {money(emprestimo.principal_amount || emprestimo.amount)}
          </div>
        </div>

        <div className="card summary-card">
          <div className="summary-top">
            <span className="summary-label">Total do contrato</span>
            <FileText size={20} />
          </div>

          <div className="summary-value">
            {money(emprestimo.total_amount)}
          </div>
        </div>

        <div className="card summary-card">
          <div className="summary-top">
            <span className="summary-label">Total recebido</span>
            <CheckCircle2 size={20} />
          </div>

          <div className="summary-value">
            {money(resumo.pago)}
          </div>
        </div>

        <div className="card summary-card">
          <div className="summary-top">
            <span className="summary-label">Saldo restante</span>
            <CreditCard size={20} />
          </div>

          <div className="summary-value">
            {money(resumo.restante)}
          </div>
        </div>
      </div>

      <div className="main-grid">
        <div className="card section-card">
          <h2 className="section-title">
            <User size={19} />
            Cliente
          </h2>

          <div className="customer-box">
            <div className="avatar">
              <User size={23} />
            </div>

            <div>
              <div className="customer-name">
                {cliente?.full_name || "Cliente não informado"}
              </div>

              {cliente?.cpf && (
                <div className="customer-contact">
                  CPF: {cliente.cpf}
                </div>
              )}

              {cliente?.phone && (
                <div className="customer-contact">
                  <Phone size={14} />
                  {cliente.phone}
                </div>
              )}
            </div>
          </div>

          {cliente?.email && (
            <div style={{ marginTop: 18 }}>
              <div className="info-label">E-mail</div>
              <div className="info-value">{cliente.email}</div>
            </div>
          )}

          {cliente?.whatsapp && (
            <div style={{ marginTop: 14 }}>
              <div className="info-label">WhatsApp</div>
              <div className="info-value">{cliente.whatsapp}</div>
            </div>
          )}
        </div>

        <div className="card section-card">
          <h2 className="section-title">
            <FileText size={19} />
            Dados do contrato
          </h2>

          <div className="info-grid">
            <div>
              <div className="info-label">Status</div>

              <div className={statusClass(
                emprestimo.status === "OVERDUE"
                  ? "OVERDUE"
                  : emprestimo.status === "PAID"
                  ? "PAID"
                  : "PENDING"
              )}>
                {statusLoan(emprestimo.status)}
              </div>
            </div>

            <div>
              <div className="info-label">Parcelas</div>
              <div className="info-value">
                {emprestimo.term} parcelas
              </div>
            </div>

            <div>
              <div className="info-label">Juros</div>
              <div className="info-value">
                {Number(emprestimo.interest_rate || 0).toFixed(2)}%
              </div>
            </div>

            <div>
              <div className="info-label">Tipo de juros</div>
              <div className="info-value">
                {interestLabel(emprestimo.interest_type)}
              </div>
            </div>

            <div>
              <div className="info-label">Frequência</div>
              <div className="info-value">
                {frequencyLabel(emprestimo.frequency)}
              </div>
            </div>

            <div>
              <div className="info-label">Valor da parcela</div>
              <div className="info-value">
                {money(emprestimo.installment_amount)}
              </div>
            </div>

            <div>
              <div className="info-label">Data do empréstimo</div>
              <div className="info-value">
                {formatDate(emprestimo.start_date)}
              </div>
            </div>

            <div>
              <div className="info-label">Primeiro vencimento</div>
              <div className="info-value">
                {formatDate(emprestimo.first_due_date)}
              </div>
            </div>
          </div>

          {emprestimo.notes && (
            <div className="notes">
              <strong>Observações</strong>
              <br />
              {emprestimo.notes}
            </div>
          )}
        </div>
      </div>

      <div className="card section-card">
        <h2 className="section-title">
          <CalendarDays size={19} />
          Resumo das parcelas
        </h2>

        <div className="info-grid">
          <div>
            <div className="info-label">Total de parcelas</div>
            <div className="info-value">
              {parcelas.length}
            </div>
          </div>

          <div>
            <div className="info-label">Parcelas pagas</div>
            <div className="info-value">
              {resumo.pagas.length}
            </div>
          </div>

          <div>
            <div className="info-label">Parcelas pendentes</div>
            <div className="info-value">
              {resumo.pendentes.length}
            </div>
          </div>

          <div>
            <div className="info-label">Parcelas vencidas</div>

            <div
              className="info-value"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {resumo.vencidas.length > 0 && (
                <AlertTriangle size={17} />
              )}

              {resumo.vencidas.length}
            </div>
          </div>

          <div>
            <div className="info-label">Total de juros</div>
            <div className="info-value">
              {money(emprestimo.total_interest)}
            </div>
          </div>

          <div>
            <div className="info-label">Valor recebido</div>
            <div className="info-value">
              {money(resumo.pago)}
            </div>
          </div>

          <div>
            <div className="info-label">Saldo a receber</div>
            <div className="info-value">
              {money(resumo.restante)}
            </div>
          </div>

          <div>
            <div className="info-label">Último vencimento</div>
            <div className="info-value">
              {formatDate(emprestimo.last_due_date)}
            </div>
          </div>
        </div>
      </div>

      <div
        className="card section-card"
        style={{ marginTop: 18 }}
      >
        <h2 className="section-title">
          <CalendarDays size={19} />
          Parcelas
        </h2>

        <div className="table-wrap">
          <table className="installment-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Vencimento</th>
                <th>Valor</th>
                <th>Pago</th>
                <th>Saldo</th>
                <th>Status</th>
                <th>Ação</th>
              </tr>
            </thead>

            <tbody>
              {parcelas.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty">
                      Nenhuma parcela encontrada.
                    </div>
                  </td>
                </tr>
              ) : (
                parcelas.map((parcela) => {
                  const visualStatus =
                    parcelaVisualStatus(parcela);

                  return (
                    <tr
                      key={parcela.id}
                      className={
                        visualStatus === "OVERDUE"
                          ? "overdue-row"
                          : ""
                      }
                    >
                      <td>
                        <strong>
                          {String(
                            parcela.installment_number
                          ).padStart(2, "0")}
                        </strong>
                      </td>

                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          {visualStatus === "OVERDUE" ? (
                            <AlertTriangle size={15} />
                          ) : (
                            <Clock3 size={15} />
                          )}

                          {formatDate(parcela.due_date)}
                        </div>
                      </td>

                      <td>
                        <strong>
                          {money(parcela.amount)}
                        </strong>
                      </td>

                      <td>
                        {money(parcela.paid_amount)}
                      </td>

                      <td>
                        <strong>
                          {money(parcela.remaining_amount)}
                        </strong>
                      </td>

                      <td>
                        <span
                          className={statusClass(
                            visualStatus
                          )}
                        >
                          {statusInstallment(
                            visualStatus
                          )}
                        </span>
                      </td>

                      <td>
                        {visualStatus !== "PAID" &&
                          visualStatus !== "CANCELLED" && (
                            <button
                              className="payment-button"
                              onClick={() =>
                                router.push(
                                  `/pagamentos/novo?installment=${parcela.id}`
                                )
                              }
                            >
                              Registrar pagamento
                            </button>
                          )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}