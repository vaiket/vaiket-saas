"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  CheckCircle2,
  Copy,
  Filter,
  MessageSquare,
  PencilLine,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  UserRoundCheck,
  Workflow,
} from "lucide-react";

type BotRule = {
  id: string;
  name: string;
  matchType: string;
  pattern: string | null;
  responseType: string;
  responseText: string | null;
  handoverToHuman: boolean;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt?: string;
};

type FormState = {
  name: string;
  matchType: string;
  pattern: string;
  responseType: string;
  responseText: string;
  handoverToHuman: boolean;
  isActive: boolean;
  priority: number;
};

type Banner = { kind: "success" | "error" | "info"; text: string };

const initialForm: FormState = {
  name: "",
  matchType: "keyword",
  pattern: "",
  responseType: "text",
  responseText: "",
  handoverToHuman: false,
  isActive: true,
  priority: 100,
};

const matchTypeOptions = ["keyword", "contains", "regex", "ai_intent"];
const responseTypeOptions = ["text", "template", "handover"];
const quickReplies = [
  "Hi! Welcome to Vaiket support. How can we help you today?",
  "Thanks for your message. Our team will reply shortly.",
  "Please share your order ID so we can assist faster.",
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

const normalize = (v: string) => v.toLowerCase().trim();
const formatDate = (v?: string) => (v ? new Date(v).toLocaleString() : "-");

function isRuleMatch(rule: BotRule, input: string) {
  const source = normalize(input);
  const pattern = normalize(rule.pattern || "");
  if (!source) return false;
  if (!pattern && rule.matchType !== "ai_intent") return false;
  if (rule.matchType === "contains") return source.includes(pattern);
  if (rule.matchType === "keyword") {
    const keywords = pattern
      .split(/[,\n|]/g)
      .map((k) => k.trim())
      .filter(Boolean);
    return keywords.some((k) => source.includes(k));
  }
  if (rule.matchType === "regex") {
    try {
      return new RegExp(rule.pattern || "", "i").test(input);
    } catch {
      return false;
    }
  }
  return rule.matchType === "ai_intent";
}

export default function WhatsAppChatbotPage() {
  const [rules, setRules] = useState<BotRule[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [matchType, setMatchType] = useState<string>("all");
  const [handover, setHandover] = useState<"all" | "yes" | "no">("all");
  const [simInput, setSimInput] = useState("");
  const [priorityDrafts, setPriorityDrafts] = useState<Record<string, string>>({});

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/whatsapp/chatbot/rules", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await readJsonSafe(res);
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load rules");
      const fetched: BotRule[] = data.rules || [];
      setRules(fetched);
      setPriorityDrafts(
        fetched.reduce<Record<string, string>>((acc, r) => {
          acc[r.id] = String(r.priority);
          return acc;
        }, {})
      );
    } catch (err) {
      setBanner({ kind: "error", text: err instanceof Error ? err.message : "Load failed" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const ordered = useMemo(
    () =>
      [...rules].sort((a, b) =>
        a.priority === b.priority
          ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          : a.priority - b.priority
      ),
    [rules]
  );

  const filtered = useMemo(
    () =>
      ordered.filter((r) => {
        const q = search.trim().toLowerCase();
        const searchable = `${r.name} ${r.pattern || ""} ${r.responseText || ""}`.toLowerCase();
        const qOk = !q || searchable.includes(q);
        const sOk = status === "all" || (status === "active" ? r.isActive : !r.isActive);
        const mOk = matchType === "all" || r.matchType === matchType;
        const hOk = handover === "all" || (handover === "yes" ? r.handoverToHuman : !r.handoverToHuman);
        return qOk && sOk && mOk && hOk;
      }),
    [ordered, search, status, matchType, handover]
  );

  const stats = useMemo(
    () => ({
      total: rules.length,
      active: rules.filter((r) => r.isActive).length,
      handover: rules.filter((r) => r.handoverToHuman).length,
      ai: rules.filter((r) => r.matchType === "ai_intent").length,
    }),
    [rules]
  );

  const bestMatch = useMemo(() => {
    if (!simInput.trim()) return null;
    return ordered.filter((r) => r.isActive).find((r) => isRuleMatch(r, simInput)) || null;
  }, [ordered, simInput]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const openEdit = (rule: BotRule) => {
    setEditingId(rule.id);
    setForm({
      name: rule.name,
      matchType: rule.matchType,
      pattern: rule.pattern || "",
      responseType: rule.responseType || "text",
      responseText: rule.responseText || "",
      handoverToHuman: rule.handoverToHuman,
      isActive: rule.isActive,
      priority: rule.priority,
    });
    setBanner({ kind: "info", text: `Editing ${rule.name}` });
  };

  const cloneRule = (rule: BotRule) => {
    setEditingId(null);
    setForm({
      name: `${rule.name} (Copy)`,
      matchType: rule.matchType,
      pattern: rule.pattern || "",
      responseType: rule.responseType || "text",
      responseText: rule.responseText || "",
      handoverToHuman: rule.handoverToHuman,
      isActive: rule.isActive,
      priority: rule.priority + 10,
    });
    setBanner({ kind: "info", text: `Cloned from ${rule.name}` });
  };

  const saveForm = async () => {
    if (!form.name.trim() || !form.responseText.trim()) {
      setBanner({ kind: "error", text: "Rule name and response text are required." });
      return;
    }
    if (form.matchType !== "ai_intent" && !form.pattern.trim()) {
      setBanner({ kind: "error", text: "Pattern is required for selected match type." });
      return;
    }
    try {
      setSaving(true);
      setBanner(null);
      const payload = {
        name: form.name.trim(),
        matchType: form.matchType,
        pattern: form.pattern.trim(),
        responseType: form.responseType,
        responseText: form.responseText.trim(),
        handoverToHuman: form.handoverToHuman,
        isActive: form.isActive,
        priority: Math.max(1, Math.floor(form.priority || 100)),
      };
      const res = await fetch("/api/whatsapp/chatbot/rules", {
        method: editingId ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      });
      const data = await readJsonSafe(res);
      if (!res.ok || !data.success) throw new Error(data.error || "Save failed");
      setBanner({ kind: "success", text: editingId ? "Rule updated." : "Rule created." });
      resetForm();
      await load();
    } catch (err) {
      setBanner({ kind: "error", text: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  const toggleRule = async (rule: BotRule) => {
    try {
      setMutatingId(rule.id);
      const res = await fetch("/api/whatsapp/chatbot/rules", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rule.id, isActive: !rule.isActive }),
      });
      const data = await readJsonSafe(res);
      if (!res.ok || !data.success) throw new Error(data.error || "Update failed");
      setBanner({ kind: "success", text: `${rule.name} ${rule.isActive ? "disabled" : "enabled"}.` });
      await load();
    } catch (err) {
      setBanner({ kind: "error", text: err instanceof Error ? err.message : "Update failed" });
    } finally {
      setMutatingId(null);
    }
  };

  const savePriority = async (rule: BotRule) => {
    const draft = Number(priorityDrafts[rule.id] ?? rule.priority);
    if (!Number.isFinite(draft) || draft < 1) {
      setBanner({ kind: "error", text: "Priority must be greater than 0." });
      return;
    }
    try {
      setMutatingId(rule.id);
      const res = await fetch("/api/whatsapp/chatbot/rules", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rule.id, priority: Math.floor(draft) }),
      });
      const data = await readJsonSafe(res);
      if (!res.ok || !data.success) throw new Error(data.error || "Priority save failed");
      setBanner({ kind: "success", text: `Priority saved for ${rule.name}.` });
      await load();
    } catch (err) {
      setBanner({ kind: "error", text: err instanceof Error ? err.message : "Priority update failed" });
    } finally {
      setMutatingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-[1280px] space-y-6">
      <section className="overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 shadow-[0_18px_55px_-32px_rgba(16,185,129,0.5)]">
        <div className="flex flex-wrap items-start justify-between gap-4 p-6 md:p-8">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700">
              <Bot className="h-3.5 w-3.5" />
              Chatbot Control Center
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              WhatsApp Chatbot Rules Engine
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Build intent logic, priorities, and handover flows from one premium panel.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button onClick={resetForm} className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-white px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50">
              <Plus className="h-4 w-4" />
              New Rule
            </button>
            <Link href="/dashboard/whatsapp" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Back to Hub
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-emerald-100 bg-white/70 p-4 md:grid-cols-4 md:p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-3"><p className="text-xs uppercase tracking-[0.08em] text-slate-500">Total Rules</p><p className="mt-1 text-xl font-semibold text-slate-900">{stats.total}</p></div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3"><p className="text-xs uppercase tracking-[0.08em] text-emerald-700">Active</p><p className="mt-1 text-xl font-semibold text-emerald-900">{stats.active}</p></div>
          <div className="rounded-2xl border border-teal-200 bg-teal-50 p-3"><p className="text-xs uppercase tracking-[0.08em] text-teal-700">Handover</p><p className="mt-1 text-xl font-semibold text-teal-900">{stats.handover}</p></div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3"><p className="text-xs uppercase tracking-[0.08em] text-blue-700">AI Intent</p><p className="mt-1 text-xl font-semibold text-blue-900">{stats.ai}</p></div>
        </div>
      </section>

      {banner && <div className={`rounded-2xl border px-4 py-3 text-sm ${banner.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : banner.kind === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-blue-200 bg-blue-50 text-blue-700"}`}>{banner.text}</div>}

      <div className="grid gap-6 xl:grid-cols-12">
        <section className="space-y-4 xl:col-span-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2"><Filter className="h-4 w-4 text-slate-500" /><h2 className="text-base font-semibold text-slate-900">Rule Filters</h2></div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="relative xl:col-span-2"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, pattern, response..." className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" /></label>
              <select value={status} onChange={(e) => setStatus(e.target.value as "all" | "active" | "inactive")} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"><option value="all">All Status</option><option value="active">Active only</option><option value="inactive">Inactive only</option></select>
              <select value={matchType} onChange={(e) => setMatchType(e.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"><option value="all">All Match Types</option>{matchTypeOptions.map((v) => <option key={v} value={v}>{v}</option>)}</select>
              <select value={handover} onChange={(e) => setHandover(e.target.value as "all" | "yes" | "no")} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"><option value="all">All Handover</option><option value="yes">Handover: Yes</option><option value="no">Handover: No</option></select>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-slate-900">Rules Library</h2>
              <span className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {filtered.length} shown
              </span>
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <Bot className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-3 text-sm font-medium text-slate-700">No rules found</p>
                <p className="mt-1 text-xs text-slate-500">Change filters or create a new rule.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((rule) => (
                  <article key={rule.id} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-slate-900">{rule.name}</h3>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${rule.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{rule.isActive ? "active" : "inactive"}</span>
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">{rule.matchType}</span>
                          {rule.handoverToHuman && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">handover</span>}
                        </div>
                        <p className="text-xs text-slate-600">Pattern: <span className="font-mono text-slate-800">{rule.pattern || "(no pattern)"}</span></p>
                        <p className="line-clamp-2 text-xs text-slate-600">Response: {rule.responseText || "-"}</p>
                        <p className="text-[11px] text-slate-500">Updated: {formatDate(rule.updatedAt || rule.createdAt)}</p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={1}
                            value={priorityDrafts[rule.id] ?? String(rule.priority)}
                            onChange={(e) => setPriorityDrafts((prev) => ({ ...prev, [rule.id]: e.target.value }))}
                            className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                          />
                          <button
                            onClick={() => savePriority(rule)}
                            disabled={mutatingId === rule.id}
                            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                          >
                            Save P
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          <button onClick={() => openEdit(rule)} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"><PencilLine className="h-3.5 w-3.5" />Edit</button>
                          <button onClick={() => cloneRule(rule)} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"><Copy className="h-3.5 w-3.5" />Clone</button>
                          <button onClick={() => toggleRule(rule)} disabled={mutatingId === rule.id} className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-60 ${rule.isActive ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"}`}>
                            {rule.isActive ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                            {rule.isActive ? "Disable" : "Enable"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4 xl:col-span-4">
          <div className="sticky top-20 space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-900">{editingId ? "Edit Rule" : "Create Rule"}</h2>
                {editingId && <button onClick={resetForm} className="text-xs font-medium text-slate-500 hover:text-slate-700">Cancel edit</button>}
              </div>

              <div className="space-y-3">
                <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Rule name" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
                <div className="grid grid-cols-2 gap-2">
                  <select value={form.matchType} onChange={(e) => setForm((p) => ({ ...p, matchType: e.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100">{matchTypeOptions.map((v) => <option key={v} value={v}>{v}</option>)}</select>
                  <input type="number" min={1} value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: Number(e.target.value) || 100 }))} placeholder="Priority" className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
                </div>
                <input value={form.pattern} onChange={(e) => setForm((p) => ({ ...p, pattern: e.target.value }))} placeholder="Pattern / keywords / regex" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
                <select value={form.responseType} onChange={(e) => setForm((p) => ({ ...p, responseType: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100">{responseTypeOptions.map((v) => <option key={v} value={v}>{v}</option>)}</select>
                <textarea rows={4} value={form.responseText} onChange={(e) => setForm((p) => ({ ...p, responseText: e.target.value }))} placeholder="Bot response text" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />

                <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Quick Snippets</p>
                  <div className="flex flex-wrap gap-1.5">
                    {quickReplies.map((snippet) => (
                      <button key={snippet} onClick={() => setForm((p) => ({ ...p, responseText: p.responseText ? `${p.responseText}\n${snippet}` : snippet }))} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100">+ snippet</button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  <label className="flex cursor-pointer items-center justify-between gap-2"><span>Rule active</span><input type="checkbox" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} /></label>
                  <label className="flex cursor-pointer items-center justify-between gap-2"><span>Auto handover to human</span><input type="checkbox" checked={form.handoverToHuman} onChange={(e) => setForm((p) => ({ ...p, handoverToHuman: e.target.checked }))} /></label>
                </div>

                <div className="flex gap-2">
                  <button onClick={saveForm} disabled={saving} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"><CheckCircle2 className="h-4 w-4" />{saving ? (editingId ? "Updating..." : "Creating...") : editingId ? "Update Rule" : "Create Rule"}</button>
                  <button onClick={resetForm} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100">Reset</button>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2"><Workflow className="h-4 w-4 text-emerald-600" /><h2 className="text-base font-semibold text-slate-900">Message Simulator</h2></div>
              <textarea rows={4} value={simInput} onChange={(e) => setSimInput(e.target.value)} placeholder="Type sample user message..." className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                {!simInput.trim() ? <p className="text-xs text-slate-500">Enter input to test active rule matching.</p> : bestMatch ? (
                  <div className="space-y-2 text-xs">
                    <p className="font-semibold text-emerald-700">Matched: {bestMatch.name} (priority {bestMatch.priority})</p>
                    <p className="text-slate-600">Type: {bestMatch.matchType} | Pattern: <span className="font-mono text-slate-800">{bestMatch.pattern || "-"}</span></p>
                    <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-slate-700">{bestMatch.responseText || "(empty response)"}</p>
                    {bestMatch.handoverToHuman && <p className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700"><UserRoundCheck className="h-3.5 w-3.5" />Handover enabled</p>}
                  </div>
                ) : <p className="text-xs font-medium text-rose-600">No active rule matched this input.</p>}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-base font-semibold text-slate-900">Operational Guardrails</h2>
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 text-emerald-600" />Keep low priority numbers for critical fallback rules.</li>
                <li className="flex items-start gap-2"><MessageSquare className="mt-0.5 h-3.5 w-3.5 text-emerald-600" />Keep responses concise for better engagement.</li>
                <li className="flex items-start gap-2"><Bot className="mt-0.5 h-3.5 w-3.5 text-emerald-600" />Use AI intent only for broad non-deterministic queries.</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
