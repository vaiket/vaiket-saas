import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { getAuthContext, hasRoleAtLeast } from "@/lib/auth/session";

const allowedStatuses = new Set(["active", "suspended"]);

type StatusBody = {
  userId?: unknown;
  status?: unknown;
};

export async function POST(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasRoleAtLeast(auth.role, "admin")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as StatusBody;
  const userId = Number(body.userId);
  const nextStatus = String(body.status ?? "").trim().toLowerCase();

  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ success: false, error: "Invalid userId" }, { status: 400 });
  }

  if (!allowedStatuses.has(nextStatus)) {
    return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 });
  }

  const targetUser = await prisma.user.findFirst({
    where: { id: userId, tenantId: auth.tenantId },
    select: { id: true, role: true, status: true, email: true },
  });

  if (!targetUser) {
    return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
  }

  if (auth.userId === targetUser.id && nextStatus !== "active") {
    return NextResponse.json(
      { success: false, error: "You cannot suspend your own account" },
      { status: 400 }
    );
  }

  if (targetUser.role === "owner" && auth.role !== "owner") {
    return NextResponse.json(
      { success: false, error: "Only owner can update owner status" },
      { status: 403 }
    );
  }

  if (targetUser.role === "owner" && nextStatus !== "active") {
    return NextResponse.json(
      { success: false, error: "Owner account cannot be suspended here" },
      { status: 400 }
    );
  }

  const updated = await prisma.user.update({
    where: { id: targetUser.id },
    data: { status: nextStatus },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      isEmailVerified: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  if (nextStatus !== "active") {
    await prisma.userSession.updateMany({
      where: {
        userId: targetUser.id,
        tenantId: auth.tenantId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    action: "tenant.team.status.update",
    entity: "User",
    entityId: String(targetUser.id),
    meta: {
      previousStatus: targetUser.status,
      nextStatus,
      targetEmail: targetUser.email,
    },
    req,
  });

  return NextResponse.json({
    success: true,
    message: "User status updated",
    user: updated,
  });
}
