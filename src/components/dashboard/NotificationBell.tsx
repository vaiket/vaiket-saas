"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, BellRing, CheckCheck } from "lucide-react";

type TenantNotification = {
  id: string;
  action: string;
  title: string;
  body: string;
  actorName: string;
  createdAt: string;
};

const LAST_READ_KEY = "vaiket.notifications.lastReadAt";

async function readJsonSafe(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<TenantNotification[]>([]);
  const [lastReadAt, setLastReadAt] = useState(0);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  const rootRef = useRef<HTMLDivElement>(null);
  const latestPopupTimeRef = useRef<number>(0);
  const firstFetchRef = useRef(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const saved = Number(window.localStorage.getItem(LAST_READ_KEY) || "0");
    if (Number.isFinite(saved) && saved > 0) {
      setLastReadAt(saved);
    }

    if ("Notification" in window) {
      setPermission(window.Notification.permission);
    }
  }, []);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  const unreadCount = useMemo(() => {
    return items.filter((item) => new Date(item.createdAt).getTime() > lastReadAt).length;
  }, [items, lastReadAt]);

  const markAllRead = () => {
    const now = Date.now();
    setLastReadAt(now);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LAST_READ_KEY, String(now));
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/tenant/notifications?take=30", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await readJsonSafe(res);

      if (!res.ok || !data.success) return;

      const nextItems = (data.notifications || []) as TenantNotification[];
      setItems(nextItems);

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
        window.Notification.permission === "granted"
      ) {
        for (const item of newItems.slice(0, 3)) {
          new window.Notification(item.title, {
            body: item.body,
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const timer = window.setInterval(() => {
      fetchNotifications();
    }, 15000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (open) markAllRead();
  }, [open]);

  const requestPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const result = await window.Notification.requestPermission();
    setPermission(result);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
        aria-label="Open notifications"
      >
        {unreadCount > 0 ? <BellRing className="h-4.5 w-4.5" /> : <Bell className="h-4.5 w-4.5" />}
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[340px] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            <button
              onClick={markAllRead}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark read
            </button>
          </div>

          {permission !== "granted" && (
            <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50 p-2.5">
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
          )}

          <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
            {loading && (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                Loading notifications...
              </p>
            )}

            {!loading && items.length === 0 && (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                No notifications yet.
              </p>
            )}

            {!loading &&
              items.map((item) => {
                const unread = new Date(item.createdAt).getTime() > lastReadAt;
                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border p-2.5 ${
                      unread ? "border-blue-200 bg-blue-50/60" : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <p className="text-xs font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-1 text-xs text-slate-600">{item.body}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

