"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CheckCircle2,
  ChevronDown,
  Loader2,
  Mail,
  MoreHorizontal,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  UserCog,
  UserPlus,
  UsersRound,
  UserX,
  XCircle,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type CompanyUser = {
  id: string;
  company_id: string;
  user_id: string;
  role: string;
  status: string;
  created_at?: string | null;
};

type Profile = {
  id: string;
  [key: string]: unknown;
};

type UserRow = CompanyUser & {
  profile?: Profile | null;
};

type FilterStatus = "ALL" | "ACTIVE" | "INACTIVE";
type FilterRole = "ALL" | "ADMIN" | "MANAGER" | "OPERATOR" | "COLLECTOR";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return String((error as { message: string }).message);
  }

  return "Não foi possível carregar os usuários.";
}

function textValue(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function getProfileName(profile?: Profile | null) {
  if (!profile) return "";

  const possibleNames = [
    profile.full_name,
    profile.name,
    profile.nome,
    profile.display_name,
    profile.username,
  ];

  for (const value of possibleNames) {
    const text = textValue(value).trim();

    if (text) {
      return text;
    }
  }

  return "";
}

function getProfileEmail(profile?: Profile | null) {
  if (!profile) return "";

  const possibleEmails = [
    profile.email,
    profile.email_address,
    profile.mail,
  ];

  for (const value of possibleEmails) {
    const text = textValue(value).trim();

    if (text) {
      return text;
    }
  }

  return "";
}

function getInitials(name: string, fallback: string) {
  const value = name.trim();

  if (value) {
    const parts = value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);

    return parts
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
  }

  return fallback.slice(0, 2).toUpperCase();
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("pt-BR");
}

function roleLabel(role: string) {
  switch (role) {
    case "ADMIN":
      return "Administrador";

    case "MANAGER":
      return "Gerente";

    case "OPERATOR":
      return "Operador";

    case "COLLECTOR":
      return "Cobrador";

    default:
      return role || "Sem função";
  }
}

function roleDescription(role: string) {
  switch (role) {
    case "ADMIN":
      return "Acesso administrativo completo";

    case "MANAGER":
      return "Gerenciamento da operação";

    case "OPERATOR":
      return "Operação diária";

    case "COLLECTOR":
      return "Cobranças e recebimentos";

    default:
      return "Função personalizada";
  }
}

function roleIcon(role: string) {
  switch (role) {
    case "ADMIN":
      return <ShieldCheck size={15} />;

    case "MANAGER":
      return <UserCog size={15} />;

    case "COLLECTOR":
      return <UserCheck size={15} />;

    default:
      return <UsersRound size={15} />;
  }
}

function isActive(status: string) {
  return status === "ACTIVE";
}

