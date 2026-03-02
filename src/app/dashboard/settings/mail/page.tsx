"use client";

import { useEffect, useState } from "react";

import MailboxOverview from "./components/MailboxOverview";
import ImapSmtpCard from "./components/ImapSmtpCard";
import DnsStatusCard from "./components/DnsStatusCard";
import ChangePasswordCard from "./components/ChangePasswordCard";
import OpenWebmailCard from "./components/OpenWebmailCard";

export default function MailSettingsPage() {
  const [mailbox, setMailbox] = useState<any>(null);
  const [imapSmtp, setImapSmtp] = useState<any>(null);
  const [dns, setDns] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/mail/overview", {
          credentials: "include",
        });

        const data = await res.json();

        if (data.success) {
          setMailbox(data.mailbox || null);
          setImapSmtp(data.imapSmtp || null);
          setDns(data.dns || null);
        }
      } catch (e) {
        console.error("Failed to load mail overview", e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Mail Settings</h1>

      {/* ✅ FIXED */}
      <MailboxOverview mailbox={mailbox} />

      <OpenWebmailCard status={mailbox?.status} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ImapSmtpCard config={imapSmtp} />
        <ChangePasswordCard status={mailbox?.status} />
      </div>

      <DnsStatusCard dns={dns} loading={loading} />
    </div>
  );
}
