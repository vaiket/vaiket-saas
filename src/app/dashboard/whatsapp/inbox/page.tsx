"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCheck,
  Clock3,
  Loader2,
  RefreshCcw,
  Search,
  SendHorizontal,
  UserCircle2,
} from "lucide-react";

type Conversation = {
  id: string;
  status: string;
  lastMessageAt: string | null;
  account: { id: string; name: string; phoneNumber: string };
  contact: {
    id: string;
    name: string | null;
    phone: string;
    email: string | null;
    address: string | null;
    source: string | null;
    tags: string[];
    optedIn: boolean;
  };
  messages: Array<{ id: string; direction: string; text: string | null; status: string; createdAt: string }>;
};

type Message = {
  id: string;
  direction: string;
  messageType: string;
  text: string | null;
  status: string;
  providerMessageId: string | null;
  createdAt: string;
  deliveredAt: string | null;
  readAt: string | null;
};

type AccountOption = { id: string; name: string; phoneNumber: string };

type ContactForm = { name: string; email: string; address: string; tags: string; optedIn: boolean };

type MobileView = "list" | "chat" | "profile";

async function readJsonSafe(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function toContactForm(contact: Conversation["contact"]): ContactForm {
  return {
    name: contact.name || "",
    email: contact.email || "",
    address: contact.address || "",
    tags: contact.tags.join(", "),
    optedIn: contact.optedIn,
  };
}

function statusIconColor(status: string) {
  const value = status.trim().toLowerCase();
  if (value === "read") return "text-sky-500";
  if (value === "delivered") return "text-emerald-500";
  if (value === "failed") return "text-rose-500";
  if (value === "processing") return "text-amber-500";
  return "text-slate-400";
}

function conversationStatusClass(status: string) {
  const value = status.trim().toLowerCase();
  if (value === "active") return "bg-emerald-500/15 text-emerald-700";
  if (value === "closed") return "bg-slate-500/15 text-slate-700";
  return "bg-indigo-500/15 text-indigo-700";
}

function formatChatTime(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const sameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  return sameDay
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function initials(name: string | null | undefined, phone: string) {
  const label = (name || phone || "WA").trim();
  const parts = label.split(/\s+/).slice(0, 2);
  return parts.map((x) => x.charAt(0).toUpperCase()).join("") || "WA";
}

function conversationPreview(item: Conversation) {
  const text = item.messages[0]?.text || "No messages yet";
  return text.length > 64 ? `${text.slice(0, 64)}...` : text;
}

function OutboundStatus({ status }: { status: string }) {
  const normalized = status.trim().toLowerCase();
  if (normalized === "read" || normalized === "delivered") {
    return <CheckCheck className={`h-3.5 w-3.5 ${statusIconColor(status)}`} />;
  }
  if (normalized === "sent") return <Check className={`h-3.5 w-3.5 ${statusIconColor(status)}`} />;
  if (normalized === "failed") return <AlertTriangle className={`h-3.5 w-3.5 ${statusIconColor(status)}`} />;
  return <Clock3 className={`h-3.5 w-3.5 ${statusIconColor(status)}`} />;
}

export default function WhatsAppInboxPage() {
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("all");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [mobileView, setMobileView] = useState<MobileView>("list");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactMessage, setContactMessage] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState<ContactForm>({
    name: "",
    email: "",
    address: "",
    tags: "",
    optedIn: true,
  });
  const [contactFormConversationId, setContactFormConversationId] = useState("");

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );

  const filteredConversations = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return conversations;
    return conversations.filter((item) => {
      const name = (item.contact.name || "").toLowerCase();
      const phone = item.contact.phone.toLowerCase();
      const account = item.account.name.toLowerCase();
      const preview = (item.messages[0]?.text || "").toLowerCase();
      return name.includes(value) || phone.includes(value) || account.includes(value) || preview.includes(value);
    });
  }, [conversations, query]);

  const loadAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/accounts", { credentials: "include", cache: "no-store" });
      const data = await readJsonSafe(res);
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load accounts");
      const next = (data.accounts || []) as AccountOption[];
      setAccounts(next);
      if (next.length === 0) setSelectedAccountId("all");
    } catch {
      setAccounts([]);
    }
  }, []);

  const loadConversations = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = Boolean(opts?.silent);
      try {
        if (!silent) {
          setLoadingConversations(true);
          setError(null);
        }
        const q = new URLSearchParams();
        if (selectedAccountId !== "all") q.set("accountId", selectedAccountId);
        const endpoint = q.toString() ? `/api/whatsapp/inbox/conversations?${q.toString()}` : "/api/whatsapp/inbox/conversations";
        const res = await fetch(endpoint, { credentials: "include", cache: "no-store" });
        const data = await readJsonSafe(res);
        if (!res.ok || !data.success) throw new Error(data.error || "Failed to load conversations");
        const next = (data.conversations || []) as Conversation[];
        setConversations(next);
        setSelectedConversationId((prev) => {
          if (next.length === 0) return "";
          if (prev && next.some((item) => item.id === prev)) return prev;
          return next[0].id;
        });
      } catch (err) {
        if (!silent) setError(err instanceof Error ? err.message : "Failed to load conversations");
      } finally {
        if (!silent) setLoadingConversations(false);
      }
    },
    [selectedAccountId]
  );

  const loadMessages = useCallback(async (conversationId: string, opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent);
    try {
      if (!conversationId) return;
      if (!silent) {
        setLoadingMessages(true);
        setError(null);
      }
      const endpoint = `/api/whatsapp/inbox/messages?conversationId=${encodeURIComponent(conversationId)}`;
      const res = await fetch(endpoint, { credentials: "include", cache: "no-store" });
      const data = await readJsonSafe(res);
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load messages");
      setMessages((data.messages || []) as Message[]);
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : "Failed to load messages");
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }
    void loadMessages(selectedConversationId);
  }, [selectedConversationId, loadMessages]);

  useEffect(() => {
    if (!selectedConversationId) {
      setContactFormConversationId("");
      setContactForm({ name: "", email: "", address: "", tags: "", optedIn: true });
      setContactMessage(null);
      setContactError(null);
      return;
    }
    if (contactFormConversationId === selectedConversationId) return;
    const current = conversations.find((item) => item.id === selectedConversationId);
    if (!current) return;
    setContactFormConversationId(selectedConversationId);
    setContactForm(toContactForm(current.contact));
    setContactMessage(null);
    setContactError(null);
  }, [selectedConversationId, conversations, contactFormConversationId]);

  useEffect(() => {
    const timer = window.setInterval(() => void loadConversations({ silent: true }), 8000);
    return () => window.clearInterval(timer);
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedConversationId) return;
    const timer = window.setInterval(() => void loadMessages(selectedConversationId, { silent: true }), 8000);
    return () => window.clearInterval(timer);
  }, [selectedConversationId, loadMessages]);

  const onSend = async () => {
    try {
      if (!selectedConversationId || !text.trim()) return;
      setSending(true);
      setError(null);
      const res = await fetch("/api/whatsapp/inbox/messages", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: selectedConversationId, text }),
      });
      const data = await readJsonSafe(res);
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to send message");
      setText("");
      await Promise.all([loadMessages(selectedConversationId), loadConversations()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  };

  const onSaveContact = async () => {
    try {
      if (!selectedConversation) return;
      setSavingContact(true);
      setContactError(null);
      setContactMessage(null);
      const tags = contactForm.tags.split(",").map((item) => item.trim()).filter(Boolean);
      const endpoint = `/api/whatsapp/contacts/${selectedConversation.contact.id}`;
      const res = await fetch(endpoint, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: contactForm.name,
          email: contactForm.email,
          address: contactForm.address,
          tags,
          optedIn: contactForm.optedIn,
        }),
      });
      const data = await readJsonSafe(res);
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to save contact details");
      setContactForm(toContactForm(data.contact as Conversation["contact"]));
      setContactMessage("Contact details updated.");
      await loadConversations();
    } catch (err) {
      setContactError(err instanceof Error ? err.message : "Contact save failed");
    } finally {
      setSavingContact(false);
    }
  };

  const selectConversation = (id: string) => {
    setSelectedConversationId(id);
    setMobileView("chat");
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">WhatsApp Inbox</h1>
            <p className="mt-1 text-sm text-slate-600">Shared inbox with live sync every 8 seconds.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedAccountId}
              onChange={(event) => setSelectedAccountId(event.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
            >
              <option value="all">All Devices</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.phoneNumber})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void loadConversations()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>
            <Link
              href="/dashboard/whatsapp"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Back to Hub
            </Link>
          </div>
        </div>
      </section>

      {error ? (
        <section className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">
          {error}
        </section>
      ) : null}

      <section className="grid min-h-[72vh] grid-cols-1 gap-4 lg:grid-cols-[330px_minmax(0,1fr)_340px]">
        <aside
          className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${
            mobileView === "list" ? "block" : "hidden"
          } lg:block`}
        >
          <div className="border-b border-slate-200 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900">Conversations</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                {filteredConversations.length}
              </span>
            </div>
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search chats"
                className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="max-h-[64vh] space-y-1 overflow-y-auto p-2">
            {loadingConversations ? (
              <p className="px-2 py-3 text-sm text-slate-500">Loading conversations...</p>
            ) : filteredConversations.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-500">
                No conversations found.
              </p>
            ) : (
              filteredConversations.map((item) => {
                const active = selectedConversationId === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => selectConversation(item.id)}
                    className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                      active
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-transparent bg-white hover:border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                          {initials(item.contact.name, item.contact.phone)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {item.contact.name || item.contact.phone}
                          </p>
                          <p className="truncate text-xs text-slate-500">{item.contact.phone}</p>
                        </div>
                      </div>
                      <p className="shrink-0 text-[11px] text-slate-500">{formatChatTime(item.lastMessageAt)}</p>
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-600">{conversationPreview(item)}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${conversationStatusClass(item.status)}`}>
                        {item.status}
                      </span>
                      <span className="truncate text-[10px] text-slate-500">
                        {item.account.name} ({item.account.phoneNumber})
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <main
          className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${
            mobileView === "chat" ? "block" : "hidden"
          } lg:flex`}
        >
          {!selectedConversation ? (
            <div className="flex min-h-[62vh] w-full items-center justify-center p-6 text-center">
              <div>
                <p className="text-base font-semibold text-slate-700">Select a conversation</p>
                <p className="mt-1 text-sm text-slate-500">Open any chat to start messaging.</p>
              </div>
            </div>
          ) : (
            <div className="flex w-full flex-col">
              <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setMobileView("list")}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-slate-600 lg:hidden"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                    {initials(selectedConversation.contact.name, selectedConversation.contact.phone)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {selectedConversation.contact.name || selectedConversation.contact.phone}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {selectedConversation.contact.phone} | {selectedConversation.account.name}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMobileView("profile")}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-slate-600 hover:bg-white lg:hidden"
                >
                  <UserCircle2 className="h-4 w-4" />
                </button>
              </header>

              <div className="relative flex-1 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.10),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.08),transparent_28%)]" />
                <div className="relative h-[56vh] max-h-[56vh] space-y-2 overflow-y-auto px-3 py-4 md:px-6">
                  {loadingMessages ? (
                    <p className="text-sm text-slate-500">Loading messages...</p>
                  ) : messages.length === 0 ? (
                    <p className="text-sm text-slate-500">No messages in this conversation.</p>
                  ) : (
                    messages.map((msg) => {
                      const outbound = msg.direction === "outbound";
                      return (
                        <div key={msg.id} className={`flex ${outbound ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm md:max-w-[74%] ${
                              outbound
                                ? "bg-emerald-100 text-emerald-950"
                                : "border border-slate-200 bg-white text-slate-900"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{msg.text || "-"}</p>
                            <div className="mt-1 flex items-center justify-end gap-1.5 text-[11px] text-slate-500">
                              <span>{formatChatTime(msg.createdAt)}</span>
                              {outbound ? <OutboundStatus status={msg.status} /> : null}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <footer className="border-t border-slate-200 bg-white px-3 py-3 md:px-4">
                <div className="flex items-end gap-2">
                  <input
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void onSend();
                      }
                    }}
                    placeholder="Type a message"
                    className="h-11 flex-1 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => void onSend()}
                    disabled={sending || !text.trim()}
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
                    {sending ? "Sending" : "Send"}
                  </button>
                </div>
              </footer>
            </div>
          )}
        </main>

        <aside
          className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${
            mobileView === "profile" ? "block" : "hidden"
          } lg:block`}
        >
          {!selectedConversation ? (
            <div className="flex min-h-[62vh] items-center justify-center p-6 text-center">
              <p className="text-sm text-slate-500">Select chat to view contact details.</p>
            </div>
          ) : (
            <div className="h-full max-h-[72vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-200 p-4">
                <div>
                  <p className="text-base font-semibold text-slate-900">Contact Profile</p>
                  <p className="text-xs text-slate-500">Update CRM details from chat</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileView("chat")}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-slate-600 lg:hidden"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4 p-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Source</p>
                  <p className="mt-1 text-sm text-slate-700">{selectedConversation.contact.source || "manual"}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Name</label>
                  <input
                    value={contactForm.name}
                    onChange={(event) => setContactForm((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Name"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</label>
                  <input
                    value={selectedConversation.contact.phone}
                    disabled
                    className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</label>
                  <input
                    type="email"
                    value={contactForm.email}
                    onChange={(event) => setContactForm((prev) => ({ ...prev, email: event.target.value }))}
                    placeholder="Email"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tags</label>
                  <input
                    value={contactForm.tags}
                    onChange={(event) => setContactForm((prev) => ({ ...prev, tags: event.target.value }))}
                    placeholder="vip, lead, support"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Address</label>
                  <textarea
                    value={contactForm.address}
                    onChange={(event) => setContactForm((prev) => ({ ...prev, address: event.target.value }))}
                    rows={3}
                    placeholder="Address"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={contactForm.optedIn}
                    onChange={(event) =>
                      setContactForm((prev) => ({
                        ...prev,
                        optedIn: event.target.checked,
                      }))
                    }
                  />
                  Opted in for WhatsApp messaging
                </label>

                {(contactError || contactMessage) ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                    {contactError ? <p className="text-rose-700">{contactError}</p> : null}
                    {contactMessage ? <p className="text-emerald-700">{contactMessage}</p> : null}
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => void onSaveContact()}
                  disabled={savingContact}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-600 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingContact ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {savingContact ? "Saving..." : "Save Contact Details"}
                </button>
              </div>
            </div>
          )}
        </aside>
      </section>

      <div className="flex items-center justify-between px-1 text-xs text-slate-500 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileView("list")}
          className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 ${
            mobileView === "list" ? "bg-slate-200 text-slate-900" : "text-slate-600"
          }`}
        >
          <Search className="h-3.5 w-3.5" />
          Chats
        </button>
        <button
          type="button"
          onClick={() => setMobileView("chat")}
          className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 ${
            mobileView === "chat" ? "bg-slate-200 text-slate-900" : "text-slate-600"
          }`}
        >
          <SendHorizontal className="h-3.5 w-3.5" />
          Chat
        </button>
        <button
          type="button"
          onClick={() => setMobileView("profile")}
          className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 ${
            mobileView === "profile" ? "bg-slate-200 text-slate-900" : "text-slate-600"
          }`}
        >
          <UserCircle2 className="h-3.5 w-3.5" />
          Profile
        </button>
      </div>
    </div>
  );
}
