"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Download,
  Filter,
  Loader2,
  Plus,
  RefreshCcw,
  Sparkles,
} from "lucide-react";

type CrmView =
  | "overview"
  | "leads"
  | "clients"
  | "pipeline"
  | "tasks"
  | "appointments"
  | "team"
  | "templates";

const VIEWS: Array<{ key: CrmView; label: string; path: string }> = [
  { key: "overview", label: "Overview", path: "/dashboard/crm" },
  { key: "leads", label: "Leads", path: "/dashboard/crm/leads" },
  { key: "clients", label: "Clients", path: "/dashboard/crm/clients" },
  { key: "pipeline", label: "Pipeline", path: "/dashboard/crm/pipeline" },
  { key: "tasks", label: "Tasks", path: "/dashboard/crm/tasks" },
  { key: "appointments", label: "Appointments", path: "/dashboard/crm/appointments" },
  { key: "team", label: "Team", path: "/dashboard/crm/team" },
  { key: "templates", label: "Templates", path: "/dashboard/crm/templates" },
];

const LEAD_SOURCES = ["Manual", "WhatsApp", "Website", "Ads", "Import"];
const LEAD_STATUSES = ["New Lead", "Contacted", "Interested", "Demo Scheduled", "Negotiation", "Won", "Lost"];
const DEAL_STAGES = ["New Lead", "Qualified", "Proposal Sent", "Negotiation", "Closed Won", "Closed Lost"];
const TASK_PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const TASK_STATUSES = ["Pending", "In Progress", "Completed", "Cancelled"];
const APPOINTMENT_STATUSES = ["Scheduled", "Completed", "Cancelled"];

const QUICK_TEMPLATES = [
  "Hi {{name}}, thanks for contacting us. Our CRM team will reach out shortly.",
  "Hi {{name}}, your appointment is scheduled for {{date}} at {{time}}.",
  "Hi {{name}}, quick follow-up on your requirement. Let us know your preferred time.",
];

async function readJsonSafe(res: Response) {
  const raw = await res.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function apiJson(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    cache: "no-store",
    credentials: "include",
    ...init,
  });
  const data = await readJsonSafe(res);
  return { ok: res.ok, data };
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString();
}

function toLocalDateTime(value: string | null | undefined) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}

