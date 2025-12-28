"use client";

import { useEffect, useState, useRef } from "react";
import { 
  Search, 
  RefreshCw, 
  Send, 
  User, 
  MoreVertical, 
  Paperclip,
  Smile,
  Mic,
  Check,
  CheckCheck,
  Clock,
  Zap,
  Filter,
  Plus,
  Mail,
  ArrowLeft
} from "lucide-react";

type Contact = {
  email: string;
  lastMessage: string | null;
  lastAt: string | null;
  unreadCount?: number;
  isOnline?: boolean;
};

type Message = {
  id: string;
  direction: "in" | "out";
  subject?: string | null;
  body?: string | null;
  createdAt: string;
  status?: string | null;
  read?: boolean;
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
  const [mobileView, setMobileView] = useState('contacts'); // 'contacts' | 'chat'
  const [replying, setReplying] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const refreshRef = useRef<number | null>(null);

  // Scroll to bottom of messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

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
        setMobileView('chat');
      } else {
        console.error("Messages error", json.error);
      }
    } catch (err) {
      console.error(err);
      setLoadingMessages(false);
    }
  }

  async function handleSend() {
    if (!selectedEmail || !newBody.trim()) return alert("Enter message body");
    try {
      setSending(true);
      const res = await fetch("/api/mail-inbox/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: selectedEmail,
          subject: newSubject || `Re: ${messages[0]?.subject || 'Conversation'}`,
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
          read: false,
        },
      ]);
      setNewBody("");
      setNewSubject("");
      setReplying(false);
    } catch (err) {
      console.error(err);
      setSending(false);
      alert("Send error");
    }
  }

  const filteredContacts = contacts.filter((c) => 
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  // Format time for messages
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  // Get contact by email
  const getContact = (email: string) => {
    return contacts.find(c => c.email === email);
  };

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-[#0D3B66] text-white p-4 z-10 flex items-center justify-between">
        {mobileView === 'chat' ? (
          <div className="flex items-center space-x-4 w-full">
            <button 
              onClick={() => {
                setMobileView('contacts');
                setSelectedEmail(null);
              }}
              className="p-1"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex-1">
              <div className="font-semibold truncate">
                {selectedEmail?.split('@')[0]}
              </div>
              <div className="text-xs text-blue-200 flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>Online</span>
              </div>
            </div>
            <button className="p-2">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <div className="font-semibold">Messages</div>
            <button className="p-2">
              <Filter className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Contacts Sidebar */}
      <div className={`
        w-full md:w-96 bg-white border-r border-gray-200 flex flex-col
        ${mobileView !== 'contacts' ? 'hidden md:flex' : 'flex'}
      `}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`p-2 rounded-lg transition-colors ${
                  autoRefresh ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-600"
                }`}
                title={autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
              >
                <Zap className="w-4 h-4" />
              </button>
              <button
                onClick={loadContacts}
                className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full bg-gray-50 pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:border-[#0D3B66] focus:ring-2 focus:ring-[#0D3B66]/20 transition-all duration-300"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto">
          {loadingContacts ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500 p-4">
              <Mail className="w-12 h-12 mb-3 text-gray-300" />
              <p className="text-sm text-center">No conversations found</p>
              <p className="text-xs text-gray-400 mt-1 text-center">
                {search ? "Try a different search" : "Start a new conversation"}
              </p>
            </div>
          ) : (
            filteredContacts.map((contact) => (
              <div
                key={contact.email}
                onClick={() => loadMessages(contact.email)}
                className={`p-4 border-b border-gray-100 cursor-pointer transition-all duration-200 ${
                  selectedEmail === contact.email 
                    ? "bg-blue-50 border-l-4 border-l-[#0D3B66]" 
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {contact.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    {contact.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-semibold text-gray-900 truncate">
                        {contact.email}
                      </div>
                      <div className="text-xs text-gray-500 whitespace-nowrap">
                        {contact.lastAt && formatTime(contact.lastAt)}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600 truncate flex-1 mr-2">
                        {contact.lastMessage || "No messages yet"}
                      </p>
                      {contact.unreadCount > 0 && (
                        <div className="bg-[#0D3B66] text-white text-xs rounded-full px-2 py-1 min-w-5 h-5 flex items-center justify-center">
                          {contact.unreadCount}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`
        flex-1 flex flex-col bg-gray-50
        ${mobileView !== 'chat' ? 'hidden md:flex' : 'flex'}
      `}>
        {selectedEmail ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => {
                      setMobileView('contacts');
                      setSelectedEmail(null);
                    }}
                    className="md:hidden p-2 text-gray-500 hover:text-gray-700"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {selectedEmail.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{selectedEmail}</div>
                    <div className="text-xs text-gray-500 flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span>Online • Last seen recently</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-32">
                  <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <Mail className="w-16 h-16 mb-4 text-gray-300" />
                  <p className="text-lg font-medium text-gray-900">No messages yet</p>
                  <p className="text-sm text-gray-600 mt-1">Send a message to start the conversation</p>
                </div>
              ) : (
                <div className="space-y-3 max-w-4xl mx-auto">
                  {messages.map((message) => {
                    const isOut = message.direction === "out";
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOut ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                            isOut
                              ? "bg-[#0D3B66] text-white rounded-br-md"
                              : "bg-white text-gray-900 border border-gray-200 rounded-bl-md shadow-sm"
                          }`}
                        >
                          {!isOut && message.subject && (
                            <div className="font-semibold text-sm mb-2 opacity-90">
                              {message.subject}
                            </div>
                          )}
                          <div className="text-sm whitespace-pre-wrap leading-relaxed">
                            {message.body}
                          </div>
                          <div
                            className={`text-xs mt-2 flex items-center space-x-1 ${
                              isOut ? "text-blue-200" : "text-gray-500"
                            }`}
                          >
                            <span>{formatTime(message.createdAt)}</span>
                            {isOut && (
                              <>
                                {message.status === "sent" && !message.read && (
                                  <Check className="w-3 h-3" />
                                )}
                                {message.read && (
                                  <CheckCheck className="w-3 h-3" />
                                )}
                                {message.status === "sending" && (
                                  <Clock className="w-3 h-3" />
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Reply Area */}
            <div className="bg-white border-t border-gray-200 p-4">
              {replying && (
                <div className="mb-3">
                  <input
                    type="text"
                    placeholder="Subject (optional)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#0D3B66] focus:ring-2 focus:ring-[#0D3B66]/20 transition-all duration-300"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                  />
                </div>
              )}
              <div className="flex items-end space-x-3">
                <button 
                  onClick={() => setReplying(!replying)}
                  className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
                >
                  <Plus className="w-5 h-5" />
                </button>
                
                <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-3">
                  <textarea
                    placeholder="Type a message..."
                    className="w-full bg-transparent border-none focus:outline-none focus:ring-0 resize-none text-gray-900 placeholder-gray-500"
                    rows={1}
                    value={newBody}
                    onChange={(e) => setNewBody(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  <button className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                    <Smile className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={sending || !newBody.trim()}
                    className="bg-[#0D3B66] text-white p-2 rounded-lg hover:bg-[#0A2E4D] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {sending ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900">Select a conversation</p>
              <p className="text-sm text-gray-600">Choose a contact to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}