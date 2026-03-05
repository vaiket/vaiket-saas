"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  type ChartOptions,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import {
  Activity,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Cpu,
  Database,
  Inbox,
  Loader2,
  Mail,
  MessageSquare,
  RefreshCw,
  Rocket,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  User2,
  Users,
  Zap,
} from "lucide-react";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip
);

type DashboardStats = {
  visitorsToday: number;
  emailsToday: number;
  aiCostToday: number | string;
  leadsToday: number;
  traffic: Array<{ day: string; visits: number }>;
  emails: Array<{ day: string; count: number }>;
  aiUsage: {
    openai: number;
    deepseek: number;
    gemini: number;
    claude: number;
  };
};

type SystemHealth = {
  workers: {
    aiProcessor: string;
    imapSync: string;
  };
  queue: {
    pendingEmails: number;
    failedEmails: number;
  };
  system: {
    database: string;
    responseTime: string;
  };
  traffic: {
    visitorsToday: number;
  };
};

type OverviewStats = {
  totalEmails: number;
  aiReplies: number;
  awaitingReply: number;
  avgResponseTime: string;
  connectedMailboxes: number;
  spamBlocked: number;
};

type EmailItem = {
  id?: string;
  from?: string;
  sender?: string;
  subject?: string;
  createdAt?: string;
};

type MailPreviewContact = {
  email: string;
  lastMessage: string | null;
  lastAt: string | null;
};

type MailPreviewMessage = {
  id: string;
  direction: "in" | "out";
  subject?: string | null;
  body?: string | null;
  createdAt: string;
  status?: string | null;
};

type WaConversation = {
  id: string;
  status: string;
  lastMessageAt: string | null;
  account: {
    id: string;
    name: string;
    phoneNumber: string;
  };
  contact: {
    id: string;
    name: string | null;
    phone: string;
    tags: string[];
    optedIn: boolean;
  };
  messages: Array<{
    id: string;
    direction: string;
    text: string | null;
    status: string;
    createdAt: string;
  }>;
};

type WaMessage = {
  id: string;
  direction: string;
  messageType: string;
  text: string | null;
  status: string;
  createdAt: string;
};

type AppUser = {
  name?: string | null;
  email?: string | null;
  role?: string | null;
};

const lineOptions: ChartOptions<"line"> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      titleColor: "#f8fafc",
      bodyColor: "#cbd5e1",
      borderColor: "rgba(148, 163, 184, 0.2)",
      borderWidth: 1,
    },
  },
  scales: {
    x: {
      ticks: {
        color: "#64748b",
        font: { size: 11, weight: 500 },
      },
      grid: {
        display: false,
      },
    },
    y: {
      ticks: {
        color: "#64748b",
        font: { size: 11, weight: 500 },
      },
      grid: {
        color: "rgba(148, 163, 184, 0.18)",
      },
      border: {
        display: false,
      },
      beginAtZero: true,
    },
  },
};

const barOptions: ChartOptions<"bar"> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      titleColor: "#f8fafc",
      bodyColor: "#cbd5e1",
      borderColor: "rgba(148, 163, 184, 0.2)",
      borderWidth: 1,
    },
  },
  scales: {
    x: {
      ticks: {
        color: "#64748b",
        font: { size: 11, weight: 500 },
      },
      grid: { display: false },
      border: { display: false },
    },
    y: {
      ticks: {
        color: "#64748b",
        font: { size: 11, weight: 500 },
      },
      grid: {
        color: "rgba(148, 163, 184, 0.18)",
      },
      border: { display: false },
      beginAtZero: true,
    },
  },
};

