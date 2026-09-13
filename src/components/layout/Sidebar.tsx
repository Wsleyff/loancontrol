"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  HandCoins,
  Calculator,
  CalendarDays,
  Receipt,
  MessageCircle,
  Wallet,
  BarChart3,
  Settings,
  UserCog,
  Building2,
  LogOut,
  ShieldCheck,
  X,
  ChevronRight,
} from "lucide-react";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const mainItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Clientes",
    href: "/clientes",
    icon: Users,
  },
  {
    label: "Empréstimos",
    href: "/emprestimos",
    icon: HandCoins,
  },
  {
    label: "Simulador",
    href: "/simulador",
    icon: Calculator,
  },
  {
    label: "Parcelas",
    href: "/parcelas",
    icon: CalendarDays,
  },
  {
    label: "Pagamentos",
    href: "/pagamentos",
    icon: Receipt,
  },
  {
    label: "Cobranças",
    href: "/cobrancas",
    icon: MessageCircle,
  },
  {
    label: "Financeiro",
    href: "/financeiro",
    icon: Wallet,
  },
  {
    label: "Relatórios",
    href: "/relatorios",
    icon: BarChart3,
  },
];

const adminItems = [
  {
    label: "Usuários",
    href: "/usuarios",
    icon: UserCog,
  },
  {
    label: "Empresa",
    href: "/empresa",
    icon: Building2,
  },
  {
    label: "Configurações",
    href: "/configuracoes",
    icon: Settings,
  },
];

