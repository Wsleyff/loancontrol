"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  DollarSign,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { PageTitle } from "@/components/ui/PageTitle";

type Parcela = {
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
  paid_at?: string | null;
};

type Loan = {
  id: string;
  customer_id: string;
};

type Cliente = {
  id: string;
  full_name: string;
  cpf?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
};

type Filtro = "TODAS" | "PENDENTES" | "VENCIDAS" | "PAGAS";

function dinheiro(valor: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor) || 0);
}

function dataBR(data: string | null | undefined) {
  if (!data) return "-";

  const partes = data.split("-");

  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  return data;
}

function obterStatus(parcela: Parcela): Filtro {
  const status = String(parcela.status || "").toUpperCase();

  if (status === "PAID") {
    return "PAGAS";
  }

  if (status === "OVERDUE") {
    return "VENCIDAS";
  }

  if (
    parcela.due_date &&
    new Date(`${parcela.due_date}T23:59:59`).getTime() <
      Date.now() &&
    Number(parcela.remaining_amount) > 0
  ) {
    return "VENCIDAS";
  }

  return "PENDENTES";
}

export default function ParcelasPage() {
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [clientes, setClientes] = useState<Record<string, Cliente>>({});

  const [loading, setLoading] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState("");

  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("TODAS");

  async function carregarDados(refresh = false) {
    try {
      if (refresh) {
        setAtualizando(true);
      } else {
        setLoading(true);
      }

      setErro("");

      const supabase = createClient();

      if (!supabase) {
        throw new Error(
          "Supabase não configurado. Verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no arquivo .env.local."
        );
      }

      /*
       * BUSCA AS PARCELAS
       */
      const parcelasResponse = await supabase
        .from("loan_installments")
        .select(`
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
        `)
        .order("due_date", {
          ascending: true,
        });

      if (parcelasResponse.error) {
        throw parcelasResponse.error;
      }

      const listaParcelas =
        (parcelasResponse.data as Parcela[]) || [];

      setParcelas(listaParcelas);

      if (listaParcelas.length === 0) {
        setClientes({});
        return;
      }

      /*
       * BUSCA OS EMPRÉSTIMOS
       */
      const loanIds = [
        ...new Set(
          listaParcelas
            .map((parcela) => parcela.loan_id)
            .filter(Boolean)
        ),
      ];

      if (loanIds.length === 0) {
        setClientes({});
        return;
      }

      const loansResponse = await supabase
        .from("loans")
        .select(`
          id,
          customer_id
        `)
        .in("id", loanIds);

      if (loansResponse.error) {
        throw loansResponse.error;
      }

      const loans = (loansResponse.data as Loan[]) || [];

      if (loans.length === 0) {
        setClientes({});
        return;
      }

      /*
       * BUSCA OS CLIENTES
       */
      const customerIds = [
        ...new Set(
          loans
            .map((loan) => loan.customer_id)
            .filter(Boolean)
        ),
      ];

      if (customerIds.length === 0) {
        setClientes({});
        return;
      }

      const clientesResponse = await supabase
        .from("customers")
        .select(`
          id,
          full_name,
          cpf,
          phone,
          whatsapp
        `)
        .in("id", customerIds);

      if (clientesResponse.error) {
        throw clientesResponse.error;
      }

      const mapaClientes: Record<string, Cliente> = {};

      for (const cliente of clientesResponse.data || []) {
        mapaClientes[cliente.id] = cliente as Cliente;
      }

      /*
       * RELACIONA:
       * parcela -> empréstimo -> cliente
       */
      const mapaFinal: Record<string, Cliente> = {};

      for (const loan of loans) {
        const cliente = mapaClientes[loan.customer_id];

        if (cliente) {
          mapaFinal[loan.id] = cliente;
        }
      }

      setClientes(mapaFinal);
    } catch (error) {
      console.error("ERRO PARCELAS:", error);

      if (error instanceof Error) {
        setErro(error.message);
      } else {
        setErro("Não foi possível carregar as parcelas.");
      }
    } finally {
      setLoading(false);
      setAtualizando(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  const parcelasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return parcelas.filter((parcela) => {
      const cliente = clientes[parcela.loan_id];

      const nome = String(
        cliente?.full_name || ""
      ).toLowerCase();

      const cpf = String(
        cliente?.cpf || ""
      ).toLowerCase();

      const status = obterStatus(parcela);

      const passaFiltro =
        filtro === "TODAS" || filtro === status;

      const passaBusca =
        !termo ||
        nome.includes(termo) ||
        cpf.includes(termo) ||
        parcela.id.toLowerCase().includes(termo) ||
        parcela.loan_id.toLowerCase().includes(termo) ||
        String(parcela.installment_number).includes(termo);

      return passaFiltro && passaBusca;
    });
  }, [parcelas, clientes, busca, filtro]);

  const estatisticas = useMemo(() => {
    let pagas = 0;
    let pendentes = 0;
    let vencidas = 0;

    let valorPago = 0;
    let valorPendente = 0;
    let valorVencido = 0;

    for (const parcela of parcelas) {
      const status = obterStatus(parcela);

      if (status === "PAGAS") {
        pagas++;
        valorPago += Number(parcela.paid_amount) || 0;
      }

      if (status === "PENDENTES") {
        pendentes++;
        valorPendente += Number(parcela.remaining_amount) || 0;
      }

      if (status === "VENCIDAS") {
        vencidas++;
        valorVencido += Number(parcela.remaining_amount) || 0;
      }
    }

    return {
      total: parcelas.length,
      pagas,
      pendentes,
      vencidas,
      valorPago,
      valorPendente,
      valorVencido,
    };
  }, [parcelas]);

  function nomeCliente(parcela: Parcela) {
    return (
      clientes[parcela.loan_id]?.full_name ||
      "Cliente não identificado"
    );
  }

  function telefoneCliente(parcela: Parcela) {
    const cliente = clientes[parcela.loan_id];

    return cliente?.whatsapp || cliente?.phone || "";
  }

  function abrirWhatsApp(parcela: Parcela) {
    const telefone = telefoneCliente(parcela).replace(
      /\D/g,
      ""
    );

    if (!telefone) {
      alert("Este cliente não possui telefone cadastrado.");
      return;
    }

    const mensagem = encodeURIComponent(
      `Olá ${nomeCliente(
        parcela
      )}, tudo bem? Estou entrando em contato sobre a parcela ${
        parcela.installment_number
      } do seu empréstimo. O valor restante é ${dinheiro(
        parcela.remaining_amount
      )} e o vencimento é ${dataBR(parcela.due_date)}.`
    );

    window.open(
      `https://wa.me/55${telefone}?text=${mensagem}`,
      "_blank"
    );
  }

  function receber(parcela: Parcela) {
    window.location.href =
      `/pagamentos/novo?parcela=${parcela.id}`;
  }

  return (
    <main className="page">
      <header className="header">
        <div>
          <div className="eyebrow">
            <CalendarDays size={15} />
            Gestão financeira
          </div>

          <PageTitle
            title="Parcelas"
            description="Controle vencimentos, parcelas em atraso e recebimentos da sua carteira."
          />
        </div>

        <button
          className="refresh"
          onClick={() => carregarDados(true)}
          disabled={atualizando}
        >
          <RefreshCw
            size={17}
            className={atualizando ? "rotating" : ""}
          />

          {atualizando ? "Atualizando..." : "Atualizar"}
        </button>
      </header>

      {erro && (
        <div className="error">
          <AlertCircle size={21} />

          <div className="errorContent">
            <strong>
              Não foi possível carregar as parcelas
            </strong>

            <p>{erro}</p>
          </div>

          <button onClick={() => carregarDados()}>
            Tentar novamente
          </button>
        </div>
      )}

      <section className="stats">
        <div className="stat">
          <div>
            <span>Total de parcelas</span>
            <strong>{estatisticas.total}</strong>
            <small>Parcelas cadastradas</small>
          </div>

          <div className="icon blue">
            <CalendarDays size={22} />
          </div>
        </div>

        <div className="stat">
          <div>
            <span>Pagas</span>
            <strong>{estatisticas.pagas}</strong>
            <small>
              {dinheiro(estatisticas.valorPago)} recebidos
            </small>
          </div>

          <div className="icon green">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="stat">
          <div>
            <span>Pendentes</span>
            <strong>{estatisticas.pendentes}</strong>
            <small>
              {dinheiro(estatisticas.valorPendente)} a receber
            </small>
          </div>

          <div className="icon yellow">
            <Clock3 size={22} />
          </div>
        </div>

        <div className="stat">
          <div>
            <span>Vencidas</span>
            <strong>{estatisticas.vencidas}</strong>
            <small>
              {dinheiro(estatisticas.valorVencido)} em atraso
            </small>
          </div>

          <div className="icon red">
            <AlertCircle size={22} />
          </div>
        </div>
      </section>

      <section className="card">
        <div className="toolbar">
          <div className="search">
            <Search size={18} />

            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar cliente, CPF, parcela ou empréstimo..."
            />
          </div>

          <div className="filters">
            {(
              [
                ["TODAS", "Todas"],
                ["PENDENTES", "Pendentes"],
                ["VENCIDAS", "Vencidas"],
                ["PAGAS", "Pagas"],
              ] as [Filtro, string][]
            ).map(([valor, texto]) => (
              <button
                key={valor}
                className={
                  filtro === valor ? "selected" : ""
                }
                onClick={() => setFiltro(valor)}
              >
                {texto}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="loading">
            <div className="loader" />
            <p>Carregando parcelas...</p>
          </div>
        ) : parcelasFiltradas.length === 0 ? (
          <div className="empty">
            <div className="emptyIcon">
              <CalendarDays size={31} />
            </div>

            <h3>Nenhuma parcela encontrada</h3>

            <p>
              {parcelas.length === 0
                ? "As parcelas dos empréstimos aparecerão aqui automaticamente."
                : "Altere a busca ou o filtro para encontrar outras parcelas."}
            </p>
          </div>
        ) : (
          <div className="tableContainer">
            <table>
              <thead>
                <tr>
                  <th>Parcela</th>
                  <th>Cliente</th>
                  <th>Vencimento</th>
                  <th>Valor</th>
                  <th>Pago</th>
                  <th>Restante</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {parcelasFiltradas.map((parcela) => {
                  const cliente =
                    clientes[parcela.loan_id];

                  const status =
                    obterStatus(parcela);

                  const telefone =
                    telefoneCliente(parcela);

                  return (
                    <tr key={parcela.id}>
                      <td>
                        <div className="installment">
                          <strong>
                            #{parcela.installment_number}
                          </strong>

                          <span>
                            Empréstimo #
                            {parcela.loan_id.slice(0, 8)}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div className="customer">
                          <div className="avatar">
                            {nomeCliente(parcela)
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <strong>
                              {nomeCliente(parcela)}
                            </strong>

                            {cliente?.cpf && (
                              <small>
                                CPF: {cliente.cpf}
                              </small>
                            )}
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="date">
                          <CalendarDays size={15} />
                          {dataBR(parcela.due_date)}
                        </div>
                      </td>

                      <td>
                        <strong>
                          {dinheiro(parcela.amount)}
                        </strong>
                      </td>

                      <td>
                        <span className="paid">
                          {dinheiro(parcela.paid_amount)}
                        </span>
                      </td>

                      <td>
                        <strong>
                          {dinheiro(parcela.remaining_amount)}
                        </strong>
                      </td>

                      <td>
                        {status === "PAGAS" && (
                          <span className="badge paidBadge">
                            <CheckCircle2 size={14} />
                            Paga
                          </span>
                        )}

                        {status === "VENCIDAS" && (
                          <span className="badge overdueBadge">
                            <XCircle size={14} />
                            Vencida
                          </span>
                        )}

                        {status === "PENDENTES" && (
                          <span className="badge pendingBadge">
                            <Clock3 size={14} />
                            Pendente
                          </span>
                        )}
                      </td>

                      <td>
                        <div className="actions">
                          {status !== "PAGAS" && (
                            <button
                              className="receive"
                              onClick={() =>
                                receber(parcela)
                              }
                            >
                              <DollarSign size={15} />
                              Receber
                            </button>
                          )}

                          {telefone && (
                            <button
                              className="whatsapp"
                              onClick={() =>
                                abrirWhatsApp(parcela)
                              }
                            >
                              WhatsApp
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && parcelasFiltradas.length > 0 && (
          <div className="footer">
            Mostrando{" "}
            <strong>{parcelasFiltradas.length}</strong>{" "}
            de <strong>{parcelas.length}</strong> parcelas
          </div>
        )}
      </section>

      <style jsx>{`
        .page {
          min-height: calc(100vh - 70px);
          padding: 30px 34px 50px;
          background: #f6f8fc;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
          margin-bottom: 25px;
        }

        .eyebrow {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 5px;
          color: #2563eb;
          font-size: 13px;
          font-weight: 700;
        }

        .refresh {
          height: 42px;
          padding: 0 15px;
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid #dbe2ea;
          border-radius: 10px;
          background: white;
          color: #334155;
          font-weight: 700;
          cursor: pointer;
        }

        .refresh:hover {
          border-color: #2563eb;
          color: #2563eb;
        }

        .refresh:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .rotating {
          animation: rotate 0.8s linear infinite;
        }

        .error {
          margin-bottom: 20px;
          padding: 15px 17px;
          display: flex;
          align-items: center;
          gap: 13px;
          border: 1px solid #fed7aa;
          border-radius: 12px;
          background: #fff7ed;
          color: #c2410c;
        }

        .errorContent {
          flex: 1;
        }

        .error strong {
          font-size: 13px;
        }

        .error p {
          margin: 4px 0 0;
          font-size: 12px;
          word-break: break-word;
        }

        .error button {
          padding: 8px 12px;
          border: 0;
          border-radius: 7px;
          background: #ea580c;
          color: white;
          font-weight: 700;
          cursor: pointer;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 22px;
        }

        .stat {
          padding: 19px;
          display: flex;
          justify-content: space-between;
          gap: 15px;
          border: 1px solid #e5eaf0;
          border-radius: 16px;
          background: white;
          box-shadow: 0 3px 12px rgba(15, 23, 42, 0.04);
        }

        .stat span {
          display: block;
          margin-bottom: 7px;
          color: #64748b;
          font-size: 13px;
          font-weight: 600;
        }

        .stat strong {
          display: block;
          color: #111827;
          font-size: 27px;
          line-height: 1;
        }

        .stat small {
          display: block;
          margin-top: 10px;
          color: #94a3b8;
          font-size: 11px;
        }

        .icon {
          width: 43px;
          height: 43px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 12px;
        }

        .blue {
          background: #eff6ff;
          color: #2563eb;
        }

        .green {
          background: #ecfdf5;
          color: #059669;
        }

        .yellow {
          background: #fffbeb;
          color: #d97706;
        }

        .red {
          background: #fef2f2;
          color: #dc2626;
        }

        .card {
          overflow: hidden;
          border: 1px solid #e5eaf0;
          border-radius: 16px;
          background: white;
          box-shadow: 0 3px 12px rgba(15, 23, 42, 0.04);
        }

        .toolbar {
          padding: 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          border-bottom: 1px solid #eef2f6;
        }

        .search {
          width: min(440px, 100%);
          height: 42px;
          padding: 0 13px;
          display: flex;
          align-items: center;
          gap: 9px;
          border: 1px solid #dbe2ea;
          border-radius: 10px;
          background: #fafbfc;
          color: #94a3b8;
        }

        .search:focus-within {
          border-color: #2563eb;
          background: white;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
        }

        .search input {
          width: 100%;
          border: 0;
          outline: none;
          background: transparent;
          color: #111827;
          font-size: 13px;
        }

        .filters {
          padding: 4px;
          display: flex;
          gap: 4px;
          border-radius: 10px;
          background: #f1f5f9;
        }

        .filters button {
          padding: 8px 12px;
          border: 0;
          border-radius: 7px;
          background: transparent;
          color: #64748b;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .filters button.selected {
          background: white;
          color: #2563eb;
          box-shadow: 0 1px 4px rgba(15, 23, 42, 0.1);
        }

        .tableContainer {
          width: 100%;
          overflow-x: auto;
        }

        table {
          width: 100%;
          min-width: 1100px;
          border-collapse: collapse;
        }

        th {
          padding: 13px 16px;
          text-align: left;
          background: #fafbfc;
          border-bottom: 1px solid #e8edf3;
          color: #64748b;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }

        td {
          padding: 15px 16px;
          border-bottom: 1px solid #eef2f6;
          color: #334155;
          font-size: 13px;
        }

        tbody tr:hover {
          background: #fafcff;
        }

        .installment {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .installment strong {
          color: #111827;
        }

        .installment span {
          color: #94a3b8;
          font-size: 10px;
        }

        .customer {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 190px;
        }

        .avatar {
          width: 36px;
          height: 36px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #eff6ff;
          color: #2563eb;
          font-weight: 800;
        }

        .customer strong {
          display: block;
          color: #1e293b;
        }

        .customer small {
          display: block;
          margin-top: 3px;
          color: #94a3b8;
          font-size: 10px;
        }

        .date {
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
          color: #475569;
        }

        .paid {
          color: #059669;
          font-weight: 700;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 9px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
        }

        .paidBadge {
          background: #ecfdf5;
          color: #047857;
        }

        .pendingBadge {
          background: #fffbeb;
          color: #b45309;
        }

        .overdueBadge {
          background: #fef2f2;
          color: #b91c1c;
        }

        .actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .receive,
        .whatsapp {
          height: 32px;
          padding: 0 9px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          border-radius: 7px;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
        }

        .receive {
          border: 1px solid #bfdbfe;
          background: #eff6ff;
          color: #2563eb;
        }

        .receive:hover {
          background: #dbeafe;
        }

        .whatsapp {
          border: 1px solid #bbf7d0;
          background: #f0fdf4;
          color: #15803d;
        }

        .whatsapp:hover {
          background: #dcfce7;
        }

        .footer {
          padding: 14px 18px;
          background: #fafbfc;
          color: #64748b;
          font-size: 12px;
        }

        .loading {
          min-height: 330px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          color: #64748b;
        }

        .loader {
          width: 32px;
          height: 32px;
          border: 3px solid #e2e8f0;
          border-top-color: #2563eb;
          border-radius: 50%;
          animation: rotate 0.8s linear infinite;
        }

        .loading p {
          margin-top: 12px;
          font-size: 13px;
        }

        .empty {
          min-height: 330px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
        }

        .emptyIcon {
          width: 64px;
          height: 64px;
          display: grid;
          place-items: center;
          margin-bottom: 15px;
          border-radius: 50%;
          background: #eff6ff;
          color: #2563eb;
        }

        .empty h3 {
          margin: 0;
          color: #1e293b;
          font-size: 17px;
        }

        .empty p {
          max-width: 430px;
          margin: 8px 0 0;
          color: #94a3b8;
          font-size: 13px;
        }

        @keyframes rotate {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 1100px) {
          .stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .toolbar {
            flex-direction: column;
            align-items: stretch;
          }

          .search {
            width: 100%;
          }

          .filters {
            width: fit-content;
          }
        }

        @media (max-width: 700px) {
          .page {
            padding: 20px 15px 40px;
          }

          .header {
            flex-direction: column;
            align-items: flex-start;
          }

          .stats {
            grid-template-columns: 1fr;
          }

          .filters {
            width: 100%;
            overflow-x: auto;
          }

          .filters button {
            white-space: nowrap;
          }
        }
      `}</style>
    </main>
  );
}