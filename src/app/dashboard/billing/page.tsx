"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

export default function BillingPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [activePlan, setActivePlan] = useState<any | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const fetchBillingData = async () => {
    try {
      const [plansRes, activeRes] = await Promise.all([
        fetch("/api/subscriptions/plans"),
        fetch("/api/subscriptions/active"),
      ]);

      const plansJson = await plansRes.json();
      const activeJson = await activeRes.json();

      if (Array.isArray(plansJson.plans)) setPlans(plansJson.plans);
      else setPlans(plansJson);

      if (activeJson?.subscription) setActivePlan(activeJson.subscription);
    } catch (err) {
      toast.error("Failed to load billing details");
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, []);

  const subscribe = async (planKey: string, billingCycle: string) => {
    setLoading(planKey + billingCycle);

    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey, billingCycle }),
      });

      const data = await res.json();

      if (!data.success) {
        toast.error(data.error || "Unable to start payment");
        setLoading(null);
        return;
      }

      toast.success("Payment request created. Redirecting...");

      // NEXT STEP: redirect to PayU — once integrated
      // For now only DB insertion done
      setLoading(null);
      fetchBillingData();
    } catch (error) {
      console.error(error);
      toast.error("Payment init failed");
      setLoading(null);
    }
  };

  const isActivePlan = (key: string) => key === activePlan?.planKey;

  return (
    <div className="p-6 md:p-10">
      <h2 className="text-2xl md:text-3xl font-bold mb-6 text-purple-600">
        Billing & Subscription 🚀
      </h2>

      {/* Active Subscription Display */}
      {activePlan ? (
        <Card className="p-4 mb-6 border-green-500 bg-green-50">
          <div className="font-semibold text-green-700">
            Current Plan: {activePlan.planKey.toUpperCase()} ✔
          </div>
          <div>Status: Active</div>
          {activePlan.endsAt && (
            <div>
              Valid till:{" "}
              {new Date(activePlan.endsAt).toLocaleDateString("en-IN")}
            </div>
          )}
        </Card>
      ) : (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-400 rounded-md text-yellow-700">
          ⚠ No Active Subscription! Choose a plan to activate.
        </div>
      )}

      {/* Plans Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card
            key={plan.key}
            className={`rounded-xl shadow-md p-2 ${
              isActivePlan(plan.key)
                ? "border-green-600 bg-green-50"
                : "border-purple-300"
            }`}
          >
            <CardContent className="p-6 space-y-4 text-center">
              <h3 className="text-lg md:text-xl font-bold">{plan.title}</h3>

              <div>
                <p className="text-2xl font-bold text-purple-700">
                  ₹{plan.priceMonth}
                </p>
                <p className="text-sm text-gray-600">per month</p>
              </div>

              {isActivePlan(plan.key) ? (
                <div className="text-green-700 font-semibold">
                  Active Plan ✔
                </div>
              ) : (
                <Button
                  onClick={() => subscribe(plan.key, "monthly")}
                  disabled={loading === plan.key + "monthly"}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {loading === plan.key + "monthly"
                    ? "Processing..."
                    : "Subscribe Monthly"}
                </Button>
              )}

              {/* Yearly Pricing — only if not active */}
              {!isActivePlan(plan.key) && plan.priceYear && (
                <Button
                  variant="outline"
                  onClick={() => subscribe(plan.key, "yearly")}
                  disabled={loading === plan.key + "yearly"}
                  className="w-full border border-purple-500 text-purple-700 hover:bg-purple-100"
                >
                  {loading === plan.key + "yearly"
                    ? "Processing..."
                    : `Yearly: ₹${plan.priceYear}`}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Invoice History Coming Next */}
      <div className="mt-10 text-gray-600 italic">
        📌 Invoice History + Pay Now + Print Invoice will appear below ⬇️
      </div>
    </div>
  );
}
