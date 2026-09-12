"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  CheckCircle2,
  Clock3,
  DollarSign,
  Eye,
  RefreshCw,
  Search,
  XCircle,
  Wallet,
  X,
  Building2,
  KeyRound,
  CalendarDays,
  FileText,
  AlertCircle,
} from "lucide-react";

type WithdrawalStatus =
  | "PENDING"
  | "APPROVED"
  | "PAID"
  | "REJECTED"
  | "CANCELLED";

type Withdrawal = {
  id: string;
  company_id: string;
  amount: number;
  source: string;
  status: WithdrawalStatus;
  pix_key_type: string | null;
  pix_key: string | null;
  notes: string | null;
  requested_at: string;
  reviewed_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  company?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
};

type Stats = {
  total: number;
  pending: number;
  approved: number;
  paid: number;
  rejected: number;
  cancelled: number;
  pendingAmount: number;
  approvedAmount: number;
  paidAmount: number;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusLabel(status: WithdrawalStatus) {
  switch (status) {
    case "PENDING":
      return "Pendente";
    case "APPROVED":
      return "Aprovado";
    case "PAID":
      return "Pago";
    case "REJECTED":
      return "Rejeitado";
    case "CANCELLED":
      return "Cancelado";
    default:
      return status;
  }
}

function statusClasses(status: WithdrawalStatus) {
  switch (status) {
    case "PENDING":
      return "bg-amber-50 text-amber-700 border-amber-200";

    case "APPROVED":
      return "bg-blue-50 text-blue-700 border-blue-200";

    case "PAID":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "REJECTED":
      return "bg-red-50 text-red-700 border-red-200";

    case "CANCELLED":
      return "bg-slate-100 text-slate-600 border-slate-200";

    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

export default function MasterSaquesPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    approved: 0,
    paid: 0,
    rejected: 0,
    cancelled: 0,
    pendingAmount: 0,
    approvedAmount: 0,
    paidAmount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | WithdrawalStatus>(
    "ALL"
  );

  const [selected, setSelected] = useState<Withdrawal | null>(null);

  const [updating, setUpdating] = useState(false);

  async function loadWithdrawals(showRefresh = false) {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetch("/api/master/saques", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao carregar saques.");
      }

      setWithdrawals(data.withdrawals || []);
      setStats(
        data.stats || {
          total: 0,
          pending: 0,
          approved: 0,
          paid: 0,
          rejected: 0,
          cancelled: 0,
          pendingAmount: 0,
          approvedAmount: 0,
          paidAmount: 0,
        }
      );
    } catch (error) {
      console.error("[MASTER SAQUES]", error);
      alert(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os saques."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadWithdrawals();
  }, []);

  async function updateStatus(
    withdrawal: Withdrawal,
    newStatus: WithdrawalStatus
  ) {
    const confirmationMessage =
      newStatus === "APPROVED"
        ? "Deseja aprovar este saque?"
        : newStatus === "PAID"
          ? "Confirma que o valor foi enviado para a chave PIX?"
          : newStatus === "REJECTED"
            ? "Deseja rejeitar este saque?"
            : newStatus === "CANCELLED"
              ? "Deseja cancelar este saque?"
              : "";

    if (confirmationMessage && !window.confirm(confirmationMessage)) {
      return;
    }

    try {
      setUpdating(true);

      const response = await fetch("/api/master/saques", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: withdrawal.id,
          status: newStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Não foi possível atualizar o saque.");
      }

      setSelected(data.withdrawal || null);

      await loadWithdrawals(true);
    } catch (error) {
      console.error("[MASTER SAQUES UPDATE]", error);

      alert(
        error instanceof Error
          ? error.message
          : "Erro ao atualizar o saque."
      );
    } finally {
      setUpdating(false);
    }
  }

  const filteredWithdrawals = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();

    return withdrawals.filter((item) => {
      const matchesStatus =
        statusFilter === "ALL" || item.status === statusFilter;

      if (!matchesStatus) return false;

      if (!normalizedSearch) return true;

      const companyName = item.company?.name || "";
      const companyEmail = item.company?.email || "";
      const pixKey = item.pix_key || "";
      const amount = String(item.amount || "");

      return (
        companyName.toLowerCase().includes(normalizedSearch) ||
        companyEmail.toLowerCase().includes(normalizedSearch) ||
        pixKey.toLowerCase().includes(normalizedSearch) ||
        amount.includes(normalizedSearch)
      );
    });
  }, [withdrawals, search, statusFilter]);

  return (
    <main className="min-h-screen bg-[#f5f7fb]">
      {/* HEADER */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1600px] px-6 py-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
                <Wallet size={17} />
                Administração
                <span>/</span>
                Saques
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Saques
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Controle e aprovação dos saques solicitados pelas empresas.
              </p>
            </div>

            <button
              onClick={() => loadWithdrawals(true)}
              disabled={refreshing}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={17}
                className={refreshing ? "animate-spin" : ""}
              />
              Atualizar
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-6 py-6 lg:px-8">
        {/* INFO RULE */}
        <div className="mb-6 flex gap-4 rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <AlertCircle size={20} />
          </div>

          <div>
            <h2 className="font-bold text-blue-900">
              Regra financeira do LoanControl
            </h2>

            <p className="mt-1 max-w-4xl text-sm leading-6 text-blue-800">
              Os saques desta área representam valores originados de
              pagamentos realizados pelo cliente dentro do site via PIX.
              Pagamentos registrados manualmente como dinheiro/espécie pela
              empresa não devem gerar saldo sacável.
            </p>
          </div>
        </div>

        {/* CARDS */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            title="Total solicitado"
            value={formatMoney(
              withdrawals.reduce((sum, item) => sum + Number(item.amount), 0)
            )}
            subtitle={`${stats.total} solicitações`}
            icon={DollarSign}
          />

          <StatCard
            title="Pendentes"
            value={formatMoney(stats.pendingAmount)}
            subtitle={`${stats.pending} aguardando análise`}
            icon={Clock3}
          />

          <StatCard
            title="Aprovados"
            value={formatMoney(stats.approvedAmount)}
            subtitle={`${stats.approved} aguardando pagamento`}
            icon={CheckCircle2}
          />

          <StatCard
            title="Pagos"
            value={formatMoney(stats.paidAmount)}
            subtitle={`${stats.paid} saques concluídos`}
            icon={Wallet}
          />

          <StatCard
            title="Rejeitados"
            value={String(stats.rejected)}
            subtitle={`${stats.cancelled} cancelados`}
            icon={XCircle}
          />
        </div>

        {/* CONTENT */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* FILTERS */}
          <div className="border-b border-slate-200 p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="relative w-full xl:max-w-md">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar empresa, e-mail, PIX ou valor..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <FilterButton
                  active={statusFilter === "ALL"}
                  onClick={() => setStatusFilter("ALL")}
                >
                  Todos
                </FilterButton>

                <FilterButton
                  active={statusFilter === "PENDING"}
                  onClick={() => setStatusFilter("PENDING")}
                >
                  Pendentes
                </FilterButton>

                <FilterButton
                  active={statusFilter === "APPROVED"}
                  onClick={() => setStatusFilter("APPROVED")}
                >
                  Aprovados
                </FilterButton>

                <FilterButton
                  active={statusFilter === "PAID"}
                  onClick={() => setStatusFilter("PAID")}
                >
                  Pagos
                </FilterButton>

                <FilterButton
                  active={statusFilter === "REJECTED"}
                  onClick={() => setStatusFilter("REJECTED")}
                >
                  Rejeitados
                </FilterButton>
              </div>
            </div>
          </div>

          {/* TABLE */}
          {loading ? (
            <div className="flex min-h-[360px] items-center justify-center">
              <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
                <RefreshCw size={18} className="animate-spin" />
                Carregando saques...
              </div>
            </div>
          ) : filteredWithdrawals.length === 0 ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <ArrowDownToLine size={28} />
              </div>

              <h3 className="mt-5 text-lg font-bold text-slate-900">
                Nenhum saque encontrado
              </h3>

              <p className="mt-1 max-w-md text-sm text-slate-500">
                Ainda não existem solicitações de saque que correspondam aos
                filtros selecionados.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70">
                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Empresa
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Valor
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      PIX
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Solicitação
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Status
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                      Ação
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredWithdrawals.map((withdrawal) => (
                    <tr
                      key={withdrawal.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                            <Building2 size={18} />
                          </div>

                          <div>
                            <div className="font-semibold text-slate-900">
                              {withdrawal.company?.name || "Empresa"}
                            </div>

                            <div className="mt-0.5 text-xs text-slate-500">
                              {withdrawal.company?.email || "Sem e-mail"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900">
                          {formatMoney(Number(withdrawal.amount))}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          Origem: PIX no site
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <KeyRound size={15} className="text-slate-400" />

                          <div>
                            <div className="text-sm font-medium text-slate-700">
                              {withdrawal.pix_key_type || "PIX"}
                            </div>

                            <div className="max-w-[230px] truncate text-xs text-slate-500">
                              {withdrawal.pix_key || "Não informado"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <CalendarDays size={15} className="text-slate-400" />
                          {formatDate(withdrawal.requested_at)}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-bold ${statusClasses(
                            withdrawal.status
                          )}`}
                        >
                          {statusLabel(withdrawal.status)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => setSelected(withdrawal)}
                          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          <Eye size={16} />
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && filteredWithdrawals.length > 0 && (
            <div className="border-t border-slate-200 bg-slate-50/50 px-5 py-4">
              <p className="text-sm text-slate-500">
                Exibindo{" "}
                <strong className="text-slate-700">
                  {filteredWithdrawals.length}
                </strong>{" "}
                de{" "}
                <strong className="text-slate-700">
                  {withdrawals.length}
                </strong>{" "}
                solicitações.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL */}
      {selected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Detalhes do saque
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  ID: {selected.id}
                </p>
              </div>

              <button
                onClick={() => setSelected(null)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 p-6">
              {/* VALUE */}
              <div className="rounded-2xl bg-slate-900 p-6 text-white">
                <p className="text-sm text-slate-300">Valor solicitado</p>

                <p className="mt-2 text-3xl font-bold">
                  {formatMoney(Number(selected.amount))}
                </p>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-slate-300">
                    Status atual
                  </span>

                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClasses(
                      selected.status
                    )}`}
                  >
                    {statusLabel(selected.status)}
                  </span>
                </div>
              </div>

              {/* COMPANY */}
              <InfoSection title="Empresa" icon={Building2}>
                <InfoRow
                  label="Empresa"
                  value={selected.company?.name || "Não informado"}
                />

                <InfoRow
                  label="E-mail"
                  value={selected.company?.email || "Não informado"}
                />

                <InfoRow
                  label="Telefone"
                  value={selected.company?.phone || "Não informado"}
                />
              </InfoSection>

              {/* PIX */}
              <InfoSection title="Dados do PIX" icon={KeyRound}>
                <InfoRow
                  label="Tipo da chave"
                  value={selected.pix_key_type || "Não informado"}
                />

                <InfoRow
                  label="Chave PIX"
                  value={selected.pix_key || "Não informado"}
                  highlight
                />

                <InfoRow
                  label="Origem"
                  value="Pagamento realizado dentro do site via PIX"
                />
              </InfoSection>

              {/* DATES */}
              <InfoSection title="Histórico" icon={CalendarDays}>
                <InfoRow
                  label="Solicitado em"
                  value={formatDate(selected.requested_at)}
                />

                <InfoRow
                  label="Analisado em"
                  value={formatDate(selected.reviewed_at)}
                />

                <InfoRow
                  label="Pago em"
                  value={formatDate(selected.paid_at)}
                />
              </InfoSection>

              {/* NOTES */}
              {selected.notes && (
                <InfoSection title="Observações" icon={FileText}>
                  <p className="text-sm leading-6 text-slate-600">
                    {selected.notes}
                  </p>
                </InfoSection>
              )}

              {/* ACTIONS */}
              {selected.status !== "PAID" &&
                selected.status !== "REJECTED" &&
                selected.status !== "CANCELLED" && (
                  <div className="border-t border-slate-200 pt-5">
                    <p className="mb-3 text-sm font-bold text-slate-900">
                      Ações administrativas
                    </p>

                    <div className="grid gap-3 sm:grid-cols-3">
                      {selected.status === "PENDING" && (
                        <>
                          <button
                            disabled={updating}
                            onClick={() =>
                              updateStatus(selected, "APPROVED")
                            }
                            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
                          >
                            <CheckCircle2 size={17} />
                            Aprovar
                          </button>

                          <button
                            disabled={updating}
                            onClick={() =>
                              updateStatus(selected, "REJECTED")
                            }
                            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-red-50 px-4 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                          >
                            <XCircle size={17} />
                            Rejeitar
                          </button>
                        </>
                      )}

                      {selected.status === "APPROVED" && (
                        <button
                          disabled={updating}
                          onClick={() => updateStatus(selected, "PAID")}
                          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <CheckCircle2 size={17} />
                          Marcar como pago
                        </button>
                      )}

                      {(selected.status === "PENDING" ||
                        selected.status === "APPROVED") && (
                        <button
                          disabled={updating}
                          onClick={() =>
                            updateStatus(selected, "CANCELLED")
                          }
                          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>

                    {updating && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                        <RefreshCw size={15} className="animate-spin" />
                        Atualizando solicitação...
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
        active
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function InfoSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Icon size={17} className="text-slate-500" />

        <h3 className="font-bold text-slate-900">{title}</h3>
      </div>

      <div className="space-y-3">{children}</div>
    </section>
  );
}

function InfoRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-slate-500">{label}</span>

      <span
        className={`text-sm font-semibold ${
          highlight ? "break-all text-blue-700" : "text-slate-800"
        }`}
      >
        {value}
      </span>
    </div>
  );
}