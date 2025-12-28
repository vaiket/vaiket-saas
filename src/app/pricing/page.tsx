"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Plan {
  key: string;
  title: string;
  priceMonth: number;
  priceYear: number;
  features: string;
}

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly"
  );

  useEffect(() => {
    fetch("/api/subscriptions/plans")
      .then((res) => res.json())
      .then((data) => setPlans(data.plans || []));
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10">
      <h2 className="text-3xl font-bold mb-6">Choose Your Plan</h2>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setBillingCycle("monthly")}
          className={`px-4 py-2 rounded ${
            billingCycle === "monthly" ? "bg-black text-white" : "bg-white"
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBillingCycle("yearly")}
          className={`px-4 py-2 rounded ${
            billingCycle === "yearly" ? "bg-black text-white" : "bg-white"
          }`}
        >
          Yearly (Save 2 Months)
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6 w-10/12">
        {plans.map((plan) => (
          <div
            key={plan.key}
            className="bg-white p-6 rounded-lg shadow-lg text-center"
          >
            <h3 className="text-xl font-bold mb-2">{plan.title}</h3>
            <p className="text-3xl font-bold mb-4">
              ₹
              {billingCycle === "monthly"
                ? plan.priceMonth
                : plan.priceYear ?? plan.priceMonth * 10}
              <span className="text-sm font-normal">
                /{billingCycle === "monthly" ? "month" : "year"}
              </span>
            </p>

            <ul className="text-left text-sm mb-6 space-y-2">
              {JSON.parse(plan.features)?.map((f: string, i: number) => (
                <li key={i}>✔ {f}</li>
              ))}
            </ul>

            <Link
              href={`/checkout?plan=${plan.key}&billing=${billingCycle}`}
              className="bg-black text-white block py-2 rounded"
            >
              Choose Plan
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
