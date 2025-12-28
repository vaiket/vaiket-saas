// src/components/PlanCard.tsx
import React from "react";

export default function PlanCard({
  plan,
  onBuy,
  loading,
}: {
  plan: { key: string; label: string; price: number };
  onBuy: () => void;
  loading?: boolean;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xl font-bold text-green-800">{plan.label}</h4>
          <div className="text-gray-500 text-sm mt-1">Billed monthly (auto-renew)</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-extrabold text-gray-900">₹{plan.price}</div>
          <div className="text-sm text-gray-500">/mo</div>
        </div>
      </div>

      <ul className="mt-4 text-sm text-gray-700 space-y-1 flex-1">
        <li>✅ 1 year hosting</li>
        <li>✅ AI auto-replies (Basic)</li>
        <li>✅ Email & WhatsApp support</li>
        <li>✅ Priority onboarding</li>
      </ul>

      <div className="mt-6">
        <button
          onClick={onBuy}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded disabled:opacity-60"
        >
          {loading ? "Processing..." : `Buy ${plan.label}`}
        </button>
      </div>
    </div>
  );
}
