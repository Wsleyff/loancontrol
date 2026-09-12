"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  DollarSign,
  RefreshCw,
  TrendingUp,
  Users,
  Wallet,
  AlertTriangle,
  XCircle,
} from "lucide-react";

type PlanBreakdown = {
  id: string;
  name: string;
  price: number;
  active_count: number;
  trial_count: number;
  mrr: number;
};

type RecentSubscription = {
  id: string;
  company_id: string;
  company_name: string;
  company_email: string | null;
  plan_id: string;
  plan_name: string;
  price: number;
  status: string;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  mercado_pago_subscription_id: string | null;
  created_at: string;
};

type FinanceData = {
  generated_at: string;

  financial: {
    mrr: number;
    trial_potential: number;
    potential_monthly_revenue: number;
    received_revenue: number | null;
    received_revenue_available: boolean;
  };

  stats: {
    total_companies: number;
    companies_with_subscription: number;
    active_count: number;
    trial_count: number;
    past_due_count: number;
    expired_count: number;
    cancelled_count: number;
    trial_expired_count: number;
    active_plans: number;
    new_subscriptions_30_days: number;
  };

  plan_breakdown: PlanBreakdown[];

  recent_subscriptions: RecentSubscription[];
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("pt-BR");
}

function getStatus(status: string) {
  const normalized = String(status || "").toUpperCase();

  if (normalized === "ACTIVE") {
    return {
      label: "Ativa",
      className:
        "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  }

  if (normalized === "TRIAL") {
    return {
      label: "Teste grátis",
      className: "bg-blue-50 text-blue-700 border-blue-200",
    };
  }

  if (normalized === "PAST_DUE") {
    return {
      label: "Em atraso",
      className:
        "bg-amber-50 text-amber-700 border-amber-200",
    };
  }

  if (normalized === "EXPIRED") {
    return {
      label: "Expirada",
      className: "bg-slate-100 text-slate-700 border-slate-200",
    };
  }

  if (normalized === "CANCELLED") {
    return {
      label: "Cancelada",
      className: "bg-red-50 text-red-700 border-red-200",
    };
  }

  return {
    label: status || "Desconhecido",
    className: "bg-slate-50 text-slate-700 border-slate-200",
  };
}

function StatCard({
  title,
  value,
  description,
  icon,
  tone = "default",
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  tone?: "default" | "green" | "blue" | "amber" | "red";
}) {
  const tones = {
    default: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-700",
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>

          <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            {value}
          </h3>

          <p className="mt-2 text-xs text-slate-500">
            {description}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function MasterFinanceiroPage() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function loadFinance() {
    try {
      setError("");

      const response = await fetch("/api/master/financeiro", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error || "Não foi possível carregar o financeiro."
        );
      }

      setData(result);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Erro ao carregar o financeiro."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadFinance();
  }, []);

  const maxMRR = useMemo(() => {
    if (!data?.plan_breakdown?.length) {
      return 1;
    }

    return Math.max(
      ...data.plan_breakdown.map((plan) => plan.mrr),
      1
    );
  }, [data]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-7xl">
          <div className="animate-pulse space-y-6">
            <div className="h-10 w-72 rounded-xl bg-slate-200" />
            <div className="h-5 w-96 rounded bg-slate-200" />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-32 rounded-2xl bg-slate-200"
                />
              ))}
            </div>

            <div className="h-96 rounded-2xl bg-slate-200" />
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600">
              <AlertTriangle size={28} />
            </div>

            <h1 className="mt-5 text-2xl font-bold text-slate-950">
              Não foi possível carregar o financeiro
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              {error}
            </p>

            <button
              onClick={() => {
                setRefreshing(true);
                loadFinance();
              }}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <RefreshCw size={17} />
              Tentar novamente
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
        {/* HEADER */}
        <section className="rounded-3xl bg-slate-950 p-7 text-white shadow-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-300">
                <Wallet size={17} />
                Administração MASTER
              </div>

              <h1 className="text-3xl font-bold tracking-tight">
                Financeiro
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Acompanhe a receita recorrente estimada, assinaturas,
                planos e desempenho financeiro do LoanControl.
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Clock3 size={14} />
                  Última atualização
                </div>

                <p className="mt-1 text-sm font-semibold text-white">
                  {new Date(
                    data.generated_at
                  ).toLocaleString("pt-BR")}
                </p>
              </div>

              <button
                onClick={() => {
                  setRefreshing(true);
                  loadFinance();
                }}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-slate-100 disabled:opacity-60"
              >
                <RefreshCw
                  size={17}
                  className={refreshing ? "animate-spin" : ""}
                />
                Atualizar
              </button>
            </div>
          </div>
        </section>

        {/* AVISO */}
        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex gap-3">
            <div className="mt-0.5 text-blue-600">
              <CreditCard size={20} />
            </div>

            <div>
              <p className="text-sm font-bold text-blue-900">
                Como o financeiro está sendo calculado
              </p>

              <p className="mt-1 text-sm leading-6 text-blue-800">
                A receita recorrente mostrada abaixo é uma
                <strong> estimativa </strong>
                baseada no valor dos planos ativos. O valor
                efetivamente recebido pelo Mercado Pago ainda será
                integrado ao financeiro quando a cobrança automática
                estiver conectada.
              </p>
            </div>
          </div>
        </section>

        {/* CARDS */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="MRR estimado"
            value={formatMoney(data.financial.mrr)}
            description="Receita mensal dos planos ativos"
            icon={<TrendingUp size={21} />}
            tone="green"
          />

          <StatCard
            title="Assinaturas ativas"
            value={data.stats.active_count}
            description={`${data.stats.active_plans} planos gerando receita`}
            icon={<CheckCircle2 size={21} />}
            tone="blue"
          />

          <StatCard
            title="Em teste grátis"
            value={data.stats.trial_count}
            description={formatMoney(data.financial.trial_potential) + " em potencial"}
            icon={<Clock3 size={21} />}
            tone="amber"
          />

          <StatCard
            title="Receita potencial"
            value={formatMoney(
              data.financial.potential_monthly_revenue
            )}
            description="Ativos + clientes em teste"
            icon={<DollarSign size={21} />}
            tone="default"
          />
        </section>

        {/* SEGUNDA LINHA */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Empresas cadastradas"
            value={data.stats.total_companies}
            description={`${data.stats.companies_with_subscription} com assinatura`}
            icon={<Building2 size={21} />}
            tone="default"
          />

          <StatCard
            title="Novas assinaturas"
            value={data.stats.new_subscriptions_30_days}
            description="Últimos 30 dias"
            icon={<ArrowUpRight size={21} />}
            tone="green"
          />

          <StatCard
            title="Em atraso"
            value={data.stats.past_due_count}
            description="Assinaturas que precisam de atenção"
            icon={<AlertTriangle size={21} />}
            tone="amber"
          />

          <StatCard
            title="Canceladas / expiradas"
            value={
              data.stats.cancelled_count +
              data.stats.expired_count
            }
            description={`${data.stats.trial_expired_count} testes expirados`}
            icon={<XCircle size={21} />}
            tone="red"
          />
        </section>

        {/* GRÁFICO / PLANOS */}
        <section className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Receita por plano
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  MRR estimado gerado por cada plano ativo
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
                <BarChart3 size={15} />
                MRR
              </div>
            </div>

            <div className="mt-7 space-y-6">
              {data.plan_breakdown.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
                  <p className="text-sm font-medium text-slate-500">
                    Nenhum plano encontrado.
                  </p>
                </div>
              ) : (
                data.plan_breakdown.map((plan) => {
                  const percentage =
                    plan.mrr > 0
                      ? Math.max(
                          (plan.mrr / maxMRR) * 100,
                          4
                        )
                      : 3;

                  return (
                    <div key={plan.id}>
                      <div className="mb-2 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            {plan.name}
                          </p>

                          <p className="text-xs text-slate-500">
                            {plan.active_count} ativa(s)
                            {" · "}
                            {plan.trial_count} em teste
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-950">
                            {formatMoney(plan.mrr)}
                          </p>

                          <p className="text-xs text-slate-400">
                            {formatMoney(plan.price)}/mês
                          </p>
                        </div>
                      </div>

                      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-slate-900 transition-all"
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RESUMO */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Resumo financeiro
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Visão geral da operação SaaS
              </p>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
                    <TrendingUp size={17} />
                  </div>

                  <span className="text-sm font-medium text-slate-600">
                    Receita recorrente
                  </span>
                </div>

                <strong className="text-sm text-slate-950">
                  {formatMoney(data.financial.mrr)}
                </strong>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
                    <Clock3 size={17} />
                  </div>

                  <span className="text-sm font-medium text-slate-600">
                    Potencial dos testes
                  </span>
                </div>

                <strong className="text-sm text-slate-950">
                  {formatMoney(data.financial.trial_potential)}
                </strong>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-slate-200 p-2 text-slate-700">
                    <Building2 size={17} />
                  </div>

                  <span className="text-sm font-medium text-slate-600">
                    Empresas
                  </span>
                </div>

                <strong className="text-sm text-slate-950">
                  {data.stats.total_companies}
                </strong>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
                    <AlertTriangle size={17} />
                  </div>

                  <span className="text-sm font-medium text-slate-600">
                    Em atraso
                  </span>
                </div>

                <strong className="text-sm text-slate-950">
                  {data.stats.past_due_count}
                </strong>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-red-100 p-2 text-red-700">
                    <XCircle size={17} />
                  </div>

                  <span className="text-sm font-medium text-slate-600">
                    Canceladas
                  </span>
                </div>

                <strong className="text-sm text-slate-950">
                  {data.stats.cancelled_count}
                </strong>
              </div>
            </div>
          </div>
        </section>

        {/* ASSINATURAS RECENTES */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Assinaturas recentes
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Últimas empresas registradas no sistema
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
              <CalendarDays size={15} />
              Histórico
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Empresa
                  </th>

                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Plano
                  </th>

                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Valor
                  </th>

                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Status
                  </th>

                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Período
                  </th>

                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Cadastro
                  </th>
                </tr>
              </thead>

              <tbody>
                {data.recent_subscriptions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-14 text-center"
                    >
                      <div className="mx-auto flex max-w-sm flex-col items-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                          <Users size={25} />
                        </div>

                        <p className="mt-4 text-sm font-bold text-slate-700">
                          Nenhuma assinatura encontrada
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          As novas empresas aparecerão aqui.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  data.recent_subscriptions.map((subscription) => {
                    const status = getStatus(subscription.status);

                    return (
                      <tr
                        key={subscription.id}
                        className="border-b border-slate-100 transition hover:bg-slate-50"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                              <Building2 size={18} />
                            </div>

                            <div>
                              <p className="text-sm font-bold text-slate-900">
                                {subscription.company_name}
                              </p>

                              <p className="mt-0.5 text-xs text-slate-500">
                                {subscription.company_email ||
                                  "Sem e-mail"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
                            {subscription.plan_name}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-950">
                            {formatMoney(subscription.price)}
                          </p>

                          <p className="text-xs text-slate-400">
                            / mês
                          </p>
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-bold ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          {subscription.status === "TRIAL" ? (
                            <div>
                              <p className="text-xs font-semibold text-slate-600">
                                Teste até
                              </p>

                              <p className="mt-1 text-sm font-bold text-slate-900">
                                {formatDate(
                                  subscription.trial_ends_at
                                )}
                              </p>
                            </div>
                          ) : (
                            <div>
                              <p className="text-xs font-semibold text-slate-600">
                                Até
                              </p>

                              <p className="mt-1 text-sm font-bold text-slate-900">
                                {formatDate(
                                  subscription.current_period_end
                                )}
                              </p>
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <CalendarDays size={15} />

                            {formatDate(subscription.created_at)}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* RODAPÉ */}
        <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-slate-900">
              Financeiro do LoanControl
            </p>

            <p className="mt-1 text-xs text-slate-500">
              O caixa efetivamente recebido será exibido após a
              integração financeira com o Mercado Pago.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-600">
            <DollarSign size={15} />
            SaaS Finance
          </div>
        </section>
      </div>
    </main>
  );
}