"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  Bot,
  CheckCheck,
  Clock3,
  CreditCard,
  Database,
  Gauge,
  Inbox,
  MessageSquare,
  RefreshCcw,
  SendHorizontal,
  Server,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type ModuleItem = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  badge: string;
};

type EmailOverviewPayload = {
  summary: {
    totalIncoming: number;
    totalSent: number;
    totalDelivered: number;
    totalFailed: number;
    deliveryRate: number;
    replyRate: number;
  };
  health: {
    rating: string;
    tone: "high" | "medium" | "low";
    source: string;
    failureRate: number;
  };
  limits: {
    estimatedDailyCap: number;
    usageToday: number;
    usagePercent: number;
  };
  cards: {
    mailboxes: number;
    activeAccounts: number;
    verifiedDomains: number;
    activeAutomations: number;
    unprocessedInbox: number;
    latestSyncAt: string | null;
    coreSubscriptionActive: boolean;
  };
  charts: {
    messageTransactions: Array<{
      date: string;
      incoming: number;
      sent: number;
      delivered: number;
      failed: number;
    }>;
    automationActivity: Array<{
      date: string;
      processed: number;
      autoReplies: number;
      failedProcessing: number;
    }>;
  };
  totals: {
    totalProcessed: number;
    autoReplies: number;
    totalFailedProcessing: number;
  };
  statusBreakdown: Array<{
    status: string;
    count: number;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    createdAt: string;
    recipient: string | null;
    subject: string;
    status: string;
    error: string | null;
  }>;
  accountOptions: Array<{
    id: number;
    name: string;
    email: string;
    provider: string;
    active: boolean;
    lastSyncAt: string;
  }>;
};

const moduleItems: ModuleItem[] = [
  {
    title: "Mail Accounts",
    description: "Connect and manage SMTP/IMAP mail accounts for multi-channel sending.",
    href: "/dashboard/mail-accounts",
    icon: Server,
    badge: "Core",
  },
  {
    title: "Inbox",
    description: "Respond to incoming customer emails with shared visibility and context.",
    href: "/dashboard/mail-inbox",
    icon: Inbox,
    badge: "Support",
  },
  {
    title: "Campaigns",
    description: "Launch outbound campaigns with better targeting and performance tracking.",
    href: "/dashboard/campaigns",
    icon: SendHorizontal,
    badge: "Growth",
  },
  {
    title: "Automation",
    description: "Run behavior-based sequences and trigger rules for auto engagement.",
    href: "/dashboard/mail-automation",
    icon: Bot,
    badge: "Automation",
  },
  {
    title: "Templates",
    description: "Use reusable branded templates to speed up team communication.",
    href: "/dashboard/templates",
    icon: Database,
    badge: "Productivity",
  },
  {
    title: "Mail History",
    description: "Monitor sent email logs, statuses, and operational audit history.",
    href: "/dashboard/mail-history",
    icon: MessageSquare,
    badge: "Audit",
  },
  {
    title: "DNS Setup",
    description: "Verify SPF, DKIM and DMARC for trust and high email deliverability.",
    href: "/dashboard/dns-setup",
    icon: Sparkles,
    badge: "Trust",
  },
  {
    title: "Subscription",
    description: "Manage Email AI & Services plans, billing and product activation.",
    href: "/dashboard/email-hub/subscription",
    icon: CreditCard,
    badge: "Billing",
  },
];

