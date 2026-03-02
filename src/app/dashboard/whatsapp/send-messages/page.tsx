"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileWarning,
  Hash,
  Layers3,
  RefreshCcw,
  SendHorizontal,
  Sparkles,
} from "lucide-react";

type WaAccount = {
  id: string;
  name: string;
  phoneNumber: string;
};

type SendResponse = {
  queued: number;
  sent: number;
  failed: number;
  totalInput: number;
  uniqueNumbers: number;
  duplicatesRemoved: number;
  status: string;
  warning?: string;
};

type SyncedTemplate = {
  name: string;
  language: string;
  status: string;
  category: string | null;
};

type TemplateOption = {
  value: string;
  name: string;
  language: string;
  label: string;
  source: "meta" | "fallback" | "custom";
};

type FailureEntry = {
  id: string;
  createdAt: string;
  templateKey: string;
  templateLanguage: string | null;
  failed: number;
  reason: string;
};

const CUSTOM_TEMPLATE_VALUE = "__custom__";

const fallbackTemplateOptions: TemplateOption[] = [
  {
    value: "hello_world::en_US",
    name: "hello_world",
    language: "en_US",
    label: "hello_world (en_US) - Default",
    source: "fallback",
  },
  {
    value: "utility_update_v1::en_US",
    name: "utility_update_v1",
    language: "en_US",
    label: "utility_update_v1 (en_US)",
    source: "fallback",
  },
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

function normalizePhone(raw: string) {
  return raw.trim().replace(/[^\d+]/g, "");
}

function dedupeNumbers(input: string) {
  const lines = input
    .split(/\r?\n/g)
    .map((line) => normalizePhone(line))
    .filter(Boolean);
  const unique = Array.from(new Set(lines));
  return {
    uniqueText: unique.join("\n"),
    inputCount: lines.length,
    uniqueCount: unique.length,
    duplicatesRemoved: lines.length - unique.length,
  };
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

export default function WhatsAppSendMessagesPage() {
  const [accounts, setAccounts] = useState<WaAccount[]>([]);
  const [accountId, setAccountId] = useState("");
  const [selectedTemplateValue, setSelectedTemplateValue] = useState("hello_world::en_US");
  const [customTemplateKey, setCustomTemplateKey] = useState("");
  const [templateLanguage, setTemplateLanguage] = useState("en_US");
  const [numbersText, setNumbersText] = useState("");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");
  const [recurringEnabled, setRecurringEnabled] = useState(false);
  const [recurringRule, setRecurringRule] = useState("daily");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SendResponse | null>(null);

  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [syncedTemplates, setSyncedTemplates] = useState<SyncedTemplate[]>([]);

  const [failuresLoading, setFailuresLoading] = useState(false);
  const [failureEntries, setFailureEntries] = useState<FailureEntry[]>([]);

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === accountId) || null,
    [accounts, accountId]
  );

  const stats = useMemo(() => dedupeNumbers(numbersText), [numbersText]);

  const templateOptions = useMemo(() => {
    const map = new Map<string, TemplateOption>();

    for (const template of syncedTemplates) {
      const value = `${template.name}::${template.language}`;
      map.set(value, {
        value,
        name: template.name,
        language: template.language,
        label: `${template.name} (${template.language}) - ${template.status.toLowerCase()}`,
        source: "meta",
      });
    }

    for (const fallback of fallbackTemplateOptions) {
      if (!map.has(fallback.value)) {
        map.set(fallback.value, fallback);
      }
    }

    return [
      ...Array.from(map.values()),
      {
        value: CUSTOM_TEMPLATE_VALUE,
        name: CUSTOM_TEMPLATE_VALUE,
        language: templateLanguage,
        label: "Custom Template Name",
        source: "custom",
      } satisfies TemplateOption,
    ];
  }, [syncedTemplates, templateLanguage]);

  const selectedTemplateOption = useMemo(
    () => templateOptions.find((template) => template.value === selectedTemplateValue) || null,
    [templateOptions, selectedTemplateValue]
  );

  const usingCustomTemplate = selectedTemplateValue === CUSTOM_TEMPLATE_VALUE;

  const resolvedTemplateKey = useMemo(() => {
    if (usingCustomTemplate) {
      return customTemplateKey.trim();
    }
    return selectedTemplateOption?.name || "";
  }, [usingCustomTemplate, customTemplateKey, selectedTemplateOption]);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/whatsapp/accounts", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await readJsonSafe(res);

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load WhatsApp accounts");
      }

      const next = (data.accounts || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        phoneNumber: item.phoneNumber,
      }));

      setAccounts(next);
      if (next.length > 0) {
        setAccountId((prev) => prev || next[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  };

  const loadSyncedTemplates = async (targetAccountId: string) => {
    if (!targetAccountId) return;

    try {
      setTemplatesLoading(true);
      setTemplatesError(null);

      const res = await fetch(
        `/api/whatsapp/templates?accountId=${encodeURIComponent(targetAccountId)}`,
        {
          credentials: "include",
          cache: "no-store",
        }
      );
      const data = await readJsonSafe(res);

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to sync templates");
      }

      setSyncedTemplates(Array.isArray(data.templates) ? data.templates : []);
    } catch (err) {
      setSyncedTemplates([]);
      setTemplatesError(err instanceof Error ? err.message : "Failed to sync templates");
    } finally {
      setTemplatesLoading(false);
    }
  };

  const loadFailures = async () => {
    try {
      setFailuresLoading(true);

      const res = await fetch("/api/whatsapp/send-messages/failures", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await readJsonSafe(res);

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load recent failures");
      }

      setFailureEntries(Array.isArray(data.failures) ? data.failures : []);
    } catch {
      setFailureEntries([]);
    } finally {
      setFailuresLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
    loadFailures();
  }, []);

  useEffect(() => {
    if (!accountId) {
      setSyncedTemplates([]);
      return;
    }
    loadSyncedTemplates(accountId);
  }, [accountId]);

  useEffect(() => {
    if (templateOptions.some((template) => template.value === selectedTemplateValue)) {
      return;
    }

    const firstTemplate = templateOptions[0];
    if (!firstTemplate) return;

    setSelectedTemplateValue(firstTemplate.value);
    if (firstTemplate.value !== CUSTOM_TEMPLATE_VALUE) {
      setTemplateLanguage(firstTemplate.language);
    }
  }, [templateOptions, selectedTemplateValue]);

  const handleTemplateSelection = (value: string) => {
    setSelectedTemplateValue(value);
    if (value === CUSTOM_TEMPLATE_VALUE) {
      return;
    }

    const option = templateOptions.find((template) => template.value === value);
    if (option?.language) {
      setTemplateLanguage(option.language);
    }
  };

  const handleRemoveDuplicate = () => {
    const next = dedupeNumbers(numbersText);
    setNumbersText(next.uniqueText);
    setMessage(`Removed ${next.duplicatesRemoved} duplicate numbers.`);
    setError(null);
  };

  const handleSend = async () => {
    try {
      setSending(true);
      setError(null);
      setMessage(null);
      setResult(null);

      if (!accountId) {
        throw new Error("Please select a device");
      }
      if (!resolvedTemplateKey) {
        throw new Error("Please select template");
      }
      if (!numbersText.trim()) {
        throw new Error("Please enter WhatsApp numbers");
      }

      if (scheduleEnabled && !scheduleAt) {
        throw new Error("Please select schedule date/time");
      }

      const res = await fetch("/api/whatsapp/send-messages", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          templateKey: resolvedTemplateKey,
          templateLanguage,
          numbersText,
          scheduleEnabled,
          scheduleAt: scheduleEnabled ? scheduleAt : null,
          recurringEnabled,
          recurringRule: recurringEnabled ? recurringRule : null,
        }),
      });
      const data = await readJsonSafe(res);

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to queue send messages");
      }

      setResult({
        queued: data.queued,
        sent: data.sent || 0,
        failed: data.failed || 0,
        totalInput: data.totalInput,
        uniqueNumbers: data.uniqueNumbers,
        duplicatesRemoved: data.duplicatesRemoved,
        status: data.status,
        warning: data.warning || undefined,
      });
      if (data.status === "sent" || data.status === "partial_failed") {
        setMessage(`Dispatch complete: sent ${data.sent || 0}, failed ${data.failed || 0}.`);
      } else {
        setMessage(`Messages queued successfully (${data.queued}).`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
      loadFailures();
    }
  };

  const canDispatch = Boolean(
    accountId &&
      resolvedTemplateKey &&
      stats.uniqueCount > 0 &&
      (!scheduleEnabled || (scheduleEnabled && scheduleAt))
  );

  const templateSourceLabel = usingCustomTemplate
    ? "Custom"
    : selectedTemplateOption?.source === "meta"
      ? "Synced"
      : "Default";

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-100/60 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-emerald-100/50 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              <Sparkles className="h-3.5 w-3.5" />
              WhatsApp Dispatch Studio
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-slate-900 md:text-4xl">Send Messages</h1>
            <p className="mt-2 text-sm text-slate-600">
              Build, schedule and dispatch WhatsApp template campaigns with account-level controls.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              <Link href="/dashboard" className="hover:underline">
                Dashboard
              </Link>{" "}
              / WhatsApp Hub / Send Messages
            </p>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:max-w-[470px] sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white/95 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Devices</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{accounts.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white/95 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Templates</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{syncedTemplates.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white/95 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Unique</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{stats.uniqueCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white/95 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Duplicates</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{stats.duplicatesRemoved}</p>
            </div>
          </div>
        </div>
      </section>

      {(message || error) && (
        <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {message ? (
            <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              {message}
            </p>
          ) : null}
          {error ? (
            <p className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <AlertCircle className="h-4 w-4" />
              {error}
            </p>
          ) : null}
        </section>
      )}

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_370px]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          {loading ? (
            <p className="text-sm text-slate-600">Loading devices...</p>
          ) : (
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 md:p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Layers3 className="h-4 w-4 text-indigo-600" />
                    Campaign Setup
                  </p>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                    Template Source: {templateSourceLabel}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-800">Select Device *</span>
                    <select
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    >
                      <option value="">Select Device</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name} ({account.phoneNumber})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-800">Select Template *</span>
                    <select
                      value={selectedTemplateValue}
                      onChange={(e) => handleTemplateSelection(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    >
                      {templateOptions.map((template) => (
                        <option key={template.value} value={template.value}>
                          {template.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span>
                    {templatesLoading
                      ? "Syncing templates from Meta..."
                      : `Synced templates: ${syncedTemplates.length}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => accountId && loadSyncedTemplates(accountId)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    <RefreshCcw className="h-3 w-3" />
                    Refresh Templates
                  </button>
                  {templatesError ? <span className="text-amber-700">{templatesError}</span> : null}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_280px]">
                {usingCustomTemplate ? (
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-800">Custom Template Name *</span>
                    <input
                      value={customTemplateKey}
                      onChange={(e) => setCustomTemplateKey(e.target.value)}
                      placeholder="exact_meta_template_name"
                      className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />
                  </label>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                    Selected template key:{" "}
                    <span className="font-semibold text-slate-800">{resolvedTemplateKey || "-"}</span>
                  </div>
                )}

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-800">Template Language</span>
                  <input
                    value={templateLanguage}
                    onChange={(e) => setTemplateLanguage(e.target.value)}
                    placeholder="en_US"
                    className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 md:p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Hash className="h-4 w-4 text-indigo-600" />
                    WhatsApp Numbers
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRemoveDuplicate}
                      type="button"
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      Remove Duplicates
                    </button>
                    <button
                      onClick={() => setNumbersText("")}
                      type="button"
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <textarea
                  value={numbersText}
                  onChange={(e) => setNumbersText(e.target.value)}
                  rows={7}
                  placeholder="One number per line (E.164 recommended, e.g. +919876543210)"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600">
                  <span className="rounded-full bg-slate-100 px-2 py-1">Total: {stats.inputCount}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-1">Unique: {stats.uniqueCount}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-1">
                    Duplicates: {stats.duplicatesRemoved}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 md:grid-cols-2 md:p-5">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-800">Schedule Message</span>
                  <select
                    value={scheduleEnabled ? "yes" : "no"}
                    onChange={(e) => setScheduleEnabled(e.target.value === "yes")}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-800">Recurring Job</span>
                  <select
                    value={recurringEnabled ? "yes" : "no"}
                    onChange={(e) => setRecurringEnabled(e.target.value === "yes")}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </label>

                {scheduleEnabled ? (
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-medium text-slate-800">Schedule Date & Time</span>
                    <input
                      type="datetime-local"
                      value={scheduleAt}
                      onChange={(e) => setScheduleAt(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 md:max-w-[360px]"
                    />
                  </label>
                ) : null}

                {recurringEnabled ? (
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-medium text-slate-800">Recurring Rule</span>
                    <select
                      value={recurringRule}
                      onChange={(e) => setRecurringRule(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 md:max-w-[280px]"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </label>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <div className="text-xs text-slate-600">
                  <p className="font-semibold text-slate-800">Readiness Check</p>
                  <p>
                    {canDispatch
                      ? "All required fields are ready for dispatch."
                      : "Choose device/template and add numbers to enable send."}
                  </p>
                </div>
                <button
                  onClick={handleSend}
                  disabled={sending || !canDispatch}
                  className="inline-flex min-w-[160px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sending ? <Clock3 className="h-4 w-4 animate-pulse" /> : <SendHorizontal className="h-4 w-4" />}
                  {sending ? "Sending..." : "Send Message"}
                </button>
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="bg-[radial-gradient(circle_at_0%_0%,rgba(15,23,42,0.08),transparent_42%),radial-gradient(circle_at_100%_100%,rgba(79,70,229,0.15),transparent_42%)] p-5">
              <div className="rounded-2xl border border-white/60 bg-white/90 p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">Dispatch Preview</p>
                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <p>Device: {selectedAccount ? `${selectedAccount.name} (${selectedAccount.phoneNumber})` : "-"}</p>
                  <p>Template: {resolvedTemplateKey || "-"} ({templateLanguage || "-"})</p>
                  <p>Numbers: {stats.uniqueCount}</p>
                  <p>Schedule: {scheduleEnabled ? scheduleAt || "Pending date/time" : "No"}</p>
                  <p>Recurring: {recurringEnabled ? recurringRule : "No"}</p>
                </div>
                <div className="mt-3 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] text-slate-600">
                  Status:{" "}
                  <span
                    className={
                      canDispatch
                        ? "font-semibold text-emerald-700"
                        : "font-semibold text-amber-700"
                    }
                  >
                    {canDispatch ? "Ready to dispatch" : "Action required"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {result ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900">
              <p className="font-semibold">Dispatch Result</p>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                <p>Input: {result.totalInput}</p>
                <p>Unique: {result.uniqueNumbers}</p>
                <p>Removed: {result.duplicatesRemoved}</p>
                <p>Queued: {result.queued}</p>
                <p>Sent: {result.sent}</p>
                <p>Failed: {result.failed}</p>
              </div>
              <p className="mt-2">Status: {result.status}</p>
              {result.warning ? <p className="mt-1 text-amber-700">Warning: {result.warning}</p> : null}
            </div>
          ) : null}

          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900">
            <p className="inline-flex items-center gap-1 font-semibold">
              <FileWarning className="h-3.5 w-3.5" />
              Recent Failed Dispatches
            </p>
            {failuresLoading ? (
              <p className="mt-2 text-rose-700">Loading...</p>
            ) : failureEntries.length === 0 ? (
              <p className="mt-2 text-rose-700">No recent failures.</p>
            ) : (
              <div className="mt-2 max-h-[320px] space-y-2 overflow-y-auto pr-1">
                {failureEntries.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-rose-200 bg-white p-2.5">
                    <p className="font-medium text-rose-900">
                      {entry.templateKey}
                      {entry.templateLanguage ? ` (${entry.templateLanguage})` : ""}
                    </p>
                    <p className="mt-0.5 text-rose-700">Failed: {entry.failed}</p>
                    <p className="mt-0.5 text-rose-700">Reason: {entry.reason}</p>
                    <p className="mt-0.5 text-rose-700">{formatDateTime(entry.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}
