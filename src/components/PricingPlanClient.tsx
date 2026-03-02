// components/PricingPlanClient.tsx
"use client";

import React, { useState } from "react";

type Props = {
  userId?: number | null;
  tenantId?: number | null;
  email?: string | null;
  name?: string | null;
};

export default function PricingPlanClient({ userId, tenantId, email, name }: Props) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");

  const PLANS: Record<string, any> = {
    basic: { monthly: 499, yearly: 4999, key: "basic", name: "Basic" },
    popular: { monthly: 999, yearly: 9999, key: "popular", name: "Growth" },
    pro: { monthly: 2999, yearly: 12000, key: "pro", name: "Professional" },
  };

  async function handleBuy(planKey: string) {
    try {
      setLoadingPlan(planKey);
      const plan = PLANS[planKey] || PLANS.basic;
      const amount = billingPeriod === "yearly" ? plan.yearly : plan.monthly;

      const body = {
        amount,
        productinfo: `Vaiket ${planKey} plan`,
        firstname: name || (email ? email.split("@")[0] : "User"),
        email: email || "customer@example.com",
        phone: "9999999999",
        userId: userId ?? null,
        tenantId: tenantId ?? null,
      };

      const res = await fetch("/api/payments/payu/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      // if server returns non-json HTML payload wrapper, still handle json check
      const data = await res.json().catch(() => null);
      if (!data || !data.ok) {
        const message = data?.error || `Payment initiation failed (status ${res.status})`;
        throw new Error(message);
      }

      if (data.html) {
        // open same window and write the html to submit the form to PayU
        const w = window.open("", "_self");
        if (!w) throw new Error("Unable to open payment window");
        w.document.write(data.html);
        w.document.close();
        return;
      }

      throw new Error("No payment HTML returned from server.");
    } catch (err: any) {
      console.error("Payment error:", err);
      alert(err?.message || "Payment initiation failed.");
    } finally {
      setLoadingPlan(null);
    }
  }

  /* ---------- UI (kept consistent with your design) ---------- */
  const CheckIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
  const RocketLaunchIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );

  const plans = [
    {
      key: "basic",
      name: "Basic",
      monthlyPrice: 499,
      yearlyPrice: 4999,
      features: [
        "1,250 AI responses per month",
        "Basic email automation",
        "IMAP + SMTP integration",
        "1 email account",
      ],
      cta: "Get Started",
      popular: false,
    },
    {
      key: "popular",
      name: "Growth",
      monthlyPrice: 999,
      yearlyPrice: 9999,
      features: ["3,250 responses", "Advanced AI automation", "Priority support"],
      cta: "Start Growing",
      popular: true,
    },
    {
      key: "pro",
      name: "Professional",
      monthlyPrice: 2999,
      yearlyPrice: 12000,
      features: ["4,000 AI responses", "Dedicated servers", "Premium support"],
      cta: "Go Pro",
      popular: false,
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold">Pricing that scales with you</h2>
        <p className="text-gray-600 mt-2">Choose a plan, then complete payment to activate.</p>
      </div>

      <div className="inline-flex items-center bg-white rounded-lg p-1 border border-gray-200 shadow-sm mb-8">
        <button
          onClick={() => setBillingPeriod("monthly")}
          className={`px-5 py-2 rounded-md text-sm font-medium ${billingPeriod === "monthly" ? "bg-blue-600 text-white" : "text-gray-700"}`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBillingPeriod("yearly")}
          className={`px-5 py-2 rounded-md text-sm font-medium ${billingPeriod === "yearly" ? "bg-blue-600 text-white" : "text-gray-700"}`}
        >
          Yearly (Save)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div key={plan.key} className={`p-6 rounded-2xl shadow ${plan.popular ? "bg-gradient-to-br from-purple-600 to-blue-600 text-white" : "bg-white"}`}>
            <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
            <div className="text-4xl font-bold mb-4">
              ₹{billingPeriod === "yearly" ? plan.yearlyPrice : plan.monthlyPrice}
              <span className="text-base font-medium ml-2">{billingPeriod === "monthly" ? "/month" : "/year"}</span>
            </div>

            <ul className="mb-6 space-y-2">
              {plan.features.map((f: string, i: number) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <CheckIcon className={`w-5 h-5 mt-0.5 ${plan.popular ? "text-blue-200" : "text-green-500"}`} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleBuy(plan.key)}
              disabled={loadingPlan === plan.key}
              className={`w-full py-3 rounded-xl font-bold ${plan.popular ? "bg-white text-purple-600" : "bg-blue-600 text-white"}`}
            >
              {loadingPlan === plan.key ? "Processing..." : <span className="flex items-center justify-center gap-2">{plan.cta}<RocketLaunchIcon className="w-4 h-4" /></span>}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
