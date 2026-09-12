"use client";

import Link from "next/link";
import {
  Building2,
  CreditCard,
  Wallet,
  Users,
  Settings,
  ArrowRight,
  ShieldCheck,
  Clock3,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import { useEffect, useState } from "react";

type DashboardData = {
  companies: number;
  trials: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  pendingWithdrawals: number;
  monthlyRevenue: number;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

export default function MasterPage() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [data, setData] = useState<DashboardData>({
    companies: 0,
    trials: 0,
    activeSubscriptions: 0,
    expiredSubscriptions: 0,
    pendingWithdrawals: 0,
    monthlyRevenue: 0,
  });

  useEffect(() => {
    async function load() {
      try {
        const masterResponse = await fetch("/api/master/status", {
          cache: "no-store",
        });

        const masterData = await masterResponse.json();

        if (!masterResponse.ok || !masterData?.isMaster) {
          setAuthorized(false);
          return;
        }

        setAuthorized(true);

        const response = await fetch("/api/master/dashboard", {
          cache: "no-store",
        });

        if (response.ok) {
          const dashboard = await response.json();

          setData({
            companies: Number(dashboard?.companies || 0),
            trials: Number(dashboard?.trials || 0),
            activeSubscriptions: Number(
              dashboard?.activeSubscriptions || 0
            ),
            expiredSubscriptions: Number(
              dashboard?.expiredSubscriptions || 0
            ),
            pendingWithdrawals: Number(
              dashboard?.pendingWithdrawals || 0
            ),
            monthlyRevenue: Number(
              dashboard?.monthlyRevenue || 0
            ),
          });
        }
      } catch (error) {
        console.error("Erro ao carregar Área Master:", error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <main className="loading-page">
        <div className="loading-card">
          <div className="loading-icon">
            <ShieldCheck size={30} />
          </div>

          <h2>Carregando Área Master</h2>

          <p>
            Verificando as permissões da sua conta...
          </p>
        </div>

        <style jsx>{`
          .loading-page {
            min-height: calc(100vh - 70px);
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f5f7fb;
            padding: 30px;
          }

          .loading-card {
            width: 100%;
            max-width: 430px;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 20px;
            padding: 42px 30px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08);
          }

          .loading-icon {
            width: 65px;
            height: 65px;
            margin: 0 auto 18px;
            border-radius: 18px;
            background: #eff6ff;
            color: #2563eb;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          h2 {
            margin: 0;
            color: #0f172a;
            font-size: 22px;
          }

          p {
            margin: 9px 0 0;
            color: #64748b;
            font-size: 14px;
          }
        `}</style>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="blocked-page">
        <div className="blocked-card">
          <div className="blocked-icon">
            <ShieldCheck size={30} />
          </div>

          <h1>Acesso restrito</h1>

          <p>
            Esta área é exclusiva para o administrador
            Master da plataforma.
          </p>

          <Link href="/dashboard" className="back-button">
            Voltar para o sistema
          </Link>
        </div>

        <style jsx>{`
          .blocked-page {
            min-height: calc(100vh - 70px);
            background: #f5f7fb;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 30px;
          }

          .blocked-card {
            width: 100%;
            max-width: 430px;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 22px;
            padding: 45px 32px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08);
          }

          .blocked-icon {
            width: 68px;
            height: 68px;
            margin: 0 auto 20px;
            border-radius: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #fff7ed;
            color: #ea580c;
          }

          h1 {
            margin: 0;
            color: #0f172a;
            font-size: 28px;
          }

          p {
            margin: 12px 0 25px;
            color: #64748b;
            line-height: 1.6;
          }

          .back-button {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 46px;
            border-radius: 11px;
            background: #2563eb;
            color: white;
            text-decoration: none;
            font-weight: 700;
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="master-page">
      <div className="container">
        <header className="header">
          <div>
            <div className="eyebrow">
              <ShieldCheck size={15} />
              ADMINISTRAÇÃO DA PLATAFORMA
            </div>

            <h1>Painel Master</h1>

            <p>
              Controle central de empresas, planos,
              assinaturas e operações do LoanControl.
            </p>
          </div>

          <div className="master-badge">
            <ShieldCheck size={17} />
            MASTER
          </div>
        </header>

        <section className="stats">
          <div className="stat">
            <div className="stat-icon blue">
              <Building2 size={21} />
            </div>

            <div>
              <span>Empresas cadastradas</span>
              <strong>{data.companies}</strong>
            </div>
          </div>

          <div className="stat">
            <div className="stat-icon orange">
              <Clock3 size={21} />
            </div>

            <div>
              <span>Em período de teste</span>
              <strong>{data.trials}</strong>
            </div>
          </div>

          <div className="stat">
            <div className="stat-icon green">
              <CheckCircle2 size={21} />
            </div>

            <div>
              <span>Assinaturas ativas</span>
              <strong>{data.activeSubscriptions}</strong>
            </div>
          </div>

          <div className="stat">
            <div className="stat-icon red">
              <AlertTriangle size={21} />
            </div>

            <div>
              <span>Assinaturas vencidas</span>
              <strong>{data.expiredSubscriptions}</strong>
            </div>
          </div>
        </section>

        <section className="main-grid">
          <div className="welcome-card">
            <div className="welcome-icon">
              <ShieldCheck size={28} />
            </div>

            <div>
              <span className="mini-title">
                CONTROLE MASTER
              </span>

              <h2>
                Gerencie toda a plataforma
              </h2>

              <p>
                Aqui você controla as empresas que utilizam
                o LoanControl, planos, assinaturas, saques
                e configurações globais.
              </p>
            </div>
          </div>

          <div className="revenue-card">
            <div className="revenue-top">
              <div>
                <span className="mini-title">
                  RECEITA MENSAL
                </span>

                <h2>
                  {formatMoney(data.monthlyRevenue)}
                </h2>
              </div>

              <div className="revenue-icon">
                <BarChart3 size={22} />
              </div>
            </div>

            <p>
              Receita contabilizada pela plataforma.
            </p>
          </div>
        </section>

        <section>
          <div className="section-heading">
            <div>
              <h2>Administração</h2>
              <p>
                Principais controles da plataforma.
              </p>
            </div>
          </div>

          <div className="actions">
            <Link
              href="/master/empresas"
              className="action"
            >
              <div className="action-icon blue">
                <Building2 size={22} />
              </div>

              <div className="action-content">
                <h3>Empresas</h3>
                <p>
                  Gerencie todas as empresas cadastradas.
                </p>
              </div>

              <ArrowRight size={18} />
            </Link>

            <Link
              href="/master/planos"
              className="action"
            >
              <div className="action-icon purple">
                <CreditCard size={22} />
              </div>

              <div className="action-content">
                <h3>Planos</h3>
                <p>
                  Crie, edite e controle os planos.
                </p>
              </div>

              <ArrowRight size={18} />
            </Link>

            <Link
              href="/master/assinaturas"
              className="action"
            >
              <div className="action-icon green">
                <CheckCircle2 size={22} />
              </div>

              <div className="action-content">
                <h3>Assinaturas</h3>
                <p>
                  Acompanhe assinaturas e testes.
                </p>
              </div>

              <ArrowRight size={18} />
            </Link>

            <Link
              href="/master/saques"
              className="action"
            >
              <div className="action-icon orange">
                <Wallet size={22} />
              </div>

              <div className="action-content">
                <h3>Saques</h3>
                <p>
                  Controle solicitações de saque.
                </p>
              </div>

              <ArrowRight size={18} />
            </Link>

            <Link
              href="/master/usuarios"
              className="action"
            >
              <div className="action-icon cyan">
                <Users size={22} />
              </div>

              <div className="action-content">
                <h3>Usuários Master</h3>
                <p>
                  Controle os administradores Master.
                </p>
              </div>

              <ArrowRight size={18} />
            </Link>

            <Link
              href="/master/configuracoes"
              className="action"
            >
              <div className="action-icon gray">
                <Settings size={22} />
              </div>

              <div className="action-content">
                <h3>Configurações</h3>
                <p>
                  Configurações globais do LoanControl.
                </p>
              </div>

              <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </div>

      <style jsx>{`
        .master-page {
          min-height: calc(100vh - 70px);
          background: #f5f7fb;
          padding: 32px;
        }

        .container {
          max-width: 1450px;
          margin: 0 auto;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 28px;
        }

        .eyebrow {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #2563eb;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          margin-bottom: 9px;
        }

        .header h1 {
          margin: 0;
          color: #0f172a;
          font-size: 34px;
          letter-spacing: -1px;
        }

        .header p {
          margin: 8px 0 0;
          color: #64748b;
          font-size: 14px;
        }

        .master-badge {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 10px 14px;
          border-radius: 10px;
          background: #eff6ff;
          border: 1px solid #dbeafe;
          color: #1d4ed8;
          font-size: 11px;
          font-weight: 800;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 18px;
        }

        .stat {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 19px;
          display: flex;
          align-items: center;
          gap: 14px;
          box-shadow: 0 8px 25px rgba(15, 23, 42, 0.04);
        }

        .stat-icon,
        .action-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .stat-icon {
          width: 45px;
          height: 45px;
          border-radius: 12px;
        }

        .blue {
          background: #eff6ff;
          color: #2563eb;
        }

        .orange {
          background: #fff7ed;
          color: #ea580c;
        }

        .green {
          background: #ecfdf5;
          color: #059669;
        }

        .red {
          background: #fef2f2;
          color: #dc2626;
        }

        .purple {
          background: #f5f3ff;
          color: #7c3aed;
        }

        .cyan {
          background: #ecfeff;
          color: #0891b2;
        }

        .gray {
          background: #f1f5f9;
          color: #475569;
        }

        .stat span {
          display: block;
          color: #64748b;
          font-size: 11px;
          font-weight: 600;
          margin-bottom: 5px;
        }

        .stat strong {
          color: #0f172a;
          font-size: 25px;
        }

        .main-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 18px;
          margin-bottom: 30px;
        }

        .welcome-card,
        .revenue-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 25px;
          box-shadow: 0 8px 25px rgba(15, 23, 42, 0.04);
        }

        .welcome-card {
          display: flex;
          gap: 17px;
        }

        .welcome-icon {
          width: 54px;
          height: 54px;
          border-radius: 14px;
          background: #eff6ff;
          color: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .mini-title {
          color: #64748b;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
        }

        .welcome-card h2 {
          margin: 6px 0 7px;
          color: #0f172a;
          font-size: 20px;
        }

        .welcome-card p,
        .revenue-card p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.6;
        }

        .revenue-top {
          display: flex;
          justify-content: space-between;
        }

        .revenue-card h2 {
          margin: 7px 0 0;
          color: #0f172a;
          font-size: 28px;
        }

        .revenue-icon {
          width: 45px;
          height: 45px;
          border-radius: 12px;
          background: #ecfdf5;
          color: #059669;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .section-heading {
          margin-bottom: 14px;
        }

        .section-heading h2 {
          margin: 0;
          color: #0f172a;
          font-size: 19px;
        }

        .section-heading p {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 12px;
        }

        .actions {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
        }

        .action {
          display: flex;
          align-items: center;
          gap: 13px;
          min-height: 95px;
          padding: 17px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 15px;
          text-decoration: none;
          color: inherit;
          box-shadow: 0 7px 20px rgba(15, 23, 42, 0.035);
          transition: 0.18s ease;
        }

        .action:hover {
          transform: translateY(-2px);
          border-color: #bfdbfe;
          box-shadow: 0 12px 28px rgba(37, 99, 235, 0.09);
        }

        .action-icon {
          width: 44px;
          height: 44px;
          border-radius: 11px;
        }

        .action-content {
          flex: 1;
          min-width: 0;
        }

        .action h3 {
          margin: 0 0 4px;
          color: #0f172a;
          font-size: 14px;
        }

        .action p {
          margin: 0;
          color: #64748b;
          font-size: 11px;
          line-height: 1.4;
        }

        .action > svg {
          color: #94a3b8;
          flex-shrink: 0;
        }

        @media (max-width: 1100px) {
          .stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .actions {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 800px) {
          .master-page {
            padding: 20px 15px;
          }

          .header {
            flex-direction: column;
          }

          .main-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .stats,
          .actions {
            grid-template-columns: 1fr;
          }

          .welcome-card {
            flex-direction: column;
          }
        }
      `}</style>
    </main>
  );
}