import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { getAuthContext, hasRoleAtLeast } from "@/lib/auth/session";
import { sendMetaTemplateMessage } from "@/lib/whatsapp/meta";
import { ensureWhatsAppSubscriptionAccess } from "@/lib/subscriptions/whatsapp-gate";

type SendMessagesBody = {
  accountId?: unknown;
  templateKey?: unknown;
  templateLanguage?: unknown;
  numbersText?: unknown;
  scheduleEnabled?: unknown;
  scheduleAt?: unknown;
  recurringEnabled?: unknown;
  recurringRule?: unknown;
  templateComponentsByPhone?: unknown;
};

const MAX_NUMBERS = 5000;
const MAX_TEMPLATE_COMPONENTS_PER_MESSAGE = 5;
const MAX_TEMPLATE_PARAMETERS_PER_COMPONENT = 10;
const MAX_TEMPLATE_PARAM_TEXT_LENGTH = 500;

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

function parseDate(raw: unknown): Date | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function sanitizeTemplateComponents(input: unknown): Array<Record<string, unknown>> | null {
  if (!Array.isArray(input)) return null;

  const sanitized: Array<Record<string, unknown>> = [];
  for (const rawComponent of input.slice(0, MAX_TEMPLATE_COMPONENTS_PER_MESSAGE)) {
    if (!rawComponent || typeof rawComponent !== "object") continue;

    const row = rawComponent as Record<string, unknown>;
    const type = String(row.type ?? "").trim().toLowerCase();
    if (!type) continue;

    const rawParams = Array.isArray(row.parameters) ? row.parameters : [];
    const parameters: Array<Record<string, unknown>> = [];
    for (const rawParam of rawParams.slice(0, MAX_TEMPLATE_PARAMETERS_PER_COMPONENT)) {
      if (!rawParam || typeof rawParam !== "object") continue;
      const param = rawParam as Record<string, unknown>;
      const paramType = String(param.type ?? "").trim().toLowerCase();
      if (paramType !== "text") continue;

      const text = String(param.text ?? "").trim();
      if (!text) continue;

      parameters.push({
        type: "text",
        text: text.slice(0, MAX_TEMPLATE_PARAM_TEXT_LENGTH),
      });
    }

    if (parameters.length === 0) continue;

    sanitized.push({
      type,
      parameters,
    });
  }

  return sanitized.length > 0 ? sanitized : null;
}

function parseTemplateComponentsByPhone(input: unknown) {
  const map = new Map<string, Array<Record<string, unknown>>>();
  if (!input || typeof input !== "object" || Array.isArray(input)) return map;

  const entries = Object.entries(input as Record<string, unknown>);
  for (const [rawPhone, rawComponents] of entries) {
    const phone = normalizePhone(rawPhone);
    if (!phone) continue;

    const components = sanitizeTemplateComponents(rawComponents);
    if (!components) continue;

    map.set(phone, components);
  }

  return map;
}

