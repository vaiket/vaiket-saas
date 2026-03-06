import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { ensureCrmAccess } from "@/lib/crm/auth";
import { trackCrmActivity } from "@/lib/crm/activity";
import { asRecord, readText } from "@/lib/crm/helpers";
import { prisma } from "@/lib/prisma";

const CRM_ROLES = ["Admin", "Manager", "Sales", "Support"] as const;
type CrmRole = (typeof CRM_ROLES)[number];

function normalizeCrmRole(value: unknown): CrmRole {
  const raw = readText(value);
  if (!raw) return "Sales";
  const matched = CRM_ROLES.find((item) => item.toLowerCase() === raw.toLowerCase());
  return matched ?? "Sales";
}

export async function GET(req: Request) {
  const guard = await ensureCrmAccess(req, "member");
  if (!guard.ok) return guard.response;
  const { auth } = guard;

  const [users, crmRoles] = await Promise.all([
    prisma.user.findMany({
      where: {
        tenantId: auth.tenantId,
        status: "active",
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    }),
    prisma.$queryRaw<Array<{ user_id: number; role: string }>>(
      Prisma.sql`
        SELECT user_id, role
        FROM crm_user_roles
        WHERE tenant_id = ${auth.tenantId}
      `
    ),
  ]);

  const roleMap = new Map(crmRoles.map((row) => [row.user_id, normalizeCrmRole(row.role)]));
  const items = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    workspaceRole: user.role,
    crmRole: roleMap.get(user.id) ?? "Sales",
  }));

  return NextResponse.json({ success: true, users: items, roles: CRM_ROLES });
}

export async function PATCH(req: Request) {
  const guard = await ensureCrmAccess(req, "admin");
  if (!guard.ok) return guard.response;
  const { auth } = guard;

  const body = asRecord(await req.json().catch(() => ({})));
  const userId = Number(body.userId);
  const role = normalizeCrmRole(body.role);

  if (!Number.isFinite(userId) || userId <= 0) {
    return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
  }

  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO crm_user_roles (
        id,
        tenant_id,
        user_id,
        role,
        created_by_user_id,
        created_at,
        updated_at
      ) VALUES (
        ${crypto.randomUUID()},
        ${auth.tenantId},
        ${Math.floor(userId)},
        ${role},
        ${auth.userId},
        NOW(),
        NOW()
      )
      ON CONFLICT (tenant_id, user_id)
      DO UPDATE SET
        role = EXCLUDED.role,
        updated_at = NOW()
    `
  );

  await trackCrmActivity({
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    entityType: "team",
    entityId: String(Math.floor(userId)),
    action: "team.role.updated",
    description: `CRM role set to ${role}`,
    meta: { userId: Math.floor(userId), role },
  });

  return NextResponse.json({ success: true, userId: Math.floor(userId), role });
}
