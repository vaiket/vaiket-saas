import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { getAuthContext, hasRoleAtLeast } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { hasActiveProductSubscription } from "@/lib/subscriptions/access";

type MailTxPoint = {
  date: string;
  incoming: number;
  sent: number;
  delivered: number;
  failed: number;
};

type AutomationPoint = {
  date: string;
  processed: number;
  autoReplies: number;
  failedProcessing: number;
};

function parseDays(value: string | null) {
  const parsed = Number(value ?? 30);
  if (!Number.isFinite(parsed)) return 30;
  return Math.min(90, Math.max(7, Math.floor(parsed)));
}

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

function isDeliveredStatus(status: string) {
  const value = status.toLowerCase();
  return (
    value === "sent" ||
    value === "success" ||
    value === "delivered" ||
    value === "read" ||
    value === "queued"
  );
}

function isFailedStatus(status: string) {
  const value = status.toLowerCase();
  return (
    value === "failed" ||
    value.includes("fail") ||
    value.includes("error") ||
    value.includes("bounce") ||
    value.includes("reject")
  );
}

function isVerifiedValue(status: string | null | undefined) {
  const value = String(status ?? "").trim().toLowerCase();
  return value === "verified" || value === "success" || value === "active" || value === "pass";
}

function deriveHealth(deliveryRate: number, failureRate: number) {
  if (deliveryRate >= 95 && failureRate <= 0.03) {
    return { rating: "Excellent", tone: "high" as const };
  }
  if (deliveryRate >= 88 && failureRate <= 0.08) {
    return { rating: "Healthy", tone: "medium" as const };
  }
  return { rating: "Needs Attention", tone: "low" as const };
}

