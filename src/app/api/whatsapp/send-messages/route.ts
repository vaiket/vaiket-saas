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
};

const MAX_NUMBERS = 5000;

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
    const initialStatus =
      scheduleEnabled && scheduleAt && scheduleAt.getTime() > now.getTime() ? "scheduled" : "queued";
    const shouldSendNow = !scheduleEnabled && !recurringEnabled;

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
    const createdMessages: Array<{ id: string; to: string }> = [];

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
