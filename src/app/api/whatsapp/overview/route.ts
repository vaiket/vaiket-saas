import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthContext, hasRoleAtLeast } from "@/lib/auth/session";
import { ensureWhatsAppSubscriptionAccess } from "@/lib/subscriptions/whatsapp-gate";

type DatePoint = {
  date: string;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
};

type AutoReplyPoint = {
  date: string;
  autoReplies: number;
  workflowRuns: number;
  workflowFailed: number;
};

function toDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getStartOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function getDayKeys(days: number) {
  const keys: string[] = [];
  const today = getStartOfUtcDay(new Date());

  for (let i = days - 1; i >= 0; i -= 1) {
    const point = new Date(today);
    point.setUTCDate(today.getUTCDate() - i);
    keys.push(toDayKey(point));
  }

  return keys;
}

function normalizeQuality(value: string | null | undefined): string | null {
  const text = String(value ?? "").trim().toUpperCase();
  if (!text) return null;
  if (["HIGH", "GREEN"].includes(text)) return "HIGH";
  if (["MEDIUM", "YELLOW"].includes(text)) return "MEDIUM";
  if (["LOW", "RED"].includes(text)) return "LOW";
  return text;
}

function deriveQuality(totalSent: number, failed: number) {
  if (totalSent <= 0) {
    return {
      rating: "N/A",
      source: "derived",
      failureRate: null,
    };
  }

  const failureRate = failed / totalSent;
  if (failureRate <= 0.03) {
    return { rating: "HIGH", source: "derived", failureRate };
  }
  if (failureRate <= 0.08) {
    return { rating: "MEDIUM", source: "derived", failureRate };
  }
  return { rating: "LOW", source: "derived", failureRate };
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDays(value: string | null) {
  const parsed = Number(value ?? 30);
  if (!Number.isFinite(parsed)) return 30;
  return Math.min(90, Math.max(7, Math.floor(parsed)));
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
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
  const days = parseDays(url.searchParams.get("days"));
  const accountId = (url.searchParams.get("accountId") || "").trim();

  const fromDate = new Date();
  fromDate.setUTCDate(fromDate.getUTCDate() - (days - 1));
  fromDate.setUTCHours(0, 0, 0, 0);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const accounts = await prisma.waAccount.findMany({
    where: { tenantId: auth.tenantId },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      phoneNumber: true,
      status: true,
      qualityRating: true,
      lastSyncAt: true,
    },
  });

  if (accountId) {
    const found = accounts.find((account) => account.id === accountId);
    if (!found) {
      return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 });
    }
  }

  const messageWhere = {
    tenantId: auth.tenantId,
    direction: "outbound",
    createdAt: { gte: fromDate },
    ...(accountId ? { accountId } : {}),
  } as const;

  const [messages, autoReplyMessages, workflowRuns, openConversations, optedInContacts, activeAutomations, sentToday, recentActivity] =
    await Promise.all([
      prisma.waMessage.findMany({
        where: messageWhere,
        select: {
          status: true,
          createdAt: true,
          deliveredAt: true,
          readAt: true,
        },
      }),
      prisma.waMessage.findMany({
        where: {
          tenantId: auth.tenantId,
          direction: "outbound",
          sentByUserId: null,
          createdAt: { gte: fromDate },
          ...(accountId ? { accountId } : {}),
        },
        select: {
          createdAt: true,
        },
      }),
      prisma.waWorkflowRun.findMany({
        where: {
          tenantId: auth.tenantId,
          startedAt: { gte: fromDate },
        },
        select: {
          status: true,
          startedAt: true,
        },
      }),
      prisma.waConversation.count({
        where: {
          tenantId: auth.tenantId,
          status: "open",
          ...(accountId ? { accountId } : {}),
        },
      }),
      prisma.waContact.count({
        where: {
          tenantId: auth.tenantId,
          optedIn: true,
        },
      }),
      prisma.waWorkflow.count({
        where: {
          tenantId: auth.tenantId,
          isActive: true,
        },
      }),
      prisma.waMessage.count({
        where: {
          tenantId: auth.tenantId,
          direction: "outbound",
          createdAt: { gte: startOfToday },
          ...(accountId ? { accountId } : {}),
        },
      }),
      prisma.auditLog.findMany({
        where: {
          tenantId: auth.tenantId,
          action: {
            in: [
              "tenant.whatsapp.send_messages.dispatch",
              "tenant.whatsapp.send_messages.queue",
              "tenant.whatsapp.bulk.send",
              "tenant.whatsapp.message.send",
            ],
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          action: true,
          createdAt: true,
          meta: true,
        },
      }),
    ]);

  let totalDelivered = 0;
  let totalRead = 0;
  let totalFailed = 0;
  const statusMap = new Map<string, number>();

  const dayKeys = getDayKeys(days);
  const txMap = new Map<string, DatePoint>();
  const autoReplyMap = new Map<string, AutoReplyPoint>();

  for (const key of dayKeys) {
    txMap.set(key, {
      date: key,
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
    });

    autoReplyMap.set(key, {
      date: key,
      autoReplies: 0,
      workflowRuns: 0,
      workflowFailed: 0,
    });
  }

  for (const row of messages) {
    const status = String(row.status || "unknown").toLowerCase();
    statusMap.set(status, (statusMap.get(status) || 0) + 1);

    const key = toDayKey(row.createdAt);
    const point = txMap.get(key);
    if (point) {
      point.sent += 1;
    }

    const delivered = Boolean(row.deliveredAt) || status === "delivered" || status === "read";
    const read = Boolean(row.readAt) || status === "read";
    const failed = status === "failed";

    if (delivered) {
      totalDelivered += 1;
      if (point) point.delivered += 1;
    }
    if (read) {
      totalRead += 1;
      if (point) point.read += 1;
    }
    if (failed) {
      totalFailed += 1;
      if (point) point.failed += 1;
    }
  }

  for (const row of autoReplyMessages) {
    const key = toDayKey(row.createdAt);
    const point = autoReplyMap.get(key);
    if (point) {
      point.autoReplies += 1;
    }
  }

  for (const row of workflowRuns) {
    const key = toDayKey(row.startedAt);
    const point = autoReplyMap.get(key);
    if (!point) continue;

    point.workflowRuns += 1;
    const status = String(row.status || "").toLowerCase();
    if (status.includes("fail") || status.includes("error")) {
      point.workflowFailed += 1;
    }
  }

  const totalSent = messages.length;
  const dlrPercent = totalSent > 0 ? Number(((totalDelivered / totalSent) * 100).toFixed(2)) : 0;

  const selectedAccount = accountId ? accounts.find((account) => account.id === accountId) : null;
  const selectedQuality = normalizeQuality(selectedAccount?.qualityRating);

  const anyQuality = selectedQuality || normalizeQuality(accounts.find((item) => item.qualityRating)?.qualityRating);
  const quality = anyQuality
    ? { rating: anyQuality, source: "meta", failureRate: totalSent > 0 ? totalFailed / totalSent : null }
    : deriveQuality(totalSent, totalFailed);

  let currentTier = 250;
  if (quality.rating === "MEDIUM") currentTier = 2000;
  if (quality.rating === "HIGH") currentTier = 10000;
  if (quality.rating === "N/A") currentTier = 250;

  const usagePercent = currentTier > 0 ? Number(Math.min(100, (sentToday / currentTier) * 100).toFixed(2)) : 0;

  const statusBreakdown = Array.from(statusMap.entries())
    .map(([status, count]) => ({
      status,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const activity = recentActivity.map((row) => {
    const meta = asRecord(row.meta);
    return {
      id: String(row.id),
      action: row.action,
      createdAt: row.createdAt.toISOString(),
      recipients: toNumber(meta.recipients ?? meta.queued),
      sent: toNumber(meta.sent),
      failed: toNumber(meta.failed),
      warning: typeof meta.warning === "string" ? meta.warning : null,
    };
  });

  const latestSync = accounts.reduce<Date | null>((acc, item) => {
    if (!item.lastSyncAt) return acc;
    if (!acc) return item.lastSyncAt;
    return item.lastSyncAt > acc ? item.lastSyncAt : acc;
  }, null);

  return NextResponse.json({
    success: true,
    filters: {
      days,
      accountId: accountId || null,
      fromDate: fromDate.toISOString(),
      toDate: new Date().toISOString(),
    },
    summary: {
      totalSent,
      totalDelivered,
      totalRead,
      totalFailed,
      dlrPercent,
    },
    quality,
    limits: {
      currentTier,
      usageToday: sentToday,
      usagePercent,
    },
    cards: {
      accounts: accounts.length,
      optedInContacts,
      openConversations,
      activeAutomations,
      latestSyncAt: latestSync ? latestSync.toISOString() : null,
    },
    charts: {
      messageTransactions: dayKeys
        .map((key) => txMap.get(key))
        .filter((point): point is DatePoint => Boolean(point)),
      automaticReplies: dayKeys
        .map((key) => autoReplyMap.get(key))
        .filter((point): point is AutoReplyPoint => Boolean(point)),
    },
    statusBreakdown,
    recentActivity: activity,
    accountOptions: accounts.map((item) => ({
      id: item.id,
      name: item.name,
      phoneNumber: item.phoneNumber,
      status: item.status,
      qualityRating: normalizeQuality(item.qualityRating),
      lastSyncAt: item.lastSyncAt ? item.lastSyncAt.toISOString() : null,
    })),
  });
}
