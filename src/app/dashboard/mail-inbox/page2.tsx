"use client";

import { useEffect, useState, useRef } from "react";

type Contact = {
  email: string;
  lastMessage: string | null;
  lastAt: string | null;
};

type Message = {
  id: string;
  direction: "in" | "out";
  subject?: string | null;
  body?: string | null;
  createdAt: string;
  status?: string | null;
};

export default function MailInboxPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [search, setSearch] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newBody, setNewBody] = useState("");
  const [sending, setSending] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const refreshRef = useRef<number | null>(null);

  useEffect(() => {
    loadContacts();
    // start auto-refresh poll
    if (autoRefresh) startAutoRefresh();
    return () => stopAutoRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh]);

  // start/stop helpers
  function startAutoRefresh() {
    stopAutoRefresh();
    // immediate run then interval
    runRefreshCycle();
    refreshRef.current = window.setInterval(runRefreshCycle, 20000); // 20s
  }
  function stopAutoRefresh() {
    if (refreshRef.current) {
      clearInterval(refreshRef.current);
      refreshRef.current = null;
    }
  }

  async function runRefreshCycle() {
    try {
      // 1) scan server for pending auto-reply (server handles processed flag)
      await fetch("/api/ai/auto-reply/scan", { method: "POST" });

      // 2) refresh contacts (and messages if a conversation is open)
      await loadContacts();
      if (selectedEmail) await loadMessages(selectedEmail);
    } catch (err) {
      console.error("Auto refresh error", err);
    }
  }

  async function loadContacts() {
    try {
      setLoadingContacts(true);
      const res = await fetch("/api/mail-inbox/contacts");
      const json = await res.json();
      setLoadingContacts(false);
      if (json.success) {
        setContacts(json.contacts || []);
      } else {
        console.error("Contacts error", json.error);
      }
    } catch (err) {
      console.error(err);
      setLoadingContacts(false);
    }
  }

  async function loadMessages(email: string) {
    try {
      setLoadingMessages(true);
      setSelectedEmail(email);
      const res = await fetch(`/api/mail-inbox/messages?email=${encodeURIComponent(email)}`);
      const json = await res.json();
      setLoadingMessages(false);
      if (json.success) {
        setMessages(json.messages || []);
      } else {
        console.error("Messages error", json.error);
      }
    } catch (err) {
      console.error(err);
      setLoadingMessages(false);
    }
  }

  async function handleSend() {
    if (!selectedEmail || !newSubject || !newBody) return alert("Enter subject & body");
    try {
      setSending(true);
      const res = await fetch("/api/mail-inbox/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: selectedEmail,
          subject: newSubject,
          body: newBody,
        }),
      });
      const json = await res.json();
      setSending(false);
      if (!json.success) {
        alert(json.error || "Send failed");
        return;
      }

      const now = new Date().toISOString();
      setMessages((prev) => [
        ...prev,
        {
          id: `temp-${now}`,
          direction: "out",
          subject: newSubject,
          body: newBody,
          createdAt: now,
          status: "sent",
        },
      ]);
      setNewBody("");
      setNewSubject("");
    } catch (err) {
      console.error(err);
      setSending(false);
      alert("Send error");
    }
  }

  const filtered = contacts.filter((c) => c.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="h-[calc(100vh-64px)] w-full flex bg-white text-slate-900">
      {/* left */}
      <div className="w-72 border-r bg-white">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="text-lg font-semibold">Mail Inbox</div>
          <div>
            <button
              onClick={() => { setAutoRefresh(!autoRefresh); }}
              className={`px-2 py-1 text-sm rounded ${autoRefresh ? "bg-green-600 text-white" : "bg-gray-200 text-gray-700"}`}>
              {autoRefresh ? "Auto ON" : "Auto OFF"}
            </button>
          </div>
        </div>

        <div className="p-3">
          <input
            placeholder="Search or start new mail"
            className="w-full px-3 py-2 border rounded"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-y-auto h-[calc(100vh-64px-120px)]">
          {loadingContacts ? (
            <div className="p-4 text-sm text-gray-500">Loading contacts...</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">No conversations yet.</div>
          ) : (
            filtered.map((c) => (
              <div
                key={c.email}
                onClick={() => loadMessages(c.email)}
                className={`p-3 cursor-pointer hover:bg-slate-100 ${selectedEmail === c.email ? "bg-slate-100" : ""}`}
              >
                <div className="flex justify-between">
                  <div className="font-medium truncate">{c.email}</div>
                  <div className="text-xs text-gray-500">{c.lastAt ? new Date(c.lastAt).toLocaleTimeString() : ""}</div>
                </div>
                <div className="text-xs text-gray-500 truncate">{c.lastMessage}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* middle */}
      <div className="flex-1 flex flex-col">
        <div className="h-14 border-b flex items-center px-4 bg-white">
          <div className="font-medium">{selectedEmail || "Select a conversation"}</div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {loadingMessages && <div className="text-sm text-gray-500">Loading messages...</div>}
          {!loadingMessages && !selectedEmail && <div className="text-gray-500">Select a conversation to start replying.</div>}
          {!loadingMessages && selectedEmail && messages.length === 0 && <div className="text-gray-500">No messages yet with {selectedEmail}.</div>}

          <div className="space-y-4">
            {messages.map((m) => {
              const isOut = m.direction === "out";
              return (
                <div key={m.id} className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
                  <div className={`${isOut ? "bg-green-600 text-white" : "bg-white border"} px-4 py-3 rounded-lg max-w-[70%] shadow`}>
                    {m.subject && <div className="font-semibold text-sm mb-1">{m.subject}</div>}
                    <div className="text-sm whitespace-pre-wrap">{m.body}</div>
                    <div className="text-[11px] text-gray-500 mt-2 text-right">
                      {new Date(m.createdAt).toLocaleString()} {isOut && m.status ? ` • ${m.status}` : ""}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-4 border-t bg-white">
          {selectedEmail ? (
            <>
              <input
                placeholder="Subject"
                className="w-full px-3 py-2 border rounded mb-2"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
              />
              <div className="flex gap-2">
                <textarea
                  className="flex-1 px-3 py-2 border rounded h-24"
                  placeholder="Type a message"
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                />
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleSend}
                    disabled={sending || !newBody || !newSubject}
                    className="bg-green-600 text-white px-6 py-2 rounded disabled:opacity-50"
                  >
                    {sending ? "Sending..." : "Send"}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-gray-500">Select a conversation to start replying.</div>
          )}
        </div>
      </div>

      {/* right */}
      <div className="w-72 border-l p-4 bg-white">
        <h3 className="font-semibold mb-2">Contact info</h3>
        {selectedEmail ? <div className="break-words">{selectedEmail}</div> : <div className="text-gray-500">Select a conversation.</div>}
      </div>
    </div>
  );
}
