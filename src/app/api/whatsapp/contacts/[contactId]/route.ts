import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { getAuthContext, hasRoleAtLeast } from "@/lib/auth/session";
import { ensureWhatsAppSubscriptionAccess } from "@/lib/subscriptions/whatsapp-gate";

type UpdateContactBody = {
  name?: unknown;
  email?: unknown;
  address?: unknown;
  tags?: unknown;
  optedIn?: unknown;
};

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .slice(0, 20);
}

function normalizeOptional(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

function normalizeEmail(value: unknown) {
  const email = String(value ?? "").trim().toLowerCase();
  if (!email) return null;
  return email;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ contactId: string }> }
) {
  const auth = await getAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasRoleAtLeast(auth.role, "member")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const subscriptionBlocked = await ensureWhatsAppSubscriptionAccess(auth);
  if (subscriptionBlocked) return subscriptionBlocked;

  const { contactId } = await context.params;
  const id = String(contactId || "").trim();
  if (!id) {
    return NextResponse.json({ success: false, error: "contactId is required" }, { status: 400 });
  }

  let body: UpdateContactBody;
  try {
    body = (await req.json()) as UpdateContactBody;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const existing = await prisma.waContact.findFirst({
    where: {
      id,
      tenantId: auth.tenantId,
    },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ success: false, error: "Contact not found" }, { status: 404 });
  }

  const email = normalizeEmail(body.email);
  if (email && !isValidEmail(email)) {
    return NextResponse.json({ success: false, error: "Invalid email format" }, { status: 400 });
  }

  const contact = await prisma.waContact.update({
    where: { id: existing.id },
    data: {
      name: normalizeOptional(body.name),
      email,
      address: normalizeOptional(body.address),
      tags: normalizeTags(body.tags),
      optedIn: Boolean(body.optedIn),
    },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      address: true,
      source: true,
      tags: true,
      optedIn: true,
      lastMessageAt: true,
      updatedAt: true,
    },
  });

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    action: "tenant.whatsapp.contact.update",
    entity: "WaContact",
    entityId: contact.id,
    meta: {
      phone: contact.phone,
      email: contact.email,
      optedIn: contact.optedIn,
      tags: contact.tags,
    },
    req,
  });

  return NextResponse.json({ success: true, contact });
}
