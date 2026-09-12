"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  Eye,
  X,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  XCircle,
  CreditCard,
  Building2,
  CalendarDays,
  Wallet,
  ShieldCheck,
  Loader2,
  ChevronDown,
} from "lucide-react";

type Subscription = {
  id: string;
  company_id: string;
  company_name: string;
  company_email: string | null;
  company_phone: string | null;

  plan_id: string | null;
  plan_name: string;
  plan_price: number;
  trial_days: number;

  status: string;

  trial_started_at: string | null;
  trial_ends_at: string | null;

  current_period_start: string | null;
  current_period_end: string | null;

  mercado_pago_subscription_id: string | null;

  created_at: string;
  updated_at: string;

  days_remaining: number | null;
};

type Stats = {
  total: number;
  active: number;
  trial: number;
  expired: number;
  past_due: number;
  cancelled: number;
  monthly_revenue: number;
};

const STATUS_OPTIONS = [
  {
    value: "TRIAL",
    label: "Período de teste",
  },
  {
    value: "ACTIVE",
    label: "Ativa",
  },
  {
    value: "PAST_DUE",
    label: "Inadimplente",
  },
  {
    value: "CANCELLED",
    label: "Cancelada",
  },
  {
    value: "EXPIRED",
    label: "Expirada",
  },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("pt-BR");
}

function statusInfo(status: string) {
  switch (status) {
    case "ACTIVE":
      return {
        label: "Ativa",
        icon: CheckCircle2,
        className:
          "bg-emerald-50 text-emerald-700 border-emerald-200",
      };

    case "TRIAL":
      return {
        label: "Em teste",
        icon: Clock3,
        className:
          "bg-blue-50 text-blue-700 border-blue-200",
      };

    case "PAST_DUE":
      return {
        label: "Inadimplente",
        icon: AlertTriangle,
        className:
          "bg-amber-50 text-amber-700 border-amber-200",
      };

    case "CANCELLED":
      return {
        label: "Cancelada",
        icon: XCircle,
        className:
          "bg-slate-100 text-slate-600 border-slate-200",
      };

    case "EXPIRED":
      return {
        label: "Expirada",
        icon: XCircle,
        className:
          "bg-red-50 text-red-700 border-red-200",
      };

    default:
      return {
        label: status || "Desconhecido",
        icon: AlertTriangle,
        className:
          "bg-slate-100 text-slate-600 border-slate-200",
      };
  }
}

function daysText(days: number | null, status: string) {
  if (status === "TRIAL") {
    if (days === null) return "—";

    if (days < 0) {
      return `Expirado há ${Math.abs(days)} dia${
        Math.abs(days) === 1 ? "" : "s"
      }`;
    }

    if (days === 0) {
      return "Expira hoje";
    }

    return `${days} dia${days === 1 ? "" : "s"} restantes`;
  }

  if (status === "ACTIVE") {
    if (days === null) return "Ativa";

    if (days < 0) {
      return "Período vencido";
    }

    if (days === 0) {
      return "Vence hoje";
    }

    return `${days} dia${days === 1 ? "" : "s"} restantes`;
  }

  return "—";
}

