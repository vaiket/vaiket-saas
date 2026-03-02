import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { getAuthContext, hasRoleAtLeast } from "@/lib/auth/session";
import { ensureWhatsAppSubscriptionAccess } from "@/lib/subscriptions/whatsapp-gate";

type CreateRuleBody = {
  name?: unknown;
  matchType?: unknown;
  pattern?: unknown;
  responseType?: unknown;
  responseText?: unknown;
  handoverToHuman?: unknown;
  isActive?: unknown;
  priority?: unknown;
};

type UpdateRuleBody = {
  id?: unknown;
  name?: unknown;
  matchType?: unknown;
  pattern?: unknown;
  responseType?: unknown;
  responseText?: unknown;
  handoverToHuman?: unknown;
  isActive?: unknown;
  priority?: unknown;
};

export async function GET(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasRoleAtLeast(auth.role, "member")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const subscriptionBlocked = await ensureWhatsAppSubscriptionAccess(auth);
  if (subscriptionBlocked) return subscriptionBlocked;

  const rules = await prisma.waBotRule.findMany({
    where: { tenantId: auth.tenantId },
    orderBy: [{ isActive: "desc" }, { priority: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      matchType: true,
      pattern: true,
      responseType: true,
      responseText: true,
      handoverToHuman: true,
      isActive: true,
      priority: true,
      createdByUserId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ success: true, rules });
}

export async function POST(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasRoleAtLeast(auth.role, "admin")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const subscriptionBlocked = await ensureWhatsAppSubscriptionAccess(auth);
  if (subscriptionBlocked) return subscriptionBlocked;

  const body = (await req.json()) as CreateRuleBody;
  const name = String(body.name ?? "").trim();
  const responseText = String(body.responseText ?? "").trim();

  if (!name || !responseText) {
    return NextResponse.json(
      { success: false, error: "name and responseText are required" },
      { status: 400 }
    );
  }

  const matchType = String(body.matchType ?? "keyword").trim().toLowerCase() || "keyword";
  const responseType = String(body.responseType ?? "text").trim().toLowerCase() || "text";

  const rule = await prisma.waBotRule.create({
    data: {
      tenantId: auth.tenantId,
      name,
      matchType,
      pattern: String(body.pattern ?? "").trim() || null,
      responseType,
      responseText,
      handoverToHuman: Boolean(body.handoverToHuman),
      isActive: body.isActive === undefined ? true : Boolean(body.isActive),
      priority: Number(body.priority) > 0 ? Number(body.priority) : 100,
      createdByUserId: auth.userId,
    },
    select: {
      id: true,
      name: true,
      matchType: true,
      pattern: true,
      responseType: true,
      responseText: true,
      handoverToHuman: true,
      isActive: true,
      priority: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    action: "tenant.whatsapp.chatbot.rule.create",
    entity: "WaBotRule",
    entityId: rule.id,
    meta: {
      matchType: rule.matchType,
      priority: rule.priority,
      isActive: rule.isActive,
    },
    req,
  });

  return NextResponse.json({ success: true, rule });
}

export async function PATCH(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasRoleAtLeast(auth.role, "admin")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const subscriptionBlocked = await ensureWhatsAppSubscriptionAccess(auth);
  if (subscriptionBlocked) return subscriptionBlocked;

  const body = (await req.json()) as UpdateRuleBody;
  const id = String(body.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });
  }

  const updateData: Prisma.WaBotRuleUpdateInput = {};
  if (body.name !== undefined) updateData.name = String(body.name ?? "").trim();
  if (body.matchType !== undefined) {
    updateData.matchType = String(body.matchType ?? "").trim().toLowerCase();
  }
  if (body.pattern !== undefined) {
    updateData.pattern = String(body.pattern ?? "").trim() || null;
  }
  if (body.responseType !== undefined) {
    updateData.responseType = String(body.responseType ?? "").trim().toLowerCase();
  }
  if (body.responseText !== undefined) {
    updateData.responseText = String(body.responseText ?? "").trim() || null;
  }
  if (body.handoverToHuman !== undefined) {
    updateData.handoverToHuman = Boolean(body.handoverToHuman);
  }
  if (body.isActive !== undefined) {
    updateData.isActive = Boolean(body.isActive);
  }
  if (body.priority !== undefined) {
    const priority = Number(body.priority);
    updateData.priority = Number.isFinite(priority) && priority > 0 ? Math.floor(priority) : 100;
  }

  const updated = await prisma.waBotRule.updateMany({
    where: {
      id,
      tenantId: auth.tenantId,
    },
    data: updateData,
  });

  if (updated.count === 0) {
    return NextResponse.json({ success: false, error: "Rule not found" }, { status: 404 });
  }

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    action: "tenant.whatsapp.chatbot.rule.update",
    entity: "WaBotRule",
    entityId: id,
    meta: {
      updatedFields: Object.keys(updateData),
    },
    req,
  });

  return NextResponse.json({ success: true });
}
