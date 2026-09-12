"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  FileText,
  RefreshCw,
  Search,
  Wallet,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Clock3,
  Receipt,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type AnyRecord = Record<string, any>;

type Movimento = {
  id: string;
  type: string;
  amount: number;
  description: string;
  date: string;
  raw: AnyRecord;
};

type Conta = {
  id: string;
  amount: number;
  status: string;
  dueDate: string;
  description: string;
  customerName?: string;
  raw: AnyRecord;
};

type Cliente = {
  id: string;
  full_name: string;
  cpf?: string | null;
};

type Aba =
  | "visao"
  | "entradas"
  | "saidas"
  | "pagar"
  | "receber";

function getNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value !== "string") {
    return 0;
  }

  const text = value.trim();

  if (!text) {
    return 0;
  }

  const normalized = text.includes(",")
    ? text.replace(/\./g, "").replace(",", ".")
    : text;

  const number = Number(normalized);

  return Number.isFinite(number) ? number : 0;
}

function money(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("pt-BR");
}

function normalizeStatus(status: unknown) {
  return String(status || "")
    .trim()
    .toLowerCase();
}

function isPaid(status: unknown) {
  const value = normalizeStatus(status);

  return [
    "paid",
    "pago",
    "paid_out",
    "settled",
    "liquidado",
    "received",
    "recebido",
    "completed",
    "concluido",
    "concluído",
  ].includes(value);
}

function isCanceled(status: unknown) {
  const value = normalizeStatus(status);

  return [
    "cancelled",
    "canceled",
    "cancelado",
    "cancelada",
  ].includes(value);
}

function isOverdue(status: unknown, dueDate?: string | null) {
  const value = normalizeStatus(status);

  if (
    [
      "overdue",
      "atrasado",
      "vencido",
      "vencida",
      "late",
    ].includes(value)
  ) {
    return true;
  }

  if (!dueDate || isPaid(status) || isCanceled(status)) {
    return false;
  }

  const due = new Date(`${dueDate}T23:59:59`);
  const now = new Date();

  return !Number.isNaN(due.getTime()) && due < now;
}

function getDateFromRecord(item: AnyRecord) {
  return (
    item.created_at ||
    item.date ||
    item.movement_date ||
    item.payment_date ||
    item.paid_at ||
    item.due_date ||
    item.createdAt ||
    new Date().toISOString()
  );
}

function getAmountFromRecord(item: AnyRecord) {
  return getNumber(
    item.amount ??
      item.value ??
      item.total ??
      item.paid_amount ??
      item.payment_amount ??
      0,
  );
}

function getDescriptionFromRecord(item: AnyRecord) {
  return (
    item.description ||
    item.name ||
    item.title ||
    item.reference ||
    "Movimentação financeira"
  );
}

function isIncomeMovement(item: AnyRecord) {
  const type = normalizeStatus(
    item.type ||
      item.movement_type ||
      item.transaction_type ||
      item.direction,
  );

  if (
    [
      "income",
      "entrada",
      "receita",
      "credit",
      "credito",
      "crédito",
      "in",
    ].includes(type)
  ) {
    return true;
  }

  if (
    [
      "expense",
      "saida",
      "saída",
      "despesa",
      "debit",
      "debito",
      "débito",
      "out",
    ].includes(type)
  ) {
    return false;
  }

  return false;
}

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return "—";

  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();
}

function getCustomerId(item: AnyRecord) {
  return (
    item.customer_id ||
    item.client_id ||
    item.customerId ||
    item.clientId ||
    null
  );
}

