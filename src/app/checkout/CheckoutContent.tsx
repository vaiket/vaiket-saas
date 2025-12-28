"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface Plan {
  key: string;
  title: string;
  priceMonth: number;
  priceYear: number | null;
  features: string;
}

export default function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [plan, setPlan] = useState<Plan | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const planKey = searchParams.get("plan");
    const billing = (searchParams.get("billing") as "monthly" | "yearly") || "monthly";

    if (!planKey) {
      setError("Missing plan");
      return;
    }

    setBillingCycle(billing);

    fetch("/api/subscriptions/plans")
      .then((r) => r.json())
      .then((data) => {
        const found = (data.plans as Plan[]).find((p) => p.key === planKey);
        if (!found) {
          setError("Plan not found");
        } else {
          setPlan(found);
        }
      })
      .catch(() => setError("Failed to load plan"));
  }, [searchParams]);

  const handlePay = async () => {
    if (!plan) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/subscriptions/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planKey: plan.key,
          billingCycle,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Payment init failed");
        setLoading(false);
        return;
      }

      const { payuUrl, params } = data as {
        payuUrl: string;
        params: Record<string, string | number>;
      };

      // 🔁 Build form & submit to PayU
      const form = document.createElement("form");
      form.method = "POST";
      form.action = payuUrl;

      Object.entries(params).forEach(([key, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = String(value);
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
    } catch (e) {
      console.error(e);
      setError("Unexpected error");
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white p-6 rounded shadow">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push("/pricing")}
            className="px-4 py-2 bg-black text-white rounded"
          >
            Back to pricing
          </button>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading plan...</p>
      </div>
    );
  }

  const amount =
    billingCycle === "yearly"
      ? plan.priceYear ?? plan.priceMonth * 10
      : plan.priceMonth;

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-2 text-center">Confirm Payment</h2>
        <p className="text-center text-gray-600 mb-6">
          Plan: <span className="font-semibold">{plan.title}</span>
        </p>

        <p className="text-center text-3xl font-bold mb-4">
          ₹{amount}
          <span className="text-sm font-normal">
            /{billingCycle === "monthly" ? "month" : "year"}
          </span>
        </p>

        <p className="text-xs text-gray-500 text-center mb-6">
          Access valid for 30 days (monthly) or 365 days (yearly) after payment.
        </p>

        <button
          onClick={handlePay}
          disabled={loading}
          className="w-full bg-black text-white py-2 rounded disabled:opacity-60"
        >
          {loading ? "Redirecting to PayU..." : "Pay with PayU"}
        </button>

        <button
          onClick={() => router.push("/pricing")}
          className="mt-3 w-full border border-gray-300 py-2 rounded"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
