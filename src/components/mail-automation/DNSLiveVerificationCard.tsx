"use client";

import { useState } from "react";
import { RefreshCcw, CheckCircle2, AlertCircle } from "lucide-react";

export default function DNSLiveVerificationCard() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<"success" | "failed" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const verifyDNS = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/mail/verify-dns", {
        method: "POST",
      });

      const data = await res.json();

      if (data?.success) {
        setResult("success");
      } else {
        setResult("failed");
        setError(data?.message || "DNS not matched yet");
      }
    } catch {
      setResult("failed");
      setError("Server error while verifying DNS");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border p-6 bg-gray-50">
      <div className="flex justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">
            Step 2.5: Live DNS Verification
          </h2>
          <p className="text-sm text-gray-500">
            Force check DNS live (no restrictions)
          </p>
        </div>

        <span className="text-sm text-gray-400">Waiting</span>
      </div>

      <div className="bg-white border rounded-lg p-4 text-sm text-gray-600 mb-4">
        <ul className="list-disc ml-5 space-y-1">
          <li>Queries Google / Cloudflare DNS</li>
          <li>Matches SPF, DKIM, DMARC</li>
          <li>No blocking — manual verification allowed</li>
        </ul>
      </div>

      {/* 🔥 ALWAYS ENABLED BUTTON */}
      <button
        onClick={verifyDNS}
        className="bg-black text-white px-5 py-2 rounded-lg flex gap-2 items-center"
      >
        <RefreshCcw
          className={loading ? "animate-spin h-4 w-4" : "h-4 w-4"}
        />
        {loading ? "Checking..." : "Recheck DNS Live"}
      </button>

      {/* RESULT */}
      {result === "success" && (
        <div className="mt-4 flex gap-2 text-green-600 items-center">
          <CheckCircle2 className="h-5 w-5" />
          DNS verified successfully
        </div>
      )}

      {result === "failed" && (
        <div className="mt-4 flex gap-2 text-red-600 items-center">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-3">
        DNS propagation may take up to 24 hours.
      </p>
    </section>
  );
}