const rangeOptions = [
  { value: 7, label: "Last 7 days" },
  { value: 14, label: "Last 14 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
];

async function readJsonSafe(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function formatDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatAction(action: string) {
  const value = action.toLowerCase();
  if (value.includes("auto")) return "Auto Reply";
  if (value.includes("campaign")) return "Campaign Send";
  if (value.includes("smtp")) return "SMTP Dispatch";
  if (value.includes("mail.send")) return "Email Send";
  return action;
}

function getHealthTone(tone: "high" | "medium" | "low") {
  if (tone === "high") return "bg-emerald-100 text-emerald-700 border-emerald-300";
  if (tone === "medium") return "bg-amber-100 text-amber-700 border-amber-300";
  return "bg-rose-100 text-rose-700 border-rose-300";
}

export default function EmailHubPage() {
  const [days, setDays] = useState(30);
  const [accountId, setAccountId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<EmailOverviewPayload | null>(null);

  const fetchOverview = useCallback(async (manual = false) => {
    try {
      if (manual) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("days", String(days));
      if (accountId !== "all") params.set("accountId", accountId);

      const res = await fetch(`/api/email-hub/overview?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      const payload = await readJsonSafe(res);

      if (!res.ok || !payload.success) {
        throw new Error((payload as { error?: string }).error || "Failed to load Email Hub overview");
      }

      setData(payload as EmailOverviewPayload);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Failed to load Email Hub overview");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accountId, days]);

  useEffect(() => {
    void fetchOverview(false);
  }, [fetchOverview]);

  const txPoints = useMemo(() => data?.charts.messageTransactions || [], [data?.charts.messageTransactions]);
  const automationPoints = useMemo(
    () => data?.charts.automationActivity || [],
    [data?.charts.automationActivity]
  );

  const txMax = useMemo(
    () => Math.max(1, ...txPoints.map((point) => Math.max(point.incoming, point.sent))),
    [txPoints]
  );

  const automationMax = useMemo(
    () =>
      Math.max(
        1,
        ...automationPoints.map((point) => Math.max(point.processed, point.autoReplies, point.failedProcessing))
      ),
    [automationPoints]
  );

  const summary = data?.summary;
  const health = data?.health;
  const limits = data?.limits;
  const cards = data?.cards;
  const statusBreakdown = data?.statusBreakdown || [];

  return (
    <div className="mx-auto w-full max-w-[1700px] space-y-5">
      <section className="relative overflow-hidden rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-indigo-50 px-5 py-5 shadow-sm md:px-7 md:py-6">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-sky-200/55 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-indigo-100/60 blur-3xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
              <ShieldCheck className="h-3.5 w-3.5" />
              Email AI & Services Overview
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-slate-900 md:text-4xl">
              Email Operations Command Center
            </h1>
            <p className="mt-2 text-sm text-slate-600 md:text-base">
              Monitor deliverability, inbox volume, automation throughput and sending performance
              from one unified high-clarity dashboard.
            </p>
          </div>

          <div className="grid w-full grid-cols-1 gap-2 sm:max-w-[560px] sm:grid-cols-2">
            <label className="rounded-xl border border-sky-200 bg-white/95 p-3">
              <p className="text-[11px] uppercase tracking-wide text-sky-700">Account Scope</p>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-sky-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              >
                <option value="all">All accounts</option>
                {(data?.accountOptions || []).map((account) => (
                  <option key={account.id} value={String(account.id)}>
                    {account.name} ({account.email})
                  </option>
                ))}
              </select>
            </label>

            <label className="rounded-xl border border-sky-200 bg-white/95 p-3">
              <p className="text-[11px] uppercase tracking-wide text-sky-700">Date Range</p>
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-sky-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              >
                {rangeOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-xl border border-sky-200 bg-white/95 p-3">
              <p className="text-[11px] uppercase tracking-wide text-sky-700">Latest Sync</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {formatDateTime(cards?.latestSyncAt || null)}
              </p>
            </div>

            <div className="rounded-xl border border-sky-200 bg-white/95 p-3">
              <p className="text-[11px] uppercase tracking-wide text-sky-700">Actions</p>
              <button
                type="button"
                onClick={() => void fetchOverview(true)}
                disabled={refreshing}
                className="mt-1 inline-flex items-center gap-1 rounded-lg border border-sky-300 bg-sky-50 px-2.5 py-1.5 text-sm font-medium text-sky-800 transition hover:bg-sky-100 disabled:opacity-60"
              >
                <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Refreshing..." : "Refresh Data"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 shadow-sm">
          {error}
        </section>
      ) : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-sky-700">Total Incoming</p>
            <Inbox className="h-4 w-4 text-sky-700" />
          </div>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{loading ? "-" : summary?.totalIncoming ?? 0}</p>
          <p className="mt-1 text-xs text-sky-700/80">Emails received in selected range</p>
        </div>

        <div className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-sky-700">Total Sent</p>
            <SendHorizontal className="h-4 w-4 text-sky-700" />
          </div>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{loading ? "-" : summary?.totalSent ?? 0}</p>
          <p className="mt-1 text-xs text-sky-700/80">Outbound traffic handled by system</p>
        </div>

        <div className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-sky-700">Total Delivered</p>
            <CheckCheck className="h-4 w-4 text-sky-700" />
          </div>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{loading ? "-" : summary?.totalDelivered ?? 0}</p>
          <p className="mt-1 text-xs text-sky-700/80">Sent logs marked success/delivered</p>
        </div>

        <div className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-sky-700">Delivery Rate</p>
            <Gauge className="h-4 w-4 text-sky-700" />
          </div>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {loading ? "-" : `${summary?.deliveryRate ?? 0}%`}
          </p>
          <p className="mt-1 text-xs text-sky-700/80">Outbound deliverability ratio</p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Email Health Score</p>
          <p className="mt-1 text-xs text-slate-500">
            Delivery-failure trend based quality state for current range.
          </p>
          <div className="mt-5 flex items-center gap-3">
            <div
              className={`grid h-11 w-11 place-items-center rounded-full border-2 text-sm font-semibold ${getHealthTone(
                health?.tone || "low"
              )}`}
            >
              {(health?.rating || "N/A").slice(0, 1)}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Current State</p>
              <p className="text-base font-semibold text-slate-900">{health?.rating || "N/A"}</p>
              <p className="text-[11px] text-slate-500">
                Failure Rate: {health?.failureRate ?? 0}% | Source: {health?.source || "derived"}
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/dns-setup"
            className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:text-sky-800"
          >
            Improve deliverability
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Daily Throughput Capacity</p>
          <p className="mt-1 text-xs text-slate-500">Today usage vs estimated safe sending capacity.</p>
          <div className="mt-5 space-y-3">
            <div className="h-3 rounded-full bg-sky-100">
              <div
                className="h-3 rounded-full bg-sky-500 transition-all"
                style={{ width: `${Math.min(100, limits?.usagePercent ?? 0)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-medium text-sky-700/80">
              <span>0</span>
              <span>{Math.round((limits?.estimatedDailyCap ?? 0) / 2).toLocaleString()}</span>
              <span>{(limits?.estimatedDailyCap ?? 0).toLocaleString()}</span>
            </div>
            <p className="text-xs text-sky-700">
              Today: {limits?.usageToday ?? 0} / Cap: {(limits?.estimatedDailyCap ?? 0).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Infrastructure Snapshot</p>
          <p className="mt-1 text-xs text-slate-500">
            DNS trust, account readiness and automation execution health.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-sky-100 bg-sky-50 p-2.5">
              <p className="text-slate-500">Mailboxes</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{cards?.mailboxes ?? 0}</p>
            </div>
            <div className="rounded-lg border border-sky-100 bg-sky-50 p-2.5">
              <p className="text-slate-500">Active Accounts</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{cards?.activeAccounts ?? 0}</p>
            </div>
            <div className="rounded-lg border border-sky-100 bg-sky-50 p-2.5">
              <p className="text-slate-500">Verified Domains</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{cards?.verifiedDomains ?? 0}</p>
            </div>
            <div className="rounded-lg border border-sky-100 bg-sky-50 p-2.5">
              <p className="text-slate-500">Active Automation</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{cards?.activeAutomations ?? 0}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Workspace Readiness</p>
            <p className="mt-1 text-xs text-slate-500">
              Keep DNS/auth/subscription aligned to maximize sender reputation and conversion.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span
              className={`rounded-full border px-2 py-1 font-semibold ${
                cards?.coreSubscriptionActive
                  ? "border-emerald-300 bg-emerald-100 text-emerald-700"
                  : "border-amber-300 bg-amber-100 text-amber-700"
              }`}
            >
              {cards?.coreSubscriptionActive ? "Plan Active" : "Plan Required"}
            </span>
            <span className="rounded-full border border-sky-300 bg-sky-100 px-2 py-1 font-semibold text-sky-700">
              Pending Inbox: {cards?.unprocessedInbox ?? 0}
            </span>
            <Link
              href="/dashboard/email-hub/subscription"
              className="inline-flex items-center gap-1 rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 font-semibold text-sky-800 hover:bg-sky-100"
            >
              Manage Plan
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {moduleItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.title}
              href={item.href}
              className="group rounded-2xl border border-sky-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="inline-flex rounded-lg bg-sky-50 p-2 text-sky-700 transition group-hover:bg-sky-100 group-hover:text-sky-800">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="rounded-full bg-sky-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-700">
                  {item.badge}
                </span>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-1 text-xs text-slate-600">{item.description}</p>
            </Link>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Email Traffic</p>
          <p className="mt-1 text-xs text-slate-500">Daily incoming vs outgoing volume trend.</p>

          <div className="mt-4 h-[290px] rounded-xl border border-sky-100 bg-sky-50/60 p-4">
            <div className="flex h-full items-end gap-1 overflow-x-auto pb-2">
              {txPoints.map((point) => (
                <div key={point.date} className="flex min-w-[18px] items-end gap-[3px]">
                  <div
                    className="w-[6px] rounded-sm bg-sky-600"
                    style={{ height: `${Math.max(4, (point.incoming / txMax) * 180)}px` }}
                    title={`${formatDateLabel(point.date)} | Incoming ${point.incoming}`}
                  />
                  <div
                    className="w-[6px] rounded-sm bg-indigo-500"
                    style={{ height: `${Math.max(4, (point.sent / txMax) * 180)}px` }}
                    title={`${formatDateLabel(point.date)} | Sent ${point.sent}`}
                  />
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-[10px] text-sky-700/80">
              <span>{txPoints[0] ? formatDateLabel(txPoints[0].date) : "-"}</span>
              <span>{txPoints[txPoints.length - 1] ? formatDateLabel(txPoints[txPoints.length - 1].date) : "-"}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Automation Activity</p>
          <p className="mt-1 text-xs text-slate-500">Processed emails, auto replies and failed processing flow.</p>

          <div className="mt-4 h-[290px] rounded-xl border border-sky-100 bg-sky-50/60 p-4">
            <div className="flex h-full items-end gap-1 overflow-x-auto pb-2">
              {automationPoints.map((point) => (
                <div key={point.date} className="flex min-w-[18px] items-end gap-[3px]">
                  <div
                    className="w-[5px] rounded-sm bg-sky-600"
                    style={{ height: `${Math.max(4, (point.processed / automationMax) * 180)}px` }}
                    title={`${formatDateLabel(point.date)} | Processed ${point.processed}`}
                  />
                  <div
                    className="w-[5px] rounded-sm bg-indigo-500"
                    style={{ height: `${Math.max(4, (point.autoReplies / automationMax) * 180)}px` }}
                    title={`${formatDateLabel(point.date)} | Auto replies ${point.autoReplies}`}
                  />
                  <div
                    className="w-[5px] rounded-sm bg-rose-400"
                    style={{ height: `${Math.max(4, (point.failedProcessing / automationMax) * 180)}px` }}
                    title={`${formatDateLabel(point.date)} | Failed ${point.failedProcessing}`}
                  />
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-[10px] text-sky-700/80">
              <span>{automationPoints[0] ? formatDateLabel(automationPoints[0].date) : "-"}</span>
              <span>
                {automationPoints[automationPoints.length - 1]
                  ? formatDateLabel(automationPoints[automationPoints.length - 1].date)
                  : "-"}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-sky-700" />
            <p className="text-sm font-semibold text-slate-900">Email Status Distribution</p>
          </div>
          <p className="mt-1 text-xs text-slate-500">Live distribution of outbound status codes.</p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {statusBreakdown.length === 0 ? (
              <p className="col-span-full text-xs text-slate-500">No status data available.</p>
            ) : (
              statusBreakdown.map((item) => (
                <div key={item.status} className="rounded-xl border border-sky-100 bg-sky-50 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{item.status}</p>
                  <p className="mt-1 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">
                    {item.count}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-sky-700" />
            <p className="text-sm font-semibold text-slate-900">Recent Email Activity</p>
          </div>
          <p className="mt-1 text-xs text-slate-500">Latest dispatch and automation log trail.</p>

          <div className="mt-4 overflow-hidden rounded-xl border border-sky-100">
            <table className="w-full text-left text-xs">
              <thead className="bg-sky-50 text-sky-700">
                <tr>
                  <th className="px-3 py-2 font-medium">Txn ID</th>
                  <th className="px-3 py-2 font-medium">Action</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Recipient</th>
                </tr>
              </thead>
              <tbody>
                {(data?.recentActivity || []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                      No records found
                    </td>
                  </tr>
                ) : (
                  (data?.recentActivity || []).map((item) => (
                    <tr key={item.id} className="border-t border-sky-100">
                      <td className="px-3 py-2.5 font-medium text-slate-700">EM-{item.id}</td>
                      <td className="px-3 py-2.5 text-slate-700">{formatAction(item.action)}</td>
                      <td className="px-3 py-2.5 text-slate-700">{item.status}</td>
                      <td className="px-3 py-2.5 text-slate-700" title={item.recipient || "-"}>
                        {item.recipient || "-"}
                        {item.error ? (
                          <span className="mt-0.5 block truncate text-rose-600" title={item.error}>
                            {item.error}
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-sky-700">Reply Rate</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{summary?.replyRate ?? 0}%</p>
          <p className="mt-1 text-xs text-slate-500">Outgoing vs incoming ratio</p>
        </div>
        <div className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-sky-700">Processed Inbox</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{data?.totals.totalProcessed ?? 0}</p>
          <p className="mt-1 text-xs text-slate-500">AI/workflow processed emails</p>
        </div>
        <div className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-sky-700">Auto Replies</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{data?.totals.autoReplies ?? 0}</p>
          <p className="mt-1 text-xs text-slate-500">Automated outbound responses</p>
        </div>
      </section>

      <section className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Growth & Reliability Levers</p>
            <p className="mt-1 text-xs text-slate-500">
              Focus these modules first to improve conversion, trust and response speed.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-300 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
            <BarChart3 className="h-3.5 w-3.5" />
            Performance-led workspace
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/dashboard/campaigns" className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-800 hover:bg-sky-100">Boost campaign quality</Link>
          <Link href="/dashboard/mail-automation" className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-800 hover:bg-sky-100">Improve automation hit-rate</Link>
          <Link href="/dashboard/dns-setup" className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-800 hover:bg-sky-100">Fix DNS trust issues</Link>
          <Link href="/dashboard/email-hub/subscription" className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-800 hover:bg-sky-100">Upgrade plan for scale</Link>
        </div>
      </section>
    </div>
  );
}
