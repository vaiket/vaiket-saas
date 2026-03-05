import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { getAuthContext, hasRoleAtLeast } from "@/lib/auth/session";
import { getPublicBaseUrl } from "@/lib/url/public-base";
import { sendMetaMediaMessage, sendMetaTextMessage } from "@/lib/whatsapp/meta";
import { ensureWhatsAppSubscriptionAccess } from "@/lib/subscriptions/whatsapp-gate";

type SendMessageBody = {
  conversationId?: unknown;
  text?: unknown;
  messageType?: unknown;
  mediaUrl?: unknown;
  fileName?: unknown;
};

type SupportedMessageType = "text" | "image" | "video" | "audio" | "document";
const DEFAULT_FETCH_LIMIT = 20;
const MAX_FETCH_LIMIT = 200;

async function readJsonSafe(req: Request): Promise<SendMessageBody | null> {
  try {
    return (await req.json()) as SendMessageBody;
  } catch {
    return null;
  }
}

function readBoundedInt(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const rounded = Math.floor(parsed);
  if (rounded < min) return min;
  if (rounded > max) return max;
  return rounded;
}

function inferMediaTypeFromUrl(value: string): Exclude<SupportedMessageType, "text"> {
  const normalized = value.toLowerCase();
  if (/\.(png|jpe?g|gif|bmp|webp|svg)(\?.*)?$/.test(normalized)) return "image";
  if (/\.(mp4|mov|avi|mkv|webm)(\?.*)?$/.test(normalized)) return "video";
  if (/\.(mp3|ogg|m4a|aac|wav)(\?.*)?$/.test(normalized)) return "audio";
  return "document";
}

function normalizeMessageType(value: string, mediaUrl: string): SupportedMessageType {
  const normalized = value.trim().toLowerCase();
  if (normalized === "text") return "text";
  if (normalized === "image") return "image";
  if (normalized === "video") return "video";
  if (normalized === "audio") return "audio";
  if (normalized === "document" || normalized === "file" || normalized === "pdf") return "document";
  if (!normalized && mediaUrl) return inferMediaTypeFromUrl(mediaUrl);
  return "text";
}

function normalizeMediaUrlForMeta(raw: string, req: Request) {
  const mediaUrl = String(raw || "").trim();
  if (!mediaUrl) return "";
  if (/^https?:\/\//i.test(mediaUrl)) return mediaUrl;
  const base = getPublicBaseUrl(req).replace(/\/+$/g, "");
  const relative = mediaUrl.startsWith("/") ? mediaUrl : `/${mediaUrl}`;
  return `${base}${relative}`;
}

export async function GET(req: Request) {
  try {
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
    const limit = readBoundedInt(url.searchParams.get("limit"), DEFAULT_FETCH_LIMIT, 20, MAX_FETCH_LIMIT);

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

    const messagesDesc = await prisma.waMessage.findMany({
      where: { tenantId: auth.tenantId, conversationId },
      orderBy: { createdAt: "desc" },
      take: limit,
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

    const messages = [...messagesDesc].reverse();

    return NextResponse.json({ success: true, messages });
  } catch (error) {
    console.error("GET /api/whatsapp/inbox/messages failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to load messages",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
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
    const rawMediaUrl = String(body.mediaUrl ?? "").trim();
    const fileName = String(body.fileName ?? "").trim();
    const messageType = normalizeMessageType(String(body.messageType ?? ""), rawMediaUrl);
    const mediaUrlForMeta = normalizeMediaUrlForMeta(rawMediaUrl, req);

    if (!conversationId) {
      return NextResponse.json({ success: false, error: "conversationId is required" }, { status: 400 });
    }

    if (messageType === "text" && !text) {
      return NextResponse.json(
        { success: false, error: "text is required for text messages" },
        { status: 400 }
      );
    }

    if (messageType !== "text" && !mediaUrlForMeta) {
      return NextResponse.json(
        { success: false, error: "mediaUrl is required for media messages" },
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
          text: text || null,
          mediaUrl: mediaUrlForMeta || null,
          status: "processing",
          sentByUserId: auth.userId,
        },
        select: {
          id: true,
          direction: true,
          messageType: true,
          text: true,
          mediaUrl: true,
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
      const metaRes =
        messageType === "text"
          ? await sendMetaTextMessage({
              phoneNumberId: conversation.account.phoneNumberId,
              accessToken: conversation.account.accessToken,
              to: conversation.contact.phone,
              text,
            })
          : await sendMetaMediaMessage({
              phoneNumberId: conversation.account.phoneNumberId,
              accessToken: conversation.account.accessToken,
              to: conversation.contact.phone,
              mediaType: messageType,
              link: mediaUrlForMeta,
              caption: text || undefined,
              filename: fileName || undefined,
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
        mediaUrl: mediaUrlForMeta || null,
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
  } catch (error) {
    console.error("POST /api/whatsapp/inbox/messages failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to send message",
      },
      { status: 500 }
    );
  }
}
