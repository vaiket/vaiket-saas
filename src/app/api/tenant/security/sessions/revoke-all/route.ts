import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { getAuthContext, hasRoleAtLeast } from "@/lib/auth/session";

type RevokeAllBody = {
  includeCurrent?: unknown;
};

export async function POST(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasRoleAtLeast(auth.role, "admin")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as RevokeAllBody;
  const includeCurrent = Boolean(body.includeCurrent);

  const whereClause = includeCurrent
    ? {
        tenantId: auth.tenantId,
        revokedAt: null as Date | null,
      }
    : {
        tenantId: auth.tenantId,
        revokedAt: null as Date | null,
        ...(auth.jti ? { jti: { not: auth.jti } } : {}),
      };

  const result = await prisma.userSession.updateMany({
    where: whereClause,
    data: { revokedAt: new Date() },
  });

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    action: "tenant.security.session.revoke_all",
    entity: "UserSession",
    entityId: null,
    meta: {
      includeCurrent,
      affectedCount: result.count,
    },
    req,
  });

  return NextResponse.json({
    success: true,
    message: "Sessions revoked",
    count: result.count,
  });
}