async function readJsonSafe(req: Request): Promise<SendMessagesBody | null> {
  try {
    return (await req.json()) as SendMessagesBody;
  } catch {
    return null;
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

    const accountId = String(body.accountId ?? "").trim();
    const templateKey = String(body.templateKey ?? "").trim();
    const templateLanguage = String(body.templateLanguage ?? "").trim() || "en_US";
    const numbersText = String(body.numbersText ?? "").trim();
    const scheduleEnabled = Boolean(body.scheduleEnabled);
    const recurringEnabled = Boolean(body.recurringEnabled);
    const recurringRule = String(body.recurringRule ?? "").trim() || null;
    const scheduleAt = parseDate(body.scheduleAt);
    const templateComponentsByPhone = parseTemplateComponentsByPhone(body.templateComponentsByPhone);

    if (!accountId || !templateKey || !numbersText) {
      return NextResponse.json(
        {
          success: false,
          error: "accountId, templateKey and numbersText are required",
        },
        { status: 400 }
      );
    }

    if (scheduleEnabled && !scheduleAt) {
      return NextResponse.json(
        { success: false, error: "scheduleAt is required when schedule is enabled" },
        { status: 400 }
      );
    }

    const account = await prisma.waAccount.findFirst({
      where: { id: accountId, tenantId: auth.tenantId },
      select: {
        id: true,
        phoneNumberId: true,
        accessToken: true,
      },
    });

    if (!account) {
      return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 });
    }

    const parsed = parseNumbers(numbersText);
    if (parsed.unique.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid phone numbers found" },
        { status: 400 }
      );
    }

    if (parsed.unique.length > MAX_NUMBERS) {
      return NextResponse.json(
        { success: false, error: `Max ${MAX_NUMBERS} numbers allowed in one request` },
        { status: 400 }
      );
    }

    const now = new Date();
    const isScheduledForFuture = Boolean(
      scheduleEnabled && scheduleAt && scheduleAt.getTime() > now.getTime()
    );
    const initialStatus = isScheduledForFuture ? "scheduled" : "queued";
    const shouldSendNow = !recurringEnabled && !isScheduledForFuture;

    if (shouldSendNow && (!account.accessToken || !account.phoneNumberId)) {
      return NextResponse.json(
        {
          success: false,
          error: "WABA access token and phoneNumberId are required for live sending",
        },
        { status: 400 }
      );
    }

    let queued = 0;
    const createdMessages: Array<{ id: string; to: string; components: Array<Record<string, unknown>> | null }> = [];

    for (const phone of parsed.unique) {
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
          source: "send_messages",
        },
        update: {},
        select: {
          id: true,
        },
      });

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

      const componentsForPhone = templateComponentsByPhone.get(phone) || null;

      const created = await prisma.waMessage.create({
        data: {
          tenantId: auth.tenantId,
          conversationId: conversation.id,
          accountId,
          direction: "outbound",
          messageType: "template",
          text: JSON.stringify({
            templateKey,
            templateLanguage,
            scheduleEnabled,
            scheduleAt: scheduleAt ? scheduleAt.toISOString() : null,
            recurringEnabled,
            recurringRule,
            templateComponents: componentsForPhone,
          }),
          status: shouldSendNow ? "processing" : initialStatus,
          sentByUserId: auth.userId,
        },
        select: {
          id: true,
        },
      });

      await prisma.waContact.update({
        where: { id: contact.id },
        data: { lastMessageAt: now },
      });

      createdMessages.push({
        id: created.id,
        to: phone,
        components: componentsForPhone,
      });
      queued += 1;
    }

    let sent = 0;
    let failed = 0;
    let firstError: string | null = null;

    if (shouldSendNow) {
      const batchSize = 10;
      for (let i = 0; i < createdMessages.length; i += batchSize) {
        const batch = createdMessages.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (item) => {
            try {
              const metaRes = await sendMetaTemplateMessage({
                phoneNumberId: account.phoneNumberId || "",
                accessToken: account.accessToken || "",
                to: item.to,
                templateName: templateKey,
                languageCode: templateLanguage,
                components: item.components || undefined,
              });

              await prisma.waMessage.update({
                where: { id: item.id },
                data: {
                  status: "sent",
                  providerMessageId: metaRes.messageId,
                },
              });
              sent += 1;
            } catch (err) {
              failed += 1;
              const errText = err instanceof Error ? err.message : "Meta send failed";
              if (!firstError) firstError = errText;

              await prisma.waMessage.update({
                where: { id: item.id },
                data: {
                  status: "failed",
                },
              });
            }
          })
        );
      }
    }

    await writeAuditLog({
      tenantId: auth.tenantId,
      actorUserId: auth.userId,
      action: shouldSendNow
        ? "tenant.whatsapp.send_messages.dispatch"
        : "tenant.whatsapp.send_messages.queue",
      entity: "WaMessage",
      entityId: null,
      meta: {
        accountId,
        templateKey,
        templateLanguage,
        queued,
        sent,
        failed,
        firstError,
        duplicatesRemoved: parsed.duplicatesRemoved,
        scheduleEnabled,
        scheduleAt: scheduleAt ? scheduleAt.toISOString() : null,
        recurringEnabled,
        recurringRule,
        templateComponentsMappedRecipients: templateComponentsByPhone.size,
        templateComponentsApplied: templateComponentsByPhone.size > 0,
      },
      req,
    });

    return NextResponse.json({
      success: true,
      queued: shouldSendNow ? 0 : queued,
      sent,
      failed,
      totalInput: parsed.totalInput,
      uniqueNumbers: parsed.unique.length,
      duplicatesRemoved: parsed.duplicatesRemoved,
      templateComponentsMappedRecipients: templateComponentsByPhone.size,
      status: shouldSendNow ? (failed > 0 ? "partial_failed" : "sent") : initialStatus,
      ...(firstError ? { warning: firstError } : {}),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to process send request",
      },
      { status: 500 }
    );
  }
}
