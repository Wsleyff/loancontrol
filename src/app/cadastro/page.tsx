"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  CreditCard,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";

type Plan = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  trial_days: number;
};

type FormData = {
  companyName: string;
  document: string;
  phone: string;
  responsibleName: string;
  email: string;
  password: string;
  confirmPassword: string;
  planId: string;
};

const initialForm: FormData = {
  companyName: "",
  document: "",
  phone: "",
  responsibleName: "",
  email: "",
  password: "",
  confirmPassword: "",
  planId: "",
};

export default function CadastroPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(initialForm);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [trialEndsAt, setTrialEndsAt] = useState("");

  useEffect(() => {
    carregarPlanos();
  }, []);

  async function carregarPlanos() {
    try {
      setLoadingPlans(true);

      const response = await fetch("/api/planos");

      if (!response.ok) {
        throw new Error("Não foi possível carregar os planos.");
      }

      const data = await response.json();

      const loadedPlans: Plan[] = data.plans || [];

      setPlans(loadedPlans);

      if (!form.planId && loadedPlans.length > 0) {
        const professional =
          loadedPlans.find(
            (plan) => plan.name.toLowerCase() === "profissional"
          ) || loadedPlans[0];

        setForm((current) => ({
          ...current,
          planId: professional.id,
        }));
      }
    } catch (err) {
      console.error(err);
      setError("Não foi possível carregar os planos.");
    } finally {
      setLoadingPlans(false);
    }
  }

  function updateField(
    field: keyof FormData,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function nextStep() {
    setError("");

    if (step === 1) {
      if (!form.companyName.trim()) {
        setError("Informe o nome da empresa.");
        return;
      }

      if (!form.document.trim()) {
        setError("Informe o CPF ou CNPJ.");
        return;
      }

      if (!form.phone.trim()) {
        setError("Informe o telefone.");
        return;
      }
    }

    if (step === 2) {
      if (!form.responsibleName.trim()) {
        setError("Informe o nome do responsável.");
        return;
      }

      if (!form.email.trim()) {
        setError("Informe o e-mail.");
        return;
      }

      if (!form.password || form.password.length < 6) {
        setError(
          "A senha precisa ter pelo menos 6 caracteres."
        );
        return;
      }

      if (form.password !== form.confirmPassword) {
        setError("As senhas não conferem.");
        return;
      }
    }

    setStep((current) => Math.min(current + 1, 3));
  }

  function previousStep() {
    setError("");
    setStep((current) => Math.max(current - 1, 1));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();

    setError("");

    if (!form.planId) {
      setError("Selecione um plano.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/cadastro", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyName: form.companyName,
          document: form.document,
          phone: form.phone,
          responsibleName: form.responsibleName,
          email: form.email,
          password: form.password,
          planId: form.planId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Não foi possível concluir o cadastro."
        );
      }

      setTrialEndsAt(data.trialEndsAt || "");
      setSuccess(true);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível concluir o cadastro."
      );
    } finally {
      setLoading(false);
    }
  }

  function formatPrice(price: number) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  }

  function formatTrialDate(date: string) {
    if (!date) return "";

    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "long",
    }).format(new Date(date));
  }

  if (success) {
    return (
      <main className="successPage">
        <div className="successCard">
          <div className="successIcon">
            <CheckCircle2 size={42} />
          </div>

          <div className="successBadge">
            <Sparkles size={15} />
            Cadastro concluído
          </div>

          <h1>Bem-vindo ao LoanControl!</h1>

          <p>
            Sua empresa foi cadastrada com sucesso e seu
            período de teste já está ativo.
          </p>

          {trialEndsAt && (
            <div className="trialBox">
              <span>Seu teste gratuito termina em</span>
              <strong>{formatTrialDate(trialEndsAt)}</strong>
            </div>
          )}

          <div className="successFeatures">
            <div>
              <Check size={18} />
              <span>Empresa criada</span>
            </div>

            <div>
              <Check size={18} />
              <span>Administrador configurado</span>
            </div>

            <div>
              <Check size={18} />
              <span>Plano ativado</span>
            </div>
          </div>

          <Link href="/login" className="primaryButton">
            Acessar minha conta
            <ArrowRight size={19} />
          </Link>
        </div>

        <style jsx>{`
          .successPage {
            min-height: 100vh;
            display: grid;
            place-items: center;
            padding: 32px 20px;
            background:
              radial-gradient(
                circle at 20% 20%,
                rgba(79, 70, 229, 0.16),
                transparent 30%
              ),
              radial-gradient(
                circle at 80% 80%,
                rgba(14, 165, 233, 0.13),
                transparent 32%
              ),
              #f7f9fc;
          }

          .successCard {
            width: 100%;
            max-width: 560px;
            padding: 46px;
            background: rgba(255, 255, 255, 0.96);
            border: 1px solid #e5e7eb;
            border-radius: 28px;
            box-shadow: 0 25px 70px rgba(15, 23, 42, 0.12);
            text-align: center;
          }

          .successIcon {
            width: 82px;
            height: 82px;
            margin: 0 auto 22px;
            border-radius: 24px;
            display: grid;
            place-items: center;
            background: #ecfdf3;
            color: #039855;
          }

          .successBadge {
            width: fit-content;
            margin: 0 auto 16px;
            display: flex;
            align-items: center;
            gap: 7px;
            padding: 7px 12px;
            border-radius: 999px;
            background: #eef2ff;
            color: #4338ca;
            font-size: 13px;
            font-weight: 700;
          }

          h1 {
            margin: 0;
            color: #101828;
            font-size: 32px;
            line-height: 1.15;
            letter-spacing: -0.8px;
          }

          p {
            margin: 14px auto 0;
            max-width: 440px;
            color: #667085;
            line-height: 1.65;
            font-size: 15px;
          }

          .trialBox {
            margin-top: 26px;
            padding: 18px;
            border-radius: 16px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
          }

          .trialBox span {
            display: block;
            color: #667085;
            font-size: 13px;
            margin-bottom: 5px;
          }

          .trialBox strong {
            color: #101828;
            font-size: 17px;
          }

          .successFeatures {
            margin: 25px 0;
            display: grid;
            gap: 10px;
            text-align: left;
          }

          .successFeatures div {
            display: flex;
            align-items: center;
            gap: 10px;
            color: #344054;
            font-size: 14px;
          }

          .successFeatures svg {
            color: #039855;
          }

          .primaryButton {
            height: 52px;
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 9px;
            border-radius: 13px;
            background: #111827;
            color: white;
            text-decoration: none;
            font-weight: 700;
          }

          @media (max-width: 600px) {
            .successCard {
              padding: 30px 22px;
            }

            h1 {
              font-size: 27px;
            }
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="layout">
        <section className="brandPanel">
          <Link href="/login" className="backLink">
            <ArrowLeft size={17} />
            Voltar para login
          </Link>

          <div className="brand">
            <div className="logo">
              <CreditCard size={27} />
            </div>

            <div>
              <strong>LoanControl</strong>
              <span>Gestão inteligente de crédito</span>
            </div>
          </div>

          <div className="brandContent">
            <div className="pill">
              <Sparkles size={15} />
              Comece gratuitamente
            </div>

            <h1>
              Controle sua operação de crédito em um só lugar.
            </h1>

            <p>
              Cadastre sua empresa, escolha seu plano e
              comece a utilizar o LoanControl durante o
              período de teste.
            </p>

            <div className="benefits">
              <div>
                <CheckCircle2 size={20} />
                <span>Controle completo dos empréstimos</span>
              </div>

              <div>
                <CheckCircle2 size={20} />
                <span>Clientes e parcelas organizados</span>
              </div>

              <div>
                <CheckCircle2 size={20} />
                <span>Carteira financeira da empresa</span>
              </div>

              <div>
                <CheckCircle2 size={20} />
                <span>Portal exclusivo para seus clientes</span>
              </div>
            </div>
          </div>

          <div className="security">
            <ShieldCheck size={18} />
            <span>Seus dados são protegidos com segurança.</span>
          </div>
        </section>

        <section className="formPanel">
          <div className="formContainer">
            <div className="mobileBack">
              <Link href="/login">
                <ArrowLeft size={17} />
                Voltar
              </Link>
            </div>

            <div className="heading">
              <span className="eyebrow">
                CADASTRO DA EMPRESA
              </span>

              <h2>Crie sua conta</h2>

              <p>
                Preencha os dados abaixo para começar.
              </p>
            </div>

            <div className="steps">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className={`step ${
                    step >= item ? "active" : ""
                  }`}
                >
                  <div className="stepNumber">
                    {step > item ? <Check size={15} /> : item}
                  </div>

                  <span>
                    {item === 1
                      ? "Empresa"
                      : item === 2
                        ? "Responsável"
                        : "Plano"}
                  </span>
                </div>
              ))}
            </div>

            {error && (
              <div className="errorBox">
                {error}
              </div>
            )}

            <form onSubmit={submit}>
              {step === 1 && (
                <div className="formStep">
                  <div className="sectionTitle">
                    <div className="sectionIcon">
                      <Building2 size={20} />
                    </div>

                    <div>
                      <strong>Dados da empresa</strong>
                      <span>
                        Informe os dados principais da sua operação.
                      </span>
                    </div>
                  </div>

                  <div className="field">
                    <label>Nome da empresa</label>

                    <div className="inputWrapper">
                      <Building2 size={18} />
                      <input
                        value={form.companyName}
                        onChange={(e) =>
                          updateField(
                            "companyName",
                            e.target.value
                          )
                        }
                        placeholder="Ex.: Crédito Fácil"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label>CPF ou CNPJ</label>

                    <div className="inputWrapper">
                      <CreditCard size={18} />
                      <input
                        value={form.document}
                        onChange={(e) =>
                          updateField(
                            "document",
                            e.target.value
                          )
                        }
                        placeholder="Digite seu CPF ou CNPJ"
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label>Telefone / WhatsApp</label>

                    <div className="inputWrapper">
                      <Phone size={18} />
                      <input
                        value={form.phone}
                        onChange={(e) =>
                          updateField(
                            "phone",
                            e.target.value
                          )
                        }
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    className="primaryButton"
                    onClick={nextStep}
                  >
                    Continuar
                    <ArrowRight size={19} />
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="formStep">
                  <div className="sectionTitle">
                    <div className="sectionIcon">
                      <User size={20} />
                    </div>

                    <div>
                      <strong>Responsável pela conta</strong>
                      <span>
                        Essa pessoa será o administrador da empresa.
                      </span>
                    </div>
                  </div>

                  <div className="field">
                    <label>Nome completo</label>

                    <div className="inputWrapper">
                      <User size={18} />
                      <input
                        value={form.responsibleName}
                        onChange={(e) =>
                          updateField(
                            "responsibleName",
                            e.target.value
                          )
                        }
                        placeholder="Nome completo"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label>E-mail</label>

                    <div className="inputWrapper">
                      <Mail size={18} />
                      <input
                        value={form.email}
                        onChange={(e) =>
                          updateField(
                            "email",
                            e.target.value
                          )
                        }
                        type="email"
                        placeholder="voce@empresa.com"
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label>Senha</label>

                    <div className="inputWrapper">
                      <Lock size={18} />
                      <input
                        value={form.password}
                        onChange={(e) =>
                          updateField(
                            "password",
                            e.target.value
                          )
                        }
                        type="password"
                        placeholder="Mínimo de 6 caracteres"
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label>Confirmar senha</label>

                    <div className="inputWrapper">
                      <Lock size={18} />
                      <input
                        value={form.confirmPassword}
                        onChange={(e) =>
                          updateField(
                            "confirmPassword",
                            e.target.value
                          )
                        }
                        type="password"
                        placeholder="Digite a senha novamente"
                      />
                    </div>
                  </div>

                  <div className="buttonRow">
                    <button
                      type="button"
                      className="secondaryButton"
                      onClick={previousStep}
                    >
                      <ArrowLeft size={18} />
                      Voltar
                    </button>

                    <button
                      type="button"
                      className="primaryButton"
                      onClick={nextStep}
                    >
                      Escolher plano
                      <ArrowRight size={19} />
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="formStep">
                  <div className="sectionTitle">
                    <div className="sectionIcon">
                      <CreditCard size={20} />
                    </div>

                    <div>
                      <strong>Escolha seu plano</strong>
                      <span>
                        Você terá o período de teste configurado no plano.
                      </span>
                    </div>
                  </div>

                  {loadingPlans ? (
                    <div className="loadingPlans">
                      Carregando planos...
                    </div>
                  ) : plans.length === 0 ? (
                    <div className="errorBox">
                      Nenhum plano disponível no momento.
                    </div>
                  ) : (
                    <div className="plans">
                      {plans.map((plan) => {
                        const selected =
                          form.planId === plan.id;

                        const professional =
                          plan.name.toLowerCase() ===
                          "profissional";

                        return (
                          <button
                            key={plan.id}
                            type="button"
                            className={`planCard ${
                              selected ? "selected" : ""
                            }`}
                            onClick={() =>
                              updateField(
                                "planId",
                                plan.id
                              )
                            }
                          >
                            {professional && (
                              <div className="recommended">
                                MAIS ESCOLHIDO
                              </div>
                            )}

                            <div className="planTop">
                              <div>
                                <strong>{plan.name}</strong>

                                <span>
                                  {plan.description ||
                                    "Plano LoanControl"}
                                </span>
                              </div>

                              <div
                                className={`radio ${
                                  selected ? "checked" : ""
                                }`}
                              >
                                {selected && (
                                  <Check size={14} />
                                )}
                              </div>
                            </div>

                            <div className="price">
                              <strong>
                                {formatPrice(plan.price)}
                              </strong>

                              <span>/mês</span>
                            </div>

                            <div className="planTrial">
                              <CheckCircle2 size={16} />
                              {plan.trial_days} dias de teste
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="trialInfo">
                    <Sparkles size={20} />

                    <div>
                      <strong>
                        Comece sem pagar agora
                      </strong>

                      <span>
                        Seu período de teste será ativado
                        automaticamente. A assinatura poderá
                        ser configurada depois.
                      </span>
                    </div>
                  </div>

                  <div className="buttonRow">
                    <button
                      type="button"
                      className="secondaryButton"
                      onClick={previousStep}
                      disabled={loading}
                    >
                      <ArrowLeft size={18} />
                      Voltar
                    </button>

                    <button
                      type="submit"
                      className="primaryButton"
                      disabled={
                        loading ||
                        loadingPlans ||
                        plans.length === 0
                      }
                    >
                      {loading
                        ? "Criando conta..."
                        : "Criar minha empresa"}
                      {!loading && <Check size={19} />}
                    </button>
                  </div>
                </div>
              )}
            </form>

            <div className="loginText">
              Já possui uma conta?
              <Link href="/login">Entrar</Link>
            </div>
          </div>
        </section>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: #f7f9fc;
        }

        .layout {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 43% 57%;
        }

        .brandPanel {
          position: relative;
          padding: 36px 8%;
          color: white;
          background:
            radial-gradient(
              circle at 15% 15%,
              rgba(99, 102, 241, 0.32),
              transparent 35%
            ),
            radial-gradient(
              circle at 90% 85%,
              rgba(14, 165, 233, 0.2),
              transparent 35%
            ),
            #0b1220;
          display: flex;
          flex-direction: column;
        }

        .backLink {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          width: fit-content;
          color: #cbd5e1;
          text-decoration: none;
          font-size: 14px;
        }

        .backLink:hover {
          color: white;
        }

        .brand {
          margin-top: 60px;
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .logo {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.14);
        }

        .brand strong {
          display: block;
          font-size: 21px;
          letter-spacing: -0.3px;
        }

        .brand span {
          display: block;
          margin-top: 2px;
          color: #94a3b8;
          font-size: 12px;
        }

        .brandContent {
          max-width: 600px;
          margin: auto 0;
          padding: 80px 0;
        }

        .pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 11px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #c7d2fe;
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 22px;
        }

        .brandContent h1 {
          margin: 0;
          max-width: 570px;
          font-size: clamp(36px, 4vw, 55px);
          line-height: 1.04;
          letter-spacing: -2.5px;
        }

        .brandContent p {
          max-width: 510px;
          margin: 23px 0 0;
          color: #aeb9ca;
          font-size: 16px;
          line-height: 1.7;
        }

        .benefits {
          margin-top: 34px;
          display: grid;
          gap: 15px;
        }

        .benefits div {
          display: flex;
          align-items: center;
          gap: 11px;
          color: #dce3ed;
          font-size: 14px;
        }

        .benefits svg {
          color: #818cf8;
        }

        .security {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #7f8da3;
          font-size: 12px;
        }

        .formPanel {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 7%;
          background: #ffffff;
        }

        .formContainer {
          width: 100%;
          max-width: 610px;
        }

        .mobileBack {
          display: none;
        }

        .heading {
          margin-bottom: 30px;
        }

        .eyebrow {
          color: #4f46e5;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.2px;
        }

        .heading h2 {
          margin: 7px 0 6px;
          color: #101828;
          font-size: 34px;
          line-height: 1.1;
          letter-spacing: -1px;
        }

        .heading p {
          margin: 0;
          color: #667085;
          font-size: 14px;
        }

        .steps {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 27px;
        }

        .step {
          position: relative;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #98a2b3;
          font-size: 12px;
          font-weight: 700;
        }

        .stepNumber {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: #f2f4f7;
          color: #98a2b3;
          border: 1px solid #e4e7ec;
          font-size: 12px;
        }

        .step.active {
          color: #344054;
        }

        .step.active .stepNumber {
          background: #eef2ff;
          color: #4f46e5;
          border-color: #c7d2fe;
        }

        .errorBox {
          margin-bottom: 18px;
          padding: 12px 14px;
          border-radius: 11px;
          border: 1px solid #fecdca;
          background: #fef3f2;
          color: #b42318;
          font-size: 13px;
          line-height: 1.5;
        }

        .formStep {
          display: grid;
          gap: 17px;
        }

        .sectionTitle {
          display: flex;
          align-items: center;
          gap: 11px;
          margin-bottom: 4px;
        }

        .sectionIcon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          color: #4f46e5;
          background: #eef2ff;
        }

        .sectionTitle strong {
          display: block;
          color: #101828;
          font-size: 14px;
        }

        .sectionTitle span {
          display: block;
          margin-top: 2px;
          color: #98a2b3;
          font-size: 12px;
        }

        .field {
          display: grid;
          gap: 7px;
        }

        .field label {
          color: #344054;
          font-size: 13px;
          font-weight: 700;
        }

        .inputWrapper {
          height: 50px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 14px;
          border: 1px solid #d0d5dd;
          border-radius: 11px;
          background: white;
          transition: 0.2s;
        }

        .inputWrapper:focus-within {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .inputWrapper svg {
          flex: 0 0 auto;
          color: #98a2b3;
        }

        .inputWrapper input {
          width: 100%;
          height: 100%;
          border: 0;
          outline: 0;
          color: #101828;
          font-size: 14px;
          background: transparent;
        }

        .inputWrapper input::placeholder {
          color: #98a2b3;
        }

        .primaryButton {
          min-height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          padding: 0 20px;
          border: 0;
          border-radius: 11px;
          background: #111827;
          color: white;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          text-decoration: none;
          transition: 0.2s;
        }

        .primaryButton:hover {
          background: #1f2937;
          transform: translateY(-1px);
        }

        .primaryButton:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .buttonRow {
          display: grid;
          grid-template-columns: 0.8fr 1.2fr;
          gap: 10px;
          margin-top: 4px;
        }

        .secondaryButton {
          min-height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px solid #d0d5dd;
          border-radius: 11px;
          background: white;
          color: #344054;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }

        .secondaryButton:hover {
          background: #f9fafb;
        }

        .secondaryButton:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .plans {
          display: grid;
          gap: 11px;
        }

        .planCard {
          position: relative;
          width: 100%;
          padding: 17px;
          text-align: left;
          border: 1px solid #e4e7ec;
          border-radius: 14px;
          background: white;
          cursor: pointer;
          transition: 0.2s;
        }

        .planCard:hover {
          border-color: #a5b4fc;
          transform: translateY(-1px);
        }

        .planCard.selected {
          border-color: #6366f1;
          background: #fafaff;
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
        }

        .planTop {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
        }

        .planTop strong {
          display: block;
          color: #101828;
          font-size: 15px;
        }

        .planTop span {
          display: block;
          margin-top: 3px;
          color: #667085;
          font-size: 11px;
        }

        .radio {
          width: 21px;
          height: 21px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          border: 1px solid #d0d5dd;
          color: white;
          flex: 0 0 auto;
        }

        .radio.checked {
          border-color: #4f46e5;
          background: #4f46e5;
        }

        .price {
          margin-top: 14px;
          display: flex;
          align-items: baseline;
          gap: 4px;
        }

        .price strong {
          color: #101828;
          font-size: 21px;
        }

        .price span {
          color: #667085;
          font-size: 12px;
        }

        .planTrial {
          margin-top: 11px;
          display: flex;
          align-items: center;
          gap: 6px;
          color: #039855;
          font-size: 12px;
          font-weight: 700;
        }

        .recommended {
          position: absolute;
          top: -9px;
          right: 14px;
          padding: 4px 8px;
          border-radius: 999px;
          background: #4f46e5;
          color: white;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.5px;
        }

        .trialInfo {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 14px;
          border-radius: 12px;
          background: #f8faff;
          border: 1px solid #e0e7ff;
          color: #4f46e5;
        }

        .trialInfo strong {
          display: block;
          color: #344054;
          font-size: 13px;
        }

        .trialInfo span {
          display: block;
          margin-top: 3px;
          color: #667085;
          font-size: 11px;
          line-height: 1.5;
        }

        .loadingPlans {
          padding: 35px;
          text-align: center;
          color: #667085;
          font-size: 13px;
        }

        .loginText {
          margin-top: 25px;
          text-align: center;
          color: #667085;
          font-size: 13px;
        }

        .loginText a {
          margin-left: 5px;
          color: #4f46e5;
          font-weight: 800;
          text-decoration: none;
        }

        @media (max-width: 1000px) {
          .layout {
            grid-template-columns: 1fr;
          }

          .brandPanel {
            display: none;
          }

          .formPanel {
            padding: 40px 24px;
          }

          .mobileBack {
            display: block;
            margin-bottom: 35px;
          }

          .mobileBack a {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            color: #667085;
            text-decoration: none;
            font-size: 13px;
          }
        }

        @media (max-width: 600px) {
          .formPanel {
            padding: 28px 18px;
            align-items: flex-start;
          }

          .heading h2 {
            font-size: 29px;
          }

          .steps {
            gap: 7px;
          }

          .step {
            font-size: 10px;
          }

          .buttonRow {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}