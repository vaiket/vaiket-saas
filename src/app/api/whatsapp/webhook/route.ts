import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { handleInboundCrmAutomation } from "@/lib/crm/whatsapp";
import { sendMetaTextMessage } from "@/lib/whatsapp/meta";

type AccountCtx = {
  id: string;
  tenantId: number;
  phoneNumberId: string | null;
  accessToken: string | null;
};

type InboundCtx = {
  inboundMessageId: string;
  conversationId: string;
  from: string;
  text: string;
};

type FlowNode = {
  id: string;
  type: string;
  data?: {
    label?: string;
    text?: string;
  };
};

type FlowEdge = {
  id: string;
  sourceId: string;
  targetId: string;
};

type MetaWebhookBody = {
  object?: string;
  entry?: Array<Record<string, unknown>>;
};

const DEFAULT_WEBHOOK_MAX_BODY_BYTES = 512_000;
const DEFAULT_GRAPH_API_VERSION = "v25.0";
const DEFAULT_MEDIA_FETCH_TIMEOUT_MS = 20_000;

function asArray<T = Record<string, unknown>>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function normalizeEntries(body: Record<string, unknown>) {
  const entries = asArray<Record<string, unknown>>(body.entry);
  if (entries.length > 0) return entries;

  // Meta's "Test" UI can send only the change object: { field, value }.
  const field = readText(body.field);
  const value = body.value;
  if (field && value && typeof value === "object") {
    return [{ changes: [{ field, value }] }];
  }

  const changes = asArray<Record<string, unknown>>(body.changes);
  if (changes.length > 0) {
    return [{ changes }];
  }

  return [];
}

function readText(value: unknown) {
  return String(value ?? "").trim();
}

function readBoolean(value: string | undefined): boolean | null {
  const text = readText(value).toLowerCase();
  if (!text) return null;
  if (text === "1" || text === "true" || text === "yes" || text === "on") return true;
  if (text === "0" || text === "false" || text === "no" || text === "off") return false;
  return null;
}

function readBoundedInt(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const rounded = Math.floor(parsed);
  if (rounded < min) return min;
  if (rounded > max) return max;
  return rounded;
}

function requiresSignatureValidation() {
  const explicit = readBoolean(process.env.WHATSAPP_WEBHOOK_REQUIRE_SIGNATURE);
  if (explicit !== null) return explicit;
  return process.env.NODE_ENV === "production";
}

function webhookAppSecret() {
  return readText(process.env.WHATSAPP_WEBHOOK_APP_SECRET) || readText(process.env.META_APP_SECRET);
}

function verifyWebhookSignature(rawBody: string, signatureHeader: string | null) {
  const appSecret = webhookAppSecret();
  const required = requiresSignatureValidation();
  if (!appSecret) {
    return {
      ok: !required,
      reason: "missing_app_secret",
    };
  }

  const rawSignature = readText(signatureHeader);
  if (!rawSignature) {
    return { ok: false, reason: "missing_signature_header" };
  }

  const prefix = "sha256=";
  const normalized = rawSignature.toLowerCase();
  if (!normalized.startsWith(prefix)) {
    return { ok: false, reason: "invalid_signature_prefix" };
  }

  const digest = normalized.slice(prefix.length);
  if (!/^[a-f0-9]{64}$/.test(digest)) {
    return { ok: false, reason: "invalid_signature_digest" };
  }

  const expectedDigest = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const expectedBuffer = Buffer.from(expectedDigest, "hex");
  const receivedBuffer = Buffer.from(digest, "hex");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return { ok: false, reason: "invalid_signature_length" };
  }

  if (!crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
    return { ok: false, reason: "signature_mismatch" };
  }

  return { ok: true, reason: null };
}

function parseMetaTimestamp(value: unknown) {
  const raw = readText(value);
  if (!raw) return new Date();
  const unixSeconds = Number(raw);
  if (!Number.isFinite(unixSeconds) || unixSeconds <= 0) {
    return new Date();
  }
  return new Date(unixSeconds * 1000);
}

