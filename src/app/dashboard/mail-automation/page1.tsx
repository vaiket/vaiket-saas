"use client";

import { useState } from "react";
import MailboxVerificationCard from "@/components/mail-automation/MailboxVerificationCard";
import DomainAuthenticationCard from "@/components/mail-automation/DomainAuthenticationCard";
import EnableAutomationCard from "@/components/mail-automation/EnableAutomationCard";

/**
 * FINAL – Mail Automation Main Page
 * --------------------------------
 * This page only orchestrates cards.
 * No business logic lives here.
 */
export default function MailAutomationPage() {
  // 🔐 Step gating state (single source of truth)
  const [step1Passed, setStep1Passed] = useState(false);
  const [step2Passed, setStep2Passed] = useState(false);

  /**
   * TODO (next phase):
   * - Fetch these from DB / mailbox list
   * - Or read from route params
   */
  const tenantMailboxId = 1; // placeholder
  const mailboxDomain = "example.com"; // placeholder

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-10">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Email Automation Setup</h1>
        <p className="text-gray-600 mt-1">
          Complete all steps below to activate secure email automation.
        </p>
      </div>

      {/* CARD 1 – STEP 1: MAILBOX VERIFICATION */}
      <MailboxVerificationCard
        tenantMailboxId={tenantMailboxId}
        onVerified={() => setStep1Passed(true)}
      />

      {/* CARD 2 – STEP 2: DOMAIN AUTHENTICATION */}
      <DomainAuthenticationCard
        domain={mailboxDomain}
        enabled={step1Passed}
        onVerified={() => setStep2Passed(true)}
      />

      {/* CARD 3 – STEP 3: FINAL ACTIVATION */}
      <EnableAutomationCard
        tenantMailboxId={tenantMailboxId}
        enabled={step2Passed}
      />
    </div>
  );
}
