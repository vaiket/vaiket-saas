import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthContext, hasRoleAtLeast } from "@/lib/auth/session";

export async function GET(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasRoleAtLeast(auth.role, "admin")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const sessions = await prisma.userSession.findMany({
    where: {
      tenantId: auth.tenantId,
      revokedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      userId: true,
      jti: true,
      ip: true,
      userAgent: true,
      createdAt: true,
      lastSeenAt: true,
      expiresAt: true,
    },
  });

  const userIds = [...new Set(sessions.map((session) => session.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, tenantId: auth.tenantId },
    select: { id: true, name: true, email: true, role: true },
  });
  const userMap = new Map(users.map((user) => [user.id, user]));

  const rows = sessions.map((session) => {
    const user = userMap.get(session.userId);
    return {
      ...session,
      current: auth.jti ? auth.jti === session.jti : false,
      userName: user?.name ?? null,
      userEmail: user?.email ?? null,
      userRole: user?.role ?? null,
    };
  });

  return NextResponse.json({ success: true, sessions: rows });
}
