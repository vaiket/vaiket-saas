"use client";

import { useEffect, useState } from "react";

type MailAccount = {
  id: number;
  name: string;
  email: string;
  imapHost?: string;
  imapPort?: number;
  imapUser?: string;
  provider?: string;
  active?: boolean;
  createdAt?: string;
};

type IncomingEmail = {
  id: number;
  mailAccountId: number;
  from?: string;
  to?: string;
  subject?: string;
  body?: string;
  html?: string;
  messageId?: string;
  processed?: boolean;
  status?: string;
  createdAt?: string;
};

export default function ImapManagementPage() {
  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
  const [emails, setEmails] = useState<IncomingEmail[]>([]);
  const [viewingEmail, setViewingEmail] = useState<IncomingEmail | null>(null);

  async function loadAccounts() {
    setLoading(true);
    const res = await fetch("/api/mail-accounts/list");
    const j = await res.json();
    if (j.success) setAccounts(j.accounts || []);
    else alert(j.error || "Failed to load accounts");
    setLoading(false);
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  async function handleTest(accountId: number) {
    if (!confirm("Test IMAP connection for this account?")) return;
    setLoading(true);
    const res = await fetch("/api/imap/test-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId }),
    });
    const j = await res.json();
    setLoading(false);
    if (j.success) alert("IMAP Test OK: " + (j.message || ""));
    else alert("IMAP Test Failed: " + (j.error || j.details || ""));
  }

  async function handleSync(accountId: number) {
    if (!confirm("Run manual sync (will fetch new emails)?")) return;
    setLoading(true);
    const res = await fetch("/api/imap/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId }),
    });
    const j = await res.json();
    setLoading(false);
    if (j.success) {
      alert(`Sync OK — new: ${j.inserted || 0}`);
      if (selectedAccount === accountId) await loadInbox(accountId);
    } else {
      alert("Sync failed: " + (j.error || j.details || ""));
    }
  }

  async function loadInbox(accountId: number) {
    setSelectedAccount(accountId);
    setLoading(true);
    const res = await fetch(`/api/imap/inbox?accountId=${accountId}`);
    const j = await res.json();
    setLoading(false);
    if (j.success) setEmails(j.emails || []);
    else alert(j.error || "Failed to load inbox");
  }

  function openEmail(e: IncomingEmail) {
    setViewingEmail(e);
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">IMAP Management</h1>
        <div className="flex gap-2">
          <button
            onClick={loadAccounts}
            className="px-3 py-2 border rounded bg-gray-100"
          >
            Refresh Accounts
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Accounts list */}
        <div className="col-span-1 bg-white rounded shadow p-4">
          <h2 className="font-semibold mb-3">Connected IMAP Accounts</h2>

          {loading && accounts.length === 0 ? (
            <div>Loading...</div>
          ) : accounts.length === 0 ? (
            <div className="text-gray-500">No accounts found for your tenant.</div>
          ) : (
            <div className="space-y-3">
              {accounts.map((acc) => (
                <div key={acc.id} className="border rounded p-3 flex justify-between items-start">
                  <div>
                    <div className="font-semibold">{acc.name}</div>
                    <div className="text-sm text-gray-600">{acc.email}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {acc.imapHost ?? "—"}:{acc.imapPort ?? "—"}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 items-end">
                    <button
                      onClick={() => handleTest(acc.id)}
                      className="text-sm px-2 py-1 rounded bg-green-600 text-white"
                    >
                      Test
                    </button>

                    <button
                      onClick={() => handleSync(acc.id)}
                      className="text-sm px-2 py-1 rounded bg-blue-600 text-white"
                    >
                      Sync Now
                    </button>

                    <button
                      onClick={() => loadInbox(acc.id)}
                      className="text-sm px-2 py-1 rounded bg-gray-200"
                    >
                      Open Inbox
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inbox list */}
        <div className="col-span-2 bg-white rounded shadow p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold">Inbox {selectedAccount ? `— Account ${selectedAccount}` : ""}</h2>
            <div className="text-sm text-gray-500">{emails.length} messages</div>
          </div>

          {selectedAccount === null ? (
            <div className="text-gray-500">Select an account to view inbox.</div>
          ) : emails.length === 0 ? (
            <div className="text-gray-500">No emails yet for this account. Click Sync Now to fetch.</div>
          ) : (
            <div className="divide-y">
              {emails.map((em) => (
                <div key={em.id} className="p-3 flex justify-between items-start hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="font-semibold">{em.subject || "(no subject)"}</div>
                    <div className="text-sm text-gray-600">{em.from} • {new Date(em.createdAt || "").toLocaleString()}</div>
                    <div className="text-sm text-gray-700 mt-1 line-clamp-2" dangerouslySetInnerHTML={{ __html: (em.html || em.body || "").slice(0, 400) }} />
                  </div>

                  <div className="ml-4 flex flex-col gap-2 items-end">
                    <button className="text-blue-600 text-sm" onClick={() => openEmail(em)}>View</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Email modal */}
      {viewingEmail && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-6 z-50">
          <div className="bg-white w-full max-w-4xl rounded shadow-lg overflow-auto max-h-[90vh]">
            <div className="p-4 border-b flex justify-between items-center">
              <div>
                <div className="font-bold text-lg">{viewingEmail.subject || "No subject"}</div>
                <div className="text-sm text-gray-600">{viewingEmail.from} • {new Date(viewingEmail.createdAt || "").toLocaleString()}</div>
              </div>
              <div>
                <button onClick={() => setViewingEmail(null)} className="px-3 py-1 bg-gray-200 rounded">Close</button>
              </div>
            </div>

            <div className="p-6">
              <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: viewingEmail.html || viewingEmail.body || "<i>No body</i>" }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
