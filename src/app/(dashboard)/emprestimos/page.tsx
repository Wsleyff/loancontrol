"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  Plus,
  Search,
  User,
  Wallet,
  AlertTriangle,
} from "lucide-react";

import { PageTitle } from "@/components/ui/PageTitle";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/utils/format-currency";

type Emprestimo = {
  id: string;
  customer_id: string;
  amount: number;
  total_amount: number;
  installment_amount: number;
  term: number;
  status: string;
  start_date: string;
  first_due_date: string;
  customers?: {
    full_name: string;
    cpf?: string | null;
    phone?: string | null;
  } | null;
};

function statusLabel(status: string) {
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

function statusClass(status: string) {
  if (status === "PAID") {
    return "badge badge-green";
  }

  if (
    status === "OVERDUE" ||
    status === "DEFAULTED"
  ) {
    return "badge badge-red";
  }

  if (status === "ACTIVE") {
    return "badge badge-blue";
  }

  return "badge";
}

function formatDate(value: string) {
  if (!value) return "-";

  const [year, month, day] = value.split("-");

  return `${day}/${month}/${year}`;
}

export default function Emprestimos() {
  const [rows, setRows] = useState<Emprestimo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("TODOS");
  const [erro, setErro] = useState("");

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
      window.location.href = "/login";
      return;
    }

    const { data: membership, error: membershipError } =
      await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", user.id)
        .eq("status", "ACTIVE")
        .limit(1)
        .maybeSingle();

    if (membershipError || !membership) {
      setErro(
        "Seu usuário não está vinculado a uma empresa."
      );
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("loans")
      .select(`
        id,
        customer_id,
        amount,
        total_amount,
        installment_amount,
        term,
        status,
        start_date,
        first_due_date,
        customers (
          full_name,
          cpf,
          phone
        )
      `)
      .eq("company_id", membership.company_id)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      setErro(error.message);
      setLoading(false);
      return;
    }

   const emprestimosFormatados = (data || []).map((item: any) => ({
  ...item,
  customers: Array.isArray(item.customers)
    ? item.customers[0] ?? null
    : item.customers ?? null,
}));

setRows(emprestimosFormatados as Emprestimo[]);
setLoading(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return rows.filter((loan) => {
      const nome =
        loan.customers?.full_name?.toLowerCase() || "";

      const cpf =
        loan.customers?.cpf?.toLowerCase() || "";

      const combinaBusca =
        !termo ||
        nome.includes(termo) ||
        cpf.includes(termo);

      const combinaStatus =
        filtro === "TODOS" ||
        loan.status === filtro;

      return combinaBusca && combinaStatus;
    });
  }, [rows, busca, filtro]);

  const resumo = useMemo(() => {
    return {
      total: rows.length,

      ativos: rows.filter(
        (item) => item.status === "ACTIVE"
      ).length,

      atrasados: rows.filter(
        (item) =>
          item.status === "OVERDUE" ||
          item.status === "DEFAULTED"
      ).length,

      carteira: rows
        .filter((item) => item.status === "ACTIVE")
        .reduce(
          (total, item) =>
            total + Number(item.total_amount || 0),
          0
        ),
    };
  }, [rows]);

  return (
    <main className="container">
      <style jsx>{`
        .top-actions {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 18px;
        }

        .summary {
          padding: 20px;
        }

        .summary-label {
          color: #64748b;
          font-size: 13px;
          font-weight: 600;
        }

        .summary-value {
          font-size: 25px;
          font-weight: 800;
          margin-top: 8px;
        }

        .filters {
          display: flex;
          gap: 12px;
          align-items: center;
          padding: 16px;
          margin-bottom: 14px;
          flex-wrap: wrap;
        }

        .search-box {
          position: relative;
          flex: 1;
          min-width: 240px;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #64748b;
        }

        .search-input {
          width: 100%;
          padding-left: 40px;
        }

        .status-select {
          min-width: 180px;
        }

        .table-wrap {
          overflow-x: auto;
        }

        .table {
          min-width: 900px;
        }

        .client {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .client-icon {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #f1f5f9;
          color: #475569;
        }

        .client-name {
          font-weight: 700;
        }

        .client-cpf {
          font-size: 12px;
          color: #64748b;
          margin-top: 2px;
        }

        .view-button {
          border: 0;
          background: transparent;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-weight: 700;
        }

        .empty {
          text-align: center;
          padding: 40px;
        }

        @media (max-width: 1000px) {
          .summary-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 600px) {
          .summary-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <PageTitle
        title="Empréstimos"
        description="Controle completo da sua carteira de crédito"
        action={
          <div className="top-actions">
            <a
              className="btn btn-primary"
              href="/emprestimos/novo"
            >
              <Plus size={17} />
              Novo empréstimo
            </a>
          </div>
        }
      />

      <div className="summary-grid">
        <div className="card summary">
          <div className="summary-label">
            Total de empréstimos
          </div>

          <div className="summary-value">
            {resumo.total}
          </div>
        </div>

        <div className="card summary">
          <div className="summary-label">
            Empréstimos ativos
          </div>

          <div className="summary-value">
            {resumo.ativos}
          </div>
        </div>

        <div className="card summary">
          <div className="summary-label">
            Em atraso
          </div>

          <div className="summary-value">
            {resumo.atrasados}
          </div>
        </div>

        <div className="card summary">
          <div className="summary-label">
            Carteira ativa
          </div>

          <div className="summary-value">
            {money(resumo.carteira)}
          </div>
        </div>
      </div>

      {erro && (
        <div
          className="card"
          style={{
            padding: 18,
            marginBottom: 16,
            border: "1px solid #fecaca",
          }}
        >
          <strong>Erro:</strong> {erro}
        </div>
      )}

      <div className="card filters">
        <div className="search-box">
          <Search
            size={18}
            className="search-icon"
          />

          <input
            className="input search-input"
            placeholder="Buscar por nome ou CPF..."
            value={busca}
            onChange={(e) =>
              setBusca(e.target.value)
            }
          />
        </div>

        <select
          className="input status-select"
          value={filtro}
          onChange={(e) =>
            setFiltro(e.target.value)
          }
        >
          <option value="TODOS">Todos os status</option>
          <option value="ACTIVE">Ativos</option>
          <option value="PENDING">Pendentes</option>
          <option value="OVERDUE">Em atraso</option>
          <option value="DEFAULTED">Inadimplentes</option>
          <option value="PAID">Quitados</option>
          <option value="CANCELLED">Cancelados</option>
        </select>
      </div>

      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Valor</th>
              <th>Total</th>
              <th>Parcela</th>
              <th>Parcelas</th>
              <th>1º vencimento</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8}>
                  <div className="empty">
                    Carregando empréstimos...
                  </div>
                </td>
              </tr>
            ) : filtrados.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="empty">
                    <Wallet
                      size={32}
                      style={{ marginBottom: 8 }}
                    />

                    <div>
                      Nenhum empréstimo encontrado.
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              filtrados.map((loan) => (
                <tr key={loan.id}>
                  <td>
                    <div className="client">
                      <div className="client-icon">
                        <User size={18} />
                      </div>

                      <div>
                        <div className="client-name">
                          {loan.customers?.full_name ||
                            "Cliente"}
                        </div>

                        {loan.customers?.cpf && (
                          <div className="client-cpf">
                            CPF: {loan.customers.cpf}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  <td>
                    {money(loan.amount)}
                  </td>

                  <td>
                    <strong>
                      {money(loan.total_amount)}
                    </strong>
                  </td>

                  <td>
                    {money(
                      loan.installment_amount
                    )}
                  </td>

                  <td>
                    {loan.term}
                  </td>

                  <td>
                    {formatDate(
                      loan.first_due_date
                    )}
                  </td>

                  <td>
                    <span
                      className={statusClass(
                        loan.status
                      )}
                    >
                      {loan.status ===
                        "OVERDUE" && (
                        <AlertTriangle
                          size={13}
                          style={{
                            marginRight: 4,
                          }}
                        />
                      )}

                      {statusLabel(loan.status)}
                    </span>
                  </td>

                  <td>
                    <button
                      className="view-button"
                      onClick={() =>
                        (window.location.href = `/emprestimos/${loan.id}`)
                      }
                    >
                      <Eye size={17} />
                      Detalhes
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}