const doughnutOptions: ChartOptions<"doughnut"> = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: "72%",
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      titleColor: "#f8fafc",
      bodyColor: "#cbd5e1",
      borderColor: "rgba(148, 163, 184, 0.2)",
      borderWidth: 1,
    },
  },
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [user, setUser] = useState<AppUser | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [waConversations, setWaConversations] = useState<WaConversation[]>([]);
  const [waSelectedConversationId, setWaSelectedConversationId] = useState("");
  const [waMessages, setWaMessages] = useState<WaMessage[]>([]);
  const [waQuery, setWaQuery] = useState("");
  const [waText, setWaText] = useState("");
  const [waLoadingConversations, setWaLoadingConversations] = useState(true);
  const [waLoadingMessages, setWaLoadingMessages] = useState(false);
  const [waSending, setWaSending] = useState(false);
  const [waError, setWaError] = useState<string | null>(null);
  const [mailContacts, setMailContacts] = useState<MailPreviewContact[]>([]);
  const [mailSelectedEmail, setMailSelectedEmail] = useState("");
  const [mailMessages, setMailMessages] = useState<MailPreviewMessage[]>([]);
  const [mailQuery, setMailQuery] = useState("");
  const [mailSubject, setMailSubject] = useState("");
  const [mailBody, setMailBody] = useState("");
  const [mailLoadingContacts, setMailLoadingContacts] = useState(true);
  const [mailLoadingMessages, setMailLoadingMessages] = useState(false);
  const [mailSending, setMailSending] = useState(false);
  const [mailError, setMailError] = useState<string | null>(null);

  const loadDashboard = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const [statsRes, healthRes, emailsRes, userRes, overviewRes] = await Promise.all([
      fetchJSON<{ success: boolean; data: DashboardStats }>("/api/dashboard/stats"),
      fetchJSON<{ success: boolean; data: SystemHealth }>("/api/system/health"),
      fetchJSON<{ success: boolean; emails: EmailItem[] }>("/api/emails/list"),
      fetchJSON<{ success: boolean; user: AppUser }>("/api/auth/me"),
      fetchJSON<OverviewStats>("/api/dashboard/overview"),
    ]);

    setStats(statsRes?.success ? statsRes.data : sampleStats());
    setHealth(healthRes?.success ? healthRes.data : sampleHealth());
    setEmails(emailsRes?.success ? emailsRes.emails ?? [] : sampleEmails());
    setUser(userRes?.success ? userRes.user : null);
    setOverview(overviewRes ?? sampleOverview());
    setLastUpdated(new Date());

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      if (!mounted) return;
      await loadDashboard(false);
    }

    bootstrap();
    const timer = setInterval(() => {
      if (mounted) {
        loadDashboard(true);
      }
    }, 35000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [loadDashboard]);

  const retryQueue = async () => {
    setRetrying(true);
    await fetchPOST("/api/cron/imap-sync");
    await loadDashboard(true);
    setRetrying(false);
  };

  const aiUsage = stats?.aiUsage ?? sampleStats().aiUsage;
  const aiUsageTotal = Object.values(aiUsage).reduce((acc, val) => acc + val, 0);

  const trafficChartData = useMemo(() => {
    const traffic = stats?.traffic?.length ? stats.traffic : sampleStats().traffic;
    return {
      labels: traffic.map((item) => item.day),
      datasets: [
        {
          label: "Visits",
          data: traffic.map((item) => item.visits),
          tension: 0.35,
          borderWidth: 3,
          pointRadius: 3,
          pointHoverRadius: 5,
          borderColor: "#2563eb",
          pointBackgroundColor: "#1d4ed8",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          fill: true,
          backgroundColor: "rgba(37, 99, 235, 0.12)",
        },
      ],
    };
  }, [stats]);

  const emailChartData = useMemo(() => {
    const emailSeries = stats?.emails?.length ? stats.emails : sampleStats().emails;
    return {
      labels: emailSeries.map((item) => item.day),
      datasets: [
        {
          label: "Emails",
          data: emailSeries.map((item) => item.count),
          backgroundColor: "rgba(16, 185, 129, 0.85)",
          borderRadius: 8,
          borderSkipped: false,
        },
      ],
    };
  }, [stats]);

  const aiUsageChartData = useMemo(() => {
    const usage = stats?.aiUsage ?? sampleStats().aiUsage;
    return {
      labels: ["OpenAI", "DeepSeek", "Gemini", "Claude"],
      datasets: [
        {
          data: [usage.openai, usage.deepseek, usage.gemini, usage.claude],
          backgroundColor: ["#2563eb", "#0f766e", "#8b5cf6", "#f59e0b"],
          borderColor: "#ffffff",
          borderWidth: 3,
          hoverOffset: 5,
        },
      ],
    };
  }, [stats]);

  const visitorsChange = getTrendFromSeries(stats?.traffic?.map((item) => item.visits) ?? []);
  const emailChange = getTrendFromSeries(stats?.emails?.map((item) => item.count) ?? []);

  const topStats = [
    {
      title: "Visitors Today",
      value: formatCompact(stats?.visitorsToday ?? 0),
      note: visitorsChange.label,
      tone: visitorsChange.positive ? "positive" : "neutral",
      icon: Users,
      iconClass: "from-blue-600 to-indigo-500",
    },
    {
      title: "Emails Processed",
      value: formatCompact(stats?.emailsToday ?? 0),
      note: emailChange.label,
      tone: emailChange.positive ? "positive" : "neutral",
      icon: Mail,
      iconClass: "from-emerald-600 to-teal-500",
    },
    {
      title: "Leads Captured",
      value: formatCompact(stats?.leadsToday ?? 0),
      note: "Real-time lead sync enabled",
      tone: "neutral",
      icon: Rocket,
      iconClass: "from-violet-600 to-fuchsia-500",
    },
    {
      title: "AI Cost Today",
      value: `INR ${formatMoney(stats?.aiCostToday ?? 0)}`,
      note: "Optimized routing active",
      tone: "positive",
      icon: Bot,
      iconClass: "from-amber-500 to-orange-500",
    },
    {
      title: "Queue Pending",
      value: formatCompact(health?.queue?.pendingEmails ?? 0),
      note: `${health?.queue?.failedEmails ?? 0} failed`,
      tone: (health?.queue?.failedEmails ?? 0) > 0 ? "critical" : "neutral",
      icon: Inbox,
      iconClass: "from-slate-700 to-slate-500",
    },
  ] as const;

  const heroPulseStats = [
    {
      label: "Live chats",
      value: formatCompact(waConversations.length),
      tone: "text-emerald-300",
    },
    {
      label: "Mail threads",
      value: formatCompact(mailContacts.length),
      tone: "text-sky-300",
    },
    {
      label: "Pending queue",
      value: formatCompact(health?.queue?.pendingEmails ?? 0),
      tone:
        (health?.queue?.failedEmails ?? 0) > 0
          ? "text-rose-300"
          : "text-amber-200",
    },
  ] as const;

  const waSelectedConversation = useMemo(
    () => waConversations.find((item) => item.id === waSelectedConversationId) || null,
    [waConversations, waSelectedConversationId]
  );

  const waFilteredConversations = useMemo(() => {
    const query = waQuery.trim().toLowerCase();
    if (!query) return waConversations;
    return waConversations.filter((item) => {
      const name = (item.contact.name || "").toLowerCase();
      const phone = item.contact.phone.toLowerCase();
      const preview = (item.messages[0]?.text || "").toLowerCase();
      const account = item.account.name.toLowerCase();
      return (
        name.includes(query) ||
        phone.includes(query) ||
        preview.includes(query) ||
        account.includes(query)
      );
    });
  }, [waConversations, waQuery]);

  const mailFilteredContacts = useMemo(() => {
    const query = mailQuery.trim().toLowerCase();
    if (!query) return mailContacts;
    return mailContacts.filter((item) => item.email.toLowerCase().includes(query));
  }, [mailContacts, mailQuery]);

  const loadWaConversations = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent);
    try {
      if (!silent) {
        setWaLoadingConversations(true);
        setWaError(null);
      }

      const res = await fetch("/api/whatsapp/inbox/conversations", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await readJsonSafeResponse(res);
      if (!res.ok || !data.success) {
        throw new Error(asText(data.error) || "Failed to load WhatsApp conversations");
      }

      const next = (Array.isArray(data.conversations) ? data.conversations : []) as WaConversation[];
      setWaConversations(next);
      setWaSelectedConversationId((prev) => {
        if (!next.length) return "";
        if (prev && next.some((item) => item.id === prev)) return prev;
        return next[0].id;
      });
    } catch (error) {
      if (!silent) {
        setWaError(error instanceof Error ? error.message : "Failed to load WhatsApp conversations");
      }
    } finally {
      if (!silent) {
        setWaLoadingConversations(false);
      }
    }
  }, []);

  const loadWaMessages = useCallback(async (conversationId: string, opts?: { silent?: boolean }) => {
    if (!conversationId) return;
    const silent = Boolean(opts?.silent);
    try {
      if (!silent) {
        setWaLoadingMessages(true);
        setWaError(null);
      }

      const endpoint = `/api/whatsapp/inbox/messages?conversationId=${encodeURIComponent(
        conversationId
      )}`;
      const res = await fetch(endpoint, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await readJsonSafeResponse(res);
      if (!res.ok || !data.success) {
        throw new Error(asText(data.error) || "Failed to load WhatsApp messages");
      }

      const next = (Array.isArray(data.messages) ? data.messages : []) as WaMessage[];
      setWaMessages(next);
    } catch (error) {
      if (!silent) {
        setWaError(error instanceof Error ? error.message : "Failed to load WhatsApp messages");
      }
    } finally {
      if (!silent) {
        setWaLoadingMessages(false);
      }
    }
  }, []);

  const sendWaMessage = useCallback(async () => {
    const conversationId = waSelectedConversationId;
    const messageText = waText.trim();
    if (!conversationId || !messageText) return;

    try {
      setWaSending(true);
      setWaError(null);

      const res = await fetch("/api/whatsapp/inbox/messages", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          text: messageText,
        }),
      });
      const data = await readJsonSafeResponse(res);
      if (!res.ok || !data.success) {
        throw new Error(asText(data.error) || "Failed to send WhatsApp message");
      }

      setWaText("");
      await Promise.all([
        loadWaMessages(conversationId),
        loadWaConversations({ silent: true }),
      ]);
    } catch (error) {
      setWaError(error instanceof Error ? error.message : "Failed to send WhatsApp message");
    } finally {
      setWaSending(false);
    }
  }, [waSelectedConversationId, waText, loadWaMessages, loadWaConversations]);

  const loadMailContacts = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent);
    try {
      if (!silent) {
        setMailLoadingContacts(true);
        setMailError(null);
      }

      const res = await fetch("/api/mail-inbox/contacts", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await readJsonSafeResponse(res);
      if (!res.ok || !data.success) {
        throw new Error(asText(data.error) || "Failed to load email contacts");
      }

      const next = (Array.isArray(data.contacts) ? data.contacts : []) as MailPreviewContact[];
      setMailContacts(next);
      setMailSelectedEmail((prev) => {
        if (!next.length) return "";
        if (prev && next.some((item) => item.email === prev)) return prev;
        return next[0].email;
      });
    } catch (error) {
      if (!silent) {
        setMailError(error instanceof Error ? error.message : "Failed to load email contacts");
      }
    } finally {
      if (!silent) {
        setMailLoadingContacts(false);
      }
    }
  }, []);

  const loadMailMessages = useCallback(async (email: string, opts?: { silent?: boolean }) => {
    if (!email) return;
    const silent = Boolean(opts?.silent);
    try {
      if (!silent) {
        setMailLoadingMessages(true);
        setMailError(null);
      }

      const endpoint = `/api/mail-inbox/messages?email=${encodeURIComponent(email)}`;
      const res = await fetch(endpoint, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await readJsonSafeResponse(res);
      if (!res.ok || !data.success) {
        throw new Error(asText(data.error) || "Failed to load email messages");
      }

      const next = (Array.isArray(data.messages) ? data.messages : []) as MailPreviewMessage[];
      setMailMessages(next);
    } catch (error) {
      if (!silent) {
        setMailError(error instanceof Error ? error.message : "Failed to load email messages");
      }
    } finally {
      if (!silent) {
        setMailLoadingMessages(false);
      }
    }
  }, []);

  const sendMailReply = useCallback(async () => {
    const to = mailSelectedEmail;
    const body = mailBody.trim();
    if (!to || !body) return;

    try {
      setMailSending(true);
      setMailError(null);

      const fallbackSubject =
        mailMessages[mailMessages.length - 1]?.subject || "Conversation";
      const subject = mailSubject.trim() || `Re: ${fallbackSubject}`;

      const res = await fetch("/api/mail-inbox/send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          subject,
          body,
        }),
      });
      const data = await readJsonSafeResponse(res);
      if (!res.ok || !data.success) {
        throw new Error(asText(data.error) || "Failed to send email");
      }

      setMailBody("");
      setMailSubject("");
      await Promise.all([
        loadMailMessages(to),
        loadMailContacts({ silent: true }),
      ]);
    } catch (error) {
      setMailError(error instanceof Error ? error.message : "Failed to send email");
    } finally {
      setMailSending(false);
    }
  }, [mailSelectedEmail, mailBody, mailSubject, mailMessages, loadMailMessages, loadMailContacts]);

  useEffect(() => {
    void loadWaConversations();
  }, [loadWaConversations]);

  useEffect(() => {
    if (!waSelectedConversationId) {
      setWaMessages([]);
      return;
    }
    void loadWaMessages(waSelectedConversationId);
  }, [waSelectedConversationId, loadWaMessages]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadWaConversations({ silent: true });
    }, 10000);
    return () => window.clearInterval(timer);
  }, [loadWaConversations]);

  useEffect(() => {
    if (!waSelectedConversationId) return;
    const timer = window.setInterval(() => {
      void loadWaMessages(waSelectedConversationId, { silent: true });
    }, 8000);
    return () => window.clearInterval(timer);
  }, [waSelectedConversationId, loadWaMessages]);

  useEffect(() => {
    void loadMailContacts();
  }, [loadMailContacts]);

  useEffect(() => {
    if (!mailSelectedEmail) {
      setMailMessages([]);
      return;
    }
    void loadMailMessages(mailSelectedEmail);
  }, [mailSelectedEmail, loadMailMessages]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadMailContacts({ silent: true });
    }, 20000);
    return () => window.clearInterval(timer);
  }, [loadMailContacts]);

  useEffect(() => {
    if (!mailSelectedEmail) return;
    const timer = window.setInterval(() => {
      void loadMailMessages(mailSelectedEmail, { silent: true });
    }, 12000);
    return () => window.clearInterval(timer);
  }, [mailSelectedEmail, loadMailMessages]);

  if (loading && !stats) {
    return (
      <div className="space-y-6">
        <div className="h-44 animate-pulse rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-100 to-white" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-100 to-white"
            />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-12">
          <div className="h-96 animate-pulse rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-100 to-white xl:col-span-8" />
          <div className="h-96 animate-pulse rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-100 to-white xl:col-span-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative space-y-6 pb-2">
      <div className="pointer-events-none absolute -top-20 -z-10 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl" />
      <div className="pointer-events-none absolute right-10 top-12 -z-10 h-64 w-64 rounded-full bg-sky-300/20 blur-3xl" />

      <section className="relative overflow-hidden rounded-3xl border border-indigo-200/50 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-6 text-white shadow-[0_30px_80px_-45px_rgba(15,23,42,0.9)]">
        <div className="pointer-events-none absolute -left-16 top-0 h-48 w-48 rounded-full bg-blue-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="pointer-events-none absolute left-1/2 top-10 h-40 w-72 -translate-x-1/2 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-100 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              Production Overview
            </div>

            <div>
              <h2 className="text-2xl font-semibold md:text-3xl">Operations Command Center</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-200/95 md:text-base">
                High-clarity dashboard for traffic, messaging, automation health, and revenue
                signals. Designed for fast decisions.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-200">
              <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-1">
                <Clock3 className="h-3.5 w-3.5" />
                Last sync: {lastUpdated ? lastUpdated.toLocaleTimeString() : "Waiting"}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-1">
                <User2 className="h-3.5 w-3.5" />
                {user?.name || "Workspace User"}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                Secure tenant mode
              </span>
            </div>
          </div>

          <div className="w-full max-w-sm space-y-3 xl:max-w-[360px]">
            <div className="grid grid-cols-3 gap-2">
              {heroPulseStats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 backdrop-blur"
                >
                  <p className="text-[10px] uppercase tracking-wide text-slate-200">{item.label}</p>
                  <p className={`mt-1 text-lg font-semibold ${item.tone}`}>{item.value}</p>
                </div>
              ))}
            </div>

            <div className="flex w-full flex-col gap-2 sm:flex-row">
              <button
                onClick={() => loadDashboard(true)}
                disabled={refreshing}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {refreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Refresh
              </button>

              <button
                onClick={retryQueue}
                disabled={retrying}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {retrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
                Retry queue
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {topStats.map((item) => {
          const Icon = item.icon;
          const toneClass =
            item.tone === "positive"
              ? "text-emerald-600"
              : item.tone === "critical"
                ? "text-rose-600"
                : "text-slate-500";

          return (
            <article
              key={item.title}
              className="group rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.title}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{item.value}</p>
                </div>
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow ${item.iconClass}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className={`mt-3 text-xs font-medium ${toneClass}`}>{item.note}</p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-12">
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md xl:col-span-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Traffic performance</h3>
              <p className="text-sm text-slate-500">7-day visitor trend across connected campaigns.</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
              <ArrowUpRight className="h-3.5 w-3.5" />
              Live analytics
            </span>
          </div>
          <div className="h-80">
            <Line data={trafficChartData} options={lineOptions} />
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md xl:col-span-4">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900">AI provider mix</h3>
            <p className="text-sm text-slate-500">Routing distribution for model usage and cost control.</p>
          </div>

          <div className="relative h-64">
            <Doughnut data={aiUsageChartData} options={doughnutOptions} />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-xs uppercase tracking-wide text-slate-500">Total tasks</p>
              <p className="text-2xl font-semibold text-slate-900">{formatCompact(aiUsageTotal)}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-2 text-sm">
            {[
              { label: "OpenAI", value: aiUsage.openai, color: "bg-blue-600" },
              { label: "DeepSeek", value: aiUsage.deepseek, color: "bg-teal-600" },
              { label: "Gemini", value: aiUsage.gemini, color: "bg-violet-600" },
              { label: "Claude", value: aiUsage.claude, color: "bg-amber-500" },
            ].map((provider) => (
              <div key={provider.label} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <div className="inline-flex items-center gap-2 text-slate-700">
                  <span className={`h-2.5 w-2.5 rounded-full ${provider.color}`} />
                  {provider.label}
                </div>
                <span className="font-semibold text-slate-900">{formatCompact(provider.value)}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-12">
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md xl:col-span-4">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900">System health</h3>
            <p className="text-sm text-slate-500">Infra and worker status for tenant operations.</p>
          </div>

          <div className="space-y-3">
            <HealthRow
              icon={<Database className="h-4 w-4" />}
              label="Database"
              status={health?.system?.database === "connected" ? "Connected" : "Issue"}
              healthy={health?.system?.database === "connected"}
            />
            <HealthRow
              icon={<Cpu className="h-4 w-4" />}
              label="AI Worker"
              status={health?.workers?.aiProcessor || "stopped"}
              healthy={(health?.workers?.aiProcessor || "").toLowerCase() === "running"}
            />
            <HealthRow
              icon={<Server className="h-4 w-4" />}
              label="IMAP Worker"
              status={health?.workers?.imapSync || "stopped"}
              healthy={(health?.workers?.imapSync || "").toLowerCase() === "running"}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Response</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{health?.system?.responseTime || "0ms"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Failed queue</p>
              <p className="mt-1 text-lg font-semibold text-rose-600">
                {formatCompact(health?.queue?.failedEmails ?? 0)}
              </p>
            </div>
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md xl:col-span-4">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Mail processing volume</h3>
            <p className="text-sm text-slate-500">Daily incoming email batches and process intensity.</p>
          </div>
          <div className="h-72">
            <Bar data={emailChartData} options={barOptions} />
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md xl:col-span-4">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Recent inbox activity</h3>
            <p className="text-sm text-slate-500">Most recent customer conversations and subjects.</p>
          </div>

          <div className="space-y-2.5">
            {(emails.length ? emails : sampleEmails()).slice(0, 6).map((email, index) => (
              <div
                key={email.id ?? `${email.subject ?? "email"}-${index}`}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
              >
                <p className="truncate text-sm font-semibold text-slate-900">
                  {email.from || email.sender || "Unknown sender"}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-600">
                  {email.subject || "(No subject)"}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">{timeAgo(email.createdAt)}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Business snapshot</h3>
            <p className="text-sm text-slate-500">Tenant level productivity indicators and response posture.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <SnapshotCard label="Total Emails" value={formatCompact(overview?.totalEmails ?? 0)} />
            <SnapshotCard label="AI Replies" value={formatCompact(overview?.aiReplies ?? 0)} />
            <SnapshotCard label="Awaiting Reply" value={formatCompact(overview?.awaitingReply ?? 0)} />
            <SnapshotCard label="Avg Response" value={overview?.avgResponseTime || "N/A"} />
            <SnapshotCard label="Mailboxes" value={formatCompact(overview?.connectedMailboxes ?? 0)} />
            <SnapshotCard label="Spam Blocked" value={formatCompact(overview?.spamBlocked ?? 0)} />
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Quick actions</h3>
            <p className="text-sm text-slate-500">Jump into high-impact modules from one place.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <QuickLinkCard
              href="/dashboard/whatsapp"
              icon={<MessageSquare className="h-4 w-4" />}
              title="WhatsApp Hub"
              subtitle="Manage messaging workflows"
            />
            <QuickLinkCard
              href="/dashboard/mail-inbox"
              icon={<Inbox className="h-4 w-4" />}
              title="Mail Inbox"
              subtitle="Review incoming conversations"
            />
            <QuickLinkCard
              href="/dashboard/leads"
              icon={<Rocket className="h-4 w-4" />}
              title="Leads Board"
              subtitle="Track pipeline movement"
            />
            <QuickLinkCard
              href="/dashboard/settings"
              icon={<Zap className="h-4 w-4" />}
              title="Workspace Settings"
              subtitle="Update tenant configuration"
            />
          </div>
        </article>
      </section>

      <section className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Channel Command</p>
        <h3 className="text-xl font-semibold text-slate-900">WhatsApp Live Desk</h3>
        <p className="text-sm text-slate-500">Monitor active customer conversations and send quick replies without leaving overview.</p>
      </section>

      <section className="grid gap-4 xl:grid-cols-[350px_minmax(0,1fr)]">
        <article className="overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-emerald-100 bg-emerald-50/50 px-4 py-4">
            <h3 className="text-lg font-semibold tracking-tight text-[#111b21]">Conversations</h3>
            <span className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-full bg-emerald-100 px-2 text-sm font-semibold text-emerald-700">
              {waFilteredConversations.length}
            </span>
          </div>

          <div className="border-b border-emerald-100 bg-emerald-50/50 px-4 py-3">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-700/60" />
              <input
                type="text"
                value={waQuery}
                onChange={(event) => setWaQuery(event.target.value)}
                placeholder="Search chats"
                aria-label="Search chats"
                className="w-full rounded-xl border border-emerald-200 bg-white py-2.5 pl-9 pr-3 text-sm text-[#3a4a42] outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </label>
          </div>

          <div className="min-h-[420px] max-h-[520px] space-y-2 overflow-y-auto bg-[#f9fbfa] px-3 py-3">
            {waLoadingConversations ? (
              <p className="rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm text-[#5c6b64]">
                Loading conversations...
              </p>
            ) : waFilteredConversations.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-emerald-200 bg-white px-4 py-3 text-sm text-[#5c6b64]">
                No conversations found.
              </p>
            ) : (
              waFilteredConversations.map((item) => {
                const selected = item.id === waSelectedConversationId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setWaSelectedConversationId(item.id)}
                    className={`w-full rounded-2xl border px-3 py-2.5 text-left transition ${
                      selected
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-emerald-100 bg-white hover:border-emerald-200 hover:bg-emerald-50/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-[#111b21]">
                        {item.contact.name || item.contact.phone}
                      </p>
                      <span className="shrink-0 text-[11px] text-[#667781]">
                        {formatChatTime(item.lastMessageAt)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-[#54656f]">{waConversationPreview(item)}</p>
                  </button>
                );
              })
            )}
          </div>
        </article>

        <article className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-emerald-700 bg-gradient-to-r from-emerald-700 to-emerald-600 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-white">WhatsApp Preview</p>
              <p className="text-xs text-emerald-100">Chat and reply directly from dashboard</p>
            </div>
            <Link
              href="/dashboard/whatsapp/inbox"
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-300/50 bg-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500/45"
            >
              Open full inbox
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {waError ? (
            <div className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
              {waError}
            </div>
          ) : null}

          {!waSelectedConversation ? (
            <div className="flex min-h-[495px] items-center justify-center px-5 text-center">
              <p className="text-base text-slate-500">Select a conversation to view messages.</p>
            </div>
          ) : (
            <div className="flex min-h-[495px] flex-col">
              <div className="border-b border-emerald-100 bg-emerald-50/40 px-4 py-3">
                <p className="truncate text-sm font-semibold text-[#111b21]">
                  {waSelectedConversation.contact.name || waSelectedConversation.contact.phone}
                </p>
                <p className="truncate text-xs text-[#667781]">{waSelectedConversation.contact.phone}</p>
              </div>

              <div
                className="h-[300px] flex-1 space-y-2 overflow-y-auto px-3 py-3"
                style={{
                  backgroundColor: "#efeae2",
                  backgroundImage:
                    "radial-gradient(rgba(17,27,33,0.04) 1px, transparent 1px), radial-gradient(rgba(17,27,33,0.02) 1px, transparent 1px)",
                  backgroundPosition: "0 0, 12px 12px",
                  backgroundSize: "24px 24px, 36px 36px",
                }}
              >
                {waLoadingMessages ? (
                  <p className="text-sm text-[#54656f]">Loading messages...</p>
                ) : waMessages.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-[#bfd0c4] bg-white/90 px-3 py-2 text-sm text-[#54656f]">
                    No messages in this conversation.
                  </p>
                ) : (
                  waMessages.map((message) => {
                    const outbound = message.direction === "outbound";
                    return (
                      <div key={message.id} className={`flex ${outbound ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                            outbound
                              ? "bg-[#d9fdd3] text-[#111b21]"
                              : "border border-[#e4e7e9] bg-white text-[#111b21]"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{message.text || "-"}</p>
                          <p className="mt-1 text-[11px] text-[#667781]">{formatChatTime(message.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="border-t border-emerald-100 bg-emerald-50/40 px-3 py-3">
                <div className="mb-2 rounded-xl border border-emerald-100 bg-white px-3 py-2 text-xs text-[#54656f]">
                  <p>Contact: {waSelectedConversation.contact.name || "-"}</p>
                  <p>Phone: {waSelectedConversation.contact.phone}</p>
                  <p>Opt-in: {waSelectedConversation.contact.optedIn ? "Yes" : "No"}</p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    value={waText}
                    onChange={(event) => setWaText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void sendWaMessage();
                      }
                    }}
                    placeholder="Type WhatsApp reply..."
                    className="h-10 flex-1 rounded-xl border border-emerald-200 bg-white px-3 text-sm text-[#111b21] placeholder:text-[#8696a0] outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => void sendWaMessage()}
                    disabled={waSending || !waText.trim()}
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {waSending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </article>
      </section>

      <section className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Inbox Intelligence</p>
        <h3 className="text-xl font-semibold text-slate-900">Email Live Desk</h3>
        <p className="text-sm text-slate-500">Review threads, send replies, and monitor mailbox activity from one unified pane.</p>
      </section>

      <section className="grid gap-4 xl:grid-cols-[350px_minmax(0,1fr)]">
        <article className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-blue-100 bg-blue-50/60 px-4 py-4">
            <h3 className="text-lg font-semibold tracking-tight text-[#0f2d4a]">Email Conversations</h3>
            <span className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-full bg-blue-100 px-2 text-sm font-semibold text-blue-700">
              {mailFilteredContacts.length}
            </span>
          </div>

          <div className="border-b border-blue-100 bg-blue-50/60 px-4 py-3">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-700/60" />
              <input
                type="text"
                value={mailQuery}
                onChange={(event) => setMailQuery(event.target.value)}
                placeholder="Search emails"
                aria-label="Search emails"
                className="w-full rounded-xl border border-blue-200 bg-white py-2.5 pl-9 pr-3 text-sm text-[#35516d] outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
              />
            </label>
          </div>

          <div className="min-h-[420px] max-h-[520px] space-y-2 overflow-y-auto bg-[#f8fbff] px-3 py-3">
            {mailLoadingContacts ? (
              <p className="rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm text-[#5b7088]">
                Loading email conversations...
              </p>
            ) : mailFilteredContacts.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-blue-200 bg-white px-4 py-3 text-sm text-[#5b7088]">
                No email conversations found.
              </p>
            ) : (
              mailFilteredContacts.map((contact) => {
                const selected = contact.email === mailSelectedEmail;
                return (
                  <button
                    key={contact.email}
                    type="button"
                    onClick={() => setMailSelectedEmail(contact.email)}
                    className={`w-full rounded-2xl border px-3 py-2.5 text-left transition ${
                      selected
                        ? "border-blue-200 bg-blue-50"
                        : "border-blue-100 bg-white hover:border-blue-200 hover:bg-blue-50/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-[#0f2d4a]">{contact.email}</p>
                      <span className="shrink-0 text-[11px] text-[#6b7f99]">
                        {formatChatTime(contact.lastAt)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-[#5b7088]">
                      {contact.lastMessage || "No subject"}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </article>

        <article className="relative overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-blue-900 bg-gradient-to-r from-blue-900 to-blue-800 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-white">Email Preview</p>
              <p className="text-xs text-blue-100">Read and reply from dashboard</p>
            </div>
            <Link
              href="/dashboard/mail-inbox"
              className="inline-flex items-center gap-1 rounded-lg border border-blue-300/30 bg-blue-700/35 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700/55"
            >
              Open full inbox
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {mailError ? (
            <div className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
              {mailError}
            </div>
          ) : null}

          {!mailSelectedEmail ? (
            <div className="flex min-h-[495px] items-center justify-center px-5 text-center">
              <p className="text-base text-[#5b7088]">Select an email thread to preview messages.</p>
            </div>
          ) : (
            <div className="flex min-h-[495px] flex-col">
              <div className="border-b border-blue-100 bg-blue-50/60 px-4 py-3">
                <p className="truncate text-sm font-semibold text-[#0f2d4a]">{mailSelectedEmail}</p>
                <p className="truncate text-xs text-[#5b7088]">
                  Thread messages: {mailMessages.length}
                </p>
              </div>

              <div
                className="h-[300px] flex-1 space-y-2 overflow-y-auto px-3 py-3"
                style={{
                  backgroundColor: "#f4f7fb",
                  backgroundImage:
                    "linear-gradient(to bottom, rgba(13,59,102,0.035) 1px, transparent 1px)",
                  backgroundSize: "100% 28px",
                }}
              >
                {mailLoadingMessages ? (
                  <p className="text-sm text-[#5b7088]">Loading messages...</p>
                ) : mailMessages.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-[#bfd0e6] bg-white px-3 py-2 text-sm text-[#5b7088]">
                    No messages in this thread.
                  </p>
                ) : (
                  mailMessages.map((message) => {
                    const outbound = message.direction === "out";
                    return (
                      <div key={message.id} className={`flex ${outbound ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                            outbound
                              ? "bg-[#0d3b66] text-white"
                              : "border border-[#d6dfec] bg-white text-[#0f2d4a]"
                          }`}
                        >
                          {message.subject ? (
                            <p
                              className={`mb-1 truncate text-xs font-semibold ${
                                outbound ? "text-blue-100" : "text-[#4b6886]"
                              }`}
                            >
                              {message.subject}
                            </p>
                          ) : null}
                          <p className="whitespace-pre-wrap break-words">{message.body || "-"}</p>
                          <p
                            className={`mt-1 text-[11px] ${
                              outbound ? "text-blue-100" : "text-[#6b7f99]"
                            }`}
                          >
                            {formatChatTime(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="border-t border-blue-100 bg-blue-50/60 px-3 py-3">
                <input
                  value={mailSubject}
                  onChange={(event) => setMailSubject(event.target.value)}
                  placeholder="Subject (optional)"
                  className="mb-2 h-9 w-full rounded-xl border border-blue-200 bg-white px-3 text-xs text-[#35516d] placeholder:text-[#7f93ad] outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                />
                <div className="flex items-center gap-2">
                  <input
                    value={mailBody}
                    onChange={(event) => setMailBody(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void sendMailReply();
                      }
                    }}
                    placeholder="Type email reply..."
                    className="h-10 flex-1 rounded-xl border border-blue-200 bg-white px-3 text-sm text-[#0f2d4a] placeholder:text-[#7f93ad] outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                  />
                  <button
                    type="button"
                    onClick={() => void sendMailReply()}
                    disabled={mailSending || !mailSelectedEmail || !mailBody.trim()}
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-900 px-4 text-sm font-semibold text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {mailSending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-gradient-to-r from-white to-slate-50 p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
            {health?.queue?.failedEmails ? (
              <CircleAlert className="h-4 w-4 text-rose-500" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            )}
            {health?.queue?.failedEmails
              ? `${health.queue.failedEmails} queue items need attention.`
              : "All systems are stable and queue health is normal."}
          </div>
          <div className="text-xs text-slate-500">
            Auto-refresh every 35 seconds
          </div>
        </div>
      </section>
    </div>
  );
}

function formatChatTime(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const isSameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  return isSameDay
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function waConversationPreview(conversation: WaConversation) {
  const text = conversation.messages[0]?.text || "No messages yet";
  return text.length > 60 ? `${text.slice(0, 60)}...` : text;
}

function HealthRow({
  icon,
  label,
  status,
  healthy,
}: {
  icon: React.ReactNode;
  label: string;
  status: string;
  healthy: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white px-3 py-2.5">
      <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
        <span className="text-slate-500">{icon}</span>
        {label}
      </div>
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
          healthy
            ? "bg-emerald-100 text-emerald-700"
            : "bg-rose-100 text-rose-700"
        }`}
      >
        {status}
      </span>
    </div>
  );
}

function SnapshotCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white px-3 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function QuickLinkCard({
  href,
  icon,
  title,
  subtitle,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white px-3 py-3 transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50"
    >
      <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm transition group-hover:text-blue-700">
        {icon}
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
    </Link>
  );
}

async function readJsonSafeResponse(res: Response) {
  const text = await res.text();
  if (!text) return {} as Record<string, unknown>;
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {} as Record<string, unknown>;
  }
}

function asText(value: unknown) {
  return String(value ?? "").trim();
}

async function fetchJSON<T>(url: string) {
  try {
    const res = await fetch(url, { credentials: "include", cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function fetchPOST(url: string, body?: unknown) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.ok;
  } catch {
    return false;
  }
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatMoney(value: number | string) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "0.00";
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
}

function getTrendFromSeries(series: number[]) {
  if (series.length < 2) {
    return { positive: true, label: "Insufficient comparison data" };
  }

  const current = series[series.length - 1];
  const previous = series[series.length - 2];
  if (previous === 0) {
    return { positive: true, label: "New activity baseline" };
  }

  const delta = ((current - previous) / previous) * 100;
  const rounded = Math.abs(delta).toFixed(1);
  return {
    positive: delta >= 0,
    label: `${delta >= 0 ? "+" : "-"}${rounded}% vs previous day`,
  };
}

function timeAgo(input?: string) {
  if (!input) return "just now";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "just now";

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function sampleStats(): DashboardStats {
  return {
    visitorsToday: 124,
    emailsToday: 78,
    aiCostToday: "12.34",
    leadsToday: 6,
    traffic: [
      { day: "Mon", visits: 80 },
      { day: "Tue", visits: 120 },
      { day: "Wed", visits: 90 },
      { day: "Thu", visits: 110 },
      { day: "Fri", visits: 150 },
      { day: "Sat", visits: 130 },
      { day: "Sun", visits: 140 },
    ],
    emails: [
      { day: "Mon", count: 10 },
      { day: "Tue", count: 7 },
      { day: "Wed", count: 12 },
      { day: "Thu", count: 20 },
      { day: "Fri", count: 8 },
      { day: "Sat", count: 9 },
      { day: "Sun", count: 12 },
    ],
    aiUsage: { openai: 40, deepseek: 25, gemini: 18, claude: 10 },
  };
}

function sampleHealth(): SystemHealth {
  return {
    workers: { aiProcessor: "running", imapSync: "running" },
    queue: { pendingEmails: 2, failedEmails: 0 },
    system: { database: "connected", responseTime: "120ms" },
    traffic: { visitorsToday: 124 },
  };
}

function sampleOverview(): OverviewStats {
  return {
    totalEmails: 4821,
    aiReplies: 1240,
    awaitingReply: 96,
    avgResponseTime: "1.8 min",
    connectedMailboxes: 4,
    spamBlocked: 231,
  };
}

function sampleEmails(): EmailItem[] {
  return [
    {
      from: "alice@example.com",
      subject: "Help with product configuration",
      createdAt: new Date(Date.now() - 300000).toISOString(),
    },
    {
      from: "bob@example.com",
      subject: "Billing question about subscription",
      createdAt: new Date(Date.now() - 600000).toISOString(),
    },
    {
      from: "carol@example.com",
      subject: "Partnership inquiry",
      createdAt: new Date(Date.now() - 1200000).toISOString(),
    },
    {
      from: "dave@example.com",
      subject: "Technical support needed",
      createdAt: new Date(Date.now() - 1800000).toISOString(),
    },
    {
      from: "eve@example.com",
      subject: "Feature request",
      createdAt: new Date(Date.now() - 2400000).toISOString(),
    },
  ];
}
