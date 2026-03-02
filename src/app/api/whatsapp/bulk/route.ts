import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { getAuthContext, hasRoleAtLeast } from "@/lib/auth/session";
import { ensureWhatsAppSubscriptionAccess } from "@/lib/subscriptions/whatsapp-gate";

type BulkSendBody = {
  accountId?: unknown;
  contactIds?: unknown;
  text?: unknown;
};

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

  const body = (await req.json()) as BulkSendBody;
  const accountId = String(body.accountId ?? "").trim();
  const text = String(body.text ?? "").trim();

  const ids = Array.isArray(body.contactIds)
    ? body.contactIds
        .map((id) => String(id ?? "").trim())
        .filter(Boolean)
    : [];

  if (!accountId || !text) {
    return NextResponse.json(
      { success: false, error: "accountId and text are required" },
      { status: 400 }
    );
  }

  const account = await prisma.waAccount.findFirst({
    where: { id: accountId, tenantId: auth.tenantId },
    select: { id: true },
  });

  if (!account) {
    return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 });
  }

  const contacts = await prisma.waContact.findMany({
    where: {
      tenantId: auth.tenantId,
      optedIn: true,
      ...(ids.length > 0 ? { id: { in: ids } } : {}),
    },
    select: {
      id: true,
      phone: true,
    },
    take: 1000,
  });

  if (contacts.length === 0) {
    return NextResponse.json(
      { success: false, error: "No opted-in contacts found" },
      { status: 400 }
    );
  }

  const now = new Date();
  let queued = 0;

  for (const contact of contacts) {
    const conversation = await prisma.waConversation.upsert({
      where: {
        tenantId_accountId_contactId: {
          tenantId: auth.tenantId,
          accountId,
          contactId: contact.id,
        },
      },
      create: {
        tenantId: auth.tenantId,
        accountId,
        contactId: contact.id,
        status: "open",
        lastMessageAt: now,
      },
      update: {
        status: "open",
        lastMessageAt: now,
      },
      select: {
        id: true,
      },
    });

    await prisma.waMessage.create({
      data: {
        tenantId: auth.tenantId,
        conversationId: conversation.id,
        accountId,
        direction: "outbound",
        messageType: "text",
        text,
        status: "queued",
        sentByUserId: auth.userId,
      },
    });

    await prisma.waContact.update({
      where: { id: contact.id },
      data: { lastMessageAt: now },
    });

    queued += 1;
  }

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    action: "tenant.whatsapp.bulk.send",
    entity: "WaMessage",
    entityId: null,
    meta: {
      accountId,
      recipients: queued,
    },
    req,
  });

  return NextResponse.json({
    success: true,
    queued,
  });
}
