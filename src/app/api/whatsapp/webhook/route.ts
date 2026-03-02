import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
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

function asArray<T = Record<string, unknown>>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function readText(value: unknown) {
  return String(value ?? "").trim();
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
  if (envToken && envToken === token) {
    return true;
  }

  const account = await prisma.waAccount.findFirst({
    where: {
      webhookVerifyToken: token,
    },
    select: { id: true },
  });

  return Boolean(account);
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
  const messageType = readText(message.type) || "text";
  const text = extractInboundText(message);

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
}

export async function POST(req: Request) {
  let body: MetaWebhookBody;

  try {
    body = (await req.json()) as MetaWebhookBody;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const entries = asArray(body.entry);

  for (const entry of entries) {
    const changes = asArray(entry.changes);
    for (const change of changes) {
      if (readText(change.field) !== "messages") continue;

      const value = (change.value as Record<string, unknown> | undefined) || {};
      const metadata = (value.metadata as Record<string, unknown> | undefined) || {};
      const phoneNumberId = readText(metadata.phone_number_id);
      if (!phoneNumberId) continue;

      const account = await prisma.waAccount.findFirst({
        where: {
          phoneNumberId,
        },
        select: {
          id: true,
          tenantId: true,
          phoneNumberId: true,
          accessToken: true,
        },
      });

      if (!account) continue;

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
