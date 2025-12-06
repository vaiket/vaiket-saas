// src/app/dashboard/settings/billing/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

type BillingCycle = "monthly" | "yearly";

interface SubscriptionRow {
  id: number;
  planKey: string;
  status: string;
  billingCycle: BillingCycle;
  amountPaid: number | null;
  createdAt: string;
  startedAt: string | null;
  endsAt: string | null;
}

interface ActiveSub extends SubscriptionRow {}

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  professional: "Professional",
  enterprise: "Enterprise",
};

const PLAN_PRICES: Record<string, { monthly: number; yearly: number }> = {
  starter: { monthly: 499, yearly: 4999 },
  professional: { monthly: 999, yearly: 9999 },
  enterprise: { monthly: 1999, yearly: 19999 },
};

const formatDate = (val: string | null) =>
  val ? new Date(val).toLocaleDateString() : "-";

const getDisplayAmount = (row: SubscriptionRow) => {
  if (row.amountPaid != null) return row.amountPaid;
  const cfg = PLAN_PRICES[row.planKey];
  if (!cfg) return 0;
  const cycle = row.billingCycle === "yearly" ? "yearly" : "monthly";
  return cfg[cycle];
};

export default function BillingPage() {
  const [activeSub, setActiveSub] = useState<ActiveSub | null>(null);
  const [history, setHistory] = useState<SubscriptionRow[]>([]);
  const [loadingPay, setLoadingPay] = useState(false);

  useEffect(() => {
    loadActive();
    loadHistory();
  }, []);

  const loadActive = async () => {
    try {
      const res = await fetch("/api/subscriptions/active");
      const data = await res.json();
      if (data?.subscription) setActiveSub(data.subscription);
      else setActiveSub(null);
    } catch (e) {
      console.error(e);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await fetch("/api/subscriptions/history");
      const data = await res.json();
      setHistory(data.history || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePayNow = async (planKey: string, billingCycle: BillingCycle) => {
    try {
      setLoadingPay(true);
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey, billingCycle }),
      });

      const html = await res.text();
      const win = window.open("", "_self");
      win!.document.write(html);
      win!.document.close();
    } catch (e) {
      console.error(e);
      toast.error("Payment error");
    } finally {
      setLoadingPay(false);
    }
  };

  const handleInvoiceDownload = (subId: number) => {
    window.open(`/api/billing/invoice/${subId}`, "_blank");
  };

  return (
    <div className="p-6 space-y-8">
      {/* CURRENT SUBSCRIPTION */}
      <Card className="shadow-lg border-purple-200">
        <CardContent className="p-6">
          <h2 className="text-lg font-bold text-purple-700 mb-3">
            Current Subscription
          </h2>

          {activeSub ? (
            <div className="space-y-2 text-sm">
              <p>
                Plan:{" "}
                <b>
                  {PLAN_LABELS[activeSub.planKey] || activeSub.planKey} (
                  {activeSub.billingCycle})
                </b>
              </p>
              <p>
                Status:{" "}
                {activeSub.status === "active" ? (
                  <span className="text-green-600 font-semibold">Active</span>
                ) : (
                  <span className="text-orange-600 font-semibold capitalize">
                    {activeSub.status}
                  </span>
                )}
              </p>
              <p>Started: {formatDate(activeSub.startedAt)}</p>
              <p>Expires: {formatDate(activeSub.endsAt)}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              No active subscription. Choose a plan to get started.
            </p>
          )}
        </CardContent>
      </Card>

      {/* INVOICE / SUBSCRIPTION HISTORY */}
      <Card className="shadow-lg border-purple-200">
        <CardContent className="p-6">
          <h3 className="text-md font-bold text-purple-700 mb-4">
            Invoice History
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border">
              <thead className="bg-purple-100 text-purple-800">
                <tr>
                  <th className="p-2 border">#</th>
                  <th className="p-2 border">Invoice No</th>
                  <th className="p-2 border">Plan</th>
                  <th className="p-2 border">Amount</th>
                  <th className="p-2 border">Status</th>
                  <th className="p-2 border">Date</th>
                  <th className="p-2 border">Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 && (
                  <tr>
                    <td
                      className="p-3 text-center text-gray-500"
                      colSpan={7}
                    >
                      No records yet.
                    </td>
                  </tr>
                )}

                {history.map((row, idx) => {
                  const amount = getDisplayAmount(row);
                  const invoiceNo = `VAI-INV-${String(row.id).padStart(6, "0")}`;

                  return (
                    <tr key={row.id}>
                      <td className="p-2 border text-center">{idx + 1}</td>
                      <td className="p-2 border">{invoiceNo}</td>
                      <td className="p-2 border">
                        {PLAN_LABELS[row.planKey] || row.planKey} (
                        {row.billingCycle})
                      </td>
                      <td className="p-2 border">₹{amount}</td>
                      <td className="p-2 border">
                        {row.status === "active" ? (
                          <span className="text-green-600 font-semibold">
                            Paid
                          </span>
                        ) : (
                          <span className="text-orange-600 font-semibold">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="p-2 border">
                        {new Date(row.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-2 border text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleInvoiceDownload(row.id)}
                        >
                          View
                        </Button>

                        {row.status === "pending" && (
                          <Button
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700"
                            disabled={loadingPay}
                            onClick={() =>
                              handlePayNow(row.planKey, row.billingCycle)
                            }
                          >
                            {loadingPay ? "Redirecting..." : "Pay Now"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