function graphVersion() {
  const raw = readText(process.env.WHATSAPP_GRAPH_API_VERSION);
  return raw || DEFAULT_GRAPH_API_VERSION;
}

function normalizeInboundMessageType(value: string) {
  const normalized = readText(value).toLowerCase();
  if (!normalized) return "text";
  if (normalized === "text" || normalized === "button" || normalized === "interactive") return "text";
  if (normalized === "sticker") return "image";
  if (normalized === "image") return "image";
  if (normalized === "video") return "video";
  if (normalized === "audio" || normalized === "voice") return "audio";
  if (normalized === "document" || normalized === "file") return "document";
  return "text";
}

function extensionFromMime(mimeType: string, fallbackType: string) {
  const normalized = readText(mimeType).toLowerCase();
  if (normalized.includes("jpeg")) return "jpg";
  if (normalized.includes("png")) return "png";
  if (normalized.includes("webp")) return "webp";
  if (normalized.includes("gif")) return "gif";
  if (normalized.includes("mp4")) return "mp4";
  if (normalized.includes("quicktime")) return "mov";
  if (normalized.includes("mpeg")) return "mp3";
  if (normalized.includes("ogg")) return "ogg";
  if (normalized.includes("wav")) return "wav";
  if (normalized.includes("pdf")) return "pdf";
  if (normalized.includes("msword")) return "doc";
  if (normalized.includes("wordprocessingml")) return "docx";
  if (normalized.includes("spreadsheetml")) return "xlsx";
  if (normalized.includes("presentationml")) return "pptx";

  if (fallbackType === "image") return "jpg";
  if (fallbackType === "video") return "mp4";
  if (fallbackType === "audio") return "ogg";
  return "bin";
}

function sanitizeFileToken(value: string, fallback: string) {
  const token = value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32);
  return token || fallback;
}

