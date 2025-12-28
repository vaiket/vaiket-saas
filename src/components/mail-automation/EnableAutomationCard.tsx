"use client";

import { useState } from "react";
import { CheckCircle, Loader2, ShieldCheck } from "lucide-react";

interface Props {
  tenantMailboxId?: number;
  enabled?: boolean; // unlocked after Step-2
}

export default function EnableAutomationCard({
  tenantMailboxId,
  enabled = false,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEnable = async () => {
    if (!tenantMailboxId) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/mail-automation/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantMailboxId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to enable automation");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      className={`rounded-2xl border p-6 shadow-sm ${
        !enabled ? "opacity-50" : ""
      }`}
    >
      <h2 className="text-xl font-semibold mb-4">
        Step 3: Ready to Automate
      </h2>

      {success ? (
        <div className="space-y-4">
          <p className="flex items-center gap-2 text-green-600 font-medium">
            <CheckCircle className="h-5 w-5" /> Automation Enabled
          </p>
          <p className="text-gray-700">
            🎉 Congratulations! Your mailbox is now approved and automation is
            live.
          </p>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <ShieldCheck className="h-4 w-4" />
            Only approved mailboxes are allowed to send automated emails.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-gray-700">
            All required checks are complete. You can now enable email
            automation.
          </p>

          <button
            onClick={handleEnable}
            disabled={!enabled || loading}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl flex items-center gap-2 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-5 w-5 animate-spin" />}
            Enable Automation
          </button>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}

      <p className="mt-4 text-xs text-gray-500">
        Automation will only run for approved mailboxes that pass all security
        checks.
      </p>
    </section>
  );
}
