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
  Menu,
  X,
  LogOut,
  ShieldCheck,
} from "lucide-react";

import { useEffect, useState } from "react";
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

export function Sidebar() {
  const [open, setOpen] = useState(false);
  const [isMaster, setIsMaster] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    async function verificarMaster() {
      try {
        const response = await fetch("/api/master/status", {
          method: "GET",
          cache: "no-store",
        });

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
      console.error("Erro ao sair da conta:", error);
    } finally {
      window.location.href = "/login";
    }
  }

  function closeMobileMenu() {
    setOpen(false);
  }

  return (
    <>
      {/* =====================================================
          BOTÃO MOBILE
      ===================================================== */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Fechar menu" : "Abrir menu"}
        style={{
          position: "fixed",
          top: 14,
          left: 14,
          width: 42,
          height: 42,
          borderRadius: 11,
          border: "1px solid #e2e8f0",
          background: "#ffffff",
          color: "#0f172a",
          display: "none",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 1001,
          boxShadow: "0 8px 25px rgba(15,23,42,.12)",
        }}
        className="loancontrol-mobile-menu"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* =====================================================
          OVERLAY MOBILE
      ===================================================== */}
      {open && (
        <button
          type="button"
          onClick={closeMobileMenu}
          aria-label="Fechar menu"
          style={{
            position: "fixed",
            inset: 0,
            border: 0,
            background: "rgba(15,23,42,.45)",
            zIndex: 999,
            cursor: "pointer",
          }}
        />
      )}

      {/* =====================================================
          SIDEBAR
      ===================================================== */}
      <aside
        className={`loancontrol-sidebar ${
          open ? "loancontrol-sidebar-open" : ""
        }`}
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          width: 250,
          minWidth: 250,
          background:
            "linear-gradient(180deg, #0f172a 0%, #111827 55%, #0b1220 100%)",
          color: "#ffffff",
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          borderRight: "1px solid rgba(255,255,255,.07)",
          boxShadow: "10px 0 35px rgba(15,23,42,.08)",
          overflow: "hidden",
        }}
      >
        {/* =================================================
            LOGO
        ================================================= */}
        <div
          style={{
            padding: "20px 18px 16px",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
            }}
          >
            <div
              style={{
                width: 39,
                height: 39,
                minWidth: 39,
                borderRadius: 11,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                  "linear-gradient(135deg,#2563eb,#3b82f6)",
                boxShadow:
                  "0 8px 22px rgba(37,99,235,.35)",
              }}
            >
              <Wallet size={20} strokeWidth={2.2} />
            </div>

            <div
              style={{
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontSize: 19,
                  lineHeight: 1,
                  fontWeight: 850,
                  letterSpacing: "-.5px",
                  whiteSpace: "nowrap",
                }}
              >
                Loan
                <span
                  style={{
                    color: "#60a5fa",
                  }}
                >
                  Control
                </span>
              </div>

              <div
                style={{
                  marginTop: 5,
                  fontSize: 9,
                  color: "#94a3b8",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                Gestão de crédito
              </div>
            </div>
          </div>

          <div
            style={{
              height: 1,
              background: "rgba(255,255,255,.07)",
              marginTop: 17,
            }}
          />
        </div>

        {/* =================================================
            MENU SCROLL
        ================================================= */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            padding: "0 11px 10px",
            scrollbarWidth: "thin",
          }}
        >
          {/* ===============================================
              PRINCIPAL
          =============================================== */}
          <div
            style={{
              padding: "2px 8px 8px",
              fontSize: 9,
              fontWeight: 800,
              color: "#64748b",
              letterSpacing: ".13em",
            }}
          >
            PRINCIPAL
          </div>

          {mainItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobileMenu}
                style={{
                  display: "flex",
                  width: "100%",
                  height: 39,
                  boxSizing: "border-box",
                  alignItems: "center",
                  gap: 11,
                  padding: "0 10px",
                  marginBottom: 2,
                  borderRadius: 9,
                  color: "#cbd5e1",
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  transition:
                    "background .18s ease,color .18s ease,transform .18s ease",
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.background =
                    "rgba(255,255,255,.07)";
                  event.currentTarget.style.color = "#ffffff";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.background =
                    "transparent";
                  event.currentTarget.style.color =
                    "#cbd5e1";
                }}
              >
                <span
                  style={{
                    width: 20,
                    minWidth: 20,
                    height: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon
                    size={17}
                    strokeWidth={1.9}
                  />
                </span>

                <span
                  style={{
                    display: "block",
                    lineHeight: "39px",
                  }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* ===============================================
              ADMINISTRAÇÃO
          =============================================== */}
          <div
            style={{
              padding: "18px 8px 8px",
              fontSize: 9,
              fontWeight: 800,
              color: "#64748b",
              letterSpacing: ".13em",
            }}
          >
            ADMINISTRAÇÃO
          </div>

          {adminItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobileMenu}
                style={{
                  display: "flex",
                  width: "100%",
                  height: 39,
                  boxSizing: "border-box",
                  alignItems: "center",
                  gap: 11,
                  padding: "0 10px",
                  marginBottom: 2,
                  borderRadius: 9,
                  color: "#cbd5e1",
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  transition:
                    "background .18s ease,color .18s ease",
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.background =
                    "rgba(255,255,255,.07)";
                  event.currentTarget.style.color = "#ffffff";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.background =
                    "transparent";
                  event.currentTarget.style.color =
                    "#cbd5e1";
                }}
              >
                <span
                  style={{
                    width: 20,
                    minWidth: 20,
                    height: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon
                    size={17}
                    strokeWidth={1.9}
                  />
                </span>

                <span
                  style={{
                    display: "block",
                    lineHeight: "39px",
                  }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* ===============================================
              ÁREA MASTER
          =============================================== */}
          {isMaster && (
            <Link
              href="/master"
              onClick={closeMobileMenu}
              style={{
                display: "flex",
                alignItems: "center",
                width: "100%",
                minHeight: 54,
                boxSizing: "border-box",
                gap: 10,
                marginTop: 10,
                padding: "8px 10px",
                borderRadius: 10,
                textDecoration: "none",
                color: "#dbeafe",
                background:
                  "linear-gradient(135deg,rgba(37,99,235,.20),rgba(59,130,246,.08))",
                border:
                  "1px solid rgba(96,165,250,.20)",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  minWidth: 32,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background:
                    "rgba(37,99,235,.22)",
                  color: "#60a5fa",
                }}
              >
                <ShieldCheck size={17} />
              </div>

              <div
                style={{
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                  }}
                >
                  Área Master
                </span>

                <span
                  style={{
                    fontSize: 9,
                    color: "#94a3b8",
                    whiteSpace: "nowrap",
                  }}
                >
                  Controle da plataforma
                </span>
              </div>
            </Link>
          )}
        </div>

        {/* =================================================
            RODAPÉ
        ================================================= */}
        <div
          style={{
            flexShrink: 0,
            padding: "11px 13px 14px",
            borderTop:
              "1px solid rgba(255,255,255,.07)",
            background:
              "rgba(2,6,23,.18)",
          }}
        >
          {/* CONTA */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "3px 5px 9px",
            }}
          >
            <div
              style={{
                width: 33,
                height: 33,
                minWidth: 33,
                borderRadius: 9,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#1e293b",
                border:
                  "1px solid rgba(148,163,184,.15)",
                color: "#93c5fd",
                fontSize: 10,
                fontWeight: 800,
              }}
            >
              LC
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                minWidth: 0,
              }}
            >
              <strong
                style={{
                  fontSize: 10,
                  color: "#e2e8f0",
                  fontWeight: 700,
                }}
              >
                Conta ativa
              </strong>

              <span
                style={{
                  fontSize: 8,
                  color: "#64748b",
                }}
              >
                LoanControl
              </span>
            </div>
          </div>

          {/* LOGOUT */}
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            style={{
              width: "100%",
              height: 38,
              border:
                "1px solid rgba(248,113,113,.15)",
              borderRadius: 9,
              background:
                "rgba(127,29,29,.13)",
              color: "#fca5a5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontSize: 11,
              fontWeight: 700,
              cursor: loggingOut
                ? "wait"
                : "pointer",
              opacity: loggingOut ? 0.6 : 1,
              transition:
                "background .18s ease,border .18s ease",
            }}
            onMouseEnter={(event) => {
              if (!loggingOut) {
                event.currentTarget.style.background =
                  "rgba(220,38,38,.18)";
                event.currentTarget.style.borderColor =
                  "rgba(248,113,113,.28)";
              }
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.background =
                "rgba(127,29,29,.13)";
              event.currentTarget.style.borderColor =
                "rgba(248,113,113,.15)";
            }}
          >
            <LogOut size={16} />

            <span>
              {loggingOut
                ? "Saindo..."
                : "Sair da conta"}
            </span>
          </button>
        </div>
      </aside>

      <style jsx>{`
        @media (max-width: 900px) {
          .loancontrol-mobile-menu {
            display: flex !important;
          }

          .loancontrol-sidebar {
            transform: translateX(-100%);
            transition: transform 0.25s ease;
          }

          .loancontrol-sidebar-open {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}