async function fetchMetaMediaToPublicUrl(params: {
  accountId: string;
  accessToken: string;
  mediaId: string;
  messageType: string;
}) {
  const mediaId = readText(params.mediaId);
  const accessToken = readText(params.accessToken);
  if (!mediaId || !accessToken) return null;

  const timeoutMs = readBoundedInt(
    process.env.WHATSAPP_MEDIA_FETCH_TIMEOUT_MS,
    DEFAULT_MEDIA_FETCH_TIMEOUT_MS,
    3_000,
    60_000
  );

  const detailsController = new AbortController();
  const detailsTimeout = setTimeout(() => detailsController.abort(), timeoutMs);

  let details: Record<string, unknown> = {};
  try {
    const detailsRes = await fetch(
      `https://graph.facebook.com/${graphVersion()}/${encodeURIComponent(mediaId)}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: detailsController.signal,
      }
    );
    details = asRecord(await detailsRes.json().catch(() => ({})));
    if (!detailsRes.ok) {
      const message = readText(asRecord(details.error).message) || `Meta media lookup failed (${detailsRes.status})`;
      throw new Error(message);
    }
  } finally {
    clearTimeout(detailsTimeout);
  }

  const remoteUrl = readText(details.url);
  if (!remoteUrl) return null;
  const mimeType = readText(details.mime_type);
  const ext = extensionFromMime(mimeType, params.messageType);
  const fileToken = sanitizeFileToken(mediaId, "media");
  const accountToken = sanitizeFileToken(params.accountId, "account");
  const fileName = `${Date.now()}-${accountToken}-${fileToken}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public/uploads/wa-inbox");
  const filePath = path.join(uploadDir, fileName);

  const mediaController = new AbortController();
  const mediaTimeout = setTimeout(() => mediaController.abort(), timeoutMs);

  try {
    const mediaRes = await fetch(remoteUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: mediaController.signal,
    });
    if (!mediaRes.ok) {
      throw new Error(`Meta media download failed (${mediaRes.status})`);
    }
    const bytes = await mediaRes.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(filePath, buffer);
    return `/uploads/wa-inbox/${fileName}`;
  } finally {
    clearTimeout(mediaTimeout);
  }
}

function extractInboundText(message: Record<string, unknown>) {
  const type = readText(message.type).toLowerCase();

  if (type === "text") {
    const textBody = (message.text as Record<string, unknown> | undefined)?.body;
    return readText(textBody);
  }

  if (type === "button") {
    const textBody = (message.button as Record<string, unknown> | undefined)?.text;
    return readText(textBody);
  }

  if (type === "interactive") {
    const interactive = (message.interactive as Record<string, unknown> | undefined) || {};
    const buttonReply = (interactive.button_reply as Record<string, unknown> | undefined)?.title;
    const listReply = (interactive.list_reply as Record<string, unknown> | undefined)?.title;
    const picked = readText(buttonReply) || readText(listReply);
    if (picked) return picked;
  }

  const fallbackPayload = JSON.stringify(message);
  return fallbackPayload.length > 1500 ? `${fallbackPayload.slice(0, 1500)}...` : fallbackPayload;
}

function mapMessageStatus(value: unknown) {
  const status = readText(value).toLowerCase();
  if (status === "sent") return "sent";
  if (status === "delivered") return "delivered";
  if (status === "read") return "read";
  if (status === "failed") return "failed";
  return "processing";
}

function keywordMatches(text: string, rawKeyword: unknown) {
  const source = readText(text).toLowerCase();
  const keywordBlob = readText(rawKeyword).toLowerCase();
  if (!source || !keywordBlob) return false;
  const keywords = keywordBlob
    .split(/[,\n|]/g)
    .map((v) => v.trim())
    .filter(Boolean);
  if (keywords.length === 0) return false;
  return keywords.some((keyword) => source.includes(keyword));
}

function asRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function extractSendTexts(actionConfig: unknown): string[] {
  const action = asRecord(actionConfig);
  const legacyReply = readText(action.reply);
  if (legacyReply) return [legacyReply];

  const graph = asRecord(action.graph);
  const nodesRaw = asArray(graph.nodes);
  const edgesRaw = asArray(graph.edges);
  if (nodesRaw.length === 0 || edgesRaw.length === 0) return [];

  const nodes: FlowNode[] = nodesRaw
    .map((item) => {
      const raw = asRecord(item);
      const id = readText(raw.id);
      const type = readText(raw.type);
      if (!id || !type) return null;
      return {
        id,
        type,
        data: asRecord(raw.data) as FlowNode["data"],
      };
    })
    .filter((item): item is FlowNode => Boolean(item));

  const edges: FlowEdge[] = edgesRaw
    .map((item) => {
      const raw = asRecord(item);
      const id = readText(raw.id);
      const sourceId = readText(raw.sourceId);
      const targetId = readText(raw.targetId);
      if (!id || !sourceId || !targetId) return null;
      return { id, sourceId, targetId };
    })
    .filter((item): item is FlowEdge => Boolean(item));

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const trigger = nodes.find((node) => node.type === "trigger_keyword");
  if (!trigger) return [];

  const outgoing = (id: string) => edges.filter((edge) => edge.sourceId === id);
  const visited = new Set<string>([trigger.id]);
  const texts: string[] = [];
  let current = trigger.id;

  for (let hop = 0; hop < 30; hop += 1) {
    const nextEdge = outgoing(current)[0];
    if (!nextEdge) break;
    const nextNode = nodeMap.get(nextEdge.targetId);
    if (!nextNode) break;
    if (visited.has(nextNode.id)) break;
    visited.add(nextNode.id);

    if (nextNode.type === "send_text") {
      const body = readText(nextNode.data?.text);
      if (body) texts.push(body);
    }

    if (nextNode.type === "end") break;
    current = nextNode.id;
  }

  return texts;
}

async function verifyWebhookToken(token: string) {
  const envToken = readText(process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN);
  if (envToken) {
    return envToken === token;
  }

  try {
    const account = await prisma.waAccount.findFirst({
      where: {
        webhookVerifyToken: token,
      },
      select: { id: true },
    });

    return Boolean(account);
  } catch (error) {
    // Never break Meta verification with 500 just because DB lookup fails.
    console.error("[whatsapp/webhook] token verification lookup failed", error);
    return false;
  }
}

async function runKeywordWorkflowOnInbound(account: AccountCtx, inbound: InboundCtx) {
  const workflows = await prisma.waWorkflow.findMany({
    where: {
      tenantId: account.tenantId,
      isActive: true,
    },
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      triggerType: true,
      triggerConfig: true,
      actionConfig: true,
    },
  });

  const matched = workflows.find((workflow) => {
    const trigger = asRecord(workflow.triggerConfig);
    const allowedAccountId = readText(trigger.accountId);
    if (allowedAccountId && allowedAccountId !== account.id) return false;

    const triggerType = readText(workflow.triggerType).toLowerCase();
    const isKeywordType =
      triggerType === "keyword" ||
      triggerType === "keyword_flow" ||
      triggerType === "flow" ||
      triggerType === "keyword-based";
    if (!isKeywordType) return false;

    return keywordMatches(inbound.text, trigger.keyword);
  });

  if (!matched) return;

  const run = await prisma.waWorkflowRun.create({
    data: {
      tenantId: account.tenantId,
      workflowId: matched.id,
      conversationId: inbound.conversationId,
      status: "processing",
      input: {
        from: inbound.from,
        text: inbound.text,
        accountId: account.id,
        inboundMessageId: inbound.inboundMessageId,
      },
    },
    select: { id: true },
  });

  const texts = extractSendTexts(matched.actionConfig);
  if (texts.length === 0) {
    await prisma.waWorkflowRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        error: "No send_text action found in workflow graph",
        finishedAt: new Date(),
      },
    });
    return;
  }

  if (!account.accessToken || !account.phoneNumberId) {
    await prisma.waWorkflowRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        error: "Account is missing access token or phone number id",
        finishedAt: new Date(),
      },
    });
    return;
  }

  let sentCount = 0;
  let failedCount = 0;
  let firstError: string | null = null;
  const now = new Date();

  for (const body of texts) {
    const outbound = await prisma.waMessage.create({
      data: {
        tenantId: account.tenantId,
        conversationId: inbound.conversationId,
        accountId: account.id,
        direction: "outbound",
        messageType: "text",
        text: body,
        status: "processing",
        sentByUserId: null,
      },
      select: { id: true },
    });

    try {
      const sent = await sendMetaTextMessage({
        phoneNumberId: account.phoneNumberId,
        accessToken: account.accessToken,
        to: inbound.from,
        text: body,
      });

      await prisma.waMessage.update({
        where: { id: outbound.id },
        data: {
          status: "sent",
          providerMessageId: sent.messageId,
        },
      });
      sentCount += 1;
    } catch (error) {
      failedCount += 1;
      if (!firstError) {
        firstError = error instanceof Error ? error.message : "Failed to send workflow reply";
      }

      await prisma.waMessage.update({
        where: { id: outbound.id },
        data: { status: "failed" },
      });
    }
  }

  await prisma.waConversation.update({
    where: { id: inbound.conversationId },
    data: { lastMessageAt: now },
  });

  await prisma.waWorkflowRun.update({
    where: { id: run.id },
    data: {
      status: failedCount > 0 && sentCount === 0 ? "failed" : "success",
      output: {
        repliesPlanned: texts.length,
        sentCount,
        failedCount,
      },
      error: firstError,
      finishedAt: now,
    },
  });
}

