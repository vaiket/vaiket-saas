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

  const [accounts, setAccounts] = useState([]);

  // LOAD ACCOUNTS
  async function loadAccounts() {
    const res = await fetch("/api/mail-accounts/list", {
      method: "GET",
      credentials: "include",
    });
    const data = await res.json();
    if (data.success) setAccounts(data.accounts);
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  // SAVE or UPDATE ACCOUNT
  async function saveAccount() {
    try {
      const body = {
        id: editingId,
        name,
        email,

        smtpHost,
        smtpPort: Number(smtpPort),
        smtpUser,
        smtpPass,
        smtpSecure: smtpSecure === "ssl",

        imapHost,
        imapPort: Number(imapPort),
        imapUser,
        imapPass,
        imapSecure: imapSecure === "ssl",
      };

      const url = editingId
        ? "/api/mail-accounts/update"
        : "/api/mail-accounts/add";

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },

        // CRITICAL: MUST send login cookie
        credentials: "include",

        body: JSON.stringify(body),
      });

      const data = await res.json();
      console.log("SAVE RESPONSE:", data);

      if (!data.success) {
        alert(data.error || "Something went wrong");
        return;
      }

      alert("Mail account saved!");
      loadAccounts();
      resetForm();
    } catch (err) {
      console.error("Save Error:", err);
      alert("Error saving account");
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

  // EDIT ACCOUNT
  function editAccount(acc: any) {
    setEditingId(acc.id);
    setName(acc.name);
    setEmail(acc.email);

    setSmtpHost(acc.smtpHost);
    setSmtpPort(acc.smtpPort);
    setSmtpUser(acc.smtpUser);
    setSmtpPass(acc.smtpPass);
    setSmtpSecure(acc.smtpSecure ? "ssl" : "none");

    setImapHost(acc.imapHost);
    setImapPort(acc.imapPort);
    setImapUser(acc.imapUser);
    setImapPass(acc.imapPass);
    setImapSecure(acc.imapSecure ? "ssl" : "none");

    window.scrollTo(0, 0);
  }

  // DELETE ACCOUNT
  async function deleteAccount(id: number) {
    if (!confirm("Are you sure?")) return;

    const res = await fetch("/api/mail-accounts/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },

      credentials: "include",

      body: JSON.stringify({ id }),
    });

    const data = await res.json();
    alert(data.message);

    if (data.success) loadAccounts();
  }

  // TEST SMTP
  async function testSMTP() {
    const res = await fetch("/api/mail-accounts/test-smtp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },

      credentials: "include",

      body: JSON.stringify({
        smtpHost,
        smtpPort: Number(smtpPort),
        smtpUser,
        smtpPass,
        smtpSecure: smtpSecure === "ssl",
      }),
    });

    alert((await res.json()).message);
  }

  // TEST IMAP
  async function testIMAP() {
    const res = await fetch("/api/mail-accounts/test-imap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },

      credentials: "include",

      body: JSON.stringify({
        imapHost,
        imapPort: Number(imapPort),
        imapUser,
        imapPass,
        imapSecure: imapSecure === "ssl",
      }),
    });

    alert((await res.json()).message);
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">
        {editingId ? "Edit Mail Account" : "Mail Accounts"}
      </h1>

      {/* FORM */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          placeholder="Account Name (ex: Support Email)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border p-3 rounded"
        />

        <input
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-3 rounded"
        />

        {/* SMTP SETTINGS */}
        <div className="md:col-span-2 font-semibold text-lg mt-4">
          SMTP Settings
        </div>

        <input
          placeholder="SMTP Host"
          value={smtpHost}
          onChange={(e) => setSmtpHost(e.target.value)}
          className="border p-3 rounded"
        />

        <input
          placeholder="SMTP Port"
          value={smtpPort}
          onChange={(e) => setSmtpPort(e.target.value)}
          className="border p-3 rounded"
        />

        <input
          placeholder="SMTP User"
          value={smtpUser}
          onChange={(e) => setSmtpUser(e.target.value)}
          className="border p-3 rounded"
        />

        <input
          placeholder="SMTP Password"
          type="password"
          value={smtpPass}
          onChange={(e) => setSmtpPass(e.target.value)}
          className="border p-3 rounded"
        />

        <select
          value={smtpSecure}
          onChange={(e) => setSmtpSecure(e.target.value)}
          className="border p-3 rounded"
        >
          <option value="ssl">Secure (SSL/TLS)</option>
          <option value="none">Non-Secure</option>
        </select>

        {/* IMAP SETTINGS */}
        <div className="md:col-span-2 font-semibold text-lg mt-4">
          IMAP Settings
        </div>

        <input
          placeholder="IMAP Host"
          value={imapHost}
          onChange={(e) => setImapHost(e.target.value)}
          className="border p-3 rounded"
        />

        <input
          placeholder="IMAP Port"
          value={imapPort}
          onChange={(e) => setImapPort(e.target.value)}
          className="border p-3 rounded"
        />

        <input
          placeholder="IMAP User"
          value={imapUser}
          onChange={(e) => setImapUser(e.target.value)}
          className="border p-3 rounded"
        />

        <input
          placeholder="IMAP Password"
          type="password"
          value={imapPass}
          onChange={(e) => setImapPass(e.target.value)}
          className="border p-3 rounded"
        />

        <select
          value={imapSecure}
          onChange={(e) => setImapSecure(e.target.value)}
          className="border p-3 rounded"
        >
          <option value="ssl">Secure (SSL/TLS)</option>
          <option value="none">Non-Secure</option>
        </select>
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex gap-4 mt-6">
        <button
          onClick={saveAccount}
          className="bg-blue-600 text-white px-4 py-2 rounded shadow"
        >
          {editingId ? "Update Account" : "Save Mail Account"}
        </button>

        <button
          onClick={testSMTP}
          className="bg-purple-600 text-white px-4 py-2 rounded shadow"
        >
          Test SMTP
        </button>

        <button
          onClick={testIMAP}
          className="bg-green-600 text-white px-4 py-2 rounded shadow"
        >
          Test IMAP
        </button>

        {editingId && (
          <button
            onClick={resetForm}
            className="bg-gray-300 px-4 py-2 rounded shadow"
          >
            Cancel Edit
          </button>
        )}
      </div>

      {/* SAVED ACCOUNTS */}
      <h2 className="text-2xl font-semibold mt-12 mb-4">
        Connected Accounts
      </h2>

      <div className="space-y-4">
        {accounts.map((acc: any) => (
          <div
            key={acc.id}
            className="border p-4 rounded flex justify-between items-center"
          >
            <div>
              <div className="font-semibold">{acc.name}</div>
              <div className="text-gray-600">{acc.email}</div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => editAccount(acc)}
                className="text-blue-600 font-semibold"
              >
                Edit
              </button>

              <button
                onClick={() => deleteAccount(acc.id)}
                className="text-red-600 font-semibold"
              >
                Delete
              </button>

              <span className="text-green-600 font-semibold">
                Active
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
