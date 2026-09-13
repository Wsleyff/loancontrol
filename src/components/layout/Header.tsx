"use client";

import {
  Bell,
  ChevronDown,
  Menu,
  Search,
  HelpCircle,
} from "lucide-react";

type HeaderProps = {
  onMobileMenuOpen?: () => void;
};

export function Header({
  onMobileMenuOpen,
}: HeaderProps) {
  return (
    <header className="loancontrol-header">
      {/* =====================================================
          ESQUERDA
      ===================================================== */}
      <div className="loancontrol-header-left">
        <button
          type="button"
          className="loancontrol-header-menu"
          onClick={onMobileMenuOpen}
          aria-label="Abrir menu"
        >
          <Menu size={21} />
        </button>

        <div className="loancontrol-header-company">
          <div className="loancontrol-header-company-name">
            Minha empresa
          </div>

          <div className="loancontrol-header-company-sub">
            <span className="loancontrol-status-dot" />
            Carteira principal
          </div>
        </div>
      </div>

      {/* =====================================================
          CENTRO / BUSCA
      ===================================================== */}
      <div className="loancontrol-header-search">
        <Search size={17} />

        <input
          type="text"
          placeholder="Buscar clientes, empréstimos..."
          aria-label="Buscar"
        />

        <span className="loancontrol-search-shortcut">
          Ctrl K
        </span>
      </div>

      {/* =====================================================
          DIREITA
      ===================================================== */}
      <div className="loancontrol-header-right">
        <button
          type="button"
          className="loancontrol-header-icon-button loancontrol-help-button"
          aria-label="Ajuda"
        >
          <HelpCircle size={19} />
        </button>

        <button
          type="button"
          className="loancontrol-header-icon-button loancontrol-notification-button"
          aria-label="Notificações"
        >
          <Bell size={19} />
          <span className="loancontrol-notification-dot" />
        </button>

        <button
          type="button"
          className="loancontrol-profile"
          aria-label="Abrir perfil"
        >
          <div className="loancontrol-profile-avatar">
            AD
          </div>

          <div className="loancontrol-profile-info">
            <strong>Administrador</strong>
            <span>Conta principal</span>
          </div>

          <ChevronDown
            size={16}
            className="loancontrol-profile-chevron"
          />
        </button>
      </div>

      <style jsx>{`
        .loancontrol-header {
          position: sticky;
          top: 0;
          z-index: 900;
          width: 100%;
          min-height: 68px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 0 24px;
          background: rgba(255, 255, 255, 0.96);
          border-bottom: 1px solid #e2e8f0;
          backdrop-filter: blur(12px);
        }

        .loancontrol-header-left {
          min-width: 180px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .loancontrol-header-company {
          min-width: 0;
        }

        .loancontrol-header-company-name {
          color: #0f172a;
          font-size: 14px;
          line-height: 1.2;
          font-weight: 800;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .loancontrol-header-company-sub {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 4px;
          color: #64748b;
          font-size: 11px;
          line-height: 1;
          font-weight: 500;
          white-space: nowrap;
        }

        .loancontrol-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 0 3px
            rgba(34, 197, 94, 0.1);
        }

        .loancontrol-header-search {
          width: min(390px, 34vw);
          height: 40px;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 0 11px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background: #f8fafc;
          color: #94a3b8;
          transition:
            border-color 0.18s ease,
            background 0.18s ease,
            box-shadow 0.18s ease;
        }

        .loancontrol-header-search:focus-within {
          background: #ffffff;
          border-color: #93c5fd;
          box-shadow: 0 0 0 3px
            rgba(59, 130, 246, 0.08);
        }

        .loancontrol-header-search input {
          flex: 1;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: #0f172a;
          font-family: inherit;
          font-size: 12px;
        }

        .loancontrol-header-search input::placeholder {
          color: #94a3b8;
        }

        .loancontrol-search-shortcut {
          flex-shrink: 0;
          padding: 3px 6px;
          border: 1px solid #e2e8f0;
          border-radius: 5px;
          background: #ffffff;
          color: #94a3b8;
          font-size: 9px;
          font-weight: 700;
        }

        .loancontrol-header-right {
          min-width: 250px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
        }

        .loancontrol-header-icon-button {
          position: relative;
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid transparent;
          border-radius: 10px;
          background: transparent;
          color: #64748b;
          cursor: pointer;
          transition:
            background 0.18s ease,
            color 0.18s ease,
            border-color 0.18s ease;
        }

        .loancontrol-header-icon-button:hover {
          background: #f8fafc;
          border-color: #e2e8f0;
          color: #0f172a;
        }

        .loancontrol-notification-dot {
          position: absolute;
          top: 7px;
          right: 7px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #ef4444;
          border: 2px solid #ffffff;
        }

        .loancontrol-profile {
          min-height: 44px;
          display: flex;
          align-items: center;
          gap: 9px;
          margin-left: 5px;
          padding: 4px 7px 4px 4px;
          border: 1px solid transparent;
          border-radius: 11px;
          background: transparent;
          cursor: pointer;
          transition:
            background 0.18s ease,
            border-color 0.18s ease;
        }

        .loancontrol-profile:hover {
          background: #f8fafc;
          border-color: #e2e8f0;
        }

        .loancontrol-profile-avatar {
          width: 34px;
          height: 34px;
          min-width: 34px;
          display: grid;
          place-items: center;
          border-radius: 9px;
          background: linear-gradient(
            135deg,
            #dbeafe,
            #bfdbfe
          );
          color: #1d4ed8;
          font-size: 10px;
          font-weight: 850;
        }

        .loancontrol-profile-info {
          min-width: 0;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 2px;
        }

        .loancontrol-profile-info strong {
          max-width: 125px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #0f172a;
          font-size: 11px;
          font-weight: 800;
        }

        .loancontrol-profile-info span {
          color: #94a3b8;
          font-size: 9px;
          white-space: nowrap;
        }

        .loancontrol-profile-chevron {
          color: #94a3b8;
          margin-left: 2px;
        }

        .loancontrol-header-menu {
          display: none;
          width: 40px;
          height: 40px;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background: #ffffff;
          color: #0f172a;
          cursor: pointer;
        }

        @media (max-width: 1200px) {
          .loancontrol-header {
            padding: 0 20px;
          }

          .loancontrol-header-search {
            width: min(320px, 30vw);
          }

          .loancontrol-profile-info {
            display: none;
          }

          .loancontrol-header-right {
            min-width: auto;
          }
        }

        @media (max-width: 900px) {
          .loancontrol-header {
            min-height: 62px;
            height: 62px;
            padding: 0 14px;
            gap: 10px;
          }

          .loancontrol-header-menu {
            display: flex;
          }

          .loancontrol-header-left {
            min-width: 0;
            flex: 1;
          }

          .loancontrol-header-company-name {
            font-size: 13px;
          }

          .loancontrol-header-company-sub {
            font-size: 10px;
          }

          .loancontrol-header-search {
            display: none;
          }

          .loancontrol-header-right {
            min-width: auto;
            flex-shrink: 0;
            gap: 2px;
          }

          .loancontrol-help-button {
            display: none;
          }

          .loancontrol-header-icon-button {
            width: 38px;
            height: 38px;
          }

          .loancontrol-profile {
            margin-left: 2px;
            padding: 2px;
            border: 0;
          }

          .loancontrol-profile-avatar {
            width: 36px;
            height: 36px;
            min-width: 36px;
            border-radius: 10px;
          }

          .loancontrol-profile-chevron {
            display: none;
          }
        }

        @media (max-width: 600px) {
          .loancontrol-header {
            padding: 0 10px;
          }

          .loancontrol-header-company-name {
            max-width: 125px;
          }

          .loancontrol-header-company-sub {
            max-width: 125px;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .loancontrol-status-dot {
            width: 5px;
            height: 5px;
            min-width: 5px;
          }
        }

        @media (max-width: 380px) {
          .loancontrol-header-company-name {
            max-width: 100px;
          }

          .loancontrol-header-company-sub {
            display: none;
          }

          .loancontrol-header-menu,
          .loancontrol-header-icon-button {
            width: 36px;
            height: 36px;
          }

          .loancontrol-profile-avatar {
            width: 34px;
            height: 34px;
            min-width: 34px;
          }
        }
      `}</style>
    </header>
  );
}