"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Wallet,
  ArrowDownToLine,
  BarChart3,
  Users,
  Settings,
  LogOut,
  ShieldCheck,
  Menu,
  X,
  Landmark,
  FileText,
} from "lucide-react";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const items = [
  {
    label: "Dashboard",
    href: "/master",
    icon: LayoutDashboard,
  },
  {
    label: "Empresas",
    href: "/master/empresas",
    icon: Building2,
  },
  {
    label: "Planos",
    href: "/master/planos",
    icon: CreditCard,
  },
  {
    label: "Assinaturas",
    href: "/master/assinaturas",
    icon: FileText,
  },
  {
    label: "Saques",
    href: "/master/saques",
    icon: ArrowDownToLine,
  },
  {
    label: "Financeiro",
    href: "/master/financeiro",
    icon: Wallet,
  },
  {
    label: "Relatórios",
    href: "/master/relatorios",
    icon: BarChart3,
  },
  {
    label: "Usuários",
    href: "/master/usuarios",
    icon: Users,
  },
  {
    label: "Configurações",
    href: "/master/configuracoes",
    icon: Settings,
  },
];

export function MasterSidebar() {
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      const supabase = createClient();

      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error("Erro ao sair:", error);
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Fechar menu" : "Abrir menu"}
        className="master-mobile-button"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && (
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="master-overlay"
          aria-label="Fechar menu"
        />
      )}

      <aside
        className={`master-sidebar ${
          open ? "master-sidebar-open" : ""
        }`}
      >
        <div className="master-header">
          <div className="master-logo">
            <ShieldCheck size={21} />
          </div>

          <div>
            <div className="master-title">
              Loan<span>Control</span>
            </div>

            <div className="master-subtitle">
              Painel administrativo
            </div>
          </div>
        </div>

        <div className="master-divider" />

        <div className="master-badge">
          <ShieldCheck size={15} />

          <span>
            ADMINISTRADOR MASTER
          </span>
        </div>

        <nav className="master-nav">
          <div className="master-section">
            PLATAFORMA
          </div>

          {items.slice(0, 8).map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="master-link"
                onClick={() => setOpen(false)}
              >
                <span className="master-link-icon">
                  <Icon size={17} />
                </span>

                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="master-section settings-section">
            SISTEMA
          </div>

          {items.slice(8).map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="master-link master-settings-link"
                onClick={() => setOpen(false)}
              >
                <span className="master-link-icon">
                  <Icon size={17} />
                </span>

                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="master-bottom">
          <div className="master-account">
            <div className="master-avatar">
              M
            </div>

            <div>
              <strong>Conta Master</strong>
              <span>Administrador da plataforma</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="master-logout"
          >
            <LogOut size={17} />

            <span>
              {loggingOut
                ? "Saindo..."
                : "Sair da conta"}
            </span>
          </button>
        </div>
      </aside>

      <style jsx>{`
        .master-sidebar {
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          width: 260px;
          min-width: 260px;
          background:
            linear-gradient(
              180deg,
              #080f1f 0%,
              #0f172a 55%,
              #080f1f 100%
            );
          color: white;
          display: flex;
          flex-direction: column;
          z-index: 1000;
          border-right: 1px solid
            rgba(148, 163, 184, 0.1);
          box-shadow:
            10px 0 35px
            rgba(2, 6, 23, 0.15);
          overflow: hidden;
        }

        .master-header {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 21px 18px 17px;
        }

        .master-logo {
          width: 40px;
          height: 40px;
          min-width: 40px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          background:
            linear-gradient(
              135deg,
              #2563eb,
              #4f46e5
            );
          color: white;
          box-shadow:
            0 8px 22px
            rgba(37, 99, 235, 0.32);
        }

        .master-title {
          font-size: 19px;
          font-weight: 850;
          letter-spacing: -0.5px;
          line-height: 1;
        }

        .master-title span {
          color: #60a5fa;
        }

        .master-subtitle {
          margin-top: 5px;
          font-size: 9px;
          color: #94a3b8;
          font-weight: 600;
        }

        .master-divider {
          height: 1px;
          background:
            rgba(255, 255, 255, 0.07);
          margin: 0 16px 15px;
        }

        .master-badge {
          margin: 0 14px 16px;
          height: 34px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 10px;
          box-sizing: border-box;
          background:
            rgba(37, 99, 235, 0.13);
          border:
            1px solid
            rgba(96, 165, 250, 0.18);
          color: #93c5fd;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.06em;
        }

        .master-nav {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding: 0 12px 12px;
        }

        .master-section {
          padding: 2px 9px 8px;
          color: #64748b;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.13em;
        }

        .settings-section {
          margin-top: 17px;
        }

        .master-link {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          height: 40px;
          box-sizing: border-box;
          padding: 0 9px;
          margin-bottom: 3px;
          border-radius: 9px;
          text-decoration: none;
          color: #cbd5e1;
          font-size: 12px;
          font-weight: 650;
          transition:
            background 0.18s ease,
            color 0.18s ease,
            transform 0.18s ease;
        }

        .master-link:hover {
          background:
            rgba(255, 255, 255, 0.07);
          color: white;
          transform: translateX(2px);
        }

        .master-link-icon {
          width: 21px;
          height: 21px;
          min-width: 21px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
        }

        .master-link:hover
          .master-link-icon {
          color: #60a5fa;
        }

        .master-settings-link {
          background:
            rgba(37, 99, 235, 0.08);
          color: #dbeafe;
        }

        .master-bottom {
          flex-shrink: 0;
          padding: 12px 14px 15px;
          border-top:
            1px solid
            rgba(255, 255, 255, 0.07);
        }

        .master-account {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 2px 5px 10px;
        }

        .master-avatar {
          width: 34px;
          height: 34px;
          min-width: 34px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          background:
            linear-gradient(
              135deg,
              #1e3a8a,
              #312e81
            );
          border:
            1px solid
            rgba(96, 165, 250, 0.2);
          color: #bfdbfe;
          font-size: 13px;
          font-weight: 850;
        }

        .master-account div:last-child {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .master-account strong {
          font-size: 10px;
          color: #e2e8f0;
        }

        .master-account span {
          font-size: 8px;
          color: #64748b;
        }

        .master-logout {
          width: 100%;
          height: 39px;
          border-radius: 9px;
          border:
            1px solid
            rgba(248, 113, 113, 0.15);
          background:
            rgba(127, 29, 29, 0.12);
          color: #fca5a5;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 750;
          cursor: pointer;
        }

        .master-logout:hover {
          background:
            rgba(220, 38, 38, 0.18);
          color: #fecaca;
        }

        .master-logout:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .master-mobile-button,
        .master-overlay {
          display: none;
        }

        @media (max-width: 900px) {
          .master-sidebar {
            transform: translateX(-100%);
            transition:
              transform 0.25s ease;
          }

          .master-sidebar-open {
            transform: translateX(0);
          }

          .master-mobile-button {
            position: fixed;
            left: 13px;
            top: 13px;
            width: 42px;
            height: 42px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            background: white;
            color: #0f172a;
            z-index: 1001;
            cursor: pointer;
          }

          .master-overlay {
            position: fixed;
            inset: 0;
            display: block;
            border: 0;
            background:
              rgba(15, 23, 42, 0.45);
            z-index: 999;
          }
        }
      `}</style>
    </>
  );
}