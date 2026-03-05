"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Bot,
  CreditCard,
  CheckCheck,
  Clock3,
  ContactRound,
  Gauge,
  MessageSquareText,
  RefreshCcw,
  Route,
  Send,
  SendHorizontal,
  ShieldCheck,
  Smartphone,
  UserCircle2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type ModuleItem = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  badge: string;
};

type OverviewPayload = {
  summary: {
    totalSent: number;
    totalDelivered: number;
    totalRead: number;
    totalFailed: number;
    dlrPercent: number;
  };
  quality: {
    rating: string;
    source: string;
    failureRate: number | null;
  };
  limits: {
    currentTier: number;
    usageToday: number;
    usagePercent: number;
  };
  cards: {
    accounts: number;
    optedInContacts: number;
    openConversations: number;
    activeAutomations: number;
    latestSyncAt: string | null;
  };
  charts: {
    messageTransactions: Array<{
      date: string;
      sent: number;
      delivered: number;
      read: number;
      failed: number;
    }>;
    automaticReplies: Array<{
      date: string;
      autoReplies: number;
      workflowRuns: number;
      workflowFailed: number;
    }>;
  };
  statusBreakdown: Array<{
    status: string;
    count: number;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    createdAt: string;
    recipients: number;
    sent: number;
    failed: number;
    warning: string | null;
  }>;
  accountOptions: Array<{
    id: string;
    name: string;
    phoneNumber: string;
    status: string;
    qualityRating: string | null;
    lastSyncAt: string | null;
  }>;
};

