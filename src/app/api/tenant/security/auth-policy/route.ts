import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { getAuthContext, hasRoleAtLeast } from "@/lib/auth/session";

type AuthPolicyBody = {
  googleLoginRequired?: unknown;
};

export async function GET(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasRoleAtLeast(auth.role, "admin")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const settings = await prisma.tenantSettings.findUnique({
    where: { tenantId: auth.tenantId },
    select: {
      googleLoginRequired: true,
    },
  });

  return NextResponse.json({
    success: true,
    policy: {
      googleLoginRequired: Boolean(settings?.googleLoginRequired),
    },
    canEdit: auth.role === "owner",
  });
}

export async function PUT(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (auth.role !== "owner") {
    return NextResponse.json({ success: false, error: "Only owner can update auth policy" }, { status: 403 });
  }

  let body: AuthPolicyBody;
  try {
    body = (await req.json()) as AuthPolicyBody;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.googleLoginRequired !== "boolean") {
    return NextResponse.json(
      { success: false, error: "googleLoginRequired must be boolean" },
      { status: 400 }
    );
  }

  const settings = await prisma.tenantSettings.upsert({
    where: { tenantId: auth.tenantId },
    update: {
      googleLoginRequired: body.googleLoginRequired,
    },
    create: {
      tenantId: auth.tenantId,
      googleLoginRequired: body.googleLoginRequired,
    },
    select: {
      googleLoginRequired: true,
    },
  });

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    action: "tenant.security.auth_policy.update",
    entity: "TenantSettings",
    entityId: String(auth.tenantId),
    meta: {
      googleLoginRequired: settings.googleLoginRequired,
    },
    req,
  });

  return NextResponse.json({
    success: true,
    message: "Authentication policy updated",
    policy: {
      googleLoginRequired: settings.googleLoginRequired,
    },
  });
}

