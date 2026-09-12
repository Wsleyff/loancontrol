"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  CheckCircle2,
  Wallet,
  BarChart3,
  Users,
  Settings,
  LogOut,
  ShieldCheck,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const menu = [
  {
    title: "PLATAFORMA",
    items: [
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
        icon: CheckCircle2,
      },
      {
        label: "Saques",
        href: "/master/saques",
        icon: Wallet,
      },
    ],
  },
  {
    title: "GESTÃO",
    items: [
      {
        label: "Financeiro",
        href: "/master/financeiro",
        icon: BarChart3,
      },
      {
        label: "Usuários Master",
        href: "/master/usuarios",
        icon: Users,
      },
    ],
  },
  {
    title: "SISTEMA",
    items: [
      {
        label: "Configurações",
        href: "/master/configuracoes",
        icon: Settings,
      },
    ],
  },
];

export default function MasterShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
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
    <div className="master-shell">
      <button
        type="button"
        className="mobile-button"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Abrir menu"
      >
        {mobileOpen ? (
          <X size={21} />
        ) : (
          <Menu size={21} />
        )}
      </button>

      {mobileOpen && (
        <button
          type="button"
          className="mobile-overlay"
          onClick={() => setMobileOpen(false)}
          aria-label="Fechar menu"
        />
      )}

      <aside
        className={`master-sidebar ${
          mobileOpen ? "open" : ""
        }`}
      >
        <div className="brand">
          <div className="brand-icon">
            <ShieldCheck size={23} />
          </div>

          <div>
            <div className="brand-name">
              Loan<span>Control</span>
            </div>

            <div className="brand-subtitle">
              Painel administrativo
            </div>
          </div>
        </div>

        <div className="master-label">
          <ShieldCheck size={14} />
          ADMINISTRADOR MASTER
        </div>

        <div className="divider" />

        <nav className="navigation">
          {menu.map((section) => (
            <div
              className="menu-section"
              key={section.title}
            >
              <div className="section-title">
                {section.title}
              </div>

              {section.items.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="menu-link"
                    onClick={() =>
                      setMobileOpen(false)
                    }
                  >
                    <Icon size={18} />

                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="master-account">
            <div className="account-avatar">
              M
            </div>

            <div className="account-text">
              <strong>Conta Master</strong>
              <span>
                Administração da plataforma
              </span>
            </div>
          </div>

          <button
            type="button"
            className="logout"
            onClick={logout}
            disabled={loggingOut}
          >
            <LogOut size={17} />

            {loggingOut
              ? "Saindo..."
              : "Sair da conta"}
          </button>
        </div>
      </aside>

      <div className="master-main">
        <header className="topbar">
          <div>
            <span className="topbar-label">
              LOANCONTROL
            </span>

            <strong>
              Administração da plataforma
            </strong>
          </div>

          <div className="topbar-badge">
            <ShieldCheck size={15} />
            MASTER
          </div>
        </header>

        <div className="master-content">
          {children}
        </div>
      </div>

      <style jsx>{`
        .master-shell {
          min-height: 100vh;
          background: #f4f7fb;
        }

        .master-sidebar {
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          width: 264px;
          background:
            linear-gradient(
              180deg,
              #0b1426 0%,
              #0f1a2f 55%,
              #0a1324 100%
            );
          color: white;
          z-index: 100;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          border-right: 1px solid
            rgba(255, 255, 255, 0.06);
        }

        .brand {
          height: 82px;
          padding: 0 20px;
          display: flex;
          align-items: center;
          gap: 11px;
          flex-shrink: 0;
        }

        .brand-icon {
          width: 42px;
          height: 42px;
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
            0 8px 24px rgba(37, 99, 235, 0.28);
        }

        .brand-name {
          font-size: 20px;
          line-height: 1;
          font-weight: 850;
          letter-spacing: -0.5px;
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

        .master-label {
          margin: 0 14px 12px;
          min-height: 38px;
          padding: 0 11px;
          border: 1px solid
            rgba(96, 165, 250, 0.2);
          border-radius: 9px;
          background: rgba(37, 99, 235, 0.1);
          color: #93c5fd;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 9px;
          font-weight: 850;
          letter-spacing: 0.06em;
          flex-shrink: 0;
        }

        .divider {
          height: 1px;
          margin: 0 14px 16px;
          background: rgba(255, 255, 255, 0.07);
        }

        .navigation {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding: 0 12px;
        }

        .navigation::-webkit-scrollbar {
          width: 4px;
        }

        .navigation::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.2);
          border-radius: 20px;
        }

        .menu-section {
          margin-bottom: 21px;
        }

        .section-title {
          padding: 0 10px 8px;
          color: #596a84;
          font-size: 9px;
          font-weight: 850;
          letter-spacing: 0.13em;
        }

        .menu-link {
          min-height: 42px;
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 0 11px;
          margin-bottom: 3px;
          border-radius: 9px;
          color: #cbd5e1;
          text-decoration: none;
          font-size: 13px;
          font-weight: 650;
          transition: 0.18s ease;
        }

        .menu-link svg {
          color: #7f8da5;
          flex-shrink: 0;
        }

        .menu-link:hover {
          background: rgba(255, 255, 255, 0.055);
          color: white;
          transform: translateX(2px);
        }

        .menu-link:hover svg {
          color: #60a5fa;
        }

        .sidebar-footer {
          padding: 13px 14px 15px;
          border-top: 1px solid
            rgba(255, 255, 255, 0.07);
          flex-shrink: 0;
        }

        .master-account {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 7px 7px 11px;
        }

        .account-avatar {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          background: #1e3a8a;
          color: #bfdbfe;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 850;
          flex-shrink: 0;
        }

        .account-text {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .account-text strong {
          color: #e2e8f0;
          font-size: 11px;
        }

        .account-text span {
          color: #64748b;
          font-size: 8px;
        }

        .logout {
          width: 100%;
          height: 40px;
          border-radius: 9px;
          border: 1px solid
            rgba(248, 113, 113, 0.15);
          background: rgba(127, 29, 29, 0.1);
          color: #fca5a5;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 750;
          transition: 0.18s ease;
        }

        .logout:hover {
          background: rgba(220, 38, 38, 0.16);
          color: #fecaca;
        }

        .logout:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .master-main {
          margin-left: 264px;
          min-height: 100vh;
          width: calc(100% - 264px);
          box-sizing: border-box;
        }

        .topbar {
          height: 72px;
          background: white;
          border-bottom: 1px solid #e5eaf2;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 34px;
          box-sizing: border-box;
        }

        .topbar-label {
          display: block;
          color: #2563eb;
          font-size: 9px;
          font-weight: 850;
          letter-spacing: 0.12em;
          margin-bottom: 3px;
        }

        .topbar strong {
          color: #172033;
          font-size: 14px;
          font-weight: 750;
        }

        .topbar-badge {
          height: 34px;
          padding: 0 12px;
          border-radius: 9px;
          border: 1px solid #dbeafe;
          background: #eff6ff;
          color: #2563eb;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          font-weight: 850;
        }

        .master-content {
          width: 100%;
          min-height: calc(100vh - 72px);
          box-sizing: border-box;
        }

        .mobile-button {
          display: none;
        }

        .mobile-overlay {
          display: none;
        }

        @media (max-width: 900px) {
          .master-sidebar {
            transform: translateX(-100%);
            transition: transform 0.25s ease;
          }

          .master-sidebar.open {
            transform: translateX(0);
          }

          .master-main {
            margin-left: 0;
            width: 100%;
          }

          .mobile-button {
            position: fixed;
            left: 14px;
            top: 14px;
            width: 42px;
            height: 42px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid #dbe3ef;
            border-radius: 10px;
            background: white;
            color: #172033;
            z-index: 120;
            cursor: pointer;
            box-shadow: 0 6px 18px
              rgba(15, 23, 42, 0.1);
          }

          .mobile-overlay {
            position: fixed;
            inset: 0;
            display: block;
            border: 0;
            background: rgba(15, 23, 42, 0.45);
            z-index: 90;
          }

          .topbar {
            padding-left: 72px;
          }
        }

        @media (max-width: 600px) {
          .topbar {
            height: 64px;
            padding-right: 15px;
          }

          .topbar strong {
            font-size: 12px;
          }

          .topbar-badge {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}