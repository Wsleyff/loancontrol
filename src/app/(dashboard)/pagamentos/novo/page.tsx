"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  DollarSign,
  FileText,
  Loader2,
  User,
  Wallet,
  AlertTriangle,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/utils/format-currency";

type Parcela = {
  id: string;
  loan_id: string;
  company_id: string;
  installment_number: number;
  due_date: string;
  principal_amount: number;
  interest_amount: number;
  amount: number;
  paid_amount: number;
  discount_amount: number;
  late_fee_amount: number;
  remaining_amount: number;
  status: string;
  paid_at?: string | null;
};

type Emprestimo = {
  id: string;
  customer_id: string;
  amount: number;
  total_amount: number;
  installment_amount: number;
  status: string;
  customers?:
    | {
        full_name: string;
        cpf?: string | null;
        phone?: string | null;
      }
    | null;
};

function formatDate(value?: string | null) {
  if (!value) return "-";

  const [year, month, day] = value.split("-");

  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

function numero(value: string) {
  if (!value) return 0;

  const texto = value
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const n = Number(texto);

  return Number.isFinite(n) ? n : 0;
}

function estaVencida(data: string) {
  const hoje = new Date();

  hoje.setHours(0, 0, 0, 0);

  const vencimento = new Date(`${data}T00:00:00`);

  return vencimento < hoje;
}

export default function NovoPagamento() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const installmentId = searchParams.get("installment");

  const [parcela, setParcela] = useState<Parcela | null>(null);

  const [emprestimo, setEmprestimo] =
    useState<Emprestimo | null>(null);

  const [valor, setValor] = useState("");

  const [desconto, setDesconto] =
    useState("0");

  const [multa, setMulta] =
    useState("0");

  const [metodo, setMetodo] =
    useState("PIX");

  const [observacao, setObservacao] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [salvando, setSalvando] =
    useState(false);

  const [erro, setErro] =
    useState("");

  const [sucesso, setSucesso] =
    useState("");

  async function carregar() {
    setLoading(true);
    setErro("");

    if (!installmentId) {
      setErro(
        "Nenhuma parcela foi informada."
      );
      setLoading(false);
      return;
    }

    const supabase = createClient();

    if (!supabase) {
      setErro(
        "Supabase não configurado."
      );
      setLoading(false);
      return;
    }

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        router.replace("/login");
        return;
      }

      const {
        data: membership,
        error: membershipError,
      } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", user.id)
        .eq("status", "ACTIVE")
        .limit(1)
        .maybeSingle();

      if (membershipError) {
        throw membershipError;
      }

      if (!membership) {
        throw new Error(
          "Seu usuário não está vinculado a uma empresa."
        );
      }

      const {
        data: parcelaData,
        error: parcelaError,
      } = await supabase
        .from("loan_installments")
        .select("*")
        .eq("id", installmentId)
        .eq(
          "company_id",
          membership.company_id
        )
        .maybeSingle();

      if (parcelaError) {
        throw parcelaError;
      }

      if (!parcelaData) {
        throw new Error(
          "Parcela não encontrada."
        );
      }

      const {
        data: loanData,
        error: loanError,
      } = await supabase
        .from("loans")
        .select(`
          id,
          customer_id,
          amount,
          total_amount,
          installment_amount,
          status,
          customers (
            full_name,
            cpf,
            phone
          )
        `)
        .eq("id", parcelaData.loan_id)
        .eq(
          "company_id",
          membership.company_id
        )
        .maybeSingle();

      if (loanError) {
        throw loanError;
      }

      if (!loanData) {
        throw new Error(
          "Empréstimo não encontrado."
        );
      }

      setParcela(
        parcelaData as Parcela
      );

      setEmprestimo(
        loanData as unknown as Emprestimo
      );

      const restante =
        Number(
          parcelaData.remaining_amount
        ) || 0;

      setValor(
        restante.toFixed(2)
      );
    } catch (err: any) {
      setErro(
        err?.message ||
          "Não foi possível carregar a parcela."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, [installmentId]);

  const calculos = useMemo(() => {
    const valorPago = numero(valor);

    const valorDesconto =
      numero(desconto);

    const valorMulta =
      numero(multa);

    const restanteAtual =
      Number(
        parcela?.remaining_amount || 0
      );

    /*
     * O valor recebido é o dinheiro efetivamente
     * pago pelo cliente.
     */
    const valorRecebido = valorPago;

    /*
     * O novo saldo considera:
     *
     * saldo atual
     * + multa
     * - desconto
     * - pagamento
     */
    const saldoDepois = Math.max(
      0,
      restanteAtual +
        valorMulta -
        valorDesconto -
        valorRecebido
    );

    return {
      valorPago,
      valorDesconto,
      valorMulta,
      valorRecebido,
      saldoDepois,
      restanteAtual,
    };
  }, [
    valor,
    desconto,
    multa,
    parcela,
  ]);

  function voltar() {
    if (emprestimo?.id) {
      router.push(
        `/emprestimos/${emprestimo.id}`
      );
    } else {
      router.back();
    }
  }

  async function registrarPagamento() {
    setErro("");
    setSucesso("");

    if (!parcela) {
      setErro(
        "Parcela não carregada."
      );
      return;
    }

    const valorPago =
      calculos.valorPago;

    const valorDesconto =
      calculos.valorDesconto;

    const valorMulta =
      calculos.valorMulta;

    if (valorPago <= 0) {
      setErro(
        "Informe um valor de pagamento maior que zero."
      );
      return;
    }

    if (valorDesconto < 0) {
      setErro(
        "O desconto não pode ser negativo."
      );
      return;
    }

    if (valorMulta < 0) {
      setErro(
        "A multa não pode ser negativa."
      );
      return;
    }

    /*
     * A RPC atual do banco aceita pagamento,
     * forma de pagamento e observação.
     *
     * Desconto e multa serão integrados na próxima
     * etapa, quando a função do banco for ampliada
     * para esses campos.
     */
    if (
      valorDesconto > 0 ||
      valorMulta > 0
    ) {
      setErro(
        "Nesta etapa, registre o pagamento sem desconto ou multa. Esses dois campos serão integrados ao banco na próxima etapa."
      );
      return;
    }

    /*
     * O limite considera o saldo atual.
     */
    const valorMaximo =
      calculos.restanteAtual;

    if (valorMaximo <= 0) {
      setErro(
        "Esta parcela não possui saldo pendente."
      );
      return;
    }

    if (valorPago > valorMaximo) {
      setErro(
        `O pagamento não pode ser maior que o saldo da parcela (${money(
          valorMaximo
        )}).`
      );
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

      /*
       * Confirma autenticação.
       */
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        router.replace("/login");
        return;
      }

      /*
       * Antes de registrar, busca novamente
       * a parcela para evitar pagar com um
       * saldo desatualizado.
       */
      const {
        data: parcelaAtual,
        error: parcelaError,
      } = await supabase
        .from("loan_installments")
        .select("*")
        .eq("id", parcela.id)
        .single();

      if (parcelaError) {
        throw parcelaError;
      }

      if (!parcelaAtual) {
        throw new Error(
          "Parcela não encontrada."
        );
      }

      const saldoAtual =
        Number(
          parcelaAtual.remaining_amount
        ) || 0;

      if (saldoAtual <= 0) {
        throw new Error(
          "Esta parcela já está quitada."
        );
      }

      /*
       * Calculamos novamente o limite
       * utilizando o valor real do banco.
       */
      if (valorPago > saldoAtual) {
        throw new Error(
          `O saldo da parcela mudou. O valor máximo permitido agora é ${money(
            saldoAtual
          )}. Atualize a página e tente novamente.`
        );
      }

      /*
       * Chama a função transacional que realmente existe
       * no Supabase:
       *
       * public.register_payment
       *
       * Assinatura real:
       *
       * register_payment(
       *   p_installment uuid,
       *   p_amount numeric,
       *   p_method text,
       *   p_notes text
       * )
       *
       * A função retorna o UUID do pagamento criado.
       */
      const {
        data: paymentId,
        error,
      } = await supabase.rpc(
        "register_payment",
        {
          p_installment:
            parcela.id,

          p_amount:
            valorPago,

          p_method:
            metodo,

          p_notes:
            observacao.trim() || null,
        }
      );

      if (error) {
        throw new Error(
          error.message
        );
      }

      if (!paymentId) {
        throw new Error(
          "O banco não retornou o pagamento criado."
        );
      }

      /*
       * A RPC retorna somente o ID do pagamento.
       *
       * Então buscamos a parcela novamente
       * para obter o saldo e o status reais
       * gravados no banco.
       */
      const {
        data: parcelaDepois,
        error: parcelaDepoisError,
      } = await supabase
        .from("loan_installments")
        .select("*")
        .eq("id", parcela.id)
        .single();

      if (parcelaDepoisError) {
        throw new Error(
          parcelaDepoisError.message
        );
      }

      if (!parcelaDepois) {
        throw new Error(
          "Pagamento registrado, mas não foi possível atualizar a tela."
        );
      }

      setParcela(
        parcelaDepois as Parcela
      );

      setSucesso(
        parcelaDepois.status === "PAID"
          ? "Pagamento registrado! A parcela foi quitada com sucesso."
          : "Pagamento registrado! A parcela foi atualizada com sucesso."
      );

      /*
       * Depois de 1,2 segundos,
       * volta para o empréstimo.
       */
      setTimeout(() => {
        if (emprestimo?.id) {
          router.push(
            `/emprestimos/${emprestimo.id}`
          );
        } else {
          router.push(
            "/emprestimos"
          );
        }
      }, 1200);
    } catch (err: any) {
      console.error(
        "Erro ao registrar pagamento:",
        err
      );

      setErro(
        err?.message ||
          "Não foi possível registrar o pagamento."
      );
    } finally {
      setSalvando(false);
    }
  }

  if (loading) {
    return (
      <main className="container">
        <div
          className="card"
          style={{
            padding: 40,
            textAlign: "center",
          }}
        >
          <Loader2
            size={28}
            style={{
              margin:
                "0 auto 10px",
            }}
            className="animate-spin"
          />

          Carregando parcela...
        </div>
      </main>
    );
  }

  if (erro && !parcela) {
    return (
      <main className="container">
        <button
          className="btn"
          onClick={voltar}
          style={{
            marginBottom: 18,
          }}
        >
          <ArrowLeft size={17} />
          Voltar
        </button>

        <div
          className="card"
          style={{
            padding: 30,
          }}
        >
          <h2>
            Não foi possível carregar
          </h2>

          <p className="muted">
            {erro}
          </p>
        </div>
      </main>
    );
  }

  if (!parcela) {
    return null;
  }

  const cliente =
    emprestimo?.customers;

  const vencida = estaVencida(
    parcela.due_date
  );

  return (
    <main className="container">
      <style jsx>{`
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 22px;
        }

        .back {
          border: 0;
          background: transparent;
          padding: 0;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-weight: 700;
          cursor: pointer;
          margin-bottom: 10px;
        }

        .title {
          margin: 0;
          font-size: 28px;
        }

        .subtitle {
          margin-top: 6px;
        }

        .layout {
          display: grid;
          grid-template-columns: 1.4fr 0.8fr;
          gap: 18px;
          align-items: start;
        }

        .card-content {
          padding: 24px;
        }

        .section-title {
          margin: 0 0 18px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 18px;
        }

        .customer {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 15px;
          border-radius: 12px;
          background: #f8fafc;
          margin-bottom: 22px;
        }

        .avatar {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: #e0e7ff;
          color: #3730a3;
        }

        .customer-name {
          font-size: 17px;
          font-weight: 800;
        }

        .customer-info {
          margin-top: 4px;
          color: #64748b;
          font-size: 13px;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .label {
          display: block;
          font-size: 12px;
          font-weight: 700;
          color: #64748b;
          margin-bottom: 6px;
        }

        .value {
          font-size: 17px;
          font-weight: 800;
        }

        .field {
          margin-bottom: 17px;
        }

        .field input,
        .field select,
        .field textarea {
          width: 100%;
        }

        .methods {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 9px;
        }

        .method {
          border: 1px solid #cbd5e1;
          background: white;
          border-radius: 10px;
          padding: 12px;
          cursor: pointer;
          font-weight: 700;
          transition: 0.15s;
        }

        .method:hover {
          border-color: #94a3b8;
        }

        .method-active {
          border-color: #2563eb;
          background: #eff6ff;
          color: #1d4ed8;
        }

        .danger-box {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 12px;
          border-radius: 10px;
          background: #fef2f2;
          color: #991b1b;
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 18px;
        }

        .summary {
          position: sticky;
          top: 20px;
        }

        .summary-line {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          padding: 11px 0;
          border-bottom: 1px solid #e2e8f0;
        }

        .summary-line:last-child {
          border-bottom: 0;
        }

        .total {
          margin-top: 15px;
          padding: 18px;
          border-radius: 12px;
          background: #f8fafc;
        }

        .total-label {
          color: #64748b;
          font-size: 13px;
          font-weight: 700;
        }

        .total-value {
          margin-top: 5px;
          font-size: 30px;
          font-weight: 900;
        }

        .success {
          padding: 13px;
          margin-bottom: 16px;
          border-radius: 10px;
          background: #dcfce7;
          color: #166534;
          font-weight: 700;
          line-height: 1.5;
        }

        .error {
          padding: 13px;
          margin-bottom: 16px;
          border-radius: 10px;
          background: #fee2e2;
          color: #991b1b;
          font-weight: 700;
          line-height: 1.5;
        }

        .security {
          margin-top: 14px;
          padding: 11px;
          border-radius: 10px;
          background: #f8fafc;
          color: #64748b;
          font-size: 12px;
          line-height: 1.5;
        }

        @media (max-width: 850px) {
          .layout {
            grid-template-columns: 1fr;
          }

          .summary {
            position: static;
          }
        }

        @media (max-width: 600px) {
          .header {
            flex-direction: column;
          }

          .info-grid {
            grid-template-columns: 1fr;
          }

          .methods {
            grid-template-columns: 1fr;
          }

          .title {
            font-size: 23px;
          }
        }
      `}</style>

      <div className="header">
        <div>
          <button
            className="back"
            onClick={voltar}
          >
            <ArrowLeft size={17} />
            Voltar para o empréstimo
          </button>

          <h1 className="title">
            Registrar pagamento
          </h1>

          <p className="subtitle muted">
            Registre o recebimento da parcela
            com segurança.
          </p>
        </div>
      </div>

      <div className="layout">
        <div>
          <div
            className="card card-content"
            style={{
              marginBottom: 18,
            }}
          >
            <h2 className="section-title">
              <User size={19} />
              Cliente
            </h2>

            <div className="customer">
              <div className="avatar">
                <User size={21} />
              </div>

              <div>
                <div className="customer-name">
                  {cliente?.full_name ||
                    "Cliente"}
                </div>

                {cliente?.cpf && (
                  <div className="customer-info">
                    CPF: {cliente.cpf}
                  </div>
                )}

                {cliente?.phone && (
                  <div className="customer-info">
                    Telefone:{" "}
                    {cliente.phone}
                  </div>
                )}
              </div>
            </div>

            <h2 className="section-title">
              <FileText size={19} />
              Parcela
            </h2>

            {vencida && (
              <div className="danger-box">
                <AlertTriangle
                  size={18}
                />

                Esta parcela está vencida.
              </div>
            )}

            <div className="info-grid">
              <div>
                <div className="label">
                  Parcela
                </div>

                <div className="value">
                  #
                  {String(
                    parcela.installment_number
                  ).padStart(2, "0")}
                </div>
              </div>

              <div>
                <div className="label">
                  Vencimento
                </div>

                <div className="value">
                  {formatDate(
                    parcela.due_date
                  )}
                </div>
              </div>

              <div>
                <div className="label">
                  Valor original
                </div>

                <div className="value">
                  {money(
                    parcela.amount
                  )}
                </div>
              </div>

              <div>
                <div className="label">
                  Já pago
                </div>

                <div className="value">
                  {money(
                    parcela.paid_amount
                  )}
                </div>
              </div>

              <div>
                <div className="label">
                  Saldo da parcela
                </div>

                <div className="value">
                  {money(
                    calculos.restanteAtual
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="card card-content">
            <h2 className="section-title">
              <DollarSign size={19} />
              Dados do recebimento
            </h2>

            <div className="field">
              <label className="label">
                Valor do pagamento
              </label>

              <input
                className="input"
                type="text"
                inputMode="decimal"
                value={valor}
                onChange={(e) =>
                  setValor(
                    e.target.value
                  )
                }
                placeholder="0,00"
                disabled={salvando}
              />
            </div>

            <div className="info-grid">
              <div className="field">
                <label className="label">
                  Desconto
                </label>

                <input
                  className="input"
                  type="text"
                  inputMode="decimal"
                  value={desconto}
                  onChange={(e) =>
                    setDesconto(
                      e.target.value
                    )
                  }
                  placeholder="0,00"
                  disabled={salvando}
                />
              </div>

              <div className="field">
                <label className="label">
                  Multa / encargos
                </label>

                <input
                  className="input"
                  type="text"
                  inputMode="decimal"
                  value={multa}
                  onChange={(e) =>
                    setMulta(
                      e.target.value
                    )
                  }
                  placeholder="0,00"
                  disabled={salvando}
                />
              </div>
            </div>

            <div className="field">
              <label className="label">
                Forma de pagamento
              </label>

              <div className="methods">
                {[
                  ["PIX", "PIX"],
                  [
                    "CASH",
                    "Dinheiro",
                  ],
                  [
                    "DEBIT_CARD",
                    "Débito",
                  ],
                  [
                    "CREDIT_CARD",
                    "Crédito",
                  ],
                  [
                    "TRANSFER",
                    "Transferência",
                  ],
                  [
                    "OTHER",
                    "Outro",
                  ],
                ].map(
                  ([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={`method ${
                        metodo === value
                          ? "method-active"
                          : ""
                      }`}
                      onClick={() =>
                        setMetodo(
                          value
                        )
                      }
                      disabled={
                        salvando
                      }
                    >
                      {label}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="field">
              <label className="label">
                Observação
              </label>

              <textarea
                className="input"
                rows={4}
                value={observacao}
                onChange={(e) =>
                  setObservacao(
                    e.target.value
                  )
                }
                placeholder="Ex.: pagamento recebido via PIX..."
                disabled={salvando}
              />
            </div>
          </div>
        </div>

        <aside className="card card-content summary">
          <h2 className="section-title">
            <Wallet size={19} />
            Resumo
          </h2>

          <div className="summary-line">
            <span>
              Saldo da parcela
            </span>

            <strong>
              {money(
                calculos.restanteAtual
              )}
            </strong>
          </div>

          <div className="summary-line">
            <span>
              Pagamento
            </span>

            <strong>
              {money(
                calculos.valorPago
              )}
            </strong>
          </div>

          <div className="summary-line">
            <span>
              Desconto
            </span>

            <strong>
              {money(
                calculos.valorDesconto
              )}
            </strong>
          </div>

          <div className="summary-line">
            <span>
              Multa / encargos
            </span>

            <strong>
              {money(
                calculos.valorMulta
              )}
            </strong>
          </div>

          <div className="total">
            <div className="total-label">
              Valor recebido
            </div>

            <div className="total-value">
              {money(
                calculos.valorRecebido
              )}
            </div>
          </div>

          <div
            className="summary-line"
            style={{
              marginTop: 10,
            }}
          >
            <span>
              Saldo após pagamento
            </span>

            <strong>
              {money(
                calculos.saldoDepois
              )}
            </strong>
          </div>

          {sucesso && (
            <div
              className="success"
              style={{
                marginTop: 18,
              }}
            >
              <CheckCircle2
                size={17}
                style={{
                  verticalAlign:
                    "middle",
                  marginRight: 6,
                }}
              />

              {sucesso}
            </div>
          )}

          {erro && (
            <div
              className="error"
              style={{
                marginTop: 18,
              }}
            >
              {erro}
            </div>
          )}

          <button
            className="btn btn-primary"
            style={{
              width: "100%",
              marginTop: 18,
              minHeight: 48,
            }}
            disabled={
              salvando ||
              calculos.valorPago <= 0
            }
            onClick={
              registrarPagamento
            }
          >
            {salvando ? (
              <>
                <Loader2
                  size={17}
                  className="animate-spin"
                />

                Registrando pagamento...
              </>
            ) : (
              <>
                <CreditCard
                  size={17}
                />

                Confirmar pagamento
              </>
            )}
          </button>

          <button
            className="btn"
            style={{
              width: "100%",
              marginTop: 9,
            }}
            onClick={voltar}
            disabled={salvando}
          >
            Cancelar
          </button>

          <div className="security">
            🔒 O pagamento será registrado
            de forma transacional no banco
            de dados, atualizando a parcela
            e o caixa.
          </div>
        </aside>
      </div>
    </main>
  );
}