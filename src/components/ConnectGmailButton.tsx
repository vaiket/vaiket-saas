// src/components/ConnectGmailButton.tsx
"use client";

import { useEffect, useState } from "react";

type MailAccountLite = {
  provider?: string;
  oauthProvider?: string;
  email?: string;
};

export default function ConnectGmailButton() {
  const [connected, setConnected] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/mail-accounts/list")
      .then((r) => r.json())
      .then((data) => {
        if (data?.success) {
          const gmail = (data.data as MailAccountLite[] | undefined)?.find(
            (a) => a.provider === "gmail" || a.oauthProvider === "google"
          );
          if (gmail) {
            setConnected(true);
            setEmail(gmail.email ?? null);
          }
        }
      })
      .catch(() => {});
  }, []);

  function connect() {
    // open Google login (server route will redirect to Google)
    window.location.href = "/api/auth/google/login?mode=gmail";
  }

  async function disconnect() {
    setLoading(true);
    await fetch("/api/auth/google/disconnect", { method: "POST", credentials: "include" });
    setConnected(false);
    setEmail(null);
    setLoading(false);
  }

  return (
    <div>
      {connected ? (
        <div className="flex items-center gap-3">
          <div className="text-sm">Connected: <strong>{email}</strong></div>
          <button onClick={disconnect} disabled={loading} className="bg-red-600 text-white px-3 py-1 rounded">Disconnect</button>
        </div>
      ) : (
        <button onClick={connect} className="bg-blue-600 text-white px-3 py-2 rounded">Connect Gmail</button>
      )}
    </div>
  );
}
