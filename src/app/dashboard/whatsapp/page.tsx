"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
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

const EMPTY_TX_POINTS: OverviewPayload["charts"]["messageTransactions"] = [];
const EMPTY_AUTO_POINTS: OverviewPayload["charts"]["automaticReplies"] = [];
const EMPTY_STATUS_BREAKDOWN: OverviewPayload["statusBreakdown"] = [];
const EMPTY_RECENT_ACTIVITY: OverviewPayload["recentActivity"] = [];
const EMPTY_ACCOUNT_OPTIONS: OverviewPayload["accountOptions"] = [];

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
  if (value === "HIGH") return "bg-blue-100 text-blue-700 border-blue-300";
  if (value === "MEDIUM") return "bg-amber-100 text-amber-700 border-amber-300";
  if (value === "LOW") return "bg-rose-100 text-rose-700 border-rose-300";
  return "bg-slate-100 text-slate-700 border-slate-300";
}

function getBadgeTone(badge: string) {
  const value = badge.toUpperCase();
  if (value === "CORE") return "border-blue-200 bg-blue-100 text-blue-700";
  if (value === "CRM") return "border-cyan-200 bg-cyan-100 text-cyan-700";
  if (value === "SUPPORT") return "border-indigo-200 bg-indigo-100 text-indigo-700";
  if (value === "CAMPAIGN") return "border-violet-200 bg-violet-100 text-violet-700";
  if (value === "GROWTH") return "border-fuchsia-200 bg-fuchsia-100 text-fuchsia-700";
  if (value === "AUTOMATION") return "border-amber-200 bg-amber-100 text-amber-700";
  if (value === "BUILDER") return "border-sky-200 bg-sky-100 text-sky-700";
  if (value === "AI") return "border-purple-200 bg-purple-100 text-purple-700";
  if (value === "BILLING") return "border-slate-300 bg-slate-100 text-slate-700";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function getModuleIconTone(badge: string) {
  const value = badge.toUpperCase();
  if (value === "CORE") return "bg-blue-100 text-blue-700 group-hover:bg-blue-200";
  if (value === "CRM") return "bg-cyan-100 text-cyan-700 group-hover:bg-cyan-200";
  if (value === "SUPPORT") return "bg-indigo-100 text-indigo-700 group-hover:bg-indigo-200";
  if (value === "CAMPAIGN") return "bg-violet-100 text-violet-700 group-hover:bg-violet-200";
  if (value === "GROWTH") return "bg-fuchsia-100 text-fuchsia-700 group-hover:bg-fuchsia-200";
  if (value === "AUTOMATION") return "bg-amber-100 text-amber-700 group-hover:bg-amber-200";
  if (value === "BUILDER") return "bg-sky-100 text-sky-700 group-hover:bg-sky-200";
  if (value === "AI") return "bg-purple-100 text-purple-700 group-hover:bg-purple-200";
  if (value === "BILLING") return "bg-slate-100 text-slate-700 group-hover:bg-slate-200";
  return "bg-slate-100 text-slate-700 group-hover:bg-slate-200";
}

export default function WhatsAppHubPage() {
  const [days, setDays] = useState(30);
  const [accountId, setAccountId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OverviewPayload | null>(null);
  const activeRequestRef = useRef(0);

  const fetchOverview = useCallback(
    async (manual = false, signal?: AbortSignal) => {
      const requestId = activeRequestRef.current + 1;
      activeRequestRef.current = requestId;

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
          signal,
        });
        const payload = await readJsonSafe(res);
        if (!res.ok || !payload.success) {
          throw new Error(payload.error || "Failed to load WhatsApp overview");
        }

        if (activeRequestRef.current !== requestId) return;
        setData(payload as OverviewPayload);
      } catch (err) {
        if (signal?.aborted) return;
        if (activeRequestRef.current !== requestId) return;
        if (!manual) {
          setData(null);
        }
        setError(err instanceof Error ? err.message : "Failed to load WhatsApp overview");
      } finally {
        if (activeRequestRef.current !== requestId) return;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accountId, days]
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetchOverview(false, controller.signal);
    return () => controller.abort();
  }, [fetchOverview]);

  const txPoints = useMemo(() => data?.charts.messageTransactions ?? EMPTY_TX_POINTS, [data]);
  const autoPoints = useMemo(() => data?.charts.automaticReplies ?? EMPTY_AUTO_POINTS, [data]);
  const txMax = useMemo(() => Math.max(1, ...txPoints.map((point) => point.sent)), [txPoints]);
  const autoMax = useMemo(
    () => Math.max(1, ...autoPoints.map((point) => Math.max(point.autoReplies, point.workflowRuns))),
    [autoPoints]
  );

  const statusBreakdown = data?.statusBreakdown ?? EMPTY_STATUS_BREAKDOWN;
  const recentActivity = data?.recentActivity ?? EMPTY_RECENT_ACTIVITY;
  const accountOptions = data?.accountOptions ?? EMPTY_ACCOUNT_OPTIONS;
  const summary = data?.summary;
  const quality = data?.quality;
  const limits = data?.limits;
  const cards = data?.cards;

  return (
    <div className="mx-auto w-full max-w-[1750px] space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-3xl border border-slate-700/60 bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_45%,#312e81_100%)] px-5 py-5 text-white shadow-[0_24px_80px_-32px_rgba(15,23,42,0.92)] md:px-7 md:py-7">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-100 backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5" />
              WhatsApp Business Management
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-white md:text-4xl">
              WhatsApp Service Command Center
            </h1>
            <p className="mt-2 text-sm text-slate-200/90 md:text-base">
              Track delivery health, manage accounts, launch campaigns and run conversational
              operations from one clean workspace.
            </p>
          </div>

          <div className="grid w-full grid-cols-1 gap-2 sm:max-w-[560px] sm:grid-cols-2">
            <label className="rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur">
              <p className="text-[11px] uppercase tracking-wide text-slate-200">Account Scope</p>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-400/40 bg-slate-900/35 px-2.5 py-1.5 text-sm text-white outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-200/20"
              >
                <option value="all">All accounts</option>
                {accountOptions.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.phoneNumber})
                  </option>
                ))}
              </select>
            </label>

            <label className="rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur">
              <p className="text-[11px] uppercase tracking-wide text-slate-200">Date Range</p>
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-400/40 bg-slate-900/35 px-2.5 py-1.5 text-sm text-white outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-200/20"
              >
                {rangeOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur">
              <p className="text-[11px] uppercase tracking-wide text-slate-200">Latest Sync</p>
              <p className="mt-1 text-sm font-semibold text-white">
                {formatDateTime(cards?.latestSyncAt || null)}
              </p>
            </div>

            <div className="rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur">
              <p className="text-[11px] uppercase tracking-wide text-slate-200">Actions</p>
              <button
                type="button"
                onClick={() => void fetchOverview(true)}
                disabled={refreshing}
                className="mt-1 inline-flex items-center gap-1 rounded-lg border border-sky-200/45 bg-sky-300/10 px-2.5 py-1.5 text-sm font-medium text-white transition hover:bg-sky-300/20 disabled:opacity-60"
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
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        </section>
      ) : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="group rounded-2xl border border-indigo-100 bg-[linear-gradient(160deg,#ffffff_0%,#eef2ff_100%)] p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
              Total Message Sent
            </p>
            <span className="rounded-lg bg-indigo-100 p-1.5 text-indigo-700">
              <Send className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {loading ? "-" : (summary?.totalSent ?? 0).toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-indigo-700/80">Outbound messages in selected range</p>
        </div>

        <div className="group rounded-2xl border border-cyan-100 bg-[linear-gradient(160deg,#ffffff_0%,#ecfeff_100%)] p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Total Delivered</p>
            <span className="rounded-lg bg-cyan-100 p-1.5 text-cyan-700">
              <CheckCheck className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {loading ? "-" : (summary?.totalDelivered ?? 0).toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-cyan-700/80">Delivered/read confirmations</p>
        </div>

        <div className="group rounded-2xl border border-violet-100 bg-[linear-gradient(160deg,#ffffff_0%,#f5f3ff_100%)] p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Total Read</p>
            <span className="rounded-lg bg-violet-100 p-1.5 text-violet-700">
              <MessageSquareText className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {loading ? "-" : (summary?.totalRead ?? 0).toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-violet-700/80">Customer read confirmations</p>
        </div>

        <div className="group rounded-2xl border border-rose-100 bg-[linear-gradient(160deg,#ffffff_0%,#fff1f2_100%)] p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Total Failed</p>
            <span className="rounded-lg bg-rose-100 p-1.5 text-rose-700">
              <AlertTriangle className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {loading ? "-" : (summary?.totalFailed ?? 0).toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-rose-700/80">Messages failed to deliver</p>
        </div>

        <div className="group rounded-2xl border border-blue-100 bg-[linear-gradient(160deg,#ffffff_0%,#eff6ff_100%)] p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">DLR Percentage</p>
            <span className="rounded-lg bg-blue-100 p-1.5 text-blue-700">
              <Gauge className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {loading ? "-" : `${summary?.dlrPercent ?? 0}%`}
          </p>
          <p className="mt-1 text-xs text-blue-700/80">Delivery ratio on outbound traffic</p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-[linear-gradient(150deg,#ffffff_0%,#f8fafc_100%)] p-5 shadow-sm">
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
            className="mt-5 inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-200"
          >
            Learn how to improve quality
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-[linear-gradient(150deg,#ffffff_0%,#eff6ff_100%)] p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Daily Sending Limit</p>
          <p className="mt-1 text-xs text-slate-500">
            Usage today vs estimated tier (auto-derived from quality profile).
          </p>
          <div className="mt-5 space-y-3">
            <div className="h-3 rounded-full bg-blue-100">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
                style={{ width: `${Math.min(100, limits?.usagePercent ?? 0)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-medium text-blue-700/80">
              <span>250</span>
              <span>2K</span>
              <span>10K</span>
              <span>100K</span>
              <span>Unlimited</span>
            </div>
            <p className="text-xs text-blue-700">
              Today: {limits?.usageToday ?? 0} / Tier: {(limits?.currentTier ?? 250).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-[linear-gradient(150deg,#ffffff_0%,#f8fafc_100%)] p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Meta Business Access</p>
          <p className="mt-1 text-xs text-slate-500">
            Manage account connectivity, webhooks and token lifecycle for secure messaging.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
              <p className="text-slate-500">Accounts</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{cards?.accounts ?? 0}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
              <p className="text-slate-500">Open Conversations</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{cards?.openConversations ?? 0}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
              <p className="text-slate-500">Opted-in Contacts</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{cards?.optedInContacts ?? 0}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
              <p className="text-slate-500">Active Automation</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{cards?.activeAutomations ?? 0}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-[linear-gradient(140deg,#ffffff_0%,#f8fafc_100%)] p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Business Profile Setup</p>
            <p className="mt-1 text-xs text-slate-500">
              Keep business profile complete so users trust your brand communication.
            </p>
          </div>
          <Link
            href="/dashboard/whatsapp/accounts"
            className="inline-flex items-center gap-1 rounded-lg border border-blue-300 bg-blue-100 px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-200"
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
              className="group rounded-2xl border border-slate-200 bg-[linear-gradient(145deg,#ffffff_0%,#f8fafc_100%)] p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className={`inline-flex rounded-lg p-2 transition ${getModuleIconTone(item.badge)}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${getBadgeTone(item.badge)}`}>
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
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Messages Transaction</p>
          <p className="mt-1 text-xs text-slate-500">Daily outbound volume across selected date range.</p>

          <div className="mt-4 h-[290px] rounded-xl border border-slate-200 bg-[linear-gradient(180deg,#eef2ff_0%,#ffffff_100%)] p-4">
            <div className="flex h-full items-end gap-1 overflow-x-auto pb-2">
              {txPoints.map((point) => (
                <div key={point.date} className="flex min-w-[18px] flex-col items-center gap-1">
                  <div
                    className="w-3 rounded-sm bg-gradient-to-t from-indigo-600 to-sky-500"
                    style={{ height: `${Math.max(4, (point.sent / txMax) * 180)}px` }}
                    title={`${formatDateLabel(point.date)} | Sent ${point.sent}`}
                  />
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-[10px] text-indigo-700/80">
              <span>{txPoints[0] ? formatDateLabel(txPoints[0].date) : "-"}</span>
              <span>{txPoints[txPoints.length - 1] ? formatDateLabel(txPoints[txPoints.length - 1].date) : "-"}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Automatic Replies</p>
          <p className="mt-1 text-xs text-slate-500">Automation-driven outbound replies and workflow runs.</p>

          <div className="mt-4 h-[290px] rounded-xl border border-slate-200 bg-[linear-gradient(180deg,#f0f9ff_0%,#ffffff_100%)] p-4">
            <div className="flex h-full items-end gap-1 overflow-x-auto pb-2">
              {autoPoints.map((point) => (
                <div key={point.date} className="flex min-w-[18px] items-end gap-[3px]">
                  <div
                    className="w-[6px] rounded-sm bg-gradient-to-t from-sky-600 to-sky-400"
                    style={{ height: `${Math.max(4, (point.autoReplies / autoMax) * 180)}px` }}
                    title={`${formatDateLabel(point.date)} | Auto replies ${point.autoReplies}`}
                  />
                  <div
                    className="w-[6px] rounded-sm bg-gradient-to-t from-violet-500 to-violet-300"
                    style={{ height: `${Math.max(4, (point.workflowRuns / autoMax) * 180)}px` }}
                    title={`${formatDateLabel(point.date)} | Workflow runs ${point.workflowRuns}`}
                  />
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-[10px] text-sky-700/80">
              <span>{autoPoints[0] ? formatDateLabel(autoPoints[0].date) : "-"}</span>
              <span>{autoPoints[autoPoints.length - 1] ? formatDateLabel(autoPoints[autoPoints.length - 1].date) : "-"}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-indigo-700" />
            <p className="text-sm font-semibold text-slate-900">Message Status</p>
          </div>
          <p className="mt-1 text-xs text-slate-500">Live distribution of outgoing message states.</p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {statusBreakdown.length === 0 ? (
              <p className="col-span-full text-xs text-slate-500">No status data available.</p>
            ) : (
              statusBreakdown.map((item) => (
                <div key={item.status} className="rounded-xl border border-slate-200 bg-[linear-gradient(140deg,#eef2ff_0%,#ffffff_100%)] p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{item.status}</p>
                  <p className="mt-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                    {item.count}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <UserCircle2 className="h-4 w-4 text-indigo-700" />
            <p className="text-sm font-semibold text-slate-900">Recent Transaction Activity</p>
          </div>
          <p className="mt-1 text-xs text-slate-500">Recent WhatsApp dispatch and queue events from audit logs.</p>

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-[linear-gradient(90deg,#eef2ff_0%,#e0f2fe_100%)] text-indigo-700">
                <tr>
                  <th className="px-3 py-2 font-medium">Transaction ID</th>
                  <th className="px-3 py-2 font-medium">Action</th>
                  <th className="px-3 py-2 font-medium">Recipients</th>
                  <th className="px-3 py-2 font-medium">Result</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                      No records found
                    </td>
                  </tr>
                ) : (
                  recentActivity.map((item) => (
                    <tr key={item.id} className="border-t border-slate-200 even:bg-slate-50/70">
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
