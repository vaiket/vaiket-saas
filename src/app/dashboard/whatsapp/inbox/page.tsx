"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCheck,
  Clock3,
  Copy,
  FileText,
  Forward,
  Loader2,
  Mic,
  MoreVertical,
  Paperclip,
  PhoneCall,
  PlayCircle,
  Reply,
  RefreshCcw,
  Search,
  SendHorizontal,
  SmilePlus,
  Trash2,
  UserCircle2,
  Video,
  X,
  Zap,
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
  messages: Array<{
    id: string;
    direction: string;
    messageType: string;
    text: string | null;
    mediaUrl: string | null;
    status: string;
    createdAt: string;
  }>;
};

type Message = {
  id: string;
  direction: string;
  messageType: string;
  text: string | null;
  mediaUrl: string | null;
  status: string;
  providerMessageId: string | null;
  createdAt: string;
  deliveredAt: string | null;
  readAt: string | null;
};

type AccountOption = { id: string; name: string; phoneNumber: string };

type ContactForm = { name: string; email: string; address: string; tags: string; optedIn: boolean };

type MobileView = "list" | "chat" | "profile";
type MediaKind = "image" | "video" | "audio" | "document";
type ComposerAttachment = {
  file: File;
  fileName: string;
  mediaType: MediaKind;
  previewUrl: string | null;
};

const MESSAGE_REACTIONS = ["👍", "❤️", "😂", "🎉", "🙏", "🔥"];
const COMPOSER_EMOJIS = ["🙂", "😊", "👋", "✅", "🙏", "🚚", "📦", "✨"];
const TEMPLATE_MESSAGES = [
  "Hello {{name}}, thanks for contacting Vaiket support.",
  "Your request has been received. Our team is reviewing it now.",
  "We have marked this conversation as resolved. Reply anytime if you need help.",
];
const QUICK_REPLIES = [
  "Hi! How can I help you today?",
  "Please share your order ID.",
  "Thanks, we are checking this for you.",
  "Got it. I will connect you to support.",
];
const VOICE_WAVE_HEIGHTS = [8, 10, 12, 9, 16, 10, 12, 8, 14, 9, 11, 8, 15, 10, 12, 9, 13, 8, 12, 9, 14, 10, 11, 8];
const POLL_INTERVAL_MS = 8000;
const MESSAGES_FETCH_LIMIT = 180;
const LOCAL_CACHE_PREFIX = "vaiket_wa_inbox_v2";

type ConversationsCache = {
  accountId: string;
  selectedConversationId: string;
  conversations: Conversation[];
  updatedAt: number;
};

type MessagesCache = {
  conversationId: string;
  messages: Message[];
  updatedAt: number;
};

function conversationsCacheKey(accountId: string) {
  return `${LOCAL_CACHE_PREFIX}_conversations_${accountId || "all"}`;
}

function messagesCacheKey(conversationId: string) {
  return `${LOCAL_CACHE_PREFIX}_messages_${conversationId}`;
}

function safeParseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function buildConversationsDigest(items: Conversation[]) {
  if (items.length === 0) return "0";
  return items
    .map((item) => {
      const last = item.messages[0];
      return [
        item.id,
        item.status,
        item.lastMessageAt || "",
        last?.id || "",
        last?.status || "",
        last?.createdAt || "",
      ].join("|");
    })
    .join("~");
}

function buildMessagesDigest(items: Message[]) {
  if (items.length === 0) return "0";
  return items
    .map((item) =>
      [
        item.id,
        item.status,
        item.createdAt,
        item.deliveredAt || "",
        item.readAt || "",
        item.mediaUrl || "",
      ].join("|")
    )
    .join("~");
}

function inferMediaTypeFromFile(file: File): MediaKind {
  const mime = (file.type || "").toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";

  const lowerName = file.name.toLowerCase();
  if (/\.(png|jpe?g|gif|bmp|webp|svg)$/.test(lowerName)) return "image";
  if (/\.(mp4|mov|avi|mkv|webm)$/.test(lowerName)) return "video";
  if (/\.(mp3|m4a|aac|ogg|wav)$/.test(lowerName)) return "audio";
  return "document";
}

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
  const latest = item.messages[0];
  if (!latest) return "No messages yet";
  const text = (latest.text || "").trim();
  if (text) return text.length > 64 ? `${text.slice(0, 64)}...` : text;
  if (latest.messageType && latest.messageType !== "text") return `📎 ${latest.messageType} attachment`;
  if (latest.mediaUrl) return "📎 Attachment";
  return "No messages yet";
}

type ChatRow =
  | { kind: "separator"; id: string; label: string }
  | { kind: "message"; id: string; message: Message };

