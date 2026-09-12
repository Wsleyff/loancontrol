"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, Loader2 } from "lucide-react";

import MasterShell from "@/components/MasterShell";

export default function MasterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    async function checkMaster() {
      try {
        const response = await fetch(
          "/api/master/status",
          {
            cache: "no-store",
            headers: {
              "Cache-Control": "no-cache",
            },
          }
        );

        const data = await response
          .json()
          .catch(() => ({}));

        console.log(
          "[MASTER] Status:",
          data
        );

        if (
          response.ok &&
          data?.isMaster === true
        ) {
          setAllowed(true);
        } else {
          setAllowed(false);
        }
      } catch (error) {
        console.error(
          "[MASTER] Erro:",
          error
        );

        setAllowed(false);
      } finally {
        setLoading(false);
      }
    }

    checkMaster();
  }, []);

  if (loading) {
    return (
      <div className="master-loading">
        <div className="loading-card">
          <div className="loading-icon">
            <Loader2
              size={26}
              className="loading-spin"
            />
          </div>

          <strong>
            Verificando acesso
          </strong>

          <span>
            Preparando o painel Master...
          </span>
        </div>

        <style jsx>{`
          .master-loading {
            min-height: 100vh;

            display: flex;
            align-items: center;
            justify-content: center;

            background:
              radial-gradient(
                circle at 50% 20%,
                #eaf2ff,
                transparent 40%
              ),
              #f5f7fb;
          }

          .loading-card {
            width: 280px;

            display: flex;
            flex-direction: column;
            align-items: center;

            padding: 32px;

            border: 1px solid #e2e8f0;

            border-radius: 18px;

            background: white;

            box-shadow:
              0 20px 50px
              rgba(15, 23, 42, 0.08);
          }

          .loading-icon {
            width: 54px;
            height: 54px;

            display: flex;
            align-items: center;
            justify-content: center;

            margin-bottom: 15px;

            border-radius: 14px;

            color: #2563eb;

            background: #eff6ff;
          }

          .loading-card strong {
            color: #172033;

            font-size: 14px;
          }

          .loading-card span {
            margin-top: 6px;

            color: #64748b;

            font-size: 10px;
          }

          .loading-spin {
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="master-denied">
        <div className="denied-card">
          <div className="denied-icon">
            <ShieldAlert size={30} />
          </div>

          <div className="denied-label">
            LOANCONTROL
          </div>

          <h1>
            Acesso restrito
          </h1>

          <p>
            Esta área é exclusiva para o
            administrador Master da plataforma.
          </p>

          <a href="/dashboard">
            Voltar para o painel
          </a>
        </div>

        <style jsx>{`
          .master-denied {
            min-height: 100vh;

            display: flex;
            align-items: center;
            justify-content: center;

            padding: 25px;

            background:
              radial-gradient(
                circle at 50% 15%,
                #eaf2ff,
                transparent 42%
              ),
              #f5f7fb;
          }

          .denied-card {
            width: 100%;
            max-width: 420px;

            padding: 42px;

            text-align: center;

            border: 1px solid #e1e7ef;

            border-radius: 20px;

            background: white;

            box-shadow:
              0 25px 70px
              rgba(15, 23, 42, 0.1);
          }

          .denied-icon {
            width: 64px;
            height: 64px;

            margin: 0 auto 18px;

            display: flex;
            align-items: center;
            justify-content: center;

            border-radius: 16px;

            color: #dc2626;

            background: #fef2f2;
          }

          .denied-label {
            color: #2563eb;

            font-size: 9px;

            font-weight: 850;

            letter-spacing: 0.12em;
          }

          .denied-card h1 {
            margin: 10px 0 8px;

            color: #111827;

            font-size: 27px;

            font-weight: 850;

            letter-spacing: -0.7px;
          }

          .denied-card p {
            margin: 0;

            color: #64748b;

            font-size: 12px;

            line-height: 1.6;
          }

          .denied-card a {
            display: flex;
            align-items: center;
            justify-content: center;

            height: 44px;

            margin-top: 24px;

            border-radius: 9px;

            background: #2563eb;

            color: white;

            text-decoration: none;

            font-size: 11px;

            font-weight: 800;
          }

          .denied-card a:hover {
            background: #1d4ed8;
          }
        `}</style>
      </div>
    );
  }

  return (
    <MasterShell>
      {children}
    </MasterShell>
  );
}