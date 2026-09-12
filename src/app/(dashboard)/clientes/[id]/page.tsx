"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Users,
  UserCheck,
  UserX,
  ShieldAlert,
  Eye,
  Pencil,
  MessageCircle,
  Phone,
  RefreshCw,
  Filter,
  ChevronRight,
  KeyRound,
  EyeOff,
} from "lucide-react";

import { listCustomers } from "@/services/customers.service";
import { Customer } from "@/types/customer";

type StatusFiltro = "TODOS" | "ACTIVE" | "INACTIVE" | "BLOCKED";

function getInitials(name: string) {
  if (!name) return "?";

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatCPF(cpf?: string | null) {
  if (!cpf) return "—";

  const numbers = cpf.replace(/\D/g, "");

  if (numbers.length === 11) {
    return numbers.replace(
      /(\d{3})(\d{3})(\d{3})(\d{2})/,
      "$1.$2.$3-$4"
    );
  }

  return cpf;
}

function formatPhone(phone?: string | null) {
  if (!phone) return "—";

  const numbers = phone.replace(/\D/g, "");

  if (numbers.length === 11) {
    return numbers.replace(
      /(\d{2})(\d{5})(\d{4})/,
      "($1) $2-$3"
    );
  }

  if (numbers.length === 10) {
    return numbers.replace(
      /(\d{2})(\d{4})(\d{4})/,
      "($1) $2-$3"
    );
  }

  return phone;
}

function getStatusLabel(status?: string) {
  switch (status) {
    case "ACTIVE":
      return "Ativo";

    case "INACTIVE":
      return "Inativo";

    case "BLOCKED":
      return "Bloqueado";

    default:
      return status || "Ativo";
  }
}

function getStatusClass(status?: string) {
  switch (status) {
    case "ACTIVE":
      return "status-active";

    case "INACTIVE":
      return "status-inactive";

    case "BLOCKED":
      return "status-blocked";

    default:
      return "status-active";
  }
}

function whatsappLink(phone?: string | null) {
  if (!phone) return "#";

  const numbers = phone.replace(/\D/g, "");

  if (!numbers) return "#";

  const normalized = numbers.startsWith("55")
    ? numbers
    : `55${numbers}`;

  return `https://wa.me/${normalized}`;
}

export default function Clientes() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] =
    useState<StatusFiltro>("TODOS");

  const [clienteAcesso, setClienteAcesso] = useState<Customer | null>(null);
  const [senhaTemporaria, setSenhaTemporaria] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [criandoAcesso, setCriandoAcesso] = useState(false);
  const [erroAcesso, setErroAcesso] = useState("");

  function abrirModalAcesso(cliente: Customer) {
    setClienteAcesso(cliente);
    setSenhaTemporaria("");
    setMostrarSenha(false);
    setErroAcesso("");
  }

  function fecharModalAcesso() {
    if (criandoAcesso) return;
    setClienteAcesso(null);
    setSenhaTemporaria("");
    setMostrarSenha(false);
    setErroAcesso("");
  }

  async function liberarAcesso() {
    if (!clienteAcesso) return;

    const senha = senhaTemporaria.trim();

    if (!clienteAcesso.email) {
      setErroAcesso("Cadastre um e-mail para este cliente antes de liberar o acesso.");
      return;
    }

    if (senha.length < 6) {
      setErroAcesso("A senha temporária precisa ter pelo menos 6 caracteres.");
      return;
    }

    try {
      setCriandoAcesso(true);
      setErroAcesso("");

      const response = await fetch("/api/clientes/criar-acesso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: clienteAcesso.id,
          temporaryPassword: senha,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "Não foi possível liberar o acesso.");
      }

      const nome = clienteAcesso.full_name;
      setClienteAcesso(null);
      setSenhaTemporaria("");
      setMostrarSenha(false);
      await carregarClientes();

      alert(data?.message || `Acesso liberado para ${nome}.`);
    } catch (error) {
      console.error("Erro ao liberar acesso:", error);
      setErroAcesso(
        error instanceof Error
          ? error.message
          : "Não foi possível liberar o acesso."
      );
    } finally {
      setCriandoAcesso(false);
    }
  }

  async function carregarClientes() {
    try {
      setLoading(true);
      setErro("");

      const clientes = await listCustomers();

      setRows(Array.isArray(clientes) ? clientes : []);
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
      setErro(
        "Não foi possível carregar os clientes. Verifique sua conexão com o Supabase."
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarClientes();
  }, []);

  const clientesFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return rows.filter((cliente) => {
      const correspondeStatus =
        statusFiltro === "TODOS" ||
        cliente.status === statusFiltro;

      if (!correspondeStatus) {
        return false;
      }

      if (!termo) {
        return true;
      }

      const nome = cliente.full_name?.toLowerCase() || "";
      const cpf = cliente.cpf?.toLowerCase() || "";
      const telefone = cliente.phone?.toLowerCase() || "";
      const whatsapp = cliente.whatsapp?.toLowerCase() || "";
      const email = cliente.email?.toLowerCase() || "";

      return (
        nome.includes(termo) ||
        cpf.includes(termo) ||
        telefone.includes(termo) ||
        whatsapp.includes(termo) ||
        email.includes(termo)
      );
    });
  }, [rows, busca, statusFiltro]);

  const estatisticas = useMemo(() => {
    const ativos = rows.filter(
      (cliente) => cliente.status === "ACTIVE"
    ).length;

    const inativos = rows.filter(
      (cliente) => cliente.status === "INACTIVE"
    ).length;

    const bloqueados = rows.filter(
      (cliente) => cliente.status === "BLOCKED"
    ).length;

    return {
      total: rows.length,
      ativos,
      inativos,
      bloqueados,
    };
  }, [rows]);

  return (
    <main className="clientes-page">
      <style jsx>{`
        .clientes-page {
          padding: 28px;
          min-height: 100%;
          background: #f8fafc;
        }

        .clientes-container {
          max-width: 1500px;
          margin: 0 auto;
        }

        .topo {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 28px;
        }

        .titulo-area h1 {
          margin: 0;
          font-size: 30px;
          font-weight: 800;
          letter-spacing: -0.8px;
          color: #0f172a;
        }

        .titulo-area p {
          margin: 7px 0 0;
          color: #64748b;
          font-size: 14px;
        }

        .btn-novo {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 11px 17px;
          border-radius: 10px;
          background: #2563eb;
          color: white;
          text-decoration: none;
          font-size: 14px;
          font-weight: 700;
          box-shadow: 0 5px 14px rgba(37, 99, 235, 0.18);
          transition: 0.2s;
        }

        .btn-novo:hover {
          background: #1d4ed8;
          transform: translateY(-1px);
        }

        .cards {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 22px;
        }

        .stat-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: 108px;
          box-shadow: 0 2px 7px rgba(15, 23, 42, 0.035);
        }

        .stat-left {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .stat-label {
          color: #64748b;
          font-size: 13px;
          font-weight: 600;
        }

        .stat-number {
          color: #0f172a;
          font-size: 27px;
          font-weight: 800;
          line-height: 1;
        }

        .icon-box {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .blue {
          background: #eff6ff;
          color: #2563eb;
        }

        .green {
          background: #ecfdf5;
          color: #059669;
        }

        .gray {
          background: #f1f5f9;
          color: #64748b;
        }

        .red {
          background: #fef2f2;
          color: #dc2626;
        }

        .toolbar {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 15px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 2px 7px rgba(15, 23, 42, 0.035);
        }

        .search {
          flex: 1;
          position: relative;
        }

        .search-icon {
          position: absolute;
          left: 13px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }

        .search input {
          width: 100%;
          height: 43px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          outline: none;
          padding: 0 14px 0 41px;
          color: #0f172a;
          font-size: 14px;
          background: #f8fafc;
          box-sizing: border-box;
        }

        .search input:focus {
          border-color: #93c5fd;
          background: white;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
        }

        .filtro {
          height: 43px;
          min-width: 170px;
          padding: 0 12px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background: white;
          color: #334155;
          outline: none;
          font-size: 14px;
        }

        .btn-atualizar {
          height: 43px;
          width: 43px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background: white;
          color: #475569;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .btn-atualizar:hover {
          background: #f8fafc;
          color: #2563eb;
        }

        .tabela-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 2px 7px rgba(15, 23, 42, 0.035);
        }

        .tabela-topo {
          padding: 17px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #eef2f7;
        }

        .tabela-titulo {
          display: flex;
          align-items: center;
          gap: 9px;
          color: #0f172a;
          font-weight: 750;
          font-size: 15px;
        }

        .resultado {
          color: #64748b;
          font-size: 13px;
        }

        .table-wrap {
          width: 100%;
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 850px;
        }

        th {
          padding: 12px 20px;
          text-align: left;
          background: #f8fafc;
          color: #64748b;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid #e2e8f0;
        }

        td {
          padding: 15px 20px;
          border-bottom: 1px solid #f1f5f9;
          color: #334155;
          font-size: 13px;
          vertical-align: middle;
        }

        tr:last-child td {
          border-bottom: none;
        }

        tbody tr:hover {
          background: #fafcff;
        }

        .cliente {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .avatar {
          width: 39px;
          height: 39px;
          border-radius: 50%;
          background: #eff6ff;
          color: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 12px;
          flex-shrink: 0;
        }

        .cliente-info {
          min-width: 0;
        }

        .cliente-nome {
          color: #0f172a;
          font-weight: 700;
          font-size: 14px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 270px;
        }

        .cliente-email {
          color: #94a3b8;
          font-size: 12px;
          margin-top: 3px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 270px;
        }

        .telefone {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #475569;
        }

        .status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border-radius: 999px;
          padding: 5px 9px;
          font-size: 11px;
          font-weight: 750;
        }

        .status::before {
          content: "";
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .status-active {
          background: #ecfdf5;
          color: #047857;
        }

        .status-active::before {
          background: #10b981;
        }

        .status-inactive {
          background: #f1f5f9;
          color: #64748b;
        }

        .status-inactive::before {
          background: #94a3b8;
        }

        .status-blocked {
          background: #fef2f2;
          color: #b91c1c;
        }

        .status-blocked::before {
          background: #ef4444;
        }

        .acoes {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .acao {
          width: 34px;
          height: 34px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: white;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          text-decoration: none;
          transition: 0.15s;
        }

        .acao:hover {
          background: #f8fafc;
          color: #2563eb;
          border-color: #bfdbfe;
        }

        .acao-whatsapp:hover {
          color: #059669;
          border-color: #a7f3d0;
          background: #ecfdf5;
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(15, 23, 42, 0.52);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          backdrop-filter: blur(3px);
        }

        .modal {
          width: 100%;
          max-width: 470px;
          background: white;
          border-radius: 18px;
          box-shadow: 0 25px 70px rgba(15, 23, 42, 0.25);
          overflow: hidden;
        }

        .modal-header {
          padding: 22px;
          border-bottom: 1px solid #eef2f7;
          display: flex;
          justify-content: space-between;
          gap: 15px;
        }

        .modal-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .modal-icon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: #eff6ff;
          color: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-title strong {
          display: block;
          color: #0f172a;
          font-size: 17px;
          font-weight: 800;
        }

        .modal-title span {
          display: block;
          color: #64748b;
          font-size: 12px;
          margin-top: 3px;
        }

        .modal-close {
          width: 34px;
          height: 34px;
          border: 0;
          border-radius: 9px;
          background: #f8fafc;
          color: #64748b;
          cursor: pointer;
          font-size: 21px;
        }

        .modal-body {
          padding: 22px;
        }

        .cliente-destaque {
          padding: 13px 14px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          margin-bottom: 18px;
        }

        .cliente-destaque strong {
          display: block;
          color: #0f172a;
          font-size: 14px;
        }

        .cliente-destaque span {
          display: block;
          color: #64748b;
          font-size: 12px;
          margin-top: 4px;
          word-break: break-word;
        }

        .campo-label {
          display: block;
          color: #334155;
          font-size: 13px;
          font-weight: 750;
          margin-bottom: 7px;
        }

        .senha-wrap {
          position: relative;
        }

        .senha-input {
          width: 100%;
          height: 46px;
          box-sizing: border-box;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          outline: none;
          padding: 0 45px 0 13px;
          color: #0f172a;
          background: white;
          font-size: 14px;
        }

        .senha-input:focus {
          border-color: #60a5fa;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.09);
        }

        .senha-toggle {
          position: absolute;
          right: 7px;
          top: 7px;
          width: 32px;
          height: 32px;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .ajuda-senha {
          display: block;
          margin-top: 7px;
          color: #94a3b8;
          font-size: 11px;
        }

        .erro-acesso {
          margin-top: 14px;
          padding: 11px 12px;
          border-radius: 10px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
          font-size: 12px;
          line-height: 1.45;
        }

        .modal-footer {
          padding: 15px 22px 20px;
          display: flex;
          justify-content: flex-end;
          gap: 9px;
          border-top: 1px solid #eef2f7;
        }

        .btn-modal {
          height: 42px;
          border-radius: 10px;
          padding: 0 15px;
          font-size: 13px;
          font-weight: 750;
          cursor: pointer;
          border: 1px solid #e2e8f0;
        }

        .btn-cancelar {
          background: white;
          color: #475569;
        }

        .btn-liberar {
          background: #2563eb;
          color: white;
          border-color: #2563eb;
          min-width: 150px;
        }

        .btn-liberar:disabled,
        .btn-cancelar:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-loading {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          justify-content: center;
        }

        .mini-spinner {
          width: 15px;
          height: 15px;
          border: 2px solid rgba(255,255,255,.4);
          border-top-color: white;
          border-radius: 50%;
          animation: spin .8s linear infinite;
        }

        .vazio,
        .loading,
        .erro {
          padding: 55px 25px;
          text-align: center;
        }

        .vazio-icon {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          background: #f1f5f9;
          color: #94a3b8;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 13px;
        }

        .vazio strong {
          display: block;
          color: #334155;
          font-size: 15px;
          margin-bottom: 5px;
        }

        .vazio span {
          color: #94a3b8;
          font-size: 13px;
        }

        .erro {
          color: #b91c1c;
          background: #fff7f7;
          font-size: 14px;
        }

        .loading {
          color: #64748b;
          font-size: 14px;
        }

        .spinner {
          width: 22px;
          height: 22px;
          border: 2px solid #dbeafe;
          border-top-color: #2563eb;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 10px;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .mobile-filtro {
          display: none;
        }

        @media (max-width: 1000px) {
          .cards {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 700px) {
          .clientes-page {
            padding: 16px;
          }

          .topo {
            flex-direction: column;
            margin-bottom: 20px;
          }

          .titulo-area h1 {
            font-size: 25px;
          }

          .btn-novo {
            width: 100%;
            justify-content: center;
          }

          .cards {
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }

          .stat-card {
            padding: 14px;
            min-height: 92px;
          }

          .stat-number {
            font-size: 22px;
          }

          .icon-box {
            width: 38px;
            height: 38px;
          }

          .toolbar {
            flex-direction: column;
            align-items: stretch;
          }

          .filtro {
            width: 100%;
          }

          .btn-atualizar {
            width: 100%;
          }

          .tabela-topo {
            padding: 15px;
          }
        }
      `}</style>

      <div className="clientes-container">
        {/* CABEÇALHO */}
        <div className="topo">
          <div className="titulo-area">
            <h1>Clientes</h1>
            <p>
              Gerencie sua carteira, acompanhe clientes e consulte
              seus dados.
            </p>
          </div>

          <Link href="/clientes/novo" className="btn-novo">
            <Plus size={18} />
            Novo cliente
          </Link>
        </div>

        {/* CARDS */}
        <div className="cards">
          <div className="stat-card">
            <div className="stat-left">
              <span className="stat-label">Total de clientes</span>
              <span className="stat-number">
                {estatisticas.total}
              </span>
            </div>

            <div className="icon-box blue">
              <Users size={21} />
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-left">
              <span className="stat-label">Clientes ativos</span>
              <span className="stat-number">
                {estatisticas.ativos}
              </span>
            </div>

            <div className="icon-box green">
              <UserCheck size={21} />
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-left">
              <span className="stat-label">Inativos</span>
              <span className="stat-number">
                {estatisticas.inativos}
              </span>
            </div>

            <div className="icon-box gray">
              <UserX size={21} />
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-left">
              <span className="stat-label">Bloqueados</span>
              <span className="stat-number">
                {estatisticas.bloqueados}
              </span>
            </div>

            <div className="icon-box red">
              <ShieldAlert size={21} />
            </div>
          </div>
        </div>

        {/* BUSCA E FILTROS */}
        <div className="toolbar">
          <div className="search">
            <Search
              size={18}
              className="search-icon"
            />

            <input
              type="text"
              placeholder="Buscar por nome, CPF, telefone ou e-mail..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <Filter
            size={17}
            color="#64748b"
          />

          <select
            className="filtro"
            value={statusFiltro}
            onChange={(e) =>
              setStatusFiltro(
                e.target.value as StatusFiltro
              )
            }
          >
            <option value="TODOS">Todos os status</option>
            <option value="ACTIVE">Ativos</option>
            <option value="INACTIVE">Inativos</option>
            <option value="BLOCKED">Bloqueados</option>
          </select>

          <button
            type="button"
            className="btn-atualizar"
            onClick={carregarClientes}
            title="Atualizar"
          >
            <RefreshCw size={17} />
          </button>
        </div>

        {/* TABELA */}
        <div className="tabela-card">
          <div className="tabela-topo">
            <div className="tabela-titulo">
              <Users size={18} />
              Carteira de clientes
            </div>

            <span className="resultado">
              {clientesFiltrados.length} resultado
              {clientesFiltrados.length !== 1 ? "s" : ""}
            </span>
          </div>

          {loading ? (
            <div className="loading">
              <div className="spinner" />
              Carregando clientes...
            </div>
          ) : erro ? (
            <div className="erro">
              {erro}
            </div>
          ) : clientesFiltrados.length === 0 ? (
            <div className="vazio">
              <div className="vazio-icon">
                <Users size={25} />
              </div>

              <strong>
                {rows.length === 0
                  ? "Nenhum cliente cadastrado"
                  : "Nenhum cliente encontrado"}
              </strong>

              <span>
                {rows.length === 0
                  ? "Cadastre seu primeiro cliente para começar."
                  : "Tente alterar a busca ou o filtro selecionado."}
              </span>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>CPF</th>
                    <th>Telefone</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {clientesFiltrados.map((cliente) => (
                    <tr key={cliente.id}>
                      <td>
                        <div className="cliente">
                          <div className="avatar">
                            {getInitials(
                              cliente.full_name
                            )}
                          </div>

                          <div className="cliente-info">
                            <div className="cliente-nome">
                              {cliente.full_name}
                            </div>

                            {cliente.email && (
                              <div className="cliente-email">
                                {cliente.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td>
                        {formatCPF(cliente.cpf)}
                      </td>

                      <td>
                        <span className="telefone">
                          <Phone size={14} />
                          {formatPhone(cliente.phone)}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`status ${getStatusClass(
                            cliente.status
                          )}`}
                        >
                          {getStatusLabel(
                            cliente.status
                          )}
                        </span>
                      </td>

                      <td>
                        <div className="acoes">
                          <Link
                            href={`/clientes/${cliente.id}`}
                            className="acao"
                            title="Ver cliente"
                          >
                            <Eye size={16} />
                          </Link>

                          <Link
                            href={`/clientes/${cliente.id}/editar`}
                            className="acao"
                            title="Editar cliente"
                          >
                            <Pencil size={16} />
                          </Link>

                          {cliente.phone && (
                            <a
                              href={whatsappLink(
                                cliente.phone
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="acao acao-whatsapp"
                              title="Abrir WhatsApp"
                            >
                              <MessageCircle size={16} />
                            </a>
                          )}

                          <button
                            type="button"
                            className="acao"
                            title={
                              (cliente as Customer & { portal_enabled?: boolean })
                                .portal_enabled
                                ? "Alterar senha do cliente"
                                : "Liberar acesso do cliente"
                            }
                            onClick={() => abrirModalAcesso(cliente)}
                          >
                            <KeyRound size={16} />
                          </button>

                          <Link
                            href={`/clientes/${cliente.id}`}
                            className="acao"
                            title="Detalhes"
                          >
                            <ChevronRight size={16} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {clienteAcesso && (
        <div className="modal-backdrop" onMouseDown={fecharModalAcesso}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <div className="modal-icon">
                  <KeyRound size={20} />
                </div>
                <div>
                  <strong>Liberar acesso</strong>
                  <span>Você define a senha temporária</span>
                </div>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={fecharModalAcesso}
                disabled={criandoAcesso}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="cliente-destaque">
                <strong>{clienteAcesso.full_name}</strong>
                <span>
                  {clienteAcesso.email || "Sem e-mail cadastrado"}
                </span>
              </div>

              {!clienteAcesso.email ? (
                <div className="erro-acesso">
                  Cadastre o e-mail do cliente primeiro. Ele será usado como
                  usuário para entrar no Portal do Cliente.
                </div>
              ) : (
                <>
                  <label className="campo-label" htmlFor="senha-temporaria">
                    Senha temporária
                  </label>

                  <div className="senha-wrap">
                    <input
                      id="senha-temporaria"
                      className="senha-input"
                      type={mostrarSenha ? "text" : "password"}
                      value={senhaTemporaria}
                      onChange={(e) => setSenhaTemporaria(e.target.value)}
                      placeholder="Digite a senha do cliente"
                      autoFocus
                      autoComplete="new-password"
                      disabled={criandoAcesso}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          liberarAcesso();
                        }
                      }}
                    />

                    <button
                      type="button"
                      className="senha-toggle"
                      onClick={() => setMostrarSenha((v) => !v)}
                      disabled={criandoAcesso}
                      title={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {mostrarSenha ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>

                  <span className="ajuda-senha">
                    Mínimo de 6 caracteres. Se o cliente já tiver acesso,
                    essa senha substituirá a senha anterior.
                  </span>

                  {erroAcesso && (
                    <div className="erro-acesso">{erroAcesso}</div>
                  )}
                </>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-modal btn-cancelar"
                onClick={fecharModalAcesso}
                disabled={criandoAcesso}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="btn-modal btn-liberar"
                onClick={liberarAcesso}
                disabled={
                  criandoAcesso ||
                  !clienteAcesso.email ||
                  senhaTemporaria.trim().length < 6
                }
              >
                {criandoAcesso ? (
                  <span className="btn-loading">
                    <span className="mini-spinner" />
                    Salvando...
                  </span>
                ) : (
                  "Liberar acesso"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}