function dayStart(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dateSeparatorLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  const now = new Date();
  if (isSameDay(date, now)) return "Today";
  const yesterday = dayStart(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  if (isSameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function buildChatRows(items: Message[]) {
  const rows: ChatRow[] = [];
  let previousLabel = "";
  for (const item of items) {
    const label = dateSeparatorLabel(item.createdAt);
    if (label !== previousLabel) {
      rows.push({ kind: "separator", id: `sep_${item.id}`, label });
      previousLabel = label;
    }
    rows.push({ kind: "message", id: item.id, message: item });
  }
  return rows;
}

function firstUrl(value: string | null | undefined) {
  if (!value) return null;
  const match = value.match(/https?:\/\/[^\s]+/i);
  return match ? match[0] : null;
}

function isImageType(message: Message, url: string | null) {
  const mt = message.messageType.toLowerCase();
  if (mt.includes("image")) return true;
  if (!url) return false;
  return /\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i.test(url);
}

function isVideoType(message: Message, url: string | null) {
  const mt = message.messageType.toLowerCase();
  if (mt.includes("video")) return true;
  if (!url) return false;
  return /\.(mp4|mov|avi|mkv|webm)$/i.test(url);
}

function isDocumentType(message: Message, url: string | null) {
  const mt = message.messageType.toLowerCase();
  if (mt.includes("document") || mt.includes("file") || mt.includes("pdf")) return true;
  if (!url) return false;
  return /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip)$/i.test(url);
}

function isVoiceType(message: Message, url: string | null) {
  const mt = message.messageType.toLowerCase();
  if (mt.includes("audio") || mt.includes("voice")) return true;
  if (!url) return false;
  return /\.(mp3|m4a|aac|ogg|wav)$/i.test(url);
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
  const [chatSearch, setChatSearch] = useState("");
  const [showHeaderSearch, setShowHeaderSearch] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showAutomationMenu, setShowAutomationMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(null);
  const [reactionsMap, setReactionsMap] = useState<Record<string, string[]>>({});
  const [hiddenMessageIds, setHiddenMessageIds] = useState<string[]>([]);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [chatNotice, setChatNotice] = useState<string | null>(null);
  const [showTyping, setShowTyping] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<ComposerAttachment | null>(null);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const attachmentRef = useRef<HTMLInputElement | null>(null);
  const messageScrollRef = useRef<HTMLDivElement | null>(null);
  const shouldStickToBottomRef = useRef(true);
  const previousConversationIdRef = useRef("");
  const conversationDigestRef = useRef("");
  const messagesDigestRef = useRef("");
  const conversationsAbortRef = useRef<AbortController | null>(null);
  const messagesAbortRef = useRef<AbortController | null>(null);
  const hydratedAccountCacheRef = useRef(new Set<string>());

  const clearPendingAttachment = useCallback(() => {
    setPendingAttachment((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
    if (attachmentRef.current) attachmentRef.current.value = "";
  }, []);

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
      const preview = (item.messages[0]?.text || item.messages[0]?.messageType || "").toLowerCase();
      return name.includes(value) || phone.includes(value) || account.includes(value) || preview.includes(value);
    });
  }, [conversations, query]);

  const hiddenMessageIdSet = useMemo(() => new Set(hiddenMessageIds), [hiddenMessageIds]);

  const visibleMessages = useMemo(() => {
    const withoutDeleted = messages.filter((item) => !hiddenMessageIdSet.has(item.id));
    const needle = chatSearch.trim().toLowerCase();
    if (!needle) return withoutDeleted;
    return withoutDeleted.filter((item) => {
      const textValue = (item.text || "").toLowerCase();
      const typeValue = item.messageType.toLowerCase();
      return textValue.includes(needle) || typeValue.includes(needle);
    });
  }, [messages, hiddenMessageIdSet, chatSearch]);

  const chatRows = useMemo(() => buildChatRows(visibleMessages), [visibleMessages]);

  const replyToMessage = useMemo(
    () => (replyToId ? messages.find((item) => item.id === replyToId) || null : null),
    [messages, replyToId]
  );

  const chatStatusText = useMemo(() => {
    if (!selectedConversation) return "";
    if (showTyping) return "Customer is typing...";
    if (selectedConversation.status.trim().toLowerCase() === "active") return "online";
    const stamp = formatChatTime(selectedConversation.lastMessageAt);
    return stamp ? `last seen ${stamp}` : "offline";
  }, [selectedConversation, showTyping]);

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
      const controller = new AbortController();
      conversationsAbortRef.current?.abort();
      conversationsAbortRef.current = controller;
      try {
        if (!silent) {
          setLoadingConversations(true);
          setError(null);
        }
        const q = new URLSearchParams();
        if (selectedAccountId !== "all") q.set("accountId", selectedAccountId);
        const endpoint = q.toString() ? `/api/whatsapp/inbox/conversations?${q.toString()}` : "/api/whatsapp/inbox/conversations";
        const res = await fetch(endpoint, {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await readJsonSafe(res);
        if (!res.ok || !data.success) throw new Error(data.error || "Failed to load conversations");
        const next = (data.conversations || []) as Conversation[];
        const digest = buildConversationsDigest(next);
        const nextSelectedConversationId =
          next.length === 0
            ? ""
            : selectedConversationId && next.some((item) => item.id === selectedConversationId)
              ? selectedConversationId
              : next[0].id;

        if (digest !== conversationDigestRef.current) {
          conversationDigestRef.current = digest;
          setConversations(next);
        }

        if (nextSelectedConversationId !== selectedConversationId) {
          setSelectedConversationId(nextSelectedConversationId);
        }

        try {
          const cachePayload: ConversationsCache = {
            accountId: selectedAccountId,
            selectedConversationId: nextSelectedConversationId,
            conversations: next,
            updatedAt: Date.now(),
          };
          localStorage.setItem(conversationsCacheKey(selectedAccountId), JSON.stringify(cachePayload));
        } catch {
          // ignore cache write failures
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (!silent) setError(err instanceof Error ? err.message : "Failed to load conversations");
      } finally {
        if (!silent && conversationsAbortRef.current === controller) {
          setLoadingConversations(false);
        }
      }
    },
    [selectedAccountId, selectedConversationId]
  );

  const loadMessages = useCallback(async (conversationId: string, opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent);
    const controller = new AbortController();
    messagesAbortRef.current?.abort();
    messagesAbortRef.current = controller;
    try {
      if (!conversationId) return;
      if (!silent) {
        setLoadingMessages(true);
        setError(null);
      }
      const endpoint = `/api/whatsapp/inbox/messages?conversationId=${encodeURIComponent(conversationId)}&limit=${MESSAGES_FETCH_LIMIT}`;
      const res = await fetch(endpoint, {
        credentials: "include",
        cache: "no-store",
        signal: controller.signal,
      });
      const data = await readJsonSafe(res);
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load messages");
      const next = (data.messages || []) as Message[];
      const digest = buildMessagesDigest(next);
      if (digest !== messagesDigestRef.current) {
        messagesDigestRef.current = digest;
        setMessages(next);
      }
      try {
        const cachePayload: MessagesCache = {
          conversationId,
          messages: next,
          updatedAt: Date.now(),
        };
        localStorage.setItem(messagesCacheKey(conversationId), JSON.stringify(cachePayload));
      } catch {
        // ignore cache write failures
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (!silent) setError(err instanceof Error ? err.message : "Failed to load messages");
    } finally {
      if (!silent && messagesAbortRef.current === controller) {
        setLoadingMessages(false);
      }
    }
  }, []);

  useEffect(() => {
    try {
      const cachedPrefs = safeParseJson<{ selectedAccountId: string }>(
        localStorage.getItem(`${LOCAL_CACHE_PREFIX}_prefs`)
      );
      if (cachedPrefs?.selectedAccountId) {
        setSelectedAccountId(cachedPrefs.selectedAccountId);
      }
    } catch {
      // ignore cache read failures
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        `${LOCAL_CACHE_PREFIX}_prefs`,
        JSON.stringify({ selectedAccountId })
      );
    } catch {
      // ignore cache write failures
    }
  }, [selectedAccountId]);

  useEffect(() => {
    if (hydratedAccountCacheRef.current.has(selectedAccountId)) return;
    hydratedAccountCacheRef.current.add(selectedAccountId);
    try {
      const cached = safeParseJson<ConversationsCache>(
        localStorage.getItem(conversationsCacheKey(selectedAccountId))
      );
      if (!cached || cached.accountId !== selectedAccountId || cached.conversations.length === 0) return;
      conversationDigestRef.current = buildConversationsDigest(cached.conversations);
      setConversations(cached.conversations);
      setSelectedConversationId((prev) => prev || cached.selectedConversationId || cached.conversations[0]?.id || "");
      setLoadingConversations(false);
    } catch {
      // ignore cache read failures
    }
  }, [selectedAccountId]);

  useEffect(() => {
    const syncVisibility = () => setIsPageVisible(document.visibilityState !== "hidden");
    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility);
    return () => document.removeEventListener("visibilitychange", syncVisibility);
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
      messagesDigestRef.current = "0";
      return;
    }
    try {
      const cached = safeParseJson<MessagesCache>(
        localStorage.getItem(messagesCacheKey(selectedConversationId))
      );
      if (cached?.conversationId === selectedConversationId && cached.messages.length > 0) {
        messagesDigestRef.current = buildMessagesDigest(cached.messages);
        setMessages(cached.messages);
        setLoadingMessages(false);
      }
    } catch {
      // ignore cache read failures
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
    if (conversations.length === 0) return;
    try {
      const cachePayload: ConversationsCache = {
        accountId: selectedAccountId,
        selectedConversationId,
        conversations,
        updatedAt: Date.now(),
      };
      localStorage.setItem(conversationsCacheKey(selectedAccountId), JSON.stringify(cachePayload));
    } catch {
      // ignore cache write failures
    }
  }, [conversations, selectedConversationId, selectedAccountId]);

  useEffect(() => {
    if (!isPageVisible) return;
    const timer = window.setInterval(() => void loadConversations({ silent: true }), POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [loadConversations, isPageVisible]);

  useEffect(() => {
    if (!selectedConversationId || !isPageVisible) return;
    const timer = window.setInterval(
      () => void loadMessages(selectedConversationId, { silent: true }),
      POLL_INTERVAL_MS
    );
    return () => window.clearInterval(timer);
  }, [selectedConversationId, loadMessages, isPageVisible]);

  useEffect(() => {
    if (!selectedConversation || !isPageVisible || selectedConversation.status.trim().toLowerCase() !== "active") return;
    const timer = window.setInterval(() => {
      setShowTyping(true);
      window.setTimeout(() => setShowTyping(false), 1800);
    }, 14000);
    return () => window.clearInterval(timer);
  }, [selectedConversation, isPageVisible]);

  useEffect(() => {
    if (!chatNotice) return;
    const timer = window.setTimeout(() => setChatNotice(null), 2600);
    return () => window.clearTimeout(timer);
  }, [chatNotice]);

  useEffect(() => {
    if (!previewImageUrl) return;
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewImageUrl(null);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [previewImageUrl]);

  useEffect(() => {
    if (!messageScrollRef.current) return;
    const conversationChanged = previousConversationIdRef.current !== selectedConversationId;
    if (conversationChanged || shouldStickToBottomRef.current) {
      messageScrollRef.current.scrollTop = messageScrollRef.current.scrollHeight;
    }
    previousConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId, visibleMessages.length, showTyping]);

  useEffect(() => {
    if (!pendingAttachment?.previewUrl) return;
    return () => URL.revokeObjectURL(pendingAttachment.previewUrl);
  }, [pendingAttachment?.previewUrl]);

  useEffect(() => {
    return () => {
      conversationsAbortRef.current?.abort();
      messagesAbortRef.current?.abort();
    };
  }, []);

  const onMessagesScroll = useCallback(() => {
    if (!messageScrollRef.current) return;
    const el = messageScrollRef.current;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldStickToBottomRef.current = distanceFromBottom < 96;
  }, []);

  const onSend = async () => {
    try {
      if (!selectedConversationId) return;
      const trimmedText = text.trim();
      if (!trimmedText && !pendingAttachment) return;
      setSending(true);
      setError(null);
      let mediaUrl = "";
      let mediaType: MediaKind | "text" = "text";
      let fileName = "";

      if (pendingAttachment) {
        const uploadForm = new FormData();
        uploadForm.set("file", pendingAttachment.file);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          credentials: "include",
          body: uploadForm,
        });
        const uploadData = await readJsonSafe(uploadRes);
        if (!uploadRes.ok || !uploadData.url) {
          throw new Error(uploadData.error || "Failed to upload media");
        }
        mediaUrl = String(uploadData.url);
        mediaType = pendingAttachment.mediaType;
        fileName = pendingAttachment.fileName;
      }
      const messageBody = replyToMessage
        ? `↪ ${(replyToMessage.text || "media message").slice(0, 80)}\n${trimmedText}`
        : trimmedText;
      const payload: Record<string, unknown> = {
        conversationId: selectedConversationId,
        messageType: mediaType,
      };
      const composedText = replyToMessage && trimmedText ? messageBody : trimmedText;
      if (composedText) payload.text = composedText;
      if (mediaType !== "text") {
        payload.mediaUrl = mediaUrl;
        payload.fileName = fileName;
      }

      const res = await fetch("/api/whatsapp/inbox/messages", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await readJsonSafe(res);
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to send message");
      setText("");
      shouldStickToBottomRef.current = true;
      clearPendingAttachment();
      setReplyToId(null);
      setShowEmojiPicker(false);
      setShowTemplateMenu(false);
      setShowQuickReplies(false);
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

  const onReplyMessage = (messageId: string) => {
    setReplyToId(messageId);
    setShowTemplateMenu(false);
    setShowQuickReplies(false);
    setShowEmojiPicker(false);
  };

  const onForwardMessage = (message: Message) => {
    const content = message.text || message.mediaUrl || "";
    setText((prev) => (prev ? `${prev}\n${content}` : content));
    setChatNotice("Message content copied to composer for forwarding.");
  };

  const onCopyMessage = async (message: Message) => {
    const content = message.text || message.mediaUrl || "";
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setChatNotice("Message copied.");
    } catch {
      setChatNotice("Unable to copy message.");
    }
  };

  const onDeleteMessageLocal = (messageId: string) => {
    setHiddenMessageIds((prev) => (prev.includes(messageId) ? prev : [...prev, messageId]));
    setReactionPickerFor(null);
  };

  const onReactMessage = (messageId: string, emoji: string) => {
    setReactionsMap((prev) => ({
      ...prev,
      [messageId]: Array.from(new Set([...(prev[messageId] || []), emoji])),
    }));
    setReactionPickerFor(null);
  };

  const onApplyTemplate = (template: string) => {
    setText(template);
    setShowTemplateMenu(false);
  };

  const onApplyQuickReply = (reply: string) => {
    setText(reply);
    setShowQuickReplies(false);
  };

  const onInsertEmoji = (emoji: string) => {
    setText((prev) => `${prev}${emoji}`);
  };

  const onAttachmentSelect = (file?: File | null) => {
    if (!file) return;
    const mediaType = inferMediaTypeFromFile(file);
    const previewUrl =
      mediaType === "image" || mediaType === "video" || mediaType === "audio"
        ? URL.createObjectURL(file)
        : null;
    setPendingAttachment((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return {
        file,
        fileName: file.name,
        mediaType,
        previewUrl,
      };
    });
    setShowEmojiPicker(false);
    setShowTemplateMenu(false);
    setShowQuickReplies(false);
    setChatNotice(`Attached ${file.name}`);
  };

  const onChatMenuAction = (action: string) => {
    if (!selectedConversation) return;
    if (action === "export") {
      const lines = visibleMessages.map((msg) => {
        const who = msg.direction === "outbound" ? "Agent" : selectedConversation.contact.name || selectedConversation.contact.phone;
        const body = msg.text || `[${msg.messageType}]`;
        const media = msg.mediaUrl ? ` (media: ${msg.mediaUrl})` : "";
        return `[${new Date(msg.createdAt).toLocaleString()}] ${who}: ${body}${media}`;
      });
      const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `conversation-${selectedConversation.contact.phone}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      setChatNotice("Conversation exported.");
    } else if (action === "resolved") {
      setChatNotice("Conversation marked as resolved.");
    } else if (action === "block") {
      setChatNotice("Contact blocked locally for this session.");
    } else if (action === "assign") {
      setChatNotice("Assign agent action opened.");
    } else if (action === "tag") {
      setChatNotice("Add tag action opened.");
    }
    setShowChatMenu(false);
  };

  const onAutomationAction = (action: string) => {
    setShowAutomationMenu(false);
    if (action === "template") {
      setShowTemplateMenu(true);
      setShowQuickReplies(false);
      return;
    }
    if (action === "tag") {
      setMobileView("profile");
      setChatNotice("Use tags in the contact panel.");
      return;
    }
    if (action === "assign") {
      setShowChatMenu(true);
      setChatNotice("Use menu > Assign agent.");
      return;
    }
    if (action === "workflow") {
      setChatNotice("Workflow trigger queued.");
    }
  };

  const selectConversation = (id: string) => {
    clearPendingAttachment();
    shouldStickToBottomRef.current = true;
    setSelectedConversationId(id);
    setMobileView("chat");
    setShowChatMenu(false);
    setShowAutomationMenu(false);
    setShowEmojiPicker(false);
    setShowTemplateMenu(false);
    setShowQuickReplies(false);
    setReplyToId(null);
    setChatSearch("");
    setHiddenMessageIds([]);
    setReactionsMap({});
    setChatNotice(null);
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
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                isPageVisible ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isPageVisible ? "bg-emerald-500" : "bg-amber-500"}`} />
              {isPageVisible ? "Live sync" : "Sync paused"}
            </span>
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
              <div className="space-y-2 px-2 py-2">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div
                    key={`conversation_skeleton_${idx}`}
                    className="animate-pulse rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-9 w-9 rounded-full bg-slate-200" />
                      <div className="flex-1 space-y-1">
                        <span className="block h-3 w-28 rounded bg-slate-200" />
                        <span className="block h-2.5 w-20 rounded bg-slate-200" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
              <header className="border-b border-slate-200 bg-white/95 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setMobileView("list")}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-slate-600 lg:hidden"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-700">
                      {initials(selectedConversation.contact.name, selectedConversation.contact.phone)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {selectedConversation.contact.name || selectedConversation.contact.phone}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {selectedConversation.contact.phone}
                        <span className="mx-1.5">•</span>
                        <span className="inline-flex items-center gap-1">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              showTyping || selectedConversation.status.trim().toLowerCase() === "active"
                                ? "bg-emerald-500"
                                : "bg-slate-400"
                            }`}
                          />
                          {chatStatusText}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="relative flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowHeaderSearch((prev) => !prev)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 text-slate-600 hover:bg-slate-50"
                      title="Search conversation"
                    >
                      <Search className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 text-slate-600 hover:bg-slate-50"
                      title="Call"
                    >
                      <PhoneCall className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowChatMenu((prev) => !prev);
                        setShowAutomationMenu(false);
                      }}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 text-slate-600 hover:bg-slate-50"
                      title="More actions"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobileView("profile")}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 text-slate-600 hover:bg-slate-50 lg:hidden"
                    >
                      <UserCircle2 className="h-4 w-4" />
                    </button>

                    {showChatMenu ? (
                      <div className="absolute right-0 top-11 z-20 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                        <button onClick={() => onChatMenuAction("assign")} className="w-full rounded-lg px-2.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-100">Assign agent</button>
                        <button onClick={() => onChatMenuAction("tag")} className="w-full rounded-lg px-2.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-100">Add tag</button>
                        <button onClick={() => onChatMenuAction("resolved")} className="w-full rounded-lg px-2.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-100">Mark as resolved</button>
                        <button onClick={() => onChatMenuAction("export")} className="w-full rounded-lg px-2.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-100">Export conversation</button>
                        <button onClick={() => onChatMenuAction("block")} className="w-full rounded-lg px-2.5 py-2 text-left text-xs text-rose-600 hover:bg-rose-50">Block contact</button>
                      </div>
                    ) : null}
                  </div>
                </div>

                {showHeaderSearch ? (
                  <div className="mt-3">
                    <input
                      value={chatSearch}
                      onChange={(event) => setChatSearch(event.target.value)}
                      placeholder="Search within conversation..."
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700"
                    />
                  </div>
                ) : null}
              </header>

              <div className="relative flex-1 overflow-hidden">
                <div className="absolute inset-0 bg-[#efeae2]" />
                <div className="absolute inset-0 opacity-40 [background-size:36px_36px] [background-image:radial-gradient(circle_at_1px_1px,rgba(100,116,139,0.12)_1px,transparent_0)]" />
                <div
                  ref={messageScrollRef}
                  onScroll={onMessagesScroll}
                  className="relative h-[56vh] max-h-[56vh] overflow-y-auto px-3 py-4 md:px-6"
                >
                  {loadingMessages ? (
                    <div className="space-y-3 py-2">
                      {Array.from({ length: 8 }).map((_, idx) => (
                        <div key={`message_skeleton_${idx}`} className={`flex ${idx % 2 === 0 ? "justify-start" : "justify-end"}`}>
                          <span className="h-12 w-44 animate-pulse rounded-2xl bg-white/70 shadow-sm" />
                        </div>
                      ))}
                    </div>
                  ) : chatRows.length === 0 ? (
                    <p className="text-sm text-slate-500">No messages in this conversation.</p>
                  ) : (
                    <div className="space-y-2">
                      {chatRows.map((row) => {
                        if (row.kind === "separator") {
                          return (
                            <div key={row.id} className="flex justify-center py-1">
                              <span className="rounded-full bg-slate-200/90 px-3 py-1 text-[11px] font-medium text-slate-600">
                                {row.label}
                              </span>
                            </div>
                          );
                        }
                        const msg = row.message;
                        const outbound = msg.direction === "outbound";
                        const mediaUrl = msg.mediaUrl || firstUrl(msg.text);
                        const showImage = isImageType(msg, mediaUrl);
                        const showVideo = isVideoType(msg, mediaUrl);
                        const showDoc = isDocumentType(msg, mediaUrl);
                        const showVoice = isVoiceType(msg, mediaUrl);
                        const captionText = (() => {
                          const raw = (msg.text || "").trim();
                          if (!raw) return "";
                          if (mediaUrl && raw === mediaUrl) return "";
                          if (mediaUrl && raw.replace(mediaUrl, "").trim() === "") return "";
                          return raw;
                        })();
                        const reactions = reactionsMap[msg.id] || [];
                        return (
                          <div
                            key={msg.id}
                            className={`group flex ${outbound ? "justify-end" : "justify-start"}`}
                            onMouseEnter={() => setHoveredMessageId(msg.id)}
                            onMouseLeave={() => {
                              setHoveredMessageId((prev) => (prev === msg.id ? null : prev));
                              setReactionPickerFor((prev) => (prev === msg.id ? null : prev));
                            }}
                          >
                            <div className="relative max-w-[90%] md:max-w-[74%]">
                              {hoveredMessageId === msg.id ? (
                                <div className={`absolute top-1 z-10 flex items-center gap-1 ${outbound ? "-left-44" : "-right-44"}`}>
                                  <button onClick={() => onReplyMessage(msg.id)} className="rounded-lg border border-slate-300 bg-white p-1 text-slate-600 hover:bg-slate-100" title="Reply"><Reply className="h-3.5 w-3.5" /></button>
                                  <button onClick={() => onForwardMessage(msg)} className="rounded-lg border border-slate-300 bg-white p-1 text-slate-600 hover:bg-slate-100" title="Forward"><Forward className="h-3.5 w-3.5" /></button>
                                  <button onClick={() => setReactionPickerFor((prev) => (prev === msg.id ? null : msg.id))} className="rounded-lg border border-slate-300 bg-white p-1 text-slate-600 hover:bg-slate-100" title="React"><SmilePlus className="h-3.5 w-3.5" /></button>
                                  <button onClick={() => void onCopyMessage(msg)} className="rounded-lg border border-slate-300 bg-white p-1 text-slate-600 hover:bg-slate-100" title="Copy"><Copy className="h-3.5 w-3.5" /></button>
                                  <button onClick={() => onDeleteMessageLocal(msg.id)} className="rounded-lg border border-rose-300 bg-white p-1 text-rose-600 hover:bg-rose-50" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                                </div>
                              ) : null}

                              <div className={`rounded-2xl px-3 py-2 text-sm shadow-sm ${outbound ? "rounded-br-md bg-[#dcf8c6] text-slate-900" : "rounded-bl-md border border-slate-200 bg-white text-slate-900"}`}>
                                {showImage && mediaUrl ? (
                                  <button type="button" onClick={() => setPreviewImageUrl(mediaUrl)} className="block overflow-hidden rounded-xl border border-slate-200">
                                    <img src={mediaUrl} alt="attachment" className="max-h-60 w-full object-cover" />
                                  </button>
                                ) : null}

                                {showVideo && mediaUrl ? (
                                  <a href={mediaUrl} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                                    <Video className="h-4 w-4 text-indigo-600" />
                                    <span>Open video attachment</span>
                                  </a>
                                ) : null}

                                {showDoc && mediaUrl ? (
                                  <a href={mediaUrl} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                                    <FileText className="h-4 w-4 text-blue-600" />
                                    <span>Open document/PDF</span>
                                  </a>
                                ) : null}

                                {showVoice && mediaUrl ? (
                                  <div className="mt-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                    <div className="mb-2 flex items-center gap-2 text-xs text-slate-700">
                                      <PlayCircle className="h-4 w-4 text-slate-500" />
                                      <span>Voice note</span>
                                    </div>
                                    <div className="mb-2 flex items-end gap-1">
                                      {VOICE_WAVE_HEIGHTS.map((height, idx) => (
                                        <span
                                          key={`${msg.id}_wave_${idx}`}
                                          className="w-1 rounded bg-slate-300"
                                          style={{ height: `${height}px` }}
                                        />
                                      ))}
                                    </div>
                                    <audio controls className="h-8 w-full">
                                      <source src={mediaUrl} />
                                    </audio>
                                  </div>
                                ) : null}

                                {(!showImage && !showVideo && !showDoc && !showVoice) || captionText ? (
                                  <p className={`whitespace-pre-wrap break-words ${showImage || showVideo || showDoc || showVoice ? "mt-2" : ""}`}>
                                    {captionText || "-"}
                                  </p>
                                ) : null}

                                <div className="mt-1 flex items-center justify-end gap-1.5 text-[11px] text-slate-500">
                                  <span>{formatChatTime(msg.createdAt)}</span>
                                  {outbound ? <OutboundStatus status={msg.status} /> : null}
                                </div>
                              </div>

                              {reactionPickerFor === msg.id ? (
                                <div className="mt-1 flex flex-wrap gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 shadow-sm">
                                  {MESSAGE_REACTIONS.map((emoji) => (
                                    <button key={`${msg.id}_${emoji}`} onClick={() => onReactMessage(msg.id, emoji)} className="text-sm hover:scale-110">
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              ) : null}

                              {reactions.length > 0 ? (
                                <div className={`mt-1 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs ${outbound ? "ml-auto" : ""}`}>
                                  {reactions.map((emoji, idx) => (
                                    <span key={`${msg.id}_reaction_${idx}`}>{emoji}</span>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}

                      {showTyping ? (
                        <div className="flex justify-start">
                          <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3 py-2 shadow-sm">
                            <p className="text-xs text-slate-500">Customer is typing...</p>
                            <div className="mt-1 flex items-center gap-1">
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.2s]" />
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.1s]" />
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>

              <footer className="border-t border-slate-200 bg-white px-3 py-3 md:px-4">
                {chatNotice ? (
                  <div className="mb-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs text-blue-700">
                    {chatNotice}
                  </div>
                ) : null}

                {replyToMessage ? (
                  <div className="mb-2 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-700">Replying to</p>
                      <p className="truncate text-slate-500">{replyToMessage.text || `[${replyToMessage.messageType}]`}</p>
                    </div>
                    <button onClick={() => setReplyToId(null)} className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-200">Clear</button>
                  </div>
                ) : null}

                {pendingAttachment ? (
                  <div className="mb-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
                    <div className="mb-2 flex items-center justify-between gap-2 text-xs text-slate-600">
                      <p className="truncate">
                        Attached {pendingAttachment.mediaType}: {pendingAttachment.fileName}
                      </p>
                      <button
                        type="button"
                        onClick={clearPendingAttachment}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-500 hover:bg-slate-200"
                        title="Remove attachment"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {pendingAttachment.mediaType === "image" && pendingAttachment.previewUrl ? (
                      <img
                        src={pendingAttachment.previewUrl}
                        alt={pendingAttachment.fileName}
                        className="max-h-40 rounded-lg border border-slate-200 object-cover"
                      />
                    ) : null}
                    {pendingAttachment.mediaType === "video" && pendingAttachment.previewUrl ? (
                      <video controls className="max-h-44 rounded-lg border border-slate-200">
                        <source src={pendingAttachment.previewUrl} />
                      </video>
                    ) : null}
                    {pendingAttachment.mediaType === "audio" && pendingAttachment.previewUrl ? (
                      <audio controls className="h-8 w-full">
                        <source src={pendingAttachment.previewUrl} />
                      </audio>
                    ) : null}
                    {pendingAttachment.mediaType === "document" ? (
                      <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span>{pendingAttachment.fileName}</span>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <input
                  ref={attachmentRef}
                  type="file"
                  className="hidden"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                  onChange={(event) => onAttachmentSelect(event.target.files?.[0])}
                />

                <div className="relative flex items-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      attachmentRef.current?.click();
                    }}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50"
                    title="Attach file"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>

                  <div className="relative flex-1">
                    <textarea
                      value={text}
                      onChange={(event) => setText(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          void onSend();
                        }
                      }}
                      rows={2}
                      placeholder="Type a message"
                      className="min-h-[52px] w-full resize-none rounded-2xl border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400"
                    />

                    {showEmojiPicker ? (
                      <div className="absolute bottom-14 left-0 z-20 flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                        {COMPOSER_EMOJIS.map((emoji) => (
                          <button key={`composer_emoji_${emoji}`} onClick={() => onInsertEmoji(emoji)} className="rounded-md px-1.5 py-1 text-base hover:bg-slate-100">
                            {emoji}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {showTemplateMenu ? (
                      <div className="absolute bottom-14 left-0 z-20 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                        <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Templates</p>
                        {TEMPLATE_MESSAGES.map((item) => (
                          <button key={item} onClick={() => onApplyTemplate(item)} className="w-full rounded-lg px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100">
                            {item}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {showQuickReplies ? (
                      <div className="absolute bottom-14 left-0 z-20 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                        <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Quick replies</p>
                        {QUICK_REPLIES.map((item) => (
                          <button key={item} onClick={() => onApplyQuickReply(item)} className="w-full rounded-lg px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100">
                            {item}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowEmojiPicker((prev) => !prev);
                      setShowTemplateMenu(false);
                      setShowQuickReplies(false);
                    }}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50"
                    title="Emoji"
                  >
                    <SmilePlus className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowTemplateMenu((prev) => !prev);
                      setShowEmojiPicker(false);
                      setShowQuickReplies(false);
                    }}
                    className="inline-flex h-11 items-center rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    title="Templates"
                  >
                    Templates
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowQuickReplies((prev) => !prev);
                      setShowEmojiPicker(false);
                      setShowTemplateMenu(false);
                    }}
                    className="inline-flex h-11 items-center rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    title="Quick replies"
                  >
                    Quick
                  </button>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAutomationMenu((prev) => !prev);
                        setShowChatMenu(false);
                      }}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                      title="Automation shortcut"
                    >
                      <Zap className="h-4 w-4" />
                    </button>
                    {showAutomationMenu ? (
                      <div className="absolute bottom-14 right-0 z-20 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                        <button onClick={() => onAutomationAction("template")} className="w-full rounded-lg px-2.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-100">Send template</button>
                        <button onClick={() => onAutomationAction("tag")} className="w-full rounded-lg px-2.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-100">Add tag</button>
                        <button onClick={() => onAutomationAction("assign")} className="w-full rounded-lg px-2.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-100">Assign agent</button>
                        <button onClick={() => onAutomationAction("workflow")} className="w-full rounded-lg px-2.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-100">Run automation workflow</button>
                      </div>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50"
                    title="Voice note"
                    onClick={() => setChatNotice("Voice recording started (UI demo).")}
                  >
                    <Mic className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => void onSend()}
                    disabled={sending || (!text.trim() && !pendingAttachment)}
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

      {previewImageUrl ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImageUrl(null)}
              className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              title="Close preview"
            >
              <X className="h-4 w-4" />
            </button>
            <img src={previewImageUrl} alt="Image preview" className="max-h-[90vh] w-full object-contain bg-slate-900" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
