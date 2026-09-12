"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Search,
  RefreshCw,
  Eye,
  Users,
  CreditCard,
  CalendarDays,
  Plus,
  AlertCircle,
  CheckCircle2,
  Clock3,
} from "lucide-react";

type Company = {
  id: string;
  name: string;
  legal_name?: string | null;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  created_at?: string | null;
};

type Subscription = {
  company_id: string;
  status: string;
  trial_ends_at?: string | null;
  current_period_end?: string | null;
  plan?: {
    name?: string | null;
    price?: number | null;
  } | null;
};

type CompanyRow = Company & {
  subscription?: Subscription | null;
};

export default function MasterEmpresasPage() {
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  async function loadCompanies(showRefresh = false) {
    try {
      setError("");

      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetch(
        "/api/master/empresas",
        {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Não foi possível carregar as empresas."
        );
      }

      setCompanies(data?.companies || []);
    } catch (err) {
      console.error(
        "[MASTER EMPRESAS]",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Erro ao carregar empresas."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadCompanies();
  }, []);

  const filteredCompanies = useMemo(() => {
    const term = search
      .trim()
      .toLowerCase();

    if (!term) {
      return companies;
    }

    return companies.filter((company) => {
      return (
        company.name
          ?.toLowerCase()
          .includes(term) ||
        company.legal_name
          ?.toLowerCase()
          .includes(term) ||
        company.document
          ?.toLowerCase()
          .includes(term) ||
        company.email
          ?.toLowerCase()
          .includes(term) ||
        company.phone
          ?.toLowerCase()
          .includes(term) ||
        company.city
          ?.toLowerCase()
          .includes(term)
      );
    });
  }, [companies, search]);

  const totalCompanies = companies.length;

  const activeCompanies = companies.filter(
    (company) =>
      company.subscription?.status ===
        "ACTIVE" ||
      company.subscription?.status ===
        "TRIAL"
  ).length;

  const trialCompanies = companies.filter(
    (company) =>
      company.subscription?.status ===
      "TRIAL"
  ).length;

  const expiredCompanies = companies.filter(
    (company) =>
      company.subscription?.status ===
        "EXPIRED" ||
      company.subscription?.status ===
        "CANCELLED" ||
      company.subscription?.status ===
        "PAST_DUE"
  ).length;

  function formatDate(value?: string | null) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleDateString(
      "pt-BR"
    );
  }

  function statusLabel(
    status?: string
  ) {
    switch (status) {
      case "ACTIVE":
        return "Ativa";

      case "TRIAL":
        return "Período de teste";

      case "PAST_DUE":
        return "Pagamento pendente";

      case "CANCELLED":
        return "Cancelada";

      case "EXPIRED":
        return "Expirada";

      default:
        return "Sem assinatura";
    }
  }

  function statusClass(
    status?: string
  ) {
    switch (status) {
      case "ACTIVE":
        return "status-active";

      case "TRIAL":
        return "status-trial";

      case "PAST_DUE":
        return "status-warning";

      case "CANCELLED":
      case "EXPIRED":
        return "status-danger";

      default:
        return "status-neutral";
    }
  }

  return (
    <div className="page">
      {/* CABEÇALHO */}
      <div className="page-header">
        <div>
          <div className="eyebrow">
            <Building2 size={15} />
            GESTÃO DA PLATAFORMA
          </div>

          <h1>Empresas</h1>

          <p>
            Gerencie todas as empresas cadastradas
            no LoanControl.
          </p>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="refresh-button"
            onClick={() =>
              loadCompanies(true)
            }
            disabled={refreshing}
          >
            <RefreshCw
              size={16}
              className={
                refreshing
                  ? "spin"
                  : ""
              }
            />

            {refreshing
              ? "Atualizando..."
              : "Atualizar"}
          </button>
        </div>
      </div>

      {/* CARDS */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <Building2 size={21} />
          </div>

          <div className="stat-content">
            <span>Total de empresas</span>
            <strong>
              {totalCompanies}
            </strong>
            <small>
              Empresas cadastradas
            </small>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <CheckCircle2 size={21} />
          </div>

          <div className="stat-content">
            <span>Operando normalmente</span>
            <strong>
              {activeCompanies}
            </strong>
            <small>
              Testes e assinaturas ativas
            </small>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange">
            <Clock3 size={21} />
          </div>

          <div className="stat-content">
            <span>Em período de teste</span>
            <strong>
              {trialCompanies}
            </strong>
            <small>
              Empresas em avaliação
            </small>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon red">
            <AlertCircle size={21} />
          </div>

          <div className="stat-content">
            <span>Com pendências</span>
            <strong>
              {expiredCompanies}
            </strong>
            <small>
              Assinaturas vencidas
            </small>
          </div>
        </div>
      </div>

      {/* ÁREA PRINCIPAL */}
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>
              Empresas cadastradas
            </h2>

            <p>
              Visualize e acompanhe as
              empresas que utilizam a
              plataforma.
            </p>
          </div>

          <div className="search-box">
            <Search size={17} />

            <input
              type="text"
              placeholder="Buscar empresa, CNPJ, e-mail..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
            />
          </div>
        </div>

        {error && (
          <div className="error-box">
            <AlertCircle size={18} />

            <div>
              <strong>
                Não foi possível carregar
                as empresas
              </strong>

              <span>
                {error}
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                loadCompanies()
              }
            >
              Tentar novamente
            </button>
          </div>
        )}

        {loading ? (
          <div className="loading-state">
            <RefreshCw
              size={25}
              className="spin"
            />

            <strong>
              Carregando empresas...
            </strong>

            <span>
              Buscando informações da
              plataforma.
            </span>
          </div>
        ) : filteredCompanies.length ===
          0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Building2 size={28} />
            </div>

            <h3>
              {search
                ? "Nenhuma empresa encontrada"
                : "Nenhuma empresa cadastrada"}
            </h3>

            <p>
              {search
                ? "Tente alterar os termos da busca."
                : "As empresas que se cadastrarem no LoanControl aparecerão aqui."}
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>EMPRESA</th>
                  <th>CONTATO</th>
                  <th>PLANO</th>
                  <th>STATUS</th>
                  <th>CADASTRO</th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {filteredCompanies.map(
                  (company) => {
                    const subscription =
                      company.subscription;

                    return (
                      <tr
                        key={company.id}
                      >
                        <td>
                          <div className="company-cell">
                            <div className="company-avatar">
                              {company.name
                                ?.charAt(
                                  0
                                )
                                .toUpperCase() ||
                                "E"}
                            </div>

                            <div>
                              <strong>
                                {company.name}
                              </strong>

                              <span>
                                {company.document ||
                                  "Documento não informado"}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="contact-cell">
                            <span>
                              {company.email ||
                                "E-mail não informado"}
                            </span>

                            <small>
                              {company.phone ||
                                "Telefone não informado"}
                            </small>
                          </div>
                        </td>

                        <td>
                          {subscription?.plan
                            ?.name ? (
                            <div className="plan-cell">
                              <CreditCard
                                size={15}
                              />

                              <div>
                                <strong>
                                  {
                                    subscription
                                      .plan
                                      .name
                                  }
                                </strong>

                                {subscription
                                  .plan
                                  .price !==
                                  null &&
                                  subscription
                                    .plan
                                    .price !==
                                    undefined && (
                                    <small>
                                      R${" "}
                                      {Number(
                                        subscription
                                          .plan
                                          .price
                                      ).toFixed(
                                        2
                                      )}
                                    </small>
                                  )}
                              </div>
                            </div>
                          ) : (
                            <span className="muted">
                              Sem plano
                            </span>
                          )}
                        </td>

                        <td>
                          <span
                            className={`status ${statusClass(
                              subscription?.status
                            )}`}
                          >
                            <span className="status-dot" />

                            {statusLabel(
                              subscription?.status
                            )}
                          </span>
                        </td>

                        <td>
                          <div className="date-cell">
                            <CalendarDays
                              size={14}
                            />

                            {formatDate(
                              company.created_at
                            )}
                          </div>
                        </td>

                        <td>
                          <Link
                            href={`/master/empresas/${company.id}`}
                            className="view-button"
                          >
                            <Eye size={16} />

                            Ver
                          </Link>
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
        .page {
          width: 100%;
        }

        .page-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 25px;
          margin-bottom: 27px;
        }

        .eyebrow {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #2563eb;
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 0.09em;
        }

        .page-header h1 {
          margin: 8px 0 6px;
          color: #111827;
          font-size: 31px;
          line-height: 1.1;
          font-weight: 850;
          letter-spacing: -1px;
        }

        .page-header p {
          margin: 0;
          color: #64748b;
          font-size: 12px;
        }

        .header-actions {
          flex-shrink: 0;
        }

        .refresh-button {
          height: 40px;
          padding: 0 15px;
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid #dbe3ed;
          border-radius: 9px;
          background: white;
          color: #334155;
          font-size: 11px;
          font-weight: 750;
          cursor: pointer;
          transition: 0.18s ease;
          box-shadow: 0 3px 12px rgba(15, 23, 42, 0.04);
        }

        .refresh-button:hover {
          border-color: #bfdbfe;
          color: #2563eb;
          background: #f8fbff;
        }

        .refresh-button:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 15px;
          margin-bottom: 20px;
        }

        .stat-card {
          min-width: 0;
          min-height: 115px;
          display: flex;
          align-items: flex-start;
          gap: 13px;
          padding: 18px;
          box-sizing: border-box;
          border: 1px solid #e3e8f0;
          border-radius: 15px;
          background: white;
          box-shadow: 0 8px 25px rgba(15, 23, 42, 0.045);
        }

        .stat-icon {
          width: 43px;
          height: 43px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
        }

        .stat-icon.blue {
          color: #2563eb;
          background: #eff6ff;
        }

        .stat-icon.green {
          color: #059669;
          background: #ecfdf5;
        }

        .stat-icon.orange {
          color: #d97706;
          background: #fff7ed;
        }

        .stat-icon.red {
          color: #dc2626;
          background: #fef2f2;
        }

        .stat-content {
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .stat-content span {
          color: #64748b;
          font-size: 10px;
          font-weight: 650;
        }

        .stat-content strong {
          margin-top: 5px;
          color: #0f172a;
          font-size: 24px;
          line-height: 1;
          font-weight: 850;
        }

        .stat-content small {
          margin-top: 7px;
          color: #94a3b8;
          font-size: 9px;
        }

        .panel {
          overflow: hidden;
          border: 1px solid #e3e8f0;
          border-radius: 16px;
          background: white;
          box-shadow: 0 8px 28px rgba(15, 23, 42, 0.045);
        }

        .panel-header {
          min-height: 82px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 18px 21px;
          box-sizing: border-box;
          border-bottom: 1px solid #edf0f4;
        }

        .panel-header h2 {
          margin: 0 0 5px;
          color: #172033;
          font-size: 15px;
          font-weight: 800;
        }

        .panel-header p {
          margin: 0;
          color: #94a3b8;
          font-size: 10px;
        }

        .search-box {
          width: 320px;
          height: 39px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 12px;
          box-sizing: border-box;
          border: 1px solid #dfe5ed;
          border-radius: 9px;
          background: #f8fafc;
          color: #94a3b8;
        }

        .search-box:focus-within {
          border-color: #93c5fd;
          background: white;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.08);
        }

        .search-box input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: #1e293b;
          font-size: 11px;
        }

        .search-box input::placeholder {
          color: #94a3b8;
        }

        .error-box {
          margin: 18px 20px;
          padding: 14px;
          display: flex;
          align-items: center;
          gap: 11px;
          border: 1px solid #fecaca;
          border-radius: 10px;
          background: #fff7f7;
          color: #dc2626;
        }

        .error-box > div {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .error-box strong {
          font-size: 11px;
        }

        .error-box span {
          color: #991b1b;
          font-size: 9px;
        }

        .error-box button {
          height: 34px;
          padding: 0 12px;
          border: 1px solid #fecaca;
          border-radius: 8px;
          background: white;
          color: #b91c1c;
          font-size: 10px;
          font-weight: 750;
          cursor: pointer;
        }

        .loading-state {
          min-height: 300px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 8px;
          color: #2563eb;
        }

        .loading-state strong {
          margin-top: 5px;
          color: #334155;
          font-size: 12px;
        }

        .loading-state span {
          color: #94a3b8;
          font-size: 10px;
        }

        .empty-state {
          min-height: 310px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          text-align: center;
          padding: 30px;
        }

        .empty-icon {
          width: 58px;
          height: 58px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 13px;
          border-radius: 15px;
          background: #eff6ff;
          color: #3b82f6;
        }

        .empty-state h3 {
          margin: 0 0 6px;
          color: #334155;
          font-size: 14px;
        }

        .empty-state p {
          max-width: 430px;
          margin: 0;
          color: #94a3b8;
          font-size: 10px;
          line-height: 1.6;
        }

        .table-wrapper {
          width: 100%;
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 950px;
        }

        th {
          height: 43px;
          padding: 0 18px;
          text-align: left;
          color: #94a3b8;
          background: #fafbfc;
          border-bottom: 1px solid #edf0f4;
          font-size: 8px;
          font-weight: 850;
          letter-spacing: 0.08em;
          white-space: nowrap;
        }

        td {
          height: 72px;
          padding: 0 18px;
          border-bottom: 1px solid #f0f2f5;
          color: #334155;
          font-size: 10px;
          vertical-align: middle;
        }

        tbody tr:hover {
          background: #fafcff;
        }

        tbody tr:last-child td {
          border-bottom: 0;
        }

        .company-cell {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 200px;
        }

        .company-avatar {
          width: 37px;
          height: 37px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: #eff6ff;
          color: #2563eb;
          font-size: 12px;
          font-weight: 850;
        }

        .company-cell > div:last-child {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .company-cell strong {
          color: #1e293b;
          font-size: 11px;
          font-weight: 750;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 190px;
        }

        .company-cell span {
          color: #94a3b8;
          font-size: 9px;
        }

        .contact-cell {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 175px;
        }

        .contact-cell span {
          color: #475569;
          font-size: 10px;
        }

        .contact-cell small {
          color: #94a3b8;
          font-size: 9px;
        }

        .plan-cell {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #6366f1;
        }

        .plan-cell > div {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .plan-cell strong {
          color: #334155;
          font-size: 10px;
          font-weight: 750;
        }

        .plan-cell small {
          color: #94a3b8;
          font-size: 8px;
        }

        .muted {
          color: #94a3b8;
          font-size: 9px;
        }

        .status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 8px;
          border-radius: 7px;
          font-size: 9px;
          font-weight: 750;
          white-space: nowrap;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .status-active {
          background: #ecfdf5;
          color: #047857;
        }

        .status-active .status-dot {
          background: #10b981;
        }

        .status-trial {
          background: #fff7ed;
          color: #c2410c;
        }

        .status-trial .status-dot {
          background: #f97316;
        }

        .status-warning {
          background: #fffbeb;
          color: #a16207;
        }

        .status-warning .status-dot {
          background: #eab308;
        }

        .status-danger {
          background: #fef2f2;
          color: #b91c1c;
        }

        .status-danger .status-dot {
          background: #ef4444;
        }

        .status-neutral {
          background: #f1f5f9;
          color: #64748b;
        }

        .status-neutral .status-dot {
          background: #94a3b8;
        }

        .date-cell {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #64748b;
          white-space: nowrap;
        }

        .view-button {
          height: 32px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0 10px;
          border: 1px solid #dbeafe;
          border-radius: 8px;
          background: #eff6ff;
          color: #2563eb;
          text-decoration: none;
          font-size: 9px;
          font-weight: 800;
        }

        .view-button:hover {
          background: #dbeafe;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 1100px) {
          .stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 700px) {
          .page-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .header-actions,
          .refresh-button {
            width: 100%;
          }

          .refresh-button {
            justify-content: center;
          }

          .panel-header {
            align-items: stretch;
            flex-direction: column;
          }

          .search-box {
            width: 100%;
          }
        }

        @media (max-width: 520px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }

          .page-header h1 {
            font-size: 26px;
          }
        }
      `}</style>
    </div>
  );
}