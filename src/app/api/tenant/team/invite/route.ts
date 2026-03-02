import crypto from "crypto";

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { getAuthContext, hasRoleAtLeast } from "@/lib/auth/session";
import { isSmtpConfigured, sendTenantInviteEmail } from "@/lib/mail";

const allowedInviteRoles = new Set(["admin", "member", "viewer"]);

type InviteBody = {
  email?: unknown;
  role?: unknown;
};

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export async function POST(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasRoleAtLeast(auth.role, "admin")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  if (!isSmtpConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error: "SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS.",
      },
      { status: 500 }
    );
  }

  const body = (await req.json()) as InviteBody;
  const email = normalizeEmail(body.email);
  const role = String(body.role ?? "member").trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return NextResponse.json({ success: false, error: "Valid email required" }, { status: 400 });
  }

  if (!allowedInviteRoles.has(role)) {
    return NextResponse.json({ success: false, error: "Invalid role" }, { status: 400 });
  }

  if (role === "admin" && auth.role !== "owner") {
    const ownerCount = await prisma.user.count({
      where: { tenantId: auth.tenantId, role: "owner", status: "active" },
    });

    if (ownerCount > 0) {
      return NextResponse.json(
        { success: false, error: "Only owner can invite admin users" },
        { status: 403 }
      );
    }
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      email: { equals: email, mode: "insensitive" },
    },
    select: { id: true },
  });

  if (existingUser) {
    return NextResponse.json(
      {
        success: false,
        error:
          "This email is already linked to a workspace. Team invite is allowed only for fresh emails.",
      },
      { status: 409 }
    );
  }

  await prisma.tenantInvitation.updateMany({
    where: {
      tenantId: auth.tenantId,
      email,
      status: "pending",
    },
    data: { status: "replaced" },
  });

  const rawToken = `${crypto.randomUUID()}.${crypto.randomBytes(24).toString("hex")}`;
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invitation = await prisma.tenantInvitation.create({
    data: {
      tenantId: auth.tenantId,
      email,
      role,
      tokenHash,
      expiresAt,
      invitedByUserId: auth.userId,
    },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  const [tenant, inviter] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: auth.tenantId },
      select: { name: true },
    }),
    prisma.user.findUnique({
      where: { id: auth.userId },
      select: { name: true, email: true },
    }),
  ]);

  let emailSent = true;
  let mailWarning: string | null = null;
  try {
    await sendTenantInviteEmail({
      toEmail: email,
      tenantName: tenant?.name || "your workspace",
      inviterName: inviter?.name || inviter?.email || "Workspace admin",
      role,
      inviteToken: rawToken,
      expiresAt,
      requestUrl: req.url,
    });
  } catch (mailError) {
    emailSent = false;
    mailWarning =
      "Invitation created, but email could not be sent. Verify SMTP settings and sender email.";
    console.error("Invitation email send failed:", mailError);
  }

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    action: "tenant.team.invite",
    entity: "TenantInvitation",
    entityId: invitation.id,
    meta: {
      email,
      role,
      emailSent,
      mailWarning,
    },
    req,
  });

  return NextResponse.json({
    success: true,
    message: emailSent ? "Invitation created and email sent" : "Invitation created",
    invitation,
    emailSent,
    warning: mailWarning,
  }, { status: emailSent ? 200 : 202 });
}
