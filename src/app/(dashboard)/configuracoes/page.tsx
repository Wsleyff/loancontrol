"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  Building2,
  Check,
  ChevronRight,
  CircleDollarSign,
  Database,
  Lock,
  Palette,
  RefreshCw,
  Save,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Company = Record<string, any>;

type SettingsState = {
  companyName: string;
  companyDocument: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;

  currency: string;
  dateFormat: string;
  defaultInterestRate: string;
  defaultLateFee: string;
  defaultGraceDays: string;

  notificationsEnabled: boolean;
  overdueNotifications: boolean;
  paymentNotifications: boolean;
  lowCashNotifications: boolean;

  compactMode: boolean;
  confirmPayments: boolean;
  autoRefresh: boolean;
};

const initialSettings: SettingsState = {
  companyName: "",
  companyDocument: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",

  currency: "BRL",
  dateFormat: "dd/MM/yyyy",
  defaultInterestRate: "7.60",
  defaultLateFee: "2.00",
  defaultGraceDays: "0",

  notificationsEnabled: true,
  overdueNotifications: true,
  paymentNotifications: true,
  lowCashNotifications: true,

  compactMode: false,
  confirmPayments: true,
  autoRefresh: true,
};

function firstValue(
  object: Record<string, any> | null | undefined,
  keys: string[],
  fallback = ""
) {
  if (!object) return fallback;

  for (const key of keys) {
    const value = object[key];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }

  return fallback;
}

function getErrorMessage(error: any) {
  if (!error) return "Ocorreu um erro inesperado.";

  if (typeof error === "string") return error;

  return (
    error.message ||
    error.details ||
    error.hint ||
    "Ocorreu um erro inesperado."
  );
}

