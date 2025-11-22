// src/app/dashboard/mail-inbox/page.tsx
"use client";

import { useEffect, useState } from "react";

type Contact = {
  email: string;
  lastMessage: string | null;
  lastAt: string;
};

type Message = {
  id: string;
  direction: "in" | "out";
  subject: string | null;
  body: string | null;
  createdAt: string;
  status?: string;
};

export default function MailInboxPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [search, setSearch] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newBody, setNewBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadContacts();
  }, []);

  async function loadContacts() {
    try {
      setLoadingContacts(true);
      const res = await fetch("/api/mail-inbox/contacts");
      const json = await res.json();
      setLoadingContacts(false);
      if (json.success) {
        setContacts(
          json.contacts.map((c: any) => ({
            email: c.email,
            lastMessage: c.lastMessage,
            lastAt: c.lastAt,
          }))
        );
      } else {
        console.error(json.error);
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
        setMessages(
          json.messages.map((m: any) => ({
            id: m.id,
            direction: m.direction,
            subject: m.subject,
            body: m.body,
            createdAt: m.createdAt,
            status: m.status,
          }))
        );
      } else {
        console.error(json.error);
      }
    } catch (err) {
      console.error(err);
      setLoadingMessages(false);
    }
  }

  async function handleSend() {
    if (!selectedEmail || !newSubject || !newBody) return;
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
        alert(json.error || "Failed to send");
        return;
      }

      // Optimistic add
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
      setNewSubject("");
      setNewBody("");
      // Optionally reload messages from server
      // loadMessages(selectedEmail);
    } catch (err) {
      console.error(err);
      setSending(false);
      alert("Error sending mail");
    }
  }

  const filteredContacts = contacts.filter((c) =>
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-64px)] w-full flex bg-[#0a1014]">
      {/* LEFT SIDEBAR - Contacts */}
      <div className="w-full md:w-1/4 bg-[#111b21] border-r border-[#202c33] flex flex-col">
        <div className="bg-[#202c33] text-white px-4 py-3 flex items-center justify-between">
          <span className="font-semibold text-sm">Mail Inbox</span>
        </div>
        <div className="p-2">
          <input
            className="w-full rounded bg-[#202c33] text-sm text-white px-3 py-2 outline-none"
            placeholder="Search or start new mail"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingContacts ? (
            <div className="text-gray-400 text-sm p-4">Loading contacts...</div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-gray-500 text-sm p-4">No conversations yet.</div>
          ) : (
            filteredContacts.map((c) => (
              <div
                key={c.email}
                onClick={() => loadMessages(c.email)}
                className={`px-3 py-3 cursor-pointer flex flex-col border-b border-[#202c33] ${
                  selectedEmail === c.email ? "bg-[#202c33]" : "hover:bg-[#202c33]/60"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white font-medium truncate">
                    {c.email}
                  </span>
                  <span className="text-xs text-gray-400">
                    {c.lastAt ? new Date(c.lastAt).toLocaleTimeString() : ""}
                  </span>
                </div>
                <span className="text-xs text-gray-400 truncate">
                  {c.lastMessage || ""}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MIDDLE - Chat */}
      <div className="flex-1 flex flex-col bg-[#0b141a]">
        {/* Chat header */}
        <div className="h-14 bg-[#202c33] flex items-center px-4 text-white border-b border-[#202c33]">
          <span className="font-medium text-sm">
            {selectedEmail || "Select a conversation"}
          </span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-[url('https://i.imgur.com/8Km9tLL.png')] bg-cover bg-center bg-fixed">
          {loadingMessages && selectedEmail && (
            <div className="text-gray-300 text-sm">Loading messages...</div>
          )}
          {!loadingMessages && selectedEmail && messages.length === 0 && (
            <div className="text-gray-300 text-sm">
              No messages yet with {selectedEmail}.
            </div>
          )}
          {!loadingMessages &&
            messages.map((m) => {
              const isOut = m.direction === "out";
              return (
                <div
                  key={m.id}
                  className={`flex w-full ${
                    isOut ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-3 py-2 text-sm shadow-sm ${
                      isOut
                        ? "bg-[#005c4b] text-white"
                        : "bg-[#202c33] text-gray-100"
                    }`}
                  >
                    {m.subject && (
                      <div className="font-semibold mb-1 text-xs">
                        {m.subject}
                      </div>
                    )}
                    {m.body && <div className="whitespace-pre-wrap">{m.body}</div>}
                    <div className="flex justify-end items-center gap-2 mt-1">
                      <span className="text-[10px] opacity-70">
                        {new Date(m.createdAt).toLocaleTimeString()}
                      </span>
                      {isOut && (
                        <span className="text-[10px] opacity-70">
                          {m.status === "sent" ? "✓✓" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Input */}
        <div className="h-auto bg-[#202c33] px-3 py-2 border-t border-[#202c33] flex flex-col gap-2">
          {selectedEmail ? (
            <>
              <input
                className="w-full rounded bg-[#0b141a] text-sm text-white px-3 py-2 outline-none"
                placeholder="Subject"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
              />
              <div className="flex gap-2">
                <textarea
                  className="flex-1 rounded bg-[#0b141a] text-sm text-white px-3 py-2 outline-none h-16"
                  placeholder="Type a message"
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !newBody || !newSubject}
                  className="px-4 py-2 bg-[#00a884] text-white text-sm rounded self-end disabled:opacity-50"
                >
                  {sending ? "Sending..." : "Send"}
                </button>
              </div>
            </>
          ) : (
            <div className="text-gray-400 text-sm">
              Select a conversation to start replying.
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL - Simple info */}
      <div className="hidden lg:flex w-1/4 bg-[#111b21] border-l border-[#202c33] text-gray-200 flex-col p-4">
        <h2 className="text-sm font-semibold mb-2">Contact info</h2>
        {selectedEmail ? (
          <>
            <div className="text-sm break-all">{selectedEmail}</div>
            <div className="mt-3 text-xs text-gray-400">
              Future: show lead info, tags, notes, deals, etc.
            </div>
          </>
        ) : (
          <div className="text-xs text-gray-500 mt-2">
            Select a conversation to see contact details.
          </div>
        )}
      </div>
    </div>
  );
}
