"use client";

import { useEffect, useState } from "react";

export default function MailAccountsPage() {
  const [accounts, setAccounts] = useState([]);

  const [form, setForm] = useState({
    name: "",
    email: "",
    smtpHost: "",
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: "",
    smtpPass: "",
    imapHost: "",
    imapPort: 993,
    imapSecure: true,
    imapUser: "",
    imapPass: "",
  });

  async function loadAccounts() {
    const res = await fetch("/api/mail/accounts");
    const json = await res.json();
    setAccounts(json);
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  async function submit(e) {
    e.preventDefault();
    const res = await fetch("/api/mail/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const json = await res.json();
    if (json.success) {
      alert("Account saved!");
      loadAccounts();
    } else {
      alert("Error saving account");
    }
  }

  return (
    <div className="p-10 flex gap-10">
      {/* LEFT SIDE FORM */}
      <div className="w-[400px] border p-6 rounded-xl shadow">
        <h1 className="text-xl font-bold mb-4">Add Mail Account</h1>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            placeholder="Account Name"
            className="border p-2 rounded"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <input
            placeholder="Email"
            className="border p-2 rounded"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />

          <h2 className="font-bold mt-4">SMTP Settings</h2>

          <input
            placeholder="SMTP Host"
            className="border p-2 rounded"
            value={form.smtpHost}
            onChange={(e) => setForm({ ...form, smtpHost: e.target.value })}
          />

          <input
            placeholder="SMTP Port"
            type="number"
            className="border p-2 rounded"
            value={form.smtpPort}
            onChange={(e) => setForm({ ...form, smtpPort: Number(e.target.value) })}
          />

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.smtpSecure}
              onChange={(e) => setForm({ ...form, smtpSecure: e.target.checked })}
            />
            Use SSL (secure)
          </label>

          <input
            placeholder="SMTP Username"
            className="border p-2 rounded"
            value={form.smtpUser}
            onChange={(e) => setForm({ ...form, smtpUser: e.target.value })}
          />

          <input
            placeholder="SMTP Password"
            type="password"
            className="border p-2 rounded"
            value={form.smtpPass}
            onChange={(e) => setForm({ ...form, smtpPass: e.target.value })}
          />

          <h2 className="font-bold mt-4">IMAP Settings</h2>

          <input
            placeholder="IMAP Host"
            className="border p-2 rounded"
            value={form.imapHost}
            onChange={(e) => setForm({ ...form, imapHost: e.target.value })}
          />

          <input
            placeholder="IMAP Port"
            type="number"
            className="border p-2 rounded"
            value={form.imapPort}
            onChange={(e) => setForm({ ...form, imapPort: Number(e.target.value) })}
          />

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.imapSecure}
              onChange={(e) => setForm({ ...form, imapSecure: e.target.checked })}
            />
            Use SSL (secure)
          </label>

          <input
            placeholder="IMAP Username"
            className="border p-2 rounded"
            value={form.imapUser}
            onChange={(e) => setForm({ ...form, imapUser: e.target.value })}
          />

          <input
            placeholder="IMAP Password"
            type="password"
            className="border p-2 rounded"
            value={form.imapPass}
            onChange={(e) => setForm({ ...form, imapPass: e.target.value })}
          />

          <button
            type="submit"
            className="bg-blue-600 text-white p-2 rounded mt-3"
          >
            Save Mail Account
          </button>
        </form>
      </div>

      {/* RIGHT SIDE LIST */}
      <div className="flex-1">
        <h1 className="text-xl font-bold mb-4">Saved Mail Accounts</h1>

        {accounts.length === 0 && (
          <div className="text-gray-500">No accounts added yet.</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="border p-5 rounded-xl shadow bg-white"
            >
              <h2 className="font-bold text-lg">{acc.name}</h2>
              <p className="text-sm text-gray-500">{acc.email}</p>

              <div className="mt-3 text-sm">
                <p><b>SMTP:</b> {acc.smtpHost}:{acc.smtpPort}</p>
                <p><b>IMAP:</b> {acc.imapHost || "—"}</p>
                <p><b>Status:</b> {acc.active ? "Active" : "Inactive"}</p>
              </div>

              <button
                className="mt-4 bg-green-600 text-white px-3 py-1 rounded"
                onClick={() => alert("Send test email feature coming next!")}
              >
                Send Test Email
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
