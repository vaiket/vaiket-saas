"use client";

import { useEffect, useState } from "react";

import MailboxOverview from "./components/MailboxOverview";
import ImapSmtpCard from "./components/ImapSmtpCard";
import DnsStatusCard from "./components/DnsStatusCard";
import ChangePasswordCard from "./components/ChangePasswordCard";
import OpenWebmailCard from "./components/OpenWebmailCard";

export default function MailSettingsPage() {
  const [dns, setDns] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 👉 ye normally auth / context se aayega
  const tenantId = "TENANT_ID";
  const mailboxId = "MAILBOX_ID";

  useEffect(() => {
    async function loadDns() {
      const res = await fetch(
        `/api/mail/dns/get?tenantId=${tenantId}&mailboxId=${mailboxId}`
      );
      const data = await res.json();
      setDns(data.dns);
      setLoading(false);
    }

    loadDns();
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Mail Settings</h1>

      <MailboxOverview />
      <OpenWebmailCard />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ImapSmtpCard />
        <ChangePasswordCard />
      </div>

      {/* 🔹 DNS Section */}
      <DnsStatusCard dns={dns} loading={loading} />
    </div>
  );
}
