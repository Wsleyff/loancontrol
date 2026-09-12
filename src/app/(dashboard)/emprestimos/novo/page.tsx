"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calculator,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  Loader2,
  Save,
  User,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Cliente = {
  id: string;
  full_name: string;
  cpf: string | null;
};

type Frequencia = "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY";

type Parcela = {
  numero: number;
  vencimento: string;
  valor: number;
  principal: number;
  juros: number;
};

function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function dataBR(data: string) {
  if (!data) return "-";

  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function adicionarPeriodo(
  data: Date,
  frequencia: Frequencia
) {
  const nova = new Date(data);

  if (frequencia === "DAILY") {
    nova.setDate(nova.getDate() + 1);
  }

  if (frequencia === "WEEKLY") {
    nova.setDate(nova.getDate() + 7);
  }

  if (frequencia === "BIWEEKLY") {
    nova.setDate(nova.getDate() + 14);
  }

  if (frequencia === "MONTHLY") {
    nova.setMonth(nova.getMonth() + 1);
  }

  return nova;
}

function dataISO(data: Date) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

export default function NovoEmprestimo() {
  const router = useRouter();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState("");

  const [valor, setValor] = useState("");
  const [taxa, setTaxa] = useState("1,8");
  const [parcelas, setParcelas] = useState("12");

  const [tipoJuros, setTipoJuros] = useState<
    "SIMPLE" | "COMPOUND" | "FIXED"
  >("SIMPLE");

  const [frequencia, setFrequencia] =
    useState<Frequencia>("MONTHLY");

  const hoje = new Date();

  const [dataEmprestimo, setDataEmprestimo] = useState(
    dataISO(hoje)
  );

  const primeiroVencimento = new Date(hoje);
  primeiroVencimento.setMonth(
    primeiroVencimento.getMonth() + 1
  );

  const [primeiroVencimentoData, setPrimeiroVencimentoData] =
    useState(dataISO(primeiroVencimento));

  const [observacoes, setObservacoes] = useState("");

  const [carregandoClientes, setCarregandoClientes] =
    useState(true);

  const [salvando, setSalvando] = useState(false);

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  useEffect(() => {
    carregarClientes();
  }, []);

  async function carregarClientes() {
    setCarregandoClientes(true);
    setErro("");

    const supabase = createClient();

    if (!supabase) {
      setErro(
        "Supabase não configurado no arquivo .env.local."
      );
      setCarregandoClientes(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const { data: empresa, error: empresaError } =
      await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", user.id)
        .eq("status", "ACTIVE")
        .limit(1)
        .maybeSingle();

    if (empresaError || !empresa?.company_id) {
      setErro(
        empresaError?.message ||
          "Usuário não está vinculado a uma empresa."
      );
      setCarregandoClientes(false);
      return;
    }

    const { data, error } = await supabase
      .from("customers")
      .select("id, full_name, cpf")
      .eq("company_id", empresa.company_id)
      .eq("status", "ACTIVE")
      .order("full_name");

    if (error) {
      setErro(error.message);
      setCarregandoClientes(false);
      return;
    }

    setClientes(data || []);
    setCarregandoClientes(false);
  }

  const valorNumerico = useMemo(() => {
    const numero = Number(
      valor.replace(/\./g, "").replace(",", ".")
    );

    return Number.isFinite(numero) ? numero : 0;
  }, [valor]);

  const taxaNumerica = useMemo(() => {
    const numero = Number(
      taxa.replace(/\./g, "").replace(",", ".")
    );

    return Number.isFinite(numero) ? numero : 0;
  }, [taxa]);

  const quantidadeParcelas = Math.max(
    1,
    Number(parcelas) || 1
  );

  const simulacao = useMemo(() => {
    if (
      valorNumerico <= 0 ||
      quantidadeParcelas <= 0
    ) {
      return {
        juros: 0,
        total: 0,
        parcela: 0,
        parcelas: [] as Parcela[],
      };
    }

    let totalJuros = 0;

    if (tipoJuros === "SIMPLE") {
      totalJuros =
        valorNumerico *
        (taxaNumerica / 100) *
        quantidadeParcelas;
    }

    if (tipoJuros === "COMPOUND") {
      totalJuros =
        valorNumerico *
          Math.pow(
            1 + taxaNumerica / 100,
            quantidadeParcelas
          ) -
        valorNumerico;
    }

    if (tipoJuros === "FIXED") {
      totalJuros =
        taxaNumerica * quantidadeParcelas;
    }

    const total = valorNumerico + totalJuros;
    const parcela = total / quantidadeParcelas;

    const lista: Parcela[] = [];

    let principalRestante = valorNumerico;

    const inicio = new Date(
      primeiroVencimentoData + "T00:00:00"
    );

    for (let i = 1; i <= quantidadeParcelas; i++) {
      const jurosParcela =
        totalJuros / quantidadeParcelas;

      const principalParcela =
        valorNumerico / quantidadeParcelas;

      const vencimento =
        i === 1
          ? new Date(inicio)
          : adicionarPeriodo(
              new Date(lista[i - 2].vencimento + "T00:00:00"),
              frequencia
            );

      principalRestante -= principalParcela;

      lista.push({
        numero: i,
        vencimento: dataISO(vencimento),
        valor: parcela,
        principal:
          i === quantidadeParcelas
            ? principalParcela +
              Math.max(0, principalRestante)
            : principalParcela,
        juros: jurosParcela,
      });
    }

    return {
      juros: totalJuros,
      total,
      parcela,
      parcelas: lista,
    };
  }, [
    valorNumerico,
    taxaNumerica,
    quantidadeParcelas,
    tipoJuros,
    frequencia,
    primeiroVencimentoData,
  ]);

  async function salvarEmprestimo() {
    setErro("");
    setSucesso("");

    if (!clienteId) {
      setErro("Selecione o cliente.");
      return;
    }

    if (valorNumerico <= 0) {
      setErro("Informe um valor de empréstimo válido.");
      return;
    }

    if (quantidadeParcelas <= 0) {
      setErro("Informe a quantidade de parcelas.");
      return;
    }

    if (!primeiroVencimentoData) {
      setErro("Informe o primeiro vencimento.");
      return;
    }

    setSalvando(true);

    try {
      const supabase = createClient();

      if (!supabase) {
        throw new Error(
          "Supabase não configurado."
        );
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: empresa, error: empresaError } =
        await supabase
          .from("company_users")
          .select("company_id")
          .eq("user_id", user.id)
          .eq("status", "ACTIVE")
          .limit(1)
          .maybeSingle();

      if (
        empresaError ||
        !empresa?.company_id
      ) {
        throw new Error(
          empresaError?.message ||
            "Empresa não encontrada."
        );
      }

      const { data: emprestimo, error: erroEmprestimo } =
        await supabase
          .from("loans")
          .insert({
            company_id: empresa.company_id,
            customer_id: clienteId,
            created_by: user.id,

            amount: valorNumerico,
            principal_amount: valorNumerico,

            interest_rate: taxaNumerica,
            interest_type: tipoJuros,

            term: quantidadeParcelas,
            frequency: frequencia,

            start_date: dataEmprestimo,
            first_due_date:
              primeiroVencimentoData,

            total_interest: simulacao.juros,
            total_amount: simulacao.total,
            installment_amount:
              simulacao.parcela,

            status: "ACTIVE",
            notes: observacoes || null,
          })
          .select("id")
          .single();

      if (erroEmprestimo || !emprestimo) {
        throw new Error(
          erroEmprestimo?.message ||
            "Não foi possível criar o empréstimo."
        );
      }

      const registros = simulacao.parcelas.map(
        (parcela) => ({
          loan_id: emprestimo.id,
          company_id: empresa.company_id,

          installment_number:
            parcela.numero,

          due_date: parcela.vencimento,

          principal_amount:
            parcela.principal,

          interest_amount:
            parcela.juros,

          amount: parcela.valor,

          paid_amount: 0,
          discount_amount: 0,
          late_fee_amount: 0,

          remaining_amount:
            parcela.valor,

          status: "PENDING",
        })
      );

      const { error: erroParcelas } =
        await supabase
          .from("loan_installments")
          .insert(registros);

      if (erroParcelas) {
        await supabase
          .from("loans")
          .update({
            status: "CANCELLED",
          })
          .eq("id", emprestimo.id);

        throw new Error(
          `Empréstimo criado, mas as parcelas não foram geradas: ${erroParcelas.message}`
        );
      }

      setSucesso(
        "Empréstimo criado com sucesso!"
      );

      setTimeout(() => {
        router.push("/emprestimos");
        router.refresh();
      }, 1000);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao criar empréstimo."
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <main className="container">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
          gap: 16,
        }}
      >
        <div>
          <button
            type="button"
            className="btn"
            onClick={() =>
              router.push("/emprestimos")
            }
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <ArrowLeft size={18} />
            Voltar para empréstimos
          </button>

          <h1 style={{ margin: 0 }}>
            Novo empréstimo
          </h1>

          <p
            className="muted"
            style={{ marginTop: 6 }}
          >
            Crie um novo contrato e gere
            automaticamente as parcelas.
          </p>
        </div>
      </div>

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
              width: 44,
              height: 44,
              borderRadius: 10,
              background: "#f1f5f9",
              display: "grid",
              placeItems: "center",
            }}
          >
            <User size={21} />
          </div>

          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 19,
              }}
            >
              Cliente
            </h2>

            <p
              className="muted"
              style={{ margin: 3 }}
            >
              Selecione quem receberá o empréstimo.
            </p>
          </div>
        </div>

        <label
          style={{
            display: "block",
            fontWeight: 600,
          }}
        >
          Cliente *

          <select
            className="input"
            value={clienteId}
            onChange={(e) =>
              setClienteId(e.target.value)
            }
            disabled={carregandoClientes}
            style={{
              marginTop: 7,
              width: "100%",
            }}
          >
            <option value="">
              {carregandoClientes
                ? "Carregando clientes..."
                : "Selecione o cliente"}
            </option>

            {clientes.map((cliente) => (
              <option
                key={cliente.id}
                value={cliente.id}
              >
                {cliente.full_name}
                {cliente.cpf
                  ? ` — ${cliente.cpf}`
                  : ""}
              </option>
            ))}
          </select>
        </label>
      </section>

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
              width: 44,
              height: 44,
              borderRadius: 10,
              background: "#f1f5f9",
              display: "grid",
              placeItems: "center",
            }}
          >
            <CircleDollarSign size={21} />
          </div>

          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 19,
              }}
            >
              Condições do empréstimo
            </h2>

            <p
              className="muted"
              style={{ margin: 3 }}
            >
              Defina valor, juros e quantidade de parcelas.
            </p>
          </div>
        </div>

        <div
          className="grid"
          style={{
            gridTemplateColumns:
              "repeat(3, 1fr)",
            gap: 18,
          }}
        >
          <Campo
            label="Valor emprestado"
            placeholder="Ex.: 1.000,00"
            value={valor}
            onChange={setValor}
          />

          <Campo
            label="Taxa de juros (%)"
            placeholder="Ex.: 1,8"
            value={taxa}
            onChange={setTaxa}
          />

          <Campo
            label="Quantidade de parcelas"
            type="number"
            placeholder="12"
            value={parcelas}
            onChange={setParcelas}
          />
        </div>

        <div
          className="grid"
          style={{
            gridTemplateColumns:
              "repeat(2, 1fr)",
            gap: 18,
            marginTop: 18,
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontWeight: 600,
                marginBottom: 7,
              }}
            >
              Tipo de juros
            </label>

            <select
              className="input"
              value={tipoJuros}
              onChange={(e) =>
                setTipoJuros(
                  e.target.value as
                    | "SIMPLE"
                    | "COMPOUND"
                    | "FIXED"
                )
              }
            >
              <option value="SIMPLE">
                Juros simples
              </option>

              <option value="COMPOUND">
                Juros compostos
              </option>

              <option value="FIXED">
                Juros fixos
              </option>
            </select>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontWeight: 600,
                marginBottom: 7,
              }}
            >
              Frequência das parcelas
            </label>

            <select
              className="input"
              value={frequencia}
              onChange={(e) =>
                setFrequencia(
                  e.target.value as Frequencia
                )
              }
            >
              <option value="DAILY">
                Diária
              </option>

              <option value="WEEKLY">
                Semanal
              </option>

              <option value="BIWEEKLY">
                Quinzenal
              </option>

              <option value="MONTHLY">
                Mensal
              </option>
            </select>
          </div>
        </div>
      </section>

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
              width: 44,
              height: 44,
              borderRadius: 10,
              background: "#f1f5f9",
              display: "grid",
              placeItems: "center",
            }}
          >
            <CalendarDays size={21} />
          </div>

          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 19,
              }}
            >
              Datas
            </h2>

            <p
              className="muted"
              style={{ margin: 3 }}
            >
              Defina quando o contrato começa e quando vence a primeira parcela.
            </p>
          </div>
        </div>

        <div
          className="grid"
          style={{
            gridTemplateColumns:
              "1fr 1fr",
            gap: 18,
          }}
        >
          <Campo
            label="Data do empréstimo"
            type="date"
            value={dataEmprestimo}
            onChange={setDataEmprestimo}
          />

          <Campo
            label="Primeiro vencimento"
            type="date"
            value={primeiroVencimentoData}
            onChange={setPrimeiroVencimentoData}
          />
        </div>
      </section>

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
              width: 44,
              height: 44,
              borderRadius: 10,
              background: "#f1f5f9",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Calculator size={21} />
          </div>

          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 19,
              }}
            >
              Simulação
            </h2>

            <p
              className="muted"
              style={{ margin: 3 }}
            >
              Confira os valores antes de criar o contrato.
            </p>
          </div>
        </div>

        <div
          className="grid"
          style={{
            gridTemplateColumns:
              "repeat(3, 1fr)",
            gap: 14,
            marginBottom: 22,
          }}
        >
          <Resumo
            titulo="Valor emprestado"
            valor={moeda(valorNumerico)}
          />

          <Resumo
            titulo="Total de juros"
            valor={moeda(simulacao.juros)}
          />

          <Resumo
            titulo="Total a receber"
            valor={moeda(simulacao.total)}
          />
        </div>

        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: 16,
              background: "#f8fafc",
              fontWeight: 700,
            }}
          >
            <FileText
              size={17}
              style={{
                verticalAlign: "middle",
                marginRight: 7,
              }}
            />
            Cronograma de parcelas
          </div>

          <div
            className="table-wrap"
            style={{
              maxHeight: 420,
              overflowY: "auto",
            }}
          >
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Vencimento</th>
                  <th>Principal</th>
                  <th>Juros</th>
                  <th>Valor</th>
                </tr>
              </thead>

              <tbody>
                {simulacao.parcelas.length ===
                0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="muted"
                      style={{
                        textAlign: "center",
                        padding: 30,
                      }}
                    >
                      Informe o valor para visualizar as parcelas.
                    </td>
                  </tr>
                ) : (
                  simulacao.parcelas.map(
                    (parcela) => (
                      <tr key={parcela.numero}>
                        <td>
                          {parcela.numero}
                        </td>

                        <td>
                          {dataBR(
                            parcela.vencimento
                          )}
                        </td>

                        <td>
                          {moeda(
                            parcela.principal
                          )}
                        </td>

                        <td>
                          {moeda(
                            parcela.juros
                          )}
                        </td>

                        <td
                          style={{
                            fontWeight: 700,
                          }}
                        >
                          {moeda(
                            parcela.valor
                          )}
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section
        className="card"
        style={{
          padding: 26,
          marginBottom: 18,
        }}
      >
        <label
          style={{
            display: "block",
            fontWeight: 600,
            marginBottom: 7,
          }}
        >
          Observações
        </label>

        <textarea
          className="input"
          rows={5}
          value={observacoes}
          onChange={(e) =>
            setObservacoes(e.target.value)
          }
          placeholder="Digite informações adicionais sobre este empréstimo..."
          style={{
            width: "100%",
            resize: "vertical",
          }}
        />
      </section>

      {erro && (
        <div
          style={{
            padding: 14,
            marginBottom: 16,
            borderRadius: 10,
            background: "#fef2f2",
            border:
              "1px solid #fecaca",
            color: "#b91c1c",
          }}
        >
          {erro}
        </div>
      )}

      {sucesso && (
        <div
          style={{
            padding: 14,
            marginBottom: 16,
            borderRadius: 10,
            background: "#f0fdf4",
            border:
              "1px solid #bbf7d0",
            color: "#15803d",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <CheckCircle2 size={18} />
          {sucesso}
        </div>
      )}

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
          onClick={() =>
            router.push("/emprestimos")
          }
          disabled={salvando}
        >
          Cancelar
        </button>

        <button
          type="button"
          className="btn btn-primary"
          onClick={salvarEmprestimo}
          disabled={salvando}
          style={{
            minWidth: 190,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {salvando ? (
            <>
              <Loader2 size={18} />
              Criando...
            </>
          ) : (
            <>
              <Save size={18} />
              Criar empréstimo
            </>
          )}
        </button>
      </div>
    </main>
  );
}

function Campo({
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
    <div>
      <label
        style={{
          display: "block",
          fontWeight: 600,
          marginBottom: 7,
        }}
      >
        {label}
      </label>

      <input
        className="input"
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) =>
          onChange(e.target.value)
        }
      />
    </div>
  );
}

function Resumo({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (
    <div
      style={{
        padding: 18,
        borderRadius: 12,
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
      }}
    >
      <div
        className="muted"
        style={{
          fontSize: 13,
          marginBottom: 7,
        }}
      >
        {titulo}
      </div>

      <div
        style={{
          fontSize: 21,
          fontWeight: 800,
        }}
      >
        {valor}
      </div>
    </div>
  );
}