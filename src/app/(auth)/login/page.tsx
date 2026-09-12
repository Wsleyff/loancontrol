"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  Building2,
  Loader2,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setError("");

    const emailNormalizado = email.trim().toLowerCase();

    if (!emailNormalizado) {
      setError("Digite seu e-mail.");
      return;
    }

    if (!password) {
      setError("Digite sua senha.");
      return;
    }

    const supabase = createClient();

    if (!supabase) {
      setError(
        "O sistema não conseguiu conectar ao Supabase. Verifique o arquivo .env.local."
      );
      return;
    }

    try {
      setLoading(true);

      /*
       * =========================================================
       * 1. LOGIN NO SUPABASE
       * =========================================================
       */

      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email: emailNormalizado,
          password,
        });

      if (loginError) {
        console.error("Erro no login:", loginError);

        if (
          loginError.message
            ?.toLowerCase()
            .includes("invalid login credentials")
        ) {
          setError("E-mail ou senha incorretos.");
        } else {
          setError(
            loginError.message ||
              "Não foi possível entrar na sua conta."
          );
        }

        return;
      }

      /*
       * =========================================================
       * 2. PEGAR USUÁRIO AUTENTICADO
       * =========================================================
       */

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error(
          "Erro ao obter usuário:",
          userError
        );

        setError(
          "Login realizado, mas não foi possível identificar sua conta."
        );

        await supabase.auth.signOut();

        return;
      }

      /*
       * =========================================================
       * 3. PRIMEIRO VERIFICAMOS SE É MASTER
       *
       * IMPORTANTE:
       * A verificação Master acontece ANTES de mandar para
       * /dashboard.
       *
       * Isso impede que uma conta Master que também possua
       * vínculo com uma empresa entre na área do assinante.
       * =========================================================
       */

      try {
        const masterResponse = await fetch(
          "/api/master/status",
          {
            method: "GET",
            cache: "no-store",
            headers: {
              "Cache-Control": "no-cache",
            },
          }
        );

        const masterData =
          await masterResponse
            .json()
            .catch(() => ({}));

        console.log(
          "[LOGIN] Verificação Master:",
          masterData
        );

        if (
          masterResponse.ok &&
          masterData?.isMaster === true
        ) {
          console.log(
            "[LOGIN] Conta Master detectada. Indo para /master"
          );

          window.location.href = "/master";

          return;
        }
      } catch (masterError) {
        /*
         * Se a verificação Master falhar, não bloqueamos
         * automaticamente o usuário comum.
         *
         * Ele seguirá para o fluxo normal.
         */
        console.error(
          "[LOGIN] Erro ao verificar Master:",
          masterError
        );
      }

      /*
       * =========================================================
       * 4. USUÁRIO NORMAL
       *
       * Se não for Master, entra na área da empresa.
       * O layout da área do assinante continuará verificando
       * a assinatura/trial.
       * =========================================================
       */

      console.log(
        "[LOGIN] Usuário comum. Indo para /dashboard"
      );

      window.location.href = "/dashboard";
    } catch (loginError: any) {
      console.error(
        "[LOGIN] Erro inesperado:",
        loginError
      );

      setError(
        loginError?.message ||
          "Ocorreu um erro ao entrar. Tente novamente."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <div className="background-glow glow-one" />
      <div className="background-glow glow-two" />

      <section className="login-container">
        {/* =====================================================
            LADO ESQUERDO
        ====================================================== */}

        <div className="brand-panel">
          <div className="brand">
            <div className="brand-icon">
              <Sparkles size={23} />
            </div>

            <div>
              <div className="brand-name">
                Loan<span>Control</span>
              </div>

              <div className="brand-subtitle">
                Gestão inteligente de crédito
              </div>
            </div>
          </div>

          <div className="brand-content">
            <div className="eyebrow">
              <ShieldCheck size={15} />
              PLATAFORMA PROFISSIONAL
            </div>

            <h1>
              Controle sua
              <br />
              <span>operação de crédito.</span>
            </h1>

            <p>
              Gerencie clientes, empréstimos, parcelas,
              recebimentos e sua carteira em um único
              sistema.
            </p>
          </div>

          <div className="feature-list">
            <div className="feature">
              <div className="feature-icon">
                <Building2 size={17} />
              </div>

              <div>
                <strong>
                  Gestão completa
                </strong>

                <span>
                  Toda sua operação centralizada.
                </span>
              </div>
            </div>

            <div className="feature">
              <div className="feature-icon">
                <ShieldCheck size={17} />
              </div>

              <div>
                <strong>
                  Ambiente seguro
                </strong>

                <span>
                  Seus dados protegidos.
                </span>
              </div>
            </div>
          </div>

          <div className="copyright">
            © {new Date().getFullYear()} LoanControl
          </div>
        </div>

        {/* =====================================================
            LADO DIREITO
        ====================================================== */}

        <div className="form-panel">
          <div className="form-wrapper">
            <div className="mobile-brand">
              <div className="mobile-brand-icon">
                <Sparkles size={20} />
              </div>

              <strong>
                Loan<span>Control</span>
              </strong>
            </div>

            <div className="form-header">
              <div className="form-badge">
                <LockKeyhole size={15} />
                ACESSO SEGURO
              </div>

              <h2>
                Bem-vindo de volta
              </h2>

              <p>
                Entre com seus dados para acessar
                sua conta.
              </p>
            </div>

            <form
              onSubmit={handleLogin}
              className="login-form"
            >
              {/* E-MAIL */}

              <div className="field">
                <label htmlFor="email">
                  E-mail
                </label>

                <div className="input-wrapper">
                  <Mail size={18} />

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="seuemail@empresa.com"
                    autoComplete="email"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* SENHA */}

              <div className="field">
                <div className="password-label">
                  <label htmlFor="password">
                    Senha
                  </label>

                  <button
                    type="button"
                    className="forgot-button"
                    onClick={() => {
                      setError(
                        "A recuperação de senha será disponibilizada nesta área."
                      );
                    }}
                  >
                    Esqueci minha senha
                  </button>
                </div>

                <div className="input-wrapper">
                  <LockKeyhole size={18} />

                  <input
                    id="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="Digite sua senha"
                    autoComplete="current-password"
                    disabled={loading}
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowPassword(
                        !showPassword
                      )
                    }
                    aria-label={
                      showPassword
                        ? "Ocultar senha"
                        : "Mostrar senha"
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              {/* ERRO */}

              {error && (
                <div className="error-box">
                  <div className="error-dot" />

                  <span>{error}</span>
                </div>
              )}

              {/* BOTÃO */}

              <button
                type="submit"
                className="login-button"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2
                      size={18}
                      className="spin"
                    />

                    Verificando acesso...
                  </>
                ) : (
                  <>
                    Entrar na minha conta

                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              {/* CADASTRO */}

              <div className="register-box">
                <div className="register-icon">
                  <Building2 size={18} />
                </div>

                <div className="register-text">
                  <strong>
                    Ainda não possui uma conta?
                  </strong>

                  <span>
                    Crie sua empresa e comece seu
                    período de teste.
                  </span>
                </div>

                <Link
                  href="/cadastro"
                  className="register-link"
                >
                  Criar minha empresa
                  <ArrowRight size={15} />
                </Link>
              </div>
            </form>

            <div className="security-footer">
              <ShieldCheck size={15} />

              <span>
                Ambiente protegido por autenticação
                segura.
              </span>
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .login-page {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 30px;
          background:
            radial-gradient(
              circle at 15% 20%,
              rgba(37, 99, 235, 0.14),
              transparent 35%
            ),
            radial-gradient(
              circle at 85% 80%,
              rgba(79, 70, 229, 0.1),
              transparent 32%
            ),
            #f5f7fb;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .background-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
        }

        .glow-one {
          width: 280px;
          height: 280px;
          background: rgba(37, 99, 235, 0.08);
          top: -100px;
          left: -80px;
        }

        .glow-two {
          width: 320px;
          height: 320px;
          background: rgba(99, 102, 241, 0.07);
          bottom: -130px;
          right: -100px;
        }

        .login-container {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 1120px;
          min-height: 680px;
          display: grid;
          grid-template-columns: 46% 54%;
          overflow: hidden;
          background: white;
          border: 1px solid #e3e8f0;
          border-radius: 26px;
          box-shadow:
            0 30px 80px rgba(15, 23, 42, 0.12),
            0 8px 25px rgba(15, 23, 42, 0.04);
        }

        .brand-panel {
          position: relative;
          padding: 42px 48px;
          display: flex;
          flex-direction: column;
          color: white;
          background:
            radial-gradient(
              circle at 80% 15%,
              rgba(59, 130, 246, 0.22),
              transparent 28%
            ),
            linear-gradient(
              145deg,
              #0b1426 0%,
              #111c32 55%,
              #0b1426 100%
            );
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .brand-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background:
            linear-gradient(
              135deg,
              #2563eb,
              #4f46e5
            );
          box-shadow:
            0 10px 28px rgba(37, 99, 235, 0.3);
        }

        .brand-name {
          font-size: 21px;
          font-weight: 850;
          letter-spacing: -0.6px;
          line-height: 1;
        }

        .brand-name span {
          color: #60a5fa;
        }

        .brand-subtitle {
          margin-top: 5px;
          color: #7f8da5;
          font-size: 9px;
          font-weight: 700;
        }

        .brand-content {
          margin-top: auto;
          margin-bottom: auto;
          max-width: 440px;
        }

        .eyebrow {
          width: fit-content;
          display: flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 20px;
          padding: 8px 11px;
          border: 1px solid
            rgba(96, 165, 250, 0.2);
          border-radius: 8px;
          background: rgba(37, 99, 235, 0.1);
          color: #93c5fd;
          font-size: 9px;
          font-weight: 850;
          letter-spacing: 0.1em;
        }

        .brand-content h1 {
          margin: 0;
          font-size: 44px;
          line-height: 1.08;
          letter-spacing: -1.8px;
          font-weight: 850;
        }

        .brand-content h1 span {
          color: #60a5fa;
        }

        .brand-content p {
          max-width: 400px;
          margin: 22px 0 0;
          color: #9aa9bf;
          font-size: 14px;
          line-height: 1.75;
        }

        .feature-list {
          display: grid;
          gap: 12px;
          margin-top: 30px;
        }

        .feature {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .feature-icon {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #93c5fd;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid
            rgba(255, 255, 255, 0.06);
        }

        .feature div:last-child {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .feature strong {
          font-size: 11px;
          color: #e2e8f0;
        }

        .feature span {
          font-size: 9px;
          color: #66758c;
        }

        .copyright {
          color: #53637b;
          font-size: 9px;
          font-weight: 600;
        }

        .form-panel {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 55px 65px;
          background: #ffffff;
        }

        .form-wrapper {
          width: 100%;
          max-width: 430px;
        }

        .mobile-brand {
          display: none;
        }

        .form-header {
          margin-bottom: 30px;
        }

        .form-badge {
          width: fit-content;
          display: flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 14px;
          color: #2563eb;
          font-size: 9px;
          font-weight: 850;
          letter-spacing: 0.1em;
        }

        .form-header h2 {
          margin: 0;
          color: #111827;
          font-size: 31px;
          line-height: 1.1;
          letter-spacing: -1px;
          font-weight: 850;
        }

        .form-header p {
          margin: 9px 0 0;
          color: #64748b;
          font-size: 13px;
        }

        .login-form {
          display: grid;
          gap: 20px;
        }

        .field {
          display: grid;
          gap: 8px;
        }

        .field label {
          color: #263246;
          font-size: 11px;
          font-weight: 750;
        }

        .password-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .forgot-button {
          padding: 0;
          border: 0;
          background: transparent;
          color: #2563eb;
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
        }

        .forgot-button:hover {
          text-decoration: underline;
        }

        .input-wrapper {
          min-height: 49px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 14px;
          border: 1px solid #dbe2ec;
          border-radius: 10px;
          background: #ffffff;
          transition: 0.18s ease;
        }

        .input-wrapper:focus-within {
          border-color: #60a5fa;
          box-shadow:
            0 0 0 3px
            rgba(37, 99, 235, 0.08);
        }

        .input-wrapper > svg {
          color: #94a3b8;
          flex-shrink: 0;
        }

        .input-wrapper input {
          width: 100%;
          min-width: 0;
          height: 47px;
          padding: 0;
          border: 0;
          outline: none;
          background: transparent;
          color: #172033;
          font-size: 13px;
        }

        .input-wrapper input::placeholder {
          color: #a7b1c0;
        }

        .password-toggle {
          width: 28px;
          height: 28px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          border: 0;
          background: transparent;
          color: #94a3b8;
          cursor: pointer;
        }

        .password-toggle:hover {
          color: #2563eb;
        }

        .error-box {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          padding: 11px 12px;
          border: 1px solid #fecaca;
          border-radius: 9px;
          background: #fff7f7;
          color: #b91c1c;
          font-size: 11px;
          line-height: 1.5;
        }

        .error-dot {
          width: 7px;
          height: 7px;
          margin-top: 4px;
          border-radius: 50%;
          background: #ef4444;
          flex-shrink: 0;
        }

        .login-button {
          width: 100%;
          min-height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          border: 0;
          border-radius: 10px;
          background:
            linear-gradient(
              135deg,
              #2563eb,
              #315eea
            );
          color: white;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          box-shadow:
            0 10px 24px
            rgba(37, 99, 235, 0.2);
          transition: 0.18s ease;
        }

        .login-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow:
            0 13px 28px
            rgba(37, 99, 235, 0.25);
        }

        .login-button:disabled {
          opacity: 0.7;
          cursor: wait;
        }

        .register-box {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 11px;
          padding: 14px;
          border: 1px solid #e5eaf1;
          border-radius: 12px;
          background: #f8fafc;
        }

        .register-icon {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #eff6ff;
          color: #2563eb;
        }

        .register-text {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .register-text strong {
          color: #273449;
          font-size: 10px;
          font-weight: 800;
        }

        .register-text span {
          color: #7b8799;
          font-size: 9px;
          line-height: 1.4;
        }

        .register-link {
          grid-column: 2;
          display: flex;
          align-items: center;
          gap: 5px;
          width: fit-content;
          color: #2563eb;
          text-decoration: none;
          font-size: 10px;
          font-weight: 800;
        }

        .register-link:hover {
          text-decoration: underline;
        }

        .security-footer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 24px;
          color: #94a3b8;
          font-size: 9px;
        }

        .security-footer svg {
          color: #60a5fa;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 900px) {
          .login-page {
            padding: 18px;
          }

          .login-container {
            max-width: 560px;
            min-height: auto;
            grid-template-columns: 1fr;
          }

          .brand-panel {
            display: none;
          }

          .form-panel {
            padding: 42px 34px;
          }

          .mobile-brand {
            display: flex;
            align-items: center;
            gap: 9px;
            margin-bottom: 38px;
          }

          .mobile-brand-icon {
            width: 38px;
            height: 38px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #2563eb;
            color: white;
          }

          .mobile-brand strong {
            color: #172033;
            font-size: 19px;
          }

          .mobile-brand strong span {
            color: #2563eb;
          }
        }

        @media (max-width: 500px) {
          .login-page {
            padding: 0;
          }

          .login-container {
            min-height: 100vh;
            border: 0;
            border-radius: 0;
            box-shadow: none;
          }

          .form-panel {
            padding: 30px 22px;
            align-items: flex-start;
          }

          .form-wrapper {
            padding-top: 10px;
          }

          .form-header h2 {
            font-size: 27px;
          }

          .register-box {
            grid-template-columns: auto 1fr;
          }
        }
      `}</style>
    </main>
  );
}