"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  User,
  Mail,
  Phone,
  MessageCircle,
  MapPin,
  FileText,
  Calendar,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Customer = {
  id: string;
  company_id?: string | null;
  full_name?: string | null;
  cpf?: string | null;
  rg?: string | null;
  birth_date?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  address?: string | null;
  address_number?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  notes?: string | null;
  status?: string | null;
};

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatCPF(value: string) {
  const numbers = value.replace(/\D/g, "").slice(0, 11);

  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) {
    return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  }
  if (numbers.length <= 9) {
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(
      6
    )}`;
  }

  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(
    6,
    9
  )}-${numbers.slice(9)}`;
}

function formatPhone(value: string) {
  const numbers = value.replace(/\D/g, "").slice(0, 11);

  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 7) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  }

  if (numbers.length <= 10) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(
      6
    )}`;
  }

  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(
    7
  )}`;
}

function formatCEP(value: string) {
  const numbers = value.replace(/\D/g, "").slice(0, 8);

  if (numbers.length <= 5) return numbers;

  return `${numbers.slice(0, 5)}-${numbers.slice(5)}`;
}

export default function EditarClientePage({ params }: PageProps) {
  const router = useRouter();

  const [clienteId, setClienteId] = useState<string>("");

  const [form, setForm] = useState({
    full_name: "",
    cpf: "",
    rg: "",
    birth_date: "",
    phone: "",
    whatsapp: "",
    email: "",
    address: "",
    address_number: "",
    neighborhood: "",
    city: "",
    state: "",
    zip_code: "",
    notes: "",
    status: "ACTIVE",
  });

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    let ativo = true;

    async function carregarId() {
      try {
        const resolvedParams = await params;

        if (!ativo) return;

        setClienteId(resolvedParams.id);
      } catch {
        if (ativo) {
          setErro("Não foi possível identificar o cliente.");
          setCarregando(false);
        }
      }
    }

    carregarId();

    return () => {
      ativo = false;
    };
  }, [params]);

  useEffect(() => {
    if (!clienteId) return;

    async function carregarCliente() {
      try {
        setCarregando(true);
        setErro("");

        const supabase = createClient();

        if (!supabase) {
          throw new Error(
            "Supabase não configurado. Verifique o arquivo .env.local."
          );
        }

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.push("/login");
          return;
        }

        const { data, error } = await supabase
          .from("customers")
          .select("*")
          .eq("id", clienteId)
          .maybeSingle();

        if (error) {
          console.error("[EDITAR CLIENTE]", error);
          throw new Error(
            error.message || "Erro ao carregar os dados do cliente."
          );
        }

        if (!data) {
          throw new Error("Cliente não encontrado.");
        }

        const cliente = data as Customer;

        setForm({
          full_name: cliente.full_name || "",
          cpf: cliente.cpf || "",
          rg: cliente.rg || "",
          birth_date: cliente.birth_date
            ? String(cliente.birth_date).slice(0, 10)
            : "",
          phone: cliente.phone || "",
          whatsapp: cliente.whatsapp || "",
          email: cliente.email || "",
          address: cliente.address || "",
          address_number: cliente.address_number || "",
          neighborhood: cliente.neighborhood || "",
          city: cliente.city || "",
          state: cliente.state || "",
          zip_code: cliente.zip_code || "",
          notes: cliente.notes || "",
          status: cliente.status || "ACTIVE",
        });
      } catch (error) {
        console.error("[EDITAR CLIENTE]", error);

        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o cliente."
        );
      } finally {
        setCarregando(false);
      }
    }

    carregarCliente();
  }, [clienteId, router]);

  function atualizarCampo(
    campo: keyof typeof form,
    valor: string
  ) {
    setForm((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  }

  async function salvar() {
    setErro("");
    setSucesso(false);

    if (!form.full_name.trim()) {
      setErro("Informe o nome completo do cliente.");
      return;
    }

    try {
      setSalvando(true);

      const supabase = createClient();

      if (!supabase) {
        throw new Error(
          "Supabase não configurado. Verifique o arquivo .env.local."
        );
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push("/login");
        return;
      }

      const payload = {
        full_name: form.full_name.trim(),
        cpf: form.cpf.trim() || null,
        rg: form.rg.trim() || null,
        birth_date: form.birth_date || null,
        phone: form.phone.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        email: form.email.trim().toLowerCase() || null,
        address: form.address.trim() || null,
        address_number: form.address_number.trim() || null,
        neighborhood: form.neighborhood.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim().toUpperCase() || null,
        zip_code: form.zip_code.trim() || null,
        notes: form.notes.trim() || null,
        status: form.status,
      };

      const { error } = await supabase
        .from("customers")
        .update(payload)
        .eq("id", clienteId);

      if (error) {
        console.error("[EDITAR CLIENTE] Salvar:", error);

        throw new Error(
          error.message || "Não foi possível salvar as alterações."
        );
      }

      setSucesso(true);

      setTimeout(() => {
        router.push(`/clientes/${clienteId}`);
        router.refresh();
      }, 800);
    } catch (error) {
      console.error("[EDITAR CLIENTE]", error);

      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o cliente."
      );
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <main style={styles.page}>
        <div style={styles.loadingCard}>
          <Loader2 size={30} style={styles.spinner} />
          <strong>Carregando cliente...</strong>
          <span>Aguarde enquanto buscamos os dados.</span>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <div style={styles.topbar}>
          <button
            type="button"
            onClick={() => router.back()}
            style={styles.backButton}
          >
            <ArrowLeft size={18} />
            Voltar
          </button>

          <div>
            <div style={styles.eyebrow}>CLIENTES</div>
            <h1 style={styles.title}>Editar cliente</h1>
            <p style={styles.subtitle}>
              Atualize os dados cadastrais e informações de contato.
            </p>
          </div>
        </div>

        {erro && (
          <div style={styles.errorBox}>
            <AlertCircle size={19} />
            <div>
              <strong>Não foi possível concluir</strong>
              <div>{erro}</div>
            </div>
          </div>
        )}

        {sucesso && (
          <div style={styles.successBox}>
            <CheckCircle2 size={19} />
            <div>
              <strong>Cliente atualizado!</strong>
              <div>Redirecionando para os dados do cliente...</div>
            </div>
          </div>
        )}

        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.iconCircle}>
              <User size={20} />
            </div>

            <div>
              <h2 style={styles.cardTitle}>Dados pessoais</h2>
              <p style={styles.cardDescription}>
                Informações básicas do cliente.
              </p>
            </div>
          </div>

          <div style={styles.formGrid}>
            <Field
              label="Nome completo"
              required
              icon={<User size={17} />}
            >
              <input
                value={form.full_name}
                onChange={(e) =>
                  atualizarCampo("full_name", e.target.value)
                }
                placeholder="Nome completo"
                style={styles.input}
              />
            </Field>

            <Field label="CPF" icon={<FileText size={17} />}>
              <input
                value={form.cpf}
                onChange={(e) =>
                  atualizarCampo("cpf", formatCPF(e.target.value))
                }
                placeholder="000.000.000-00"
                style={styles.input}
              />
            </Field>

            <Field label="RG" icon={<FileText size={17} />}>
              <input
                value={form.rg}
                onChange={(e) => atualizarCampo("rg", e.target.value)}
                placeholder="Número do RG"
                style={styles.input}
              />
            </Field>

            <Field label="Data de nascimento" icon={<Calendar size={17} />}>
              <input
                type="date"
                value={form.birth_date}
                onChange={(e) =>
                  atualizarCampo("birth_date", e.target.value)
                }
                style={styles.input}
              />
            </Field>

            <Field label="Status" icon={<User size={17} />}>
              <select
                value={form.status}
                onChange={(e) =>
                  atualizarCampo("status", e.target.value)
                }
                style={styles.input}
              >
                <option value="ACTIVE">Ativo</option>
                <option value="INACTIVE">Inativo</option>
                <option value="BLOCKED">Bloqueado</option>
              </select>
            </Field>
          </div>
        </section>

        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.iconCircle}>
              <Phone size={20} />
            </div>

            <div>
              <h2 style={styles.cardTitle}>Contato</h2>
              <p style={styles.cardDescription}>
                Telefone, WhatsApp e e-mail.
              </p>
            </div>
          </div>

          <div style={styles.formGrid}>
            <Field label="Telefone" icon={<Phone size={17} />}>
              <input
                value={form.phone}
                onChange={(e) =>
                  atualizarCampo("phone", formatPhone(e.target.value))
                }
                placeholder="(85) 99999-9999"
                style={styles.input}
              />
            </Field>

            <Field label="WhatsApp" icon={<MessageCircle size={17} />}>
              <input
                value={form.whatsapp}
                onChange={(e) =>
                  atualizarCampo(
                    "whatsapp",
                    formatPhone(e.target.value)
                  )
                }
                placeholder="(85) 99999-9999"
                style={styles.input}
              />
            </Field>

            <Field label="E-mail" icon={<Mail size={17} />}>
              <input
                type="email"
                value={form.email}
                onChange={(e) =>
                  atualizarCampo("email", e.target.value)
                }
                placeholder="cliente@email.com"
                style={styles.input}
              />
            </Field>
          </div>
        </section>

        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.iconCircle}>
              <MapPin size={20} />
            </div>

            <div>
              <h2 style={styles.cardTitle}>Endereço</h2>
              <p style={styles.cardDescription}>
                Endereço residencial ou comercial.
              </p>
            </div>
          </div>

          <div style={styles.formGrid}>
            <div style={styles.fieldWide}>
              <Field label="Endereço" icon={<MapPin size={17} />}>
                <input
                  value={form.address}
                  onChange={(e) =>
                    atualizarCampo("address", e.target.value)
                  }
                  placeholder="Rua, avenida..."
                  style={styles.input}
                />
              </Field>
            </div>

            <Field label="Número">
              <input
                value={form.address_number}
                onChange={(e) =>
                  atualizarCampo("address_number", e.target.value)
                }
                placeholder="Número"
                style={styles.input}
              />
            </Field>

            <Field label="Bairro">
              <input
                value={form.neighborhood}
                onChange={(e) =>
                  atualizarCampo("neighborhood", e.target.value)
                }
                placeholder="Bairro"
                style={styles.input}
              />
            </Field>

            <Field label="Cidade">
              <input
                value={form.city}
                onChange={(e) =>
                  atualizarCampo("city", e.target.value)
                }
                placeholder="Cidade"
                style={styles.input}
              />
            </Field>

            <Field label="Estado">
              <input
                value={form.state}
                onChange={(e) =>
                  atualizarCampo("state", e.target.value)
                }
                placeholder="CE"
                maxLength={2}
                style={styles.input}
              />
            </Field>

            <Field label="CEP">
              <input
                value={form.zip_code}
                onChange={(e) =>
                  atualizarCampo(
                    "zip_code",
                    formatCEP(e.target.value)
                  )
                }
                placeholder="00000-000"
                style={styles.input}
              />
            </Field>
          </div>
        </section>

        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.iconCircle}>
              <FileText size={20} />
            </div>

            <div>
              <h2 style={styles.cardTitle}>Observações</h2>
              <p style={styles.cardDescription}>
                Anotações internas sobre o cliente.
              </p>
            </div>
          </div>

          <textarea
            value={form.notes}
            onChange={(e) =>
              atualizarCampo("notes", e.target.value)
            }
            placeholder="Digite observações sobre este cliente..."
            style={styles.textarea}
            rows={5}
          />
        </section>

        <div style={styles.footer}>
          <button
            type="button"
            onClick={() => router.back()}
            disabled={salvando}
            style={styles.cancelButton}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={salvar}
            disabled={salvando}
            style={styles.saveButton}
          >
            {salvando ? (
              <>
                <Loader2 size={18} style={styles.spinner} />
                Salvando...
              </>
            ) : (
              <>
                <Save size={18} />
                Salvar alterações
              </>
            )}
          </button>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  required,
  icon,
  children,
}: {
  label: string;
  required?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>
        {icon}
        {label}
        {required && <span style={styles.required}>*</span>}
      </label>

      {children}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f6f8fb",
    padding: "28px 24px 48px",
  },

  container: {
    width: "100%",
    maxWidth: 1180,
    margin: "0 auto",
  },

  topbar: {
    display: "flex",
    alignItems: "flex-start",
    gap: 20,
    marginBottom: 24,
  },

  backButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    border: "1px solid #dce2ea",
    background: "#fff",
    color: "#344054",
    borderRadius: 10,
    padding: "10px 14px",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
  },

  eyebrow: {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    color: "#667085",
    marginBottom: 5,
  },

  title: {
    margin: 0,
    fontSize: 30,
    lineHeight: 1.15,
    color: "#101828",
    fontWeight: 800,
  },

  subtitle: {
    margin: "7px 0 0",
    color: "#667085",
    fontSize: 14,
  },

  card: {
    background: "#fff",
    border: "1px solid #e4e7ec",
    borderRadius: 16,
    padding: 24,
    marginBottom: 18,
    boxShadow: "0 2px 8px rgba(16,24,40,0.04)",
  },

  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 13,
    paddingBottom: 20,
    marginBottom: 20,
    borderBottom: "1px solid #eef1f5",
  },

  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    background: "#eef4ff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  cardTitle: {
    margin: 0,
    fontSize: 17,
    fontWeight: 800,
    color: "#101828",
  },

  cardDescription: {
    margin: "4px 0 0",
    fontSize: 13,
    color: "#667085",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: 18,
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },

  fieldWide: {
    gridColumn: "span 2",
  },

  label: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    fontWeight: 700,
    color: "#344054",
  },

  required: {
    color: "#ef4444",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    height: 44,
    border: "1px solid #d0d5dd",
    borderRadius: 10,
    padding: "0 13px",
    background: "#fff",
    color: "#101828",
    fontSize: 14,
    outline: "none",
  },

  textarea: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #d0d5dd",
    borderRadius: 10,
    padding: 13,
    background: "#fff",
    color: "#101828",
    fontSize: 14,
    resize: "vertical",
    outline: "none",
    fontFamily: "inherit",
  },

  footer: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
    paddingTop: 4,
  },

  cancelButton: {
    height: 44,
    padding: "0 18px",
    borderRadius: 10,
    border: "1px solid #d0d5dd",
    background: "#fff",
    color: "#344054",
    fontWeight: 700,
    cursor: "pointer",
  },

  saveButton: {
    height: 44,
    padding: "0 20px",
    borderRadius: 10,
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  },

  errorBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    background: "#fff1f2",
    border: "1px solid #fecdd3",
    color: "#be123c",
    borderRadius: 12,
    padding: 15,
    marginBottom: 18,
    fontSize: 13,
  },

  successBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    background: "#ecfdf3",
    border: "1px solid #abefc6",
    color: "#067647",
    borderRadius: 12,
    padding: 15,
    marginBottom: 18,
    fontSize: 13,
  },

  loadingCard: {
    minHeight: 300,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    color: "#475467",
  },

  spinner: {
    animation: "spin 1s linear infinite",
  },
};