function buildTenantScope(
  tenantId: number,
  accountIds: number[],
  selectedAccountId: number | null
): { incoming: Prisma.IncomingEmailWhereInput; logs: Prisma.MailLogWhereInput } {
  if (selectedAccountId) {
    return {
      incoming: { mailAccountId: selectedAccountId },
      logs: { mailAccountId: selectedAccountId },
    };
  }

  if (accountIds.length === 0) {
    return {
      incoming: { tenantId },
      logs: { tenantId },
    };
  }

  return {
    incoming: {
      OR: [{ tenantId }, { mailAccountId: { in: accountIds } }],
    },
    logs: {
      OR: [{ tenantId }, { mailAccountId: { in: accountIds } }],
    },
  };
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

    const url = new URL(req.url);
    const days = parseDays(url.searchParams.get("days"));
    const accountIdParam = (url.searchParams.get("accountId") || "").trim();
    const selectedAccountId =
      accountIdParam && accountIdParam !== "all" ? Number(accountIdParam) : null;

    if (selectedAccountId !== null && (!Number.isFinite(selectedAccountId) || selectedAccountId <= 0)) {
      return NextResponse.json({ success: false, error: "Invalid accountId" }, { status: 400 });
    }

    const fromDate = new Date();
    fromDate.setUTCDate(fromDate.getUTCDate() - (days - 1));
    fromDate.setUTCHours(0, 0, 0, 0);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const accounts = await prisma.mailAccount.findMany({
      where: { tenantId: auth.tenantId },
      orderBy: [{ id: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        provider: true,
        active: true,
        createdAt: true,
      },
    });

    if (selectedAccountId !== null && !accounts.some((account) => account.id === selectedAccountId)) {
      return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 });
    }

    const accountIds = accounts.map((account) => account.id);
    const scope = buildTenantScope(auth.tenantId, accountIds, selectedAccountId);

    const incomingWhere: Prisma.IncomingEmailWhereInput = {
      AND: [scope.incoming, { createdAt: { gte: fromDate } }],
    };
    const logsWhere: Prisma.MailLogWhereInput = {
      AND: [scope.logs, { createdAt: { gte: fromDate } }],
    };

    const [incomingRows, logRows, dnsRows, activeAutomations, todaySent, recentLogs, coreSubscriptionActive] =
      await Promise.all([
        prisma.incomingEmail.findMany({
          where: incomingWhere,
          select: {
            id: true,
            createdAt: true,
            status: true,
            processed: true,
            subject: true,
            from: true,
          },
        }),
        prisma.mailLog.findMany({
          where: logsWhere,
          select: {
            id: true,
            createdAt: true,
            status: true,
            type: true,
            to: true,
            from: true,
            subject: true,
            error: true,
          },
        }),
        prisma.mailboxDNS.findMany({
          where: { tenantId: auth.tenantId },
          select: {
            domain: true,
            spfStatus: true,
            dkimStatus: true,
            dmarcStatus: true,
          },
        }),
        prisma.tenantMailboxAutomation.count({
          where: {
            tenantId: auth.tenantId,
            automationEnabled: true,
            status: "APPROVED",
          },
        }),
        prisma.mailLog.count({
          where: {
            AND: [scope.logs, { createdAt: { gte: startOfToday } }],
          },
        }),
        prisma.mailLog.findMany({
          where: logsWhere,
          orderBy: { createdAt: "desc" },
          take: 12,
          select: {
            id: true,
            createdAt: true,
            status: true,
            type: true,
            to: true,
            subject: true,
            error: true,
          },
        }),
        hasActiveProductSubscription(auth.userId, auth.tenantId, "core"),
      ]);

    const dayKeys = getDayKeys(days);
    const txMap = new Map<string, MailTxPoint>();
    const automationMap = new Map<string, AutomationPoint>();
    const statusMap = new Map<string, number>();

    for (const key of dayKeys) {
      txMap.set(key, { date: key, incoming: 0, sent: 0, delivered: 0, failed: 0 });
      automationMap.set(key, { date: key, processed: 0, autoReplies: 0, failedProcessing: 0 });
    }

    let totalProcessed = 0;
    let totalFailedProcessing = 0;

    for (const row of incomingRows) {
      const key = toDayKey(row.createdAt);
      const point = txMap.get(key);
      if (point) point.incoming += 1;

      const autoPoint = automationMap.get(key);
      if (row.processed && autoPoint) {
        autoPoint.processed += 1;
        totalProcessed += 1;
      }

      const incomingStatus = String(row.status || "").toLowerCase();
      if (incomingStatus && isFailedStatus(incomingStatus)) {
        totalFailedProcessing += 1;
        if (autoPoint) autoPoint.failedProcessing += 1;
      }
    }

    let totalDelivered = 0;
    let totalFailed = 0;
    let autoReplies = 0;

    for (const row of logRows) {
      const key = toDayKey(row.createdAt);
      const point = txMap.get(key);
      if (point) point.sent += 1;

      const status = String(row.status || "unknown").toLowerCase();
      statusMap.set(status, (statusMap.get(status) || 0) + 1);

      if (status && isDeliveredStatus(status)) {
        totalDelivered += 1;
        if (point) point.delivered += 1;
      }
      if (status && isFailedStatus(status)) {
        totalFailed += 1;
        if (point) point.failed += 1;
      }

      const type = String(row.type || "").toLowerCase();
      if (type.includes("auto")) {
        autoReplies += 1;
        const autoPoint = automationMap.get(key);
        if (autoPoint) autoPoint.autoReplies += 1;
      }
    }

    const totalIncoming = incomingRows.length;
    const totalSent = logRows.length;
    const deliveryRate = totalSent > 0 ? Number(((totalDelivered / totalSent) * 100).toFixed(2)) : 0;
    const failureRate = totalSent > 0 ? totalFailed / totalSent : 0;
    const replyRate = totalIncoming > 0 ? Number(((totalSent / totalIncoming) * 100).toFixed(2)) : 0;
    const health = deriveHealth(deliveryRate, failureRate);

    const verifiedDomains = dnsRows.filter(
      (row) =>
        isVerifiedValue(row.spfStatus) &&
        isVerifiedValue(row.dkimStatus) &&
        isVerifiedValue(row.dmarcStatus)
    ).length;

    const latestSyncDate = accounts.reduce<Date | null>((acc, account) => {
      if (!acc) return account.createdAt;
      return account.createdAt > acc ? account.createdAt : acc;
    }, null);

    const activeAccounts = accounts.filter((account) => account.active).length;
    const estimatedDailyCap = Math.max(500, activeAccounts * 500);
    const usagePercent = Number(Math.min(100, (todaySent / estimatedDailyCap) * 100).toFixed(2));
    const unprocessedInbox = incomingRows.filter((item) => !item.processed).length;

    const recentActivity = recentLogs.map((row) => ({
      id: String(row.id),
      action: row.type || "mail.send",
      createdAt: row.createdAt.toISOString(),
      recipient: row.to || null,
      subject: row.subject || "(No subject)",
      status: row.status || "unknown",
      error: row.error || null,
    }));

    const statusBreakdown = Array.from(statusMap.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      success: true,
      filters: {
        days,
        accountId: selectedAccountId ?? null,
        fromDate: fromDate.toISOString(),
        toDate: new Date().toISOString(),
      },
      summary: {
        totalIncoming,
        totalSent,
        totalDelivered,
        totalFailed,
        deliveryRate,
        replyRate,
      },
      health: {
        rating: health.rating,
        tone: health.tone,
        source: "derived",
        failureRate: Number((failureRate * 100).toFixed(2)),
      },
      limits: {
        estimatedDailyCap,
        usageToday: todaySent,
        usagePercent,
      },
      cards: {
        mailboxes: accounts.length,
        activeAccounts,
        verifiedDomains,
        activeAutomations,
        unprocessedInbox,
        latestSyncAt: latestSyncDate ? latestSyncDate.toISOString() : null,
        coreSubscriptionActive,
      },
      charts: {
        messageTransactions: dayKeys
          .map((key) => txMap.get(key))
          .filter((point): point is MailTxPoint => Boolean(point)),
        automationActivity: dayKeys
          .map((key) => automationMap.get(key))
          .filter((point): point is AutomationPoint => Boolean(point)),
      },
      totals: {
        totalProcessed,
        autoReplies,
        totalFailedProcessing,
      },
      statusBreakdown,
      recentActivity,
      accountOptions: accounts.map((account) => ({
        id: account.id,
        name: account.name || account.email,
        email: account.email,
        provider: account.provider,
        active: account.active,
        lastSyncAt: account.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Email Hub overview error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load email hub overview" },
      { status: 500 }
    );
  }
}
