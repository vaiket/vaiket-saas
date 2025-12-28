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

// Icons
const Icons = {
  Refresh: (props: any) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M16 11a6 6 0 10-5.4-3.4M16 11v6m0 0l-3-3m3 3l3-3" />
    </svg>
  ),
  User: (props: any) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Logout: (props: any) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
  Sun: (props: any) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  Moon: (props: any) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  ),
  Mail: (props: any) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  Users: (props: any) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
    </svg>
  ),
  Activity: (props: any) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  Zap: (props: any) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  Settings: (props: any) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  CheckCircle: (props: any) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  AlertTriangle: (props: any) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  ),
  Database: (props: any) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
    </svg>
  )
};

// Components
function Card({ title, children, className = "", action }: any) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        {title && <h3 className="text-lg font-semibold text-gray-800">{title}</h3>}
        {action && <div className="text-sm text-gray-500">{action}</div>}
      </div>
      {children}
    </div>
  );
}

function MetricCard({ title, value, change, icon, className = "" }: any) {
  return (
    <div className={`bg-gradient-to-br from-white to-blue-50 rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change && (
            <p className={`text-sm mt-1 ${change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
              {change}
            </p>
          )}
        </div>
        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
          {icon}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status, children }: any) {
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'running':
      case 'connected':
      case 'ok':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'stopped':
      case 'error':
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
      {children}
    </span>
  );
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [emails, setEmails] = useState<any[]>([]);
  const [aiLogs, setAiLogs] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  
  // User state
  const [user, setUser] = useState<any>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    async function loadAll() {
      setLoading(true);
      try {
        const [statsRes, healthRes, emailsRes, aiLogsRes, tenantsRes, userRes] = await Promise.all([
          fetchJSON("/api/dashboard/stats"),
          fetchJSON("/api/system/health"),
          fetchJSON("/api/dashboard/recent-emails"),
          fetchJSON("/api/ai/logs"),
          fetchJSON("/api/tenants/summary"),
          fetchJSON("/api/auth/me")
        ]);

        if (!mounted) return;

        setStats(statsRes?.success ? statsRes.data : sampleStats());
        setHealth(healthRes?.success ? healthRes.data : sampleHealth());
        setEmails(emailsRes?.success ? emailsRes.data : sampleEmails());
        setAiLogs(aiLogsRes?.success ? aiLogsRes.data : sampleAiLogs());
        setTenants(tenantsRes?.success ? tenantsRes.data : sampleTenants());
        
        if (userRes?.success) {
          setUser(userRes.user);
        }

        setLastUpdated(new Date());
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadAll();
    const interval = setInterval(loadAll, 30000); // Refresh every 30 seconds
    
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Charts data
  const trafficChart = useMemo(() => ({
    labels: stats?.traffic?.map((t: any) => t.day) ?? [],
    datasets: [{
      label: "Visits",
      data: stats?.traffic?.map((t: any) => t.visits) ?? [],
      fill: true,
      tension: 0.4,
      borderWidth: 3,
      borderColor: "#0D3B66",
      backgroundColor: "rgba(13, 59, 102, 0.1)",
      pointBackgroundColor: "#0D3B66",
      pointBorderColor: "#ffffff",
      pointBorderWidth: 2,
      pointRadius: 4,
    }]
  }), [stats]);

  const emailBar = useMemo(() => ({
    labels: stats?.emails?.map((e: any) => e.day) ?? [],
    datasets: [{
      label: "Emails Processed",
      data: stats?.emails?.map((e: any) => e.count) ?? [],
      backgroundColor: "rgba(13, 59, 102, 0.8)",
      borderRadius: 6,
      borderSkipped: false,
    }]
  }), [stats]);

  const aiUsageDonut = useMemo(() => {
    const usage = stats?.aiUsage ?? { openai: 0, deepseek: 0, gemini: 0, claude: 0 };
    return {
      labels: Object.keys(usage).map(key => key.charAt(0).toUpperCase() + key.slice(1)),
      datasets: [{
        data: Object.values(usage),
        backgroundColor: [
          '#0D3B66',
          '#3B82F6', 
          '#10B981',
          '#8B5CF6'
        ],
        borderWidth: 2,
        borderColor: '#ffffff',
      }]
    };
  }, [stats]);

  // Quick actions
  async function retryQueue() {
    setBusyAction("retry");
    await fetchPOST("/api/system/retry-queue");
    setBusyAction(null);
    await refreshOnce();
  }

  async function refreshOnce() {
    const [statsRes, healthRes] = await Promise.all([
      fetchJSON("/api/dashboard/stats"),
      fetchJSON("/api/system/health")
    ]);
    setStats(statsRes?.success ? statsRes.data : sampleStats());
    setHealth(healthRes?.success ? healthRes.data : sampleHealth());
    setLastUpdated(new Date());
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  function toggleDark() {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark', !isDark);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#0D3B66] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your AI dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-[#0D3B66] rounded-lg flex items-center justify-center">
                <Icons.Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">VAIKET AI</h1>
                <p className="text-sm text-gray-500 hidden sm:block">
                  Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={refreshOnce}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                title="Refresh"
              >
                <Icons.Refresh className="w-5 h-5" />
              </button>

              <button
                onClick={toggleDark}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                title="Toggle theme"
              >
                {isDark ? <Icons.Sun className="w-5 h-5" /> : <Icons.Moon className="w-5 h-5" />}
              </button>

              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <img
                    src={user?.profileImage || "/api/avatar-default.png"}
                    alt="Profile"
                    className="w-8 h-8 rounded-full border-2 border-gray-300"
                  />
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-medium text-gray-900">{user?.name || 'User'}</div>
                    <div className="text-xs text-gray-500">{user?.email || ''}</div>
                  </div>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <div className="text-sm font-medium text-gray-900">{user?.name || 'User'}</div>
                      <div className="text-xs text-gray-500 truncate">{user?.email || ''}</div>
                    </div>
                    <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      Profile Settings
                    </button>
                    <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      AI Settings
                    </button>
                    <button
                      onClick={logout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center space-x-2"
                    >
                      <Icons.Logout className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.name?.split(' ')[0] || 'User'}! 👋
          </h1>
          <p className="text-gray-600">
            Here's what's happening with your AI email automation today.
          </p>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Visitors Today"
            value={stats?.visitorsToday ?? 0}
            change="+12%"
            icon={<Icons.Users className="w-6 h-6 text-[#0D3B66]" />}
          />
          <MetricCard
            title="Emails Processed"
            value={stats?.emailsToday ?? 0}
            change="+8%"
            icon={<Icons.Mail className="w-6 h-6 text-[#0D3B66]" />}
          />
          <MetricCard
            title="AI Cost Today"
            value={`₹${stats?.aiCostToday ?? '0.00'}`}
            change="-3%"
            icon={<Icons.Zap className="w-6 h-6 text-[#0D3B66]" />}
          />
          <MetricCard
            title="Leads Captured"
            value={stats?.leadsToday ?? 0}
            change="+15%"
            icon={<Icons.Activity className="w-6 h-6 text-[#0D3B66]" />}
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Traffic Chart */}
          <div className="lg:col-span-2">
            <Card title="Website Traffic Overview">
              <div className="h-80">
                <Line 
                  data={trafficChart} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.1)' }
                      },
                      x: {
                        grid: { display: false }
                      }
                    }
                  }} 
                />
              </div>
            </Card>
          </div>

          {/* AI Usage */}
          <Card title="AI Provider Usage">
            <div className="h-80 flex items-center justify-center">
              <Doughnut 
                data={aiUsageDonut} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { usePointStyle: true }
                    }
                  }
                }} 
              />
            </div>
          </Card>
        </div>

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* System Health */}
          <Card title="System Health">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Icons.Database className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium">Database</span>
                </div>
                <StatusBadge status={health?.system?.database}>
                  {health?.system?.database === 'connected' ? 'Healthy' : 'Error'}
                </StatusBadge>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Icons.Zap className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium">AI Worker</span>
                </div>
                <StatusBadge status={health?.workers?.aiProcessor}>
                  {health?.workers?.aiProcessor || 'Stopped'}
                </StatusBadge>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Icons.Mail className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium">IMAP Worker</span>
                </div>
                <StatusBadge status={health?.workers?.imapSync}>
                  {health?.workers?.imapSync || 'Stopped'}
                </StatusBadge>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-[#0D3B66]">{health?.queue?.pendingEmails ?? 0}</div>
                  <div className="text-sm text-gray-600">Pending</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{health?.queue?.failedEmails ?? 0}</div>
                  <div className="text-sm text-gray-600">Failed</div>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={retryQueue}
                  disabled={busyAction === 'retry'}
                  className="flex-1 bg-[#0D3B66] text-white py-2 px-4 rounded-lg hover:bg-[#0A2E4D] transition-colors disabled:opacity-50"
                >
                  {busyAction === 'retry' ? 'Retrying...' : 'Retry Queue'}
                </button>
                <button className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors">
                  View Details
                </button>
              </div>
            </div>
          </Card>

          {/* Recent Emails */}
          <Card title="Recent Emails" action={<span className="text-blue-600 text-sm font-medium">View All</span>}>
            <div className="space-y-3">
              {emails.slice(0, 5).map((email, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Icons.Mail className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {email.from || email.sender || 'Unknown'}
                    </p>
                    <p className="text-sm text-gray-600 truncate">
                      {email.subject || '(No subject)'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {timeAgo(email.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* AI Insights */}
          <Card title="AI Insights & Suggestions">
            <div className="space-y-4">
              <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                <Icons.CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-900">Optimization Ready</p>
                  <p className="text-sm text-green-700 mt-1">
                    Switch short replies to DeepSeek to reduce costs by 40%
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                <Icons.Zap className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Performance Tip</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Enable auto-reply for neutral/positive sentiment emails
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                <Icons.AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-yellow-900">Monitor Required</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Set daily token limits to avoid unexpected billing
                  </p>
                </div>
              </div>

              <button className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                View Detailed Analytics
              </button>
            </div>
          </Card>
        </div>

        {/* Email Volume Chart */}
        <div className="mt-8">
          <Card title="Email Processing Volume">
            <div className="h-64">
              <Bar 
                data={emailBar} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      grid: { color: 'rgba(0,0,0,0.1)' }
                    },
                    x: {
                      grid: { display: false }
                    }
                  }
                }} 
              />
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}

// Utility functions
async function fetchJSON(url: string) {
  try {
    const res = await fetch(url, { credentials: "include" });
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
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// Sample data
function sampleStats() {
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

function sampleHealth() {
  return {
    workers: { aiProcessor: "running", imapSync: "running" },
    queue: { pendingEmails: 2, failedEmails: 0 },
    system: { database: "connected" },
  };
}

function sampleEmails() {
  return [
    { from: "alice@example.com", subject: "Help with product configuration", createdAt: new Date(Date.now() - 300000).toISOString() },
    { from: "bob@example.com", subject: "Billing question about subscription", createdAt: new Date(Date.now() - 600000).toISOString() },
    { from: "carol@example.com", subject: "Partnership inquiry", createdAt: new Date(Date.now() - 1200000).toISOString() },
    { from: "dave@example.com", subject: "Technical support needed", createdAt: new Date(Date.now() - 1800000).toISOString() },
    { from: "eve@example.com", subject: "Feature request", createdAt: new Date(Date.now() - 2400000).toISOString() },
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