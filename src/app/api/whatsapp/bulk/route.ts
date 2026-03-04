import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { getAuthContext, hasRoleAtLeast } from "@/lib/auth/session";
import { ensureWhatsAppSubscriptionAccess } from "@/lib/subscriptions/whatsapp-gate";

type BulkSendBody = {
  accountId?: unknown;
  contactIds?: unknown;
  text?: unknown;
  numbersText?: unknown;
};

const MAX_MANUAL_NUMBERS = 1000;

function normalizePhone(raw: string) {
  return raw.trim().replace(/[^\d+]/g, "");
}

function parseNumbers(raw: string) {
  const parts = raw
    .split(/\r?\n|,|;/g)
    .map((item) => normalizePhone(item))
    .filter(Boolean);

  const unique = Array.from(new Set(parts));
  return {
    unique,
    totalInput: parts.length,
    duplicatesRemoved: parts.length - unique.length,
  };
}

async function readJsonSafe(req: Request): Promise<BulkSendBody | null> {
  try {
    return (await req.json()) as BulkSendBody;
  } catch {
    return null;
  }
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

  const body = await readJsonSafe(req);
  if (!body) {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const accountId = String(body.accountId ?? "").trim();
  const text = String(body.text ?? "").trim();
  const numbersText = String(body.numbersText ?? "").trim();

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

  const parsedNumbers = parseNumbers(numbersText);
  if (parsedNumbers.unique.length > MAX_MANUAL_NUMBERS) {
    return NextResponse.json(
      { success: false, error: `Max ${MAX_MANUAL_NUMBERS} manual numbers allowed` },
      { status: 400 }
    );
  }

  if (ids.length === 0 && parsedNumbers.unique.length === 0) {
    return NextResponse.json(
      { success: false, error: "Select contacts or provide manual numbers" },
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

  const selectedContacts =
    ids.length > 0
      ? await prisma.waContact.findMany({
          where: {
            tenantId: auth.tenantId,
            optedIn: true,
            id: { in: ids },
          },
          select: {
            id: true,
            phone: true,
          },
          take: 1000,
        })
      : [];

  const recipientMap = new Map<string, { id: string; phone: string }>();
  for (const contact of selectedContacts) {
    recipientMap.set(contact.id, contact);
  }

  for (const phone of parsedNumbers.unique) {
    const contact = await prisma.waContact.upsert({
      where: {
        tenantId_phone: {
          tenantId: auth.tenantId,
          phone,
        },
      },
      create: {
        tenantId: auth.tenantId,
        phone,
        optedIn: true,
        source: "bulk_manual",
      },
      update: {
        optedIn: true,
      },
      select: {
        id: true,
        phone: true,
      },
    });
    recipientMap.set(contact.id, contact);
  }

  const contacts = Array.from(recipientMap.values());
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
      selectedContacts: selectedContacts.length,
      manualNumbers: parsedNumbers.unique.length,
      manualDuplicatesRemoved: parsedNumbers.duplicatesRemoved,
    },
    req,
  });

  return NextResponse.json({
    success: true,
    queued,
    selectedContacts: selectedContacts.length,
    manualNumbers: parsedNumbers.unique.length,
    manualDuplicatesRemoved: parsedNumbers.duplicatesRemoved,
  });
}
