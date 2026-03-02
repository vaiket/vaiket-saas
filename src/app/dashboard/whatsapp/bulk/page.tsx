"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Filter,
  MessageSquareText,
  RefreshCcw,
  Search,
  SendHorizontal,
  Sparkles,
  Tags,
  Users,
} from "lucide-react";

type Account = {
  id: string;
  name: string;
  phoneNumber: string;
};

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

type SortMode = "recent" | "name_asc" | "name_desc";

const quickSnippets = [
  "Hello! We have an update for you.",
  "Your plan renewal reminder is here.",
  "Thanks for staying with us. Need any help?",
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

function formatWhen(value: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
}

export default function WhatsAppBulkPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [queuedCount, setQueuedCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const optedInContacts = useMemo(
    () => contacts.filter((contact) => contact.optedIn),
    [contacts]
  );

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    for (const contact of optedInContacts) {
      for (const tag of contact.tags || []) {
        if (tag.trim()) tags.add(tag.trim());
      }
    }
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [optedInContacts]);

  const filteredContacts = useMemo(() => {
    const q = contactSearch.trim().toLowerCase();
    let list = optedInContacts.filter((contact) => {
      if (selectedTag !== "all" && !(contact.tags || []).includes(selectedTag)) {
        return false;
      }
      if (showSelectedOnly && !selectedContactIds.includes(contact.id)) {
        return false;
      }
      if (!q) return true;

      const target = `${contact.name ?? ""} ${contact.phone} ${contact.email ?? ""}`.toLowerCase();
      return target.includes(q);
    });

    list = [...list].sort((a, b) => {
      if (sortMode === "name_asc") {
        return (a.name || a.phone).localeCompare(b.name || b.phone);
      }
      if (sortMode === "name_desc") {
        return (b.name || b.phone).localeCompare(a.name || a.phone);
      }

      const aTime = new Date(a.lastMessageAt || a.createdAt).getTime();
      const bTime = new Date(b.lastMessageAt || b.createdAt).getTime();
      return bTime - aTime;
    });

    return list;
  }, [optedInContacts, contactSearch, selectedTag, showSelectedOnly, selectedContactIds, sortMode]);

  const selectedContacts = useMemo(() => {
    const map = new Map(contacts.map((contact) => [contact.id, contact]));
    return selectedContactIds
      .map((id) => map.get(id))
      .filter((contact): contact is Contact => Boolean(contact));
  }, [selectedContactIds, contacts]);

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId) || null,
    [accounts, selectedAccountId]
  );

  const filteredSelectedCount = useMemo(
    () => filteredContacts.filter((contact) => selectedContactIds.includes(contact.id)).length,
    [filteredContacts, selectedContactIds]
  );

  const allFilteredSelected =
    filteredContacts.length > 0 && filteredSelectedCount === filteredContacts.length;

  const canQueue = Boolean(selectedAccountId && text.trim() && selectedContactIds.length > 0);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const [accountsRes, contactsRes] = await Promise.all([
        fetch("/api/whatsapp/accounts", { credentials: "include", cache: "no-store" }),
        fetch("/api/whatsapp/contacts", { credentials: "include", cache: "no-store" }),
      ]);

      const [accountsData, contactsData] = await Promise.all([
        readJsonSafe(accountsRes),
        readJsonSafe(contactsRes),
      ]);

      if (!accountsRes.ok || !accountsData.success) {
        throw new Error(accountsData.error || "Failed to load accounts");
      }
      if (!contactsRes.ok || !contactsData.success) {
        throw new Error(contactsData.error || "Failed to load contacts");
      }

      const nextAccounts = (accountsData.accounts || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        phoneNumber: item.phoneNumber,
      }));

      const nextContacts = (contactsData.contacts || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        phone: item.phone,
        email: item.email || null,
        tags: Array.isArray(item.tags) ? item.tags : [],
        optedIn: Boolean(item.optedIn),
        lastMessageAt: item.lastMessageAt || null,
        createdAt: item.createdAt,
      }));

      setAccounts(nextAccounts);
      setContacts(nextContacts);

      if (!selectedAccountId && nextAccounts.length > 0) {
        setSelectedAccountId(nextAccounts[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bulk form");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const optedInSet = new Set(optedInContacts.map((contact) => contact.id));
    setSelectedContactIds((prev) => prev.filter((id) => optedInSet.has(id)));
  }, [optedInContacts]);

  const toggleContact = (contactId: string) => {
    setSelectedContactIds((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId]
    );
  };

  const toggleFilteredSelection = () => {
    const filteredIds = filteredContacts.map((contact) => contact.id);
    setSelectedContactIds((prev) => {
      if (filteredIds.length === 0) return prev;

      if (allFilteredSelected) {
        return prev.filter((id) => !filteredIds.includes(id));
      }

      const next = new Set(prev);
      for (const id of filteredIds) {
        next.add(id);
      }
      return Array.from(next);
    });
  };

  const clearSelection = () => {
    setSelectedContactIds([]);
  };

  const applySnippet = (snippet: string) => {
    setText((prev) => (prev.trim() ? `${prev}\n${snippet}` : snippet));
  };

  const onSend = async () => {
    try {
      setSending(true);
      setError(null);
      setMessage(null);
      setQueuedCount(null);

      if (!selectedAccountId) {
        throw new Error("Please select sending account");
      }
      if (!selectedContactIds.length) {
        throw new Error("Please select at least one recipient");
      }
      if (!text.trim()) {
        throw new Error("Campaign message is required");
      }

      const res = await fetch("/api/whatsapp/bulk", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: selectedAccountId,
          contactIds: selectedContactIds,
          text,
        }),
      });
      const data = await readJsonSafe(res);

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to queue bulk campaign");
      }

      setQueuedCount(data.queued || 0);
      setMessage(`Bulk queue created for ${data.queued} contacts.`);
      setText("");
      setSelectedContactIds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk send failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-100/60 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-emerald-100/50 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              <Sparkles className="h-3.5 w-3.5" />
              Campaign Broadcast Studio
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-slate-900 md:text-4xl">WhatsApp Bulk Messaging</h1>
            <p className="mt-2 text-sm text-slate-600">
              Create high-volume outbound campaigns to opted-in contacts with filter, segment and queue controls.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              <Link href="/dashboard" className="hover:underline">
                Dashboard
              </Link>{" "}
              / WhatsApp Hub / Bulk Messaging
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/whatsapp"
              className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Back to Hub
            </Link>
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCcw className="h-4 w-4" />
              Reload
            </button>
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

      {loading ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Loading bulk module...
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_370px]">
          <div className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <MessageSquareText className="h-4 w-4 text-indigo-600" />
                  Campaign Setup
                </p>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                  Character Count: {text.length}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-800">Sending Account *</span>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="">Select account</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({account.phoneNumber})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-800">Sort Contacts</span>
                  <select
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value as SortMode)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="recent">Recent activity</option>
                    <option value="name_asc">Name A-Z</option>
                    <option value="name_desc">Name Z-A</option>
                  </select>
                </label>
              </div>

              <div className="mt-4 space-y-2">
                <span className="text-sm font-medium text-slate-800">Campaign Message *</span>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={5}
                  placeholder="Write your campaign message..."
                  className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
                <div className="flex flex-wrap items-center gap-2">
                  {quickSnippets.map((snippet) => (
                    <button
                      key={snippet}
                      type="button"
                      onClick={() => applySnippet(snippet)}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      + {snippet.slice(0, 24)}
                      {snippet.length > 24 ? "..." : ""}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Users className="h-4 w-4 text-indigo-600" />
                  Recipient Explorer
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleFilteredSelection}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    {allFilteredSelected ? "Unselect Filtered" : "Select Filtered"}
                  </button>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Search Contact</span>
                  <div className="flex items-center rounded-xl border border-slate-300 bg-white px-3">
                    <Search className="h-4 w-4 text-slate-400" />
                    <input
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                      placeholder="Search by name, phone or email"
                      className="w-full bg-transparent px-2 py-2.5 text-sm outline-none"
                    />
                  </div>
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">View Mode</span>
                  <button
                    type="button"
                    onClick={() => setShowSelectedOnly((prev) => !prev)}
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                      showSelectedOnly
                        ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Filter className="h-4 w-4" />
                    {showSelectedOnly ? "Showing Selected" : "Show Selected Only"}
                  </button>
                </label>
              </div>

              <div className="mt-3">
                <p className="mb-2 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Tags className="h-3.5 w-3.5" />
                  Tag Filter
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTag("all")}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                      selectedTag === "all"
                        ? "bg-indigo-600 text-white"
                        : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    All
                  </button>
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSelectedTag(tag)}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                        selectedTag === tag
                          ? "bg-indigo-600 text-white"
                          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                  {availableTags.length === 0 ? (
                    <span className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-500">
                      No tags
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 max-h-[450px] overflow-y-auto rounded-2xl border border-slate-200">
                {filteredContacts.map((contact) => {
                  const checked = selectedContactIds.includes(contact.id);
                  return (
                    <label
                      key={contact.id}
                      className={`flex cursor-pointer items-start gap-3 border-b border-slate-100 px-3 py-3 transition last:border-b-0 ${
                        checked ? "bg-emerald-50/60" : "hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleContact(contact.id)}
                        className="mt-1 h-4 w-4 rounded border-slate-300"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {contact.name || contact.phone}
                          </p>
                          <span className="text-xs text-slate-500">{contact.phone}</span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {contact.email || "No email"} | Last: {formatWhen(contact.lastMessageAt)}
                        </p>
                        {contact.tags.length > 0 ? (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {contact.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </label>
                  );
                })}
                {filteredContacts.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-slate-500">
                    No opted-in contacts match your filters.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div className="text-xs text-slate-600">
                <p className="font-semibold text-slate-800">Queue Readiness</p>
                <p>
                  {canQueue
                    ? "Campaign is ready to queue."
                    : "Select account, write message, and choose recipients."}
                </p>
              </div>
              <button
                onClick={onSend}
                disabled={sending || !canQueue}
                className="inline-flex min-w-[190px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? <Clock3 className="h-4 w-4 animate-pulse" /> : <SendHorizontal className="h-4 w-4" />}
                {sending ? "Queueing..." : "Queue Bulk Campaign"}
              </button>
            </div>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="bg-[radial-gradient(circle_at_0%_0%,rgba(15,23,42,0.08),transparent_42%),radial-gradient(circle_at_100%_100%,rgba(79,70,229,0.15),transparent_42%)] p-5">
                <div className="rounded-2xl border border-white/60 bg-white/90 p-4 shadow-sm">
                  <p className="text-sm font-semibold text-slate-900">Campaign Summary</p>
                  <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                    <p>Account: {selectedAccount ? `${selectedAccount.name} (${selectedAccount.phoneNumber})` : "-"}</p>
                    <p>Opted-in Contacts: {optedInContacts.length}</p>
                    <p>Filtered Contacts: {filteredContacts.length}</p>
                    <p>Selected Recipients: {selectedContactIds.length}</p>
                    <p>Message Characters: {text.length}</p>
                  </div>
                  <div className="mt-3 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] text-slate-600">
                    Status:{" "}
                    <span className={canQueue ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>
                      {canQueue ? "Ready to queue" : "Action required"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {queuedCount !== null ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900">
                <p className="font-semibold">Last Queue Result</p>
                <p className="mt-1">Queued recipients: {queuedCount}</p>
              </div>
            ) : null}

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">Selected Recipients</p>
              <div className="mt-2 max-h-[280px] space-y-2 overflow-y-auto pr-1">
                {selectedContacts.slice(0, 50).map((contact) => (
                  <div key={contact.id} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
                    <p className="truncate text-xs font-semibold text-slate-900">{contact.name || contact.phone}</p>
                    <p className="truncate text-[11px] text-slate-600">{contact.phone}</p>
                  </div>
                ))}
                {selectedContacts.length > 50 ? (
                  <p className="text-[11px] text-slate-500">+{selectedContacts.length - 50} more selected</p>
                ) : null}
                {selectedContacts.length === 0 ? (
                  <p className="text-xs text-slate-500">No recipients selected yet.</p>
                ) : null}
              </div>
            </div>
          </aside>
        </section>
      )}
    </div>
  );
}
