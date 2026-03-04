"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  Filter,
  MessageSquareText,
  RefreshCcw,
  Repeat2,
  Search,
  SendHorizontal,
  Sparkles,
  Tags,
  Users,
} from "lucide-react";

type Account = { id: string; name: string; phoneNumber: string };
type Contact = {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  tags: string[];
  optedIn: boolean;
  lastMessageAt: string | null;
  createdAt: string;
};
type Template = { name: string; language: string; status: string; category: string | null };
type SortMode = "recent" | "name_asc" | "name_desc";
type CampaignMode = "text" | "template_live" | "template_scheduled" | "template_recurring";

const quickSnippets = [
  "Hello! We have an update for you.",
  "Reminder: your subscription renewal is due.",
  "Need help? Reply to this chat and our team will assist.",
];

function asString(v: unknown) {
  return String(v ?? "").trim();
}
function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}
function normalizePhone(raw: string) {
  return raw.trim().replace(/[^\d+]/g, "");
}
function parseNumbers(raw: string) {
  const parts = raw
    .split(/\r?\n|,|;/g)
    .map((i) => normalizePhone(i))
    .filter(Boolean);
  const unique = Array.from(new Set(parts));
  return { unique, totalInput: parts.length, duplicatesRemoved: parts.length - unique.length };
}
function formatWhen(v: string | null) {
  if (!v) return "Never";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return d.toLocaleString();
}
function modeLabel(mode: CampaignMode) {
  if (mode === "text") return "Text Broadcast";
  if (mode === "template_live") return "Template Broadcast";
  if (mode === "template_scheduled") return "Scheduled Template";
  return "Recurring Template";
}
function modeHint(mode: CampaignMode) {
  if (mode === "text") return "Queues text messages for selected/manual recipients.";
  if (mode === "template_live") return "Sends approved templates immediately via Meta API.";
  if (mode === "template_scheduled") return "Queues template campaign for a future time.";
  return "Creates recurring template payload for automation workers.";
}
function toIso(local: string) {
  const txt = local.trim();
  if (!txt) return null;
  const d = new Date(txt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
async function readJsonSafe(res: Response): Promise<Record<string, unknown>> {
  const txt = await res.text();
  if (!txt) return {};
  try {
    return JSON.parse(txt) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export default function WhatsAppBulkPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);

  const [mode, setMode] = useState<CampaignMode>("text");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [manualNumbersText, setManualNumbersText] = useState("");
  const [text, setText] = useState("");
  const [templateKey, setTemplateKey] = useState("");
  const [templateLanguage, setTemplateLanguage] = useState("");
  const [scheduleAtLocal, setScheduleAtLocal] = useState("");
  const [recurringRule, setRecurringRule] = useState("FREQ=DAILY");

  const [contactSearch, setContactSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

  const [loading, setLoading] = useState(true);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ queued: number; sent: number; failed: number } | null>(null);

  const isTemplateMode = mode !== "text";
  const scheduleIso = useMemo(() => toIso(scheduleAtLocal), [scheduleAtLocal]);
  const manualParsed = useMemo(() => parseNumbers(manualNumbersText), [manualNumbersText]);

  const optedInContacts = useMemo(() => contacts.filter((c) => c.optedIn), [contacts]);
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    for (const c of optedInContacts) for (const t of c.tags) if (t.trim()) tags.add(t.trim());
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [optedInContacts]);

  const filteredContacts = useMemo(() => {
    const q = contactSearch.trim().toLowerCase();
    let list = optedInContacts.filter((c) => {
      if (selectedTag !== "all" && !c.tags.includes(selectedTag)) return false;
      if (showSelectedOnly && !selectedContactIds.includes(c.id)) return false;
      if (!q) return true;
      return `${c.name ?? ""} ${c.phone} ${c.email ?? ""}`.toLowerCase().includes(q);
    });
    list = [...list].sort((a, b) => {
      if (sortMode === "name_asc") return (a.name || a.phone).localeCompare(b.name || b.phone);
      if (sortMode === "name_desc") return (b.name || b.phone).localeCompare(a.name || a.phone);
      return new Date(b.lastMessageAt || b.createdAt).getTime() - new Date(a.lastMessageAt || a.createdAt).getTime();
    });
    return list;
  }, [optedInContacts, contactSearch, selectedTag, showSelectedOnly, selectedContactIds, sortMode]);

  const selectedContacts = useMemo(() => {
    const map = new Map(contacts.map((c) => [c.id, c]));
    return selectedContactIds.map((id) => map.get(id)).filter((c): c is Contact => Boolean(c));
  }, [contacts, selectedContactIds]);
  const selectedPhones = useMemo(
    () => selectedContacts.map((c) => normalizePhone(c.phone)).filter(Boolean),
    [selectedContacts]
  );
  const recipientPhones = useMemo(
    () => Array.from(new Set([...selectedPhones, ...manualParsed.unique])),
    [selectedPhones, manualParsed.unique]
  );

  const templateNames = useMemo(() => {
    const set = new Set<string>();
    for (const t of templates) set.add(t.name);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [templates]);
  const templateLanguages = useMemo(() => {
    const set = new Set<string>();
    for (const t of templates) if (t.name === templateKey) set.add(t.language);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [templates, templateKey]);

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === selectedAccountId) || null,
    [accounts, selectedAccountId]
  );

  const canDispatch = useMemo(() => {
    if (!selectedAccountId || recipientPhones.length === 0) return false;
    if (mode === "text") return Boolean(text.trim());
    if (!templateKey || !templateLanguage) return false;
    if (mode === "template_scheduled") return Boolean(scheduleIso) && new Date(scheduleIso || "").getTime() > Date.now();
    if (mode === "template_recurring") return Boolean(recurringRule.trim());
    return true;
  }, [selectedAccountId, recipientPhones.length, mode, text, templateKey, templateLanguage, scheduleIso, recurringRule]);

  const filteredSelectedCount = useMemo(
    () => filteredContacts.filter((c) => selectedContactIds.includes(c.id)).length,
    [filteredContacts, selectedContactIds]
  );
  const allFilteredSelected = filteredContacts.length > 0 && filteredSelectedCount === filteredContacts.length;

  const loadWorkspace = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [accountsRes, contactsRes] = await Promise.all([
        fetch("/api/whatsapp/accounts", { credentials: "include", cache: "no-store" }),
        fetch("/api/whatsapp/contacts", { credentials: "include", cache: "no-store" }),
      ]);
      const [accountsJson, contactsJson] = await Promise.all([readJsonSafe(accountsRes), readJsonSafe(contactsRes)]);
      if (!accountsRes.ok || !accountsJson.success) throw new Error(asString(accountsJson.error) || "Failed to load accounts");
      if (!contactsRes.ok || !contactsJson.success) throw new Error(asString(contactsJson.error) || "Failed to load contacts");

      const nextAccounts: Account[] = asArray<Record<string, unknown>>(accountsJson.accounts).map((i) => ({
        id: asString(i.id),
        name: asString(i.name) || "WhatsApp Account",
        phoneNumber: asString(i.phoneNumber),
      }));
      const nextContacts: Contact[] = asArray<Record<string, unknown>>(contactsJson.contacts).map((i) => ({
        id: asString(i.id),
        name: asString(i.name) || null,
        phone: asString(i.phone),
        email: asString(i.email) || null,
        tags: asArray<unknown>(i.tags).map((t) => asString(t)).filter(Boolean),
        optedIn: Boolean(i.optedIn),
        lastMessageAt: asString(i.lastMessageAt) || null,
        createdAt: asString(i.createdAt),
      }));
      setAccounts(nextAccounts);
      setContacts(nextContacts);
      setSelectedAccountId((prev) => prev || (nextAccounts[0]?.id ?? ""));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workspace");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    const set = new Set(optedInContacts.map((c) => c.id));
    setSelectedContactIds((prev) => prev.filter((id) => set.has(id)));
  }, [optedInContacts]);

  useEffect(() => {
    if (!isTemplateMode || !selectedAccountId) {
      setTemplates([]);
      return;
    }
    let active = true;
    const run = async () => {
      try {
        setTemplateLoading(true);
        const res = await fetch(`/api/whatsapp/templates?accountId=${encodeURIComponent(selectedAccountId)}`, {
          credentials: "include",
          cache: "no-store",
        });
        const json = await readJsonSafe(res);
        if (!res.ok || !json.success) throw new Error(asString(json.error) || "Failed to load templates");
        const rows: Template[] = asArray<Record<string, unknown>>(json.templates).map((i) => ({
          name: asString(i.name),
          language: asString(i.language) || "en_US",
          status: asString(i.status) || "UNKNOWN",
          category: asString(i.category) || null,
        }));
        if (active) setTemplates(rows.filter((r) => r.name));
      } catch (err) {
        if (active) {
          setTemplates([]);
          setError(err instanceof Error ? err.message : "Template load failed");
        }
      } finally {
        if (active) setTemplateLoading(false);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [isTemplateMode, selectedAccountId]);

  useEffect(() => {
    if (!isTemplateMode) return;
    if (templateNames.length === 0) {
      setTemplateKey("");
      setTemplateLanguage("");
      return;
    }
    if (!templateNames.includes(templateKey)) setTemplateKey(templateNames[0]);
  }, [isTemplateMode, templateNames, templateKey]);

  useEffect(() => {
    if (!isTemplateMode) return;
    if (templateLanguages.length === 0) {
      setTemplateLanguage("");
      return;
    }
    if (!templateLanguages.includes(templateLanguage)) setTemplateLanguage(templateLanguages[0]);
  }, [isTemplateMode, templateLanguages, templateLanguage]);

  const onDispatch = async () => {
    try {
      setSending(true);
      setError(null);
      setNotice(null);
      setLastResult(null);
      if (!selectedAccountId) throw new Error("Please select account");
      if (recipientPhones.length === 0) throw new Error("Select recipients or add manual numbers");

      if (mode === "text") {
        if (!text.trim()) throw new Error("Text is required");
        const res = await fetch("/api/whatsapp/bulk", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId: selectedAccountId, contactIds: selectedContactIds, numbersText: manualNumbersText, text }),
        });
        const json = await readJsonSafe(res);
        if (!res.ok || !json.success) throw new Error(asString(json.error) || "Failed to queue text campaign");
        const queued = Number(json.queued || 0);
        setNotice(`Text campaign queued for ${queued} recipients.`);
        setLastResult({ queued, sent: 0, failed: 0 });
        return;
      }

      if (!templateKey || !templateLanguage) throw new Error("Template and language are required");
      const recurringEnabled = mode === "template_recurring";
      const scheduleEnabled = mode === "template_scheduled" || (recurringEnabled && Boolean(scheduleIso));
      if (mode === "template_scheduled" && !scheduleIso) throw new Error("Schedule time is required");
      if (mode === "template_scheduled" && new Date(scheduleIso || "").getTime() <= Date.now()) throw new Error("Schedule time must be in the future");
      if (recurringEnabled && !recurringRule.trim()) throw new Error("Recurring rule is required");

      const res = await fetch("/api/whatsapp/send-messages", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: selectedAccountId,
          templateKey,
          templateLanguage,
          numbersText: recipientPhones.join("\n"),
          scheduleEnabled,
          scheduleAt: scheduleEnabled ? scheduleIso : null,
          recurringEnabled,
          recurringRule: recurringEnabled ? recurringRule.trim() : null,
        }),
      });
      const json = await readJsonSafe(res);
      if (!res.ok || !json.success) throw new Error(asString(json.error) || "Template campaign failed");
      const queued = Number(json.queued || 0);
      const sent = Number(json.sent || 0);
      const failed = Number(json.failed || 0);
      setLastResult({ queued, sent, failed });
      setNotice(mode === "template_live" ? `Template dispatch complete: sent ${sent}, failed ${failed}.` : `Template campaign accepted. queued ${queued}, sent ${sent}, failed ${failed}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dispatch failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1680px] space-y-5 pb-8">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-100/60 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/4 h-72 w-72 rounded-full bg-cyan-100/60 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"><Sparkles className="h-3.5 w-3.5" />Multi-Mode Campaign Console</p>
            <h1 className="mt-3 text-2xl font-semibold text-slate-900 md:text-4xl">WhatsApp Bulk Messaging</h1>
            <p className="mt-2 text-sm text-slate-600">Text blasts, live template dispatch, scheduled campaigns, and recurring template jobs.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/whatsapp" className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Back to Hub</Link>
            <button type="button" onClick={() => void loadWorkspace()} className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><RefreshCcw className="h-4 w-4" />Reload</button>
          </div>
        </div>
      </section>

      {(notice || error) && (
        <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {notice ? <p className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{notice}</p> : null}
          {error ? <p className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p> : null}
        </section>
      )}

      {loading ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">Loading bulk workspace...</section>
      ) : (
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <p className="mb-3 text-sm font-semibold text-slate-900">Campaign Mode</p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {[
                  { key: "text", label: "Text Broadcast", icon: MessageSquareText },
                  { key: "template_live", label: "Template Broadcast", icon: FileText },
                  { key: "template_scheduled", label: "Scheduled Template", icon: CalendarClock },
                  { key: "template_recurring", label: "Recurring Template", icon: Repeat2 },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setMode(item.key as CampaignMode)}
                    className={`rounded-2xl border p-4 text-left transition ${mode === item.key ? "border-emerald-400 bg-emerald-50" : "border-slate-200 hover:bg-slate-50"}`}
                  >
                    <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900"><item.icon className="h-4 w-4 text-emerald-600" />{item.label}</p>
                  </button>
                ))}
              </div>
              <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">{modeHint(mode)}</p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <p className="mb-3 text-sm font-semibold text-slate-900">Campaign Setup</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-800">Sending Account *</span>
                  <select value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100">
                    <option value="">Select account</option>
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.phoneNumber})</option>)}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-800">Sort Contacts</span>
                  <select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)} className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100">
                    <option value="recent">Recent activity</option><option value="name_asc">Name A-Z</option><option value="name_desc">Name Z-A</option>
                  </select>
                </label>
              </div>

              {mode === "text" ? (
                <div className="mt-4 space-y-2">
                  <span className="text-sm font-medium text-slate-800">Campaign Text *</span>
                  <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder="Write your campaign message..." className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
                  <div className="flex flex-wrap gap-2">{quickSnippets.map((s) => <button key={s} type="button" onClick={() => setText((p) => (p.trim() ? `${p}\n${s}` : s))} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50">+ {s.slice(0, 26)}{s.length > 26 ? "..." : ""}</button>)}</div>
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-800">Template *</span>
                    <select value={templateKey} onChange={(e) => setTemplateKey(e.target.value)} disabled={templateLoading || templateNames.length === 0} className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100">
                      <option value="">{templateLoading ? "Loading templates..." : templateNames.length ? "Select template" : "No templates found"}</option>
                      {templateNames.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-800">Language *</span>
                    <select value={templateLanguage} onChange={(e) => setTemplateLanguage(e.target.value)} disabled={templateLanguages.length === 0} className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100">
                      <option value="">{templateLanguages.length ? "Select language" : "No languages"}</option>
                      {templateLanguages.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </label>
                  {(mode === "template_scheduled" || mode === "template_recurring") && (
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-800">{mode === "template_scheduled" ? "Schedule At *" : "Start At (optional)"}</span>
                      <input type="datetime-local" value={scheduleAtLocal} onChange={(e) => setScheduleAtLocal(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
                    </label>
                  )}
                  {mode === "template_recurring" && (
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-medium text-slate-800">Recurring Rule *</span>
                      <input value={recurringRule} onChange={(e) => setRecurringRule(e.target.value)} placeholder="FREQ=DAILY or FREQ=WEEKLY;BYDAY=MO,WE,FR" className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
                    </label>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900"><Users className="h-4 w-4 text-emerald-600" />Recipient Explorer</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setSelectedContactIds((prev) => allFilteredSelected ? prev.filter((id) => !filteredContacts.some((c) => c.id === id)) : Array.from(new Set([...prev, ...filteredContacts.map((c) => c.id)])))} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">{allFilteredSelected ? "Unselect Filtered" : "Select Filtered"}</button>
                  <button type="button" onClick={() => setSelectedContactIds([])} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Clear</button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                <label className="space-y-2"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Search</span><div className="flex items-center rounded-xl border border-slate-300 px-3"><Search className="h-4 w-4 text-slate-400" /><input value={contactSearch} onChange={(e) => setContactSearch(e.target.value)} placeholder="name, phone, email" className="w-full bg-transparent px-2 py-2.5 text-sm outline-none" /></div></label>
                <label className="space-y-2"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">View</span><button type="button" onClick={() => setShowSelectedOnly((p) => !p)} className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium ${showSelectedOnly ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}><Filter className="h-4 w-4" />{showSelectedOnly ? "Showing Selected" : "Show Selected Only"}</button></label>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500"><Tags className="h-3.5 w-3.5" />Tags</span>
                <button type="button" onClick={() => setSelectedTag("all")} className={`rounded-full px-2.5 py-1 text-xs font-medium ${selectedTag === "all" ? "bg-emerald-600 text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>All</button>
                {availableTags.map((t) => <button key={t} type="button" onClick={() => setSelectedTag(t)} className={`rounded-full px-2.5 py-1 text-xs font-medium ${selectedTag === t ? "bg-emerald-600 text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>{t}</button>)}
              </div>
              <div className="mt-4 max-h-[360px] overflow-y-auto rounded-2xl border border-slate-200">
                {filteredContacts.map((c) => {
                  const checked = selectedContactIds.includes(c.id);
                  return (
                    <label key={c.id} className={`flex cursor-pointer items-start gap-3 border-b border-slate-100 px-3 py-3 last:border-b-0 ${checked ? "bg-emerald-50/70" : "hover:bg-slate-50"}`}>
                      <input type="checkbox" checked={checked} onChange={() => setSelectedContactIds((p) => p.includes(c.id) ? p.filter((i) => i !== c.id) : [...p, c.id])} className="mt-1 h-4 w-4 rounded border-slate-300" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{c.name || c.phone}</p>
                        <p className="truncate text-xs text-slate-500">{c.phone} | Last: {formatWhen(c.lastMessageAt)}</p>
                      </div>
                    </label>
                  );
                })}
                {filteredContacts.length === 0 ? <div className="px-4 py-8 text-center text-sm text-slate-500">No contacts match filters.</div> : null}
              </div>
              <div className="mt-4 space-y-2">
                <span className="text-sm font-medium text-slate-800">Manual Numbers (optional)</span>
                <textarea value={manualNumbersText} onChange={(e) => setManualNumbersText(e.target.value)} rows={4} placeholder="+919876543210, +14155550123&#10;+447700900123" className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
                <p className="text-xs text-slate-500">Parsed {manualParsed.unique.length} unique ({manualParsed.duplicatesRemoved} duplicates removed)</p>
              </div>
            </div>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">Campaign Summary</p>
              <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                <p>Mode: <span className="font-semibold text-slate-800">{modeLabel(mode)}</span></p>
                <p>Account: {selectedAccount ? `${selectedAccount.name} (${selectedAccount.phoneNumber})` : "-"}</p>
                <p>Selected contacts: {selectedContactIds.length}</p>
                <p>Manual numbers: {manualParsed.unique.length}</p>
                <p>Total recipients: {recipientPhones.length}</p>
                {mode === "text" ? <p>Text chars: {text.length}</p> : null}
                {isTemplateMode ? <p>Template: {templateKey || "-"}</p> : null}
              </div>
              <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] text-slate-600">Status: <span className={canDispatch ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>{canDispatch ? "Ready" : "Action required"}</span></p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">Dispatch</p>
              <p className="mt-1 text-xs text-slate-500">{modeHint(mode)}</p>
              <button onClick={() => void onDispatch()} disabled={sending || !canDispatch} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
                {sending ? <Clock3 className="h-4 w-4 animate-pulse" /> : <SendHorizontal className="h-4 w-4" />}
                {sending ? "Processing..." : `Run ${modeLabel(mode)}`}
              </button>
            </div>

            {lastResult ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900">
                <p className="font-semibold">Last Result</p>
                <p className="mt-1">Queued: {lastResult.queued}</p><p>Sent: {lastResult.sent}</p><p>Failed: {lastResult.failed}</p>
              </div>
            ) : null}
          </aside>
        </section>
      )}
    </div>
  );
}
