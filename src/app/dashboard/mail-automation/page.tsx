"use client";

import { useEffect, useState } from "react";

import MailboxVerificationCard from "@/components/mail-automation/MailboxVerificationCard";
import DomainAuthenticationCard from "@/components/mail-automation/DomainAuthenticationCard";
import DNSLiveVerificationCard from "@/components/mail-automation/DNSLiveVerificationCard";
import EnableAutomationCard from "@/components/mail-automation/EnableAutomationCard";

/**
 * FINAL – Mail Automation Setup Page
 * ---------------------------------
 * ❌ No business logic here
 * ✅ Only step orchestration
 * ✅ All existing cards remain SAME
 */
export default function MailAutomationPage() {
  /* 🔐 Step gating */
  const [step1Passed, setStep1Passed] = useState(false);
  const [step2Passed, setStep2Passed] = useState(false);
  const [step25Passed, setStep25Passed] = useState(false);

  /* 📦 Mailbox info (from DB) */
  const [tenantMailboxId, setTenantMailboxId] = useState<number | null>(null);
  const [mailboxDomain, setMailboxDomain] = useState<string | null>(null);

  /* 🔄 Load mailbox overview */
  useEffect(() => {
    fetch("/api/mail/overview", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data?.imapSmtp) {
          setTenantMailboxId(data.imapSmtp.id ?? null);
          setMailboxDomain(data.imapSmtp.domain ?? null);

          if (data.imapSmtp.active) {
            setStep1Passed(true);
          }
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Email Automation Setup</h1>
        <p className="text-gray-600 mt-1">
          Complete all steps below to activate email automation safely.
        </p>
      </div>

      {/* STEP 1 — MAILBOX VERIFICATION */}
      <MailboxVerificationCard
        tenantMailboxId={tenantMailboxId}
        onVerified={() => setStep1Passed(true)}
      />

      {/* STEP 2 — DOMAIN AUTHENTICATION (DNS RECORDS DISPLAY) */}
      <DomainAuthenticationCard
        domain={mailboxDomain ?? undefined}
        enabled={step1Passed}
        onVerified={() => setStep2Passed(true)}
      />

      {/* STEP 2.5 — LIVE DNS VERIFICATION (NEW CARD) */}
      <DNSLiveVerificationCard
        domain={mailboxDomain ?? undefined}
        enabled={step1Passed && step2Passed}
        onVerified={() => setStep25Passed(true)}
      />

      {/* STEP 3 — ENABLE AUTOMATION */}
      <EnableAutomationCard
        tenantMailboxId={tenantMailboxId}
        enabled={step1Passed && step2Passed && step25Passed}
      />
    </div>
  );
}
