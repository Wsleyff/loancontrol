import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

type WithdrawalStatus =
  | "PENDING"
  | "APPROVED"
  | "PAID"
  | "REJECTED"
  | "CANCELLED";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurada."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function isMasterUser() {
  const supabaseServer = await createServerClient();

  const {
    data: { user },
    error,
  } = await supabaseServer.auth.getUser();

  if (error || !user) {
    return {
      authorized: false,
      user: null,
    };
  }

  const metadataRole =
    typeof user.user_metadata?.role === "string"
      ? user.user_metadata.role.toUpperCase()
      : "";

  const masterEmail = (process.env.MASTER_EMAIL || "")
    .trim()
    .toLowerCase();

  const userEmail = (user.email || "").trim().toLowerCase();

  const authorized =
    metadataRole === "MASTER" ||
    (!!masterEmail && !!userEmail && masterEmail === userEmail);

  return {
    authorized,
    user,
  };
}

function isValidStatus(value: unknown): value is WithdrawalStatus {
  return (
    value === "PENDING" ||
    value === "APPROVED" ||
    value === "PAID" ||
    value === "REJECTED" ||
    value === "CANCELLED"
  );
}

function canChangeStatus(
  current: WithdrawalStatus,
  next: WithdrawalStatus
) {
  if (current === "PENDING") {
    return (
      next === "APPROVED" ||
      next === "REJECTED" ||
      next === "CANCELLED"
    );
  }

  if (current === "APPROVED") {
    return next === "PAID" || next === "CANCELLED";
  }

  return false;
}

