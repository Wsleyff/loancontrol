"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Loader2,
  MapPin,
  Phone,
  Mail,
  Save,
  RefreshCw,
  ShieldCheck,
  UserRound,
  FileText,
  Globe2,
  BriefcaseBusiness,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Company = {
  id: string;
  name: string;
  legal_name?: string | null;
  document?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  address_number?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  business_type?: string | null;
  status?: string | null;
  created_at?: string | null;
};

type CompanyUser = {
  id: string;
  company_id: string;
  user_id: string;
  role: string;
  status: string;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return String((error as { message: string }).message);
  }

  return "Não foi possível carregar os dados da empresa.";
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("pt-BR");
}

function maskDocument(value: string) {
  const numbers = value.replace(/\D/g, "");

  if (numbers.length <= 11) {
    return numbers
      .slice(0, 11)
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  return numbers
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function maskPhone(value: string) {
  const numbers = value.replace(/\D/g, "").slice(0, 11);

  if (numbers.length <= 2) {
    return numbers;
  }

  if (numbers.length <= 7) {
    return numbers.replace(/^(\d{2})(\d+)/, "($1) $2");
  }

  if (numbers.length <= 10) {
    return numbers.replace(
      /^(\d{2})(\d{4})(\d+)/,
      "($1) $2-$3"
    );
  }

  return numbers.replace(
    /^(\d{2})(\d{5})(\d{4})$/,
    "($1) $2-$3"
  );
}

function maskCep(value: string) {
  const numbers = value.replace(/\D/g, "").slice(0, 8);

  return numbers.replace(/^(\d{5})(\d)/, "$1-$2");
}

function businessTypeLabel(value?: string | null) {
  if (!value) return "Não informado";

  const labels: Record<string, string> = {
    FINANCEIRA: "Financeira",
    LOAN: "Empréstimos",
    CREDITO: "Crédito",
    CONSIGNADO: "Consignado",
    SERVICOS: "Serviços",
    OUTROS: "Outros",
  };

  return labels[value] || value;
}

export default function EmpresaPage() {
  const supabase = useMemo(() => createClient(), []);

  const [company, setCompany] = useState<Company | null>(null);
  const [membership, setMembership] =
    useState<CompanyUser | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [document, setDocument] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [address, setAddress] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");

  const carregarEmpresa = useCallback(async () => {
    if (!supabase) {
      setError(
        "Supabase não configurado. Verifique o arquivo .env.local."
      );
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error(
          "Sua sessão expirou. Faça login novamente."
        );
      }

      const {
        data: companyUser,
        error: membershipError,
      } = await supabase
        .from("company_users")
        .select(
          `
            id,
            company_id,
            user_id,
            role,
            status
          `
        )
        .eq("user_id", user.id)
        .eq("status", "ACTIVE")
        .limit(1)
        .maybeSingle();

      if (membershipError) {
        throw membershipError;
      }

      if (!companyUser?.company_id) {
        throw new Error(
          "Seu usuário não está vinculado a nenhuma empresa."
        );
      }

      setMembership(companyUser as CompanyUser);

      const {
        data: companyData,
        error: companyError,
      } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyUser.company_id)
        .maybeSingle();

      if (companyError) {
        throw companyError;
      }

      if (!companyData) {
        throw new Error(
          "A empresa vinculada ao seu usuário não foi encontrada."
        );
      }

      const data = companyData as Company;

      setCompany(data);

      setName(data.name || "");
      setLegalName(data.legal_name || "");
      setDocument(data.document || "");
      setBusinessType(data.business_type || "");
      setPhone(data.phone || "");
      setEmail(data.email || "");

      setAddress(data.address || "");
      setAddressNumber(data.address_number || "");
      setNeighborhood(data.neighborhood || "");
      setCity(data.city || "");
      setState(data.state || "");
      setZipCode(data.zip_code || "");
    } catch (err) {
      console.error("[EMPRESA] Erro:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    carregarEmpresa();
  }, [carregarEmpresa]);

  async function salvarEmpresa() {
    if (!supabase || !company) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (!name.trim()) {
        throw new Error(
          "Informe o nome da empresa."
        );
      }

      const payload = {
        name: name.trim(),
        legal_name: legalName.trim() || null,
        document: document.replace(/\D/g, "") || null,
        business_type:
          businessType.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        address_number:
          addressNumber.trim() || null,
        neighborhood:
          neighborhood.trim() || null,
        city: city.trim() || null,
        state:
          state.trim().toUpperCase() || null,
        zip_code:
          zipCode.replace(/\D/g, "") || null,
      };

      const {
        data,
        error: updateError,
      } = await supabase
        .from("companies")
        .update(payload)
        .eq("id", company.id)
        .select("*")
        .single();

      if (updateError) {
        throw updateError;
      }

      setCompany(data as Company);

      setSuccess(
        "Dados da empresa atualizados com sucesso."
      );

      window.setTimeout(() => {
        setSuccess("");
      }, 4000);
    } catch (err) {
      console.error(
        "[EMPRESA] Erro ao salvar:",
        err
      );

      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="company-page">
        <style jsx>{`
          .company-page {
            max-width: 1240px;
            margin: 0 auto;
            padding: 45px 34px 70px;
          }

          .loading {
            min-height: 400px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            color: #64748b;
            font-size: 14px;
          }

          .rotate {
            animation: rotate 1s linear infinite;
          }

          @keyframes rotate {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>

        <div className="loading">
          <Loader2 size={20} className="rotate" />
          Carregando dados da empresa...
        </div>
      </main>
    );
  }

  return (
    <main className="company-page">
      <style jsx>{`
        .company-page {
          max-width: 1240px;
          margin: 0 auto;
          padding: 34px 34px 70px;
        }

        .top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 26px;
        }

        .eyebrow {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #2563eb;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .title {
          margin: 0;
          color: #0f172a;
          font-size: 32px;
          line-height: 1.1;
          font-weight: 800;
        }

        .description {
          margin: 9px 0 0;
          color: #64748b;
          font-size: 14px;
        }

        .actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .button {
          height: 42px;
          border: 1px solid #dbe3ef;
          background: #fff;
          color: #0f172a;
          border-radius: 10px;
          padding: 0 15px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s;
        }

        .button:hover {
          border-color: #b8c6da;
          transform: translateY(-1px);
        }

        .button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .button-primary {
          background: #2563eb;
          border-color: #2563eb;
          color: #fff;
        }

        .button-primary:hover {
          background: #1d4ed8;
          border-color: #1d4ed8;
        }

        .hero {
          position: relative;
          overflow: hidden;
          background: linear-gradient(
            135deg,
            #0f172a 0%,
            #1e3a8a 100%
          );
          border-radius: 18px;
          padding: 27px;
          color: #fff;
          margin-bottom: 18px;
          box-shadow:
            0 12px 35px rgba(15, 23, 42, 0.13);
        }

        .hero::after {
          content: "";
          position: absolute;
          width: 240px;
          height: 240px;
          border-radius: 50%;
          right: -70px;
          top: -100px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow:
            0 0 0 35px rgba(255, 255, 255, 0.025),
            0 0 0 70px rgba(255, 255, 255, 0.02);
        }

        .hero-content {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .company-icon {
          width: 62px;
          height: 62px;
          flex: 0 0 62px;
          border-radius: 15px;
          background: rgba(255, 255, 255, 0.13);
          border: 1px solid rgba(255, 255, 255, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .hero-name {
          font-size: 23px;
          font-weight: 800;
          line-height: 1.2;
        }

        .hero-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 7px;
          color: rgba(255, 255, 255, 0.72);
          font-size: 12px;
          flex-wrap: wrap;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-left: auto;
          padding: 7px 11px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
          font-size: 11px;
          font-weight: 800;
        }

        .layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 310px;
          gap: 18px;
          align-items: start;
        }

        .card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          box-shadow:
            0 5px 20px rgba(15, 23, 42, 0.04);
        }

        .card + .card {
          margin-top: 18px;
        }

        .card-header {
          padding: 18px 20px;
          border-bottom: 1px solid #edf2f7;
        }

        .card-title {
          display: flex;
          align-items: center;
          gap: 9px;
          color: #0f172a;
          font-size: 14px;
          font-weight: 800;
        }

        .card-title svg {
          color: #2563eb;
        }

        .card-description {
          margin: 5px 0 0 25px;
          color: #94a3b8;
          font-size: 11px;
        }

        .card-body {
          padding: 20px;
        }

        .fields {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 17px;
        }

        .fields-three {
          display: grid;
          grid-template-columns:
            minmax(0, 1.4fr)
            minmax(110px, 0.6fr)
            minmax(0, 1fr);
          gap: 17px;
        }

        .field {
          min-width: 0;
        }

        .field-full {
          grid-column: 1 / -1;
        }

        .label {
          display: block;
          color: #334155;
          font-size: 11px;
          font-weight: 800;
          margin-bottom: 7px;
        }

        .input,
        .select {
          width: 100%;
          height: 42px;
          box-sizing: border-box;
          border: 1px solid #dbe3ef;
          border-radius: 9px;
          background: #fff;
          color: #0f172a;
          outline: none;
          padding: 0 12px;
          font-size: 13px;
          transition: 0.2s;
        }

        .input:focus,
        .select:focus {
          border-color: #93c5fd;
          box-shadow:
            0 0 0 3px rgba(37, 99, 235, 0.08);
        }

        .input::placeholder {
          color: #c0c9d5;
        }

        .side-card {
          padding: 20px;
        }

        .side-title {
          color: #0f172a;
          font-size: 14px;
          font-weight: 800;
        }

        .side-description {
          color: #94a3b8;
          font-size: 11px;
          margin-top: 5px;
          line-height: 1.5;
        }

        .info-list {
          margin-top: 18px;
          display: grid;
          gap: 13px;
        }

        .info-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .info-icon {
          width: 31px;
          height: 31px;
          flex: 0 0 31px;
          border-radius: 8px;
          background: #eff6ff;
          color: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .info-label {
          color: #94a3b8;
          font-size: 10px;
        }

        .info-value {
          color: #334155;
          font-size: 12px;
          font-weight: 700;
          margin-top: 2px;
          word-break: break-word;
        }

        .security {
          margin-top: 18px;
          padding: 13px;
          border-radius: 11px;
          background: #f8fafc;
          border: 1px solid #edf2f7;
          display: flex;
          gap: 9px;
          align-items: flex-start;
        }

        .security svg {
          color: #16a34a;
          flex: 0 0 auto;
          margin-top: 1px;
        }

        .security-title {
          color: #334155;
          font-size: 11px;
          font-weight: 800;
        }

        .security-text {
          color: #94a3b8;
          font-size: 10px;
          line-height: 1.5;
          margin-top: 3px;
        }

        .message {
          border-radius: 12px;
          padding: 13px 15px;
          margin-bottom: 16px;
          font-size: 13px;
        }

        .error {
          border: 1px solid #fecaca;
          background: #fff7f7;
          color: #b91c1c;
        }

        .success {
          border: 1px solid #bbf7d0;
          background: #f0fdf4;
          color: #15803d;
        }

        .error-title {
          font-weight: 800;
          margin-bottom: 4px;
        }

        .retry {
          margin-top: 10px;
          height: 34px;
          border: 1px solid #fca5a5;
          background: #fff;
          color: #b91c1c;
          border-radius: 8px;
          padding: 0 11px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .save-area {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 20px;
          padding-top: 18px;
          border-top: 1px solid #edf2f7;
        }

        .rotate {
          animation: rotate 1s linear infinite;
        }

        @keyframes rotate {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 1000px) {
          .layout {
            grid-template-columns: 1fr;
          }

          .side-card {
            min-height: auto;
          }
        }

        @media (max-width: 700px) {
          .company-page {
            padding: 25px 18px 60px;
          }

          .top {
            flex-direction: column;
          }

          .hero-content {
            align-items: flex-start;
          }

          .hero-badge {
            display: none;
          }

          .fields,
          .fields-three {
            grid-template-columns: 1fr;
          }

          .field-full {
            grid-column: auto;
          }
        }
      `}</style>

      <div className="top">
        <div>
          <div className="eyebrow">
            <Building2 size={15} />
            Configurações
          </div>

          <h1 className="title">
            Empresa
          </h1>

          <p className="description">
            Gerencie as informações e os dados cadastrais da sua empresa.
          </p>
        </div>

        <div className="actions">
          <button
            className="button"
            onClick={carregarEmpresa}
            disabled={loading || saving}
          >
            <RefreshCw size={15} />
            Atualizar
          </button>

          <button
            className="button button-primary"
            onClick={salvarEmpresa}
            disabled={saving || !company}
          >
            {saving ? (
              <Loader2
                size={16}
                className="rotate"
              />
            ) : (
              <Save size={16} />
            )}

            {saving
              ? "Salvando..."
              : "Salvar alterações"}
          </button>
        </div>
      </div>

      {error && (
        <div className="message error">
          <div className="error-title">
            Não foi possível concluir a operação
          </div>

          <div>{error}</div>

          <button
            className="retry"
            onClick={carregarEmpresa}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {success && (
        <div className="message success">
          <strong>Sucesso:</strong>{" "}
          {success}
        </div>
      )}

      {company && (
        <>
          <section className="hero">
            <div className="hero-content">
              <div className="company-icon">
                <Building2 size={29} />
              </div>

              <div>
                <div className="hero-name">
                  {company.name}
                </div>

                <div className="hero-meta">
                  <span>
                    {businessTypeLabel(
                      company.business_type
                    )}
                  </span>

                  <span>•</span>

                  <span>
                    Empresa criada em{" "}
                    {formatDate(
                      company.created_at
                    )}
                  </span>
                </div>
              </div>

              <div className="hero-badge">
                <CheckCircle2 size={14} />
                {company.status === "INACTIVE"
                  ? "Inativa"
                  : "Empresa ativa"}
              </div>
            </div>
          </section>

          <div className="layout">
            <div>
              <section className="card">
                <div className="card-header">
                  <div className="card-title">
                    <Building2 size={17} />
                    Dados da empresa
                  </div>

                  <div className="card-description">
                    Informações principais da sua operação.
                  </div>
                </div>

                <div className="card-body">
                  <div className="fields">
                    <div className="field">
                      <label className="label">
                        Nome da empresa *
                      </label>

                      <input
                        className="input"
                        value={name}
                        onChange={(event) =>
                          setName(event.target.value)
                        }
                        placeholder="Nome comercial"
                      />
                    </div>

                    <div className="field">
                      <label className="label">
                        Razão social
                      </label>

                      <input
                        className="input"
                        value={legalName}
                        onChange={(event) =>
                          setLegalName(
                            event.target.value
                          )
                        }
                        placeholder="Razão social"
                      />
                    </div>

                    <div className="field">
                      <label className="label">
                        CPF / CNPJ
                      </label>

                      <input
                        className="input"
                        value={document}
                        onChange={(event) =>
                          setDocument(
                            maskDocument(
                              event.target.value
                            )
                          )
                        }
                        placeholder="CPF ou CNPJ"
                      />
                    </div>

                    <div className="field">
                      <label className="label">
                        Tipo de negócio
                      </label>

                      <select
                        className="select"
                        value={businessType}
                        onChange={(event) =>
                          setBusinessType(
                            event.target.value
                          )
                        }
                      >
                        <option value="">
                          Selecione
                        </option>

                        <option value="FINANCEIRA">
                          Financeira
                        </option>

                        <option value="LOAN">
                          Empréstimos
                        </option>

                        <option value="CREDITO">
                          Crédito
                        </option>

                        <option value="CONSIGNADO">
                          Consignado
                        </option>

                        <option value="SERVICOS">
                          Serviços
                        </option>

                        <option value="OUTROS">
                          Outros
                        </option>
                      </select>
                    </div>

                    <div className="field">
                      <label className="label">
                        Telefone
                      </label>

                      <input
                        className="input"
                        value={phone}
                        onChange={(event) =>
                          setPhone(
                            maskPhone(
                              event.target.value
                            )
                          )
                        }
                        placeholder="(00) 00000-0000"
                      />
                    </div>

                    <div className="field">
                      <label className="label">
                        E-mail
                      </label>

                      <input
                        className="input"
                        type="email"
                        value={email}
                        onChange={(event) =>
                          setEmail(
                            event.target.value
                          )
                        }
                        placeholder="contato@empresa.com"
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="card">
                <div className="card-header">
                  <div className="card-title">
                    <MapPin size={17} />
                    Endereço
                  </div>

                  <div className="card-description">
                    Endereço cadastrado para a empresa.
                  </div>
                </div>

                <div className="card-body">
                  <div className="fields-three">
                    <div className="field">
                      <label className="label">
                        CEP
                      </label>

                      <input
                        className="input"
                        value={zipCode}
                        onChange={(event) =>
                          setZipCode(
                            maskCep(
                              event.target.value
                            )
                          )
                        }
                        placeholder="00000-000"
                      />
                    </div>

                    <div className="field">
                      <label className="label">
                        Número
                      </label>

                      <input
                        className="input"
                        value={addressNumber}
                        onChange={(event) =>
                          setAddressNumber(
                            event.target.value
                          )
                        }
                        placeholder="123"
                      />
                    </div>

                    <div className="field">
                      <label className="label">
                        Estado
                      </label>

                      <input
                        className="input"
                        maxLength={2}
                        value={state}
                        onChange={(event) =>
                          setState(
                            event.target.value
                              .toUpperCase()
                          )
                        }
                        placeholder="CE"
                      />
                    </div>

                    <div className="field field-full">
                      <label className="label">
                        Endereço
                      </label>

                      <input
                        className="input"
                        value={address}
                        onChange={(event) =>
                          setAddress(
                            event.target.value
                          )
                        }
                        placeholder="Rua, avenida..."
                      />
                    </div>

                    <div className="field">
                      <label className="label">
                        Bairro
                      </label>

                      <input
                        className="input"
                        value={neighborhood}
                        onChange={(event) =>
                          setNeighborhood(
                            event.target.value
                          )
                        }
                        placeholder="Bairro"
                      />
                    </div>

                    <div className="field">
                      <label className="label">
                        Cidade
                      </label>

                      <input
                        className="input"
                        value={city}
                        onChange={(event) =>
                          setCity(
                            event.target.value
                          )
                        }
                        placeholder="Cidade"
                      />
                    </div>
                  </div>

                  <div className="save-area">
                    <button
                      className="button button-primary"
                      onClick={salvarEmpresa}
                      disabled={saving}
                    >
                      {saving ? (
                        <Loader2
                          size={15}
                          className="rotate"
                        />
                      ) : (
                        <Save size={15} />
                      )}

                      {saving
                        ? "Salvando..."
                        : "Salvar alterações"}
                    </button>
                  </div>
                </div>
              </section>
            </div>

            <aside>
              <section className="card side-card">
                <div className="side-title">
                  Resumo da empresa
                </div>

                <div className="side-description">
                  Informações atuais da conta empresarial.
                </div>

                <div className="info-list">
                  <div className="info-item">
                    <div className="info-icon">
                      <BriefcaseBusiness
                        size={15}
                      />
                    </div>

                    <div>
                      <div className="info-label">
                        Tipo de negócio
                      </div>

                      <div className="info-value">
                        {businessTypeLabel(
                          company.business_type
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="info-item">
                    <div className="info-icon">
                      <Phone size={15} />
                    </div>

                    <div>
                      <div className="info-label">
                        Telefone
                      </div>

                      <div className="info-value">
                        {company.phone || "Não informado"}
                      </div>
                    </div>
                  </div>

                  <div className="info-item">
                    <div className="info-icon">
                      <Mail size={15} />
                    </div>

                    <div>
                      <div className="info-label">
                        E-mail
                      </div>

                      <div className="info-value">
                        {company.email || "Não informado"}
                      </div>
                    </div>
                  </div>

                  <div className="info-item">
                    <div className="info-icon">
                      <FileText size={15} />
                    </div>

                    <div>
                      <div className="info-label">
                        Documento
                      </div>

                      <div className="info-value">
                        {company.document ||
                          "Não informado"}
                      </div>
                    </div>
                  </div>

                  <div className="info-item">
                    <div className="info-icon">
                      <UserRound size={15} />
                    </div>

                    <div>
                      <div className="info-label">
                        Seu acesso
                      </div>

                      <div className="info-value">
                        {membership?.role === "ADMIN"
                          ? "Administrador"
                          : membership?.role === "MANAGER"
                            ? "Gerente"
                            : membership?.role ===
                                "COLLECTOR"
                              ? "Cobrador"
                              : "Operador"}
                      </div>
                    </div>
                  </div>

                  <div className="info-item">
                    <div className="info-icon">
                      <Globe2 size={15} />
                    </div>

                    <div>
                      <div className="info-label">
                        Localização
                      </div>

                      <div className="info-value">
                        {company.city &&
                        company.state
                          ? `${company.city} - ${company.state}`
                          : "Não informado"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="security">
                  <ShieldCheck size={16} />

                  <div>
                    <div className="security-title">
                      Ambiente protegido
                    </div>

                    <div className="security-text">
                      Os dados desta empresa são isolados
                      através das regras de segurança do
                      banco de dados.
                    </div>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </>
      )}
    </main>
  );
}