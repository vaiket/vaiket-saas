import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { ensureCrmAccess } from "@/lib/crm/auth";
import { prisma } from "@/lib/prisma";

type CountRow = { total: bigint | number };

function toNumber(value: bigint | number | null | undefined) {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  return Number(value || 0);
}

export async function GET(req: Request) {
  try {
    const guard = await ensureCrmAccess(req, "member");
    if (!guard.ok) return guard.response;
    const { auth } = guard;

    const [leadRows, clientRows, dealRows, taskRows, appointmentRows] = await Promise.all([
      prisma.$queryRaw<CountRow[]>(
        Prisma.sql`SELECT COUNT(*)::bigint AS total FROM crm_leads WHERE tenant_id = ${auth.tenantId}`
      ),
      prisma.$queryRaw<CountRow[]>(
        Prisma.sql`SELECT COUNT(*)::bigint AS total FROM crm_clients WHERE tenant_id = ${auth.tenantId}`
      ),
      prisma.$queryRaw<CountRow[]>(
        Prisma.sql`SELECT COUNT(*)::bigint AS total FROM crm_deals WHERE tenant_id = ${auth.tenantId}`
      ),
      prisma.$queryRaw<CountRow[]>(
        Prisma.sql`SELECT COUNT(*)::bigint AS total FROM crm_tasks WHERE tenant_id = ${auth.tenantId}`
      ),
      prisma.$queryRaw<CountRow[]>(
        Prisma.sql`SELECT COUNT(*)::bigint AS total FROM crm_appointments WHERE tenant_id = ${auth.tenantId}`
      ),
    ]);

    return NextResponse.json({
      success: true,
      db: "connected",
      tenantId: auth.tenantId,
      counters: {
        leads: toNumber(leadRows[0]?.total),
        clients: toNumber(clientRows[0]?.total),
        deals: toNumber(dealRows[0]?.total),
        tasks: toNumber(taskRows[0]?.total),
        appointments: toNumber(appointmentRows[0]?.total),
      },
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("GET /api/crm/health failed:", error);
    return NextResponse.json(
      {
        success: false,
        db: "error",
        error: error instanceof Error ? error.message : "CRM database check failed",
      },
      { status: 500 }
    );
  }
}
