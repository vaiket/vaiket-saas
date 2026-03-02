import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { getAuthContext, hasRoleAtLeast } from "@/lib/auth/session";
import { sendMetaTextMessage } from "@/lib/whatsapp/meta";
import { ensureWhatsAppSubscriptionAccess } from "@/lib/subscriptions/whatsapp-gate";

type SendMessageBody = {
  conversationId?: unknown;
  text?: unknown;
  messageType?: unknown;
};

async function readJsonSafe(req: Request): Promise<SendMessageBody | null> {
  try {
    return (await req.json()) as SendMessageBody;
  } catch {
    return null;
  }
}

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

  const url = new URL(req.url);
  const conversationId = url.searchParams.get("conversationId")?.trim() || "";

  if (!conversationId) {
    return NextResponse.json(
      { success: false, error: "conversationId is required" },
      { status: 400 }
    );
  }

  const conversation = await prisma.waConversation.findFirst({
    where: { id: conversationId, tenantId: auth.tenantId },
    select: { id: true },
  });

  if (!conversation) {
    return NextResponse.json({ success: false, error: "Conversation not found" }, { status: 404 });
  }

  const messages = await prisma.waMessage.findMany({
    where: { tenantId: auth.tenantId, conversationId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      direction: true,
      messageType: true,
      text: true,
      mediaUrl: true,
      status: true,
      providerMessageId: true,
      createdAt: true,
      deliveredAt: true,
      readAt: true,
    },
  });

  return NextResponse.json({ success: true, messages });
}

export async function POST(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasRoleAtLeast(auth.role, "member")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const subscriptionBlocked = await ensureWhatsAppSubscriptionAccess(auth);
  if (subscriptionBlocked) return subscriptionBlocked;

  const body = await readJsonSafe(req);
  if (!body) {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const conversationId = String(body.conversationId ?? "").trim();
  const text = String(body.text ?? "").trim();
  const messageType = String(body.messageType ?? "text").trim().toLowerCase() || "text";

  if (!conversationId || !text) {
    return NextResponse.json(
      { success: false, error: "conversationId and text are required" },
      { status: 400 }
    );
  }

  const now = new Date();
  const conversation = await prisma.waConversation.findFirst({
    where: { id: conversationId, tenantId: auth.tenantId },
    select: {
      id: true,
      accountId: true,
      contactId: true,
      contact: {
        select: {
          phone: true,
        },
      },
      account: {
        select: {
          phoneNumberId: true,
          accessToken: true,
        },
      },
    },
  });

  if (!conversation) {
    return NextResponse.json({ success: false, error: "Conversation not found" }, { status: 404 });
  }

  if (messageType !== "text") {
    return NextResponse.json(
      { success: false, error: "Only text messages are supported in live inbox send" },
      { status: 400 }
    );
  }

  if (!conversation.account.accessToken || !conversation.account.phoneNumberId) {
    return NextResponse.json(
      {
        success: false,
        error: "Account is missing Meta access token or phoneNumberId",
      },
      { status: 400 }
    );
  }

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.waMessage.create({
      data: {
        tenantId: auth.tenantId,
        conversationId: conversation.id,
        accountId: conversation.accountId,
        direction: "outbound",
        messageType,
        text,
        status: "processing",
        sentByUserId: auth.userId,
      },
      select: {
        id: true,
        direction: true,
        messageType: true,
        text: true,
        status: true,
        createdAt: true,
        providerMessageId: true,
      },
    });

    await tx.waConversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: now },
    });

    await tx.waContact.update({
      where: { id: conversation.contactId },
      data: { lastMessageAt: now },
    });

    return created;
  });

  let providerMessageId: string | null = null;
  let dispatched = false;
  let dispatchError: string | null = null;

  try {
    const metaRes = await sendMetaTextMessage({
      phoneNumberId: conversation.account.phoneNumberId,
      accessToken: conversation.account.accessToken,
      to: conversation.contact.phone,
      text,
    });

    providerMessageId = metaRes.messageId;
    dispatched = true;

    await prisma.waMessage.update({
      where: { id: message.id },
      data: {
        status: "sent",
        providerMessageId: providerMessageId || undefined,
      },
    });
  } catch (err) {
    dispatchError = err instanceof Error ? err.message : "Meta send failed";

    await prisma.waMessage.update({
      where: { id: message.id },
      data: {
        status: "failed",
      },
    });
  }

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    action: "tenant.whatsapp.message.send",
    entity: "WaMessage",
    entityId: message.id,
    meta: {
      conversationId: conversation.id,
      messageType,
      dispatched,
      providerMessageId,
      dispatchError,
    },
    req,
  });

  if (!dispatched) {
    return NextResponse.json(
      {
        success: false,
        error: dispatchError || "Failed to send message via Meta API",
        messageId: message.id,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    message: {
      ...message,
      status: "sent",
      providerMessageId,
    },
  });
}
