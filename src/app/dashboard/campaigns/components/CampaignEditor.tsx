"use client";

import { useState } from "react";

export default function CampaignEditor() {
  const [emails, setEmails] = useState("");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(false);

  const sendCampaign = async () => {
    setLoading(true);

    const res = await fetch("/api/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tenantId: 1, // 🔥 TEMP FIX
        emails: emails.split(",").map(e => e.trim()),
        subject,
        html,
      }),
    });

    const data = await res.json();
    console.log(data);

    alert(data.success ? "Campaign queued!" : data.error);
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <input
        placeholder="user1@gmail.com, user2@gmail.com"
        value={emails}
        onChange={(e) => setEmails(e.target.value)}
        className="w-full border p-2 rounded"
      />

      <input
        placeholder="Subject"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        className="w-full border p-2 rounded"
      />

      <textarea
        placeholder="Email HTML"
        value={html}
        onChange={(e) => setHtml(e.target.value)}
        className="w-full border p-2 h-40 rounded"
      />

      <button
        onClick={sendCampaign}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        🚀 Send Campaign
      </button>
    </div>
  );
}
