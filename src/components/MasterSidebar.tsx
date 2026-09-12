"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Receipt,
  Wallet,
  BarChart3,
  Users,
  Settings,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const menuGroups = [
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
        icon: Receipt,
      },
      {
        label: "Saques",
        href: "/master/saques",
        icon: Wallet,
      },
      {
        label: "Financeiro",
        href: "/master/financeiro",
        icon: BarChart3,
      },
      {
        label: "Relatórios",
        href: "/master/relatorios",
        icon: BarChart3,
      },
    ],
  },
  {
    title: "ADMINISTRAÇÃO",
    items: [
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
    ],
  },
];

export default function MasterSidebar() {
  const pathname = usePathname();

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

  function isActive(href: string) {
    if (href === "/master") {
      return pathname === "/master";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      {/* BOTÃO MOBILE */}
      <button
        type="button"
        className="master-mobile-button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Fechar menu" : "Abrir menu"}
      >
        {open ? <X size={21} /> : <Menu size={21} />}
      </button>

      {/* OVERLAY MOBILE */}
      {open && (
        <button
          type="button"
          className="master-overlay"
          onClick={() => setOpen(false)}
          aria-label="Fechar menu"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`master-sidebar ${
          open ? "master-sidebar-open" : ""
        }`}
      >
        {/* LOGO */}
        <div className="master-brand">
          <div className="master-brand-icon">
            <ShieldCheck size={22} />
          </div>

          <div className="master-brand-text">
            <div className="master-brand-name">
              Loan<span>Control</span>
            </div>

            <div className="master-brand-subtitle">
              Painel administrativo
            </div>
          </div>
        </div>

        {/* STATUS MASTER */}
        <div className="master-status">
          <div className="master-status-icon">
            <ShieldCheck size={14} />
          </div>

          <div>
            <strong>ADMINISTRADOR MASTER</strong>
            <span>Controle da plataforma</span>
          </div>
        </div>

        {/* MENU */}
        <div className="master-navigation">
          {menuGroups.map((group) => (
            <div
              className="master-menu-group"
              key={group.title}
            >
              <div className="master-section-title">
                {group.title}
              </div>

              <nav>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`master-nav-link ${
                        active
                          ? "master-nav-link-active"
                          : ""
                      }`}
                      onClick={() => setOpen(false)}
                    >
                      <span className="master-nav-icon">
                        <Icon size={18} />
                      </span>

                      <span className="master-nav-label">
                        {item.label}
                      </span>

                      {active && (
                        <ChevronRight
                          size={15}
                          className="master-active-arrow"
                        />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* RODAPÉ */}
        <div className="master-sidebar-footer">
          <div className="master-account">
            <div className="master-account-avatar">
              M
            </div>

            <div className="master-account-info">
              <strong>Conta Master</strong>
              <span>Administrador da plataforma</span>
            </div>
          </div>

          <button
            type="button"
            className="master-logout"
            onClick={handleLogout}
            disabled={loggingOut}
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
          z-index: 100;
          left: 0;
          top: 0;
          bottom: 0;

          width: 268px;
          min-width: 268px;

          display: flex;
          flex-direction: column;

          padding: 18px 14px 14px;

          box-sizing: border-box;

          background:
            linear-gradient(
              180deg,
              #0b1425 0%,
              #101b2f 48%,
              #0b1424 100%
            );

          border-right: 1px solid
            rgba(148, 163, 184, 0.12);

          color: white;

          overflow: hidden;

          box-shadow:
            10px 0 35px
            rgba(15, 23, 42, 0.08);
        }

        .master-brand {
          height: 52px;

          display: flex;
          align-items: center;

          gap: 11px;

          padding: 0 6px;

          flex-shrink: 0;
        }

        .master-brand-icon {
          width: 40px;
          height: 40px;

          flex-shrink: 0;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 11px;

          color: white;

          background:
            linear-gradient(
              135deg,
              #2563eb,
              #4f46e5
            );

          box-shadow:
            0 8px 22px
            rgba(37, 99, 235, 0.32);
        }

        .master-brand-text {
          min-width: 0;
        }

        .master-brand-name {
          white-space: nowrap;

          font-size: 20px;
          line-height: 1;

          font-weight: 850;

          letter-spacing: -0.7px;
        }

        .master-brand-name span {
          color: #60a5fa;
        }

        .master-brand-subtitle {
          margin-top: 5px;

          white-space: nowrap;

          color: #71809a;

          font-size: 9px;

          font-weight: 700;
        }

        .master-status {
          display: flex;
          align-items: center;

          gap: 9px;

          margin-top: 16px;

          padding: 9px 10px;

          border: 1px solid
            rgba(96, 165, 250, 0.2);

          border-radius: 9px;

          background:
            rgba(37, 99, 235, 0.1);

          flex-shrink: 0;
        }

        .master-status-icon {
          width: 28px;
          height: 28px;

          flex-shrink: 0;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 8px;

          background:
            rgba(37, 99, 235, 0.2);

          color: #60a5fa;
        }

        .master-status div:last-child {
          min-width: 0;

          display: flex;
          flex-direction: column;

          gap: 2px;
        }

        .master-status strong {
          color: #93c5fd;

          font-size: 9px;

          font-weight: 850;

          white-space: nowrap;
        }

        .master-status span {
          color: #64748b;

          font-size: 8px;

          white-space: nowrap;
        }

        .master-navigation {
          flex: 1;

          min-height: 0;

          margin-top: 22px;

          overflow-y: auto;
          overflow-x: hidden;

          padding-right: 2px;
        }

        .master-navigation::-webkit-scrollbar {
          width: 4px;
        }

        .master-navigation::-webkit-scrollbar-track {
          background: transparent;
        }

        .master-navigation::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.2);
          border-radius: 10px;
        }

        .master-menu-group {
          margin-bottom: 21px;
        }

        .master-section-title {
          padding: 0 10px 8px;

          color: #596982;

          font-size: 9px;

          line-height: 1;

          font-weight: 850;

          letter-spacing: 0.13em;

          white-space: nowrap;
        }

        .master-menu-group nav {
          display: grid;

          gap: 3px;
        }

        .master-nav-link {
          position: relative;

          width: 100%;
          min-height: 42px;

          display: flex;
          align-items: center;

          gap: 10px;

          padding: 0 10px;

          box-sizing: border-box;

          border-radius: 9px;

          color: #aebbd0;

          text-decoration: none;

          transition:
            background 0.18s ease,
            color 0.18s ease,
            transform 0.18s ease;
        }

        .master-nav-link:hover {
          color: #ffffff;

          background:
            rgba(255, 255, 255, 0.055);

          transform: translateX(2px);
        }

        .master-nav-icon {
          width: 30px;
          height: 30px;

          flex-shrink: 0;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 8px;

          color: #8190a8;

          transition: 0.18s ease;
        }

        .master-nav-link:hover
          .master-nav-icon {
          color: #60a5fa;
        }

        .master-nav-label {
          flex: 1;

          min-width: 0;

          color: inherit;

          font-size: 12px;

          font-weight: 650;

          white-space: nowrap;

          overflow: hidden;

          text-overflow: ellipsis;
        }

        .master-nav-link-active {
          color: #ffffff;

          background:
            linear-gradient(
              90deg,
              rgba(37, 99, 235, 0.2),
              rgba(37, 99, 235, 0.07)
            );

          border: 1px solid
            rgba(96, 165, 250, 0.14);

          box-shadow:
            inset 3px 0 0 #3b82f6;
        }

        .master-nav-link-active
          .master-nav-icon {
          color: #60a5fa;

          background:
            rgba(37, 99, 235, 0.15);
        }

        .master-active-arrow {
          flex-shrink: 0;

          color: #60a5fa;
        }

        .master-sidebar-footer {
          flex-shrink: 0;

          margin-top: 8px;

          padding-top: 12px;

          border-top: 1px solid
            rgba(148, 163, 184, 0.11);
        }

        .master-account {
          display: flex;
          align-items: center;

          gap: 9px;

          padding: 7px 6px 9px;
        }

        .master-account-avatar {
          width: 34px;
          height: 34px;

          flex-shrink: 0;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 9px;

          color: #bfdbfe;

          background: #1e293b;

          border: 1px solid
            rgba(148, 163, 184, 0.15);

          font-size: 12px;

          font-weight: 850;
        }

        .master-account-info {
          min-width: 0;

          display: flex;
          flex-direction: column;

          gap: 2px;
        }

        .master-account-info strong {
          color: #e2e8f0;

          font-size: 10px;

          font-weight: 800;

          white-space: nowrap;
        }

        .master-account-info span {
          color: #64748b;

          font-size: 8px;

          white-space: nowrap;

          overflow: hidden;

          text-overflow: ellipsis;
        }

        .master-logout {
          width: 100%;
          height: 40px;

          display: flex;
          align-items: center;
          justify-content: center;

          gap: 8px;

          border: 1px solid
            rgba(248, 113, 113, 0.16);

          border-radius: 9px;

          background:
            rgba(127, 29, 29, 0.1);

          color: #fca5a5;

          font-size: 11px;

          font-weight: 750;

          cursor: pointer;

          transition: 0.18s ease;
        }

        .master-logout:hover {
          background:
            rgba(220, 38, 38, 0.15);

          border-color:
            rgba(248, 113, 113, 0.28);

          color: #fecaca;
        }

        .master-logout:disabled {
          opacity: 0.6;

          cursor: wait;
        }

        .master-mobile-button {
          display: none;
        }

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

            left: 14px;
            top: 14px;

            z-index: 120;

            width: 42px;
            height: 42px;

            display: flex;
            align-items: center;
            justify-content: center;

            border: 1px solid #dbe3ee;

            border-radius: 10px;

            background: white;

            color: #0f172a;

            cursor: pointer;

            box-shadow:
              0 8px 25px
              rgba(15, 23, 42, 0.12);
          }

          .master-overlay {
            position: fixed;

            inset: 0;

            z-index: 90;

            display: block;

            border: 0;

            background:
              rgba(15, 23, 42, 0.45);
          }
        }
      `}</style>
    </>
  );
}