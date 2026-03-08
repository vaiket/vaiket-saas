"use client";

import Link from "next/link";
import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Check,
  CheckCheck,
  Clock3,
  FileText,
  Loader2,
  Mail,
  MapPin,
  MessageSquareText,
  Paperclip,
  PhoneCall,
  RefreshCcw,
  Search,
  SendHorizontal,
  Tags,
  UserCircle2,
  Video,
  X,
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
type ConversationFilter = "all" | "active" | "closed" | "tagged";
type MediaKind = "image" | "video" | "audio" | "document";
type EmojiCategory = "recent" | "smileys" | "people" | "symbols" | "objects";
type ComposerAttachment = {
  file: File;
  fileName: string;
  mediaType: MediaKind;
  previewUrl: string | null;
};

const EMOJI_CATEGORY_TABS: Array<{ key: EmojiCategory; icon: string; label: string }> = [
  { key: "recent", icon: "🕘", label: "Recent" },
  { key: "smileys", icon: "😀", label: "Smileys" },
  { key: "people", icon: "👍", label: "People" },
  { key: "symbols", icon: "❤️", label: "Symbols" },
  { key: "objects", icon: "⚽", label: "Objects" },
];

const EMOJI_OPTIONS: Array<{ emoji: string; label: string; category: Exclude<EmojiCategory, "recent"> }> = [
  { emoji: "😀", label: "grinning face", category: "smileys" },
  { emoji: "😃", label: "smiling face", category: "smileys" },
  { emoji: "😄", label: "happy face", category: "smileys" },
  { emoji: "😁", label: "beaming face", category: "smileys" },
  { emoji: "😆", label: "laughing face", category: "smileys" },
  { emoji: "😂", label: "tears of joy", category: "smileys" },
  { emoji: "🤣", label: "rolling laughter", category: "smileys" },
  { emoji: "😊", label: "smiling eyes", category: "smileys" },
  { emoji: "🙂", label: "slight smile", category: "smileys" },
  { emoji: "😉", label: "wink", category: "smileys" },
  { emoji: "😍", label: "heart eyes", category: "smileys" },
  { emoji: "😘", label: "kiss", category: "smileys" },
  { emoji: "😎", label: "cool", category: "smileys" },
  { emoji: "🤔", label: "thinking", category: "smileys" },
  { emoji: "😴", label: "sleeping", category: "smileys" },
  { emoji: "😭", label: "crying", category: "smileys" },
  { emoji: "😡", label: "angry", category: "smileys" },
  { emoji: "😮", label: "surprised", category: "smileys" },
  { emoji: "🥳", label: "party", category: "smileys" },
  { emoji: "😇", label: "angel", category: "smileys" },

  { emoji: "👍", label: "thumbs up", category: "people" },
  { emoji: "👎", label: "thumbs down", category: "people" },
  { emoji: "👏", label: "clap", category: "people" },
  { emoji: "🙌", label: "raised hands", category: "people" },
  { emoji: "🙏", label: "folded hands", category: "people" },
  { emoji: "👋", label: "waving hand", category: "people" },
  { emoji: "🤝", label: "handshake", category: "people" },
  { emoji: "💪", label: "strong", category: "people" },
  { emoji: "🤞", label: "crossed fingers", category: "people" },
  { emoji: "✌️", label: "peace", category: "people" },
  { emoji: "👌", label: "ok hand", category: "people" },
  { emoji: "🤟", label: "love sign", category: "people" },
  { emoji: "🙋", label: "raising hand", category: "people" },
  { emoji: "💁", label: "help desk", category: "people" },
  { emoji: "🧑‍💻", label: "developer", category: "people" },
  { emoji: "👨‍💼", label: "office worker", category: "people" },
  { emoji: "👩‍💼", label: "business woman", category: "people" },
  { emoji: "🧑‍🎓", label: "student", category: "people" },
  { emoji: "🧑‍🔧", label: "technician", category: "people" },
  { emoji: "🧑‍🚀", label: "astronaut", category: "people" },

  { emoji: "❤️", label: "red heart", category: "symbols" },
  { emoji: "🧡", label: "orange heart", category: "symbols" },
  { emoji: "💛", label: "yellow heart", category: "symbols" },
  { emoji: "💚", label: "green heart", category: "symbols" },
  { emoji: "💙", label: "blue heart", category: "symbols" },
  { emoji: "💜", label: "purple heart", category: "symbols" },
  { emoji: "🤍", label: "white heart", category: "symbols" },
  { emoji: "🖤", label: "black heart", category: "symbols" },
  { emoji: "💔", label: "broken heart", category: "symbols" },
  { emoji: "❣️", label: "heart exclamation", category: "symbols" },
  { emoji: "✨", label: "sparkles", category: "symbols" },
  { emoji: "🔥", label: "fire", category: "symbols" },
  { emoji: "✅", label: "check mark", category: "symbols" },
  { emoji: "❌", label: "cross mark", category: "symbols" },
  { emoji: "⚠️", label: "warning", category: "symbols" },
  { emoji: "🎉", label: "party popper", category: "symbols" },
  { emoji: "💯", label: "hundred", category: "symbols" },
  { emoji: "⭐", label: "star", category: "symbols" },
  { emoji: "📌", label: "pin", category: "symbols" },
  { emoji: "📍", label: "location pin", category: "symbols" },

  { emoji: "📦", label: "package", category: "objects" },
  { emoji: "📄", label: "document", category: "objects" },
  { emoji: "📎", label: "paperclip", category: "objects" },
  { emoji: "📱", label: "phone", category: "objects" },
  { emoji: "💻", label: "laptop", category: "objects" },
  { emoji: "🖥️", label: "desktop", category: "objects" },
  { emoji: "⌚", label: "watch", category: "objects" },
  { emoji: "🎧", label: "headphones", category: "objects" },
  { emoji: "🎁", label: "gift", category: "objects" },
  { emoji: "🛒", label: "cart", category: "objects" },
  { emoji: "🚚", label: "delivery truck", category: "objects" },
  { emoji: "🚀", label: "rocket", category: "objects" },
  { emoji: "✈️", label: "airplane", category: "objects" },
  { emoji: "🏠", label: "home", category: "objects" },
  { emoji: "🏢", label: "office", category: "objects" },
  { emoji: "⚽", label: "football", category: "objects" },
  { emoji: "🏆", label: "trophy", category: "objects" },
  { emoji: "☕", label: "coffee", category: "objects" },
  { emoji: "🍕", label: "pizza", category: "objects" },
  { emoji: "🎂", label: "birthday cake", category: "objects" },
];
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
const CONVERSATIONS_POLL_INTERVAL_MS = 12000;
const MESSAGES_POLL_INTERVAL_MS = 10000;
const INITIAL_MESSAGES_FETCH_LIMIT = 20;
const MESSAGES_FETCH_BATCH_SIZE = 20;
const MAX_MESSAGES_FETCH_LIMIT = 200;
const LOCAL_CACHE_PREFIX = "vaiket_wa_inbox_v2";
const EMOJI_RECENTS_KEY = `${LOCAL_CACHE_PREFIX}_emoji_recent`;
const CHAT_WALLPAPER_STYLE = {
  backgroundColor: "#efeae2",
  backgroundImage: "url('/whatsapp-chat-pattern.svg')",
  backgroundSize: "220px 220px",
} as const;

