"use client";

import {
  Check,
  Edit3,
  Plus,
  RefreshCw,
  Search,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
  CreditCard,
  Users,
  Clock3,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Plan = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  trial_days: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
  companies_count?: number;
};

type FormData = {
  name: string;
  description: string;
  price: string;
  trial_days: string;
  active: boolean;
};

const emptyForm: FormData = {
  name: "",
  description: "",
  price: "",
  trial_days: "7",
  active: true,
};

function moeda(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function dataBR(value?: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("pt-BR");
}

export default function MasterPlanosPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  const [form, setForm] = useState<FormData>(emptyForm);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function carregarPlanos() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/master/planos", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Não foi possível carregar os planos."
        );
      }

      setPlans(data?.plans || []);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Erro ao carregar os planos."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarPlanos();
  }, []);

  function abrirNovoPlano() {
    setEditingPlan(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  function abrirEditarPlano(plan: Plan) {
    setEditingPlan(plan);

    setForm({
      name: plan.name || "",
      description: plan.description || "",
      price: String(plan.price ?? ""),
      trial_days: String(plan.trial_days ?? 7),
      active: plan.active,
    });

    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  function fecharModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingPlan(null);
    setForm(emptyForm);
    setError("");
  }

  function updateForm<K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function salvarPlano() {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const name = form.name.trim();

      if (!name) {
        throw new Error("Informe o nome do plano.");
      }

      const price = Number(
        form.price.replace(",", ".")
      );

      const trialDays = Number(form.trial_days);

      if (!Number.isFinite(price) || price < 0) {
        throw new Error("Informe um preço válido.");
      }

      if (
        !Number.isInteger(trialDays) ||
        trialDays < 0
      ) {
        throw new Error(
          "Informe uma quantidade válida de dias de teste."
        );
      }

      const payload = {
        id: editingPlan?.id,
        name,
        description: form.description.trim() || null,
        price,
        trial_days: trialDays,
        active: form.active,
      };

      const response = await fetch("/api/master/planos", {
        method: editingPlan ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Não foi possível salvar o plano."
        );
      }

      setSuccess(
        editingPlan
          ? "Plano atualizado com sucesso."
          : "Plano criado com sucesso."
      );

      setModalOpen(false);
      setEditingPlan(null);
      setForm(emptyForm);

      await carregarPlanos();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Erro ao salvar plano."
      );
    } finally {
      setSaving(false);
    }
  }

  async function alternarStatus(plan: Plan) {
    try {
      setError("");
      setSuccess("");

      const response = await fetch("/api/master/planos", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: plan.id,
          name: plan.name,
          description: plan.description,
          price: plan.price,
          trial_days: plan.trial_days,
          active: !plan.active,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Não foi possível alterar o status."
        );
      }

      setSuccess(
        !plan.active
          ? `Plano "${plan.name}" ativado.`
          : `Plano "${plan.name}" desativado.`
      );

      await carregarPlanos();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Erro ao alterar status."
      );
    }
  }

  async function excluirPlano(plan: Plan) {
    const confirmou = window.confirm(
      `Deseja realmente excluir o plano "${plan.name}"?\n\nEssa ação não poderá ser desfeita.`
    );

    if (!confirmou) return;

    try {
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/master/planos?id=${encodeURIComponent(plan.id)}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Não foi possível excluir o plano."
        );
      }

      setSuccess("Plano excluído com sucesso.");

      await carregarPlanos();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Erro ao excluir plano."
      );
    }
  }

  const filteredPlans = useMemo(() => {
    const text = search.trim().toLowerCase();

    if (!text) return plans;

    return plans.filter((plan) => {
      return (
        plan.name.toLowerCase().includes(text) ||
        (plan.description || "")
          .toLowerCase()
          .includes(text)
      );
    });
  }, [plans, search]);

  const activePlans = plans.filter(
    (plan) => plan.active
  ).length;

  const inactivePlans = plans.filter(
    (plan) => !plan.active
  ).length;

  const totalCompanies = plans.reduce(
    (total, plan) =>
      total + Number(plan.companies_count || 0),
    0
  );

  const potentialRevenue = plans.reduce(
    (total, plan) =>
      total +
      Number(plan.price || 0) *
        Number(plan.companies_count || 0),
    0
  );

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg,#f8fafc 0%,#f1f5f9 100%)",
        padding: "34px",
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: "#0f172a",
      }}
    >
      <div
        style={{
          maxWidth: 1450,
          margin: "0 auto",
        }}
      >
        {/* HEADER */}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 20,
            marginBottom: 28,
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "#64748b",
                fontSize: 12,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: ".08em",
                marginBottom: 8,
              }}
            >
              <CreditCard size={15} />
              Administração Master
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 32,
                lineHeight: 1.1,
                fontWeight: 900,
                letterSpacing: "-.04em",
              }}
            >
              Planos
            </h1>

            <p
              style={{
                margin: "9px 0 0",
                color: "#64748b",
                fontSize: 15,
              }}
            >
              Gerencie os planos comerciais oferecidos
              às empresas do LoanControl.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
            }}
          >
            <button
              onClick={carregarPlanos}
              disabled={loading}
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
                cursor: "pointer",
              }}
            >
              <RefreshCw
                size={17}
                style={{
                  animation: loading
                    ? "spin 1s linear infinite"
                    : undefined,
                }}
              />
              Atualizar
            </button>

            <button
              onClick={abrirNovoPlano}
              style={{
                height: 44,
                padding: "0 17px",
                borderRadius: 12,
                border: "none",
                background:
                  "linear-gradient(135deg,#4f46e5,#7c3aed)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontWeight: 850,
                cursor: "pointer",
                boxShadow:
                  "0 10px 25px rgba(79,70,229,.22)",
              }}
            >
              <Plus size={18} />
              Novo plano
            </button>
          </div>
        </div>

        {/* ALERTAS */}

        {error && (
          <div
            style={{
              marginBottom: 18,
              padding: "13px 15px",
              borderRadius: 12,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              display: "flex",
              alignItems: "center",
              gap: 9,
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            <X size={17} />
            {error}
          </div>
        )}

        {success && (
          <div
            style={{
              marginBottom: 18,
              padding: "13px 15px",
              borderRadius: 12,
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              color: "#15803d",
              display: "flex",
              alignItems: "center",
              gap: 9,
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            <Check size={17} />
            {success}
          </div>
        )}

        {/* STATS */}

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(4,minmax(0,1fr))",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <StatCard
            icon={<CreditCard size={21} />}
            label="Planos cadastrados"
            value={plans.length}
            description="Todos os planos"
          />

          <StatCard
            icon={<Check size={21} />}
            label="Planos ativos"
            value={activePlans}
            description="Disponíveis para contratação"
          />

          <StatCard
            icon={<Users size={21} />}
            label="Empresas nos planos"
            value={totalCompanies}
            description="Assinaturas vinculadas"
          />

          <StatCard
            icon={<TrendingUp size={21} />}
            label="Receita potencial"
            value={moeda(potentialRevenue)}
            description="Mensal estimada"
          />
        </section>

        {/* CONTEÚDO */}

        <section
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 18,
            boxShadow:
              "0 8px 30px rgba(15,23,42,.05)",
            overflow: "hidden",
          }}
        >
          {/* TOOLBAR */}

          <div
            style={{
              padding: 20,
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 15,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 850,
                }}
              >
                Catálogo de planos
              </h2>

              <p
                style={{
                  margin: "5px 0 0",
                  color: "#64748b",
                  fontSize: 13,
                }}
              >
                {filteredPlans.length} plano
                {filteredPlans.length === 1
                  ? ""
                  : "s"} encontrado
                {filteredPlans.length === 1
                  ? ""
                  : "s"}
              </p>
            </div>

            <div
              style={{
                position: "relative",
                width: 320,
                maxWidth: "100%",
              }}
            >
              <Search
                size={17}
                color="#94a3b8"
                style={{
                  position: "absolute",
                  left: 13,
                  top: 13,
                }}
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Pesquisar plano..."
                style={{
                  width: "100%",
                  height: 42,
                  padding:
                    "0 13px 0 39px",
                  borderRadius: 11,
                  border:
                    "1px solid #e2e8f0",
                  outline: "none",
                  fontSize: 14,
                  color: "#0f172a",
                  background: "#f8fafc",
                }}
              />
            </div>
          </div>

          {/* TABLE */}

          {loading ? (
            <div
              style={{
                padding: 70,
                textAlign: "center",
                color: "#64748b",
              }}
            >
              <RefreshCw
                size={25}
                style={{
                  animation:
                    "spin 1s linear infinite",
                  marginBottom: 10,
                }}
              />

              <div
                style={{
                  fontWeight: 750,
                }}
              >
                Carregando planos...
              </div>
            </div>
          ) : filteredPlans.length === 0 ? (
            <div
              style={{
                padding: 75,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 16,
                  background: "#eef2ff",
                  color: "#4f46e5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 15px",
                }}
              >
                <CreditCard size={27} />
              </div>

              <h3
                style={{
                  margin: 0,
                  fontSize: 17,
                }}
              >
                Nenhum plano encontrado
              </h3>

              <p
                style={{
                  color: "#64748b",
                  fontSize: 14,
                }}
              >
                Crie seu primeiro plano comercial.
              </p>

              <button
                onClick={abrirNovoPlano}
                style={{
                  marginTop: 8,
                  height: 40,
                  padding: "0 15px",
                  border: "none",
                  borderRadius: 10,
                  background: "#4f46e5",
                  color: "#fff",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                <Plus
                  size={16}
                  style={{
                    verticalAlign: "middle",
                    marginRight: 6,
                  }}
                />
                Criar plano
              </button>
            </div>
          ) : (
            <div
              style={{
                overflowX: "auto",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse:
                    "collapse",
                  minWidth: 900,
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "#f8fafc",
                    }}
                  >
                    <th style={thStyle}>
                      Plano
                    </th>

                    <th style={thStyle}>
                      Preço
                    </th>

                    <th style={thStyle}>
                      Teste grátis
                    </th>

                    <th style={thStyle}>
                      Empresas
                    </th>

                    <th style={thStyle}>
                      Status
                    </th>

                    <th
                      style={{
                        ...thStyle,
                        textAlign:
                          "right",
                      }}
                    >
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredPlans.map(
                    (plan) => (
                      <tr
                        key={plan.id}
                        style={{
                          borderTop:
                            "1px solid #eef2f7",
                        }}
                      >
                        <td
                          style={{
                            ...tdStyle,
                            width: "34%",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems:
                                "center",
                              gap: 12,
                            }}
                          >
                            <div
                              style={{
                                width: 42,
                                height: 42,
                                borderRadius: 12,
                                background:
                                  plan.active
                                    ? "#eef2ff"
                                    : "#f1f5f9",
                                color:
                                  plan.active
                                    ? "#4f46e5"
                                    : "#64748b",
                                display:
                                  "flex",
                                alignItems:
                                  "center",
                                justifyContent:
                                  "center",
                              }}
                            >
                              <CreditCard
                                size={20}
                              />
                            </div>

                            <div>
                              <div
                                style={{
                                  fontWeight: 850,
                                  fontSize: 15,
                                }}
                              >
                                {plan.name}
                              </div>

                              <div
                                style={{
                                  marginTop: 3,
                                  color:
                                    "#64748b",
                                  fontSize: 12,
                                  maxWidth: 360,
                                  whiteSpace:
                                    "nowrap",
                                  overflow:
                                    "hidden",
                                  textOverflow:
                                    "ellipsis",
                                }}
                              >
                                {plan.description ||
                                  "Sem descrição"}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td style={tdStyle}>
                          <strong
                            style={{
                              fontSize: 15,
                            }}
                          >
                            {moeda(
                              plan.price
                            )}
                          </strong>

                          <span
                            style={{
                              color:
                                "#94a3b8",
                              fontSize: 12,
                              marginLeft: 4,
                            }}
                          >
                            /mês
                          </span>
                        </td>

                        <td style={tdStyle}>
                          <div
                            style={{
                              display:
                                "flex",
                              alignItems:
                                "center",
                              gap: 7,
                              color:
                                "#334155",
                              fontWeight: 700,
                            }}
                          >
                            <Clock3
                              size={16}
                              color="#64748b"
                            />
                            {plan.trial_days}{" "}
                            dias
                          </div>
                        </td>

                        <td style={tdStyle}>
                          <div
                            style={{
                              display:
                                "flex",
                              alignItems:
                                "center",
                              gap: 7,
                              fontWeight: 800,
                            }}
                          >
                            <Users
                              size={16}
                              color="#64748b"
                            />
                            {Number(
                              plan.companies_count ||
                                0
                            )}
                          </div>
                        </td>

                        <td style={tdStyle}>
                          <button
                            onClick={() =>
                              alternarStatus(
                                plan
                              )
                            }
                            title={
                              plan.active
                                ? "Desativar plano"
                                : "Ativar plano"
                            }
                            style={{
                              border: "none",
                              background:
                                "transparent",
                              cursor:
                                "pointer",
                              padding: 0,
                            }}
                          >
                            {plan.active ? (
                              <span
                                style={{
                                  display:
                                    "inline-flex",
                                  alignItems:
                                    "center",
                                  gap: 6,
                                  padding:
                                    "6px 9px",
                                  borderRadius:
                                    999,
                                  background:
                                    "#dcfce7",
                                  color:
                                    "#15803d",
                                  fontSize: 12,
                                  fontWeight: 850,
                                }}
                              >
                                <ToggleRight
                                  size={16}
                                />
                                Ativo
                              </span>
                            ) : (
                              <span
                                style={{
                                  display:
                                    "inline-flex",
                                  alignItems:
                                    "center",
                                  gap: 6,
                                  padding:
                                    "6px 9px",
                                  borderRadius:
                                    999,
                                  background:
                                    "#f1f5f9",
                                  color:
                                    "#64748b",
                                  fontSize: 12,
                                  fontWeight: 850,
                                }}
                              >
                                <ToggleLeft
                                  size={16}
                                />
                                Inativo
                              </span>
                            )}
                          </button>
                        </td>

                        <td
                          style={{
                            ...tdStyle,
                            textAlign:
                              "right",
                          }}
                        >
                          <div
                            style={{
                              display:
                                "flex",
                              justifyContent:
                                "flex-end",
                              gap: 7,
                            }}
                          >
                            <button
                              onClick={() =>
                                abrirEditarPlano(
                                  plan
                                )
                              }
                              title="Editar plano"
                              style={
                                actionButtonStyle
                              }
                            >
                              <Edit3
                                size={16}
                              />
                            </button>

                            <button
                              onClick={() =>
                                excluirPlano(
                                  plan
                                )
                              }
                              title="Excluir plano"
                              style={{
                                ...actionButtonStyle,
                                color:
                                  "#dc2626",
                              }}
                            >
                              <Trash2
                                size={16}
                              />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* RODAPÉ */}

        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            gap: 20,
            marginTop: 15,
            color: "#94a3b8",
            fontSize: 12,
          }}
        >
          <span>
            {inactivePlans} plano
            {inactivePlans === 1
              ? ""
              : "s"} inativo
            {inactivePlans === 1
              ? ""
              : "s"}
          </span>

          <span>
            Última atualização:{" "}
            {new Date().toLocaleTimeString(
              "pt-BR",
              {
                hour: "2-digit",
                minute: "2-digit",
              }
            )}
          </span>
        </div>
      </div>

      {/* MODAL */}

      {modalOpen && (
        <div
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              fecharModal();
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(15,23,42,.55)",
            backdropFilter:
              "blur(5px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 1000,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 570,
              background: "#fff",
              borderRadius: 20,
              boxShadow:
                "0 25px 80px rgba(15,23,42,.25)",
              overflow: "hidden",
            }}
          >
            {/* MODAL HEADER */}

            <div
              style={{
                padding:
                  "21px 23px",
                borderBottom:
                  "1px solid #e2e8f0",
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#6366f1",
                    fontWeight: 850,
                    textTransform:
                      "uppercase",
                    letterSpacing:
                      ".08em",
                    marginBottom: 5,
                  }}
                >
                  {editingPlan
                    ? "Editar plano"
                    : "Novo plano"}
                </div>

                <h2
                  style={{
                    margin: 0,
                    fontSize: 21,
                    fontWeight: 900,
                  }}
                >
                  {editingPlan
                    ? editingPlan.name
                    : "Criar plano comercial"}
                </h2>
              </div>

              <button
                onClick={fecharModal}
                disabled={saving}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  border:
                    "1px solid #e2e8f0",
                  background: "#f8fafc",
                  color: "#64748b",
                  display: "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* MODAL BODY */}

            <div
              style={{
                padding: 23,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gap: 17,
                }}
              >
                <Field
                  label="Nome do plano"
                  required
                >
                  <input
                    value={form.name}
                    onChange={(event) =>
                      updateForm(
                        "name",
                        event.target.value
                      )
                    }
                    placeholder="Ex.: Profissional"
                    style={inputStyle}
                  />
                </Field>

                <Field label="Descrição">
                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      updateForm(
                        "description",
                        event.target.value
                      )
                    }
                    placeholder="Descreva os principais recursos deste plano..."
                    rows={3}
                    style={{
                      ...inputStyle,
                      height: "auto",
                      padding: 12,
                      resize: "vertical",
                    }}
                  />
                </Field>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "1fr 1fr",
                    gap: 14,
                  }}
                >
                  <Field
                    label="Preço mensal"
                    required
                  >
                    <div
                      style={{
                        position:
                          "relative",
                      }}
                    >
                      <span
                        style={{
                          position:
                            "absolute",
                          left: 13,
                          top: 12,
                          color:
                            "#64748b",
                          fontWeight: 750,
                          fontSize: 13,
                        }}
                      >
                        R$
                      </span>

                      <input
                        type="text"
                        inputMode="decimal"
                        value={form.price}
                        onChange={(event) =>
                          updateForm(
                            "price",
                            event.target
                              .value
                          )
                        }
                        placeholder="99,90"
                        style={{
                          ...inputStyle,
                          paddingLeft: 42,
                        }}
                      />
                    </div>
                  </Field>

                  <Field
                    label="Teste grátis"
                    required
                  >
                    <div
                      style={{
                        position:
                          "relative",
                      }}
                    >
                      <input
                        type="number"
                        min="0"
                        value={
                          form.trial_days
                        }
                        onChange={(event) =>
                          updateForm(
                            "trial_days",
                            event.target
                              .value
                          )
                        }
                        style={{
                          ...inputStyle,
                          paddingRight: 55,
                        }}
                      />

                      <span
                        style={{
                          position:
                            "absolute",
                          right: 12,
                          top: 12,
                          color:
                            "#64748b",
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        dias
                      </span>
                    </div>
                  </Field>
                </div>

                <div
                  style={{
                    padding: 14,
                    borderRadius: 13,
                    border:
                      "1px solid #e2e8f0",
                    background:
                      "#f8fafc",
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "center",
                    gap: 15,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: 14,
                      }}
                    >
                      Plano disponível
                    </div>

                    <div
                      style={{
                        color:
                          "#64748b",
                        fontSize: 12,
                        marginTop: 3,
                      }}
                    >
                      Empresas poderão
                      contratar este plano
                      quando ele estiver
                      ativo.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      updateForm(
                        "active",
                        !form.active
                      )
                    }
                    style={{
                      border: "none",
                      background:
                        "transparent",
                      cursor:
                        "pointer",
                      color: form.active
                        ? "#16a34a"
                        : "#94a3b8",
                    }}
                  >
                    {form.active ? (
                      <ToggleRight
                        size={38}
                      />
                    ) : (
                      <ToggleLeft
                        size={38}
                      />
                    )}
                  </button>
                </div>
              </div>

              {/* MODAL FOOTER */}

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "flex-end",
                  gap: 10,
                  marginTop: 24,
                  paddingTop: 18,
                  borderTop:
                    "1px solid #e2e8f0",
                }}
              >
                <button
                  onClick={fecharModal}
                  disabled={saving}
                  style={{
                    height: 43,
                    padding:
                      "0 16px",
                    borderRadius: 11,
                    border:
                      "1px solid #e2e8f0",
                    background: "#fff",
                    color: "#475569",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>

                <button
                  onClick={salvarPlano}
                  disabled={saving}
                  style={{
                    height: 43,
                    padding:
                      "0 18px",
                    borderRadius: 11,
                    border: "none",
                    background:
                      "linear-gradient(135deg,#4f46e5,#7c3aed)",
                    color: "#fff",
                    fontWeight: 850,
                    display: "flex",
                    alignItems:
                      "center",
                    gap: 8,
                    cursor: saving
                      ? "not-allowed"
                      : "pointer",
                    opacity: saving
                      ? 0.7
                      : 1,
                  }}
                >
                  {saving ? (
                    <RefreshCw
                      size={17}
                      style={{
                        animation:
                          "spin 1s linear infinite",
                      }}
                    />
                  ) : (
                    <Check size={17} />
                  )}

                  {saving
                    ? "Salvando..."
                    : editingPlan
                    ? "Salvar alterações"
                    : "Criar plano"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        input:focus,
        textarea:focus {
          border-color: #818cf8 !important;
          box-shadow:
            0 0 0 3px
            rgba(99, 102, 241, 0.1);
          background: #fff !important;
        }

        button {
          transition:
            transform 0.15s ease,
            box-shadow 0.15s ease,
            opacity 0.15s ease;
        }

        button:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        @media (max-width: 900px) {
          main {
            padding: 20px !important;
          }

          section {
            grid-template-columns:
              repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 620px) {
          main {
            padding: 14px !important;
          }

          section {
            grid-template-columns:
              1fr !important;
          }
        }
      `}</style>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  description: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 16,
        padding: 18,
        boxShadow:
          "0 6px 22px rgba(15,23,42,.04)",
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          background: "#eef2ff",
          color: "#4f46e5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 15,
        }}
      >
        {icon}
      </div>

      <div
        style={{
          color: "#64748b",
          fontSize: 12,
          fontWeight: 750,
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 4,
          fontSize: 23,
          fontWeight: 900,
          letterSpacing: "-.03em",
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

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      style={{
        display: "grid",
        gap: 7,
      }}
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: 800,
          color: "#334155",
        }}
      >
        {label}

        {required && (
          <span
            style={{
              color: "#ef4444",
              marginLeft: 3,
            }}
          >
            *
          </span>
        )}
      </span>

      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 42,
  padding: "0 12px",
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  color: "#0f172a",
  outline: "none",
  fontSize: 14,
  boxSizing: "border-box",
};

const thStyle: React.CSSProperties = {
  padding: "12px 18px",
  textAlign: "left",
  color: "#64748b",
  fontSize: 11,
  fontWeight: 850,
  textTransform: "uppercase",
  letterSpacing: ".05em",
};

const tdStyle: React.CSSProperties = {
  padding: "15px 18px",
  color: "#334155",
  fontSize: 13,
  verticalAlign: "middle",
};

const actionButtonStyle: React.CSSProperties = {
  width: 35,
  height: 35,
  borderRadius: 9,
  border: "1px solid #e2e8f0",
  background: "#fff",
  color: "#475569",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};