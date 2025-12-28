"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

/* ---------------------------
   Small icons
   --------------------------- */
function IconRefresh(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M20 12a8 8 0 10-2.3 5.4L20 20v-3.6A7.98 7.98 0 0020 12z" />
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M4 4v6h6" />
    </svg>
  );
}
function IconUser(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 00-3-3.87" />
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M4 21v-2a4 4 0 013-3.87" />
      <circle cx="12" cy="7" r="4" strokeWidth="1.5" />
    </svg>
  );
}
function IconLogout(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M16 17l5-5-5-5" />
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M21 12H9" />
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M13 19H6a2 2 0 01-2-2V7a2 2 0 012-2h7" />
    </svg>
  );
}

/* ---------------------------
   Helper components
   --------------------------- */
function Card({ title, children, className = "" }: any) {
  return (
    <div className={`bg-white dark:bg-zinc-900 p-5 rounded-xl shadow ${className}`}>
      {title && <div className="text-sm text-gray-500 mb-2">{title}</div>}
      {children}
    </div>
  );
}

function KPI({ label, value, hint, className = "" }: any) {
  return (
    <div className={`bg-white dark:bg-zinc-900 p-4 rounded-lg shadow ${className}`}>
      <div className="text-xs text-gray-400">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {hint && <div className="text-sm text-gray-500 mt-1">{hint}</div>}
    </div>
  );
}

