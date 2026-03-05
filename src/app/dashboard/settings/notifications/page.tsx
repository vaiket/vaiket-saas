"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BellRing,
  CheckCircle2,
  MailCheck,
  RefreshCcw,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserPlus,
  Volume2,
} from "lucide-react";

type TenantNotification = {
  id: string;
  action: string;
  title: string;
  body: string;
  actorName: string;
  createdAt: string;
};

const POPUP_ENABLED_KEY = "vaiket.notifications.popupEnabled";
const SOUND_ENABLED_KEY = "vaiket.notifications.soundEnabled";
const POLL_INTERVAL_MS = 30000;

const liveEvents = [
  "New signup in workspace",
  "Team invitation sent",
  "Invited member joined workspace",
  "Outgoing message sent from dashboard",
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
    return { icon: UserPlus, iconClass: "text-violet-600", wrapClass: "bg-violet-100" };
  }
  if (action.includes("invite.accept")) {
    return { icon: UserCheck, iconClass: "text-emerald-600", wrapClass: "bg-emerald-100" };
  }
  if (action.includes("invite")) {
    return { icon: UserPlus, iconClass: "text-indigo-600", wrapClass: "bg-indigo-100" };
  }
  if (action.includes("mail")) {
    return { icon: MailCheck, iconClass: "text-sky-600", wrapClass: "bg-sky-100" };
  }
  return { icon: Sparkles, iconClass: "text-slate-600", wrapClass: "bg-slate-100" };
}

export default function NotificationsSettingsPage() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [popupEnabled, setPopupEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [items, setItems] = useState<TenantNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [lastReadAt, setLastReadAt] = useState<number>(0);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(window.Notification.permission);
    }
    if (typeof window === "undefined") return;
    const popupPref = window.localStorage.getItem(POPUP_ENABLED_KEY);
    const soundPref = window.localStorage.getItem(SOUND_ENABLED_KEY);
    if (popupPref === "0") setPopupEnabled(false);
    if (soundPref === "0") setSoundEnabled(false);
    const savedRead = Number(window.localStorage.getItem("vaiket.notifications.lastReadAt") || "0");
    if (Number.isFinite(savedRead) && savedRead > 0) setLastReadAt(savedRead);
  }, []);

  const askPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const result = await window.Notification.requestPermission();
    setPermission(result);
  };

  const fetchNotifications = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/tenant/notifications?take=60", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await readJsonSafe(res);
      if (!res.ok || !data.success) throw new Error("Failed to load notifications");
      setItems((data.notifications || []) as TenantNotification[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchNotifications();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetchNotifications();
      }
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [fetchNotifications]);

  const unreadCount = useMemo(
    () => items.filter((item) => new Date(item.createdAt).getTime() > lastReadAt).length,
    [items, lastReadAt]
  );

  const filteredItems = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((item) => new Date(item.createdAt).getTime() > lastReadAt);
  }, [filter, items, lastReadAt]);

  const markAllRead = () => {
    const latest = items.reduce((max, item) => {
      const ts = new Date(item.createdAt).getTime();
      return ts > max ? ts : max;
    }, Date.now());
    setLastReadAt(latest);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("vaiket.notifications.lastReadAt", String(latest));
    }
  };

  const togglePopup = () => {
    setPopupEnabled((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") window.localStorage.setItem(POPUP_ENABLED_KEY, next ? "1" : "0");
      return next;
    });
  };

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") window.localStorage.setItem(SOUND_ENABLED_KEY, next ? "1" : "0");
      return next;
    });
  };

  const sendTestNotification = () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (window.Notification.permission !== "granted") return;
    if (!popupEnabled) return;
    const notice = new window.Notification("Vaiket Notification Test", {
      body: "Your browser notifications are working correctly.",
    });
    if (soundEnabled) {
      try {
        const ctx = new window.AudioContext();
        const oscillator = ctx.createOscillator();
        oscillator.type = "sine";
        oscillator.frequency.value = 880;
        oscillator.connect(ctx.destination);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.08);
      } catch {
        // ignore audio API issues
      }
    }
    setTimeout(() => notice.close(), 3500);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-blue-100/70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-64 w-64 rounded-full bg-violet-100/60 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              <BellRing className="h-3.5 w-3.5" />
              Notification Center
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-slate-900 md:text-3xl">Notifications</h1>
            <p className="mt-2 text-sm text-slate-600">
              Manage popup alerts, tune notification behavior, and monitor live workspace activity.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Unread</p>
              <p className="text-lg font-semibold text-slate-900">{unreadCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Total</p>
              <p className="text-lg font-semibold text-slate-900">{items.length}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              Browser Popup Permission
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  permission === "granted"
                    ? "bg-emerald-100 text-emerald-700"
                    : permission === "denied"
                      ? "bg-rose-100 text-rose-700"
                      : "bg-amber-100 text-amber-700"
                }`}
              >
                {permission}
              </span>
              {permission !== "granted" ? (
                <button
                  onClick={askPermission}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Enable Browser Notifications
                </button>
              ) : (
                <button
                  onClick={sendTestNotification}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Send Test Notification
                </button>
              )}
            </div>
            {permission === "denied" ? (
              <p className="mt-2 text-xs text-rose-700">
                Browser blocked notifications. Allow it from browser site settings.
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Settings2 className="h-4 w-4 text-blue-600" />
              Notification Preferences
            </h2>
            <div className="mt-3 space-y-2">
              <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                Desktop popup alerts
                <button
                  type="button"
                  onClick={togglePopup}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    popupEnabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {popupEnabled ? "On" : "Off"}
                </button>
              </label>
              <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                Notification sound
                <button
                  type="button"
                  onClick={toggleSound}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    soundEnabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {soundEnabled ? "On" : "Off"}
                </button>
              </label>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              These preferences sync with the top-right notification bell menu.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Volume2 className="h-4 w-4 text-blue-600" />
              Live Events
            </h2>
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {liveEvents.map((event) => (
                <li
                  key={event}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  {event}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Recent Activity</h2>
            <button
              onClick={() => void fetchNotifications()}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>

          <div className="mb-3 flex items-center gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                filter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                filter === "unread" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              Unread
            </button>
            <button
              onClick={markAllRead}
              className="ml-auto rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Mark all read
            </button>
          </div>

          {error ? (
            <p className="mb-2 flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              <AlertCircle className="h-3.5 w-3.5" />
              {error}
            </p>
          ) : null}

          <div className="max-h-[620px] space-y-2 overflow-y-auto pr-1">
            {loading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <div key={`loading_notification_${idx}`} className="animate-pulse rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="h-3 w-24 rounded bg-slate-200" />
                  <div className="mt-2 h-2.5 w-44 rounded bg-slate-200" />
                </div>
              ))
            ) : filteredItems.length === 0 ? (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                {filter === "unread" ? "No unread notifications." : "No notifications yet."}
              </p>
            ) : (
              filteredItems.map((item) => {
                const unread = new Date(item.createdAt).getTime() > lastReadAt;
                const meta = actionMeta(item.action);
                const Icon = meta.icon;
                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border px-3 py-2 ${
                      unread ? "border-blue-200 bg-blue-50/60" : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-lg ${meta.wrapClass}`}>
                        <Icon className={`h-3.5 w-3.5 ${meta.iconClass}`} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-xs font-semibold text-slate-900">{item.title}</p>
                          <p className="shrink-0 text-[10px] text-slate-500">{formatRelativeTime(item.createdAt)}</p>
                        </div>
                        <p className="mt-1 text-xs text-slate-600">{item.body}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}
