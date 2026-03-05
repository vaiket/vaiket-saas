"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Bell,
  BellRing,
  CheckCheck,
  MailCheck,
  RefreshCcw,
  Settings2,
  Sparkles,
  UserCheck,
  UserPlus,
} from "lucide-react";

type TenantNotification = {
  id: string;
  action: string;
  title: string;
  body: string;
  actorName: string;
  createdAt: string;
};

const LAST_READ_KEY = "vaiket.notifications.lastReadAt";
const POPUP_ENABLED_KEY = "vaiket.notifications.popupEnabled";
const POLL_INTERVAL_MS = 30000;

async function readJsonSafe(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function formatRelativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const diff = Date.now() - date.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return "Just now";
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return date.toLocaleDateString();
}

function actionMeta(action: string) {
  if (action.includes("signup")) {
    return {
      icon: UserPlus,
      iconClass: "text-violet-600",
      wrapClass: "bg-violet-100",
    };
  }
  if (action.includes("invite.accept")) {
    return {
      icon: UserCheck,
      iconClass: "text-emerald-600",
      wrapClass: "bg-emerald-100",
    };
  }
  if (action.includes("invite")) {
    return {
      icon: UserPlus,
      iconClass: "text-indigo-600",
      wrapClass: "bg-indigo-100",
    };
  }
  if (action.includes("mail")) {
    return {
      icon: MailCheck,
      iconClass: "text-sky-600",
      wrapClass: "bg-sky-100",
    };
  }
  return {
    icon: Sparkles,
    iconClass: "text-slate-600",
    wrapClass: "bg-slate-100",
  };
}

