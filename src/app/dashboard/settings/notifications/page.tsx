"use client";

import { useEffect, useState } from "react";
import { BellRing, CheckCircle2, ShieldCheck } from "lucide-react";

const liveEvents = [
  "New signup in workspace",
  "Team invitation sent",
  "Invited member joined workspace",
  "Outgoing message sent from dashboard",
];

export default function NotificationsSettingsPage() {
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(window.Notification.permission);
    }
  }, []);

  const askPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const result = await window.Notification.requestPermission();
    setPermission(result);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
        <p className="mt-2 text-sm text-gray-600">
          Real-time dashboard alerts are live. Every tenant user can see activity in the
          top-right bell icon.
        </p>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
          <BellRing className="h-4 w-4 text-blue-600" />
          Live Events
        </h2>
        <ul className="mt-3 space-y-2">
          {liveEvents.map((event) => (
            <li
              key={event}
              className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              {event}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
          <ShieldCheck className="h-4 w-4 text-blue-600" />
          Browser Popup Permission
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Current status:{" "}
          <span className="font-semibold text-gray-900">{permission}</span>
        </p>
        <button
          onClick={askPermission}
          className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Enable Browser Notifications
        </button>
      </section>
    </div>
  );
}

