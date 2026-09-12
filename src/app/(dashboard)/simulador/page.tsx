"use client";

import { useMemo, useState } from "react";
import {
  calculateLoan,
  buildInstallments,
} from "@/lib/calculations/loan-calculator";
import { money } from "@/lib/utils/format-currency";
import { PageTitle } from "@/components/ui/PageTitle";
import {
  Calculator,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Percent,
  RefreshCw,
  TrendingUp,
  Wallet,
} from "lucide-react";

type LoanType = "simple" | "compound" | "fixed";
type Frequency = "monthly" | "weekly" | "biweekly";

function formatDate(date: Date) {
  return date.toLocaleDateString("pt-BR");
}

function addFrequency(date: Date, frequency: Frequency, index: number) {
  const result = new Date(date);

  if (frequency === "weekly") {
    result.setDate(result.getDate() + index * 7);
  } else if (frequency === "biweekly") {
    result.setDate(result.getDate() + index * 14);
  } else {
    result.setMonth(result.getMonth() + index);
  }

  return result;
}

export default function Simulador() {
  const [principal, setPrincipal] = useState(1000);
  const [rate, setRate] = useState(5);
  const [term, setTerm] = useState(12);
  const [type, setType] = useState<LoanType>("simple");
  const [frequency, setFrequency] =
    useState<Frequency>("monthly");

  const result = useMemo(() => {
    return calculateLoan({
      principal,
      rate,
      term,
      type,
    });
  }, [principal, rate, term, type]);

  const startDate = useMemo(() => new Date(), []);

  const installments = useMemo(() => {
    return Array.from({ length: Math.max(term, 0) }, (_, index) => {
      const baseInstallments = buildInstallments(
        result.total,
        term,
        startDate
      );

      const original = baseInstallments[index];

      return {
        number: index + 1,
        amount: original?.amount ?? result.installment,
        dueDate: addFrequency(
          startDate,
          frequency,
          index + 1
        ),
      };
    });
  }, [
    result.total,
    result.installment,
    term,
    startDate,
    frequency,
  ]);

  const totalInterestPercent =
    principal > 0
      ? (result.interest / principal) * 100
      : 0;

  function resetSimulator() {
    setPrincipal(1000);
    setRate(5);
    setTerm(12);
    setType("simple");
    setFrequency("monthly");
  }

  return (
    <main className="container">
      <PageTitle
        title="Simulador de empréstimos"
        description="Calcule rapidamente as condições do empréstimo antes de cadastrá-lo."
      />

      {/* HERO */}
      <div
        style={{
          marginTop: 18,
          padding: "24px",
          borderRadius: 18,
          background:
            "linear-gradient(135deg, #111827 0%, #1f2937 55%, #374151 100%)",
          color: "#fff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 20,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "rgba(255,255,255,.12)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Calculator size={21} />
            </div>

            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: ".08em",
                textTransform: "uppercase",
                opacity: 0.75,
              }}
            >
              Simulação financeira
            </span>
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: 25,
              lineHeight: 1.2,
            }}
          >
            Simule antes de fechar o empréstimo
          </h2>

          <p
            style={{
              margin: "8px 0 0",
              color: "rgba(255,255,255,.68)",
              maxWidth: 650,
            }}
          >
            Ajuste valor, juros, prazo e frequência para
            visualizar imediatamente quanto o cliente pagará.
          </p>
        </div>

        <button
          type="button"
          onClick={resetSimulator}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            border: "1px solid rgba(255,255,255,.18)",
            background: "rgba(255,255,255,.08)",
            color: "#fff",
            borderRadius: 10,
            padding: "10px 14px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          <RefreshCw size={16} />
          Restaurar
        </button>
      </div>

      {/* RESUMO */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 14,
          marginTop: 18,
        }}
      >
        <SummaryCard
          icon={<Wallet size={19} />}
          label="Valor solicitado"
          value={money(principal)}
          description="Principal do empréstimo"
        />

        <SummaryCard
          icon={<Percent size={19} />}
          label="Total de juros"
          value={money(result.interest)}
          description={`${totalInterestPercent.toFixed(1)}% sobre o principal`}
        />

        <SummaryCard
          icon={<CircleDollarSign size={19} />}
          label="Total a pagar"
          value={money(result.total)}
          description="Principal + juros"
          highlight
        />

        <SummaryCard
          icon={<CreditCard size={19} />}
          label="Valor da parcela"
          value={money(result.installment)}
          description={`${term} parcelas`}
        />
      </div>

      {/* ÁREA PRINCIPAL */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(300px, 420px) minmax(0, 1fr)",
          gap: 18,
          marginTop: 18,
          alignItems: "start",
        }}
      >
        {/* CONFIGURAÇÃO */}
        <section
          className="card"
          style={{
            padding: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 22,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "#f3f4f6",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Calculator size={19} />
            </div>

            <div>
              <h3 style={{ margin: 0 }}>
                Condições do empréstimo
              </h3>

              <p
                className="muted"
                style={{
                  margin: "3px 0 0",
                  fontSize: 13,
                }}
              >
                Informe os parâmetros da simulação
              </p>
            </div>
          </div>

          <Field
            label="Valor do empréstimo"
            icon={<CircleDollarSign size={16} />}
          >
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={principal}
              onChange={(e) =>
                setPrincipal(Number(e.target.value))
              }
            />
          </Field>

          <Field
            label="Taxa de juros"
            icon={<Percent size={16} />}
            suffix="%"
          >
            <input
              className="input"
              type="number"
              min="0"
              step="0.1"
              value={rate}
              onChange={(e) =>
                setRate(Number(e.target.value))
              }
            />
          </Field>

          <Field
            label="Quantidade de parcelas"
            icon={<CreditCard size={16} />}
          >
            <input
              className="input"
              type="number"
              min="1"
              step="1"
              value={term}
              onChange={(e) =>
                setTerm(
                  Math.max(
                    1,
                    Number(e.target.value) || 1
                  )
                )
              }
            />
          </Field>

          <Field
            label="Frequência"
            icon={<CalendarDays size={16} />}
          >
            <select
              className="input"
              value={frequency}
              onChange={(e) =>
                setFrequency(
                  e.target.value as Frequency
                )
              }
            >
              <option value="monthly">Mensal</option>
              <option value="weekly">Semanal</option>
              <option value="biweekly">
                Quinzenal
              </option>
            </select>
          </Field>

          <Field
            label="Tipo de juros"
            icon={<TrendingUp size={16} />}
          >
            <select
              className="input"
              value={type}
              onChange={(e) =>
                setType(
                  e.target.value as LoanType
                )
              }
            >
              <option value="simple">
                Juros simples
              </option>

              <option value="compound">
                Juros compostos
              </option>

              <option value="fixed">
                Taxa fixa
              </option>
            </select>
          </Field>

          <div
            style={{
              marginTop: 20,
              padding: 15,
              borderRadius: 12,
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <span className="muted">
                Início
              </span>

              <strong>
                {formatDate(startDate)}
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span className="muted">
                Primeira parcela
              </span>

              <strong>
                {installments[0]
                  ? formatDate(
                      installments[0].dueDate
                    )
                  : "—"}
              </strong>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            style={{
              width: "100%",
              marginTop: 18,
              minHeight: 46,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            Criar empréstimo
            <ChevronRight size={17} />
          </button>
        </section>

        {/* RESULTADO */}
        <section
          className="card"
          style={{
            padding: 24,
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 18,
            }}
          >
            <div>
              <h3 style={{ margin: 0 }}>
                Resultado da simulação
              </h3>

              <p
                className="muted"
                style={{
                  margin: "4px 0 0",
                  fontSize: 13,
                }}
              >
                Confira como ficará o pagamento
              </p>
            </div>

            <span
              style={{
                padding: "7px 11px",
                borderRadius: 999,
                background: "#f3f4f6",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {type === "simple"
                ? "Juros simples"
                : type === "compound"
                ? "Juros compostos"
                : "Taxa fixa"}
            </span>
          </div>

          {/* DESTAQUE */}
          <div
            style={{
              padding: 22,
              borderRadius: 16,
              background:
                "linear-gradient(135deg, #f9fafb, #f3f4f6)",
              border: "1px solid #e5e7eb",
              marginBottom: 18,
            }}
          >
            <span
              className="muted"
              style={{
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Total do contrato
            </span>

            <div
              style={{
                fontSize: 34,
                fontWeight: 800,
                marginTop: 4,
                letterSpacing: "-.03em",
              }}
            >
              {money(result.total)}
            </div>

            <div
              style={{
                display: "flex",
                gap: 20,
                flexWrap: "wrap",
                marginTop: 10,
                fontSize: 14,
              }}
            >
              <span>
                Principal:{" "}
                <strong>
                  {money(principal)}
                </strong>
              </span>

              <span>
                Juros:{" "}
                <strong>
                  {money(result.interest)}
                </strong>
              </span>
            </div>
          </div>

          {/* MINI CARDS */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 10,
              marginBottom: 22,
            }}
          >
            <MiniResult
              label="Parcela"
              value={money(result.installment)}
            />

            <MiniResult
              label="Parcelas"
              value={String(term)}
            />

            <MiniResult
              label="Frequência"
              value={
                frequency === "monthly"
                  ? "Mensal"
                  : frequency === "weekly"
                  ? "Semanal"
                  : "Quinzenal"
              }
            />

            <MiniResult
              label="Taxa"
              value={`${rate}%`}
            />
          </div>

          {/* TABELA */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <div>
              <h3 style={{ margin: 0 }}>
                Cronograma de parcelas
              </h3>

              <p
                className="muted"
                style={{
                  margin: "3px 0 0",
                  fontSize: 12,
                }}
              >
                {term} parcelas previstas
              </p>
            </div>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Vencimento</th>
                  <th>Valor</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {installments.map((item) => (
                  <tr key={item.number}>
                    <td>
                      <strong>
                        {String(item.number).padStart(
                          2,
                          "0"
                        )}
                      </strong>
                    </td>

                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                        }}
                      >
                        <CalendarDays
                          size={15}
                          className="muted"
                        />

                        {formatDate(item.dueDate)}
                      </div>
                    </td>

                    <td>
                      <strong>
                        {money(item.amount)}
                      </strong>
                    </td>

                    <td>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding:
                            "5px 9px",
                          borderRadius: 999,
                          background:
                            "#f3f4f6",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        Prevista
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* RODAPÉ INFORMATIVO */}
      <div
        className="card"
        style={{
          marginTop: 18,
          padding: 18,
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 9,
            background: "#f3f4f6",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <TrendingUp size={17} />
        </div>

        <div>
          <strong>
            Simulação informativa
          </strong>

          <p
            className="muted"
            style={{
              margin: "4px 0 0",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            Os valores apresentados são calculados
            com base nas condições informadas acima.
            Antes de registrar o contrato, confira
            taxa, prazo, frequência e valor das parcelas.
          </p>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 850px) {
          .container > div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 600px) {
          .container {
            padding-left: 12px;
            padding-right: 12px;
          }

          input,
          select {
            font-size: 16px;
          }
        }
      `}</style>
    </main>
  );
}

function Field({
  label,
  icon,
  children,
  suffix,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  suffix?: string;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          fontSize: 13,
          fontWeight: 700,
          marginBottom: 7,
        }}
      >
        {icon}
        {label}
      </label>

      <div style={{ position: "relative" }}>
        {children}

        {suffix && (
          <span
            style={{
              position: "absolute",
              right: 13,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 13,
              fontWeight: 700,
              color: "#6b7280",
              pointerEvents: "none",
            }}
          >
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  description,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  description: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="card"
      style={{
        padding: 18,
        border: highlight
          ? "1px solid #d1d5db"
          : undefined,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 13,
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 9,
            background: "#f3f4f6",
            display: "grid",
            placeItems: "center",
          }}
        >
          {icon}
        </div>

        <span
          className="muted"
          style={{
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {label}
        </span>
      </div>

      <div
        style={{
          fontSize: 21,
          fontWeight: 800,
          letterSpacing: "-.02em",
        }}
      >
        {value}
      </div>

      <div
        className="muted"
        style={{
          marginTop: 5,
          fontSize: 12,
        }}
      >
        {description}
      </div>
    </div>
  );
}

function MiniResult({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding: 13,
        border: "1px solid #e5e7eb",
        borderRadius: 11,
      }}
    >
      <div
        className="muted"
        style={{
          fontSize: 11,
          marginBottom: 4,
        }}
      >
        {label}
      </div>

      <strong>{value}</strong>
    </div>
  );
}