/* ---------------------------
   Dashboard component
   --------------------------- */

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [emails, setEmails] = useState<any[]>([]);
  const [aiLogs, setAiLogs] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [pollIntervalMs] = useState(15000);

  // PROFILE / AUTH
  const [user, setUser] = useState<any>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "",
    password: "",
    profileImage: "",
    profileImageFileName: "",
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadAll() {
      setLoading(true);
      const [s, h, e, a, t, me] = await Promise.allSettled([
        fetchJSON("/api/dashboard/stats"),
        fetchJSON("/api/system/health"),
        fetchJSON("/api/dashboard/recent-emails"),
        fetchJSON("/api/ai/logs"),
        fetchJSON("/api/tenants/summary"),
        fetchJSON("/api/auth/me"),
      ]);

      if (!mounted) return;
      setStats(s.status === "fulfilled" && s.value?.success ? s.value.data : sampleStats());
      setHealth(h.status === "fulfilled" && h.value?.success ? h.value.data : sampleHealth());
      setEmails(e.status === "fulfilled" && e.value?.success ? e.value.data : sampleEmails());
      setAiLogs(a.status === "fulfilled" && a.value?.success ? a.value.data : sampleAiLogs());
      setTenants(t.status === "fulfilled" && t.value?.success ? t.value.data : sampleTenants());

      if (me.status === "fulfilled" && me.value?.success) {
        setUser(me.value.user);
        setProfileForm({
          name: me.value.user?.name || "",
          password: "",
          profileImage: me.value.user?.profileImage || "",
          profileImageFileName: "",
        });
      } else {
        // keep user null — fallback UI will still work
      }

      setLastUpdated(new Date());
      setLoading(false);
    }

    loadAll();
    const iv = setInterval(loadAll, pollIntervalMs);
    return () => {
      mounted = false;
      clearInterval(iv);
    };
  }, [pollIntervalMs]);

  // Charts derived
  const trafficChart = useMemo(() => {
    const labels = stats?.traffic?.map((t: any) => t.day) ?? [];
    const data = stats?.traffic?.map((t: any) => t.visits) ?? [];
    return {
      labels,
      datasets: [
        {
          label: "Visits",
          data,
          fill: false,
          tension: 0.3,
          borderWidth: 2,
          borderColor: "#3b82f6",
          pointRadius: 3,
        },
      ],
    };
  }, [stats]);

  const emailBar = useMemo(() => {
    const labels = stats?.emails?.map((e: any) => e.day) ?? [];
    const data = stats?.emails?.map((e: any) => e.count) ?? [];
    return {
      labels,
      datasets: [
        {
          label: "Emails",
          data,
          backgroundColor: "rgba(59,130,246,0.85)",
        },
      ],
    };
  }, [stats]);

  const aiUsageDonut = useMemo(() => {
    const usage = stats?.aiUsage ?? { openai: 0, deepseek: 0, gemini: 0, claude: 0 };
    const labels = Object.keys(usage);
    const data = Object.values(usage);
    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6"],
        },
      ],
    };
  }, [stats]);

  // quick metrics
  const visitorsToday = stats?.visitorsToday ?? 0;
  const emailsToday = stats?.emailsToday ?? 0;
  const aiCostToday = stats?.aiCostToday ?? "0.00";
  const leadsToday = stats?.leadsToday ?? 0;

  // actions
  async function retryQueue() {
    setBusyAction("retry");
    await fetchPOST("/api/system/retry-queue");
    setBusyAction(null);
    await refreshOnce();
  }
  async function clearFailed() {
    setBusyAction("clear");
    await fetchPOST("/api/system/clear-failed");
    setBusyAction(null);
    await refreshOnce();
  }
  async function refreshOnce() {
    const s = await fetchJSON("/api/dashboard/stats");
    const h = await fetchJSON("/api/system/health");
    const e = await fetchJSON("/api/dashboard/recent-emails");
    setStats(s?.success ? s.data : sampleStats());
    setHealth(h?.success ? h.data : sampleHealth());
    setEmails(e?.success ? e.data : sampleEmails());
    setLastUpdated(new Date());
  }

  // profile actions
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    // redirect to login
    window.location.href = "/login";
  }

  // handle file upload -> base64
  function handleFileChange(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setProfileForm((p) => ({ ...p, profileImage: base64, profileImageFileName: file.name }));
    };
    reader.readAsDataURL(file);
  }

  async function saveProfile() {
    setProfileBusy(true);
    try {
      // Send to /api/auth/profile
      const res = await fetch("/api/auth/profile", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileForm.name,
          password: profileForm.password || undefined,
          profileImage: profileForm.profileImage || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        // refresh user
        const me = await fetchJSON("/api/auth/me");
        if (me?.success) {
          setUser(me.user);
        }
        alert("Profile saved");
        setProfileOpen(false);
      } else {
        alert(json.error || "Failed to save");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving profile");
    }
    setProfileBusy(false);
  }

  // theme toggle
  function toggleDark() {
    setIsDark((v) => !v);
    if (typeof window !== "undefined") {
      document.documentElement.classList.toggle("dark", !isDark);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 text-gray-800 dark:text-gray-100">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Header */}
        <header className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Dashboard Overview</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Realtime system health, AI usage, email automation and operations.
            </p>
          </div>

          <div className="flex items-center gap-3 relative">
            <div className="text-sm text-gray-500 hidden md:block">Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : "—"}</div>

            <button
              onClick={refreshOnce}
              className="flex items-center gap-2 bg-white dark:bg-zinc-800 px-3 py-2 rounded-lg shadow hover:shadow-md"
              title="Refresh now"
            >
              <IconRefresh className="w-4 h-4" />
              <span className="text-sm hidden md:inline">Refresh</span>
            </button>

            <button
              onClick={toggleDark}
              className="bg-white dark:bg-zinc-800 px-3 py-2 rounded-lg shadow hover:shadow-md"
              title="Toggle theme"
            >
              {isDark ? "Light" : "Dark"}
            </button>

            {/* Avatar Dropdown (Option A) */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen((s) => !s)}
                className="flex items-center gap-2 ml-2 p-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-800"
                aria-label="Open profile menu"
              >
                <img
                  src={user?.profileImage || "/api/avatar-default.png" }
                  alt="avatar"
                  className="w-10 h-10 rounded-full object-cover border"
                />
                <div className="hidden md:block text-left">
                  <div className="text-sm font-medium">{user?.name || "User"}</div>
                  <div className="text-xs text-gray-400">{user?.email || ""}</div>
                </div>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-900 rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                  <div className="p-3 border-b dark:border-zinc-800">
                    <div className="text-sm font-semibold">{user?.name || "User"}</div>
                    <div className="text-xs text-gray-500 truncate">{user?.email || ""}</div>
                  </div>

                  <div className="flex flex-col py-2">
                    <button
                      onClick={() => { setProfileOpen(true); setDropdownOpen(false); }}
                      className="text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-zinc-800"
                    >
                      Profile
                    </button>

                    <button
                      onClick={() => { window.location.href = "/dashboard/ai-settings"; }}
                      className="text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-zinc-800"
                    >
                      AI Settings
                    </button>

                    <button
                      onClick={logout}
                      className="text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-zinc-800 text-red-600"
                    >
                      <div className="flex items-center gap-2">
                        <IconLogout className="w-4 h-4" /> Logout
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </header>

        {/* TOP KPIs */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KPI label="Visitors Today" value={visitorsToday} hint="Unique sessions" />
          <KPI label="Emails Processed" value={emailsToday} hint="Incoming + AI replies" />
          <KPI label="AI Cost Today" value={`₹${aiCostToday}`} hint="Estimated token cost" />
          <KPI label="Leads Today" value={leadsToday} hint="Captured leads" />
        </section>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: charts stacked */}
          <div className="lg:col-span-2 space-y-6">
            {/* Traffic */}
            <Card title="Traffic (last 7 days)">
              <div className="md:flex md:items-center md:justify-between">
                <div className="md:w-3/4">
                  <Line data={trafficChart} options={{ responsive: true, plugins: { legend: { display: false } } }} />
                </div>

                <div className="md:w-1/4 mt-4 md:mt-0 flex flex-col gap-2">
                  <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded">
                    <div className="text-xs text-gray-400">Avg. visits</div>
                    <div className="text-lg font-semibold">{Math.round((stats?.traffic?.reduce((a: any, b: any) => a + b.visits, 0) || 0) / (stats?.traffic?.length || 1))}</div>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded">
                    <div className="text-xs text-gray-400">Peak day</div>
                    <div className="text-lg font-semibold">{stats?.traffic?.reduce((a: any, b: any) => a.visits > b.visits ? a : b, { day: "—", visits: 0 }).day}</div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Email volume & AI usage */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card title="Emails processed (7 days)">
                <Bar data={emailBar} options={{ responsive: true, plugins: { legend: { display: false } } }} />
              </Card>

              <Card title="AI Provider usage">
                <div className="flex gap-4 items-center">
                  <div className="w-36">
                    <Doughnut data={aiUsageDonut} options={{ plugins: { legend: { position: "right" } } }} />
                  </div>
                  <div className="flex-1">
                    {Object.entries(stats?.aiUsage ?? {}).map(([k, v]: any) => (
                      <div key={k} className="flex items-center justify-between py-1">
                        <div className="capitalize">{k}</div>
                        <div className="font-semibold">{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>

            {/* Response time & errors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card title="Response Time (avg)">
                <div className="text-3xl font-semibold">{stats?.avgResponseTime ?? "120"} ms</div>
                <div className="text-sm text-gray-500 mt-2">95th percentile: {stats?.p95 ?? "320"} ms</div>
              </Card>

              <Card title="Error Rate">
                <div className="text-2xl font-semibold text-red-600">{(stats?.errorRate ?? 0) + "%"}</div>
                <div className="text-sm text-gray-500 mt-2">Last 24h errors</div>
              </Card>
            </div>

            {/* AI Insights */}
            <Card title="AI Insights & Suggestions">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <ul className="list-disc ml-5 space-y-2">
                  <li>Reduce GPT-4o calls for short replies — use cheaper model for quick confirmations.</li>
                  <li>Set auto-reply thresholds: auto-reply only if sentiment === neutral/positive.</li>
                  <li>Enable per-tenant daily token limits to avoid unexpected bills.</li>
                </ul>
              </div>
            </Card>
          </div>

          {/* Right column: system health, workers, emails preview */}
          <aside className="space-y-6">
            {/* System Health */}
            <Card title="System Health">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500">Database</div>
                    <div className="font-semibold">{health?.system?.database ?? "connected"}</div>
                  </div>
                  <div className={`px-2 py-1 rounded ${health?.system?.database === "connected" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {health?.system?.database === "connected" ? "OK" : "ERROR"}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500">Queue - Pending</div>
                    <div className="font-semibold">{health?.queue?.pendingEmails ?? 0}</div>
                  </div>
                  <div className="text-sm text-gray-500">Failed: <span className="text-red-600 font-medium">{health?.queue?.failedEmails ?? 0}</span></div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500">AI Worker</div>
                    <div className="font-semibold">{health?.workers?.aiProcessor ?? "stopped"}</div>
                  </div>
                  <div className={`px-2 py-1 rounded ${health?.workers?.aiProcessor === "running" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {health?.workers?.aiProcessor ?? "stopped"}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500">IMAP Worker</div>
                    <div className="font-semibold">{health?.workers?.imapSync ?? "stopped"}</div>
                  </div>
                  <div className={`px-2 py-1 rounded ${health?.workers?.imapSync === "running" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {health?.workers?.imapSync ?? "stopped"}
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <button onClick={retryQueue} disabled={!!busyAction} className="flex-1 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700">
                    {busyAction === "retry" ? "Retrying..." : "Retry Queue"}
                  </button>
                  <button onClick={clearFailed} disabled={!!busyAction} className="bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700">
                    {busyAction === "clear" ? "Clearing..." : "Clear Failed"}
                  </button>
                </div>
              </div>
            </Card>

            {/* AI Logs quick view */}
            <Card title="AI Logs (recent)">
              <div className="space-y-2 max-h-64 overflow-auto">
                {aiLogs.slice(0, 6).map((l: any, idx: number) => (
                  <div key={idx} className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">{l.provider} — {l.success ? <span className="text-green-600">OK</span> : <span className="text-red-600">ERR</span>}</div>
                      <div className="text-xs text-gray-500">{l.error ? l.error : (l.reply ? (l.reply.slice(0,60) + (l.reply.length>60?"...":"")) : "—")}</div>
                    </div>
                    <div className="text-xs text-gray-400">{timeAgo(l.createdAt)}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Recent Emails small table */}
            <Card title="Recent incoming emails">
              <div className="max-h-64 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="text-gray-500">
                    <tr>
                      <th className="text-left py-2">From</th>
                      <th className="text-left py-2">Subject</th>
                      <th className="text-right py-2">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emails.slice(0, 6).map((m: any, i:number) => (
                      <tr key={i} className="border-t dark:border-zinc-800">
                        <td className="py-2">{truncate(m.from || m.sender || "Unknown", 20)}</td>
                        <td className="py-2">{truncate(m.subject || "(no subject)", 35)}</td>
                        <td className="py-2 text-right text-xs text-gray-400">{timeAgo(m.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </aside>
        </div>

        {/* Lower area */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card title="Tenants summary">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {tenants.map((t: any, i:number) => (
                  <div key={i} className="p-3 bg-gray-50 dark:bg-zinc-800 rounded">
                    <div className="text-sm text-gray-500">{t.name}</div>
                    <div className="text-lg font-semibold">{t.activeAccounts} mail accounts</div>
                    <div className="text-xs text-gray-400 mt-1">Plan: {t.plan || "Starter"}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Activity timeline">
              <div className="space-y-3">
                {sampleTimeline().map((ev, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-2"></div>
                    <div className="flex-1">
                      <div className="text-sm">{ev.text}</div>
                      <div className="text-xs text-gray-400">{ev.time}</div>
                    </div>
                    <div className="text-xs text-gray-400">{ev.by}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card title="Operations">
              <div className="flex flex-col gap-3">
                <button onClick={retryQueue} className="w-full bg-blue-600 text-white py-2 rounded">Retry Queue</button>
                <button onClick={clearFailed} className="w-full bg-red-600 text-white py-2 rounded">Clear Failed Jobs</button>
                <button onClick={() => alert("Run diagnostics (placeholder)")} className="w-full bg-gray-100 text-gray-800 dark:bg-zinc-800 py-2 rounded">Run Diagnostics</button>
              </div>
            </Card>

            <Card title="AI Cost Estimator">
              <div className="text-sm text-gray-500">Estimate cost for selected period</div>
              <div className="mt-3">
                <div className="text-2xl font-semibold">₹{estimateCost(stats)}</div>
                <div className="text-xs text-gray-400">Estimated based on email count & sample rates</div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      {profileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold mb-3">Profile</h2>

            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center gap-3">
                <img src={profileForm.profileImage || "/api/avatar-default.png"} className="w-16 h-16 rounded-full object-cover border" />
                <div>
                  <div className="text-sm font-medium">{user?.email}</div>
                  <div className="text-xs text-gray-500">Logged in</div>
                </div>
              </div>

              <label className="text-sm">Name</label>
              <input className="border p-2 rounded" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} />

              <label className="text-sm">New password (leave empty to keep)</label>
              <input className="border p-2 rounded" type="password" value={profileForm.password} onChange={(e) => setProfileForm({ ...profileForm, password: e.target.value })} />

              <label className="text-sm">Upload profile image (file)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  handleFileChangeLocal(f);
                }}
              />

              <div className="text-sm text-gray-500">or paste image URL</div>
              <input className="border p-2 rounded" value={profileForm.profileImage} onChange={(e) => setProfileForm({ ...profileForm, profileImage: e.target.value })} />

              <div className="flex justify-end gap-2 mt-3">
                <button onClick={() => setProfileOpen(false)} className="px-4 py-2 rounded border">Cancel</button>
                <button onClick={saveProfileLocal} className="px-4 py-2 rounded bg-blue-600 text-white">
                  {profileBusy ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );

  /* ---------------------------
     Local helpers inside component
     --------------------------- */

  function handleFileChangeLocal(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setProfileForm((p) => ({ ...p, profileImage: base64, profileImageFileName: file.name }));
    };
    reader.readAsDataURL(file);
  }

  async function saveProfileLocal() {
    setProfileBusy(true);
    try {
      const body: any = { name: profileForm.name };
      if (profileForm.password) body.password = profileForm.password;
      if (profileForm.profileImage) body.profileImage = profileForm.profileImage;

      const res = await fetch("/api/auth/profile", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        // refresh me
        const me = await fetchJSON("/api/auth/me");
        if (me?.success) {
          setUser(me.user);
        }
        alert("Profile updated");
        setProfileOpen(false);
      } else {
        alert(json.error || "Failed to save profile");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving profile");
    }
    setProfileBusy(false);
  }
}

/* ---------------------------
   Utilities & Helpers (global)
   --------------------------- */

async function fetchJSON(url: string) {
  try {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

async function fetchPOST(url: string, body?: any) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

function timeAgo(input: string | number | Date) {
  const d = new Date(input);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}
function truncate(s: string, n = 40) {
  return s?.length > n ? s.slice(0, n - 1) + "…" : s;
}
function sampleStats() {
  return {
    visitorsToday: 124,
    emailsToday: 78,
    aiCostToday: "12.34",
    leadsToday: 6,
    traffic: [
      { day: "11-09", visits: 80 },
      { day: "11-10", visits: 120 },
      { day: "11-11", visits: 90 },
      { day: "11-12", visits: 110 },
      { day: "11-13", visits: 150 },
      { day: "11-14", visits: 130 },
      { day: "11-15", visits: 140 },
    ],
    emails: [
      { day: "11-09", count: 10 },
      { day: "11-10", count: 7 },
      { day: "11-11", count: 12 },
      { day: "11-12", count: 20 },
      { day: "11-13", count: 8 },
      { day: "11-14", count: 9 },
      { day: "11-15", count: 12 },
    ],
    aiUsage: { openai: 40, deepseek: 25, gemini: 18, claude: 10 },
    avgResponseTime: 140,
    p95: 320,
    errorRate: 2,
  };
}
function sampleHealth() {
  return {
    workers: { aiProcessor: "running", imapSync: "running" },
    queue: { pendingEmails: 2, failedEmails: 0 },
    system: { database: "connected", responseTime: "120ms" },
    traffic: { visitorsToday: 124 },
  };
}
function sampleEmails() {
  return [
    { from: "alice@example.com", subject: "Help with product", createdAt: new Date().toISOString() },
    { from: "bob@example.com", subject: "Billing question", createdAt: new Date().toISOString() },
    { from: "carol@example.com", subject: "Can't login", createdAt: new Date().toISOString() },
  ];
}
function sampleAiLogs() {
  return [
    { provider: "openai", success: true, reply: "Sure, here's how...", createdAt: new Date().toISOString() },
    { provider: "deepseek", success: false, error: "timeout", createdAt: new Date().toISOString() },
  ];
}
function sampleTenants() {
  return [
    { name: "Tenant A", activeAccounts: 3, plan: "Business" },
    { name: "Tenant B", activeAccounts: 1, plan: "Starter" },
  ];
}
function sampleTimeline() {
  return [
    { text: "New tenant signup: Tenant A", time: "2h ago", by: "system" },
    { text: "IMAP worker restarted", time: "3h ago", by: "ops" },
    { text: "AI fallback triggered for email #123", time: "5h ago", by: "ai-engine" },
  ];
}
function estimateCost(stats: any) {
  try {
    const emails = stats?.emailsToday ?? 0;
    const perEmail = 0.02; // sample rupee cost/token mapping
    return (emails * perEmail).toFixed(2);
  } catch {
    return "0.00";
  }
}
