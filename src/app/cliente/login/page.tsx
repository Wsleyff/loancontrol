"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LockKeyhole,
  Mail,
  ShieldCheck,
  ArrowRight,
  Loader2,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

export default function ClienteLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (!email.trim() || !password) {
      setError("Informe seu e-mail e sua senha.");
      return;
    }

    const supabase = createClient();

    if (!supabase) {
      setError("Não foi possível conectar ao sistema.");
      return;
    }

    setLoading(true);

    const { error: loginError } =
      await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

    if (loginError) {
      setLoading(false);

      setError(
        "E-mail ou senha incorretos. Confira seus dados e tente novamente."
      );

      return;
    }

    router.push("/cliente/dashboard");
    router.refresh();
  }

  return (
    <main style={styles.page}>
      <div style={styles.backgroundGlow} />

      <section style={styles.card}>
        <div style={styles.brandArea}>
          <div style={styles.logo}>
            <ShieldCheck size={28} strokeWidth={2.2} />
          </div>

          <div>
            <div style={styles.brand}>LoanControl</div>
            <div style={styles.brandSubtitle}>Portal do cliente</div>
          </div>
        </div>

        <div style={styles.header}>
          <h1 style={styles.title}>Acesse sua conta</h1>

          <p style={styles.description}>
            Consulte seus empréstimos, parcelas e vencimentos.
          </p>
        </div>

        {error && (
          <div style={styles.error}>
            <strong>Não foi possível entrar</strong>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label style={styles.label}>
            E-mail
          </label>

          <div style={styles.inputWrapper}>
            <Mail size={19} style={styles.inputIcon} />

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="seu@email.com"
              autoComplete="email"
              style={styles.input}
            />
          </div>

          <label style={{ ...styles.label, marginTop: 18 }}>
            Senha
          </label>

          <div style={styles.inputWrapper}>
            <LockKeyhole size={19} style={styles.inputIcon} />

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Digite sua senha"
              autoComplete="current-password"
              style={styles.input}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? (
              <>
                <Loader2
                  size={19}
                  className="loancontrol-spin"
                />
                Entrando...
              </>
            ) : (
              <>
                Entrar no portal
                <ArrowRight size={19} />
              </>
            )}
          </button>
        </form>

        <div style={styles.security}>
          <ShieldCheck size={17} />

          <span>
            Seus dados são protegidos pelo sistema de
            autenticação do LoanControl.
          </span>
        </div>
      </section>

      <style jsx>{`
        .loancontrol-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        input::placeholder {
          color: #94a3b8;
        }

        input:focus {
          outline: none;
          border-color: #2563eb !important;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
        }

        button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 12px 24px rgba(37, 99, 235, 0.22);
        }
      `}</style>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #f8fafc 0%, #eef4ff 50%, #f8fafc 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    position: "relative",
    overflow: "hidden",
  },

  backgroundGlow: {
    position: "absolute",
    width: 420,
    height: 420,
    borderRadius: "50%",
    background: "rgba(37, 99, 235, 0.08)",
    filter: "blur(80px)",
    top: -180,
    right: -120,
  },

  card: {
    width: "100%",
    maxWidth: 450,
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 24,
    padding: 34,
    boxShadow: "0 24px 70px rgba(15, 23, 42, 0.10)",
    position: "relative",
    zIndex: 1,
  },

  brandArea: {
    display: "flex",
    alignItems: "center",
    gap: 13,
    marginBottom: 34,
  },

  logo: {
    width: 48,
    height: 48,
    borderRadius: 14,
    background: "#2563eb",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 10px 25px rgba(37, 99, 235, 0.22)",
  },

  brand: {
    fontSize: 18,
    fontWeight: 800,
    color: "#0f172a",
  },

  brandSubtitle: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
  },

  header: {
    marginBottom: 26,
  },

  title: {
    margin: 0,
    fontSize: 29,
    lineHeight: 1.15,
    fontWeight: 800,
    color: "#0f172a",
    letterSpacing: "-0.5px",
  },

  description: {
    margin: "9px 0 0",
    color: "#64748b",
    fontSize: 14,
    lineHeight: 1.6,
  },

  error: {
    border: "1px solid #fecaca",
    background: "#fef2f2",
    color: "#991b1b",
    borderRadius: 13,
    padding: "12px 14px",
    marginBottom: 20,
    display: "flex",
    flexDirection: "column",
    gap: 3,
    fontSize: 13,
    lineHeight: 1.4,
  },

  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 700,
    color: "#334155",
    marginBottom: 8,
  },

  inputWrapper: {
    position: "relative",
  },

  inputIcon: {
    position: "absolute",
    left: 14,
    top: "50%",
    transform: "translateY(-50%)",
    color: "#94a3b8",
    pointerEvents: "none",
  },

  input: {
    width: "100%",
    height: 50,
    border: "1px solid #cbd5e1",
    borderRadius: 12,
    padding: "0 14px 0 45px",
    fontSize: 14,
    color: "#0f172a",
    background: "#ffffff",
    boxSizing: "border-box",
    transition: "all .2s ease",
  },

  button: {
    width: "100%",
    height: 52,
    marginTop: 25,
    border: "none",
    borderRadius: 13,
    background: "#2563eb",
    color: "#ffffff",
    fontSize: 14,
    fontWeight: 750,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    transition: "all .2s ease",
  },

  security: {
    marginTop: 22,
    paddingTop: 18,
    borderTop: "1px solid #e2e8f0",
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    color: "#64748b",
    fontSize: 11.5,
    lineHeight: 1.5,
  },
};