export default function MasterAssinaturasPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    active: 0,
    trial: 0,
    expired: 0,
    past_due: 0,
    cancelled: 0,
    monthly_revenue: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [selected, setSelected] = useState<Subscription | null>(null);

  const [savingStatus, setSavingStatus] = useState(false);

  async function loadSubscriptions(showRefresh = false) {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetch("/api/master/assinaturas", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Não foi possível carregar as assinaturas."
        );
      }

      setSubscriptions(data.subscriptions || []);

      setStats(
        data.stats || {
          total: 0,
          active: 0,
          trial: 0,
          expired: 0,
          past_due: 0,
          cancelled: 0,
          monthly_revenue: 0,
        }
      );
    } catch (error) {
      console.error("[ASSINATURAS]", error);
      alert(
        error instanceof Error
          ? error.message
          : "Erro ao carregar assinaturas."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const filteredSubscriptions = useMemo(() => {
    const term = search.trim().toLowerCase();

    return subscriptions.filter((subscription) => {
      const matchesSearch =
        !term ||
        subscription.company_name.toLowerCase().includes(term) ||
        subscription.plan_name.toLowerCase().includes(term) ||
        (subscription.company_email || "")
          .toLowerCase()
          .includes(term);

      const matchesStatus =
        statusFilter === "ALL" ||
        subscription.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [subscriptions, search, statusFilter]);

  async function updateStatus(
    subscription: Subscription,
    newStatus: string
  ) {
    if (!newStatus || newStatus === subscription.status) return;

    const confirmed = window.confirm(
      `Alterar a assinatura de "${subscription.company_name}" para "${statusInfo(
        newStatus
      ).label}"?`
    );

    if (!confirmed) return;

    try {
      setSavingStatus(true);

      const response = await fetch("/api/master/assinaturas", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: subscription.id,
          status: newStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Não foi possível alterar a assinatura."
        );
      }

      setSubscriptions((current) =>
        current.map((item) =>
          item.id === subscription.id
            ? {
                ...item,
                status: newStatus,
                updated_at: new Date().toISOString(),
              }
            : item
        )
      );

      setSelected((current) =>
        current && current.id === subscription.id
          ? {
              ...current,
              status: newStatus,
              updated_at: new Date().toISOString(),
            }
          : current
      );

      await loadSubscriptions(true);
    } catch (error) {
      console.error("[ASSINATURAS] status", error);

      alert(
        error instanceof Error
          ? error.message
          : "Erro ao alterar status."
      );
    } finally {
      setSavingStatus(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <div className="mx-auto max-w-[1600px] px-6 py-7 lg:px-8">
        {/* HEADER */}
        <div className="mb-7 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
              <ShieldCheck size={17} />
              Administração Master
              <span className="text-slate-300">/</span>
              Assinaturas
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Assinaturas
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Controle os planos, períodos de teste e status das empresas.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadSubscriptions(true)}
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

        {/* STATS */}
        <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            title="Total"
            value={stats.total}
            description="Assinaturas cadastradas"
            icon={CreditCard}
          />

          <StatCard
            title="Ativas"
            value={stats.active}
            description="Assinaturas pagantes"
            icon={CheckCircle2}
            iconClass="text-emerald-600"
          />

          <StatCard
            title="Em teste"
            value={stats.trial}
            description="Períodos gratuitos"
            icon={Clock3}
            iconClass="text-blue-600"
          />

          <StatCard
            title="Atenção"
            value={stats.past_due + stats.expired}
            description="Inadimplentes ou expiradas"
            icon={AlertTriangle}
            iconClass="text-amber-600"
          />

          <StatCard
            title="Receita mensal"
            value={formatCurrency(stats.monthly_revenue)}
            description="Estimativa das assinaturas ativas"
            icon={Wallet}
            iconClass="text-violet-600"
            isCurrency
          />
        </div>

        {/* TOOLBAR */}
        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search
                size={18}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar empresa, plano ou e-mail..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value)
                  }
                  className="h-11 min-w-[190px] appearance-none rounded-xl border border-slate-200 bg-white pl-4 pr-10 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-400"
                >
                  <option value="ALL">Todos os status</option>
                  {STATUS_OPTIONS.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  size={17}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>

              <div className="flex h-11 items-center rounded-xl bg-slate-100 px-4 text-sm font-medium text-slate-600">
                {filteredSubscriptions.length} resultado
                {filteredSubscriptions.length === 1 ? "" : "s"}
              </div>
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex min-h-[420px] items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-slate-500">
                <Loader2
                  size={30}
                  className="animate-spin"
                />
                <span className="text-sm font-medium">
                  Carregando assinaturas...
                </span>
              </div>
            </div>
          ) : filteredSubscriptions.length === 0 ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <CreditCard
                  size={25}
                  className="text-slate-400"
                />
              </div>

              <h3 className="text-base font-bold text-slate-900">
                Nenhuma assinatura encontrada
              </h3>

              <p className="mt-1 max-w-md text-sm text-slate-500">
                Tente alterar os filtros ou aguarde novas empresas
                cadastrarem seus planos.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Empresa
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Plano
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Status
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Período
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Vencimento
                    </th>

                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredSubscriptions.map((subscription) => {
                    const status = statusInfo(subscription.status);
                    const StatusIcon = status.icon;

                    const periodEnd =
                      subscription.status === "TRIAL"
                        ? subscription.trial_ends_at
                        : subscription.current_period_end ||
                          subscription.trial_ends_at;

                    return (
                      <tr
                        key={subscription.id}
                        className="transition hover:bg-slate-50/70"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                              <Building2 size={19} />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-900">
                                {subscription.company_name}
                              </p>

                              <p className="mt-0.5 max-w-[250px] truncate text-xs text-slate-500">
                                {subscription.company_email ||
                                  "Sem e-mail cadastrado"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-slate-800">
                              {subscription.plan_name}
                            </p>

                            <p className="mt-0.5 text-xs text-slate-500">
                              {formatCurrency(subscription.plan_price)}
                              /mês
                            </p>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${status.className}`}
                          >
                            <StatusIcon size={14} />
                            {status.label}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <CalendarDays
                              size={16}
                              className="text-slate-400"
                            />

                            {subscription.status === "TRIAL"
                              ? `Teste: ${subscription.trial_days} dias`
                              : subscription.current_period_start
                              ? formatDate(
                                  subscription.current_period_start
                                )
                              : "—"}
                          </div>

                          {subscription.days_remaining !== null &&
                            (subscription.status === "TRIAL" ||
                              subscription.status === "ACTIVE") && (
                              <p className="mt-1 pl-6 text-xs font-medium text-slate-400">
                                {daysText(
                                  subscription.days_remaining,
                                  subscription.status
                                )}
                              </p>
                            )}
                        </td>

                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-semibold text-slate-700">
                              {formatDate(periodEnd)}
                            </p>

                            {subscription.status === "TRIAL" &&
                              subscription.days_remaining !== null && (
                                <p className="mt-0.5 text-xs text-slate-400">
                                  Fim do teste
                                </p>
                              )}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() =>
                                setSelected(subscription)
                              }
                              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                            >
                              <Eye size={15} />
                              Ver detalhes
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelected(null);
            }
          }}
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            {/* MODAL HEADER */}
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Detalhes da assinatura
                </p>

                <h2 className="text-xl font-bold text-slate-950">
                  {selected.company_name}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {selected.company_email ||
                    "Sem e-mail cadastrado"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelected(null)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={19} />
              </button>
            </div>

            {/* MODAL CONTENT */}
            <div className="max-h-[70vh] overflow-y-auto p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoBox
                  icon={CreditCard}
                  label="Plano"
                  value={selected.plan_name}
                  extra={formatCurrency(selected.plan_price) + "/mês"}
                />

                <InfoBox
                  icon={CalendarDays}
                  label="Status"
                  value={statusInfo(selected.status).label}
                />

                <InfoBox
                  icon={Clock3}
                  label="Início do teste"
                  value={formatDate(
                    selected.trial_started_at
                  )}
                />

                <InfoBox
                  icon={CalendarDays}
                  label="Fim do teste"
                  value={formatDate(
                    selected.trial_ends_at
                  )}
                />

                <InfoBox
                  icon={CalendarDays}
                  label="Início do período"
                  value={formatDate(
                    selected.current_period_start
                  )}
                />

                <InfoBox
                  icon={CalendarDays}
                  label="Fim do período"
                  value={formatDate(
                    selected.current_period_end
                  )}
                />
              </div>

              {selected.mercado_pago_subscription_id && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Mercado Pago
                  </p>

                  <p className="mt-1 break-all font-mono text-xs text-slate-600">
                    {selected.mercado_pago_subscription_id}
                  </p>
                </div>
              )}

              {/* STATUS */}
              <div className="mt-6 rounded-2xl border border-slate-200 p-4">
                <div className="mb-3">
                  <h3 className="text-sm font-bold text-slate-900">
                    Alterar status
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Esta alteração é feita diretamente pela
                    Administração Master.
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {STATUS_OPTIONS.map((option) => {
                    const info = statusInfo(option.value);
                    const Icon = info.icon;
                    const isCurrent =
                      selected.status === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        disabled={
                          savingStatus || isCurrent
                        }
                        onClick={() =>
                          updateStatus(
                            selected,
                            option.value
                          )
                        }
                        className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                          isCurrent
                            ? "cursor-default border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                        } disabled:opacity-60`}
                      >
                        <Icon size={17} />
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* COMPANY */}
              <div className="mt-4 rounded-2xl border border-slate-200 p-4">
                <h3 className="mb-3 text-sm font-bold text-slate-900">
                  Dados da empresa
                </h3>

                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailRow
                    label="Empresa"
                    value={selected.company_name}
                  />

                  <DetailRow
                    label="Telefone"
                    value={
                      selected.company_phone || "Não informado"
                    }
                  />

                  <DetailRow
                    label="Criada em"
                    value={formatDate(selected.created_at)}
                  />

                  <DetailRow
                    label="Última atualização"
                    value={formatDate(selected.updated_at)}
                  />
                </div>
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div className="flex items-center justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="h-10 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                Fechar
              </button>
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
  description,
  icon: Icon,
  iconClass = "text-slate-600",
  isCurrency = false,
}: {
  title: string;
  value: number | string;
  description: string;
  icon: React.ElementType;
  iconClass?: string;
  isCurrency?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-500">
            {title}
          </p>

          <p
            className={`mt-1 font-bold tracking-tight text-slate-950 ${
              isCurrency ? "text-2xl" : "text-3xl"
            }`}
          >
            {value}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
          <Icon size={20} className={iconClass} />
        </div>
      </div>

      <p className="text-xs text-slate-400">
        {description}
      </p>
    </div>
  );
}

function InfoBox({
  icon: Icon,
  label,
  value,
  extra,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  extra?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
        <Icon size={17} />
      </div>

      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 font-bold text-slate-900">
        {value}
      </p>

      {extra && (
        <p className="mt-0.5 text-xs text-slate-500">
          {extra}
        </p>
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-semibold text-slate-700">
        {value}
      </p>
    </div>
  );
}