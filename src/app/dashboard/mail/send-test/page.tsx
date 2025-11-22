"use client";

import { useEffect, useState } from "react";

export default function SendTestEmailPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    accountId: "",
    to: "",
    subject: "Test Email from Vaiket Automation",
    text: "This is a test email to verify SMTP connectivity.",
  });

  // Load all mail accounts
  async function loadAccounts() {
    const res = await fetch("/api/mail/accounts");
    const json = await res.json();
    setAccounts(json);
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  // Send test email
  async function sendTest(e) {
    e.preventDefault();
    if (!form.accountId) return alert("Select a mail account!");

    setLoading(true);

    const res = await fetch("/api/mail/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const json = await res.json();
    setLoading(false);

    if (json.success) {
      alert("Test email sent successfully! 🎉");
    } else {
      alert("Failed: " + json.error);
    }
  }

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-4">Send Test Email</h1>

      <div className="max-w-xl border p-6 rounded-xl shadow bg-white">
        <form onSubmit={sendTest} className="flex flex-col gap-4">

          {/* ACCOUNT SELECT */}
          <div>
            <label className="font-semibold">Select Mail Account</label>
            <select
              className="border p-2 rounded w-full mt-1"
              value={form.accountId}
              onChange={(e) => setForm({ ...form, accountId: e.target.value })}
            >
              <option value="">Select Account</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.email})
                </option>
              ))}
            </select>
          </div>

          {/* TO */}
          <div>
            <label className="font-semibold">To Email</label>
            <input
              type="email"
              placeholder="recipient@example.com"
              className="border p-2 rounded w-full mt-1"
              value={form.to}
              onChange={(e) => setForm({ ...form, to: e.target.value })}
            />
          </div>

          {/* SUBJECT */}
          <div>
            <label className="font-semibold">Subject</label>
            <input
              type="text"
              className="border p-2 rounded w-full mt-1"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
          </div>

          {/* BODY */}
          <div>
            <label className="font-semibold">Message</label>
            <textarea
              rows={5}
              className="border p-2 rounded w-full mt-1"
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
            ></textarea>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white p-2 rounded mt-2"
          >
            {loading ? "Sending..." : "Send Test Email"}
          </button>
        </form>
      </div>
    </div>
  );
}
