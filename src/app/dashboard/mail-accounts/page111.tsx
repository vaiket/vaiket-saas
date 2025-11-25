// src/app/dashboard/mail-accounts/page.tsx
"use client";

import { useState, useEffect } from "react";

export default function MailAccountsPage() {
  const [editingId, setEditingId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpSecure, setSmtpSecure] = useState("ssl");

  const [imapHost, setImapHost] = useState("");
  const [imapPort, setImapPort] = useState("");
  const [imapUser, setImapUser] = useState("");
  const [imapPass, setImapPass] = useState("");
  const [imapSecure, setImapSecure] = useState("ssl");

  const [accounts, setAccounts] = useState<any[]>([]);

  async function loadAccounts() {
    try {
      const res = await fetch("/api/mail-accounts/list");
      const data = await res.json();
      if (data.success) setAccounts(data.accounts || []);
      else setAccounts([]);
    } catch (err) {
      console.error("Load accounts error", err);
      setAccounts([]);
    }
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  async function saveAccount() {
    const body = {
      id: editingId,
      name,
      email,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      smtpSecure: smtpSecure === "ssl",
      imapHost,
      imapPort,
      imapUser,
      imapPass,
      imapSecure: imapSecure === "ssl",
    };

    const url = editingId ? "/api/mail-accounts/update" : "/api/mail-accounts/add";

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || "Failed");
        return;
      }
      alert(data.message || "Saved");
      loadAccounts();
      resetForm();
    } catch (err) {
      console.error("Save error", err);
      alert("Server error");
    }
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setEmail("");
    setSmtpHost("");
    setSmtpPort("");
    setSmtpUser("");
    setSmtpPass("");
    setSmtpSecure("ssl");
    setImapHost("");
    setImapPort("");
    setImapUser("");
    setImapPass("");
    setImapSecure("ssl");
  }

  function editAccount(acc: any) {
    setEditingId(acc.id);
    setName(acc.name || "");
    setEmail(acc.email || "");
    setSmtpHost(acc.smtpHost || "");
    setSmtpPort(acc.smtpPort ? String(acc.smtpPort) : "");
    setSmtpUser(acc.smtpUser || "");
    setSmtpPass(acc.smtpPass || "");
    setSmtpSecure(acc.smtpSecure ? "ssl" : "none");
    setImapHost(acc.imapHost || "");
    setImapPort(acc.imapPort ? String(acc.imapPort) : "");
    setImapUser(acc.imapUser || "");
    setImapPass(acc.imapPass || "");
    setImapSecure(acc.imapSecure ? "ssl" : "none");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteAccount(id: number) {
    if (!confirm("Are you sure you want to delete this mail account?")) return;
    try {
      const res = await fetch("/api/mail-accounts/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || "Failed");
        return;
      }
      alert(data.message || "Deleted");
      loadAccounts();
    } catch (err) {
      console.error("Delete error", err);
      alert("Server error");
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">{editingId ? "Edit Mail Account" : "Mail Accounts"}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input placeholder="Account Name" value={name} onChange={(e) => setName(e.target.value)} className="border p-3 rounded" />
        <input placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} className="border p-3 rounded" />

        <div className="md:col-span-2 font-semibold text-lg mt-4">SMTP Settings</div>
        <input placeholder="SMTP Host" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} className="border p-3 rounded" />
        <input placeholder="SMTP Port" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} className="border p-3 rounded" />
        <input placeholder="SMTP User" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} className="border p-3 rounded" />
        <input placeholder="SMTP Password" type="password" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} className="border p-3 rounded" />
        <select value={smtpSecure} onChange={(e) => setSmtpSecure(e.target.value)} className="border p-3 rounded">
          <option value="ssl">Secure (SSL/TLS)</option>
          <option value="none">Non-Secure</option>
        </select>

        <div className="md:col-span-2 font-semibold text-lg mt-4">IMAP Settings</div>
        <input placeholder="IMAP Host" value={imapHost} onChange={(e) => setImapHost(e.target.value)} className="border p-3 rounded" />
        <input placeholder="IMAP Port" value={imapPort} onChange={(e) => setImapPort(e.target.value)} className="border p-3 rounded" />
        <input placeholder="IMAP User" value={imapUser} onChange={(e) => setImapUser(e.target.value)} className="border p-3 rounded" />
        <input placeholder="IMAP Password" type="password" value={imapPass} onChange={(e) => setImapPass(e.target.value)} className="border p-3 rounded" />
        <select value={imapSecure} onChange={(e) => setImapSecure(e.target.value)} className="border p-3 rounded">
          <option value="ssl">Secure (SSL/TLS)</option>
          <option value="none">Non-Secure</option>
        </select>
      </div>

      <div className="flex gap-4 mt-6">
        <button onClick={saveAccount} className="bg-blue-600 text-white px-4 py-2 rounded shadow">
          {editingId ? "Update Account" : "Save Mail Account"}
        </button>

        <button onClick={resetForm} className="bg-gray-300 px-4 py-2 rounded shadow">
          Reset
        </button>
      </div>

      <h2 className="text-2xl font-semibold mt-12 mb-4">Connected Accounts</h2>

      <div className="space-y-4">
        {accounts.map((acc) => (
          <div key={acc.id} className="border p-4 rounded flex justify-between items-center">
            <div>
              <div className="font-semibold">{acc.name}</div>
              <div className="text-gray-600">{acc.email}</div>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => editAccount(acc)} className="text-blue-600 font-semibold">Edit</button>
              <button onClick={() => deleteAccount(acc.id)} className="text-red-600 font-semibold">Delete</button>
              <span className="text-green-600 font-semibold">{acc.active ? "Active" : "Inactive"}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
