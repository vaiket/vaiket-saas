import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthContext, hasRoleAtLeast } from "@/lib/auth/session";

export async function GET(req: Request) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!hasRoleAtLeast(auth.role, "admin")) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const logs = await prisma.auditLog.findMany({
      where: { tenantId: auth.tenantId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        tenantId: true,
        actorUserId: true,
        action: true,
        entity: true,
        entityId: true,
        meta: true,
        ip: true,
        userAgent: true,
        createdAt: true,
      },
    });

    const safeLogs = logs.map((log) => ({
      ...log,
      id: log.id.toString(),
    }));

    return NextResponse.json({
      success: true,
      logs: safeLogs,
    });
  } catch (error) {
    console.error("Tenant audit GET error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to load audit logs",
        ...(process.env.NODE_ENV !== "production"
          ? {
              detail: error instanceof Error ? error.message : String(error),
            }
          : {}),
      },
      { status: 500 }
    );
  }
}