export default function CrmWorkspace({ initialView }: { initialView: CrmView }) {
  const activeView = initialView;
  const currentView = useMemo(() => VIEWS.find((item) => item.key === activeView) || VIEWS[0], [activeView]);

  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState("");
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [overview, setOverview] = useState<any>({});
  const [health, setHealth] = useState<any>({});
  const [notifications, setNotifications] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [teamUsers, setTeamUsers] = useState<any[]>([]);
  const [teamRoles, setTeamRoles] = useState<string[]>([]);
  const [tags, setTags] = useState<any[]>([]);

  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [leadSearch, setLeadSearch] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [bulkLeadStatus, setBulkLeadStatus] = useState("Contacted");

  const [leadForm, setLeadForm] = useState<any>({
    name: "",
    phoneNumber: "",
    email: "",
    company: "",
    source: "Manual",
    status: "New Lead",
    assignedUserId: "",
    tagsText: "",
    notes: "",
  });
  const [clientForm, setClientForm] = useState<any>({
    leadId: "",
    name: "",
    phoneNumber: "",
    email: "",
    company: "",
    address: "",
    tagsText: "",
    notes: "",
  });
  const [dealForm, setDealForm] = useState<any>({
    title: "",
    stage: "Qualified",
    value: "",
    clientId: "",
    leadId: "",
    assignedUserId: "",
    expectedClosingDate: "",
  });
  const [taskForm, setTaskForm] = useState<any>({
    title: "",
    assignedUserId: "",
    clientId: "",
    leadId: "",
    dueDate: "",
    priority: "Medium",
    status: "Pending",
    notes: "",
  });
  const [appointmentForm, setAppointmentForm] = useState<any>({
    title: "",
    clientId: "",
    leadId: "",
    assignedUserId: "",
    startAt: "",
    endAt: "",
    status: "Scheduled",
    reminderMinutes: "30",
  });
  const [csvImport, setCsvImport] = useState("");
  const [tagForm, setTagForm] = useState({ name: "", color: "#6366F1" });
  const [pendingRoles, setPendingRoles] = useState<Record<number, string>>({});

  const setError = useCallback((text: string) => setNotice({ type: "error", text }), []);
  const setSuccess = useCallback((text: string) => setNotice({ type: "success", text }), []);

  const runAction = useCallback(
    async (key: string, fn: () => Promise<void>) => {
      setAction(key);
      setNotice(null);
      try {
        await fn();
      } catch (error) {
        setError(error instanceof Error ? error.message : "Request failed");
      } finally {
        setAction("");
      }
    },
    [setError]
  );

  const loadHealth = useCallback(async () => {
    const { ok, data } = await apiJson("/api/crm/health");
    if (ok && data.success) setHealth(data);
  }, []);

  const loadOverview = useCallback(async () => {
    const { ok, data } = await apiJson("/api/crm/overview?rangeDays=30");
    if (!ok || !data.success) throw new Error(data.error || "Failed to load overview");
    setOverview(data);
  }, []);

  const loadNotifications = useCallback(async () => {
    const { ok, data } = await apiJson("/api/crm/notifications?take=15");
    if (!ok || !data.success) return;
    setNotifications(data.notifications || []);
  }, []);

  const loadLeads = useCallback(async () => {
    const query = leadSearch.trim() ? `?take=200&search=${encodeURIComponent(leadSearch.trim())}` : "?take=200";
    const { ok, data } = await apiJson(`/api/crm/leads${query}`);
    if (!ok || !data.success) throw new Error(data.error || "Failed to load leads");
    setLeads(data.leads || []);
  }, [leadSearch]);

  const loadClients = useCallback(async () => {
    const query = clientSearch.trim() ? `?search=${encodeURIComponent(clientSearch.trim())}` : "";
    const { ok, data } = await apiJson(`/api/crm/clients${query}`);
    if (!ok || !data.success) throw new Error(data.error || "Failed to load clients");
    setClients(data.clients || []);
  }, [clientSearch]);

  const loadDeals = useCallback(async () => {
    const { ok, data } = await apiJson("/api/crm/deals");
    if (!ok || !data.success) throw new Error(data.error || "Failed to load deals");
    setDeals(data.deals || []);
  }, []);

  const loadTasks = useCallback(async () => {
    const { ok, data } = await apiJson("/api/crm/tasks");
    if (!ok || !data.success) throw new Error(data.error || "Failed to load tasks");
    setTasks(data.tasks || []);
  }, []);

  const loadAppointments = useCallback(async () => {
    const { ok, data } = await apiJson("/api/crm/appointments");
    if (!ok || !data.success) throw new Error(data.error || "Failed to load appointments");
    setAppointments(data.appointments || []);
  }, []);

  const loadTeam = useCallback(async () => {
    const { ok, data } = await apiJson("/api/crm/team");
    if (!ok || !data.success) throw new Error(data.error || "Failed to load team");
    const users = data.users || [];
    setTeamUsers(users);
    setTeamRoles(data.roles || []);
    setPendingRoles(
      users.reduce((acc: Record<number, string>, user: any) => {
        acc[user.id] = user.crmRole;
        return acc;
      }, {})
    );
  }, []);

  const loadTags = useCallback(async () => {
    const { ok, data } = await apiJson("/api/crm/tags");
    if (!ok || !data.success) throw new Error(data.error || "Failed to load tags");
    setTags(data.tags || []);
  }, []);

  const refreshCurrentView = useCallback(async () => {
    setLoading(true);
    setNotice(null);
    try {
      if (activeView === "overview") {
        await Promise.all([loadOverview(), loadHealth(), loadNotifications()]);
      } else if (activeView === "leads") {
        await Promise.all([loadLeads(), loadTeam(), loadTags(), loadHealth()]);
      } else if (activeView === "clients") {
        await Promise.all([loadClients(), loadLeads(), loadHealth()]);
      } else if (activeView === "pipeline") {
        await Promise.all([loadDeals(), loadClients(), loadLeads(), loadTeam(), loadHealth()]);
      } else if (activeView === "tasks") {
        await Promise.all([loadTasks(), loadClients(), loadLeads(), loadTeam(), loadHealth()]);
      } else if (activeView === "appointments") {
        await Promise.all([loadAppointments(), loadClients(), loadLeads(), loadTeam(), loadHealth()]);
      } else if (activeView === "team") {
        await Promise.all([loadTeam(), loadHealth()]);
      } else {
        await Promise.all([loadTags(), loadHealth()]);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load CRM data");
    } finally {
      setLoading(false);
    }
  }, [
    activeView,
    loadAppointments,
    loadClients,
    loadDeals,
    loadHealth,
    loadLeads,
    loadNotifications,
    loadOverview,
    loadTags,
    loadTasks,
    loadTeam,
    setError,
  ]);

  useEffect(() => {
    void refreshCurrentView();
  }, [refreshCurrentView]);

  const userOptions = useMemo(
    () =>
      teamUsers.map((user) => ({
        id: user.id,
        label: `${user.name || "User"} (${user.email})`,
      })),
    [teamUsers]
  );

  const visibleLeads = useMemo(() => {
    if (!leadSearch.trim()) return leads;
    const q = leadSearch.toLowerCase();
    return leads.filter((lead) =>
      [lead.name, lead.phoneNumber, lead.email, lead.company].some((item) =>
        String(item || "")
          .toLowerCase()
          .includes(q)
      )
    );
  }, [leads, leadSearch]);

  const visibleClients = useMemo(() => {
    if (!clientSearch.trim()) return clients;
    const q = clientSearch.toLowerCase();
    return clients.filter((client) =>
      [client.name, client.phoneNumber, client.email, client.company].some((item) =>
        String(item || "")
          .toLowerCase()
          .includes(q)
      )
    );
  }, [clients, clientSearch]);

  const handleCreateLead = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runAction("lead-create", async () => {
      const { ok, data } = await apiJson("/api/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...leadForm,
          assignedUserId: leadForm.assignedUserId ? Number(leadForm.assignedUserId) : null,
          tags: String(leadForm.tagsText || "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });
      if (!ok || !data.success) throw new Error(data.error || "Failed to create lead");
      setLeadForm({
        name: "",
        phoneNumber: "",
        email: "",
        company: "",
        source: "Manual",
        status: "New Lead",
        assignedUserId: leadForm.assignedUserId,
        tagsText: "",
        notes: "",
      });
      setSuccess("Lead created.");
      await Promise.all([loadLeads(), loadOverview(), loadHealth()]);
    });
  };

  const handleBulkLeadUpdate = async () => {
    if (selectedLeadIds.length === 0) {
      setError("Select at least one lead.");
      return;
    }
    await runAction("lead-bulk", async () => {
      const { ok, data } = await apiJson("/api/crm/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedLeadIds, status: bulkLeadStatus }),
      });
      if (!ok || !data.success) throw new Error(data.error || "Failed to update leads");
      setSelectedLeadIds([]);
      setSuccess("Lead status updated.");
      await Promise.all([loadLeads(), loadOverview(), loadHealth()]);
    });
  };

  const handleConvertLead = async () => {
    if (selectedLeadIds.length === 0) {
      setError("Select one lead to convert.");
      return;
    }
    await runAction("lead-convert", async () => {
      const { ok, data } = await apiJson("/api/crm/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: selectedLeadIds[0] }),
      });
      if (!ok || !data.success) throw new Error(data.error || "Failed to convert lead");
      setSelectedLeadIds([]);
      setSuccess("Lead converted to client.");
      await Promise.all([loadLeads(), loadClients(), loadOverview(), loadHealth()]);
    });
  };

  const handleCreateClient = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runAction("client-create", async () => {
      const { ok, data } = await apiJson("/api/crm/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...clientForm,
          leadId: clientForm.leadId || null,
          tags: String(clientForm.tagsText || "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });
      if (!ok || !data.success) throw new Error(data.error || "Failed to create client");
      setClientForm({
        leadId: "",
        name: "",
        phoneNumber: "",
        email: "",
        company: "",
        address: "",
        tagsText: "",
        notes: "",
      });
      setSuccess("Client added.");
      await Promise.all([loadClients(), loadLeads(), loadOverview(), loadHealth()]);
    });
  };

  const handleCreateDeal = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runAction("deal-create", async () => {
      const { ok, data } = await apiJson("/api/crm/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...dealForm,
          value: dealForm.value ? Number(dealForm.value) : 0,
          clientId: dealForm.clientId || null,
          leadId: dealForm.leadId || null,
          assignedUserId: dealForm.assignedUserId ? Number(dealForm.assignedUserId) : null,
          expectedClosingDate: dealForm.expectedClosingDate || null,
        }),
      });
      if (!ok || !data.success) throw new Error(data.error || "Failed to create deal");
      setDealForm({
        title: "",
        stage: "Qualified",
        value: "",
        clientId: "",
        leadId: "",
        assignedUserId: dealForm.assignedUserId,
        expectedClosingDate: "",
      });
      setSuccess("Deal created.");
      await Promise.all([loadDeals(), loadOverview(), loadHealth()]);
    });
  };

  const handleUpdateDealStage = async (dealId: string, stage: string) => {
    await runAction(`deal-${dealId}`, async () => {
      const { ok, data } = await apiJson("/api/crm/deals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId, stage }),
      });
      if (!ok || !data.success) throw new Error(data.error || "Failed to update deal");
      await Promise.all([loadDeals(), loadOverview(), loadHealth()]);
    });
  };

  const handleCreateTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runAction("task-create", async () => {
      const { ok, data } = await apiJson("/api/crm/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...taskForm,
          assignedUserId: taskForm.assignedUserId ? Number(taskForm.assignedUserId) : null,
          clientId: taskForm.clientId || null,
          leadId: taskForm.leadId || null,
          dueDate: taskForm.dueDate || null,
        }),
      });
      if (!ok || !data.success) throw new Error(data.error || "Failed to create task");
      setTaskForm({
        title: "",
        assignedUserId: taskForm.assignedUserId,
        clientId: "",
        leadId: "",
        dueDate: "",
        priority: "Medium",
        status: "Pending",
        notes: "",
      });
      setSuccess("Task created.");
      await Promise.all([loadTasks(), loadOverview(), loadHealth()]);
    });
  };

  const handleUpdateTask = async (taskId: string, payload: any) => {
    await runAction(`task-${taskId}`, async () => {
      const { ok, data } = await apiJson("/api/crm/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, ...payload }),
      });
      if (!ok || !data.success) throw new Error(data.error || "Failed to update task");
      await Promise.all([loadTasks(), loadOverview(), loadHealth()]);
    });
  };

  const handleCreateAppointment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runAction("appointment-create", async () => {
      const { ok, data } = await apiJson("/api/crm/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...appointmentForm,
          assignedUserId: appointmentForm.assignedUserId ? Number(appointmentForm.assignedUserId) : null,
          clientId: appointmentForm.clientId || null,
          leadId: appointmentForm.leadId || null,
          startAt: appointmentForm.startAt || null,
          endAt: appointmentForm.endAt || null,
          reminderMinutes: appointmentForm.reminderMinutes ? Number(appointmentForm.reminderMinutes) : 30,
        }),
      });
      if (!ok || !data.success) throw new Error(data.error || "Failed to create appointment");
      setAppointmentForm({
        title: "",
        clientId: "",
        leadId: "",
        assignedUserId: appointmentForm.assignedUserId,
        startAt: "",
        endAt: "",
        status: "Scheduled",
        reminderMinutes: "30",
      });
      setSuccess("Appointment scheduled.");
      await Promise.all([loadAppointments(), loadOverview(), loadHealth()]);
    });
  };

  const handleUpdateAppointmentStatus = async (appointmentId: string, status: string) => {
    await runAction(`appointment-${appointmentId}`, async () => {
      const { ok, data } = await apiJson("/api/crm/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId, status }),
      });
      if (!ok || !data.success) throw new Error(data.error || "Failed to update appointment");
      await Promise.all([loadAppointments(), loadOverview(), loadHealth()]);
    });
  };

  const handleSaveTeamRole = async (userId: number) => {
    await runAction(`team-${userId}`, async () => {
      const { ok, data } = await apiJson("/api/crm/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: pendingRoles[userId] }),
      });
      if (!ok || !data.success) throw new Error(data.error || "Failed to update role");
      setSuccess("CRM role updated.");
      await loadTeam();
    });
  };

  const handleImportCsv = async () => {
    if (!csvImport.trim()) {
      setError("Paste CSV data first.");
      return;
    }
    await runAction("import", async () => {
      const { ok, data } = await apiJson("/api/crm/leads/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvImport }),
      });
      if (!ok || !data.success) throw new Error(data.error || "Import failed");
      setCsvImport("");
      setSuccess(`Imported ${String(data.imported || 0)} leads.`);
      await Promise.all([loadLeads(), loadOverview(), loadHealth()]);
    });
  };

  const handleSaveTag = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runAction("tag-save", async () => {
      const { ok, data } = await apiJson("/api/crm/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tagForm),
      });
      if (!ok || !data.success) throw new Error(data.error || "Failed to save tag");
      setTagForm({ name: "", color: "#6366F1" });
      setSuccess("Tag saved.");
      await loadTags();
    });
  };

  const markAllNotifications = async () => {
    await runAction("notifications", async () => {
      const { ok, data } = await apiJson("/api/crm/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      if (!ok || !data.success) throw new Error(data.error || "Failed to mark notifications");
      setSuccess("Notifications marked as read.");
      await loadNotifications();
    });
  };

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeadIds((prev) => (prev.includes(leadId) ? prev.filter((item) => item !== leadId) : [...prev, leadId]));
  };

  const triggerExport = (type: "leads" | "clients" | "deals") => {
    window.location.href = `/api/crm/export?type=${type}&format=csv`;
  };

  const renderOverview = () => (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard title="Total Leads" value={String(overview.summary?.totalLeads ?? 0)} />
        <SummaryCard title="Total Clients" value={String(overview.summary?.totalClients ?? 0)} />
        <SummaryCard title="Active Deals" value={String(overview.summary?.activeDeals ?? 0)} />
        <SummaryCard title="Pending Follow-ups" value={String(overview.summary?.upcomingFollowUps ?? 0)} />
        <SummaryCard title="Appointments Today" value={String(overview.summary?.appointmentsToday ?? 0)} />
        <SummaryCard title="Conversion" value={`${Number(overview.summary?.conversionRate ?? 0).toFixed(2)}%`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Pipeline Snapshot</h3>
          <div className="mt-3 space-y-2">
            {(overview.pipeline || []).map((stage: any) => (
              <article key={stage.stage} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-sm font-medium text-slate-900">{stage.stage}</p>
                <p className="text-xs text-slate-600">{stage.total} deal(s) - {Number(stage.amount || 0).toLocaleString("en-IN")}</p>
              </article>
            ))}
            {!overview.pipeline?.length && <p className="text-sm text-slate-500">No pipeline data yet.</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
            <button
              type="button"
              onClick={() => void markAllNotifications()}
              className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Mark all read
            </button>
          </div>
          <div className="space-y-2">
            {notifications.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-sm font-medium text-slate-900">{item.title}</p>
                <p className="text-xs text-slate-600">{item.body || item.kind}</p>
                <p className="text-[11px] text-slate-500">{formatDate(item.createdAt)}</p>
              </article>
            ))}
            {!notifications.length && <p className="text-sm text-slate-500">No notifications.</p>}
          </div>
        </section>
      </div>
    </div>
  );

  const renderLeads = () => (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Add Lead</h3>
        <form className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4" onSubmit={handleCreateLead}>
          <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Name *" required value={leadForm.name} onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })} />
          <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Phone" value={leadForm.phoneNumber} onChange={(e) => setLeadForm({ ...leadForm, phoneNumber: e.target.value })} />
          <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Email" value={leadForm.email} onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })} />
          <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Company" value={leadForm.company} onChange={(e) => setLeadForm({ ...leadForm, company: e.target.value })} />
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={leadForm.source} onChange={(e) => setLeadForm({ ...leadForm, source: e.target.value })}>
            {LEAD_SOURCES.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={leadForm.status} onChange={(e) => setLeadForm({ ...leadForm, status: e.target.value })}>
            {LEAD_STATUSES.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={leadForm.assignedUserId} onChange={(e) => setLeadForm({ ...leadForm, assignedUserId: e.target.value })}>
            <option value="">Assign user</option>
            {userOptions.map((user) => <option key={user.id} value={String(user.id)}>{user.label}</option>)}
          </select>
          <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Tags (comma separated)" value={leadForm.tagsText} onChange={(e) => setLeadForm({ ...leadForm, tagsText: e.target.value })} />
          <textarea className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2 xl:col-span-3" placeholder="Notes" value={leadForm.notes} onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })} />
          <button type="submit" className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60" disabled={action === "lead-create"}>
            {action === "lead-create" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
            Create Lead
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center rounded-lg border border-slate-300 px-2 py-1.5">
              <Filter className="mr-1 h-3.5 w-3.5 text-slate-500" />
              <input className="w-56 bg-transparent text-sm outline-none" placeholder="Search leads" value={leadSearch} onChange={(e) => setLeadSearch(e.target.value)} />
            </div>
            <button type="button" onClick={() => void loadLeads().catch((error) => setError(error.message))} className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Search</button>
          </div>
          <div className="flex items-center gap-2">
            <select className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs" value={bulkLeadStatus} onChange={(e) => setBulkLeadStatus(e.target.value)}>
              {LEAD_STATUSES.map((item) => <option key={item}>{item}</option>)}
            </select>
            <button type="button" onClick={() => void handleBulkLeadUpdate()} className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Update selected</button>
            <button type="button" onClick={() => void handleConvertLead()} className="rounded-lg bg-emerald-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">Convert</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-2 py-2 text-left">
                  <input
                    type="checkbox"
                    checked={visibleLeads.length > 0 && selectedLeadIds.length === visibleLeads.length}
                    onChange={(e) => setSelectedLeadIds(e.target.checked ? visibleLeads.map((lead) => lead.id) : [])}
                  />
                </th>
                <th className="px-2 py-2 text-left font-semibold text-slate-600">Lead</th>
                <th className="px-2 py-2 text-left font-semibold text-slate-600">Contact</th>
                <th className="px-2 py-2 text-left font-semibold text-slate-600">Source</th>
                <th className="px-2 py-2 text-left font-semibold text-slate-600">Status</th>
                <th className="px-2 py-2 text-left font-semibold text-slate-600">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50">
                  <td className="px-2 py-2"><input type="checkbox" checked={selectedLeadIds.includes(lead.id)} onChange={() => toggleLeadSelection(lead.id)} /></td>
                  <td className="px-2 py-2">
                    <p className="font-medium text-slate-900">{lead.name}</p>
                    <p className="text-xs text-slate-500">{lead.company || "-"}</p>
                  </td>
                  <td className="px-2 py-2">
                    <p>{lead.phoneNumber || "-"}</p>
                    <p className="text-xs text-slate-500">{lead.email || "-"}</p>
                  </td>
                  <td className="px-2 py-2">{lead.source}</td>
                  <td className="px-2 py-2"><span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">{lead.status}</span></td>
                  <td className="px-2 py-2 text-xs text-slate-500">{formatDate(lead.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!visibleLeads.length && <p className="mt-3 text-sm text-slate-500">No leads found.</p>}
      </section>
    </div>
  );

  const renderClients = () => (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Add Client</h3>
        <form className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4" onSubmit={handleCreateClient}>
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={clientForm.leadId} onChange={(e) => setClientForm({ ...clientForm, leadId: e.target.value })}>
            <option value="">Convert from lead (optional)</option>
            {leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.name}</option>)}
          </select>
          <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Name" value={clientForm.name} onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })} />
          <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Phone" value={clientForm.phoneNumber} onChange={(e) => setClientForm({ ...clientForm, phoneNumber: e.target.value })} />
          <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Email" value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} />
          <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Company" value={clientForm.company} onChange={(e) => setClientForm({ ...clientForm, company: e.target.value })} />
          <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Address" value={clientForm.address} onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })} />
          <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Tags (comma separated)" value={clientForm.tagsText} onChange={(e) => setClientForm({ ...clientForm, tagsText: e.target.value })} />
          <button type="submit" className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Create Client</button>
          <textarea className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2 xl:col-span-4" placeholder="Notes" value={clientForm.notes} onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })} />
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <div className="inline-flex items-center rounded-lg border border-slate-300 px-2 py-1.5">
            <Filter className="mr-1 h-3.5 w-3.5 text-slate-500" />
            <input className="w-56 bg-transparent text-sm outline-none" placeholder="Search clients" value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} />
          </div>
          <button type="button" onClick={() => void loadClients().catch((error) => setError(error.message))} className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Search</button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-2 py-2 text-left font-semibold text-slate-600">Client</th>
                <th className="px-2 py-2 text-left font-semibold text-slate-600">Contact</th>
                <th className="px-2 py-2 text-left font-semibold text-slate-600">Company</th>
                <th className="px-2 py-2 text-left font-semibold text-slate-600">Created</th>
                <th className="px-2 py-2 text-left font-semibold text-slate-600">Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleClients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50">
                  <td className="px-2 py-2"><p className="font-medium text-slate-900">{client.name}</p></td>
                  <td className="px-2 py-2"><p>{client.phoneNumber || "-"}</p><p className="text-xs text-slate-500">{client.email || "-"}</p></td>
                  <td className="px-2 py-2">{client.company || "-"}</td>
                  <td className="px-2 py-2 text-xs text-slate-500">{formatDate(client.createdAt)}</td>
                  <td className="px-2 py-2"><Link href={`/dashboard/crm/clients/${client.id}`} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!visibleClients.length && <p className="mt-3 text-sm text-slate-500">No clients found.</p>}
      </section>
    </div>
  );

  const renderPipeline = () => (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Add Deal</h3>
        <form className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4" onSubmit={handleCreateDeal}>
          <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Title *" required value={dealForm.title} onChange={(e) => setDealForm({ ...dealForm, title: e.target.value })} />
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={dealForm.stage} onChange={(e) => setDealForm({ ...dealForm, stage: e.target.value })}>
            {DEAL_STAGES.map((item) => <option key={item}>{item}</option>)}
          </select>
          <input type="number" min="0" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Value" value={dealForm.value} onChange={(e) => setDealForm({ ...dealForm, value: e.target.value })} />
          <input type="date" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={dealForm.expectedClosingDate} onChange={(e) => setDealForm({ ...dealForm, expectedClosingDate: e.target.value })} />
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={dealForm.clientId} onChange={(e) => setDealForm({ ...dealForm, clientId: e.target.value })}>
            <option value="">Client (optional)</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={dealForm.leadId} onChange={(e) => setDealForm({ ...dealForm, leadId: e.target.value })}>
            <option value="">Lead (optional)</option>
            {leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.name}</option>)}
          </select>
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={dealForm.assignedUserId} onChange={(e) => setDealForm({ ...dealForm, assignedUserId: e.target.value })}>
            <option value="">Assign owner</option>
            {userOptions.map((user) => <option key={user.id} value={String(user.id)}>{user.label}</option>)}
          </select>
          <button type="submit" className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Create Deal</button>
        </form>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {DEAL_STAGES.map((stage) => (
          <article key={stage} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">{stage}</h3>
            <div className="mt-3 space-y-2">
              {deals.filter((deal) => deal.stage === stage).map((deal) => (
                <div key={deal.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-sm font-medium text-slate-900">{deal.title}</p>
                  <p className="text-xs text-slate-600">{deal.clientName || deal.leadName || "-"} | {Number(deal.value || 0).toLocaleString("en-IN")}</p>
                  <select className="mt-2 w-full rounded-lg border border-slate-300 px-2 py-1 text-xs" value={deal.stage} onChange={(e) => void handleUpdateDealStage(deal.id, e.target.value)}>
                    {DEAL_STAGES.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </div>
              ))}
              {deals.filter((deal) => deal.stage === stage).length === 0 && <p className="text-xs text-slate-500">No deals in this stage.</p>}
            </div>
          </article>
        ))}
      </section>
    </div>
  );

  const renderTasks = () => (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Add Task</h3>
        <form className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4" onSubmit={handleCreateTask}>
          <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Task title *" required value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} />
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={taskForm.assignedUserId} onChange={(e) => setTaskForm({ ...taskForm, assignedUserId: e.target.value })}>
            <option value="">Assign user</option>
            {userOptions.map((user) => <option key={user.id} value={String(user.id)}>{user.label}</option>)}
          </select>
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={taskForm.clientId} onChange={(e) => setTaskForm({ ...taskForm, clientId: e.target.value })}>
            <option value="">Client (optional)</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={taskForm.leadId} onChange={(e) => setTaskForm({ ...taskForm, leadId: e.target.value })}>
            <option value="">Lead (optional)</option>
            {leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.name}</option>)}
          </select>
          <input type="datetime-local" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={taskForm.dueDate} onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} />
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}>
            {TASK_PRIORITIES.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={taskForm.status} onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}>
            {TASK_STATUSES.map((item) => <option key={item}>{item}</option>)}
          </select>
          <button type="submit" className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Create Task</button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-2 py-2 text-left font-semibold text-slate-600">Task</th>
                <th className="px-2 py-2 text-left font-semibold text-slate-600">Linked</th>
                <th className="px-2 py-2 text-left font-semibold text-slate-600">Due</th>
                <th className="px-2 py-2 text-left font-semibold text-slate-600">Priority</th>
                <th className="px-2 py-2 text-left font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tasks.map((task) => (
                <tr key={task.id} className="hover:bg-slate-50">
                  <td className="px-2 py-2"><p className="font-medium text-slate-900">{task.title}</p></td>
                  <td className="px-2 py-2 text-xs text-slate-600">{task.clientName || task.leadName || "-"}</td>
                  <td className="px-2 py-2 text-xs text-slate-600">{formatDate(task.dueDate)}</td>
                  <td className="px-2 py-2">
                    <select className="rounded-lg border border-slate-300 px-2 py-1 text-xs" value={task.priority} onChange={(e) => void handleUpdateTask(task.id, { priority: e.target.value, status: task.status })}>
                      {TASK_PRIORITIES.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <select className="rounded-lg border border-slate-300 px-2 py-1 text-xs" value={task.status} onChange={(e) => void handleUpdateTask(task.id, { status: e.target.value, priority: task.priority })}>
                      {TASK_STATUSES.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!tasks.length && <p className="mt-3 text-sm text-slate-500">No tasks found.</p>}
      </section>
    </div>
  );

  const renderAppointments = () => (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Schedule Appointment</h3>
        <form className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4" onSubmit={handleCreateAppointment}>
          <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Title *" required value={appointmentForm.title} onChange={(e) => setAppointmentForm({ ...appointmentForm, title: e.target.value })} />
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={appointmentForm.clientId} onChange={(e) => setAppointmentForm({ ...appointmentForm, clientId: e.target.value })}>
            <option value="">Client (optional)</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={appointmentForm.leadId} onChange={(e) => setAppointmentForm({ ...appointmentForm, leadId: e.target.value })}>
            <option value="">Lead (optional)</option>
            {leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.name}</option>)}
          </select>
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={appointmentForm.assignedUserId} onChange={(e) => setAppointmentForm({ ...appointmentForm, assignedUserId: e.target.value })}>
            <option value="">Assign user</option>
            {userOptions.map((user) => <option key={user.id} value={String(user.id)}>{user.label}</option>)}
          </select>
          <input type="datetime-local" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required value={appointmentForm.startAt} onChange={(e) => setAppointmentForm({ ...appointmentForm, startAt: e.target.value })} />
          <input type="datetime-local" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={appointmentForm.endAt} onChange={(e) => setAppointmentForm({ ...appointmentForm, endAt: e.target.value })} />
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={appointmentForm.status} onChange={(e) => setAppointmentForm({ ...appointmentForm, status: e.target.value })}>
            {APPOINTMENT_STATUSES.map((item) => <option key={item}>{item}</option>)}
          </select>
          <input type="number" min="0" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Reminder minutes" value={appointmentForm.reminderMinutes} onChange={(e) => setAppointmentForm({ ...appointmentForm, reminderMinutes: e.target.value })} />
          <button type="submit" className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Schedule</button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-2 py-2 text-left font-semibold text-slate-600">Appointment</th>
                <th className="px-2 py-2 text-left font-semibold text-slate-600">Linked</th>
                <th className="px-2 py-2 text-left font-semibold text-slate-600">Start</th>
                <th className="px-2 py-2 text-left font-semibold text-slate-600">End</th>
                <th className="px-2 py-2 text-left font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {appointments.map((appointment) => (
                <tr key={appointment.id} className="hover:bg-slate-50">
                  <td className="px-2 py-2"><p className="font-medium text-slate-900">{appointment.title}</p></td>
                  <td className="px-2 py-2 text-xs text-slate-600">{appointment.clientName || appointment.leadName || "-"}</td>
                  <td className="px-2 py-2 text-xs text-slate-600">{formatDate(appointment.startAt)}</td>
                  <td className="px-2 py-2 text-xs text-slate-600">{formatDate(appointment.endAt)}</td>
                  <td className="px-2 py-2">
                    <select className="rounded-lg border border-slate-300 px-2 py-1 text-xs" value={appointment.status} onChange={(e) => void handleUpdateAppointmentStatus(appointment.id, e.target.value)}>
                      {APPOINTMENT_STATUSES.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!appointments.length && <p className="mt-3 text-sm text-slate-500">No appointments found.</p>}
      </section>
    </div>
  );

  const renderTeam = () => (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">CRM Team Roles</h3>
      <p className="mt-1 text-xs text-slate-500">Editing roles requires admin permissions.</p>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-2 py-2 text-left font-semibold text-slate-600">User</th>
              <th className="px-2 py-2 text-left font-semibold text-slate-600">Workspace Role</th>
              <th className="px-2 py-2 text-left font-semibold text-slate-600">CRM Role</th>
              <th className="px-2 py-2 text-left font-semibold text-slate-600">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {teamUsers.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50">
                <td className="px-2 py-2"><p className="font-medium text-slate-900">{user.name || "User"}</p><p className="text-xs text-slate-500">{user.email}</p></td>
                <td className="px-2 py-2 text-xs text-slate-700">{user.workspaceRole}</td>
                <td className="px-2 py-2">
                  <select className="rounded-lg border border-slate-300 px-2 py-1 text-xs" value={pendingRoles[user.id] ?? user.crmRole} onChange={(e) => setPendingRoles({ ...pendingRoles, [user.id]: e.target.value })}>
                    {teamRoles.map((role) => <option key={role}>{role}</option>)}
                  </select>
                </td>
                <td className="px-2 py-2"><button type="button" onClick={() => void handleSaveTeamRole(user.id)} className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">Save</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!teamUsers.length && <p className="mt-3 text-sm text-slate-500">No users found.</p>}
    </section>
  );

  const renderTemplates = () => (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Export CRM Data</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => triggerExport("leads")} className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Download className="mr-1 h-3.5 w-3.5" />Leads</button>
          <button type="button" onClick={() => triggerExport("clients")} className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Download className="mr-1 h-3.5 w-3.5" />Clients</button>
          <button type="button" onClick={() => triggerExport("deals")} className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Download className="mr-1 h-3.5 w-3.5" />Deals</button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Import Leads CSV</h3>
        <textarea className="mt-3 h-32 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs" value={csvImport} onChange={(e) => setCsvImport(e.target.value)} placeholder={"name,phone,email,company,source\nJohn,+911234567890,john@example.com,Acme,Import"} />
        <button type="button" onClick={() => void handleImportCsv()} className="mt-3 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700">Import</button>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Tag Management</h3>
          <form className="mt-3 flex items-end gap-2" onSubmit={handleSaveTag}>
            <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Tag name" required value={tagForm.name} onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })} />
            <input type="color" className="h-10 w-14 rounded-lg border border-slate-300" value={tagForm.color} onChange={(e) => setTagForm({ ...tagForm, color: e.target.value })} />
            <button type="submit" className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700">Save</button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span key={tag.id} className="inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium" style={{ borderColor: tag.color, color: tag.color }}>
                {tag.name}
              </span>
            ))}
            {!tags.length && <p className="text-sm text-slate-500">No tags yet.</p>}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Quick Templates</h3>
          <div className="mt-3 space-y-2">
            {QUICK_TEMPLATES.map((tpl) => (
              <div key={tpl} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-700">{tpl}</p>
                <button type="button" className="mt-2 rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-white" onClick={() => void navigator.clipboard.writeText(tpl).then(() => setSuccess("Template copied.")).catch(() => setError("Copy failed"))}>Copy</button>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-indigo-600">Vaiket CRM</p>
            <h1 className="text-xl font-semibold text-slate-900">{currentView.label}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">DB: {health.db || "checking"}</span>
            <button type="button" onClick={() => void refreshCurrentView()} className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              {loading ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="mr-1 h-3.5 w-3.5" />}
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {VIEWS.map((view) => (
            <Link key={view.key} href={view.path} className={`rounded-xl border px-3 py-2 text-left text-sm transition ${view.key === activeView ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/40"}`}>
              <p className="font-semibold">{view.label}</p>
            </Link>
          ))}
        </div>
      </header>

      {notice && (
        <div className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          <p>{notice.text}</p>
          <button type="button" onClick={() => setNotice(null)} className="text-xs font-semibold opacity-80 hover:opacity-100">Dismiss</button>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600 shadow-sm">
          <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-indigo-600" />
          Loading CRM data...
        </div>
      ) : activeView === "overview" ? (
        renderOverview()
      ) : activeView === "leads" ? (
        renderLeads()
      ) : activeView === "clients" ? (
        renderClients()
      ) : activeView === "pipeline" ? (
        renderPipeline()
      ) : activeView === "tasks" ? (
        renderTasks()
      ) : activeView === "appointments" ? (
        renderAppointments()
      ) : activeView === "team" ? (
        renderTeam()
      ) : (
        renderTemplates()
      )}

      <footer className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />CRM features connected</span>
          <span className="inline-flex items-center gap-1"><Sparkles className="h-3.5 w-3.5 text-indigo-600" />Last health check: {formatDate(health.checkedAt)}</span>
        </div>
      </footer>
    </div>
  );
}

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </article>
  );
}
