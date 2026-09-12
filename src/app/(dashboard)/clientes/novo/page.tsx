"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  MapPin,
  Phone,
  Mail,
  FileText,
  Save,
  Loader2,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { customerSchema } from "@/lib/validations/customer.schema";

function formatCPF(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function formatPhone(value: string) {
  const numbers = value.replace(/\D/g, "").slice(0, 11);

  if (numbers.length <= 2) {
    return numbers.length ? `(${numbers}` : "";
  }

  if (numbers.length <= 7) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  }

  if (numbers.length <= 10) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(
      2,
      6
    )}-${numbers.slice(6)}`;
  }

  return `(${numbers.slice(0, 2)}) ${numbers.slice(
    2,
    7
  )}-${numbers.slice(7)}`;
}

export default function NovoCliente() {
  const router = useRouter();

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
  });

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  function atualizarCampo(
    campo: keyof typeof form,
    valor: string
  ) {
    setForm((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  }

  async function save() {
    setLoading(true);
    setMsg("");
    setError("");

    const validacao = customerSchema.safeParse({
      full_name: form.full_name,
      cpf: form.cpf,
      phone: form.phone,
      whatsapp: form.whatsapp,
      email: form.email,
      city: form.city,
      state: form.state,
      notes: form.notes,
    });

    if (!validacao.success) {
      setError(
        validacao.error.issues[0]?.message ||
          "Confira os campos preenchidos."
      );
      setLoading(false);
      return;
    }

    const supabase = createClient();

    if (!supabase) {
      setError(
        "O Supabase não está configurado no arquivo .env.local."
      );
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Sua sessão expirou. Faça login novamente.");
      setLoading(false);
      return;
    }

    const { data: companyUser, error: companyError } =
      await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", user.id)
        .eq("status", "ACTIVE")
        .limit(1)
        .maybeSingle();

    if (companyError) {
      setError(companyError.message);
      setLoading(false);
      return;
    }

    if (!companyUser?.company_id) {
      setError(
        "Seu usuário ainda não está vinculado a uma empresa."
      );
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("customers")
      .insert({
        company_id: companyUser.company_id,
        full_name: form.full_name,
        cpf: form.cpf || null,
        rg: form.rg || null,
        birth_date: form.birth_date || null,
        phone: form.phone || null,
        whatsapp: form.whatsapp || null,
        email: form.email || null,
        address: form.address || null,
        address_number: form.address_number || null,
        neighborhood: form.neighborhood || null,
        city: form.city || null,
        state: form.state || null,
        zip_code: form.zip_code || null,
        notes: form.notes || null,
        status: "ACTIVE",
      });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    setMsg("Cliente cadastrado com sucesso!");

    setTimeout(() => {
      router.push("/clientes");
      router.refresh();
    }, 800);
  }

  return (
    <main className="container">
      {/* Cabeçalho */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <button
            type="button"
            onClick={() => router.push("/clientes")}
            className="btn"
            style={{
              marginBottom: 12,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <ArrowLeft size={18} />
            Voltar para clientes
          </button>

          <h1 style={{ margin: 0 }}>Cadastrar cliente</h1>

          <p className="muted" style={{ marginTop: 6 }}>
            Cadastre todas as informações do cliente para
            utilizar no gerenciamento de empréstimos.
          </p>
        </div>
      </div>

      {/* Dados pessoais */}
      <section
        className="card"
        style={{
          padding: 26,
          marginBottom: 18,
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
              width: 42,
              height: 42,
              borderRadius: 10,
              display: "grid",
              placeItems: "center",
              background: "#f1f5f9",
            }}
          >
            <User size={21} />
          </div>

          <div>
            <h2 style={{ margin: 0, fontSize: 19 }}>
              Dados pessoais
            </h2>

            <p className="muted" style={{ margin: 3 }}>
              Informações básicas do cliente
            </p>
          </div>
        </div>

        <div
          className="grid"
          style={{
            gridTemplateColumns: "2fr 1fr 1fr",
            gap: 18,
          }}
        >
          <Field
            label="Nome completo"
            required
            value={form.full_name}
            placeholder="Digite o nome completo"
            onChange={(value) =>
              atualizarCampo("full_name", value)
            }
          />

          <Field
            label="CPF"
            value={form.cpf}
            placeholder="000.000.000-00"
            onChange={(value) =>
              atualizarCampo("cpf", formatCPF(value))
            }
          />

          <Field
            label="RG"
            value={form.rg}
            placeholder="Digite o RG"
            onChange={(value) =>
              atualizarCampo("rg", value)
            }
          />

          <Field
            label="Data de nascimento"
            type="date"
            value={form.birth_date}
            onChange={(value) =>
              atualizarCampo("birth_date", value)
            }
          />
        </div>
      </section>

      {/* Contato */}
      <section
        className="card"
        style={{
          padding: 26,
          marginBottom: 18,
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
              width: 42,
              height: 42,
              borderRadius: 10,
              display: "grid",
              placeItems: "center",
              background: "#f1f5f9",
            }}
          >
            <Phone size={21} />
          </div>

          <div>
            <h2 style={{ margin: 0, fontSize: 19 }}>
              Contato
            </h2>

            <p className="muted" style={{ margin: 3 }}>
              Telefones e informações de contato
            </p>
          </div>
        </div>

        <div
          className="grid"
          style={{
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 18,
          }}
        >
          <Field
            label="Telefone"
            value={form.phone}
            placeholder="(00) 00000-0000"
            onChange={(value) =>
              atualizarCampo("phone", formatPhone(value))
            }
          />

          <Field
            label="WhatsApp"
            value={form.whatsapp}
            placeholder="(00) 00000-0000"
            onChange={(value) =>
              atualizarCampo(
                "whatsapp",
                formatPhone(value)
              )
            }
          />

          <Field
            label="E-mail"
            type="email"
            value={form.email}
            placeholder="cliente@email.com"
            onChange={(value) =>
              atualizarCampo("email", value)
            }
          />
        </div>
      </section>

      {/* Endereço */}
      <section
        className="card"
        style={{
          padding: 26,
          marginBottom: 18,
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
              width: 42,
              height: 42,
              borderRadius: 10,
              display: "grid",
              placeItems: "center",
              background: "#f1f5f9",
            }}
          >
            <MapPin size={21} />
          </div>

          <div>
            <h2 style={{ margin: 0, fontSize: 19 }}>
              Endereço
            </h2>

            <p className="muted" style={{ margin: 3 }}>
              Localização e endereço residencial
            </p>
          </div>
        </div>

        <div
          className="grid"
          style={{
            gridTemplateColumns: "2fr 1fr 1fr",
            gap: 18,
          }}
        >
          <Field
            label="Endereço"
            value={form.address}
            placeholder="Rua, avenida..."
            onChange={(value) =>
              atualizarCampo("address", value)
            }
          />

          <Field
            label="Número"
            value={form.address_number}
            placeholder="Nº"
            onChange={(value) =>
              atualizarCampo("address_number", value)
            }
          />

          <Field
            label="Bairro"
            value={form.neighborhood}
            placeholder="Bairro"
            onChange={(value) =>
              atualizarCampo("neighborhood", value)
            }
          />

          <Field
            label="Cidade"
            value={form.city}
            placeholder="Cidade"
            onChange={(value) =>
              atualizarCampo("city", value)
            }
          />

          <div>
            <label
              style={{
                display: "block",
                fontWeight: 600,
                marginBottom: 7,
              }}
            >
              Estado
            </label>

            <select
              className="input"
              value={form.state}
              onChange={(e) =>
                atualizarCampo("state", e.target.value)
              }
            >
              <option value="">Selecione</option>
              <option value="AC">Acre</option>
              <option value="AL">Alagoas</option>
              <option value="AP">Amapá</option>
              <option value="AM">Amazonas</option>
              <option value="BA">Bahia</option>
              <option value="CE">Ceará</option>
              <option value="DF">Distrito Federal</option>
              <option value="ES">Espírito Santo</option>
              <option value="GO">Goiás</option>
              <option value="MA">Maranhão</option>
              <option value="MT">Mato Grosso</option>
              <option value="MS">Mato Grosso do Sul</option>
              <option value="MG">Minas Gerais</option>
              <option value="PA">Pará</option>
              <option value="PB">Paraíba</option>
              <option value="PR">Paraná</option>
              <option value="PE">Pernambuco</option>
              <option value="PI">Piauí</option>
              <option value="RJ">Rio de Janeiro</option>
              <option value="RN">Rio Grande do Norte</option>
              <option value="RS">Rio Grande do Sul</option>
              <option value="RO">Rondônia</option>
              <option value="RR">Roraima</option>
              <option value="SC">Santa Catarina</option>
              <option value="SP">São Paulo</option>
              <option value="SE">Sergipe</option>
              <option value="TO">Tocantins</option>
            </select>
          </div>

          <Field
            label="CEP"
            value={form.zip_code}
            placeholder="00000-000"
            onChange={(value) =>
              atualizarCampo(
                "zip_code",
                value
                  .replace(/\D/g, "")
                  .slice(0, 8)
                  .replace(/(\d{5})(\d)/, "$1-$2")
              )
            }
          />
        </div>
      </section>

      {/* Observações */}
      <section
        className="card"
        style={{
          padding: 26,
          marginBottom: 18,
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
              width: 42,
              height: 42,
              borderRadius: 10,
              display: "grid",
              placeItems: "center",
              background: "#f1f5f9",
            }}
          >
            <FileText size={21} />
          </div>

          <div>
            <h2 style={{ margin: 0, fontSize: 19 }}>
              Observações
            </h2>

            <p className="muted" style={{ margin: 3 }}>
              Informações adicionais sobre o cliente
            </p>
          </div>
        </div>

        <textarea
          className="input"
          value={form.notes}
          placeholder="Digite observações, referências, informações importantes..."
          onChange={(e) =>
            atualizarCampo("notes", e.target.value)
          }
          rows={5}
          style={{
            resize: "vertical",
            width: "100%",
          }}
        />
      </section>

      {/* Mensagens */}
      {error && (
        <div
          style={{
            padding: 14,
            marginBottom: 16,
            borderRadius: 10,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#b91c1c",
          }}
        >
          {error}
        </div>
      )}

      {msg && (
        <div
          style={{
            padding: 14,
            marginBottom: 16,
            borderRadius: 10,
            border: "1px solid #bbf7d0",
            background: "#f0fdf4",
            color: "#15803d",
          }}
        >
          {msg}
        </div>
      )}

      {/* Botões */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 12,
          marginBottom: 40,
        }}
      >
        <button
          type="button"
          className="btn"
          onClick={() => router.push("/clientes")}
          disabled={loading}
        >
          Cancelar
        </button>

        <button
          type="button"
          className="btn btn-primary"
          onClick={save}
          disabled={loading}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            minWidth: 170,
            justifyContent: "center",
          }}
        >
          {loading ? (
            <>
              <Loader2
                size={18}
                style={{
                  animation: "spin 1s linear infinite",
                }}
              />
              Salvando...
            </>
          ) : (
            <>
              <Save size={18} />
              Cadastrar cliente
            </>
          )}
        </button>
      </div>

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 900px) {
          .grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontWeight: 600,
          marginBottom: 7,
        }}
      >
        {label}

        {required && (
          <span
            style={{
              color: "#dc2626",
              marginLeft: 4,
            }}
          >
            *
          </span>
        )}
      </label>

      <input
        className="input"
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}