const moduleItems: ModuleItem[] = [
  {
    title: "WhatsApp Accounts",
    description: "Connect WABA accounts, verify numbers and manage active channels.",
    href: "/dashboard/whatsapp/accounts",
    icon: Smartphone,
    badge: "Core",
  },
  {
    title: "Contacts",
    description: "Manage audience list with tags, opt-in state and profile details.",
    href: "/dashboard/whatsapp/contacts",
    icon: ContactRound,
    badge: "CRM",
  },
  {
    title: "Inbox",
    description: "Handle one-to-one conversations with agent visibility and context.",
    href: "/dashboard/whatsapp/inbox",
    icon: MessageSquareText,
    badge: "Support",
  },
  {
    title: "Send Messages",
    description: "Dispatch template or first messages with scheduling controls.",
    href: "/dashboard/whatsapp/send-messages",
    icon: SendHorizontal,
    badge: "Campaign",
  },
  {
    title: "Bulk Messaging",
    description: "Target opted-in segments and queue broadcast campaigns safely.",
    href: "/dashboard/whatsapp/bulk",
    icon: Send,
    badge: "Growth",
  },
  {
    title: "Workflows",
    description: "Automate WhatsApp journeys using trigger-action workflow rules.",
    href: "/dashboard/whatsapp/workflows",
    icon: Route,
    badge: "Automation",
  },
  {
    title: "Automation Builder",
    description: "Design chatbot journeys visually with drag-drop nodes and live testing.",
    href: "/dashboard/whatsapp/automation-builder",
    icon: Gauge,
    badge: "Builder",
  },
  {
    title: "Chatbot Rules",
    description: "Create AI-assisted auto replies and handover logic for teams.",
    href: "/dashboard/whatsapp/chatbot",
    icon: Bot,
    badge: "AI",
  },
  {
    title: "Subscription",
    description: "Manage WhatsApp plans, billing history and active product access.",
    href: "/dashboard/whatsapp/subscription",
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
  if (action === "tenant.whatsapp.send_messages.dispatch") return "Template Dispatch";
  if (action === "tenant.whatsapp.send_messages.queue") return "Template Queue";
  if (action === "tenant.whatsapp.bulk.send") return "Bulk Campaign";
  if (action === "tenant.whatsapp.message.send") return "Inbox Message";
  return action;
}

function getQualityTone(quality: string) {
  const value = quality.toUpperCase();
  if (value === "HIGH") return "bg-emerald-100 text-emerald-700 border-emerald-300";
  if (value === "MEDIUM") return "bg-amber-100 text-amber-700 border-amber-300";
  if (value === "LOW") return "bg-rose-100 text-rose-700 border-rose-300";
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

export default function WhatsAppHubPage() {
  const [days, setDays] = useState(30);
  const [accountId, setAccountId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OverviewPayload | null>(null);

  const fetchOverview = async (manual = false) => {
    try {
      if (manual) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("days", String(days));
      if (accountId !== "all") {
        params.set("accountId", accountId);
      }

      const res = await fetch(`/api/whatsapp/overview?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      const payload = await readJsonSafe(res);

      if (!res.ok || !payload.success) {
        throw new Error(payload.error || "Failed to load WhatsApp overview");
      }

      setData(payload as OverviewPayload);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Failed to load WhatsApp overview");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOverview(false);
  }, [days, accountId]);

  const txPoints = data?.charts.messageTransactions || [];
  const autoPoints = data?.charts.automaticReplies || [];
  const txMax = useMemo(() => Math.max(1, ...txPoints.map((point) => point.sent)), [txPoints]);
  const autoMax = useMemo(
    () => Math.max(1, ...autoPoints.map((point) => Math.max(point.autoReplies, point.workflowRuns))),
    [autoPoints]
  );

  const statusBreakdown = data?.statusBreakdown || [];
  const summary = data?.summary;
  const quality = data?.quality;
  const limits = data?.limits;
  const cards = data?.cards;

  return (
    <div className="mx-auto w-full max-w-[1700px] space-y-5">
      <section className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 px-5 py-5 shadow-sm md:px-7 md:py-6">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-emerald-200/60 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-teal-100/60 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              <ShieldCheck className="h-3.5 w-3.5" />
              WhatsApp Business Management
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-slate-900 md:text-4xl">
              WhatsApp Service Command Center
            </h1>
            <p className="mt-2 text-sm text-slate-600 md:text-base">
              Track delivery health, manage accounts, launch campaigns and run conversational
              operations from one clean workspace.
            </p>
          </div>

          <div className="grid w-full grid-cols-1 gap-2 sm:max-w-[560px] sm:grid-cols-2">
            <label className="rounded-xl border border-emerald-200 bg-white/95 p-3">
              <p className="text-[11px] uppercase tracking-wide text-emerald-700">Account Scope</p>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="all">All accounts</option>
                {(data?.accountOptions || []).map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.phoneNumber})
                  </option>
                ))}
              </select>
            </label>

            <label className="rounded-xl border border-emerald-200 bg-white/95 p-3">
              <p className="text-[11px] uppercase tracking-wide text-emerald-700">Date Range</p>
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                {rangeOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-xl border border-emerald-200 bg-white/95 p-3">
              <p className="text-[11px] uppercase tracking-wide text-emerald-700">Latest Sync</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {formatDateTime(cards?.latestSyncAt || null)}
              </p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-white/95 p-3">
              <p className="text-[11px] uppercase tracking-wide text-emerald-700">Actions</p>
              <button
                type="button"
                onClick={() => fetchOverview(true)}
                disabled={refreshing}
                className="mt-1 inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-sm font-medium text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-60"
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
        <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
              Total Message Sent
            </p>
            <Send className="h-4 w-4 text-emerald-700" />
          </div>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {loading ? "-" : summary?.totalSent ?? 0}
          </p>
          <p className="mt-1 text-xs text-emerald-700/80">Outbound messages in selected range</p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Total Delivered</p>
            <CheckCheck className="h-4 w-4 text-emerald-700" />
          </div>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {loading ? "-" : summary?.totalDelivered ?? 0}
          </p>
          <p className="mt-1 text-xs text-emerald-700/80">Delivered/read confirmations</p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Total Read</p>
            <MessageSquareText className="h-4 w-4 text-emerald-700" />
          </div>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {loading ? "-" : summary?.totalRead ?? 0}
          </p>
          <p className="mt-1 text-xs text-emerald-700/80">Customer read confirmations</p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">DLR Percentage</p>
            <Gauge className="h-4 w-4 text-emerald-700" />
          </div>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {loading ? "-" : `${summary?.dlrPercent ?? 0}%`}
          </p>
          <p className="mt-1 text-xs text-emerald-700/80">Delivery ratio on outbound traffic</p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Quality Rating</p>
          <p className="mt-1 text-xs text-slate-500">
            Meta quality signal + delivery failure trend from selected range.
          </p>
          <div className="mt-5 flex items-center gap-3">
            <div
              className={`grid h-11 w-11 place-items-center rounded-full border-2 text-sm font-semibold ${getQualityTone(
                quality?.rating || "N/A"
              )}`}
            >
              {(quality?.rating || "N/A").slice(0, 1)}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Current State</p>
              <p className="text-base font-semibold text-slate-900">{quality?.rating || "N/A"}</p>
              <p className="text-[11px] text-slate-500">
                Source: {quality?.source || "derived"}
                {quality?.failureRate !== null && quality?.failureRate !== undefined
                  ? ` | Failure ${(quality.failureRate * 100).toFixed(2)}%`
                  : ""}
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/whatsapp/accounts"
            className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
          >
            Learn how to improve quality
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Daily Sending Limit</p>
          <p className="mt-1 text-xs text-slate-500">
            Usage today vs estimated tier (auto-derived from quality profile).
          </p>
          <div className="mt-5 space-y-3">
            <div className="h-3 rounded-full bg-emerald-100">
              <div
                className="h-3 rounded-full bg-emerald-500 transition-all"
                style={{ width: `${Math.min(100, limits?.usagePercent ?? 0)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-medium text-emerald-700/80">
              <span>250</span>
              <span>2K</span>
              <span>10K</span>
              <span>100K</span>
              <span>Unlimited</span>
            </div>
            <p className="text-xs text-emerald-700">
              Today: {limits?.usageToday ?? 0} / Tier: {(limits?.currentTier ?? 250).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Meta Business Access</p>
          <p className="mt-1 text-xs text-slate-500">
            Manage account connectivity, webhooks and token lifecycle for secure messaging.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-2.5">
              <p className="text-slate-500">Accounts</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{cards?.accounts ?? 0}</p>
            </div>
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-2.5">
              <p className="text-slate-500">Open Conversations</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{cards?.openConversations ?? 0}</p>
            </div>
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-2.5">
              <p className="text-slate-500">Opted-in Contacts</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{cards?.optedInContacts ?? 0}</p>
            </div>
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-2.5">
              <p className="text-slate-500">Active Automation</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{cards?.activeAutomations ?? 0}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Business Profile Setup</p>
            <p className="mt-1 text-xs text-slate-500">
              Keep business profile complete so users trust your brand communication.
            </p>
          </div>
          <Link
            href="/dashboard/whatsapp/accounts"
            className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
          >
            Edit Profile
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {moduleItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.title}
              href={item.href}
              className="group rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="inline-flex rounded-lg bg-emerald-50 p-2 text-emerald-700 transition group-hover:bg-emerald-100 group-hover:text-emerald-800">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
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
        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Messages Transaction</p>
          <p className="mt-1 text-xs text-slate-500">Daily outbound volume across selected date range.</p>

          <div className="mt-4 h-[290px] rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
            <div className="flex h-full items-end gap-1 overflow-x-auto pb-2">
              {txPoints.map((point) => (
                <div key={point.date} className="flex min-w-[18px] flex-col items-center gap-1">
                  <div
                    className="w-3 rounded-sm bg-emerald-500"
                    style={{ height: `${Math.max(4, (point.sent / txMax) * 180)}px` }}
                    title={`${formatDateLabel(point.date)} | Sent ${point.sent}`}
                  />
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-[10px] text-emerald-700/80">
              <span>{txPoints[0] ? formatDateLabel(txPoints[0].date) : "-"}</span>
              <span>{txPoints[txPoints.length - 1] ? formatDateLabel(txPoints[txPoints.length - 1].date) : "-"}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Automatic Replies</p>
          <p className="mt-1 text-xs text-slate-500">Automation-driven outbound replies and workflow runs.</p>

          <div className="mt-4 h-[290px] rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
            <div className="flex h-full items-end gap-1 overflow-x-auto pb-2">
              {autoPoints.map((point) => (
                <div key={point.date} className="flex min-w-[18px] items-end gap-[3px]">
                  <div
                    className="w-[6px] rounded-sm bg-emerald-500"
                    style={{ height: `${Math.max(4, (point.autoReplies / autoMax) * 180)}px` }}
                    title={`${formatDateLabel(point.date)} | Auto replies ${point.autoReplies}`}
                  />
                  <div
                    className="w-[6px] rounded-sm bg-emerald-300"
                    style={{ height: `${Math.max(4, (point.workflowRuns / autoMax) * 180)}px` }}
                    title={`${formatDateLabel(point.date)} | Workflow runs ${point.workflowRuns}`}
                  />
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-[10px] text-emerald-700/80">
              <span>{autoPoints[0] ? formatDateLabel(autoPoints[0].date) : "-"}</span>
              <span>{autoPoints[autoPoints.length - 1] ? formatDateLabel(autoPoints[autoPoints.length - 1].date) : "-"}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-emerald-700" />
            <p className="text-sm font-semibold text-slate-900">Message Status</p>
          </div>
          <p className="mt-1 text-xs text-slate-500">Live distribution of outgoing message states.</p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {statusBreakdown.length === 0 ? (
              <p className="col-span-full text-xs text-slate-500">No status data available.</p>
            ) : (
              statusBreakdown.map((item) => (
                <div key={item.status} className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{item.status}</p>
                  <p className="mt-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                    {item.count}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <UserCircle2 className="h-4 w-4 text-emerald-700" />
            <p className="text-sm font-semibold text-slate-900">Recent Transaction Activity</p>
          </div>
          <p className="mt-1 text-xs text-slate-500">Recent WhatsApp dispatch and queue events from audit logs.</p>

          <div className="mt-4 overflow-hidden rounded-xl border border-emerald-100">
            <table className="w-full text-left text-xs">
              <thead className="bg-emerald-50 text-emerald-700">
                <tr>
                  <th className="px-3 py-2 font-medium">Transaction ID</th>
                  <th className="px-3 py-2 font-medium">Action</th>
                  <th className="px-3 py-2 font-medium">Recipients</th>
                  <th className="px-3 py-2 font-medium">Result</th>
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
                    <tr key={item.id} className="border-t border-emerald-100">
                      <td className="px-3 py-2.5 font-medium text-slate-700">WA-{item.id}</td>
                      <td className="px-3 py-2.5 text-slate-700">{formatAction(item.action)}</td>
                      <td className="px-3 py-2.5 text-slate-700">{item.recipients}</td>
                      <td className="px-3 py-2.5 text-slate-700">
                        <span className="block">sent: {item.sent}</span>
                        <span className="block">failed: {item.failed}</span>
                        {item.warning ? (
                          <span className="block truncate text-rose-600" title={item.warning}>
                            warning
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
    </div>
  );
}