type SidebarProps = {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

export function Sidebar({
  mobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();

  const [isMaster, setIsMaster] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    async function verificarMaster() {
      try {
        const response = await fetch(
          "/api/master/status",
          {
            method: "GET",
            cache: "no-store",
          }
        );

        if (!response.ok) {
          setIsMaster(false);
          return;
        }

        const data = await response.json();

        setIsMaster(Boolean(data?.isMaster));
      } catch {
        setIsMaster(false);
      }
    }

    verificarMaster();
  }, []);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      const supabase = createClient();

      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error(
        "Erro ao sair da conta:",
        error
      );
    } finally {
      window.location.href = "/login";
    }
  }

  function closeMobileMenu() {
    onMobileClose?.();
  }

  function isActive(href: string) {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  }

  return (
    <>
      {/* =====================================================
          OVERLAY MOBILE
      ===================================================== */}
      {mobileOpen && (
        <button
          type="button"
          onClick={closeMobileMenu}
          aria-label="Fechar menu"
          className="loancontrol-sidebar-overlay"
        />
      )}

      {/* =====================================================
          SIDEBAR
      ===================================================== */}
      <aside
        className={`loancontrol-sidebar ${
          mobileOpen
            ? "loancontrol-sidebar-open"
            : ""
        }`}
      >
        {/* ===================================================
            TOPO / LOGO
        =================================================== */}
        <div className="loancontrol-sidebar-top">
          <div className="loancontrol-brand">
            <div className="loancontrol-brand-icon">
              <Wallet
                size={21}
                strokeWidth={2.2}
              />
            </div>

            <div className="loancontrol-brand-text">
              <div className="loancontrol-brand-name">
                Loan
                <span>Control</span>
              </div>

              <div className="loancontrol-brand-subtitle">
                Gestão de crédito
              </div>
            </div>

            <button
              type="button"
              className="loancontrol-mobile-close"
              onClick={closeMobileMenu}
              aria-label="Fechar menu"
            >
              <X size={20} />
            </button>
          </div>

          <div className="loancontrol-sidebar-line" />
        </div>

        {/* ===================================================
            MENU
        =================================================== */}
        <div className="loancontrol-sidebar-scroll">
          <div className="loancontrol-section-title">
            PRINCIPAL
          </div>

          <nav className="loancontrol-nav">
            {mainItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobileMenu}
                  className={`loancontrol-nav-item ${
                    active
                      ? "loancontrol-nav-item-active"
                      : ""
                  }`}
                >
                  <span className="loancontrol-nav-icon">
                    <Icon
                      size={18}
                      strokeWidth={
                        active ? 2.2 : 1.9
                      }
                    />
                  </span>

                  <span className="loancontrol-nav-label">
                    {item.label}
                  </span>

                  {active && (
                    <ChevronRight
                      size={15}
                      className="loancontrol-nav-arrow"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="loancontrol-section-title loancontrol-admin-title">
            ADMINISTRAÇÃO
          </div>

          <nav className="loancontrol-nav">
            {adminItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobileMenu}
                  className={`loancontrol-nav-item ${
                    active
                      ? "loancontrol-nav-item-active"
                      : ""
                  }`}
                >
                  <span className="loancontrol-nav-icon">
                    <Icon
                      size={18}
                      strokeWidth={
                        active ? 2.2 : 1.9
                      }
                    />
                  </span>

                  <span className="loancontrol-nav-label">
                    {item.label}
                  </span>

                  {active && (
                    <ChevronRight
                      size={15}
                      className="loancontrol-nav-arrow"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* =================================================
              MASTER
          ================================================= */}
          {isMaster && (
            <Link
              href="/master"
              onClick={closeMobileMenu}
              className="loancontrol-master-link"
            >
              <div className="loancontrol-master-icon">
                <ShieldCheck size={18} />
              </div>

              <div className="loancontrol-master-text">
                <span>Área Master</span>
                <small>
                  Controle da plataforma
                </small>
              </div>

              <ChevronRight
                size={16}
                className="loancontrol-master-arrow"
              />
            </Link>
          )}
        </div>

        {/* ===================================================
            RODAPÉ
        =================================================== */}
        <div className="loancontrol-sidebar-footer">
          <div className="loancontrol-account">
            <div className="loancontrol-account-avatar">
              LC
            </div>

            <div className="loancontrol-account-info">
              <strong>Conta ativa</strong>
              <span>LoanControl</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="loancontrol-logout"
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
        .loancontrol-sidebar {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          width: 250px;
          min-width: 250px;
          display: flex;
          flex-direction: column;
          background: linear-gradient(
            180deg,
            #0f172a 0%,
            #111827 55%,
            #0b1220 100%
          );
          color: #ffffff;
          z-index: 1000;
          border-right: 1px solid
            rgba(255, 255, 255, 0.07);
          box-shadow:
            10px 0 35px
              rgba(15, 23, 42, 0.08);
          overflow: hidden;
        }

        .loancontrol-sidebar-top {
          flex-shrink: 0;
          padding: 20px 17px 0;
        }

        .loancontrol-brand {
          min-height: 40px;
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .loancontrol-brand-icon {
          width: 40px;
          height: 40px;
          min-width: 40px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(
            135deg,
            #2563eb,
            #3b82f6
          );
          box-shadow:
            0 8px 22px
              rgba(37, 99, 235, 0.35);
        }

        .loancontrol-brand-text {
          min-width: 0;
        }

        .loancontrol-brand-name {
          color: #ffffff;
          font-size: 19px;
          line-height: 1;
          font-weight: 850;
          letter-spacing: -0.6px;
          white-space: nowrap;
        }

        .loancontrol-brand-name span {
          color: #60a5fa;
        }

        .loancontrol-brand-subtitle {
          margin-top: 5px;
          color: #94a3b8;
          font-size: 9px;
          line-height: 1;
          font-weight: 600;
          white-space: nowrap;
        }

        .loancontrol-sidebar-line {
          height: 1px;
          margin-top: 17px;
          background: rgba(255, 255, 255, 0.07);
        }

        .loancontrol-mobile-close {
          display: none;
          margin-left: auto;
          width: 38px;
          height: 38px;
          border: 1px solid
            rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.06);
          color: #cbd5e1;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
        }

        .loancontrol-sidebar-scroll {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 15px 11px 12px;
          scrollbar-width: thin;
          scrollbar-color: #334155 transparent;
        }

        .loancontrol-section-title {
          padding: 0 9px 8px;
          color: #64748b;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.14em;
        }

        .loancontrol-admin-title {
          padding-top: 20px;
        }

        .loancontrol-nav {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .loancontrol-nav-item {
          position: relative;
          width: 100%;
          min-height: 42px;
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 0 10px;
          border-radius: 10px;
          color: #cbd5e1;
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
          transition:
            background 0.18s ease,
            color 0.18s ease,
            transform 0.18s ease;
        }

        .loancontrol-nav-item:hover {
          background: rgba(255, 255, 255, 0.07);
          color: #ffffff;
        }

        .loancontrol-nav-item-active {
          color: #ffffff;
          background: linear-gradient(
            135deg,
            rgba(37, 99, 235, 0.25),
            rgba(59, 130, 246, 0.12)
          );
          box-shadow:
            inset 0 0 0 1px
              rgba(96, 165, 250, 0.1);
        }

        .loancontrol-nav-icon {
          width: 22px;
          min-width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .loancontrol-nav-item-active
          .loancontrol-nav-icon {
          color: #60a5fa;
        }

        .loancontrol-nav-label {
          flex: 1;
          min-width: 0;
          line-height: 1.2;
        }

        .loancontrol-nav-arrow {
          color: #60a5fa;
          flex-shrink: 0;
        }

        .loancontrol-master-link {
          min-height: 58px;
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 18px;
          padding: 9px 10px;
          border-radius: 11px;
          color: #dbeafe;
          text-decoration: none;
          background: linear-gradient(
            135deg,
            rgba(37, 99, 235, 0.2),
            rgba(59, 130, 246, 0.08)
          );
          border: 1px solid
            rgba(96, 165, 250, 0.2);
          transition:
            background 0.18s ease,
            border-color 0.18s ease;
        }

        .loancontrol-master-link:hover {
          background: linear-gradient(
            135deg,
            rgba(37, 99, 235, 0.28),
            rgba(59, 130, 246, 0.12)
          );
          border-color: rgba(
            96,
            165,
            250,
            0.32
          );
        }

        .loancontrol-master-icon {
          width: 34px;
          height: 34px;
          min-width: 34px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(37, 99, 235, 0.22);
          color: #60a5fa;
        }

        .loancontrol-master-text {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .loancontrol-master-text span {
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }

        .loancontrol-master-text small {
          color: #94a3b8;
          font-size: 9px;
          white-space: nowrap;
        }

        .loancontrol-master-arrow {
          color: #60a5fa;
          flex-shrink: 0;
        }

        .loancontrol-sidebar-footer {
          flex-shrink: 0;
          padding: 12px 13px 14px;
          border-top: 1px solid
            rgba(255, 255, 255, 0.07);
          background: rgba(2, 6, 23, 0.18);
        }

        .loancontrol-account {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 2px 5px 10px;
        }

        .loancontrol-account-avatar {
          width: 35px;
          height: 35px;
          min-width: 35px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #1e293b;
          border: 1px solid
            rgba(148, 163, 184, 0.15);
          color: #93c5fd;
          font-size: 10px;
          font-weight: 800;
        }

        .loancontrol-account-info {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .loancontrol-account-info strong {
          color: #e2e8f0;
          font-size: 10px;
          font-weight: 700;
        }

        .loancontrol-account-info span {
          color: #64748b;
          font-size: 8px;
        }

        .loancontrol-logout {
          width: 100%;
          min-height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px solid
            rgba(248, 113, 113, 0.15);
          border-radius: 10px;
          background: rgba(127, 29, 29, 0.13);
          color: #fca5a5;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition:
            background 0.18s ease,
            border-color 0.18s ease;
        }

        .loancontrol-logout:hover:not(:disabled) {
          background: rgba(220, 38, 38, 0.18);
          border-color: rgba(
            248,
            113,
            113,
            0.28
          );
        }

        .loancontrol-logout:disabled {
          cursor: wait;
          opacity: 0.6;
        }

        .loancontrol-sidebar-overlay {
          display: none;
        }

        @media (max-width: 900px) {
          .loancontrol-sidebar {
            width: min(320px, 88vw) !important;
            min-width: min(320px, 88vw) !important;
            transform: translateX(-105%);
            transition: transform 0.28s ease;
            box-shadow:
              20px 0 50px
                rgba(2, 6, 23, 0.3);
          }

          .loancontrol-sidebar-open {
            transform: translateX(0);
          }

          .loancontrol-sidebar-overlay {
            position: fixed;
            inset: 0;
            display: block;
            width: 100%;
            height: 100%;
            border: 0;
            padding: 0;
            margin: 0;
            background: rgba(2, 6, 23, 0.55);
            backdrop-filter: blur(2px);
            z-index: 999;
            cursor: pointer;
          }

          .loancontrol-mobile-close {
            display: flex;
          }

          .loancontrol-sidebar-top {
            padding-top: 15px;
          }

          .loancontrol-sidebar-scroll {
            padding-top: 16px;
          }

          .loancontrol-nav-item {
            min-height: 47px;
            font-size: 14px;
            border-radius: 11px;
          }

          .loancontrol-nav-icon {
            width: 24px;
            min-width: 24px;
          }

          .loancontrol-sidebar-footer {
            padding-bottom: 16px;
          }

          .loancontrol-logout {
            min-height: 44px;
            font-size: 12px;
          }
        }

        @media (max-width: 380px) {
          .loancontrol-sidebar {
            width: 88vw !important;
            min-width: 88vw !important;
          }

          .loancontrol-brand-name {
            font-size: 18px;
          }
        }
      `}</style>
    </>
  );
}