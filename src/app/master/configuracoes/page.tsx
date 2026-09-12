"use client";

import {
  Save,
  Settings,
  Building2,
  CreditCard,
  Wallet,
  Bell,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Landmark,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

type SettingsData = {
  id?: string;

  platform_name: string;
  support_email: string | null;
  support_whatsapp: string | null;
  logo_url: string | null;

  default_trial_days: number;

  allow_new_registrations: boolean;
  maintenance_mode: boolean;

  mercado_pago_access_token: string | null;
  mercado_pago_public_key: string | null;

  withdrawal_enabled: boolean;
  withdrawal_minimum: number;

  email_notifications: boolean;
  whatsapp_notifications: boolean;
};

const defaultSettings: SettingsData = {
  platform_name: "LoanControl",
  support_email: "",
  support_whatsapp: "",
  logo_url: "",

  default_trial_days: 7,

  allow_new_registrations: true,
  maintenance_mode: false,

  mercado_pago_access_token: "",
  mercado_pago_public_key: "",

  withdrawal_enabled: true,
  withdrawal_minimum: 0,

  email_notifications: true,
  whatsapp_notifications: false,
};

export default function MasterConfiguracoesPage() {
  const [settings, setSettings] =
    useState<SettingsData>(
      defaultSettings
    );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/master/configuracoes",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Erro ao carregar configurações."
        );
      }

      if (data?.settings) {
        setSettings({
          ...defaultSettings,
          ...data.settings,
        });
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao carregar configurações."
      );
    } finally {
      setLoading(false);
    }
  }

  async function salvar() {
    try {
      setSaving(true);
      setMessage("");
      setError("");

      const response = await fetch(
        "/api/master/configuracoes",
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(settings),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Não foi possível salvar."
        );
      }

      if (data?.settings) {
        setSettings({
          ...defaultSettings,
          ...data.settings,
        });
      }

      setMessage(
        "Configurações salvas com sucesso."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao salvar configurações."
      );
    } finally {
      setSaving(false);
    }
  }

  function update(
    field: keyof SettingsData,
    value: any
  ) {
    setSettings((current) => ({
      ...current,
      [field]: value,
    }));
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: 35,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "Inter,Arial,sans-serif",
        }}
      >
        Carregando configurações...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        fontFamily:
          "Inter,Arial,sans-serif",
      }}
    >
      {/* HEADER */}
      <header
        style={{
          height: 76,
          background: "#ffffff",
          borderBottom:
            "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 32px",
          boxSizing: "border-box",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              color: "#64748b",
              fontWeight: 700,
              marginBottom: 5,
            }}
          >
            ÁREA MASTER / SISTEMA
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 23,
              fontWeight: 850,
              color: "#0f172a",
              letterSpacing: "-.4px",
            }}
          >
            Configurações da plataforma
          </h1>
        </div>

        <button
          type="button"
          onClick={salvar}
          disabled={saving}
          style={{
            height: 42,
            padding: "0 18px",
            border: 0,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            gap: 8,
            background:
              "linear-gradient(135deg,#2563eb,#4f46e5)",
            color: "#fff",
            fontWeight: 800,
            fontSize: 12,
            cursor: saving
              ? "wait"
              : "pointer",
            opacity: saving ? 0.7 : 1,
            boxShadow:
              "0 8px 20px rgba(37,99,235,.20)",
          }}
        >
          <Save size={17} />

          {saving
            ? "Salvando..."
            : "Salvar alterações"}
        </button>
      </header>

      {/* CONTEÚDO */}
      <div
        style={{
          padding: "28px 32px 50px",
          maxWidth: 1100,
          margin: "0 auto",
          boxSizing: "border-box",
        }}
      >
        {message && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "13px 16px",
              borderRadius: 10,
              background: "#ecfdf5",
              border:
                "1px solid #a7f3d0",
              color: "#047857",
              fontSize: 13,
              fontWeight: 650,
              marginBottom: 20,
            }}
          >
            <CheckCircle2 size={18} />

            {message}
          </div>
        )}

        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "13px 16px",
              borderRadius: 10,
              background: "#fef2f2",
              border:
                "1px solid #fecaca",
              color: "#b91c1c",
              fontSize: 13,
              fontWeight: 650,
              marginBottom: 20,
            }}
          >
            <AlertTriangle size={18} />

            {error}
          </div>
        )}

        {/* AVISO MASTER */}
        <div
          style={{
            padding: "16px 18px",
            borderRadius: 13,
            background:
              "linear-gradient(135deg,#eff6ff,#eef2ff)",
            border:
              "1px solid #dbeafe",
            display: "flex",
            gap: 12,
            marginBottom: 22,
          }}
        >
          <ShieldCheck
            size={21}
            color="#2563eb"
          />

          <div>
            <strong
              style={{
                display: "block",
                color: "#1e3a8a",
                fontSize: 13,
                marginBottom: 3,
              }}
            >
              Configurações globais
            </strong>

            <span
              style={{
                color: "#475569",
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              Estas configurações pertencem à
              plataforma LoanControl e não às
              empresas assinantes.
            </span>
          </div>
        </div>

        {/* PLATAFORMA */}
        <Section
          icon={<Building2 size={18} />}
          title="Identidade da plataforma"
          description="Informações gerais exibidas pelo LoanControl."
        >
          <Field
            label="Nome da plataforma"
            value={settings.platform_name}
            onChange={(value) =>
              update(
                "platform_name",
                value
              )
            }
            placeholder="LoanControl"
          />

          <Field
            label="E-mail de suporte"
            value={
              settings.support_email || ""
            }
            onChange={(value) =>
              update(
                "support_email",
                value
              )
            }
            placeholder="suporte@seudominio.com"
            type="email"
          />

          <Field
            label="WhatsApp de suporte"
            value={
              settings.support_whatsapp ||
              ""
            }
            onChange={(value) =>
              update(
                "support_whatsapp",
                value
              )
            }
            placeholder="(00) 00000-0000"
          />

          <Field
            label="URL do logo"
            value={
              settings.logo_url || ""
            }
            onChange={(value) =>
              update(
                "logo_url",
                value
              )
            }
            placeholder="https://..."
          />
        </Section>

        {/* ASSINATURAS */}
        <Section
          icon={<CreditCard size={18} />}
          title="Assinaturas e teste grátis"
          description="Regras utilizadas para novas empresas."
        >
          <Field
            label="Dias padrão de teste grátis"
            value={String(
              settings.default_trial_days
            )}
            onChange={(value) =>
              update(
                "default_trial_days",
                Number(value || 0)
              )
            }
            type="number"
            min={0}
          />

          <Toggle
            label="Permitir novos cadastros"
            description="Permite que novas empresas criem contas."
            checked={
              settings.allow_new_registrations
            }
            onChange={(value) =>
              update(
                "allow_new_registrations",
                value
              )
            }
          />

          <Toggle
            label="Modo manutenção"
            description="Coloca a plataforma em manutenção."
            checked={
              settings.maintenance_mode
            }
            onChange={(value) =>
              update(
                "maintenance_mode",
                value
              )
            }
          />
        </Section>

        {/* MERCADO PAGO */}
        <Section
          icon={<Landmark size={18} />}
          title="Mercado Pago"
          description="Credenciais utilizadas para pagamentos da plataforma."
        >
          <Field
            label="Access Token"
            value={
              settings.mercado_pago_access_token ||
              ""
            }
            onChange={(value) =>
              update(
                "mercado_pago_access_token",
                value
              )
            }
            placeholder="Cole o Access Token aqui"
            type="password"
          />

          <Field
            label="Public Key"
            value={
              settings.mercado_pago_public_key ||
              ""
            }
            onChange={(value) =>
              update(
                "mercado_pago_public_key",
                value
              )
            }
            placeholder="Cole a Public Key aqui"
          />
        </Section>

        {/* SAQUES */}
        <Section
          icon={<Wallet size={18} />}
          title="Saques das empresas"
          description="Regras para empresas solicitarem retirada do saldo."
        >
          <Toggle
            label="Permitir solicitações de saque"
            description="Empresas poderão solicitar saques do saldo elegível."
            checked={
              settings.withdrawal_enabled
            }
            onChange={(value) =>
              update(
                "withdrawal_enabled",
                value
              )
            }
          />

          <Field
            label="Valor mínimo para saque"
            value={String(
              settings.withdrawal_minimum
            )}
            onChange={(value) =>
              update(
                "withdrawal_minimum",
                Number(value || 0)
              )
            }
            type="number"
            min={0}
            step={0.01}
          />
        </Section>

        {/* NOTIFICAÇÕES */}
        <Section
          icon={<Bell size={18} />}
          title="Notificações"
          description="Canais utilizados pela plataforma."
        >
          <Toggle
            label="Notificações por e-mail"
            description="Ativa comunicações por e-mail."
            checked={
              settings.email_notifications
            }
            onChange={(value) =>
              update(
                "email_notifications",
                value
              )
            }
          />

          <Toggle
            label="Notificações por WhatsApp"
            description="Ativa comunicações por WhatsApp."
            checked={
              settings.whatsapp_notifications
            }
            onChange={(value) =>
              update(
                "whatsapp_notifications",
                value
              )
            }
          />
        </Section>

        {/* BOTÃO FINAL */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: 24,
          }}
        >
          <button
            type="button"
            onClick={salvar}
            disabled={saving}
            style={{
              height: 46,
              padding: "0 25px",
              border: 0,
              borderRadius: 11,
              display: "flex",
              alignItems: "center",
              gap: 9,
              background:
                "linear-gradient(135deg,#2563eb,#4f46e5)",
              color: "#fff",
              fontWeight: 800,
              fontSize: 13,
              cursor: saving
                ? "wait"
                : "pointer",
            }}
          >
            <Save size={18} />

            {saving
              ? "Salvando..."
              : "Salvar configurações"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: "#ffffff",
        border:
          "1px solid #e2e8f0",
        borderRadius: 16,
        marginBottom: 18,
        overflow: "hidden",
        boxShadow:
          "0 5px 18px rgba(15,23,42,.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 11,
          padding: "18px 20px",
          borderBottom:
            "1px solid #eef2f7",
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 9,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#eff6ff",
            color: "#2563eb",
          }}
        >
          {icon}
        </div>

        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 14,
              color: "#0f172a",
              fontWeight: 800,
            }}
          >
            {title}
          </h2>

          <p
            style={{
              margin:
                "3px 0 0",
              color: "#64748b",
              fontSize: 11,
            }}
          >
            {description}
          </p>
        </div>
      </div>

      <div
        style={{
          padding: "20px",
          display: "grid",
          gridTemplateColumns:
            "repeat(2,minmax(0,1fr))",
          gap: 16,
        }}
      >
        {children}
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  min,
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  min?: number;
  step?: number;
}) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 7,
      }}
    >
      <span
        style={{
          color: "#334155",
          fontSize: 11,
          fontWeight: 750,
        }}
      >
        {label}
      </span>

      <input
        type={type}
        value={value}
        min={min}
        step={step}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        style={{
          width: "100%",
          height: 42,
          boxSizing: "border-box",
          border:
            "1px solid #dbe2ea",
          borderRadius: 9,
          padding: "0 12px",
          outline: "none",
          background: "#ffffff",
          color: "#0f172a",
          fontSize: 12,
        }}
      />
    </label>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      style={{
        minHeight: 66,
        padding: "12px 13px",
        boxSizing: "border-box",
        border:
          "1px solid #e2e8f0",
        borderRadius: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 15,
        cursor: "pointer",
      }}
    >
      <div>
        <strong
          style={{
            display: "block",
            color: "#334155",
            fontSize: 11,
          }}
        >
          {label}
        </strong>

        <span
          style={{
            display: "block",
            marginTop: 3,
            color: "#64748b",
            fontSize: 9,
            lineHeight: 1.4,
          }}
        >
          {description}
        </span>
      </div>

      <div
        style={{
          width: 40,
          height: 22,
          borderRadius: 20,
          padding: 2,
          boxSizing: "border-box",
          background: checked
            ? "#2563eb"
            : "#cbd5e1",
          transition:
            "background .18s ease",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "#ffffff",
            transform: checked
              ? "translateX(18px)"
              : "translateX(0)",
            transition:
              "transform .18s ease",
            boxShadow:
              "0 1px 4px rgba(15,23,42,.2)",
          }}
        />
      </div>

      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(
            event.target.checked
          )
        }
        style={{
          display: "none",
        }}
      />
    </label>
  );
}