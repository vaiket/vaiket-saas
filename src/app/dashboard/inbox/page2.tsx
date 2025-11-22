"use client";

import { useEffect, useState } from "react";

export default function InboxPage() {
  const [emails, setEmails] = useState<any[]>([]);
  const [selectedEmail, setSelectedEmail] = useState(null);

  async function loadEmails() {
    try {
      const res = await fetch("/api/emails/list");
      const json = await res.json();

      // SAFE CHECK
      setEmails(Array.isArray(json.emails) ? json.emails : []);
    } catch (err) {
      console.error("Inbox Load Error:", err);
      setEmails([]);
    }
  }

  useEffect(() => {
    loadEmails();
  }, []);

  return (
    <div className="p-4">
      <h2 className="font-bold mb-3">Inbox</h2>

      {emails.length === 0 && (
        <div className="text-gray-500">No emails found.</div>
      )}

      {emails.map((mail, index) => (
        <div
          key={index}
          onClick={() => setSelectedEmail(mail)}
          className="p-3 border rounded mb-2 cursor-pointer hover:bg-gray-100"
        >
          <div className="font-semibold">{mail.subject || "(No Subject)"}</div>
          <div className="text-sm text-gray-600">{mail.from}</div>
        </div>
      ))}
    </div>
  );
}
