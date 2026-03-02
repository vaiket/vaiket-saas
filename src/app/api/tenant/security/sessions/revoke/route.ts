import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { getAuthContext, hasRoleAtLeast } from "@/lib/auth/session";

type RevokeBody = {
  sessionId?: unknown;
};

export async function POST(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasRoleAtLeast(auth.role, "admin")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as RevokeBody;
  const sessionId = String(body.sessionId ?? "").trim();
  if (!sessionId) {
    return NextResponse.json({ success: false, error: "sessionId is required" }, { status: 400 });
  }

  const session = await prisma.userSession.findFirst({
    where: {
      id: sessionId,
      tenantId: auth.tenantId,
      revokedAt: null,
    },
    select: {
      id: true,
      userId: true,
      jti: true,
    },
  });

  if (!session) {
    return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 });
  }

  await prisma.userSession.update({
    where: { id: session.id },
    data: { revokedAt: new Date() },
  });

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    action: "tenant.security.session.revoke",
    entity: "UserSession",
    entityId: session.id,
    meta: {
      targetUserId: session.userId,
      revokedJti: session.jti,
    },
    req,
  });

  return NextResponse.json({ success: true, message: "Session revoked" });
}
