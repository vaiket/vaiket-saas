"use client";

import { useEffect, useState } from "react";

export default function DNSSetupPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/mail/dns")
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-gray-500">Loading DNS records...</p>;
  }

  if (!data?.success) {
    return <p className="text-red-600">{data?.message}</p>;
  }

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 border rounded-lg">
      <h1 className="text-2xl font-semibold mb-2">DNS Configuration</h1>
      <p className="text-gray-600 mb-6">
        Add these DNS records to activate email delivery for{" "}
        <strong>{data.domain}</strong>
      </p>

      <table className="w-full border text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="border p-2">Type</th>
            <th className="border p-2">Host</th>
            <th className="border p-2">Value</th>
            <th className="border p-2">Priority</th>
          </tr>
        </thead>
        <tbody>
          {data.records.map((r: any, i: number) => (
            <tr key={i}>
              <td className="border p-2">{r.type}</td>
              <td className="border p-2">{r.host}</td>
              <td className="border p-2 break-all">{r.value}</td>
              <td className="border p-2">{r.priority || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="text-xs text-gray-500 mt-4">
        DNS propagation may take up to 24 hours.
      </p>
    </div>
  );
}
