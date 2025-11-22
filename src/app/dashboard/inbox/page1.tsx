"use client";

import { useEffect, useState } from "react";
import EmailList from "./components/EmailList";
import EmailView from "./components/EmailView";
import AIPanel from "./components/AIPanel";

export default function InboxPage() {
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);

  async function loadEmails() {
    const res = await fetch("/api/emails/list");
    const json = await res.json();
    setEmails(json.emails);
  }

  useEffect(() => {
    loadEmails();
  }, []);

  return (
    <div className="flex h-screen">
      
      {/* LEFT — Email List */}
      <div className="w-1/4 border-r">
        <EmailList emails={emails} onSelect={setSelectedEmail} />
      </div>

      {/* MIDDLE — Email Content */}
      <div className="w-2/4 border-r">
        <EmailView email={selectedEmail} />
      </div>

      {/* RIGHT — AI Panel */}
      <div className="w-1/4">
        <AIPanel email={selectedEmail} />
      </div>

    </div>
  );
}