export default function FinanceiroPage() {
  const [aba, setAba] = useState<Aba>("visao");

  const [movimentos, setMovimentos] = useState<Movimento[]>([]);
  const [contasPagar, setContasPagar] = useState<Conta[]>([]);
  const [contasReceber, setContasReceber] = useState<Conta[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  const [busca, setBusca] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [periodo, setPeriodo] = useState<
    "todos" | "hoje" | "mes" | "ano"
  >("mes");

  const supabase = createClient();

  const carregarDados = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      if (!supabase) {
        throw new Error(
          "Supabase não configurado. Verifique o arquivo .env.local.",
        );
      }

      const {
        data: {
          user,
        },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          "Usuário não autenticado. Faça login novamente.",
        );
      }

      const { data: companyUser, error: companyError } =
        await supabase
          .from("company_users")
          .select("company_id")
          .eq("user_id", user.id)
          .eq("status", "ACTIVE")
          .limit(1)
          .maybeSingle();

      if (companyError) {
        throw new Error(
          `Não foi possível localizar a empresa: ${companyError.message}`,
        );
      }

      if (!companyUser?.company_id) {
        throw new Error(
          "Seu usuário não está vinculado a uma empresa ativa.",
        );
      }

      const companyId = companyUser.company_id;

      /*
       * IMPORTANTE:
       * Usamos select("*") em contas a pagar e a receber.
       * Assim esta tela não depende de colunas opcionais
       * como supplier_id.
       */

      const [
        movimentosResponse,
        payableResponse,
        receivableResponse,
        customersResponse,
      ] = await Promise.all([
        supabase
          .from("cash_movements")
          .select("*")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false }),

        supabase
          .from("accounts_payable")
          .select("*")
          .eq("company_id", companyId)
          .order("due_date", { ascending: true }),

        supabase
          .from("accounts_receivable")
          .select("*")
          .eq("company_id", companyId)
          .order("due_date", { ascending: true }),

        supabase
          .from("customers")
          .select("id, full_name, cpf")
          .eq("company_id", companyId)
          .order("full_name", { ascending: true }),
      ]);

      if (movimentosResponse.error) {
        throw new Error(
          `Erro ao carregar movimentações: ${movimentosResponse.error.message}`,
        );
      }

      if (payableResponse.error) {
        throw new Error(
          `Erro ao carregar contas a pagar: ${payableResponse.error.message}`,
        );
      }

      if (receivableResponse.error) {
        throw new Error(
          `Erro ao carregar contas a receber: ${receivableResponse.error.message}`,
        );
      }

      if (customersResponse.error) {
        throw new Error(
          `Erro ao carregar clientes: ${customersResponse.error.message}`,
        );
      }

      const clientesData =
        (customersResponse.data || []) as Cliente[];

      const clienteMap = new Map<string, string>();

      clientesData.forEach((cliente) => {
        clienteMap.set(cliente.id, cliente.full_name);
      });

      const movimentosData: Movimento[] = (
        movimentosResponse.data || []
      ).map((item: AnyRecord) => ({
        id: String(item.id),
        type: String(
          item.type ||
            item.movement_type ||
            item.transaction_type ||
            "",
        ),
        amount: getAmountFromRecord(item),
        description: getDescriptionFromRecord(item),
        date: getDateFromRecord(item),
        raw: item,
      }));

      const payableData: Conta[] = (
        payableResponse.data || []
      ).map((item: AnyRecord) => {
        const customerId = getCustomerId(item);

        return {
          id: String(item.id),
          amount: getAmountFromRecord(item),
          status: String(item.status || "PENDING"),
          dueDate: String(
            item.due_date ||
              item.dueDate ||
              item.created_at ||
              "",
          ),
          description: getDescriptionFromRecord(item),
          customerName: customerId
            ? clienteMap.get(customerId)
            : undefined,
          raw: item,
        };
      });

      const receivableData: Conta[] = (
        receivableResponse.data || []
      ).map((item: AnyRecord) => {
        const customerId = getCustomerId(item);

        return {
          id: String(item.id),
          amount: getAmountFromRecord(item),
          status: String(item.status || "PENDING"),
          dueDate: String(
            item.due_date ||
              item.dueDate ||
              item.created_at ||
              "",
          ),
          description: getDescriptionFromRecord(item),
          customerName: customerId
            ? clienteMap.get(customerId)
            : undefined,
          raw: item,
        };
      });

      setMovimentos(movimentosData);
      setContasPagar(payableData);
      setContasReceber(receivableData);
      setClientes(clientesData);
    } catch (err) {
      console.error("[FINANCEIRO] Erro:", err);

      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível carregar os dados financeiros.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const agora = useMemo(() => new Date(), []);

  const movimentosFiltradosPorPeriodo = useMemo(() => {
    return movimentos.filter((movimento) => {
      if (periodo === "todos") return true;

      const date = new Date(movimento.date);

      if (Number.isNaN(date.getTime())) {
        return true;
      }

      if (periodo === "hoje") {
        return (
          date.getDate() === agora.getDate() &&
          date.getMonth() === agora.getMonth() &&
          date.getFullYear() === agora.getFullYear()
        );
      }

      if (periodo === "mes") {
        return (
          date.getMonth() === agora.getMonth() &&
          date.getFullYear() === agora.getFullYear()
        );
      }

      return date.getFullYear() === agora.getFullYear();
    });
  }, [movimentos, periodo, agora]);

  const entradas = useMemo(() => {
    return movimentosFiltradosPorPeriodo
      .filter((item) => isIncomeMovement(item.raw))
      .reduce((sum, item) => sum + item.amount, 0);
  }, [movimentosFiltradosPorPeriodo]);

  const saidas = useMemo(() => {
    return movimentosFiltradosPorPeriodo
      .filter((item) => !isIncomeMovement(item.raw))
      .reduce((sum, item) => sum + item.amount, 0);
  }, [movimentosFiltradosPorPeriodo]);

  const saldo = entradas - saidas;

  const contasReceberPendentes = useMemo(() => {
    return contasReceber.filter(
      (item) =>
        !isPaid(item.status) &&
        !isCanceled(item.status),
    );
  }, [contasReceber]);

  const contasPagarPendentes = useMemo(() => {
    return contasPagar.filter(
      (item) =>
        !isPaid(item.status) &&
        !isCanceled(item.status),
    );
  }, [contasPagar]);

  const totalReceber = contasReceberPendentes.reduce(
    (sum, item) => sum + item.amount,
    0,
  );

  const totalPagar = contasPagarPendentes.reduce(
    (sum, item) => sum + item.amount,
    0,
  );

  const recebimentosAtrasados = contasReceberPendentes.filter(
    (item) => isOverdue(item.status, item.dueDate),
  );

  const pagamentosAtrasados = contasPagarPendentes.filter(
    (item) => isOverdue(item.status, item.dueDate),
  );

  const totalRecebimentosAtrasados =
    recebimentosAtrasados.reduce(
      (sum, item) => sum + item.amount,
      0,
    );

  const totalPagamentosAtrasados =
    pagamentosAtrasados.reduce(
      (sum, item) => sum + item.amount,
      0,
    );

  const movimentosRecentes = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    if (!termo) {
      return movimentosFiltradosPorPeriodo.slice(0, 50);
    }

    return movimentosFiltradosPorPeriodo
      .filter((item) => {
        return (
          item.description
            .toLowerCase()
            .includes(termo) ||
          item.type.toLowerCase().includes(termo) ||
          String(item.amount)
            .toLowerCase()
            .includes(termo)
        );
      })
      .slice(0, 50);
  }, [movimentosFiltradosPorPeriodo, busca]);

  const listaReceber = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    if (!termo) {
      return contasReceberPendentes.slice(0, 100);
    }

    return contasReceberPendentes
      .filter((item) => {
        return (
          item.description
            .toLowerCase()
            .includes(termo) ||
          item.status.toLowerCase().includes(termo) ||
          item.customerName
            ?.toLowerCase()
            .includes(termo)
        );
      })
      .slice(0, 100);
  }, [contasReceberPendentes, busca]);

  const listaPagar = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    if (!termo) {
      return contasPagarPendentes.slice(0, 100);
    }

    return contasPagarPendentes
      .filter((item) => {
        return (
          item.description
            .toLowerCase()
            .includes(termo) ||
          item.status.toLowerCase().includes(termo)
        );
      })
      .slice(0, 100);
  }, [contasPagarPendentes, busca]);

  const hoje = useMemo(() => {
    const today = new Date();

    return movimentos.filter((item) => {
      const date = new Date(item.date);

      return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      );
    });
  }, [movimentos]);

  const recebidoHoje = hoje
    .filter((item) => isIncomeMovement(item.raw))
    .reduce((sum, item) => sum + item.amount, 0);

  const movimentoCount = movimentosFiltradosPorPeriodo.length;

  function statusLabel(status: string) {
    const value = normalizeStatus(status);

    if (isPaid(value)) return "Pago";
    if (isOverdue(value)) return "Atrasado";

    if (
      value === "partial" ||
      value === "parcial"
    ) {
      return "Parcial";
    }

    if (
      value === "pending" ||
      value === "pendente"
    ) {
      return "Pendente";
    }

    return status || "Pendente";
  }

  function statusClass(status: string) {
    if (isPaid(status)) return "status success";
    if (isOverdue(status)) return "status danger";

    if (
      normalizeStatus(status) === "partial" ||
      normalizeStatus(status) === "parcial"
    ) {
      return "status warning";
    }

    return "status neutral";
  }

  function navegarAba(novaAba: Aba) {
    setAba(novaAba);
    setBusca("");
  }

  return (
    <main className="finance-page">
      <style jsx>{`
        .finance-page {
          width: 100%;
          max-width: 1180px;
          margin: 0 auto;
          padding: 30px 28px 50px;
          box-sizing: border-box;
        }

        .top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 24px;
        }

        .eyebrow {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: #2563eb;
          margin-bottom: 7px;
        }

        .title {
          margin: 0;
          font-size: 30px;
          line-height: 1.15;
          font-weight: 800;
          letter-spacing: -.03em;
          color: #0f172a;
        }

        .description {
          margin: 7px 0 0;
          color: #64748b;
          font-size: 14px;
        }

        .top-actions {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .button {
          height: 40px;
          border: 1px solid #dbe3ef;
          background: white;
          color: #0f172a;
          border-radius: 9px;
          padding: 0 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 700;
          transition: .18s;
        }

        .button:hover {
          border-color: #b9c7dc;
          transform: translateY(-1px);
        }

        .button.primary {
          background: #0f172a;
          color: white;
          border-color: #0f172a;
        }

        .button:disabled {
          opacity: .6;
          cursor: not-allowed;
          transform: none;
        }

        .error {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          background: #fff7f7;
          border: 1px solid #fecaca;
          color: #991b1b;
          border-radius: 12px;
          padding: 15px 16px;
          margin-bottom: 18px;
        }

        .error-title {
          font-size: 13px;
          font-weight: 800;
          margin-bottom: 3px;
        }

        .error-message {
          font-size: 12px;
          color: #b91c1c;
          margin-bottom: 10px;
        }

        .error-button {
          height: 32px;
          border: 1px solid #fca5a5;
          background: white;
          color: #b91c1c;
          border-radius: 7px;
          padding: 0 11px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 700;
        }

        .hero {
          border-radius: 16px;
          padding: 23px 25px;
          background: linear-gradient(
            135deg,
            #0f172a 0%,
            #172554 100%
          );
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 30px;
          margin-bottom: 17px;
          box-shadow: 0 12px 28px rgba(15, 23, 42, .13);
        }

        .hero-label {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #bfdbfe;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .08em;
          text-transform: uppercase;
          margin-bottom: 7px;
        }

        .hero-value {
          font-size: 32px;
          line-height: 1;
          font-weight: 850;
          letter-spacing: -.03em;
        }

        .hero-subtitle {
          margin-top: 8px;
          color: #cbd5e1;
          font-size: 12px;
        }

        .hero-side {
          display: flex;
          gap: 34px;
        }

        .hero-side-label {
          color: #94a3b8;
          font-size: 11px;
          margin-bottom: 5px;
        }

        .hero-side-value {
          font-size: 16px;
          font-weight: 800;
        }

        .positive {
          color: #4ade80;
        }

        .negative {
          color: #fca5a5;
        }

        .cards {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 14px;
        }

        .card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 13px;
          box-shadow: 0 3px 12px rgba(15, 23, 42, .035);
        }

        .stat {
          padding: 17px;
          display: flex;
          gap: 13px;
          align-items: center;
          min-height: 78px;
        }

        .icon {
          width: 39px;
          height: 39px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .icon.green {
          background: #ecfdf5;
          color: #16a34a;
        }

        .icon.red {
          background: #fff1f2;
          color: #dc2626;
        }

        .icon.blue {
          background: #eff6ff;
          color: #2563eb;
        }

        .icon.orange {
          background: #fff7ed;
          color: #ea580c;
        }

        .stat-label {
          color: #64748b;
          font-size: 11px;
          margin-bottom: 4px;
        }

        .stat-value {
          color: #0f172a;
          font-size: 17px;
          font-weight: 800;
        }

        .stat-detail {
          color: #94a3b8;
          font-size: 10px;
          margin-top: 3px;
        }

        .alerts {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-bottom: 14px;
        }

        .alert-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 13px;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
        }

        .alert-card.red {
          border-color: #fecaca;
          background: #fffafa;
        }

        .alert-card.orange {
          border-color: #fed7aa;
          background: #fffaf5;
        }

        .alert-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .alert-title {
          font-size: 11px;
          color: #64748b;
          margin-bottom: 3px;
        }

        .alert-value {
          font-size: 15px;
          font-weight: 800;
          color: #0f172a;
        }

        .alert-detail {
          color: #94a3b8;
          font-size: 10px;
          margin-top: 2px;
        }

        .link-button {
          border: 0;
          background: transparent;
          color: #2563eb;
          cursor: pointer;
          font-size: 11px;
          font-weight: 800;
        }

        .tabs {
          display: flex;
          align-items: center;
          gap: 5px;
          background: white;
          border: 1px solid #e2e8f0;
          padding: 5px;
          border-radius: 12px;
          margin-bottom: 14px;
          overflow-x: auto;
        }

        .tab {
          border: 0;
          background: transparent;
          color: #64748b;
          padding: 9px 12px;
          border-radius: 8px;
          cursor: pointer;
          white-space: nowrap;
          font-size: 12px;
          font-weight: 700;
        }

        .tab.active {
          color: #2563eb;
          background: #eff6ff;
        }

        .toolbar {
          display: flex;
          gap: 10px;
          align-items: center;
          margin-bottom: 14px;
        }

        .search {
          flex: 1;
          height: 40px;
          border: 1px solid #dbe3ef;
          background: white;
          border-radius: 9px;
          display: flex;
          align-items: center;
          padding: 0 12px;
          gap: 8px;
        }

        .search input {
          width: 100%;
          border: 0;
          outline: none;
          font-size: 13px;
          color: #0f172a;
          background: transparent;
        }

        .period {
          height: 40px;
          border: 1px solid #dbe3ef;
          border-radius: 9px;
          background: white;
          padding: 0 12px;
          color: #334155;
          outline: none;
          font-size: 12px;
          font-weight: 600;
        }

        .content-card {
          overflow: hidden;
        }

        .content-header {
          padding: 17px 18px;
          border-bottom: 1px solid #eef2f7;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
        }

        .content-title {
          color: #0f172a;
          font-size: 14px;
          font-weight: 800;
        }

        .content-subtitle {
          color: #94a3b8;
          font-size: 10px;
          margin-top: 3px;
        }

        .table-wrap {
          width: 100%;
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 720px;
        }

        th {
          background: #f8fafc;
          color: #64748b;
          text-align: left;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: .04em;
          font-weight: 800;
          padding: 11px 16px;
          border-bottom: 1px solid #e2e8f0;
        }

        td {
          padding: 13px 16px;
          border-bottom: 1px solid #eef2f7;
          color: #334155;
          font-size: 12px;
        }

        tbody tr:hover {
          background: #fafcff;
        }

        .description-cell {
          color: #0f172a;
          font-weight: 700;
        }

        .muted {
          color: #94a3b8;
        }

        .amount-income {
          color: #16a34a;
          font-weight: 800;
        }

        .amount-expense {
          color: #dc2626;
          font-weight: 800;
        }

        .status {
          display: inline-flex;
          align-items: center;
          padding: 4px 8px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 800;
        }

        .status.success {
          background: #ecfdf5;
          color: #15803d;
        }

        .status.danger {
          background: #fef2f2;
          color: #b91c1c;
        }

        .status.warning {
          background: #fffbeb;
          color: #a16207;
        }

        .status.neutral {
          background: #f1f5f9;
          color: #475569;
        }

        .client {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .avatar {
          width: 29px;
          height: 29px;
          border-radius: 50%;
          background: #eff6ff;
          color: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          font-weight: 800;
        }

        .empty {
          padding: 55px 20px;
          text-align: center;
        }

        .empty-icon {
          width: 48px;
          height: 48px;
          margin: 0 auto 12px;
          border-radius: 13px;
          background: #f1f5f9;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .empty-title {
          color: #334155;
          font-size: 13px;
          font-weight: 800;
        }

        .empty-text {
          color: #94a3b8;
          font-size: 11px;
          margin-top: 4px;
        }

        .loading {
          padding: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          gap: 9px;
          font-size: 12px;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .overview-grid {
          display: grid;
          grid-template-columns: 1.15fr .85fr;
          gap: 14px;
        }

        .summary-list {
          padding: 7px 17px 15px;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #eef2f7;
        }

        .summary-row:last-child {
          border-bottom: 0;
        }

        .summary-name {
          display: flex;
          align-items: center;
          gap: 9px;
          color: #334155;
          font-size: 12px;
          font-weight: 600;
        }

        .summary-value {
          color: #0f172a;
          font-size: 12px;
          font-weight: 800;
        }

        @media (max-width: 900px) {
          .cards {
            grid-template-columns: repeat(2, 1fr);
          }

          .overview-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .finance-page {
            padding: 22px 15px 40px;
          }

          .top {
            flex-direction: column;
          }

          .top-actions {
            width: 100%;
          }

          .top-actions .button {
            flex: 1;
          }

          .hero {
            flex-direction: column;
            align-items: flex-start;
          }

          .hero-side {
            width: 100%;
            justify-content: space-between;
          }

          .cards {
            grid-template-columns: 1fr 1fr;
          }

          .alerts {
            grid-template-columns: 1fr;
          }

          .toolbar {
            flex-direction: column;
            align-items: stretch;
          }

          .period {
            width: 100%;
          }
        }

        @media (max-width: 480px) {
          .cards {
            grid-template-columns: 1fr;
          }

          .hero-value {
            font-size: 27px;
          }
        }
      `}</style>

      <div className="top">
        <div>
          <div className="eyebrow">
            <Wallet size={13} />
            Gestão financeira
          </div>

          <h1 className="title">Financeiro</h1>

          <p className="description">
            Controle entradas, saídas, contas a pagar e valores
            a receber.
          </p>
        </div>

        <div className="top-actions">
          <button
            className="button"
            onClick={carregarDados}
            disabled={loading}
          >
            <RefreshCw
              size={15}
              className={loading ? "spin" : ""}
            />
            Atualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="error">
          <AlertCircle size={19} />

          <div>
            <div className="error-title">
              Não foi possível carregar o financeiro
            </div>

            <div className="error-message">
              {error}
            </div>

            <button
              className="error-button"
              onClick={carregarDados}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      <section className="hero">
        <div>
          <div className="hero-label">
            <CircleDollarSign size={13} />
            Saldo atual
          </div>

          <div className="hero-value">
            {money(saldo)}
          </div>

          <div className="hero-subtitle">
            Entradas menos saídas registradas no caixa.
          </div>
        </div>

        <div className="hero-side">
          <div>
            <div className="hero-side-label">
              Entradas
            </div>

            <div className="hero-side-value positive">
              {money(entradas)}
            </div>
          </div>

          <div>
            <div className="hero-side-label">
              Saídas
            </div>

            <div className="hero-side-value negative">
              {money(saidas)}
            </div>
          </div>
        </div>
      </section>

      <section className="cards">
        <div className="card stat">
          <div className="icon green">
            <ArrowUpCircle size={20} />
          </div>

          <div>
            <div className="stat-label">
              Total de entradas
            </div>

            <div className="stat-value">
              {money(entradas)}
            </div>

            <div className="stat-detail">
              {movimentoCount} movimentações
            </div>
          </div>
        </div>

        <div className="card stat">
          <div className="icon red">
            <ArrowDownCircle size={20} />
          </div>

          <div>
            <div className="stat-label">
              Total de saídas
            </div>

            <div className="stat-value">
              {money(saidas)}
            </div>

            <div className="stat-detail">
              {movimentoCount} movimentações
            </div>
          </div>
        </div>

        <div className="card stat">
          <div className="icon blue">
            <CreditCard size={19} />
          </div>

          <div>
            <div className="stat-label">
              Contas a receber
            </div>

            <div className="stat-value">
              {money(totalReceber)}
            </div>

            <div className="stat-detail">
              {contasReceberPendentes.length} pendentes
            </div>
          </div>
        </div>

        <div className="card stat">
          <div className="icon orange">
            <Receipt size={19} />
          </div>

          <div>
            <div className="stat-label">
              Contas a pagar
            </div>

            <div className="stat-value">
              {money(totalPagar)}
            </div>

            <div className="stat-detail">
              {contasPagarPendentes.length} pendentes
            </div>
          </div>
        </div>
      </section>

      <section className="alerts">
        <div className="alert-card red">
          <div className="alert-left">
            <div className="icon red">
              <Clock3 size={19} />
            </div>

            <div>
              <div className="alert-title">
                Recebimentos atrasados
              </div>

              <div className="alert-value">
                {money(totalRecebimentosAtrasados)}
              </div>

              <div className="alert-detail">
                {recebimentosAtrasados.length} contas vencidas
              </div>
            </div>
          </div>

          <button
            className="link-button"
            onClick={() => navegarAba("receber")}
          >
            Ver contas
          </button>
        </div>

        <div className="alert-card orange">
          <div className="alert-left">
            <div className="icon orange">
              <CalendarDays size={19} />
            </div>

            <div>
              <div className="alert-title">
                Pagamentos atrasados
              </div>

              <div className="alert-value">
                {money(totalPagamentosAtrasados)}
              </div>

              <div className="alert-detail">
                {pagamentosAtrasados.length} contas vencidas
              </div>
            </div>
          </div>

          <button
            className="link-button"
            onClick={() => navegarAba("pagar")}
          >
            Ver contas
          </button>
        </div>
      </section>

      <nav className="tabs">
        <button
          className={`tab ${
            aba === "visao" ? "active" : ""
          }`}
          onClick={() => navegarAba("visao")}
        >
          Visão geral
        </button>

        <button
          className={`tab ${
            aba === "entradas" ? "active" : ""
          }`}
          onClick={() => navegarAba("entradas")}
        >
          <ArrowUpCircle
            size={12}
            style={{ verticalAlign: "middle" }}
          />{" "}
          Entradas
        </button>

        <button
          className={`tab ${
            aba === "saidas" ? "active" : ""
          }`}
          onClick={() => navegarAba("saidas")}
        >
          <ArrowDownCircle
            size={12}
            style={{ verticalAlign: "middle" }}
          />{" "}
          Saídas
        </button>

        <button
          className={`tab ${
            aba === "pagar" ? "active" : ""
          }`}
          onClick={() => navegarAba("pagar")}
        >
          Contas a pagar
        </button>

        <button
          className={`tab ${
            aba === "receber" ? "active" : ""
          }`}
          onClick={() => navegarAba("receber")}
        >
          Contas a receber
        </button>
      </nav>

      {aba === "visao" && (
        <>
          <div className="toolbar">
            <div className="search">
              <Search size={16} color="#94a3b8" />

              <input
                value={busca}
                onChange={(e) =>
                  setBusca(e.target.value)
                }
                placeholder="Buscar movimentação..."
              />
            </div>

            <select
              className="period"
              value={periodo}
              onChange={(e) =>
                setPeriodo(
                  e.target.value as
                    | "todos"
                    | "hoje"
                    | "mes"
                    | "ano",
                )
              }
            >
              <option value="mes">
                Este mês
              </option>

              <option value="hoje">
                Hoje
              </option>

              <option value="ano">
                Este ano
              </option>

              <option value="todos">
                Todo o período
              </option>
            </select>
          </div>

          <div className="overview-grid">
            <div className="card content-card">
              <div className="content-header">
                <div>
                  <div className="content-title">
                    Fluxo financeiro
                  </div>

                  <div className="content-subtitle">
                    Resumo das movimentações registradas.
                  </div>
                </div>

                <TrendingUp
                  size={18}
                  color="#2563eb"
                />
              </div>

              <div className="summary-list">
                <div className="summary-row">
                  <div className="summary-name">
                    <ArrowUpCircle
                      size={16}
                      color="#16a34a"
                    />
                    Entradas
                  </div>

                  <div className="summary-value positive">
                    {money(entradas)}
                  </div>
                </div>

                <div className="summary-row">
                  <div className="summary-name">
                    <ArrowDownCircle
                      size={16}
                      color="#dc2626"
                    />
                    Saídas
                  </div>

                  <div className="summary-value negative">
                    {money(saidas)}
                  </div>
                </div>

                <div className="summary-row">
                  <div className="summary-name">
                    <Wallet
                      size={16}
                      color="#2563eb"
                    />
                    Saldo
                  </div>

                  <div
                    className={`summary-value ${
                      saldo >= 0
                        ? "positive"
                        : "negative"
                    }`}
                  >
                    {money(saldo)}
                  </div>
                </div>

                <div className="summary-row">
                  <div className="summary-name">
                    <CalendarDays
                      size={16}
                      color="#ea580c"
                    />
                    Recebido hoje
                  </div>

                  <div className="summary-value">
                    {money(recebidoHoje)}
                  </div>
                </div>
              </div>
            </div>

            <div className="card content-card">
              <div className="content-header">
                <div>
                  <div className="content-title">
                    Contas pendentes
                  </div>

                  <div className="content-subtitle">
                    Valores que ainda precisam ser recebidos
                    ou pagos.
                  </div>
                </div>

                <FileText
                  size={18}
                  color="#64748b"
                />
              </div>

              <div className="summary-list">
                <div className="summary-row">
                  <div className="summary-name">
                    <CreditCard
                      size={16}
                      color="#2563eb"
                    />
                    A receber
                  </div>

                  <div className="summary-value">
                    {money(totalReceber)}
                  </div>
                </div>

                <div className="summary-row">
                  <div className="summary-name">
                    <Receipt
                      size={16}
                      color="#ea580c"
                    />
                    A pagar
                  </div>

                  <div className="summary-value">
                    {money(totalPagar)}
                  </div>
                </div>

                <div className="summary-row">
                  <div className="summary-name">
                    <AlertCircle
                      size={16}
                      color="#dc2626"
                    />
                    Recebimentos atrasados
                  </div>

                  <div className="summary-value negative">
                    {recebimentosAtrasados.length}
                  </div>
                </div>

                <div className="summary-row">
                  <div className="summary-name">
                    <AlertCircle
                      size={16}
                      color="#ea580c"
                    />
                    Pagamentos atrasados
                  </div>

                  <div className="summary-value">
                    {pagamentosAtrasados.length}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            className="card content-card"
            style={{ marginTop: 14 }}
          >
            <div className="content-header">
              <div>
                <div className="content-title">
                  Últimas movimentações
                </div>

                <div className="content-subtitle">
                  Histórico financeiro da empresa.
                </div>
              </div>
            </div>

            {loading ? (
              <div className="loading">
                <RefreshCw
                  size={16}
                  className="spin"
                />
                Carregando financeiro...
              </div>
            ) : movimentosRecentes.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">
                  <Wallet size={22} />
                </div>

                <div className="empty-title">
                  Nenhuma movimentação encontrada
                </div>

                <div className="empty-text">
                  As movimentações financeiras aparecerão aqui.
                </div>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Descrição</th>
                      <th>Tipo</th>
                      <th>Data</th>
                      <th>Valor</th>
                    </tr>
                  </thead>

                  <tbody>
                    {movimentosRecentes.map((item) => {
                      const income =
                        isIncomeMovement(item.raw);

                      return (
                        <tr key={item.id}>
                          <td className="description-cell">
                            {item.description}
                          </td>

                          <td>
                            {income ? (
                              <span className="status success">
                                Entrada
                              </span>
                            ) : (
                              <span className="status danger">
                                Saída
                              </span>
                            )}
                          </td>

                          <td>
                            {formatDate(item.date)}
                          </td>

                          <td
                            className={
                              income
                                ? "amount-income"
                                : "amount-expense"
                            }
                          >
                            {income ? "+" : "-"}
                            {money(item.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {aba === "entradas" && (
        <div className="card content-card">
          <div className="content-header">
            <div>
              <div className="content-title">
                Entradas financeiras
              </div>

              <div className="content-subtitle">
                Receitas e valores recebidos no período.
              </div>
            </div>

            <div className="positive">
              {money(entradas)}
            </div>
          </div>

          <div className="table-wrap">
            {movimentosRecentes.filter((item) =>
              isIncomeMovement(item.raw),
            ).length === 0 ? (
              <div className="empty">
                <div className="empty-icon">
                  <ArrowUpCircle size={22} />
                </div>

                <div className="empty-title">
                  Nenhuma entrada encontrada
                </div>

                <div className="empty-text">
                  Os recebimentos registrados aparecerão aqui.
                </div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th>Data</th>
                    <th>Valor</th>
                  </tr>
                </thead>

                <tbody>
                  {movimentosRecentes
                    .filter((item) =>
                      isIncomeMovement(item.raw),
                    )
                    .map((item) => (
                      <tr key={item.id}>
                        <td className="description-cell">
                          {item.description}
                        </td>

                        <td>
                          {formatDate(item.date)}
                        </td>

                        <td className="amount-income">
                          +{money(item.amount)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {aba === "saidas" && (
        <div className="card content-card">
          <div className="content-header">
            <div>
              <div className="content-title">
                Saídas financeiras
              </div>

              <div className="content-subtitle">
                Despesas e valores pagos no período.
              </div>
            </div>

            <div className="negative">
              {money(saidas)}
            </div>
          </div>

          <div className="table-wrap">
            {movimentosRecentes.filter(
              (item) => !isIncomeMovement(item.raw),
            ).length === 0 ? (
              <div className="empty">
                <div className="empty-icon">
                  <ArrowDownCircle size={22} />
                </div>

                <div className="empty-title">
                  Nenhuma saída encontrada
                </div>

                <div className="empty-text">
                  Os pagamentos e despesas aparecerão aqui.
                </div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th>Data</th>
                    <th>Valor</th>
                  </tr>
                </thead>

                <tbody>
                  {movimentosRecentes
                    .filter(
                      (item) =>
                        !isIncomeMovement(item.raw),
                    )
                    .map((item) => (
                      <tr key={item.id}>
                        <td className="description-cell">
                          {item.description}
                        </td>

                        <td>
                          {formatDate(item.date)}
                        </td>

                        <td className="amount-expense">
                          -{money(item.amount)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {aba === "pagar" && (
        <div className="card content-card">
          <div className="content-header">
            <div>
              <div className="content-title">
                Contas a pagar
              </div>

              <div className="content-subtitle">
                Compromissos financeiros pendentes.
              </div>
            </div>

            <div className="negative">
              {money(totalPagar)}
            </div>
          </div>

          <div className="table-wrap">
            {listaPagar.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">
                  <CheckCircle2 size={22} />
                </div>

                <div className="empty-title">
                  Nenhuma conta a pagar encontrada
                </div>

                <div className="empty-text">
                  Não existem contas pendentes para exibir.
                </div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th>Vencimento</th>
                    <th>Status</th>
                    <th>Valor</th>
                  </tr>
                </thead>

                <tbody>
                  {listaPagar.map((item) => (
                    <tr key={item.id}>
                      <td className="description-cell">
                        {item.description}
                      </td>

                      <td>
                        {formatDate(item.dueDate)}
                      </td>

                      <td>
                        <span
                          className={statusClass(
                            item.status,
                          )}
                        >
                          {statusLabel(item.status)}
                        </span>
                      </td>

                      <td className="amount-expense">
                        {money(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {aba === "receber" && (
        <div className="card content-card">
          <div className="content-header">
            <div>
              <div className="content-title">
                Contas a receber
              </div>

              <div className="content-subtitle">
                Valores que sua empresa ainda precisa receber.
              </div>
            </div>

            <div className="positive">
              {money(totalReceber)}
            </div>
          </div>

          <div className="table-wrap">
            {listaReceber.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">
                  <CheckCircle2 size={22} />
                </div>

                <div className="empty-title">
                  Nenhuma conta a receber encontrada
                </div>

                <div className="empty-text">
                  Não existem valores pendentes para exibir.
                </div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Descrição</th>
                    <th>Vencimento</th>
                    <th>Status</th>
                    <th>Valor</th>
                  </tr>
                </thead>

                <tbody>
                  {listaReceber.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {item.customerName ? (
                          <div className="client">
                            <div className="avatar">
                              {getInitials(
                                item.customerName,
                              )}
                            </div>

                            <span>
                              {item.customerName}
                            </span>
                          </div>
                        ) : (
                          <span className="muted">
                            Não informado
                          </span>
                        )}
                      </td>

                      <td className="description-cell">
                        {item.description}
                      </td>

                      <td>
                        {formatDate(item.dueDate)}
                      </td>

                      <td>
                        <span
                          className={statusClass(
                            item.status,
                          )}
                        >
                          {statusLabel(item.status)}
                        </span>
                      </td>

                      <td className="amount-income">
                        {money(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {loading && !error && (
        <div
          style={{
            marginTop: 14,
            textAlign: "center",
            color: "#94a3b8",
            fontSize: 11,
          }}
        >
          Atualizando dados financeiros...
        </div>
      )}

      <div
        style={{
          marginTop: 18,
          textAlign: "right",
          color: "#94a3b8",
          fontSize: 10,
        }}
      >
        {clientes.length} clientes cadastrados
      </div>
    </main>
  );
}