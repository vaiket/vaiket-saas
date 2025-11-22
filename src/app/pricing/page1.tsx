"use client";

import React, { useState } from "react";

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  async function handleBuy(planKey: string) {
    try {
      setLoadingPlan(planKey);

      // Example plan mapping — replace with your PLANS object if present
      const PLANS: any = {
        starter: { price: 2, key: "starter" },
        growth: { price: 2999, key: "growth" },
      };
      const plan = PLANS[planKey] || PLANS["starter"];
      const amount = plan.price; // rupees

      const userId = localStorage.getItem("userId") || "";
      const tenantId = localStorage.getItem("tenantId") || "";

      const res = await fetch("/api/payments/payu/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          productinfo: `Vaiket ${planKey} plan`,
          firstname: "User",
          email: "customer@example.com",
          phone: "9999999999",
          userId: userId ? Number(userId) : undefined,
          tenantId: tenantId ? Number(tenantId) : undefined,
        }),
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Payment initiation failed");

      // data.html is ready-to-submit form string returned by server
      if (data.html) {
        // open in same tab (PayU requires top-level navigation sometimes)
        const w = window.open("", "_self");
        if (!w) throw new Error("Unable to open payment window");
        w.document.write(data.html);
        w.document.close();
        return;
      }

      alert("Payment initiation returned no HTML");
    } catch (err: any) {
      console.error("Payment error:", err);
      alert(err.message || "Payment initiation failed");
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold text-green-800 mb-6">Pricing Plans</h1>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="p-6 border rounded">
          <h2 className="text-xl font-semibold">Starter — ₹999</h2>
          <p className="mt-3">1 year hosting, AI auto-replies (Basic).</p>
          <button
            onClick={() => handleBuy("starter")}
            disabled={loadingPlan === "starter"}
            className="bg-green-600 text-white px-4 py-2 rounded mt-4"
          >
            {loadingPlan === "starter" ? "Processing..." : "Buy Starter"}
          </button>
        </div>

        <div className="p-6 border rounded">
          <h2 className="text-xl font-semibold">Growth — ₹2999</h2>
          <p className="mt-3">Everything in Starter + extras</p>
          <button
            onClick={() => handleBuy("growth")}
            disabled={loadingPlan === "growth"}
            className="bg-green-600 text-white px-4 py-2 rounded mt-4"
          >
            {loadingPlan === "growth" ? "Processing..." : "Buy Growth"}
          </button>
        </div>

        <div className="p-6 border rounded">
          <h2 className="text-xl font-semibold">Business — ₹9999</h2>
          <p className="mt-3">Full enterprise</p>
          <button
            onClick={() => handleBuy("business")}
            disabled={loadingPlan === "business"}
            className="bg-green-600 text-white px-4 py-2 rounded mt-4"
          >
            {loadingPlan === "business" ? "Processing..." : "Buy Business"}
          </button>
        </div>
      </div>
    </div>
  );
}
