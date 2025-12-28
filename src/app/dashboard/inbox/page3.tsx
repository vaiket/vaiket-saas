"use client";

import { useEffect, useState } from "react";

export default function InboxPage() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);

  // Load user's mail accounts
  async function loadAccounts() {
    const res = await fetch("/api/mail-accounts/list");
    const json = await res.json();
    if (json.success) {
      setAccounts(json.accounts);
      // auto-select if only one account exists
      if (json.accounts.length === 1) {
        setSelectedAccount(json.accounts[0].id);
      }
    }
  }

  // Load inbox emails
  async function loadEmails(accountId: number) {
    const res = await fetch(`/api/imap/inbox?accountId=${accountId}`);
    const json = await res.json();
    if (json.success) {
      setEmails(json.emails);
    } else {
      setEmails([]);
    }
  }

  // Initial accounts load
  useEffect(() => {
    loadAccounts();
  }, []);

  // When account changes -> load emails
  useEffect(() => {
    if (selectedAccount) loadEmails(selectedAccount);
  }, [selectedAccount]);

  return (
    <div className="flex h-screen">

      {/* LEFT — Account Selector */}
      <div className="w-1/5 border-r p-3">
        <h2 className="font-bold mb-3">Your Email Accounts</h2>

        {accounts.map(acc => (
          <div
            key={acc.id}
            onClick={() => setSelectedAccount(acc.id)}
            className={`p-2 mb-2 rounded cursor-pointer border 
              ${selectedAccount === acc.id ? "bg-blue-200" : "bg-gray-100"}
            `}
          >
            <div className="text-sm font-semibold">{acc.name}</div>
            <div className="text-xs">{acc.email}</div>
          </div>
        ))}
      </div>

      {/* MIDDLE — Email List */}
      <div className="w-2/5 border-r p-3 overflow-y-auto">
        <h2 className="font-bold mb-3">Inbox</h2>

        {emails.length === 0 && (
          <p className="text-gray-500 text-sm">No emails found.</p>
        )}

        {emails.map(email => (
          <div
            key={email.id}
            onClick={() => setSelectedEmail(email)}
            className="p-3 mb-2 bg-gray-100 border rounded cursor-pointer"
          >
            <div className="font-semibold">{email.subject}</div>
            <div className="text-xs text-gray-600">{email.from}</div>
          </div>
        ))}
      </div>

      {/* RIGHT — Email Viewer */}
      <div className="w-2/5 p-3">
        {selectedEmail ? (
          <>
            <h2 className="font-bold text-lg mb-2">{selectedEmail.subject}</h2>
            <div className="text-sm mb-2">From: {selectedEmail.from}</div>
            <div className="text-sm mb-2">To: {selectedEmail.to}</div>
            <div className="p-3 bg-white border rounded">
              <pre className="whitespace-pre-wrap">{selectedEmail.body}</pre>
            </div>
          </>
        ) : (
          <p className="text-gray-500">Select an email to view</p>
        )}
      </div>

    </div>
  );
}