function uniqueEmojiList(items: Array<{ emoji: string; label: string }>) {
  const seen = new Set<string>();
  const next: Array<{ emoji: string; label: string }> = [];
  for (const item of items) {
    if (seen.has(item.emoji)) continue;
    seen.add(item.emoji);
    next.push(item);
  }
  return next;
}

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

function normalizedConversationStatus(status: string) {
  return status.trim().toLowerCase();
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

type ConversationListItemProps = {
  item: Conversation;
  active: boolean;
  onSelect: (id: string) => void;
  showAccount: boolean;
};

const ConversationListItem = memo(function ConversationListItem({
  item,
  active,
  onSelect,
  showAccount,
}: ConversationListItemProps) {
  const status = normalizedConversationStatus(item.status);
  const preview = conversationPreview(item);

  return (
    <button
      onClick={() => onSelect(item.id)}
      className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
        active
          ? "border-[#d1d7db] bg-[#f0f2f5]"
          : "border-transparent bg-transparent hover:border-[#e9edef] hover:bg-[#f8fafb]"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            active
              ? "bg-[#00a884] text-white"
              : "bg-[#dfe5e7] text-[#54656f]"
          }`}
        >
          {initials(item.contact.name, item.contact.phone)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-[#111b21]">
                  {item.contact.name || item.contact.phone}
                </p>
                <span className={`h-1.5 w-1.5 rounded-full ${status === "active" ? "bg-[#00a884]" : "bg-[#c7ced3]"}`} />
              </div>
              <p className="mt-1 truncate text-xs text-[#667781]">{preview}</p>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-[11px] font-medium text-[#667781]">{formatChatTime(item.lastMessageAt)}</p>
              {showAccount ? (
                <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-[#8696a0]">{item.account.name}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-1.5 flex items-center justify-between gap-2">
            <p className="truncate text-[11px] text-[#8696a0]">{item.contact.phone}</p>
            {item.contact.optedIn ? <BadgeCheck className="h-3.5 w-3.5 text-[#00a884]" /> : null}
          </div>
        </div>
      </div>
    </button>
  );
});

export default function WhatsAppInboxPage() {
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("all");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [conversationFilter, setConversationFilter] = useState<ConversationFilter>("all");
  const [mobileView, setMobileView] = useState<MobileView>("list");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [refreshingInbox, setRefreshingInbox] = useState(false);
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiSearch, setEmojiSearch] = useState("");
  const [emojiCategory, setEmojiCategory] = useState<EmojiCategory>("recent");
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [pendingAttachment, setPendingAttachment] = useState<ComposerAttachment | null>(null);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const composerTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const composerSelectionRef = useRef({ start: 0, end: 0 });
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
  const emojiToggleRef = useRef<HTMLButtonElement | null>(null);
  const attachmentRef = useRef<HTMLInputElement | null>(null);
  const messageScrollRef = useRef<HTMLDivElement | null>(null);
  const shouldStickToBottomRef = useRef(true);
  const previousConversationIdRef = useRef("");
  const selectedConversationIdRef = useRef("");
  const conversationDigestRef = useRef("");
  const messagesDigestRef = useRef("");
  const conversationsAbortRef = useRef<AbortController | null>(null);
  const messagesAbortRef = useRef<AbortController | null>(null);
  const conversationsRequestInFlightRef = useRef(false);
  const messagesRequestInFlightRef = useRef(false);
  const messagesFetchLimitRef = useRef(INITIAL_MESSAGES_FETCH_LIMIT);
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

  const emojiLabelLookup = useMemo(() => {
    const next = new Map<string, string>();
    for (const item of EMOJI_OPTIONS) {
      if (!next.has(item.emoji)) next.set(item.emoji, item.label);
    }
    return next;
  }, []);

  const emojiPickerItems = useMemo(() => {
    const query = emojiSearch.trim().toLowerCase();

    if (query) {
      const recentMatches = recentEmojis
        .map((emoji) => ({ emoji, label: emojiLabelLookup.get(emoji) || "recent emoji" }))
        .filter((item) => item.label.includes(query) || item.emoji.includes(query));

      const optionMatches = EMOJI_OPTIONS
        .filter((item) => item.label.includes(query) || item.emoji.includes(query))
        .map((item) => ({ emoji: item.emoji, label: item.label }));

      return uniqueEmojiList([...recentMatches, ...optionMatches]);
    }

    if (emojiCategory === "recent") {
      return recentEmojis.map((emoji) => ({
        emoji,
        label: emojiLabelLookup.get(emoji) || "recent emoji",
      }));
    }

    return EMOJI_OPTIONS
      .filter((item) => item.category === emojiCategory)
      .map((item) => ({ emoji: item.emoji, label: item.label }));
  }, [emojiCategory, emojiLabelLookup, emojiSearch, recentEmojis]);

  const deferredQuery = useDeferredValue(query);
  const deferredChatSearch = useDeferredValue(chatSearch);

  const filteredConversations = useMemo(() => {
    const value = deferredQuery.trim().toLowerCase();
    return conversations.filter((item) => {
      const status = normalizedConversationStatus(item.status);
      const matchesFilter =
        conversationFilter === "all"
          ? true
          : conversationFilter === "tagged"
            ? item.contact.tags.length > 0
            : status === conversationFilter;
      if (!matchesFilter) return false;
      if (!value) return true;
      const name = (item.contact.name || "").toLowerCase();
      const phone = item.contact.phone.toLowerCase();
      const account = item.account.name.toLowerCase();
      const preview = (item.messages[0]?.text || item.messages[0]?.messageType || "").toLowerCase();
      return name.includes(value) || phone.includes(value) || account.includes(value) || preview.includes(value);
    });
  }, [conversations, conversationFilter, deferredQuery]);

  const visibleMessages = useMemo(() => {
    const needle = deferredChatSearch.trim().toLowerCase();
    if (!needle) return messages;
    return messages.filter((item) => {
      const textValue = (item.text || "").toLowerCase();
      const typeValue = item.messageType.toLowerCase();
      return textValue.includes(needle) || typeValue.includes(needle);
    });
  }, [deferredChatSearch, messages]);

  const chatRows = useMemo(() => buildChatRows(visibleMessages), [visibleMessages]);

  const replyToMessage = useMemo(
    () => (replyToId ? messages.find((item) => item.id === replyToId) || null : null),
    [messages, replyToId]
  );

  const chatStatusText = useMemo(() => {
    if (!selectedConversation) return "";
    if (selectedConversation.status.trim().toLowerCase() === "active") return "online";
    const stamp = formatChatTime(selectedConversation.lastMessageAt);
    return stamp ? `last seen ${stamp}` : "offline";
  }, [selectedConversation]);

  const scopedConversationStats = useMemo(() => {
    return conversations.reduce(
      (acc, item) => {
        const status = normalizedConversationStatus(item.status);
        acc.total += 1;
        if (status === "active") acc.active += 1;
        if (status === "closed") acc.closed += 1;
        if (item.contact.tags.length > 0) acc.tagged += 1;
        if (item.contact.optedIn) acc.optedIn += 1;
        return acc;
      },
      { total: 0, active: 0, closed: 0, tagged: 0, optedIn: 0 }
    );
  }, [conversations]);

  const conversationFilterOptions = useMemo(
    () => [
      { value: "all" as const, label: "All", count: scopedConversationStats.total },
      { value: "active" as const, label: "Active", count: scopedConversationStats.active },
      { value: "closed" as const, label: "Closed", count: scopedConversationStats.closed },
      { value: "tagged" as const, label: "Tagged", count: scopedConversationStats.tagged },
    ],
    [scopedConversationStats]
  );

  const selectedConversationStats = useMemo(() => {
    if (!selectedConversation) {
      return {
        mediaMessages: 0,
        outboundMessages: 0,
        inboundMessages: 0,
        lastActivityLabel: "-",
        tags: [] as string[],
        latestPreview: "-",
      };
    }
    const mediaMessages = messages.filter(
      (item) => Boolean(item.mediaUrl) || item.messageType.trim().toLowerCase() !== "text"
    ).length;
    return {
      mediaMessages,
      outboundMessages: messages.filter((item) => item.direction === "outbound").length,
      inboundMessages: messages.filter((item) => item.direction !== "outbound").length,
      lastActivityLabel: formatChatTime(selectedConversation.lastMessageAt) || "-",
      tags: selectedConversation.contact.tags,
      latestPreview: conversationPreview(selectedConversation),
    };
  }, [messages, selectedConversation]);

  const profileDetailCards = useMemo(() => {
    if (!selectedConversation) return [];
    return [
      { label: "Source", value: selectedConversation.contact.source || "manual" },
      { label: "Account", value: selectedConversation.account.name },
      { label: "Last active", value: selectedConversationStats.lastActivityLabel },
      { label: "Inbound", value: selectedConversationStats.inboundMessages },
      { label: "Outbound", value: selectedConversationStats.outboundMessages },
      { label: "Media", value: selectedConversationStats.mediaMessages },
    ];
  }, [selectedConversation, selectedConversationStats]);

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
    async (opts?: { silent?: boolean; force?: boolean }) => {
      const silent = Boolean(opts?.silent);
      const force = Boolean(opts?.force);

      if (conversationsRequestInFlightRef.current && !force) return;

      if (force) {
        conversationsAbortRef.current?.abort();
      }

      const controller = new AbortController();
      conversationsAbortRef.current = controller;
      conversationsRequestInFlightRef.current = true;

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
        const activeConversationId = selectedConversationIdRef.current;
        const nextSelectedConversationId =
          activeConversationId && next.some((item) => item.id === activeConversationId)
            ? activeConversationId
            : next[0]?.id || "";

        if (digest !== conversationDigestRef.current) {
          conversationDigestRef.current = digest;
          setConversations(next);
        }

        if (nextSelectedConversationId !== activeConversationId) {
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
        if (conversationsAbortRef.current === controller) {
          conversationsRequestInFlightRef.current = false;
          setLoadingConversations(false);
        }
      }
    },
    [selectedAccountId]
  );

  const loadMessages = useCallback(
    async (conversationId: string, opts?: { silent?: boolean; force?: boolean; limit?: number }) => {
      const silent = Boolean(opts?.silent);
      const force = Boolean(opts?.force);
      const requestedLimit = Number(opts?.limit || messagesFetchLimitRef.current);
      const limit = Math.max(20, Math.min(Math.floor(requestedLimit), MAX_MESSAGES_FETCH_LIMIT));

      if (!conversationId) return;
      if (messagesRequestInFlightRef.current && !force) return;

      if (force) {
        messagesAbortRef.current?.abort();
      }

      const controller = new AbortController();
      messagesAbortRef.current = controller;
      messagesRequestInFlightRef.current = true;
      messagesFetchLimitRef.current = limit;

      try {
        if (!silent) {
          setLoadingMessages(true);
          setError(null);
        }
        const endpoint = `/api/whatsapp/inbox/messages?conversationId=${encodeURIComponent(conversationId)}&limit=${limit}`;
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
        if (messagesAbortRef.current === controller) {
          messagesRequestInFlightRef.current = false;
          setLoadingMessages(false);
        }
      }
    },
    []
  );

  const refreshInbox = useCallback(async () => {
    setRefreshingInbox(true);
    try {
      await Promise.all([
        loadConversations({ force: true }),
        selectedConversationIdRef.current
          ? loadMessages(selectedConversationIdRef.current, { force: true })
          : Promise.resolve(),
      ]);
    } finally {
      setRefreshingInbox(false);
    }
  }, [loadConversations, loadMessages]);

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

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
    try {
      const cachedRecents = safeParseJson<string[]>(localStorage.getItem(EMOJI_RECENTS_KEY));
      if (!Array.isArray(cachedRecents)) return;
      const cleaned = cachedRecents.filter((item): item is string => typeof item === "string");
      setRecentEmojis(cleaned.slice(0, 30));
      if (cleaned.length > 0) setEmojiCategory("recent");
    } catch {
      // ignore cache read failures
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(EMOJI_RECENTS_KEY, JSON.stringify(recentEmojis.slice(0, 30)));
    } catch {
      // ignore cache write failures
    }
  }, [recentEmojis]);

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
      setSelectedConversationId(
        (prev) => prev || cached.selectedConversationId || cached.conversations[0]?.id || ""
      );
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
    void loadConversations({ force: true });
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      messagesDigestRef.current = "0";
      messagesFetchLimitRef.current = INITIAL_MESSAGES_FETCH_LIMIT;
      return;
    }
    messagesFetchLimitRef.current = INITIAL_MESSAGES_FETCH_LIMIT;
    let hasCachedMessages = false;
    try {
      const cached = safeParseJson<MessagesCache>(
        localStorage.getItem(messagesCacheKey(selectedConversationId))
      );
      if (cached?.conversationId === selectedConversationId && cached.messages.length > 0) {
        const cachedInitialMessages = cached.messages.slice(-INITIAL_MESSAGES_FETCH_LIMIT);
        messagesDigestRef.current = buildMessagesDigest(cachedInitialMessages);
        setMessages(cachedInitialMessages);
        setLoadingMessages(false);
        hasCachedMessages = true;
      }
    } catch {
      // ignore cache read failures
    }
    void loadMessages(selectedConversationId, {
      silent: hasCachedMessages,
      force: true,
      limit: INITIAL_MESSAGES_FETCH_LIMIT,
    });
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
    const timer = window.setInterval(
      () => void loadConversations({ silent: true }),
      CONVERSATIONS_POLL_INTERVAL_MS
    );
    return () => window.clearInterval(timer);
  }, [loadConversations, isPageVisible]);

  useEffect(() => {
    if (!selectedConversationId || !isPageVisible) return;
    const timer = window.setInterval(
      () => void loadMessages(selectedConversationId, { silent: true }),
      MESSAGES_POLL_INTERVAL_MS
    );
    return () => window.clearInterval(timer);
  }, [selectedConversationId, loadMessages, isPageVisible]);

  useEffect(() => {
    if (!isPageVisible) return;
    void loadConversations({ silent: true });
    if (selectedConversationIdRef.current) {
      void loadMessages(selectedConversationIdRef.current, { silent: true });
    }
  }, [isPageVisible, loadConversations, loadMessages]);

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
  }, [selectedConversationId, visibleMessages.length]);

  useEffect(() => {
    if (!pendingAttachment?.previewUrl) return;
    return () => URL.revokeObjectURL(pendingAttachment.previewUrl);
  }, [pendingAttachment?.previewUrl]);

  useEffect(() => {
    if (!showEmojiPicker) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (emojiPickerRef.current?.contains(target)) return;
      if (emojiToggleRef.current?.contains(target)) return;
      setShowEmojiPicker(false);
      setEmojiSearch("");
    };

    const onEsc = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setShowEmojiPicker(false);
      setEmojiSearch("");
    };

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("touchstart", onPointerDown);
    window.addEventListener("keydown", onEsc);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("touchstart", onPointerDown);
      window.removeEventListener("keydown", onEsc);
    };
  }, [showEmojiPicker]);

  useEffect(() => {
    return () => {
      conversationsAbortRef.current?.abort();
      messagesAbortRef.current?.abort();
    };
  }, []);

  const loadMoreMessages = useCallback(async () => {
    if (!selectedConversationIdRef.current) return;
    if (loadingMessages || messagesRequestInFlightRef.current) return;

    const currentLimit = messagesFetchLimitRef.current;
    if (messages.length < currentLimit) return;

    const nextLimit = Math.min(currentLimit + MESSAGES_FETCH_BATCH_SIZE, MAX_MESSAGES_FETCH_LIMIT);
    if (nextLimit === currentLimit) return;

    const el = messageScrollRef.current;
    const previousScrollHeight = el?.scrollHeight || 0;
    const previousScrollTop = el?.scrollTop || 0;
    messagesFetchLimitRef.current = nextLimit;
    setLoadingOlderMessages(true);
    try {
      await loadMessages(selectedConversationIdRef.current, {
        silent: true,
        force: true,
        limit: nextLimit,
      });
    } finally {
      setLoadingOlderMessages(false);
    }

    if (el) {
      window.requestAnimationFrame(() => {
        const nextScrollHeight = el.scrollHeight;
        el.scrollTop = Math.max(0, nextScrollHeight - previousScrollHeight + previousScrollTop);
      });
    }
  }, [loadMessages, loadingMessages, messages.length]);

  const onMessagesScroll = useCallback(() => {
    if (!messageScrollRef.current) return;
    const el = messageScrollRef.current;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldStickToBottomRef.current = distanceFromBottom < 96;
    if (el.scrollTop <= 32) {
      void loadMoreMessages();
    }
  }, [loadMoreMessages]);

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
      await Promise.all([
        loadMessages(selectedConversationId, { force: true }),
        loadConversations({ force: true }),
      ]);
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
      await loadConversations({ force: true });
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

  const onCopyMessage = async (message: Message) => {
    const content = message.text || message.mediaUrl || "";
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      // ignore clipboard failures in unsupported browsers
    }
  };

  const onApplyTemplate = (template: string) => {
    setText(template);
    setShowTemplateMenu(false);
    setShowEmojiPicker(false);
    window.requestAnimationFrame(() => {
      if (!composerTextareaRef.current) return;
      const cursor = template.length;
      composerTextareaRef.current.focus();
      composerTextareaRef.current.setSelectionRange(cursor, cursor);
      composerSelectionRef.current = { start: cursor, end: cursor };
    });
  };

  const onApplyQuickReply = (reply: string) => {
    setText(reply);
    setShowQuickReplies(false);
    setShowEmojiPicker(false);
    window.requestAnimationFrame(() => {
      if (!composerTextareaRef.current) return;
      const cursor = reply.length;
      composerTextareaRef.current.focus();
      composerTextareaRef.current.setSelectionRange(cursor, cursor);
      composerSelectionRef.current = { start: cursor, end: cursor };
    });
  };

  const rememberComposerSelection = () => {
    if (!composerTextareaRef.current) return;
    composerSelectionRef.current = {
      start: composerTextareaRef.current.selectionStart ?? 0,
      end: composerTextareaRef.current.selectionEnd ?? 0,
    };
  };

  const onInsertEmoji = (emoji: string) => {
    const textarea = composerTextareaRef.current;
    const isFocused = typeof document !== "undefined" && document.activeElement === textarea;
    const baseStart = isFocused
      ? (textarea?.selectionStart ?? composerSelectionRef.current.start)
      : composerSelectionRef.current.start;
    const baseEnd = isFocused
      ? (textarea?.selectionEnd ?? composerSelectionRef.current.end)
      : composerSelectionRef.current.end;

    let nextCursor = baseStart + emoji.length;
    setText((prev) => {
      const safeStart = Math.max(0, Math.min(baseStart, prev.length));
      const safeEnd = Math.max(safeStart, Math.min(baseEnd, prev.length));
      nextCursor = safeStart + emoji.length;
      return `${prev.slice(0, safeStart)}${emoji}${prev.slice(safeEnd)}`;
    });

    setRecentEmojis((prev) => [emoji, ...prev.filter((item) => item !== emoji)].slice(0, 30));

    window.requestAnimationFrame(() => {
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(nextCursor, nextCursor);
      composerSelectionRef.current = { start: nextCursor, end: nextCursor };
    });
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
  };

  const onExportConversation = () => {
    if (!selectedConversation) return;
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
  };

  const selectConversation = useCallback(
    (id: string) => {
      clearPendingAttachment();
      shouldStickToBottomRef.current = true;
      setMobileView("chat");
      setShowEmojiPicker(false);
      setShowTemplateMenu(false);
      setShowQuickReplies(false);
      setReplyToId(null);
      setChatSearch("");

      if (id === selectedConversationIdRef.current) return;

      messagesAbortRef.current?.abort();
      messagesRequestInFlightRef.current = false;
      messagesFetchLimitRef.current = INITIAL_MESSAGES_FETCH_LIMIT;
      setMessages([]);
      messagesDigestRef.current = "0";
      setSelectedConversationId(id);
    },
    [clearPendingAttachment]
  );

  return (
    <div className="mx-auto max-w-[1680px] space-y-4 pb-24 lg:pb-8">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d1d7db] bg-[#f0f2f5] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-[#111b21]">WhatsApp</p>
          <span className={`h-2 w-2 rounded-full ${isPageVisible ? "bg-[#00a884]" : "bg-amber-500"}`} />
          <p className="text-xs text-[#667781]">{isPageVisible ? "Connected" : "Sync paused"}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center rounded-full border border-[#d1d7db] bg-white px-3 py-1.5 text-xs text-[#54656f]">
            <span className="mr-2 hidden sm:inline">Device</span>
            <select
              value={selectedAccountId}
              onChange={(event) => setSelectedAccountId(event.target.value)}
              className="bg-transparent text-xs outline-none"
            >
              <option value="all">All devices</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void refreshInbox()}
            disabled={refreshingInbox}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#d1d7db] bg-white text-[#54656f] transition hover:bg-[#f5f6f6] disabled:cursor-not-allowed disabled:opacity-70"
            title={refreshingInbox ? "Refreshing" : "Refresh"}
          >
            <RefreshCcw className={`h-4 w-4 ${refreshingInbox ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/dashboard/whatsapp"
            className="inline-flex items-center rounded-full border border-[#d1d7db] bg-white px-3 py-1.5 text-xs font-medium text-[#54656f] transition hover:bg-[#f5f6f6]"
          >
            Back
          </Link>
        </div>
      </section>

      {error ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50/95 px-4 py-3 text-sm text-rose-700 shadow-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        </section>
      ) : null}

      <section className="grid min-h-[74vh] grid-cols-1 overflow-hidden rounded-xl border border-[#d1d7db] bg-white shadow-sm lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside
          className={`overflow-hidden bg-white ${
            mobileView === "list" ? "block" : "hidden"
          } lg:block lg:border-r lg:border-[#d1d7db]`}
        >
          <div className="border-b border-[#d1d7db] bg-[#f0f2f5] p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-medium text-[#111b21]">Chats</h2>
                <p className="mt-1 text-xs text-[#667781]">
                  {filteredConversations.length} chats
                </p>
              </div>
              <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-white px-2.5 text-xs font-semibold text-[#54656f]">
                {filteredConversations.length}
              </span>
            </div>

            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8696a0]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search or start a new chat"
                className="w-full rounded-lg border border-[#d1d7db] bg-white py-2.5 pl-10 pr-3 text-sm text-[#111b21] outline-none transition focus:border-[#00a884]"
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {conversationFilterOptions.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setConversationFilter(item.value)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    conversationFilter === item.value
                      ? "border-[#00a884]/30 bg-[#e7fce3] text-[#008069]"
                      : "border-[#d1d7db] bg-white text-[#54656f] hover:bg-[#f5f6f6]"
                  }`}
                >
                  {item.label}
                  <span className="rounded-full bg-[#f0f2f5] px-1.5 py-0.5 text-[10px] text-[#667781]">
                    {item.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[72vh] space-y-1.5 overflow-y-auto bg-white p-2.5">
            {loadingConversations ? (
              <div className="space-y-2 py-1">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div
                    key={`conversation_skeleton_${idx}`}
                    className="animate-pulse rounded-2xl border border-slate-200 bg-white/80 px-3 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="h-11 w-11 rounded-full bg-slate-200" />
                      <div className="flex-1 space-y-2">
                        <span className="block h-3 w-28 rounded bg-slate-200" />
                        <span className="block h-2.5 w-40 rounded bg-slate-200" />
                        <span className="block h-2.5 w-24 rounded bg-slate-200" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                <MessageSquareText className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm font-semibold text-slate-700">No conversations found</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Try another search term or switch the status filter.
                </p>
              </div>
            ) : (
              filteredConversations.map((item) => (
                <ConversationListItem
                  key={item.id}
                  item={item}
                  active={selectedConversationId === item.id}
                  onSelect={selectConversation}
                  showAccount={selectedAccountId === "all" && accounts.length > 1}
                />
              ))
            )}
          </div>
        </aside>

        <main
          className={`overflow-hidden bg-[#efeae2] ${
            mobileView === "chat" ? "flex" : "hidden"
          } ${mobileView === "profile" ? "lg:hidden" : "lg:flex"}`}
        >
          {!selectedConversation ? (
            <div className="flex min-h-[68vh] w-full items-center justify-center bg-[#efeae2] p-6 text-center">
              <div className="max-w-md">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-emerald-700 shadow-sm">
                  <MessageSquareText className="h-8 w-8" />
                </div>
                <p className="mt-4 text-lg font-semibold text-slate-800">Open a conversation</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Pick any thread from the left to see message history, customer details, and the reply composer.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex w-full flex-col">
              <header className="border-b border-[#d1d7db] bg-[#f0f2f5] px-4 py-2.5 md:px-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setMobileView("list")}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d1d7db] bg-white text-[#54656f] lg:hidden"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                      {initials(selectedConversation.contact.name, selectedConversation.contact.phone)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#111b21]">
                        {selectedConversation.contact.name || selectedConversation.contact.phone}
                      </p>
                      <p className="truncate text-xs text-[#667781]">
                        {selectedConversation.account.name}
                        <span className="mx-2 text-[#c7ced3]">|</span>
                        <span className="inline-flex items-center gap-1">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              selectedConversation.status.trim().toLowerCase() === "active"
                                ? "bg-[#00a884]"
                                : "bg-[#8696a0]"
                            }`}
                          />
                          {chatStatusText}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${selectedConversation.contact.phone}`}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d1d7db] bg-white text-[#54656f] transition hover:bg-[#f5f6f6]"
                      title="Call contact"
                    >
                      <PhoneCall className="h-4 w-4" />
                    </a>
                    <button
                      type="button"
                      onClick={onExportConversation}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d1d7db] bg-white text-[#54656f] transition hover:bg-[#f5f6f6]"
                      title="Export conversation"
                    >
                      <FileText className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobileView("profile")}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d1d7db] bg-white text-[#54656f] transition hover:bg-[#f5f6f6]"
                    >
                      <UserCircle2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="relative mt-2">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8696a0]" />
                  <input
                    value={chatSearch}
                    onChange={(event) => setChatSearch(event.target.value)}
                    placeholder="Search in chat"
                    className="h-9 w-full rounded-lg border border-[#d1d7db] bg-white pl-10 pr-3 text-sm text-[#111b21] outline-none transition focus:border-[#00a884]"
                  />
                </div>
              </header>

              <div className="flex-1 overflow-hidden bg-[#efeae2]">
                <div
                  ref={messageScrollRef}
                  onScroll={onMessagesScroll}
                  className="h-[56vh] max-h-[56vh] overflow-y-auto px-3 py-4 md:h-[60vh] md:max-h-[60vh] md:px-6 md:py-6"
                  style={CHAT_WALLPAPER_STYLE}
                >
                  {loadingMessages ? (
                    <div className="mx-auto max-w-4xl space-y-3 py-2">
                      {Array.from({ length: 8 }).map((_, idx) => (
                        <div key={`message_skeleton_${idx}`} className={`flex ${idx % 2 === 0 ? "justify-start" : "justify-end"}`}>
                          <span className="h-14 w-48 animate-pulse rounded-[22px] bg-white/80 shadow-sm" />
                        </div>
                      ))}
                    </div>
                  ) : chatRows.length === 0 ? (
                    <div className="flex h-full min-h-[38vh] items-center justify-center text-center">
                      <div className="max-w-sm rounded-[24px] border border-slate-200 bg-white/95 px-5 py-8 shadow-sm">
                        <p className="text-base font-semibold text-slate-800">
                          {chatSearch ? "No matching messages" : "No messages in this conversation"}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          {chatSearch
                            ? "Clear the in-thread search to see the full history again."
                            : "Send the first reply from the composer below to start this thread."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mx-auto max-w-4xl space-y-2.5">
                      {loadingOlderMessages ? (
                        <div className="flex justify-center py-1">
                          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/95 px-3 py-1 text-[11px] font-medium text-slate-500 shadow-sm">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Loading older messages...
                          </span>
                        </div>
                      ) : null}
                      {chatRows.map((row) => {
                        if (row.kind === "separator") {
                          return (
                            <div key={row.id} className="flex justify-center py-1">
                              <span className="rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[11px] font-medium text-slate-600 shadow-sm">
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
                        return (
                          <div key={msg.id} className={`flex ${outbound ? "justify-end" : "justify-start"}`}>
                            <div className="max-w-[88%] md:max-w-[68%]">
                              <div
                                className={`inline-block w-fit max-w-full rounded-[9px] px-2.5 py-1.5 text-[14px] leading-[1.45] ${
                                  outbound
                                    ? "bg-[#d9fdd3] text-[#111b21]"
                                    : "bg-white text-[#111b21]"
                                }`}
                              >
                                {showImage && mediaUrl ? (
                                  <button type="button" onClick={() => setPreviewImageUrl(mediaUrl)} className="block overflow-hidden rounded-2xl border border-slate-200">
                                    <img src={mediaUrl} alt="attachment" className="max-h-60 w-full object-cover" />
                                  </button>
                                ) : null}

                                {showVideo && mediaUrl ? (
                                  <a href={mediaUrl} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-xs text-slate-700">
                                    <Video className="h-4 w-4 text-indigo-600" />
                                    <span>Open video attachment</span>
                                  </a>
                                ) : null}

                                {showDoc && mediaUrl ? (
                                  <a href={mediaUrl} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-xs text-slate-700">
                                    <FileText className="h-4 w-4 text-blue-600" />
                                    <span>Open document or PDF</span>
                                  </a>
                                ) : null}

                                {showVoice && mediaUrl ? (
                                  <div className="mt-1 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                                    <p className="mb-2 text-xs font-medium text-slate-600">Voice note</p>
                                    <audio controls className="h-8 w-full">
                                      <source src={mediaUrl} />
                                    </audio>
                                  </div>
                                ) : null}

                                {!showImage && !showVideo && !showDoc && !showVoice ? (
                                  <p className="whitespace-pre-wrap break-words leading-[1.45]">
                                    {captionText || "-"}
                                  </p>
                                ) : captionText ? (
                                  <p className="mt-1.5 whitespace-pre-wrap break-words leading-[1.45]">{captionText}</p>
                                ) : null}

                                <div className="mt-1.5 flex items-center justify-end gap-1 text-[11px] text-[#667781]">
                                  <span>{formatChatTime(msg.createdAt)}</span>
                                  {outbound ? <OutboundStatus status={msg.status} /> : null}
                                </div>
                              </div>
                              <div className={`mt-1 hidden items-center gap-2 text-[11px] ${outbound ? "justify-end" : "justify-start"}`}>
                                <button type="button" onClick={() => onReplyMessage(msg.id)}>
                                  Reply
                                </button>
                                <button type="button" onClick={() => void onCopyMessage(msg)}>
                                  Copy
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                    </div>
                  )}
                </div>
              </div>

              <footer className="border-t border-[#d1d7db] bg-[#f0f2f5] px-3 py-2.5 md:px-4">
                <div className="mx-auto max-w-4xl">
                  {replyToMessage ? (
                    <div className="mb-2 flex items-center justify-between rounded-xl border border-[#d1d7db] bg-white px-3 py-2 text-xs">
                      <div className="min-w-0">
                        <p className="font-medium text-[#111b21]">Replying to</p>
                        <p className="truncate text-[#667781]">{replyToMessage.text || `[${replyToMessage.messageType}]`}</p>
                      </div>
                      <button onClick={() => setReplyToId(null)} className="rounded-full px-2.5 py-1 text-[#667781] hover:bg-[#f0f2f5]">
                        Clear
                      </button>
                    </div>
                  ) : null}

                  {pendingAttachment ? (
                    <div className="mb-2 rounded-xl border border-[#d1d7db] bg-white p-3">
                      <div className="mb-2 flex items-center justify-between gap-2 text-xs text-[#54656f]">
                        <p className="truncate">
                          Attached {pendingAttachment.mediaType}: {pendingAttachment.fileName}
                        </p>
                        <button
                          type="button"
                          onClick={clearPendingAttachment}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[#667781] hover:bg-[#f0f2f5]"
                          title="Remove attachment"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {pendingAttachment.mediaType === "image" && pendingAttachment.previewUrl ? (
                        <img
                          src={pendingAttachment.previewUrl}
                          alt={pendingAttachment.fileName}
                          className="max-h-44 rounded-2xl border border-slate-200 object-cover"
                        />
                      ) : null}
                      {pendingAttachment.mediaType === "video" && pendingAttachment.previewUrl ? (
                        <video controls className="max-h-44 rounded-2xl border border-slate-200">
                          <source src={pendingAttachment.previewUrl} />
                        </video>
                      ) : null}
                      {pendingAttachment.mediaType === "audio" && pendingAttachment.previewUrl ? (
                        <audio controls className="h-8 w-full">
                          <source src={pendingAttachment.previewUrl} />
                        </audio>
                      ) : null}
                      {pendingAttachment.mediaType === "document" ? (
                        <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
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

                  <div className="mb-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => attachmentRef.current?.click()}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d1d7db] bg-white text-[#54656f] hover:bg-[#f5f6f6]"
                      title="Attach"
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                    </button>

                    <button
                      ref={emojiToggleRef}
                      type="button"
                      onClick={() => {
                        const next = !showEmojiPicker;
                        setShowEmojiPicker(next);
                        if (!next) {
                          setEmojiSearch("");
                        } else if (emojiCategory === "recent" && recentEmojis.length === 0) {
                          setEmojiCategory("smileys");
                        }
                        setShowTemplateMenu(false);
                        setShowQuickReplies(false);
                      }}
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${
                        showEmojiPicker
                          ? "border-[#00a884] bg-[#e7fce3] text-[#008069]"
                          : "border-[#d1d7db] bg-white text-[#54656f] hover:bg-[#f5f6f6]"
                      }`}
                      title="Emoji"
                    >
                      <span className="text-base leading-none">😊</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowTemplateMenu((prev) => !prev);
                        setShowEmojiPicker(false);
                        setShowQuickReplies(false);
                      }}
                      className={`hidden h-10 items-center rounded-full border px-3 text-xs font-semibold transition ${
                        showTemplateMenu
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
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
                      className={`hidden h-10 items-center rounded-full border px-3 text-xs font-semibold transition ${
                        showQuickReplies
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      Quick replies
                    </button>

                    <span className="ml-auto hidden text-[11px] font-medium text-[#8696a0] lg:inline">Enter to send</span>
                  </div>

                  <div className="relative rounded-[22px] border border-[#d1d7db] bg-white px-3 py-1.5">
                    <div className="flex items-end gap-2">
                      <textarea
                        ref={composerTextareaRef}
                        value={text}
                        onChange={(event) => {
                          setText(event.target.value);
                          composerSelectionRef.current = {
                            start: event.target.selectionStart ?? event.target.value.length,
                            end: event.target.selectionEnd ?? event.target.value.length,
                          };
                        }}
                        onClick={rememberComposerSelection}
                        onSelect={rememberComposerSelection}
                        onKeyUp={rememberComposerSelection}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            void onSend();
                          }
                        }}
                        rows={3}
                        placeholder="Type a message"
                        className="min-h-[42px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-[#111b21] outline-none placeholder:text-[#8696a0]"
                      />

                      <button
                        type="button"
                        onClick={() => void onSend()}
                        disabled={sending || (!text.trim() && !pendingAttachment)}
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white transition hover:bg-[#008069] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
                      </button>
                    </div>

                    {showEmojiPicker ? (
                      <div
                        ref={emojiPickerRef}
                        className="absolute bottom-full left-0 z-20 mb-2 w-[min(360px,92vw)] rounded-2xl border border-slate-200 bg-white p-2 shadow-lg"
                      >
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                          <input
                            value={emojiSearch}
                            onChange={(event) => setEmojiSearch(event.target.value)}
                            placeholder="Search emoji"
                            className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-2 text-xs text-slate-700 outline-none focus:border-emerald-300 focus:bg-white"
                          />
                        </div>

                        <div className="mt-2 flex flex-wrap gap-1">
                          {EMOJI_CATEGORY_TABS.map((tab) => (
                            <button
                              key={tab.key}
                              type="button"
                              onClick={() => setEmojiCategory(tab.key)}
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium transition ${
                                emojiCategory === tab.key
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                              title={tab.label}
                            >
                              <span>{tab.icon}</span>
                              <span>{tab.label}</span>
                            </button>
                          ))}
                        </div>

                        <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2">
                          {emojiPickerItems.length === 0 ? (
                            <p className="px-1 py-2 text-xs text-slate-500">No emoji found</p>
                          ) : (
                            <div className="grid grid-cols-8 gap-1">
                              {emojiPickerItems.map((item) => (
                                <button
                                  key={`composer_emoji_${item.emoji}`}
                                  type="button"
                                  onClick={() => onInsertEmoji(item.emoji)}
                                  className="rounded-lg px-1 py-1.5 text-lg leading-none hover:bg-slate-100"
                                  title={item.label}
                                >
                                  {item.emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}

                    {showTemplateMenu ? (
                      <div className="absolute bottom-full left-0 z-20 mb-2 w-80 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
                        <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Templates</p>
                        {TEMPLATE_MESSAGES.map((item) => (
                          <button key={item} onClick={() => onApplyTemplate(item)} className="w-full rounded-xl px-2 py-2 text-left text-xs text-slate-700 hover:bg-slate-100">
                            {item}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {showQuickReplies ? (
                      <div className="absolute bottom-full left-0 z-20 mb-2 w-80 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
                        <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Quick replies</p>
                        {QUICK_REPLIES.map((item) => (
                          <button key={item} onClick={() => onApplyQuickReply(item)} className="w-full rounded-xl px-2 py-2 text-left text-xs text-slate-700 hover:bg-slate-100">
                            {item}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-1.5 flex items-center justify-between gap-3 px-1 text-[11px] text-[#8696a0]">
                    <p>{selectedConversation.account.name}</p>
                    <p>{pendingAttachment ? "Attachment ready" : ""}</p>
                  </div>
                </div>
              </footer>
            </div>
          )}
        </main>

        <aside
          className={`overflow-hidden bg-[#f0f2f5] ${
            mobileView === "profile" ? "block" : "hidden"
          } lg:col-span-1`}
        >
          {!selectedConversation ? (
            <div className="flex min-h-[68vh] items-center justify-center p-6 text-center">
              <div className="max-w-sm">
                <UserCircle2 className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm font-semibold text-slate-700">No contact selected</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Choose a conversation to view contact details and CRM fields.
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full max-h-[74vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-200 bg-[#f0efee] p-4">
                <div>
                  <p className="text-base font-semibold text-slate-900">Contact info</p>
                  <p className="text-xs text-slate-500">Profile and CRM details for this chat</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileView("chat")}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4 p-4">
                <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                      {initials(selectedConversation.contact.name, selectedConversation.contact.phone)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-semibold text-slate-900">
                        {selectedConversation.contact.name || "Unnamed contact"}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">{selectedConversation.contact.phone}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${conversationStatusClass(
                            selectedConversation.status
                          )}`}
                        >
                          {selectedConversation.status}
                        </span>
                        {contactForm.optedIn ? (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                            Opted-in
                          </span>
                        ) : (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                            Opt-in off
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <a
                      href={`tel:${selectedConversation.contact.phone}`}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <PhoneCall className="h-4 w-4 text-emerald-600" />
                      Call
                    </a>
                    {selectedConversation.contact.email ? (
                      <a
                        href={`mailto:${selectedConversation.contact.email}`}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Mail className="h-4 w-4 text-sky-600" />
                        Email
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-400"
                      >
                        <Mail className="h-4 w-4" />
                        No email
                      </button>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Conversation overview</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {profileDetailCards.map((card) => (
                      <div key={card.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">{card.label}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{card.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2">
                    <Tags className="h-4 w-4 text-sky-600" />
                    <p className="text-sm font-semibold text-slate-900">Tags</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedConversationStats.tags.length > 0 ? (
                      selectedConversationStats.tags.map((tag) => (
                        <span
                          key={`${selectedConversation.id}_profile_${tag}`}
                          className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700"
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500">No tags added yet.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Latest message</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{selectedConversationStats.latestPreview}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-slate-900">Edit contact</p>
                    <p className="mt-1 text-xs text-slate-500">Update customer details without leaving the conversation.</p>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Name</label>
                      <input
                        value={contactForm.name}
                        onChange={(event) => setContactForm((prev) => ({ ...prev, name: event.target.value }))}
                        placeholder="Name"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-300 focus:bg-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</label>
                      <input
                        value={selectedConversation.contact.phone}
                        disabled
                        className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-600"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</label>
                      <input
                        type="email"
                        value={contactForm.email}
                        onChange={(event) => setContactForm((prev) => ({ ...prev, email: event.target.value }))}
                        placeholder="Email address"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-300 focus:bg-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tags</label>
                      <input
                        value={contactForm.tags}
                        onChange={(event) => setContactForm((prev) => ({ ...prev, tags: event.target.value }))}
                        placeholder="vip, lead, support"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-300 focus:bg-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Address</label>
                      <div className="relative">
                        <MapPin className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                        <textarea
                          value={contactForm.address}
                          onChange={(event) => setContactForm((prev) => ({ ...prev, address: event.target.value }))}
                          rows={3}
                          placeholder="Address"
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-emerald-300 focus:bg-white"
                        />
                      </div>
                    </div>

                    <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={contactForm.optedIn}
                        onChange={(event) =>
                          setContactForm((prev) => ({
                            ...prev,
                            optedIn: event.target.checked,
                          }))
                        }
                        className="mt-1"
                      />
                      <span>
                        <span className="block font-medium text-slate-800">WhatsApp opt-in confirmed</span>
                        <span className="mt-1 block text-xs text-slate-500">
                          Turn this off if the contact should not receive proactive messages.
                        </span>
                      </span>
                    </label>

                    {(contactError || contactMessage) ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
                        {contactError ? <p className="text-rose-700">{contactError}</p> : null}
                        {contactMessage ? <p className="text-emerald-700">{contactMessage}</p> : null}
                      </div>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => void onSaveContact()}
                      disabled={savingContact}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingContact ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {savingContact ? "Saving..." : "Save contact details"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </aside>
      </section>

      <div className="lg:hidden">
        <div className="sticky bottom-3 z-20 mx-auto flex w-full max-w-sm items-center justify-between rounded-2xl border border-slate-200 bg-white/95 p-1.5 text-xs shadow-lg backdrop-blur">
          <button
            type="button"
            onClick={() => setMobileView("list")}
            className={`inline-flex flex-1 items-center justify-center gap-1 rounded-xl px-2 py-2 ${
              mobileView === "list" ? "bg-slate-900 text-white" : "text-slate-600"
            }`}
          >
            <Search className="h-3.5 w-3.5" />
            Chats
          </button>
          <button
            type="button"
            onClick={() => setMobileView("chat")}
            className={`inline-flex flex-1 items-center justify-center gap-1 rounded-xl px-2 py-2 ${
              mobileView === "chat" ? "bg-slate-900 text-white" : "text-slate-600"
            }`}
          >
            <SendHorizontal className="h-3.5 w-3.5" />
            Chat
          </button>
          <button
            type="button"
            onClick={() => setMobileView("profile")}
            className={`inline-flex flex-1 items-center justify-center gap-1 rounded-xl px-2 py-2 ${
              mobileView === "profile" ? "bg-slate-900 text-white" : "text-slate-600"
            }`}
          >
            <UserCircle2 className="h-3.5 w-3.5" />
            Profile
          </button>
        </div>
      </div>

      {previewImageUrl ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-5xl overflow-hidden rounded-[28px] border border-white/20 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImageUrl(null)}
              className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
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
