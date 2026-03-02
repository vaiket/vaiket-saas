import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { getAuthContext, hasRoleAtLeast } from "@/lib/auth/session";

const allowedRoles = new Set(["owner", "admin", "member", "viewer"]);

type RoleBody = {
  userId?: unknown;
  role?: unknown;
};

export async function POST(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasRoleAtLeast(auth.role, "admin")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as RoleBody;
  const userId = Number(body.userId);
  const nextRole = String(body.role ?? "").trim().toLowerCase();

  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ success: false, error: "Invalid userId" }, { status: 400 });
  }

  if (!allowedRoles.has(nextRole)) {
    return NextResponse.json({ success: false, error: "Invalid role" }, { status: 400 });
  }

  const activeOwnerCount = await prisma.user.count({
    where: { tenantId: auth.tenantId, role: "owner", status: "active" },
  });

  if (nextRole === "owner" && auth.role !== "owner" && activeOwnerCount > 0) {
    return NextResponse.json(
      { success: false, error: "Only owner can assign owner role" },
      { status: 403 }
    );
  }

  if (nextRole === "admin" && auth.role !== "owner" && activeOwnerCount > 0) {
    return NextResponse.json(
      { success: false, error: "Only owner can assign admin role" },
      { status: 403 }
    );
  }

  const targetUser = await prisma.user.findFirst({
    where: { id: userId, tenantId: auth.tenantId },
    select: { id: true, role: true, email: true },
  });

  if (!targetUser) {
    return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
  }

  if (targetUser.role === "owner" && nextRole !== "owner") {
    return NextResponse.json(
      { success: false, error: "Owner role is locked and cannot be changed" },
      { status: 400 }
    );
  }

  if (targetUser.role === "owner" && auth.role !== "owner") {
    return NextResponse.json(
      { success: false, error: "Only owner can update another owner" },
      { status: 403 }
    );
  }

  if (auth.userId === targetUser.id && auth.role !== "owner") {
    return NextResponse.json(
      { success: false, error: "You cannot change your own role" },
      { status: 403 }
    );
  }

  const updated = await prisma.user.update({
    where: { id: targetUser.id },
    data: { role: nextRole },
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

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    action: "tenant.team.role.update",
    entity: "User",
    entityId: String(targetUser.id),
    meta: {
      previousRole: targetUser.role,
      nextRole,
      targetEmail: targetUser.email,
    },
    req,
  });

  return NextResponse.json({
    success: true,
    message: "Role updated",
    user: updated,
  });
}
