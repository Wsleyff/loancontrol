"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CreditCard,
  Mail,
  Phone,
  Users,
  UserRound,
  Wallet,
  Landmark,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock3,
} from "lucide-react";

type Company = {
  id: string;
  name: string | null;
  legal_name: string | null;
  document: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  logo_url: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  created_at: string | null;
};

type Subscription = {
  id: string;
  status: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  mercado_pago_subscription_id: string | null;
  plan: {
    id: string;
    name: string;
    price: number;
    trial_days: number;
  } | null;
};

type CompanyUser = {
  id: string;
  role: string | null;
  status: string | null;
  user_id: string | null;
  created_at: string | null;
  profile: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
};

type Stats = {
  customers: number;
  loans: number;
  activeLoans: number;
  totalLoaned: number;
  totalReceived: number;
  totalPending: number;
};

type ApiResponse = {
  company?: Company;
  subscription?: Subscription | null;
  users?: CompanyUser[];
  stats?: Stats;
  error?: string;
};

function money(value: number | null | undefined) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function date(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleDateString("pt-BR");
}

function subscriptionLabel(status: string | null | undefined) {
  switch (status) {
    case "TRIAL":
      return "Período de teste";

    case "ACTIVE":
      return "Ativa";

    case "PAST_DUE":
      return "Em atraso";

    case "CANCELLED":
      return "Cancelada";

    case "EXPIRED":
      return "Expirada";

    default:
      return status || "Sem assinatura";
  }
}

function roleLabel(role: string | null | undefined) {
  switch (role) {
    case "ADMIN":
      return "Administrador";

    case "MANAGER":
      return "Gerente";

    case "OPERATOR":
      return "Operador";

    case "COLLECTOR":
      return "Cobrador";

    default:
      return role || "Usuário";
  }
}

function statusColor(status: string | null | undefined) {
  switch (status) {
    case "ACTIVE":
      return {
        background: "#ecfdf5",
        color: "#047857",
        border: "#a7f3d0",
      };

    case "TRIAL":
      return {
        background: "#eff6ff",
        color: "#1d4ed8",
        border: "#bfdbfe",
      };

    case "PAST_DUE":
      return {
        background: "#fff7ed",
        color: "#c2410c",
        border: "#fed7aa",
      };

    case "EXPIRED":
    case "CANCELLED":
      return {
        background: "#fef2f2",
        color: "#b91c1c",
        border: "#fecaca",
      };

    default:
      return {
        background: "#f8fafc",
        color: "#475569",
        border: "#e2e8f0",
      };
  }
}

