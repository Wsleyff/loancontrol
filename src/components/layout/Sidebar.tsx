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
  Sparkles,
  CreditCard,
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
            MARCA
        =================================================== */}

        <div className="loancontrol-brand-area">
          <div className="loancontrol-brand">
            <div className="loancontrol-logo">
              <div className="loancontrol-logo-inner">
                <CreditCard
                  size={22}
                  strokeWidth={2.4}
                />
              </div>
            </div>

            <div className="loancontrol-brand-content">
              <div className="loancontrol-brand-name">
                Loan<span>Control</span>
              </div>

              <div className="loancontrol-brand-caption">
                Plataforma de crédito
              </div>
            </div>

            <button
              type="button"
              className="loancontrol-close-mobile"
              onClick={closeMobileMenu}
              aria-label="Fechar menu"
            >
              <X size={19} />
            </button>
          </div>
        </div>

        {/* ===================================================
            ÁREA DE NAVEGAÇÃO
        =================================================== */}

        <div className="loancontrol-navigation">
          {/* PRINCIPAL */}

          <div className="loancontrol-menu-heading">
            <span>MENU PRINCIPAL</span>
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
                  className={`loancontrol-menu-item ${
                    active
                      ? "loancontrol-menu-item-active"
                      : ""
                  }`}
                >
                  <span
                    className={`loancontrol-menu-icon ${
                      active
                        ? "loancontrol-menu-icon-active"
                        : ""
                    }`}
                  >
                    <Icon
                      size={19}
                      strokeWidth={
                        active ? 2.3 : 1.9
                      }
                    />
                  </span>

                  <span className="loancontrol-menu-text">
                    {item.label}
                  </span>

                  {active && (
                    <span className="loancontrol-active-indicator" />
                  )}

                  <ChevronRight
                    size={15}
                    className="loancontrol-menu-chevron"
                  />
                </Link>
              );
            })}
          </nav>

          {/* ADMINISTRAÇÃO */}

          <div className="loancontrol-menu-heading loancontrol-admin-heading">
            <span>ADMINISTRAÇÃO</span>
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
                  className={`loancontrol-menu-item ${
                    active
                      ? "loancontrol-menu-item-active"
                      : ""
                  }`}
                >
                  <span
                    className={`loancontrol-menu-icon ${
                      active
                        ? "loancontrol-menu-icon-active"
                        : ""
                    }`}
                  >
                    <Icon
                      size={19}
                      strokeWidth={
                        active ? 2.3 : 1.9
                      }
                    />
                  </span>

                  <span className="loancontrol-menu-text">
                    {item.label}
                  </span>

                  {active && (
                    <span className="loancontrol-active-indicator" />
                  )}

                  <ChevronRight
                    size={15}
                    className="loancontrol-menu-chevron"
                  />
                </Link>
              );
            })}
          </nav>

          {/* =================================================
              ÁREA MASTER
          ================================================= */}

          {isMaster && (
            <Link
              href="/master"
              onClick={closeMobileMenu}
              className="loancontrol-master-card"
            >
              <div className="loancontrol-master-glow" />

              <div className="loancontrol-master-icon">
                <ShieldCheck
                  size={19}
                  strokeWidth={2.2}
                />
              </div>

              <div className="loancontrol-master-content">
                <div className="loancontrol-master-title">
                  Área Master
                </div>

                <div className="loancontrol-master-subtitle">
                  Controle da plataforma
                </div>
              </div>

              <ChevronRight
                size={16}
                className="loancontrol-master-chevron"
              />
            </Link>
          )}
        </div>

        {/* ===================================================
            RODAPÉ
        =================================================== */}

        <div className="loancontrol-sidebar-footer">
          {/* PLANO / STATUS */}

          <div className="loancontrol-status-card">
            <div className="loancontrol-status-icon">
              <Sparkles
                size={15}
                strokeWidth={2.3}
              />
            </div>

            <div className="loancontrol-status-content">
              <span className="loancontrol-status-label">
                SISTEMA
              </span>

              <span className="loancontrol-status-value">
                Operação normal
              </span>
            </div>

            <span className="loancontrol-status-dot" />
          </div>

          {/* CONTA */}

          <div className="loancontrol-account">
            <div className="loancontrol-account-avatar">
              LC
            </div>

            <div className="loancontrol-account-content">
              <span className="loancontrol-account-name">
                Minha conta
              </span>

              <span className="loancontrol-account-company">
                LoanControl
              </span>
            </div>
          </div>

          {/* SAIR */}

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="loancontrol-logout"
          >
            <span className="loancontrol-logout-icon">
              <LogOut
                size={17}
                strokeWidth={2}
              />
            </span>

            <span className="loancontrol-logout-text">
              {loggingOut
                ? "Encerrando sessão..."
                : "Sair da conta"}
            </span>
          </button>

          <div className="loancontrol-version">
            LoanControl • Plataforma de gestão
          </div>
        </div>
      </aside>

      <style jsx>{`
        /* =====================================================
           SIDEBAR PRINCIPAL
        ===================================================== */

        .loancontrol-sidebar {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          width: 250px;
          min-width: 250px;

          display: flex;
          flex-direction: column;

          background:
            radial-gradient(
              circle at 15% 0%,
              rgba(37, 99, 235, 0.16),
              transparent 30%
            ),
            linear-gradient(
              180deg,
              #0b1220 0%,
              #0f172a 45%,
              #0b1220 100%
            );

          color: #ffffff;

          border-right: 1px solid
            rgba(148, 163, 184, 0.09);

          box-shadow:
            14px 0 45px
              rgba(15, 23, 42, 0.08);

          z-index: 1000;

          overflow: hidden;
        }

        /* =====================================================
           MARCA
        ===================================================== */

        .loancontrol-brand-area {
          flex-shrink: 0;
          padding: 21px 17px 18px;
        }

        .loancontrol-brand {
          min-height: 48px;

          display: flex;
          align-items: center;

          gap: 11px;
        }

        .loancontrol-logo {
          width: 42px;
          height: 42px;
          min-width: 42px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 13px;

          background:
            linear-gradient(
              145deg,
              #2563eb,
              #3b82f6
            );

          box-shadow:
            0 10px 28px
              rgba(37, 99, 235, 0.35);

          position: relative;
        }

        .loancontrol-logo::after {
          content: "";

          position: absolute;
          inset: 1px;

          border-radius: 12px;

          border: 1px solid
            rgba(255, 255, 255, 0.18);

          pointer-events: none;
        }

        .loancontrol-logo-inner {
          display: flex;
          align-items: center;
          justify-content: center;

          color: #ffffff;
        }

        .loancontrol-brand-content {
          min-width: 0;
          flex: 1;
        }

        .loancontrol-brand-name {
          font-size: 19px;
          line-height: 1;

          font-weight: 850;

          letter-spacing: -0.75px;

          color: #ffffff;

          white-space: nowrap;
        }

        .loancontrol-brand-name span {
          color: #60a5fa;
        }

        .loancontrol-brand-caption {
          margin-top: 6px;

          color: #64748b;

          font-size: 9px;
          line-height: 1;

          font-weight: 700;

          letter-spacing: 0.02em;

          white-space: nowrap;
        }

        .loancontrol-close-mobile {
          display: none;

          width: 36px;
          height: 36px;
          min-width: 36px;

          align-items: center;
          justify-content: center;

          border: 1px solid
            rgba(255, 255, 255, 0.1);

          border-radius: 10px;

          background:
            rgba(255, 255, 255, 0.06);

          color: #cbd5e1;

          cursor: pointer;
        }

        /* =====================================================
           NAVEGAÇÃO
        ===================================================== */

        .loancontrol-navigation {
          flex: 1;
          min-height: 0;

          overflow-y: auto;
          overflow-x: hidden;

          padding: 2px 11px 14px;

          scrollbar-width: thin;
          scrollbar-color:
            #334155
            transparent;
        }

        .loancontrol-menu-heading {
          padding:
            8px 10px 8px;

          color: #475569;

          font-size: 8px;

          font-weight: 850;

          letter-spacing: 0.16em;
        }

        .loancontrol-admin-heading {
          margin-top: 18px;
        }

        .loancontrol-nav {
          display: flex;
          flex-direction: column;

          gap: 3px;
        }

        /* =====================================================
           ITEM
        ===================================================== */

        .loancontrol-menu-item {
          position: relative;

          width: 100%;
          min-height: 43px;

          display: flex;
          align-items: center;

          gap: 11px;

          padding:
            0 10px;

          border-radius: 11px;

          color: #94a3b8;

          text-decoration: none;

          font-size: 12.5px;

          font-weight: 650;

          letter-spacing: -0.05px;

          transition:
            background 0.18s ease,
            color 0.18s ease,
            transform 0.18s ease;
        }

        .loancontrol-menu-item:hover {
          background:
            rgba(255, 255, 255, 0.055);

          color: #f8fafc;

          transform:
            translateX(2px);
        }

        .loancontrol-menu-item-active {
          color: #ffffff;

          background:
            linear-gradient(
              100deg,
              rgba(37, 99, 235, 0.22),
              rgba(37, 99, 235, 0.08)
            );

          box-shadow:
            inset 0 0 0 1px
              rgba(96, 165, 250, 0.08);
        }

        .loancontrol-menu-icon {
          width: 31px;
          height: 31px;
          min-width: 31px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 9px;

          color: #64748b;

          transition:
            background 0.18s ease,
            color 0.18s ease;
        }

        .loancontrol-menu-icon-active {
          color: #60a5fa;

          background:
            rgba(37, 99, 235, 0.16);
        }

        .loancontrol-menu-text {
          flex: 1;
          min-width: 0;

          line-height: 1.2;

          white-space: nowrap;
        }

        .loancontrol-menu-chevron {
          flex-shrink: 0;

          color: #334155;

          opacity: 0;

          transform:
            translateX(-3px);

          transition:
            opacity 0.18s ease,
            transform 0.18s ease,
            color 0.18s ease;
        }

        .loancontrol-menu-item:hover
          .loancontrol-menu-chevron {
          opacity: 1;

          transform:
            translateX(0);

          color: #64748b;
        }

        .loancontrol-menu-item-active
          .loancontrol-menu-chevron {
          opacity: 1;

          transform:
            translateX(0);

          color: #60a5fa;
        }

        .loancontrol-active-indicator {
          position: absolute;

          left: 0;
          top: 50%;

          width: 3px;
          height: 22px;

          transform:
            translateY(-50%);

          border-radius:
            0 4px 4px 0;

          background:
            linear-gradient(
              180deg,
              #60a5fa,
              #2563eb
            );

          box-shadow:
            0 0 12px
              rgba(59, 130, 246, 0.5);
        }

        /* =====================================================
           MASTER
        ===================================================== */

        .loancontrol-master-card {
          position: relative;

          min-height: 62px;

          display: flex;
          align-items: center;

          gap: 10px;

          margin:
            21px 1px 2px;

          padding:
            9px 10px;

          border-radius: 13px;

          overflow: hidden;

          color: #dbeafe;

          text-decoration: none;

          background:
            linear-gradient(
              135deg,
              rgba(37, 99, 235, 0.19),
              rgba(30, 64, 175, 0.08)
            );

          border: 1px solid
            rgba(96, 165, 250, 0.16);

          transition:
            background 0.2s ease,
            border-color 0.2s ease,
            transform 0.2s ease;
        }

        .loancontrol-master-card:hover {
          background:
            linear-gradient(
              135deg,
              rgba(37, 99, 235, 0.27),
              rgba(30, 64, 175, 0.12)
            );

          border-color:
            rgba(96, 165, 250, 0.28);

          transform:
            translateY(-1px);
        }

        .loancontrol-master-glow {
          position: absolute;

          width: 90px;
          height: 90px;

          right: -45px;
          top: -40px;

          border-radius: 50%;

          background:
            rgba(59, 130, 246, 0.18);

          filter:
            blur(20px);

          pointer-events: none;
        }

        .loancontrol-master-icon {
          width: 34px;
          height: 34px;
          min-width: 34px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 10px;

          color: #60a5fa;

          background:
            rgba(37, 99, 235, 0.18);

          border: 1px solid
            rgba(96, 165, 250, 0.12);
        }

        .loancontrol-master-content {
          min-width: 0;
          flex: 1;

          display: flex;
          flex-direction: column;

          gap: 3px;
        }

        .loancontrol-master-title {
          color: #e0edff;

          font-size: 11px;

          font-weight: 800;

          white-space: nowrap;
        }

        .loancontrol-master-subtitle {
          color: #64748b;

          font-size: 8px;

          font-weight: 600;

          white-space: nowrap;
        }

        .loancontrol-master-chevron {
          color: #60a5fa;

          flex-shrink: 0;
        }

        /* =====================================================
           RODAPÉ
        ===================================================== */

        .loancontrol-sidebar-footer {
          flex-shrink: 0;

          padding:
            12px 12px 13px;

          border-top: 1px solid
            rgba(148, 163, 184, 0.08);

          background:
            linear-gradient(
              180deg,
              rgba(2, 6, 23, 0.12),
              rgba(2, 6, 23, 0.3)
            );
        }

        /* STATUS */

        .loancontrol-status-card {
          min-height: 43px;

          display: flex;
          align-items: center;

          gap: 9px;

          padding:
            6px 8px;

          margin-bottom: 10px;

          border-radius: 10px;

          background:
            rgba(15, 23, 42, 0.52);

          border: 1px solid
            rgba(148, 163, 184, 0.07);
        }

        .loancontrol-status-icon {
          width: 28px;
          height: 28px;
          min-width: 28px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 8px;

          color: #93c5fd;

          background:
            rgba(37, 99, 235, 0.12);
        }

        .loancontrol-status-content {
          min-width: 0;
          flex: 1;

          display: flex;
          flex-direction: column;

          gap: 2px;
        }

        .loancontrol-status-label {
          color: #475569;

          font-size: 7px;

          font-weight: 850;

          letter-spacing: 0.12em;
        }

        .loancontrol-status-value {
          color: #94a3b8;

          font-size: 9px;

          font-weight: 650;

          white-space: nowrap;
        }

        .loancontrol-status-dot {
          width: 7px;
          height: 7px;
          min-width: 7px;

          border-radius: 50%;

          background: #22c55e;

          box-shadow:
            0 0 0 3px
              rgba(34, 197, 94, 0.09),
            0 0 10px
              rgba(34, 197, 94, 0.3);
        }

        /* CONTA */

        .loancontrol-account {
          display: flex;
          align-items: center;

          gap: 9px;

          padding:
            4px 5px 10px;
        }

        .loancontrol-account-avatar {
          width: 35px;
          height: 35px;
          min-width: 35px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 10px;

          background:
            linear-gradient(
              145deg,
              #1e3a8a,
              #172554
            );

          border: 1px solid
            rgba(96, 165, 250, 0.15);

          color: #bfdbfe;

          font-size: 10px;

          font-weight: 850;

          box-shadow:
            0 5px 14px
              rgba(2, 6, 23, 0.2);
        }

        .loancontrol-account-content {
          min-width: 0;

          display: flex;
          flex-direction: column;

          gap: 3px;
        }

        .loancontrol-account-name {
          color: #e2e8f0;

          font-size: 10px;

          font-weight: 750;

          white-space: nowrap;
        }

        .loancontrol-account-company {
          color: #64748b;

          font-size: 8px;

          font-weight: 600;

          white-space: nowrap;
        }

        /* SAIR */

        .loancontrol-logout {
          width: 100%;
          min-height: 39px;

          display: flex;
          align-items: center;
          justify-content: center;

          gap: 8px;

          border:
            1px solid
            rgba(248, 113, 113, 0.1);

          border-radius: 10px;

          background:
            rgba(127, 29, 29, 0.08);

          color: #fca5a5;

          cursor: pointer;

          transition:
            background 0.18s ease,
            border-color 0.18s ease,
            color 0.18s ease;
        }

        .loancontrol-logout-icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .loancontrol-logout-text {
          font-size: 10px;

          font-weight: 750;
        }

        .loancontrol-logout:hover:not(:disabled) {
          background:
            rgba(220, 38, 38, 0.13);

          border-color:
            rgba(248, 113, 113, 0.22);

          color: #fecaca;
        }

        .loancontrol-logout:disabled {
          opacity: 0.55;

          cursor: wait;
        }

        .loancontrol-version {
          margin-top: 9px;

          text-align: center;

          color: #334155;

          font-size: 7px;

          font-weight: 600;

          white-space: nowrap;
        }

        /* =====================================================
           MOBILE
        ===================================================== */

        .loancontrol-sidebar-overlay {
          display: none;
        }

        @media (max-width: 900px) {
          .loancontrol-sidebar {
            width: min(330px, 88vw) !important;
            min-width: min(330px, 88vw) !important;

            transform:
              translateX(-105%);

            transition:
              transform 0.28s
              cubic-bezier(
                0.22,
                1,
                0.36,
                1
              );

            box-shadow:
              25px 0 70px
                rgba(2, 6, 23, 0.42);
          }

          .loancontrol-sidebar-open {
            transform:
              translateX(0);
          }

          .loancontrol-sidebar-overlay {
            position: fixed;

            inset: 0;

            display: block;

            width: 100%;
            height: 100%;

            padding: 0;
            margin: 0;

            border: 0;

            background:
              rgba(2, 6, 23, 0.58);

            backdrop-filter:
              blur(3px);

            -webkit-backdrop-filter:
              blur(3px);

            z-index: 999;

            cursor: pointer;
          }

          .loancontrol-brand-area {
            padding:
              16px 16px 17px;
          }

          .loancontrol-close-mobile {
            display: flex;
          }

          .loancontrol-navigation {
            padding:
              2px 12px 16px;
          }

          .loancontrol-menu-heading {
            padding:
              9px 10px 9px;
          }

          .loancontrol-menu-item {
            min-height: 48px;

            border-radius: 12px;

            font-size: 14px;
          }

          .loancontrol-menu-icon {
            width: 34px;
            height: 34px;
            min-width: 34px;
          }

          .loancontrol-menu-chevron {
            opacity: 1;

            transform:
              translateX(0);

            color: #475569;
          }

          .loancontrol-menu-item-active
            .loancontrol-menu-chevron {
            color: #60a5fa;
          }

          .loancontrol-admin-heading {
            margin-top: 20px;
          }

          .loancontrol-sidebar-footer {
            padding:
              13px 13px 15px;
          }

          .loancontrol-status-card {
            min-height: 46px;
          }

          .loancontrol-logout {
            min-height: 44px;
          }

          .loancontrol-logout-text {
            font-size: 12px;
          }

          .loancontrol-version {
            font-size: 7px;
          }
        }

        @media (max-width: 380px) {
          .loancontrol-sidebar {
            width: 90vw !important;
            min-width: 90vw !important;
          }

          .loancontrol-brand-name {
            font-size: 18px;
          }

          .loancontrol-brand-caption {
            font-size: 8px;
          }
        }
      `}</style>
    </>
  );
}