export async function GET() {
  try {
    const master = await isMasterUser();

    if (!master.authorized) {
      return NextResponse.json(
        {
          error: "Acesso negado. Área exclusiva do Master.",
        },
        {
          status: 403,
        }
      );
    }

    const supabase = getServiceClient();

    const { data: withdrawals, error: withdrawalsError } =
      await supabase
        .from("withdrawal_requests")
        .select(
          `
          id,
          company_id,
          amount,
          source,
          status,
          pix_key_type,
          pix_key,
          notes,
          requested_at,
          reviewed_at,
          paid_at,
          created_at,
          updated_at
        `
        )
        .order("requested_at", {
          ascending: false,
        });

    if (withdrawalsError) {
      console.error(
        "[MASTER SAQUES] Erro ao buscar saques:",
        withdrawalsError
      );

      return NextResponse.json(
        {
          error:
            withdrawalsError.message ||
            "Não foi possível carregar os saques.",
        },
        {
          status: 500,
        }
      );
    }

    const rows = withdrawals || [];

    const companyIds = Array.from(
      new Set(
        rows
          .map((item) => item.company_id)
          .filter(Boolean)
      )
    );

    let companies: Array<{
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
    }> = [];

    if (companyIds.length > 0) {
      const { data: companiesData, error: companiesError } =
        await supabase
          .from("companies")
          .select("id,name,email,phone")
          .in("id", companyIds);

      if (companiesError) {
        console.error(
          "[MASTER SAQUES] Erro ao buscar empresas:",
          companiesError
        );
      } else {
        companies = companiesData || [];
      }
    }

    const companyMap = new Map(
      companies.map((company) => [company.id, company])
    );

    const formattedWithdrawals = rows.map((withdrawal) => ({
      ...withdrawal,
      amount: Number(withdrawal.amount || 0),
      company: companyMap.get(withdrawal.company_id) || null,
    }));

    let total = 0;
    let pending = 0;
    let approved = 0;
    let paid = 0;
    let rejected = 0;
    let cancelled = 0;

    let pendingAmount = 0;
    let approvedAmount = 0;
    let paidAmount = 0;

    for (const withdrawal of formattedWithdrawals) {
      const amount = Number(withdrawal.amount || 0);

      total += 1;

      switch (withdrawal.status as WithdrawalStatus) {
        case "PENDING":
          pending += 1;
          pendingAmount += amount;
          break;

        case "APPROVED":
          approved += 1;
          approvedAmount += amount;
          break;

        case "PAID":
          paid += 1;
          paidAmount += amount;
          break;

        case "REJECTED":
          rejected += 1;
          break;

        case "CANCELLED":
          cancelled += 1;
          break;
      }
    }

    return NextResponse.json(
      {
        withdrawals: formattedWithdrawals,
        stats: {
          total,
          pending,
          approved,
          paid,
          rejected,
          cancelled,
          pendingAmount,
          approvedAmount,
          paidAmount,
        },
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("[MASTER SAQUES] Erro inesperado:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao carregar os saques.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const master = await isMasterUser();

    if (!master.authorized || !master.user) {
      return NextResponse.json(
        {
          error: "Acesso negado. Área exclusiva do Master.",
        },
        {
          status: 403,
        }
      );
    }

    const body = await request.json();

    const id =
      typeof body?.id === "string"
        ? body.id.trim()
        : "";

    const newStatus = body?.status;

    if (!id) {
      return NextResponse.json(
        {
          error: "ID do saque não informado.",
        },
        {
          status: 400,
        }
      );
    }

    if (!isValidStatus(newStatus)) {
      return NextResponse.json(
        {
          error: "Status de saque inválido.",
        },
        {
          status: 400,
        }
      );
    }

    const supabase = getServiceClient();

    const { data: currentWithdrawal, error: findError } =
      await supabase
        .from("withdrawal_requests")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (findError) {
      console.error(
        "[MASTER SAQUES] Erro ao buscar saque:",
        findError
      );

      return NextResponse.json(
        {
          error:
            findError.message ||
            "Não foi possível localizar o saque.",
        },
        {
          status: 500,
        }
      );
    }

    if (!currentWithdrawal) {
      return NextResponse.json(
        {
          error: "Saque não encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    const currentStatus =
      currentWithdrawal.status as WithdrawalStatus;

    if (currentStatus === newStatus) {
      return NextResponse.json(
        {
          error: "O saque já possui este status.",
        },
        {
          status: 400,
        }
      );
    }

    if (!canChangeStatus(currentStatus, newStatus)) {
      return NextResponse.json(
        {
          error: `Não é permitido alterar um saque de ${currentStatus} para ${newStatus}.`,
        },
        {
          status: 409,
        }
      );
    }

    const updateData: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (
      newStatus === "APPROVED" ||
      newStatus === "REJECTED" ||
      newStatus === "CANCELLED"
    ) {
      updateData.reviewed_at = new Date().toISOString();
      updateData.reviewed_by = master.user.id;
    }

    if (newStatus === "PAID") {
      const now = new Date().toISOString();

      updateData.paid_at = now;

      if (!currentWithdrawal.reviewed_at) {
        updateData.reviewed_at = now;
        updateData.reviewed_by = master.user.id;
      }
    }

    const { data: updatedWithdrawal, error: updateError } =
      await supabase
        .from("withdrawal_requests")
        .update(updateData)
        .eq("id", id)
        .select("*")
        .single();

    if (updateError) {
      console.error(
        "[MASTER SAQUES] Erro ao atualizar:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            updateError.message ||
            "Não foi possível atualizar o saque.",
        },
        {
          status: 500,
        }
      );
    }

    let company = null;

    if (updatedWithdrawal.company_id) {
      const { data: companyData } = await supabase
        .from("companies")
        .select("id,name,email,phone")
        .eq("id", updatedWithdrawal.company_id)
        .maybeSingle();

      company = companyData || null;
    }

    return NextResponse.json(
      {
        success: true,
        withdrawal: {
          ...updatedWithdrawal,
          amount: Number(updatedWithdrawal.amount || 0),
          company,
        },
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "[MASTER SAQUES UPDATE] Erro inesperado:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao atualizar o saque.",
      },
      {
        status: 500,
      }
    );
  }
}