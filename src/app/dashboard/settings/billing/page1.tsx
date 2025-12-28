"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

export default function BillingSettingsPage() {
  const [activeSub, setActiveSub] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      const active = await fetch("/api/subscriptions/active").then((r) => r.json());
      const his = await fetch("/api/subscriptions/history").then((r) => r.json());

      setActiveSub(active.subscription || null);
      setHistory(his.history || []);
    } catch (e) {
      toast.error("Failed to load subscriptions");
    }
  };

  const handlePay = async (planKey: string, billingCycle: string) => {
    setLoading(planKey + billingCycle);
    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey, billingCycle }),
      });

      const html = await res.text();
      const win = window.open("", "_self");
      win!.document.write(html);
      win!.document.close();
    } catch (err) {
      toast.error("Payment failed");
      setLoading(null);
    }
  };

  const handleInvoice = (subId: number) => {
    window.open(`/api/billing/invoice/${subId}`, "_blank");
  };

  const formatDate = (d: string | null) =>
    d ? new Intl.DateTimeFormat("en-IN").format(new Date(d)) : "-";

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <h2 className="text-3xl font-bold text-purple-700">Billing & Subscription</h2>

      {/* Active Subscription */}
      {activeSub ? (
        <Card className="border border-green-500 shadow-md bg-green-50">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-green-700">Current Plan: {activeSub.planKey}</h3>
                <p className="text-sm text-gray-700">
                  Status: <span className="font-semibold">{activeSub.status}</span>
                </p>
                <p className="text-sm">Started: {formatDate(activeSub.startedAt)}</p>
                <p className="text-sm">Expires: {formatDate(activeSub.endsAt)}</p>
              </div>

              <Button
                onClick={() => handleInvoice(activeSub.id)}
                className="bg-purple-700 hover:bg-purple-800 text-white"
              >
                Download Invoice
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <p className="text-gray-600">No active subscription found.</p>
      )}

      {/* Billing History */}
      <Card className="shadow-lg">
        <CardContent className="p-6">
          <h3 className="text-xl font-semibold mb-3 text-purple-600">Subscription History</h3>
          {history.length === 0 ? (
            <p>No past subscriptions found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border text-sm border-gray-200 rounded-lg">
                <thead className="bg-purple-100 text-purple-800">
                  <tr>
                    <th className="p-2 text-left">Plan</th>
                    <th className="p-2 text-left">Cycle</th>
                    <th className="p-2 text-left">Amount (₹)</th>
                    <th className="p-2 text-left">Start</th>
                    <th className="p-2 text-left">End</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((sub) => (
                    <tr key={sub.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">{sub.planKey}</td>
                      <td className="p-2">{sub.billingCycle}</td>
                      <td className="p-2">{sub.amountPaid || "-"}</td>
                      <td className="p-2">{formatDate(sub.startedAt)}</td>
                      <td className="p-2">{formatDate(sub.endsAt)}</td>
                      <td className="p-2 capitalize">{sub.status}</td>

                      <td className="p-2 text-center space-x-2">
                        {sub.status === "pending" ? (
                          <Button
                            size="sm"
                            onClick={() => handlePay(sub.planKey, sub.billingCycle)}
                            disabled={loading === sub.planKey + sub.billingCycle}
                            className="bg-orange-600 hover:bg-orange-700"
                          >
                            {loading === sub.planKey + sub.billingCycle ? "Redirecting..." : "Pay Now"}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleInvoice(sub.id)}
                            className="text-purple-700 border-purple-600"
                          >
                            Invoice
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
