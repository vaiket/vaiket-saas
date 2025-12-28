"use client";

import { useState } from "react";

type DnsRecord = {
  id: number;
  dkimHost: string;
  dkimValue: string;
  dkimStatus: string;
};

export default function DnsStatusCard({
  dns,
  loading,
}: {
  dns: DnsRecord[];
  loading: boolean;
}) {
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return <div className="border rounded-lg p-5">Loading DNS…</div>;
  }

  const record = dns?.[0];

  const isVerified = record?.dkimStatus === "verified";

  const fetchDkim = async () => {
    try {
      setVerifying(true);
      setError(null);

      const res = await fetch("/api/mail-automation/fetch-dkim", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed");
      }

      window.location.reload();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="border rounded-lg p-5 space-y-3">
      <h3 className="font-semibold">DKIM Record</h3>

      <div className="text-sm">
        <div>
          Host: <code>{record?.dkimHost || "default._domainkey"}</code>
        </div>
        <div className="break-all">
          Value:{" "}
          <code>
            {isVerified ? record?.dkimValue : "PENDING_DKIM"}
          </code>
        </div>
      </div>

      <button
        onClick={fetchDkim}
        disabled={verifying || isVerified}
        className={`px-4 py-2 rounded text-white ${
          isVerified
            ? "bg-green-600"
            : "bg-black hover:bg-gray-900"
        }`}
      >
        {isVerified
          ? "DKIM Verified"
          : verifying
          ? "Fetching DKIM..."
          : "Fetch DKIM"}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
