"use client";

import { useState } from "react";

export default function OnboardingPage() {
  const [domain, setDomain] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);

  async function startSetup() {
    setLoading(true);

    const res = await fetch("/api/start-crawl", {
      method: "POST",
      body: JSON.stringify({
        tenantId: "TENANT_ID_FROM_DB",
        domain,
        businessName
      })
    });

    const json = await res.json();
    alert(json.message || "Started");
    setLoading(false);
  }

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold">AI Business Setup</h1>

      <input
        className="border p-3 w-full mt-5"
        placeholder="Business Name"
        value={businessName}
        onChange={(e) => setBusinessName(e.target.value)}
      />

      <input
        className="border p-3 w-full mt-5"
        placeholder="Website URL (https://example.com)"
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
      />

      <button
        onClick={startSetup}
        disabled={loading}
        className="bg-blue-600 text-white px-6 py-3 mt-6 rounded-lg"
      >
        {loading ? "Starting..." : "Start AI Setup"}
      </button>
    </div>
  );
}