export default function MasterEmpresaDetalhesPage() {
  const router = useRouter();
  const params = useParams();

  const companyId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
        ? params.id[0]
        : "";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState("");

  async function loadCompany(showRefresh = false) {
    if (!companyId) {
      setError("ID da empresa não informado.");
      setLoading(false);
      return;
    }

    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await fetch(
        `/api/master/empresas/${encodeURIComponent(companyId)}`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        }
      );

      const json = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(
          json?.error ||
            "Não foi possível carregar os dados da empresa."
        );
      }

      setData(json);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Erro ao carregar empresa."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadCompany();
  }, [companyId]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "70vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 24,
            padding: 36,
            textAlign: "center",
            boxShadow: "0 20px 60px rgba(15,23,42,.08)",
          }}
        >
          <div
            style={{
              width: 54,
              height: 54,
              margin: "0 auto 18px",
              borderRadius: 16,
              background:
                "linear-gradient(135deg,#2563eb,#4f46e5)",
              color: "#fff",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Building2 size={26} />
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 800,
              color: "#0f172a",
            }}
          >
            Carregando empresa
          </h2>

          <p
            style={{
              margin: "8px 0 0",
              color: "#64748b",
              fontSize: 14,
            }}
          >
            Aguarde enquanto buscamos os dados.
          </p>

          <div
            style={{
              width: 30,
              height: 30,
              border: "3px solid #dbeafe",
              borderTopColor: "#2563eb",
              borderRadius: "50%",
              margin: "24px auto 0",
              animation: "spin 0.8s linear infinite",
            }}
          />

          <style jsx>{`
            @keyframes spin {
              to {
                transform: rotate(360deg);
              }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (error || !data?.company) {
    return (
      <div
        style={{
          minHeight: "70vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 560,
            background: "#fff",
            border: "1px solid #fecaca",
            borderRadius: 24,
            padding: 36,
            textAlign: "center",
            boxShadow: "0 20px 60px rgba(15,23,42,.08)",
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              margin: "0 auto 18px",
              borderRadius: 18,
              background: "#fef2f2",
              color: "#dc2626",
              display: "grid",
              placeItems: "center",
            }}
          >
            <AlertCircle size={30} />
          </div>

          <h1
            style={{
              margin: 0,
              color: "#0f172a",
              fontSize: 24,
              fontWeight: 850,
            }}
          >
            Empresa não encontrada
          </h1>

          <p
            style={{
              margin: "10px auto 0",
              maxWidth: 430,
              color: "#64748b",
              lineHeight: 1.6,
            }}
          >
            {error ||
              "Não foi possível localizar os dados desta empresa."}
          </p>

          <button
            type="button"
            onClick={() => router.push("/master/empresas")}
            style={{
              marginTop: 24,
              height: 46,
              padding: "0 20px",
              border: 0,
              borderRadius: 12,
              background:
                "linear-gradient(135deg,#2563eb,#4f46e5)",
              color: "#fff",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Voltar para empresas
          </button>
        </div>
      </div>
    );
  }

  const company = data.company;
  const subscription = data.subscription;
  const stats = data.stats || {
    customers: 0,
    loans: 0,
    activeLoans: 0,
    totalLoaned: 0,
    totalReceived: 0,
    totalPending: 0,
  };

  const subscriptionStyles = statusColor(
    subscription?.status
  );

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 1600,
        margin: "0 auto",
      }}
    >
      {/* HEADER */}
      <div
        className="company-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            minWidth: 0,
          }}
        >
          <button
            type="button"
            onClick={() => router.push("/master/empresas")}
            style={{
              width: 42,
              height: 42,
              flexShrink: 0,
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              background: "#fff",
              color: "#475569",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
            }}
            title="Voltar"
          >
            <ArrowLeft size={19} />
          </button>

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: ".07em",
                marginBottom: 5,
              }}
            >
              Master / Empresas
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "clamp(24px,3vw,34px)",
                lineHeight: 1.1,
                fontWeight: 900,
                color: "#0f172a",
                letterSpacing: "-.8px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {company.name || "Empresa"}
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadCompany(true)}
          disabled={refreshing}
          style={{
            height: 44,
            padding: "0 15px",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            background: "#fff",
            color: "#334155",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontWeight: 750,
            cursor: refreshing ? "not-allowed" : "pointer",
            opacity: refreshing ? 0.65 : 1,
          }}
        >
          <RefreshCw
            size={17}
            style={{
              animation: refreshing
                ? "spin .8s linear infinite"
                : undefined,
            }}
          />
          Atualizar
        </button>
      </div>

      {/* EMPRESA + ASSINATURA */}
      <div
        className="top-grid"
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(0,1.5fr) minmax(300px,.8fr)",
          gap: 18,
          marginBottom: 18,
        }}
      >
        {/* DADOS DA EMPRESA */}
        <section
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 20,
            padding: 24,
            boxShadow: "0 10px 35px rgba(15,23,42,.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 22,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 13,
                background: "#eff6ff",
                color: "#2563eb",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Building2 size={22} />
            </div>

            <div>
              <h2
                style={{
                  margin: 0,
                  color: "#0f172a",
                  fontSize: 18,
                  fontWeight: 850,
                }}
              >
                Dados da empresa
              </h2>

              <p
                style={{
                  margin: "3px 0 0",
                  color: "#64748b",
                  fontSize: 13,
                }}
              >
                Informações cadastrais
              </p>
            </div>
          </div>

          <div
            className="info-grid"
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(2,minmax(0,1fr))",
              gap: 14,
            }}
          >
            <InfoItem
              icon={<Building2 size={17} />}
              label="Nome"
              value={company.name}
            />

            <InfoItem
              icon={<Building2 size={17} />}
              label="Razão social"
              value={company.legal_name}
            />

            <InfoItem
              icon={<CreditCard size={17} />}
              label="CPF/CNPJ"
              value={company.document}
            />

            <InfoItem
              icon={<Mail size={17} />}
              label="E-mail"
              value={company.email}
            />

            <InfoItem
              icon={<Phone size={17} />}
              label="Telefone"
              value={company.phone}
            />

            <InfoItem
              icon={<Phone size={17} />}
              label="WhatsApp"
              value={company.whatsapp}
            />

            <InfoItem
              icon={<Landmark size={17} />}
              label="Endereço"
              value={company.address}
            />

            <InfoItem
              icon={<Building2 size={17} />}
              label="Cidade / Estado"
              value={
                company.city || company.state
                  ? `${company.city || "—"} / ${
                      company.state || "—"
                    }`
                  : null
              }
            />

            <InfoItem
              icon={<Building2 size={17} />}
              label="CEP"
              value={company.zip_code}
            />

            <InfoItem
              icon={<CalendarDays size={17} />}
              label="Cadastro"
              value={date(company.created_at)}
            />
          </div>
        </section>

        {/* ASSINATURA */}
        <section
          style={{
            background:
              "linear-gradient(145deg,#0f172a,#172554)",
            borderRadius: 20,
            padding: 24,
            color: "#fff",
            boxShadow:
              "0 18px 45px rgba(15,23,42,.16)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 180,
              height: 180,
              borderRadius: "50%",
              background:
                "rgba(59,130,246,.12)",
              right: -70,
              top: -70,
            }}
          />

          <div
            style={{
              position: "relative",
              zIndex: 1,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 10,
                marginBottom: 25,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#94a3b8",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: ".07em",
                  }}
                >
                  Assinatura
                </div>

                <h2
                  style={{
                    margin: "6px 0 0",
                    fontSize: 23,
                    fontWeight: 900,
                  }}
                >
                  {subscription?.plan?.name ||
                    "Sem plano"}
                </h2>
              </div>

              <div
                style={{
                  padding: "7px 10px",
                  borderRadius: 999,
                  background:
                    subscriptionStyles.background,
                  color: subscriptionStyles.color,
                  border: `1px solid ${subscriptionStyles.border}`,
                  fontSize: 11,
                  fontWeight: 850,
                  whiteSpace: "nowrap",
                }}
              >
                {subscriptionLabel(
                  subscription?.status
                )}
              </div>
            </div>

            <div
              style={{
                fontSize: 31,
                fontWeight: 900,
                letterSpacing: "-.8px",
              }}
            >
              {subscription?.plan
                ? money(subscription.plan.price)
                : "—"}
              {subscription?.plan && (
                <span
                  style={{
                    fontSize: 13,
                    color: "#94a3b8",
                    fontWeight: 600,
                  }}
                >
                  /mês
                </span>
              )}
            </div>

            <div
              style={{
                marginTop: 25,
                paddingTop: 18,
                borderTop:
                  "1px solid rgba(255,255,255,.1)",
                display: "grid",
                gap: 13,
              }}
            >
              <DarkInfo
                label="Início"
                value={date(
                  subscription?.trial_started_at ||
                    subscription?.current_period_start
                )}
              />

              <DarkInfo
                label="Vencimento"
                value={date(
                  subscription?.trial_ends_at ||
                    subscription?.current_period_end
                )}
              />

              <DarkInfo
                label="Período de teste"
                value={
                  subscription?.plan?.trial_days
                    ? `${subscription.plan.trial_days} dias`
                    : "—"
                }
              />
            </div>
          </div>
        </section>
      </div>

      {/* CARDS DE ESTATÍSTICAS */}
      <div
        className="stats-grid"
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(4,minmax(0,1fr))",
          gap: 14,
          marginBottom: 18,
        }}
      >
        <StatCard
          icon={<Users size={20} />}
          title="Clientes"
          value={String(stats.customers)}
          description="Clientes cadastrados"
        />

        <StatCard
          icon={<CreditCard size={20} />}
          title="Empréstimos"
          value={String(stats.loans)}
          description={`${stats.activeLoans} ativos`}
        />

        <StatCard
          icon={<Wallet size={20} />}
          title="Total emprestado"
          value={money(stats.totalLoaned)}
          description="Carteira de crédito"
        />

        <StatCard
          icon={<CheckCircle2 size={20} />}
          title="Total recebido"
          value={money(stats.totalReceived)}
          description={`Pendente: ${money(
            stats.totalPending
          )}`}
        />
      </div>

      {/* USUÁRIOS */}
      <section
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 10px 35px rgba(15,23,42,.04)",
        }}
      >
        <div
          style={{
            padding: 22,
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 13,
                background: "#f1f5f9",
                color: "#475569",
                display: "grid",
                placeItems: "center",
              }}
            >
              <UserRound size={21} />
            </div>

            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 850,
                  color: "#0f172a",
                }}
              >
                Usuários da empresa
              </h2>

              <p
                style={{
                  margin: "3px 0 0",
                  color: "#64748b",
                  fontSize: 13,
                }}
              >
                Pessoas com acesso ao LoanControl
              </p>
            </div>
          </div>

          <div
            style={{
              padding: "7px 11px",
              borderRadius: 999,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              color: "#475569",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            {data.users?.length || 0} usuário(s)
          </div>
        </div>

        {data.users && data.users.length > 0 ? (
          <div className="users-scroll">
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 700,
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#f8fafc",
                  }}
                >
                  <th style={thStyle}>
                    Usuário
                  </th>

                  <th style={thStyle}>
                    Perfil
                  </th>

                  <th style={thStyle}>
                    Status
                  </th>

                  <th style={thStyle}>
                    Cadastro
                  </th>
                </tr>
              </thead>

              <tbody>
                {data.users.map((user) => {
                  const active =
                    user.status === "ACTIVE";

                  return (
                    <tr key={user.id}>
                      <td style={tdStyle}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 11,
                          }}
                        >
                          <div
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: "50%",
                              background: "#eff6ff",
                              color: "#2563eb",
                              display: "grid",
                              placeItems: "center",
                              fontWeight: 900,
                            }}
                          >
                            {(
                              user.profile?.full_name ||
                              "U"
                            )
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div
                            style={{
                              minWidth: 0,
                            }}
                          >
                            <div
                              style={{
                                fontWeight: 800,
                                color: "#0f172a",
                              }}
                            >
                              {user.profile
                                ?.full_name ||
                                "Usuário"}
                            </div>

                            <div
                              style={{
                                marginTop: 2,
                                color: "#64748b",
                                fontSize: 12,
                              }}
                            >
                              {user.profile
                                ?.email || "—"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={tdStyle}>
                        <span
                          style={{
                            padding: "6px 9px",
                            borderRadius: 8,
                            background: "#f1f5f9",
                            color: "#475569",
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          {roleLabel(user.role)}
                        </span>
                      </td>

                      <td style={tdStyle}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "6px 9px",
                            borderRadius: 8,
                            background: active
                              ? "#ecfdf5"
                              : "#fef2f2",
                            color: active
                              ? "#047857"
                              : "#b91c1c",
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          {active ? (
                            <CheckCircle2
                              size={13}
                            />
                          ) : (
                            <Clock3 size={13} />
                          )}

                          {active
                            ? "Ativo"
                            : user.status ||
                              "Inativo"}
                        </span>
                      </td>

                      <td style={tdStyle}>
                        {date(user.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "#64748b",
            }}
          >
            <UserRound
              size={30}
              style={{
                margin: "0 auto 10px",
                opacity: 0.45,
              }}
            />

            <div
              style={{
                fontWeight: 750,
                color: "#475569",
              }}
            >
              Nenhum usuário encontrado
            </div>
          </div>
        )}
      </section>

      <style jsx>{`
        @media (max-width: 1050px) {
          .top-grid {
            grid-template-columns: 1fr !important;
          }

          .stats-grid {
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            ) !important;
          }
        }

        @media (max-width: 700px) {
          .company-header {
            align-items: flex-start !important;
            flex-direction: column !important;
          }

          .company-header button:last-child {
            width: 100%;
            justify-content: center;
          }

          .info-grid {
            grid-template-columns: 1fr !important;
          }

          .stats-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 500px) {
          .top-grid section {
            padding: 18px !important;
          }
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div
      style={{
        minWidth: 0,
        padding: 13,
        borderRadius: 13,
        background: "#f8fafc",
        border: "1px solid #eef2f7",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          color: "#64748b",
          fontSize: 11,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: ".04em",
          marginBottom: 6,
        }}
      >
        {icon}
        {label}
      </div>

      <div
        style={{
          color: "#0f172a",
          fontSize: 13,
          fontWeight: 750,
          overflowWrap: "anywhere",
        }}
      >
        {value || "—"}
      </div>
    </div>
  );
}

function DarkInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <span
        style={{
          color: "#94a3b8",
          fontSize: 12,
        }}
      >
        {label}
      </span>

      <strong
        style={{
          color: "#e2e8f0",
          fontSize: 12,
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function StatCard({
  icon,
  title,
  value,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 18,
        padding: 18,
        boxShadow:
          "0 8px 25px rgba(15,23,42,.035)",
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <span
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "#eff6ff",
            color: "#2563eb",
            display: "grid",
            placeItems: "center",
          }}
        >
          {icon}
        </span>
      </div>

      <div
        style={{
          marginTop: 16,
          color: "#64748b",
          fontSize: 12,
          fontWeight: 750,
        }}
      >
        {title}
      </div>

      <div
        style={{
          marginTop: 4,
          color: "#0f172a",
          fontSize: 22,
          fontWeight: 900,
          letterSpacing: "-.4px",
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </div>

      <div
        style={{
          marginTop: 5,
          color: "#94a3b8",
          fontSize: 11,
        }}
      >
        {description}
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "13px 18px",
  textAlign: "left",
  color: "#64748b",
  fontSize: 11,
  fontWeight: 850,
  textTransform: "uppercase",
  letterSpacing: ".04em",
  borderBottom: "1px solid #e2e8f0",
};

const tdStyle: React.CSSProperties = {
  padding: "14px 18px",
  color: "#334155",
  fontSize: 13,
  borderBottom: "1px solid #f1f5f9",
};