async function handleInboundMessage(
  account: AccountCtx,
  message: Record<string, unknown>,
  contactProfileName: string | null
): Promise<InboundCtx | null> {
  const providerMessageId = readText(message.id);
  const from = readText(message.from);
  if (!from) return null;

  if (providerMessageId) {
    const duplicate = await prisma.waMessage.findFirst({
      where: {
        tenantId: account.tenantId,
        accountId: account.id,
        direction: "inbound",
        providerMessageId,
      },
      select: { id: true },
    });
    if (duplicate) return null;
  }

  const occurredAt = parseMetaTimestamp(message.timestamp);
  const rawMessageType = readText(message.type).toLowerCase();
  const messageType = normalizeInboundMessageType(rawMessageType);
  let text = extractInboundText(message);
  let mediaUrl: string | null = null;

  if (messageType !== "text") {
    const mediaPayload = asRecord(message[rawMessageType]);
    const mediaId = readText(mediaPayload.id);
    const caption = readText(mediaPayload.caption);
    const directLink = readText(mediaPayload.link);
    if (caption) {
      text = caption;
    } else {
      text = text.startsWith("{") ? "" : text;
    }

    mediaUrl = directLink || null;

    if (!mediaUrl && mediaId && account.accessToken) {
      try {
        mediaUrl = await fetchMetaMediaToPublicUrl({
          accountId: account.id,
          accessToken: account.accessToken,
          mediaId,
          messageType,
        });
      } catch (error) {
        console.error("[whatsapp/webhook] inbound media fetch failed", {
          mediaId,
          accountId: account.id,
          tenantId: account.tenantId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (!text) {
      text = `[${messageType}]`;
    }
  }

  const contact = await prisma.waContact.upsert({
    where: {
      tenantId_phone: {
        tenantId: account.tenantId,
        phone: from,
      },
    },
    create: {
      tenantId: account.tenantId,
      phone: from,
      name: contactProfileName,
      optedIn: true,
      source: "whatsapp_webhook",
      lastMessageAt: occurredAt,
    },
    update: {
      ...(contactProfileName ? { name: contactProfileName } : {}),
      lastMessageAt: occurredAt,
    },
    select: {
      id: true,
    },
  });

  const conversation = await prisma.waConversation.upsert({
    where: {
      tenantId_accountId_contactId: {
        tenantId: account.tenantId,
        accountId: account.id,
        contactId: contact.id,
      },
    },
    create: {
      tenantId: account.tenantId,
      accountId: account.id,
      contactId: contact.id,
      status: "open",
      lastMessageAt: occurredAt,
    },
    update: {
      status: "open",
      lastMessageAt: occurredAt,
    },
    select: {
      id: true,
    },
  });

  const createdInbound = await prisma.waMessage.create({
    data: {
      tenantId: account.tenantId,
      conversationId: conversation.id,
      accountId: account.id,
      direction: "inbound",
      messageType,
      text,
      mediaUrl,
      status: "received",
      providerMessageId: providerMessageId || null,
      createdAt: occurredAt,
    },
    select: {
      id: true,
    },
  });

  return {
    inboundMessageId: createdInbound.id,
    conversationId: conversation.id,
    from,
    text,
  };
}

async function handleStatus(
  account: { id: string; tenantId: number },
  statusEvent: Record<string, unknown>
) {
  const providerMessageId = readText(statusEvent.id);
  if (!providerMessageId) return;

  const message = await prisma.waMessage.findFirst({
    where: {
      tenantId: account.tenantId,
      accountId: account.id,
      providerMessageId,
    },
    select: {
      id: true,
      deliveredAt: true,
    },
  });

  if (!message) return;

  const normalized = mapMessageStatus(statusEvent.status);
  const eventAt = parseMetaTimestamp(statusEvent.timestamp);

  await prisma.waMessage.update({
    where: { id: message.id },
    data: {
      status: normalized,
      deliveredAt:
        normalized === "delivered" || normalized === "read"
          ? message.deliveredAt || eventAt
          : message.deliveredAt,
      readAt: normalized === "read" ? eventAt : undefined,
    },
  });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const mode = readText(url.searchParams.get("hub.mode"));
    const token = readText(url.searchParams.get("hub.verify_token"));
    const challenge = readText(url.searchParams.get("hub.challenge"));

    if (mode !== "subscribe" || !token || !challenge) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const valid = await verifyWebhookToken(token);
    if (!valid) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    return new NextResponse(challenge, { status: 200 });
  } catch (error) {
    console.error("[whatsapp/webhook] GET verification failed", error);
    return new NextResponse("Forbidden", { status: 403 });
  }
}

export async function POST(req: Request) {
  const maxBodyBytes = readBoundedInt(
    process.env.WHATSAPP_WEBHOOK_MAX_BODY_BYTES,
    DEFAULT_WEBHOOK_MAX_BODY_BYTES,
    10_000,
    5_000_000
  );

  const rawBody = await req.text();
  if (Buffer.byteLength(rawBody, "utf8") > maxBodyBytes) {
    return NextResponse.json(
      { success: false, error: "Payload too large" },
      { status: 413 }
    );
  }

  const signature = verifyWebhookSignature(rawBody, req.headers.get("x-hub-signature-256"));
  if (!signature.ok) {
    return NextResponse.json(
      { success: false, error: "Invalid webhook signature", reason: signature.reason },
      { status: 401 }
    );
  }

  let body: MetaWebhookBody;

  try {
    body = JSON.parse(rawBody) as MetaWebhookBody;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const recordBody = asRecord(body);
  const object = readText(recordBody.object);
  if (object && object !== "whatsapp_business_account") {
    return new NextResponse("EVENT_RECEIVED", { status: 200 });
  }

  const entries = normalizeEntries(recordBody);

  for (const entry of entries) {
    const changes = asArray(entry.changes);
    for (const change of changes) {
      if (readText(change.field) !== "messages") continue;

      const value = (change.value as Record<string, unknown> | undefined) || {};
      const metadata = (value.metadata as Record<string, unknown> | undefined) || {};
      const phoneNumberId = readText(metadata.phone_number_id);
      if (!phoneNumberId) continue;

      const matchingAccounts = await prisma.waAccount.findMany({
        where: {
          phoneNumberId,
        },
        take: 2,
        select: {
          id: true,
          tenantId: true,
          phoneNumberId: true,
          accessToken: true,
        },
      });

      if (matchingAccounts.length !== 1) {
        // Skip ambiguous or unmapped events so data never lands in the wrong workspace.
        console.error("[whatsapp/webhook] phoneNumberId mapping is not unique", {
          phoneNumberId,
          matchedCount: matchingAccounts.length,
          accountIds: matchingAccounts.map((item) => item.id),
          tenantIds: matchingAccounts.map((item) => item.tenantId),
        });
        continue;
      }

      const account = matchingAccounts[0];

      const contacts = asArray<Record<string, unknown>>(value.contacts);
      const messages = asArray<Record<string, unknown>>(value.messages);
      const statuses = asArray<Record<string, unknown>>(value.statuses);

      for (const message of messages) {
        const from = readText(message.from);
        const matchedContact =
          contacts.find((item) => readText(item.wa_id) === from) ||
          contacts.find((item) => readText(item.input) === from);
        const profile = (matchedContact?.profile as Record<string, unknown> | undefined) || {};
        const profileName = readText(profile.name) || null;

        const inbound = await handleInboundMessage(account, message, profileName);
        if (inbound) {
          await handleInboundCrmAutomation({
            tenantId: account.tenantId,
            accountId: account.id,
            conversationId: inbound.conversationId,
            from: inbound.from,
            text: inbound.text,
            profileName,
            phoneNumberId: account.phoneNumberId,
            accessToken: account.accessToken,
          });
          await runKeywordWorkflowOnInbound(account, inbound);
        }
      }

      for (const statusEvent of statuses) {
        await handleStatus(account, statusEvent);
      }
    }
  }

  return new NextResponse("EVENT_RECEIVED", { status: 200 });
}
