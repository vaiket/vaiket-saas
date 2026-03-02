"use client";

import { useEffect, useState } from "react";

type Mailbox = {
  id: number;
  email: string;
};

export default function MailboxVerificationCard() {
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [mailboxId, setMailboxId] = useState<number | "">("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [imapOk, setImapOk] = useState<boolean | null>(null);
  const [smtpOk, setSmtpOk] = useState<boolean | null>(null);
  const [error, setError] = useState("");

  // 🔥 FETCH MAILBOXES (CORRECT API)
  useEffect(() => {
    fetch("/api/mail/mailboxes")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && Array.isArray(res.mailboxes)) {
          setMailboxes(res.mailboxes);

          // ✅ auto-select first mailbox
          if (res.mailboxes.length > 0) {
            setMailboxId(res.mailboxes[0].id);
          }
        }
      })
      .catch((err) => {
        console.error("Mailbox fetch failed:", err);
      });
  }, []);

  const verifyMailbox = async () => {
    if (!mailboxId || !password.trim()) {
      setError("Please enter mailbox password");
      return;
    }

    setLoading(true);
    setError("");
    setImapOk(null);
    setSmtpOk(null);

    try {
      const res = await fetch("/api/mail-automation/verify-mailbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantMailboxId: mailboxId,
          password,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.message || "Verification failed");
        setImapOk(false);
        setSmtpOk(false);
        return;
      }

      setImapOk(true);
      setSmtpOk(true);
    } catch (err) {
      console.error(err);
      setError("Server error during verification");
      setImapOk(false);
      setSmtpOk(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border p-6 bg-white">
      <h2 className="text-lg font-semibold mb-4">
        Step 1: Mailbox Verification
      </h2>

      <label className="block text-sm mb-1">Mailbox</label>
      <select
        className="w-full border rounded px-3 py-2 mb-4"
        value={mailboxId}
        onChange={(e) => setMailboxId(Number(e.target.value))}
      >
        {mailboxes.length === 0 && (
          <option value="">No mailbox found</option>
        )}

        {mailboxes.map((m) => (
          <option key={m.id} value={m.id}>
            {m.email}
          </option>
        ))}
      </select>

      <div className="space-y-1 mb-4">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              imapOk === true
                ? "bg-green-500"
                : imapOk === false
                ? "bg-red-500"
                : "bg-gray-400"
            }`}
          />
          IMAP Connection
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              smtpOk === true
                ? "bg-green-500"
                : smtpOk === false
                ? "bg-red-500"
                : "bg-gray-400"
            }`}
          />
          SMTP Authentication
        </div>
      </div>

      <input
        type="password"
        placeholder="Enter mailbox password"
        className="w-full border rounded px-3 py-2 mb-2"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          setImapOk(null);
          setSmtpOk(null);
        }}
      />

      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}

      <button
        onClick={verifyMailbox}
        disabled={loading}
        className="bg-black text-white px-4 py-2 rounded disabled:opacity-60"
      >
        {loading ? "Verifying..." : "Verify"}
      </button>

      <p className="text-xs text-gray-500 mt-2">
        Your password is used only for verification and stored securely in
        encrypted form.
      </p>
    </div>
  );
}