export default function Page() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [company, setCompany] = useState<Company | null>(null);
  const [role, setRole] = useState("");

  const [activeSection, setActiveSection] = useState("empresa");

  const [settings, setSettings] =
    useState<SettingsState>(initialSettings);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    setError("");

    try {
      if (!supabase) {
        throw new Error(
          "Supabase não configurado. Verifique o arquivo .env.local."
        );
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        throw new Error("Usuário não autenticado.");
      }

      const { data: membership, error: membershipError } =
        await supabase
          .from("company_users")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "ACTIVE")
          .limit(1)
          .maybeSingle();

      if (membershipError) throw membershipError;

      if (!membership?.company_id) {
        throw new Error(
          "Seu usuário ainda não está vinculado a uma empresa."
        );
      }

      setRole(firstValue(membership, ["role"], "OPERATOR"));

      const { data: companyData, error: companyError } =
        await supabase
          .from("companies")
          .select("*")
          .eq("id", membership.company_id)
          .maybeSingle();

      if (companyError) throw companyError;

      if (!companyData) {
        throw new Error("Empresa não encontrada.");
      }

      setCompany(companyData);

      setSettings((current) => ({
        ...current,

        companyName: firstValue(companyData, [
          "name",
          "company_name",
          "trade_name",
        ]),

        companyDocument: firstValue(companyData, [
          "document",
          "cnpj",
          "cpf_cnpj",
        ]),

        phone: firstValue(companyData, [
          "phone",
          "telephone",
          "mobile",
        ]),

        email: firstValue(companyData, ["email"]),

        address: firstValue(companyData, [
          "address",
          "street",
          "logradouro",
        ]),

        city: firstValue(companyData, ["city", "cidade"]),

        state: firstValue(companyData, [
          "state",
          "uf",
          "estado",
        ]),

        zipCode: firstValue(companyData, [
          "zip_code",
          "zipcode",
          "cep",
        ]),
      }));

      // Carrega configurações adicionais somente se a tabela existir.
      const { data: settingsData, error: settingsError } =
        await supabase
          .from("company_settings")
          .select("*")
          .eq("company_id", membership.company_id);

      if (!settingsError && settingsData) {
        const values: Record<string, any> = {};

        for (const item of settingsData) {
          const key = firstValue(item, [
            "key",
            "setting_key",
            "name",
            "code",
          ]);

          let value = item?.value;

          if (value === undefined) {
            value = item?.setting_value;
          }

          if (value === undefined) {
            value = item?.data;
          }

          if (key) {
            values[key] = value;
          }
        }

        setSettings((current) => ({
          ...current,

          currency:
            values.currency !== undefined
              ? String(values.currency)
              : current.currency,

          dateFormat:
            values.date_format !== undefined
              ? String(values.date_format)
              : current.dateFormat,

          defaultInterestRate:
            values.default_interest_rate !== undefined
              ? String(values.default_interest_rate)
              : current.defaultInterestRate,

          defaultLateFee:
            values.default_late_fee !== undefined
              ? String(values.default_late_fee)
              : current.defaultLateFee,

          defaultGraceDays:
            values.default_grace_days !== undefined
              ? String(values.default_grace_days)
              : current.defaultGraceDays,

          notificationsEnabled:
            values.notifications_enabled !== undefined
              ? Boolean(values.notifications_enabled)
              : current.notificationsEnabled,

          overdueNotifications:
            values.overdue_notifications !== undefined
              ? Boolean(values.overdue_notifications)
              : current.overdueNotifications,

          paymentNotifications:
            values.payment_notifications !== undefined
              ? Boolean(values.payment_notifications)
              : current.paymentNotifications,

          lowCashNotifications:
            values.low_cash_notifications !== undefined
              ? Boolean(values.low_cash_notifications)
              : current.lowCashNotifications,

          compactMode:
            values.compact_mode !== undefined
              ? Boolean(values.compact_mode)
              : current.compactMode,

          confirmPayments:
            values.confirm_payments !== undefined
              ? Boolean(values.confirm_payments)
              : current.confirmPayments,

          autoRefresh:
            values.auto_refresh !== undefined
              ? Boolean(values.auto_refresh)
              : current.autoRefresh,
        }));
      }
    } catch (err: any) {
      console.error("[CONFIGURAÇÕES]", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function update<K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K]
  ) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));

    setSuccess("");
  }

  async function saveCompany() {
    if (!supabase || !company?.id) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload: Record<string, any> = {};

      /*
       * Só enviamos os campos que normalmente fazem parte
       * do cadastro da empresa.
       */
      const companyKeys = Object.keys(company);

      const putIfExists = (
        possibleKeys: string[],
        value: string
      ) => {
        const existingKey = possibleKeys.find((key) =>
          companyKeys.includes(key)
        );

        if (existingKey) {
          payload[existingKey] = value;
        }
      };

      putIfExists(
        ["name", "company_name", "trade_name"],
        settings.companyName
      );

      putIfExists(
        ["document", "cnpj", "cpf_cnpj"],
        settings.companyDocument
      );

      putIfExists(
        ["phone", "telephone", "mobile"],
        settings.phone
      );

      putIfExists(["email"], settings.email);

      putIfExists(
        ["address", "street", "logradouro"],
        settings.address
      );

      putIfExists(["city", "cidade"], settings.city);

      putIfExists(
        ["state", "uf", "estado"],
        settings.state
      );

      putIfExists(
        ["zip_code", "zipcode", "cep"],
        settings.zipCode
      );

      if (Object.keys(payload).length === 0) {
        throw new Error(
          "Não foi encontrado nenhum campo editável no cadastro da empresa."
        );
      }

      const { data, error: updateError } = await supabase
        .from("companies")
        .update(payload)
        .eq("id", company.id)
        .select("*")
        .single();

      if (updateError) throw updateError;

      setCompany(data);
      setSuccess("Dados da empresa atualizados com sucesso.");
    } catch (err: any) {
      console.error("[CONFIGURAÇÕES EMPRESA]", err);
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function savePreferences() {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (!supabase || !company?.id) {
        throw new Error("Empresa não encontrada.");
      }

      /*
       * Como a estrutura exata de company_settings pode variar,
       * tentamos detectar automaticamente os nomes dos campos.
       */
      const { data: existing, error: readError } = await supabase
        .from("company_settings")
        .select("*")
        .eq("company_id", company.id);

      if (readError) {
        throw readError;
      }

      if (!existing || existing.length === 0) {
        setSuccess(
          "Preferências salvas nesta sessão. A tabela company_settings ainda não possui registros para esta empresa."
        );
        return;
      }

      const rows = [
        {
          key: "currency",
          value: settings.currency,
        },
        {
          key: "date_format",
          value: settings.dateFormat,
        },
        {
          key: "default_interest_rate",
          value: settings.defaultInterestRate,
        },
        {
          key: "default_late_fee",
          value: settings.defaultLateFee,
        },
        {
          key: "default_grace_days",
          value: settings.defaultGraceDays,
        },
        {
          key: "notifications_enabled",
          value: settings.notificationsEnabled,
        },
        {
          key: "overdue_notifications",
          value: settings.overdueNotifications,
        },
        {
          key: "payment_notifications",
          value: settings.paymentNotifications,
        },
        {
          key: "low_cash_notifications",
          value: settings.lowCashNotifications,
        },
        {
          key: "compact_mode",
          value: settings.compactMode,
        },
        {
          key: "confirm_payments",
          value: settings.confirmPayments,
        },
        {
          key: "auto_refresh",
          value: settings.autoRefresh,
        },
      ];

      for (const row of rows) {
        const current = existing.find((item: any) => {
          const itemKey = firstValue(item, [
            "key",
            "setting_key",
            "name",
            "code",
          ]);

          return itemKey === row.key;
        });

        if (!current) continue;

        const updatePayload: Record<string, any> = {};

        if (Object.prototype.hasOwnProperty.call(current, "value")) {
          updatePayload.value = String(row.value);
        } else if (
          Object.prototype.hasOwnProperty.call(
            current,
            "setting_value"
          )
        ) {
          updatePayload.setting_value = String(row.value);
        } else if (
          Object.prototype.hasOwnProperty.call(current, "data")
        ) {
          updatePayload.data = row.value;
        } else {
          continue;
        }

        const { error: updateError } = await supabase
          .from("company_settings")
          .update(updatePayload)
          .eq("id", current.id);

        if (updateError) {
          throw updateError;
        }
      }

      setSuccess("Preferências atualizadas com sucesso.");
    } catch (err: any) {
      console.error("[CONFIGURAÇÕES PREFERÊNCIAS]", err);
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function resetDefaults() {
    setSettings((current) => ({
      ...current,

      currency: "BRL",
      dateFormat: "dd/MM/yyyy",
      defaultInterestRate: "7.60",
      defaultLateFee: "2.00",
      defaultGraceDays: "0",

      notificationsEnabled: true,
      overdueNotifications: true,
      paymentNotifications: true,
      lowCashNotifications: true,

      compactMode: false,
      confirmPayments: true,
      autoRefresh: true,
    }));

    setSuccess("");
  }

  const sections = [
    {
      id: "empresa",
      label: "Empresa",
      description: "Dados do negócio",
      icon: Building2,
    },
    {
      id: "financeiro",
      label: "Financeiro",
      description: "Regras e padrões",
      icon: CircleDollarSign,
    },
    {
      id: "notificacoes",
      label: "Notificações",
      description: "Alertas do sistema",
      icon: Bell,
    },
    {
      id: "sistema",
      label: "Sistema",
      description: "Preferências",
      icon: SlidersHorizontal,
    },
    {
      id: "seguranca",
      label: "Segurança",
      description: "Acesso e proteção",
      icon: ShieldCheck,
    },
  ];

  if (loading) {
    return (
      <main className="container">
        <div className="loadingBox">
          <div className="spinner" />
          <strong>Carregando configurações...</strong>
          <span>Buscando os dados da sua empresa.</span>
        </div>

        <style jsx>{`
          .loadingBox {
            min-height: 420px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 10px;
            color: var(--muted, #64748b);
          }

          .loadingBox strong {
            color: var(--foreground, #0f172a);
            font-size: 18px;
          }

          .spinner {
            width: 38px;
            height: 38px;
            border: 3px solid #e2e8f0;
            border-top-color: #2563eb;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin-bottom: 8px;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="container">
      <div className="pageHeader">
        <div>
          <div className="eyebrow">
            <Settings size={15} />
            CENTRAL DE CONFIGURAÇÕES
          </div>

          <h1>Configurações</h1>

          <p>
            Personalize o LoanControl e mantenha as informações da
            sua empresa sempre atualizadas.
          </p>
        </div>

        <button
          className="refreshButton"
          onClick={loadSettings}
          disabled={loading}
        >
          <RefreshCw size={17} />
          Atualizar
        </button>
      </div>

      {error && (
        <div className="alert error">
          <div className="alertIcon">!</div>
          <div>
            <strong>Não foi possível concluir a operação</strong>
            <span>{error}</span>
          </div>

          <button onClick={() => setError("")}>×</button>
        </div>
      )}

      {success && (
        <div className="alert success">
          <div className="alertIcon">
            <Check size={17} />
          </div>

          <div>
            <strong>Alterações salvas</strong>
            <span>{success}</span>
          </div>

          <button onClick={() => setSuccess("")}>×</button>
        </div>
      )}

      <div className="settingsLayout">
        <aside className="settingsSidebar">
          <div className="sidebarTitle">
            <SlidersHorizontal size={17} />
            Preferências
          </div>

          <div className="menu">
            {sections.map((section) => {
              const Icon = section.icon;
              const active = activeSection === section.id;

              return (
                <button
                  key={section.id}
                  className={`menuItem ${
                    active ? "active" : ""
                  }`}
                  onClick={() => setActiveSection(section.id)}
                >
                  <div className="menuIcon">
                    <Icon size={18} />
                  </div>

                  <div className="menuText">
                    <strong>{section.label}</strong>
                    <span>{section.description}</span>
                  </div>

                  <ChevronRight size={16} />
                </button>
              );
            })}
          </div>

          <div className="securityCard">
            <div className="securityIcon">
              <Lock size={18} />
            </div>

            <strong>Dados protegidos</strong>

            <p>
              Suas informações são armazenadas de forma segura no
              Supabase.
            </p>
          </div>
        </aside>

        <section className="settingsContent">
          {activeSection === "empresa" && (
            <>
              <SectionHeader
                icon={<Building2 size={20} />}
                title="Dados da empresa"
                description="Informações utilizadas no cadastro e na operação da carteira."
              />

              <div className="companyHero">
                <div className="companyLogo">
                  {settings.companyName
                    ? settings.companyName
                        .trim()
                        .charAt(0)
                        .toUpperCase()
                    : "L"}
                </div>

                <div>
                  <strong>
                    {settings.companyName || "Minha empresa"}
                  </strong>

                  <span>
                    {role === "ADMIN"
                      ? "Administrador"
                      : role === "MANAGER"
                      ? "Gerente"
                      : role === "COLLECTOR"
                      ? "Cobrador"
                      : "Operador"}
                  </span>
                </div>

                <div className="companyStatus">
                  <span />
                  Empresa ativa
                </div>
              </div>

              <div className="formCard">
                <div className="cardHeading">
                  <div>
                    <h3>Informações principais</h3>
                    <p>Dados básicos do negócio.</p>
                  </div>
                </div>

                <div className="formGrid">
                  <Field
                    label="Nome da empresa"
                    value={settings.companyName}
                    onChange={(value) =>
                      update("companyName", value)
                    }
                    placeholder="Ex.: Loan Control Financeira"
                  />

                  <Field
                    label="CNPJ / CPF"
                    value={settings.companyDocument}
                    onChange={(value) =>
                      update("companyDocument", value)
                    }
                    placeholder="00.000.000/0001-00"
                  />

                  <Field
                    label="Telefone"
                    value={settings.phone}
                    onChange={(value) => update("phone", value)}
                    placeholder="(85) 99999-9999"
                  />

                  <Field
                    label="E-mail"
                    type="email"
                    value={settings.email}
                    onChange={(value) => update("email", value)}
                    placeholder="contato@empresa.com"
                  />

                  <div className="full">
                    <Field
                      label="Endereço"
                      value={settings.address}
                      onChange={(value) =>
                        update("address", value)
                      }
                      placeholder="Rua, avenida, número..."
                    />
                  </div>

                  <Field
                    label="Cidade"
                    value={settings.city}
                    onChange={(value) => update("city", value)}
                    placeholder="Fortaleza"
                  />

                  <Field
                    label="Estado"
                    value={settings.state}
                    onChange={(value) => update("state", value)}
                    placeholder="CE"
                  />

                  <Field
                    label="CEP"
                    value={settings.zipCode}
                    onChange={(value) =>
                      update("zipCode", value)
                    }
                    placeholder="60000-000"
                  />
                </div>

                <div className="cardFooter">
                  <span>
                    Essas informações pertencem à empresa atual.
                  </span>

                  <button
                    className="primaryButton"
                    onClick={saveCompany}
                    disabled={saving}
                  >
                    <Save size={17} />
                    {saving ? "Salvando..." : "Salvar alterações"}
                  </button>
                </div>
              </div>
            </>
          )}

          {activeSection === "financeiro" && (
            <>
              <SectionHeader
                icon={<CircleDollarSign size={20} />}
                title="Configurações financeiras"
                description="Defina padrões utilizados nas novas operações."
              />

              <div className="infoBanner">
                <div className="infoIcon">
                  <CircleDollarSign size={19} />
                </div>

                <div>
                  <strong>Regras padrão</strong>
                  <p>
                    Estes valores servem como referência para novas
                    operações. Você poderá ajustar cada empréstimo
                    individualmente.
                  </p>
                </div>
              </div>

              <div className="formCard">
                <div className="cardHeading">
                  <div>
                    <h3>Padrões financeiros</h3>
                    <p>
                      Valores usados como padrão no simulador e nos
                      novos empréstimos.
                    </p>
                  </div>
                </div>

                <div className="formGrid">
                  <SelectField
                    label="Moeda"
                    value={settings.currency}
                    onChange={(value) =>
                      update("currency", value)
                    }
                    options={[
                      { value: "BRL", label: "Real brasileiro (R$)" },
                      { value: "USD", label: "Dólar americano (US$)" },
                      { value: "EUR", label: "Euro (€)" },
                    ]}
                  />

                  <SelectField
                    label="Formato de data"
                    value={settings.dateFormat}
                    onChange={(value) =>
                      update("dateFormat", value)
                    }
                    options={[
                      {
                        value: "dd/MM/yyyy",
                        label: "31/12/2026",
                      },
                      {
                        value: "MM/dd/yyyy",
                        label: "12/31/2026",
                      },
                      {
                        value: "yyyy-MM-dd",
                        label: "2026-12-31",
                      },
                    ]}
                  />

                  <Field
                    label="Taxa de juros padrão (% ao mês)"
                    type="number"
                    value={settings.defaultInterestRate}
                    onChange={(value) =>
                      update("defaultInterestRate", value)
                    }
                    placeholder="7.60"
                  />

                  <Field
                    label="Multa padrão (%)"
                    type="number"
                    value={settings.defaultLateFee}
                    onChange={(value) =>
                      update("defaultLateFee", value)
                    }
                    placeholder="2.00"
                  />

                  <Field
                    label="Dias de carência"
                    type="number"
                    value={settings.defaultGraceDays}
                    onChange={(value) =>
                      update("defaultGraceDays", value)
                    }
                    placeholder="0"
                  />
                </div>

                <div className="cardFooter">
                  <button
                    className="secondaryButton"
                    onClick={resetDefaults}
                  >
                    Restaurar padrões
                  </button>

                  <button
                    className="primaryButton"
                    onClick={savePreferences}
                    disabled={saving}
                  >
                    <Save size={17} />
                    {saving ? "Salvando..." : "Salvar configurações"}
                  </button>
                </div>
              </div>
            </>
          )}

          {activeSection === "notificacoes" && (
            <>
              <SectionHeader
                icon={<Bell size={20} />}
                title="Notificações"
                description="Controle quais alertas devem aparecer no sistema."
              />

              <div className="formCard">
                <div className="cardHeading">
                  <div>
                    <h3>Central de alertas</h3>
                    <p>
                      Escolha quais acontecimentos importantes devem
                      gerar notificações.
                    </p>
                  </div>
                </div>

                <Toggle
                  title="Notificações do sistema"
                  description="Ativa ou desativa as notificações internas."
                  checked={settings.notificationsEnabled}
                  onChange={(value) =>
                    update("notificationsEnabled", value)
                  }
                />

                <Toggle
                  title="Parcelas em atraso"
                  description="Avisar quando uma parcela entrar em atraso."
                  checked={settings.overdueNotifications}
                  onChange={(value) =>
                    update("overdueNotifications", value)
                  }
                  disabled={!settings.notificationsEnabled}
                />

                <Toggle
                  title="Pagamentos recebidos"
                  description="Avisar quando um pagamento for registrado."
                  checked={settings.paymentNotifications}
                  onChange={(value) =>
                    update("paymentNotifications", value)
                  }
                  disabled={!settings.notificationsEnabled}
                />

                <Toggle
                  title="Alertas financeiros"
                  description="Receber alertas relacionados ao caixa."
                  checked={settings.lowCashNotifications}
                  onChange={(value) =>
                    update("lowCashNotifications", value)
                  }
                  disabled={!settings.notificationsEnabled}
                />

                <div className="cardFooter">
                  <span>
                    As notificações podem ser ajustadas novamente
                    quando quiser.
                  </span>

                  <button
                    className="primaryButton"
                    onClick={savePreferences}
                    disabled={saving}
                  >
                    <Save size={17} />
                    Salvar preferências
                  </button>
                </div>
              </div>
            </>
          )}

          {activeSection === "sistema" && (
            <>
              <SectionHeader
                icon={<SlidersHorizontal size={20} />}
                title="Preferências do sistema"
                description="Ajuste o comportamento da interface e das operações."
              />

              <div className="formCard">
                <div className="cardHeading">
                  <div>
                    <h3>Comportamento</h3>
                    <p>
                      Personalize a experiência de uso do
                      LoanControl.
                    </p>
                  </div>
                </div>

                <Toggle
                  title="Modo compacto"
                  description="Reduz espaços da interface para exibir mais informações."
                  checked={settings.compactMode}
                  onChange={(value) =>
                    update("compactMode", value)
                  }
                />

                <Toggle
                  title="Confirmar recebimentos"
                  description="Pedir confirmação antes de registrar um pagamento."
                  checked={settings.confirmPayments}
                  onChange={(value) =>
                    update("confirmPayments", value)
                  }
                />

                <Toggle
                  title="Atualização automática"
                  description="Atualizar informações da carteira automaticamente."
                  checked={settings.autoRefresh}
                  onChange={(value) =>
                    update("autoRefresh", value)
                  }
                />

                <div className="cardFooter">
                  <span>
                    As alterações são aplicadas às preferências da
                    empresa.
                  </span>

                  <button
                    className="primaryButton"
                    onClick={savePreferences}
                    disabled={saving}
                  >
                    <Save size={17} />
                    Salvar preferências
                  </button>
                </div>
              </div>
            </>
          )}

          {activeSection === "seguranca" && (
            <>
              <SectionHeader
                icon={<ShieldCheck size={20} />}
                title="Segurança"
                description="Informações sobre acesso e proteção da conta."
              />

              <div className="securityGrid">
                <div className="securityPanel">
                  <div className="largeSecurityIcon">
                    <Lock size={24} />
                  </div>

                  <h3>Conta protegida</h3>

                  <p>
                    O acesso ao LoanControl utiliza autenticação
                    segura e as informações da empresa são protegidas
                    pelas políticas de segurança do Supabase.
                  </p>

                  <div className="securityBadge">
                    <Check size={15} />
                    Autenticação ativa
                  </div>
                </div>

                <div className="securityPanel">
                  <div className="largeSecurityIcon">
                    <UserRound size={24} />
                  </div>

                  <h3>Seu nível de acesso</h3>

                  <p>
                    Seu perfil controla quais operações você pode
                    executar dentro da empresa.
                  </p>

                  <div className="roleBadge">
                    {role === "ADMIN"
                      ? "ADMINISTRADOR"
                      : role === "MANAGER"
                      ? "GERENTE"
                      : role === "COLLECTOR"
                      ? "COBRADOR"
                      : "OPERADOR"}
                  </div>
                </div>

                <div className="securityPanel">
                  <div className="largeSecurityIcon">
                    <Database size={24} />
                  </div>

                  <h3>Banco de dados</h3>

                  <p>
                    Os dados operacionais são mantidos no banco
                    conectado ao ambiente da sua empresa.
                  </p>

                  <div className="securityBadge">
                    <Check size={15} />
                    Supabase conectado
                  </div>
                </div>

                <div className="securityPanel">
                  <div className="largeSecurityIcon">
                    <Palette size={24} />
                  </div>

                  <h3>Ambiente</h3>

                  <p>
                    O sistema está preparado para operação
                    multiempresa com dados isolados por empresa.
                  </p>

                  <div className="securityBadge">
                    <Check size={15} />
                    Ambiente configurado
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <style jsx>{`
        .pageHeader {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 26px;
        }

        .eyebrow {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #2563eb;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
          margin-bottom: 8px;
        }

        .pageHeader h1 {
          margin: 0;
          font-size: 30px;
          line-height: 1.1;
          color: #0f172a;
          letter-spacing: -0.03em;
        }

        .pageHeader p {
          margin: 9px 0 0;
          color: #64748b;
          font-size: 14px;
        }

        .refreshButton,
        .primaryButton,
        .secondaryButton {
          border: 0;
          border-radius: 10px;
          min-height: 42px;
          padding: 0 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-weight: 750;
          cursor: pointer;
          transition: 0.18s ease;
        }

        .refreshButton {
          background: #fff;
          border: 1px solid #e2e8f0;
          color: #334155;
        }

        .refreshButton:hover {
          background: #f8fafc;
        }

        .primaryButton {
          background: #2563eb;
          color: #fff;
          box-shadow: 0 7px 18px rgba(37, 99, 235, 0.18);
        }

        .primaryButton:hover {
          background: #1d4ed8;
          transform: translateY(-1px);
        }

        .secondaryButton {
          background: #f1f5f9;
          color: #334155;
        }

        .secondaryButton:hover {
          background: #e2e8f0;
        }

        button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none !important;
        }

        .alert {
          display: flex;
          align-items: center;
          gap: 12px;
          border-radius: 12px;
          padding: 13px 15px;
          margin-bottom: 20px;
          border: 1px solid;
        }

        .alert.error {
          background: #fff7f7;
          border-color: #fecaca;
          color: #991b1b;
        }

        .alert.success {
          background: #f0fdf4;
          border-color: #bbf7d0;
          color: #166534;
        }

        .alertIcon {
          width: 31px;
          height: 31px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
          background: rgba(255, 255, 255, 0.7);
          font-weight: 900;
        }

        .alert > div:nth-child(2) {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
        }

        .alert span {
          font-size: 13px;
          opacity: 0.9;
        }

        .alert > button {
          border: 0;
          background: transparent;
          font-size: 22px;
          cursor: pointer;
          color: inherit;
        }

        .settingsLayout {
          display: grid;
          grid-template-columns: 260px minmax(0, 1fr);
          gap: 22px;
          align-items: start;
        }

        .settingsSidebar {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 12px;
          box-shadow: 0 8px 25px rgba(15, 23, 42, 0.04);
          position: sticky;
          top: 20px;
        }

        .sidebarTitle {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #64748b;
          font-size: 11px;
          font-weight: 850;
          letter-spacing: 0.08em;
          padding: 8px 9px 12px;
        }

        .menu {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .menuItem {
          width: 100%;
          border: 0;
          background: transparent;
          border-radius: 11px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          cursor: pointer;
          text-align: left;
          color: #64748b;
          transition: 0.16s ease;
        }

        .menuItem:hover {
          background: #f8fafc;
          color: #334155;
        }

        .menuItem.active {
          background: #eff6ff;
          color: #2563eb;
        }

        .menuIcon {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
          flex: 0 0 auto;
        }

        .menuItem.active .menuIcon {
          background: #dbeafe;
        }

        .menuText {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .menuText strong {
          font-size: 13px;
          color: #1e293b;
        }

        .menuItem.active .menuText strong {
          color: #1d4ed8;
        }

        .menuText span {
          font-size: 11px;
          color: #94a3b8;
        }

        .securityCard {
          margin: 13px 2px 2px;
          padding: 13px;
          border-radius: 12px;
          background: #f8fafc;
          border: 1px solid #eef2f7;
        }

        .securityIcon {
          width: 32px;
          height: 32px;
          border-radius: 9px;
          background: #dcfce7;
          color: #16a34a;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 9px;
        }

        .securityCard strong {
          font-size: 12px;
          color: #334155;
        }

        .securityCard p {
          margin: 5px 0 0;
          font-size: 11px;
          line-height: 1.5;
          color: #94a3b8;
        }

        .settingsContent {
          min-width: 0;
        }

        .sectionHeader {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 18px;
        }

        .sectionIcon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #eff6ff;
          color: #2563eb;
          flex: 0 0 auto;
        }

        .sectionHeader h2 {
          margin: 1px 0 3px;
          color: #0f172a;
          font-size: 20px;
          letter-spacing: -0.02em;
        }

        .sectionHeader p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
        }

        .companyHero {
          background: linear-gradient(135deg, #0f172a, #1e293b);
          color: #fff;
          border-radius: 16px;
          padding: 19px;
          display: flex;
          align-items: center;
          gap: 13px;
          margin-bottom: 16px;
          box-shadow: 0 15px 35px rgba(15, 23, 42, 0.12);
        }

        .companyLogo {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.13);
          border: 1px solid rgba(255, 255, 255, 0.14);
          font-size: 21px;
          font-weight: 850;
        }

        .companyHero > div:nth-child(2) {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .companyHero strong {
          font-size: 15px;
        }

        .companyHero span {
          color: #cbd5e1;
          font-size: 12px;
        }

        .companyStatus {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 7px 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          color: #dbeafe !important;
          font-size: 11px !important;
          font-weight: 750;
        }

        .companyStatus span {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #22c55e;
        }

        .formCard {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 8px 25px rgba(15, 23, 42, 0.04);
        }

        .cardHeading {
          margin-bottom: 20px;
        }

        .cardHeading h3 {
          margin: 0;
          color: #1e293b;
          font-size: 15px;
        }

        .cardHeading p {
          margin: 4px 0 0;
          color: #94a3b8;
          font-size: 12px;
        }

        .formGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 15px;
        }

        .full {
          grid-column: 1 / -1;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .field label {
          color: #475569;
          font-size: 12px;
          font-weight: 750;
        }

        .field input,
        .field select {
          width: 100%;
          min-height: 43px;
          border: 1px solid #dbe2ea;
          background: #fff;
          border-radius: 10px;
          padding: 0 12px;
          color: #1e293b;
          font-size: 13px;
          outline: none;
          transition: 0.16s ease;
          box-sizing: border-box;
        }

        .field input:focus,
        .field select:focus {
          border-color: #60a5fa;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
        }

        .cardFooter {
          margin-top: 22px;
          padding-top: 17px;
          border-top: 1px solid #eef2f7;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
        }

        .cardFooter > span {
          color: #94a3b8;
          font-size: 11px;
        }

        .infoBanner {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          background: #eff6ff;
          border: 1px solid #dbeafe;
          border-radius: 13px;
          padding: 14px;
          margin-bottom: 16px;
        }

        .infoIcon {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #dbeafe;
          color: #2563eb;
          flex: 0 0 auto;
        }

        .infoBanner strong {
          font-size: 12px;
          color: #1e40af;
        }

        .infoBanner p {
          margin: 3px 0 0;
          color: #3b82f6;
          font-size: 11px;
          line-height: 1.5;
        }

        .toggleRow {
          min-height: 70px;
          display: flex;
          align-items: center;
          gap: 13px;
          border-bottom: 1px solid #f1f5f9;
        }

        .toggleRow:last-of-type {
          border-bottom: 0;
        }

        .toggleText {
          flex: 1;
        }

        .toggleText strong {
          display: block;
          color: #334155;
          font-size: 13px;
        }

        .toggleText span {
          display: block;
          color: #94a3b8;
          font-size: 11px;
          margin-top: 3px;
        }

        .switch {
          width: 46px;
          height: 26px;
          border: 0;
          border-radius: 999px;
          background: #cbd5e1;
          padding: 3px;
          cursor: pointer;
          transition: 0.18s ease;
          flex: 0 0 auto;
        }

        .switch.on {
          background: #2563eb;
        }

        .switch.disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .switch span {
          display: block;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 2px 5px rgba(15, 23, 42, 0.2);
          transition: 0.18s ease;
        }

        .switch.on span {
          transform: translateX(20px);
        }

        .securityGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 15px;
        }

        .securityPanel {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 8px 25px rgba(15, 23, 42, 0.04);
        }

        .largeSecurityIcon {
          width: 46px;
          height: 46px;
          border-radius: 13px;
          background: #eff6ff;
          color: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 15px;
        }

        .securityPanel h3 {
          margin: 0;
          font-size: 14px;
          color: #1e293b;
        }

        .securityPanel p {
          margin: 7px 0 14px;
          color: #64748b;
          font-size: 12px;
          line-height: 1.6;
        }

        .securityBadge,
        .roleBadge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border-radius: 999px;
          padding: 6px 9px;
          font-size: 10px;
          font-weight: 800;
        }

        .securityBadge {
          background: #f0fdf4;
          color: #15803d;
        }

        .roleBadge {
          background: #eff6ff;
          color: #2563eb;
        }

        @media (max-width: 900px) {
          .settingsLayout {
            grid-template-columns: 1fr;
          }

          .settingsSidebar {
            position: static;
          }

          .menu {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .securityCard {
            display: none;
          }
        }

        @media (max-width: 650px) {
          .pageHeader {
            flex-direction: column;
          }

          .refreshButton {
            width: 100%;
          }

          .menu {
            grid-template-columns: 1fr;
          }

          .formGrid,
          .securityGrid {
            grid-template-columns: 1fr;
          }

          .full {
            grid-column: auto;
          }

          .companyHero {
            align-items: flex-start;
            flex-wrap: wrap;
          }

          .companyStatus {
            width: 100%;
            justify-content: center;
          }

          .cardFooter {
            flex-direction: column;
            align-items: stretch;
          }

          .cardFooter > span {
            text-align: center;
          }

          .primaryButton,
          .secondaryButton {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="sectionHeader">
      <div className="sectionIcon">{icon}</div>

      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>

      <style jsx>{`
        .sectionHeader {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 18px;
        }

        .sectionIcon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #eff6ff;
          color: #2563eb;
          flex: 0 0 auto;
        }

        .sectionHeader h2 {
          margin: 1px 0 3px;
          color: #0f172a;
          font-size: 20px;
          letter-spacing: -0.02em;
        }

        .sectionHeader p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="field">
      <label>{label}</label>

      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />

      <style jsx>{`
        .field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .field label {
          color: #475569;
          font-size: 12px;
          font-weight: 750;
        }

        .field input {
          width: 100%;
          min-height: 43px;
          border: 1px solid #dbe2ea;
          background: #fff;
          border-radius: 10px;
          padding: 0 12px;
          color: #1e293b;
          font-size: 13px;
          outline: none;
          transition: 0.16s ease;
          box-sizing: border-box;
        }

        .field input:focus {
          border-color: #60a5fa;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
        }
      `}</style>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{
    value: string;
    label: string;
  }>;
}) {
  return (
    <div className="field">
      <label>{label}</label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>

      <style jsx>{`
        .field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .field label {
          color: #475569;
          font-size: 12px;
          font-weight: 750;
        }

        .field select {
          width: 100%;
          min-height: 43px;
          border: 1px solid #dbe2ea;
          background: #fff;
          border-radius: 10px;
          padding: 0 12px;
          color: #1e293b;
          font-size: 13px;
          outline: none;
          box-sizing: border-box;
        }

        .field select:focus {
          border-color: #60a5fa;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
        }
      `}</style>
    </div>
  );
}

function Toggle({
  title,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="toggleRow">
      <div className="toggleText">
        <strong>{title}</strong>
        <span>{description}</span>
      </div>

      <button
        type="button"
        className={`switch ${checked ? "on" : ""} ${
          disabled ? "disabled" : ""
        }`}
        onClick={() => {
          if (!disabled) {
            onChange(!checked);
          }
        }}
        aria-label={title}
        aria-pressed={checked}
        disabled={disabled}
      >
        <span />
      </button>

      <style jsx>{`
        .toggleRow {
          min-height: 70px;
          display: flex;
          align-items: center;
          gap: 13px;
          border-bottom: 1px solid #f1f5f9;
        }

        .toggleRow:last-of-type {
          border-bottom: 0;
        }

        .toggleText {
          flex: 1;
        }

        .toggleText strong {
          display: block;
          color: #334155;
          font-size: 13px;
        }

        .toggleText span {
          display: block;
          color: #94a3b8;
          font-size: 11px;
          margin-top: 3px;
        }

        .switch {
          width: 46px;
          height: 26px;
          border: 0;
          border-radius: 999px;
          background: #cbd5e1;
          padding: 3px;
          cursor: pointer;
          transition: 0.18s ease;
          flex: 0 0 auto;
        }

        .switch.on {
          background: #2563eb;
        }

        .switch.disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .switch span {
          display: block;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 2px 5px rgba(15, 23, 42, 0.2);
          transition: 0.18s ease;
        }

        .switch.on span {
          transform: translateX(20px);
        }
      `}</style>
    </div>
  );
}