export default function UsuariosPage() {
  const supabase = useMemo(() => createClient(), []);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<FilterStatus>("ALL");

  const [roleFilter, setRoleFilter] =
    useState<FilterRole>("ALL");

  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const carregarUsuarios = useCallback(async () => {
    if (!supabase) {
      setError(
        "Supabase não configurado. Verifique o arquivo .env.local."
      );
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const {
        data: {
          user: currentUser,
        },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        throw new Error(
          "Sua sessão expirou. Faça login novamente."
        );
      }

      // Descobre a empresa do usuário atual.
      const { data: membership, error: membershipError } =
        await supabase
          .from("company_users")
          .select("company_id")
          .eq("user_id", currentUser.id)
          .eq("status", "ACTIVE")
          .limit(1)
          .maybeSingle();

      if (membershipError) {
        throw membershipError;
      }

      if (!membership?.company_id) {
        throw new Error(
          "Seu usuário não está vinculado a nenhuma empresa."
        );
      }

      const companyId = membership.company_id;

      // Busca os usuários da empresa.
      const {
        data: companyUsers,
        error: companyUsersError,
      } = await supabase
        .from("company_users")
        .select(
          `
            id,
            company_id,
            user_id,
            role,
            status,
            created_at
          `
        )
        .eq("company_id", companyId)
        .order("created_at", {
          ascending: true,
        });

      if (companyUsersError) {
        throw companyUsersError;
      }

      const rows = (companyUsers || []) as CompanyUser[];

      // Busca os perfis.
      const userIds = rows.map((item) => item.user_id);

      let profiles: Profile[] = [];

      if (userIds.length > 0) {
        const {
          data: profileData,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select("*")
          .in("id", userIds);

        if (profileError) {
          throw profileError;
        }

        profiles = (profileData || []) as Profile[];
      }

      const profileMap = new Map<string, Profile>();

      profiles.forEach((profile) => {
        if (profile.id) {
          profileMap.set(profile.id, profile);
        }
      });

      const finalRows: UserRow[] = rows.map((row) => ({
        ...row,
        profile: profileMap.get(row.user_id) || null,
      }));

      setUsers(finalRows);
    } catch (err) {
      console.error("[USUARIOS] Erro:", err);

      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    carregarUsuarios();
  }, [carregarUsuarios]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLowerCase();

    return users.filter((item) => {
      const name = getProfileName(item.profile);
      const email = getProfileEmail(item.profile);

      const searchText = [
        name,
        email,
        item.user_id,
        roleLabel(item.role),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !normalizedSearch ||
        searchText.includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "ALL" ||
        item.status === statusFilter;

      const matchesRole =
        roleFilter === "ALL" ||
        item.role === roleFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesRole
      );
    });
  }, [users, search, statusFilter, roleFilter]);

  const stats = useMemo(() => {
    const active = users.filter(
      (item) => item.status === "ACTIVE"
    ).length;

    const inactive = users.filter(
      (item) => item.status !== "ACTIVE"
    ).length;

    const admins = users.filter(
      (item) => item.role === "ADMIN"
    ).length;

    const collectors = users.filter(
      (item) => item.role === "COLLECTOR"
    ).length;

    return {
      total: users.length,
      active,
      inactive,
      admins,
      collectors,
    };
  }, [users]);

  async function alterarStatus(item: UserRow) {
    if (!supabase) return;

    try {
      setSavingId(item.id);
      setError("");
      setSuccess("");
      setOpenMenu(null);

      const newStatus =
        item.status === "ACTIVE"
          ? "INACTIVE"
          : "ACTIVE";

      const { error: updateError } = await supabase
        .from("company_users")
        .update({
          status: newStatus,
        })
        .eq("id", item.id);

      if (updateError) {
        throw updateError;
      }

      setUsers((current) =>
        current.map((user) =>
          user.id === item.id
            ? {
                ...user,
                status: newStatus,
              }
            : user
        )
      );

      setSuccess(
        newStatus === "ACTIVE"
          ? "Usuário ativado com sucesso."
          : "Usuário desativado com sucesso."
      );

      window.setTimeout(() => {
        setSuccess("");
      }, 3500);
    } catch (err) {
      console.error(
        "[USUARIOS] Erro ao alterar status:",
        err
      );

      setError(getErrorMessage(err));
    } finally {
      setSavingId(null);
    }
  }

  async function alterarFuncao(
    item: UserRow,
    role: string
  ) {
    if (!supabase) return;

    if (role === item.role) {
      setOpenMenu(null);
      return;
    }

    try {
      setSavingId(item.id);
      setError("");
      setSuccess("");
      setOpenMenu(null);

      const { error: updateError } = await supabase
        .from("company_users")
        .update({
          role,
        })
        .eq("id", item.id);

      if (updateError) {
        throw updateError;
      }

      setUsers((current) =>
        current.map((user) =>
          user.id === item.id
            ? {
                ...user,
                role,
              }
            : user
        )
      );

      setSuccess(
        `Função alterada para ${roleLabel(role)}.`
      );

      window.setTimeout(() => {
        setSuccess("");
      }, 3500);
    } catch (err) {
      console.error(
        "[USUARIOS] Erro ao alterar função:",
        err
      );

      setError(getErrorMessage(err));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <main className="users-page">
      <style jsx>{`
        .users-page {
          max-width: 1240px;
          margin: 0 auto;
          padding: 34px 34px 70px;
        }

        .top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 28px;
        }

        .eyebrow {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #2563eb;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .title {
          margin: 0;
          color: #0f172a;
          font-size: 32px;
          line-height: 1.1;
          font-weight: 800;
        }

        .description {
          margin: 9px 0 0;
          color: #64748b;
          font-size: 14px;
        }

        .actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .button {
          height: 42px;
          border: 1px solid #dbe3ef;
          background: #fff;
          color: #0f172a;
          border-radius: 10px;
          padding: 0 15px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s;
        }

        .button:hover {
          border-color: #b8c6da;
          transform: translateY(-1px);
        }

        .button-primary {
          background: #2563eb;
          border-color: #2563eb;
          color: #fff;
        }

        .button-primary:hover {
          background: #1d4ed8;
          border-color: #1d4ed8;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 20px;
        }

        .stat {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 15px;
          padding: 18px;
          box-shadow: 0 4px 15px rgba(15, 23, 42, 0.035);
        }

        .stat-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .stat-label {
          color: #64748b;
          font-size: 12px;
          font-weight: 600;
        }

        .stat-number {
          margin-top: 7px;
          color: #0f172a;
          font-size: 25px;
          line-height: 1;
          font-weight: 800;
        }

        .stat-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #eff6ff;
          color: #2563eb;
        }

        .toolbar {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 15px;
          padding: 13px;
          display: flex;
          gap: 10px;
          margin-bottom: 16px;
          box-shadow: 0 4px 15px rgba(15, 23, 42, 0.035);
        }

        .search {
          flex: 1;
          min-width: 200px;
          position: relative;
        }

        .search svg {
          position: absolute;
          left: 13px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }

        .search input,
        .select {
          width: 100%;
          height: 42px;
          border: 1px solid #dbe3ef;
          border-radius: 10px;
          background: #fff;
          color: #0f172a;
          outline: none;
          font-size: 13px;
        }

        .search input {
          padding: 0 14px 0 40px;
        }

        .search input:focus,
        .select:focus {
          border-color: #93c5fd;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
        }

        .select {
          width: 190px;
          padding: 0 12px;
        }

        .message {
          border-radius: 12px;
          padding: 13px 15px;
          margin-bottom: 16px;
          font-size: 13px;
        }

        .error {
          border: 1px solid #fecaca;
          background: #fff7f7;
          color: #b91c1c;
        }

        .success {
          border: 1px solid #bbf7d0;
          background: #f0fdf4;
          color: #15803d;
        }

        .error-title {
          font-weight: 800;
          margin-bottom: 4px;
        }

        .retry {
          margin-top: 10px;
          height: 34px;
          border: 1px solid #fca5a5;
          background: #fff;
          color: #b91c1c;
          border-radius: 8px;
          padding: 0 11px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .table-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          overflow: visible;
          box-shadow: 0 5px 20px rgba(15, 23, 42, 0.04);
        }

        .table-header {
          padding: 17px 19px;
          border-bottom: 1px solid #edf2f7;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
        }

        .table-title {
          color: #0f172a;
          font-size: 14px;
          font-weight: 800;
        }

        .table-subtitle {
          color: #94a3b8;
          font-size: 11px;
          margin-top: 3px;
        }

        .count {
          color: #64748b;
          font-size: 12px;
        }

        .table-wrap {
          width: 100%;
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 820px;
        }

        th {
          text-align: left;
          padding: 12px 18px;
          color: #64748b;
          background: #f8fafc;
          border-bottom: 1px solid #edf2f7;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        td {
          padding: 14px 18px;
          border-bottom: 1px solid #f1f5f9;
          color: #334155;
          font-size: 13px;
          vertical-align: middle;
        }

        tr:last-child td {
          border-bottom: 0;
        }

        tbody tr:hover {
          background: #fafcff;
        }

        .person {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .avatar {
          width: 40px;
          height: 40px;
          flex: 0 0 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #eff6ff;
          color: #2563eb;
          font-weight: 800;
          font-size: 12px;
        }

        .person-name {
          color: #0f172a;
          font-weight: 750;
          font-size: 13px;
        }

        .person-id {
          color: #94a3b8;
          font-size: 10px;
          margin-top: 3px;
          max-width: 240px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .email {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #64748b;
          font-size: 12px;
        }

        .role {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 9px;
          border-radius: 8px;
          background: #f1f5f9;
          color: #475569;
          font-size: 11px;
          font-weight: 750;
        }

        .status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 9px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
        }

        .status-active {
          background: #ecfdf5;
          color: #15803d;
        }

        .status-inactive {
          background: #fef2f2;
          color: #b91c1c;
        }

        .menu-wrap {
          position: relative;
          display: inline-block;
        }

        .menu-button {
          width: 34px;
          height: 34px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: #fff;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .menu-button:hover {
          color: #0f172a;
          background: #f8fafc;
        }

        .menu {
          position: absolute;
          right: 0;
          top: calc(100% + 7px);
          z-index: 30;
          width: 205px;
          padding: 6px;
          border: 1px solid #e2e8f0;
          border-radius: 11px;
          background: #fff;
          box-shadow: 0 15px 35px rgba(15, 23, 42, 0.13);
        }

        .menu-item {
          width: 100%;
          border: 0;
          background: transparent;
          padding: 9px 10px;
          border-radius: 7px;
          display: flex;
          align-items: center;
          gap: 9px;
          text-align: left;
          color: #334155;
          font-size: 12px;
          cursor: pointer;
        }

        .menu-item:hover {
          background: #f8fafc;
        }

        .menu-danger {
          color: #dc2626;
        }

        .menu-title {
          padding: 6px 10px 5px;
          color: #94a3b8;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .empty {
          padding: 65px 20px;
          text-align: center;
        }

        .empty-icon {
          width: 58px;
          height: 58px;
          border-radius: 16px;
          background: #f1f5f9;
          color: #94a3b8;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 14px;
        }

        .empty-title {
          color: #334155;
          font-weight: 800;
          font-size: 14px;
        }

        .empty-text {
          color: #94a3b8;
          font-size: 12px;
          margin-top: 5px;
        }

        .loading {
          padding: 65px 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          color: #64748b;
          font-size: 13px;
        }

        .rotate {
          animation: rotate 1s linear infinite;
        }

        @keyframes rotate {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 900px) {
          .users-page {
            padding: 25px 18px 60px;
          }

          .stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .top {
            flex-direction: column;
          }

          .toolbar {
            flex-direction: column;
          }

          .select {
            width: 100%;
          }
        }

        @media (max-width: 520px) {
          .stats {
            grid-template-columns: 1fr;
          }

          .title {
            font-size: 27px;
          }
        }
      `}</style>

      <div className="top">
        <div>
          <div className="eyebrow">
            <UsersRound size={15} />
            Gestão de equipe
          </div>

          <h1 className="title">
            Usuários
          </h1>

          <p className="description">
            Gerencie os usuários, funções e acessos da sua empresa.
          </p>
        </div>

        <div className="actions">
          <button
            className="button"
            onClick={carregarUsuarios}
            disabled={loading}
          >
            <RefreshCw
              size={15}
              className={loading ? "rotate" : ""}
            />
            Atualizar
          </button>

          <button
            className="button button-primary"
            onClick={() => {
              setSuccess(
                "O cadastro de novos usuários será disponibilizado na próxima etapa."
              );

              window.setTimeout(() => {
                setSuccess("");
              }, 4000);
            }}
          >
            <UserPlus size={16} />
            Novo usuário
          </button>
        </div>
      </div>

      {error && (
        <div className="message error">
          <div className="error-title">
            Não foi possível carregar os usuários
          </div>

          <div>{error}</div>

          <button
            className="retry"
            onClick={carregarUsuarios}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {success && (
        <div className="message success">
          <strong>Operação concluída:</strong>{" "}
          {success}
        </div>
      )}

      <section className="stats">
        <div className="stat">
          <div className="stat-top">
            <div>
              <div className="stat-label">
                Total de usuários
              </div>

              <div className="stat-number">
                {stats.total}
              </div>
            </div>

            <div className="stat-icon">
              <UsersRound size={19} />
            </div>
          </div>
        </div>

        <div className="stat">
          <div className="stat-top">
            <div>
              <div className="stat-label">
                Usuários ativos
              </div>

              <div className="stat-number">
                {stats.active}
              </div>
            </div>

            <div
              className="stat-icon"
              style={{
                background: "#ecfdf5",
                color: "#16a34a",
              }}
            >
              <CheckCircle2 size={19} />
            </div>
          </div>
        </div>

        <div className="stat">
          <div className="stat-top">
            <div>
              <div className="stat-label">
                Administradores
              </div>

              <div className="stat-number">
                {stats.admins}
              </div>
            </div>

            <div
              className="stat-icon"
              style={{
                background: "#f5f3ff",
                color: "#7c3aed",
              }}
            >
              <ShieldCheck size={19} />
            </div>
          </div>
        </div>

        <div className="stat">
          <div className="stat-top">
            <div>
              <div className="stat-label">
                Cobradores
              </div>

              <div className="stat-number">
                {stats.collectors}
              </div>
            </div>

            <div
              className="stat-icon"
              style={{
                background: "#fff7ed",
                color: "#ea580c",
              }}
            >
              <UserCheck size={19} />
            </div>
          </div>
        </div>
      </section>

      <section className="toolbar">
        <div className="search">
          <Search size={17} />

          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Buscar por nome, e-mail, função ou ID..."
          />
        </div>

        <select
          className="select"
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(
              event.target.value as FilterStatus
            )
          }
        >
          <option value="ALL">
            Todos os status
          </option>

          <option value="ACTIVE">
            Ativos
          </option>

          <option value="INACTIVE">
            Inativos
          </option>
        </select>

        <select
          className="select"
          value={roleFilter}
          onChange={(event) =>
            setRoleFilter(
              event.target.value as FilterRole
            )
          }
        >
          <option value="ALL">
            Todas as funções
          </option>

          <option value="ADMIN">
            Administradores
          </option>

          <option value="MANAGER">
            Gerentes
          </option>

          <option value="OPERATOR">
            Operadores
          </option>

          <option value="COLLECTOR">
            Cobradores
          </option>
        </select>
      </section>

      <section className="table-card">
        <div className="table-header">
          <div>
            <div className="table-title">
              Equipe da empresa
            </div>

            <div className="table-subtitle">
              Usuários vinculados à carteira atual
            </div>
          </div>

          <div className="count">
            {filteredUsers.length}{" "}
            {filteredUsers.length === 1
              ? "usuário"
              : "usuários"}
          </div>
        </div>

        {loading ? (
          <div className="loading">
            <Loader2
              size={18}
              className="rotate"
            />
            Carregando usuários...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">
              <UsersRound size={27} />
            </div>

            <div className="empty-title">
              Nenhum usuário encontrado
            </div>

            <div className="empty-text">
              Tente alterar os filtros ou o termo de busca.
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>E-mail</th>
                  <th>Função</th>
                  <th>Status</th>
                  <th>Entrada</th>
                  <th style={{ width: 65 }}>
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((item) => {
                  const name =
                    getProfileName(item.profile) ||
                    "Usuário";

                  const email =
                    getProfileEmail(item.profile);

                  const initials = getInitials(
                    name,
                    item.user_id
                  );

                  const active = isActive(
                    item.status
                  );

                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="person">
                          <div className="avatar">
                            {initials}
                          </div>

                          <div>
                            <div className="person-name">
                              {name}
                            </div>

                            <div className="person-id">
                              ID: {item.user_id}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        {email ? (
                          <div className="email">
                            <Mail size={14} />
                            {email}
                          </div>
                        ) : (
                          <span
                            style={{
                              color: "#94a3b8",
                            }}
                          >
                            E-mail não informado
                          </span>
                        )}
                      </td>

                      <td>
                        <span className="role">
                          {roleIcon(item.role)}
                          {roleLabel(item.role)}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`status ${
                            active
                              ? "status-active"
                              : "status-inactive"
                          }`}
                        >
                          {active ? (
                            <CheckCircle2 size={13} />
                          ) : (
                            <XCircle size={13} />
                          )}

                          {active
                            ? "Ativo"
                            : "Inativo"}
                        </span>
                      </td>

                      <td>
                        {formatDate(
                          item.created_at
                        )}
                      </td>

                      <td>
                        <div className="menu-wrap">
                          <button
                            className="menu-button"
                            onClick={() =>
                              setOpenMenu(
                                openMenu === item.id
                                  ? null
                                  : item.id
                              )
                            }
                            disabled={
                              savingId === item.id
                            }
                          >
                            {savingId === item.id ? (
                              <Loader2
                                size={16}
                                className="rotate"
                              />
                            ) : (
                              <MoreHorizontal
                                size={17}
                              />
                            )}
                          </button>

                          {openMenu === item.id && (
                            <div className="menu">
                              <div className="menu-title">
                                Alterar função
                              </div>

                              <button
                                className="menu-item"
                                onClick={() =>
                                  alterarFuncao(
                                    item,
                                    "ADMIN"
                                  )
                                }
                              >
                                <ShieldCheck size={15} />
                                Administrador
                              </button>

                              <button
                                className="menu-item"
                                onClick={() =>
                                  alterarFuncao(
                                    item,
                                    "MANAGER"
                                  )
                                }
                              >
                                <UserCog size={15} />
                                Gerente
                              </button>

                              <button
                                className="menu-item"
                                onClick={() =>
                                  alterarFuncao(
                                    item,
                                    "OPERATOR"
                                  )
                                }
                              >
                                <UsersRound size={15} />
                                Operador
                              </button>

                              <button
                                className="menu-item"
                                onClick={() =>
                                  alterarFuncao(
                                    item,
                                    "COLLECTOR"
                                  )
                                }
                              >
                                <UserCheck size={15} />
                                Cobrador
                              </button>

                              <div
                                style={{
                                  height: 1,
                                  background:
                                    "#f1f5f9",
                                  margin: "5px 0",
                                }}
                              />

                              <button
                                className={`menu-item ${
                                  active
                                    ? "menu-danger"
                                    : ""
                                }`}
                                onClick={() =>
                                  alterarStatus(
                                    item
                                  )
                                }
                              >
                                {active ? (
                                  <>
                                    <UserX size={15} />
                                    Desativar usuário
                                  </>
                                ) : (
                                  <>
                                    <UserCheck
                                      size={15}
                                    />
                                    Ativar usuário
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}