function notificationsDigest(items: TenantNotification[]) {
  if (items.length === 0) return "0";
  return items.map((item) => `${item.id}|${item.createdAt}|${item.action}`).join("~");
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<TenantNotification[]>([]);
  const [lastReadAt, setLastReadAt] = useState(0);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [popupEnabled, setPopupEnabled] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [fetchError, setFetchError] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const latestPopupTimeRef = useRef<number>(0);
  const firstFetchRef = useRef(true);
  const inFlightRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const digestRef = useRef("0");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const saved = Number(window.localStorage.getItem(LAST_READ_KEY) || "0");
    if (Number.isFinite(saved) && saved > 0) {
      setLastReadAt(saved);
    }

    const popupPref = window.localStorage.getItem(POPUP_ENABLED_KEY);
    if (popupPref === "0") setPopupEnabled(false);

    if ("Notification" in window) {
      setPermission(window.Notification.permission);
    }
  }, []);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("touchstart", closeOnOutsideClick, { passive: true });
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("touchstart", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const unreadCount = useMemo(() => {
    return items.filter((item) => new Date(item.createdAt).getTime() > lastReadAt).length;
  }, [items, lastReadAt]);

  const markAllRead = useCallback(() => {
    const latest = items.reduce((max, item) => {
      const ts = new Date(item.createdAt).getTime();
      return ts > max ? ts : max;
    }, Date.now());
    setLastReadAt(latest);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LAST_READ_KEY, String(latest));
    }
  }, [items]);

  const fetchNotifications = useCallback(async (opts?: { silent?: boolean; force?: boolean }) => {
    const silent = Boolean(opts?.silent);
    const force = Boolean(opts?.force);

    if (inFlightRef.current && !force) return;
    if (force) {
      abortRef.current?.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;
    inFlightRef.current = true;

    try {
      if (!silent) {
        setFetchError(null);
      }
      const res = await fetch("/api/tenant/notifications?take=30", {
        credentials: "include",
        cache: "no-store",
        signal: controller.signal,
      });
      const data = await readJsonSafe(res);

      if (!res.ok || !data.success) {
        throw new Error("Unable to load notifications");
      }

      const nextItems = (data.notifications || []) as TenantNotification[];
      const nextDigest = notificationsDigest(nextItems);
      if (nextDigest !== digestRef.current) {
        digestRef.current = nextDigest;
        setItems(nextItems);
      }

      const latestCreatedAt = nextItems.reduce((max, item) => {
        const ts = new Date(item.createdAt).getTime();
        return ts > max ? ts : max;
      }, 0);

      if (firstFetchRef.current) {
        firstFetchRef.current = false;
        latestPopupTimeRef.current = latestCreatedAt;
        return;
      }

      const newItems = nextItems
        .filter((item) => new Date(item.createdAt).getTime() > latestPopupTimeRef.current)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      if (newItems.length > 0) {
        latestPopupTimeRef.current = Math.max(
          latestPopupTimeRef.current,
          ...newItems.map((item) => new Date(item.createdAt).getTime())
        );
      }

      if (
        newItems.length > 0 &&
        typeof window !== "undefined" &&
        "Notification" in window &&
        window.Notification.permission === "granted" &&
        popupEnabled
      ) {
        for (const item of newItems.slice(0, 3)) {
          new window.Notification(item.title, {
            body: item.body,
          });
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (!silent) {
        setFetchError(error instanceof Error ? error.message : "Failed to load notifications");
      }
    } finally {
      if (abortRef.current === controller) {
        inFlightRef.current = false;
        setLoading(false);
      }
    }
  }, [popupEnabled]);

  useEffect(() => {
    void fetchNotifications({ force: true });

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetchNotifications({ silent: true });
      }
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [fetchNotifications]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (open) markAllRead();
  }, [open, markAllRead]);

  const filteredItems = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((item) => new Date(item.createdAt).getTime() > lastReadAt);
  }, [filter, items, lastReadAt]);

  const requestPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const result = await window.Notification.requestPermission();
    setPermission(result);
  };

  const togglePopupEnabled = () => {
    setPopupEnabled((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(POPUP_ENABLED_KEY, next ? "1" : "0");
      }
      return next;
    });
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={`group relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-[radial-gradient(circle_at_20%_20%,#f8fafc_0%,#ffffff_45%,#eef2ff_100%)] text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/50 hover:text-blue-700 ${
          open ? "border-blue-200 bg-blue-50/70 text-blue-700" : ""
        }`}
        aria-label="Open notifications"
      >
        {unreadCount > 0 ? (
          <BellRing className="h-4 w-4 transition group-hover:scale-105" />
        ) : (
          <Bell className="h-4 w-4 transition group-hover:scale-105" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
        {unreadCount > 0 ? (
          <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 animate-pulse rounded-full bg-emerald-500 ring-2 ring-white" />
        ) : null}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[360px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-violet-50 px-3 py-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Notifications</p>
              <span className="rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                {unreadCount} unread
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilter("all")}
                className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                  filter === "all" ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter("unread")}
                className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                  filter === "unread"
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                Unread
              </button>
              <button
                onClick={markAllRead}
                className="ml-auto inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all
              </button>
              <button
                onClick={() => void fetchNotifications({ force: true })}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
                title="Refresh"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-2 p-3">
            {permission !== "granted" ? (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-2.5">
                <p className="text-xs text-blue-800">
                  Enable browser popup notifications for instant dashboard alerts.
                </p>
                <button
                  onClick={requestPermission}
                  className="mt-2 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Enable Browser Popup
                </button>
              </div>
            ) : null}

            <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-700">
              <span>Desktop popup alerts</span>
              <button
                type="button"
                onClick={togglePopupEnabled}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  popupEnabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"
                }`}
              >
                {popupEnabled ? "On" : "Off"}
              </button>
            </label>

            {fetchError ? (
              <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-2 text-xs text-rose-700">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5" />
                <span>{fetchError}</span>
              </div>
            ) : null}

            <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
              {loading && (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={`loading_notice_${idx}`} className="animate-pulse rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="h-3 w-32 rounded bg-slate-200" />
                      <div className="mt-2 h-2.5 w-48 rounded bg-slate-200" />
                    </div>
                  ))}
                </div>
              )}

              {!loading && filteredItems.length === 0 ? (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  {filter === "unread" ? "No unread notifications." : "No notifications yet."}
                </p>
              ) : null}

              {!loading &&
                filteredItems.map((item) => {
                  const unread = new Date(item.createdAt).getTime() > lastReadAt;
                  const meta = actionMeta(item.action);
                  const Icon = meta.icon;
                  return (
                    <div
                      key={item.id}
                      className={`rounded-xl border px-2.5 py-2 ${
                        unread ? "border-blue-200 bg-blue-50/60" : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-lg ${meta.wrapClass}`}>
                          <Icon className={`h-3.5 w-3.5 ${meta.iconClass}`} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate text-xs font-semibold text-slate-900">{item.title}</p>
                            <p className="shrink-0 text-[10px] text-slate-500">{formatRelativeTime(item.createdAt)}</p>
                          </div>
                          <p className="mt-1 text-xs text-slate-600">{item.body}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-2">
              <Link
                href="/dashboard/settings/notifications"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:underline"
                onClick={() => setOpen(false)}
              >
                <Settings2 className="h-3.5 w-3.5" />
                Notification Settings
              </Link>
              <span className="text-[10px] text-slate-500">
                {permission === "granted" ? "Browser alerts ready" : "Browser alerts disabled"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
