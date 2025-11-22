"use client";

import { useEffect, useState } from "react";

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [wallet, setWallet] = useState(0);
  const [autoPay, setAutoPay] = useState(false);

  useEffect(() => {
    async function loadBilling() {
      try {
        // ✅ Get authenticated user info
        const me = await fetch("/api/auth/me");
        const meJson = await me.json();

        if (!meJson.success || !meJson.user) {
          console.warn("Not logged in — Billing restricted");
          return;
        }

        const tenantId = meJson.user.tenant?.id;

        // ✅ Fetch subscription
        const subscriptionRes = await fetch("/api/subscription/me", {
          headers: { "x-tenant-id": tenantId },
        });
        const subscriptionJson = await subscriptionRes.json();
        if (subscriptionJson.ok) setSubscription(subscriptionJson.subscription);

        // ✅ Fetch transactions
        const txRes = await fetch("/api/payments/list");
        const txJson = await txRes.json();
        if (txJson.ok) setTransactions(txJson.payments || []);

        // ✅ Wallet (optional — stored locally)
        const walletBalance = localStorage.getItem("wallet") || "0";
        setWallet(parseInt(walletBalance));
      } catch (err) {
        console.error("Billing load error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadBilling();
  }, []);

  if (loading)
    return (
      <div className="p-10 text-center text-gray-600">
        Loading billing details...
      </div>
    );

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-green-700">Billing & Payments</h1>
      <p className="mt-1 text-gray-600">
        View your subscription, invoices, transaction history & wallet.
      </p>

      {/* ✅ Current Subscription */}
      <div className="mt-8 bg-white shadow rounded p-6 border">
        <h2 className="text-xl font-semibold text-gray-800">
          Current Subscription
        </h2>

        {subscription ? (
          <div className="mt-4">
            <p className="text-gray-700">
              Plan:{" "}
              <span className="font-semibold">
                {subscription.planName || subscription.plan?.name}
              </span>
            </p>

            <p className="text-gray-700 mt-1">
              Expires:{" "}
              <span className="font-semibold">
                {new Date(subscription.expiresAt).toLocaleDateString()}
              </span>
            </p>

            <span
              className={`mt-2 inline-block px-3 py-1 rounded text-sm ${
                subscription.status === "active"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {subscription.status.toUpperCase()}
            </span>

            <button
              onClick={() => (window.location.href = "/dashboard/pricing-plan")}
              className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Renew / Upgrade
            </button>
          </div>
        ) : (
          <div className="mt-4 text-gray-600">
            You do not have an active subscription.
            <br />
            <button
              onClick={() => (window.location.href = "/dashboard/pricing-plan")}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded"
            >
              Buy Subscription
            </button>
          </div>
        )}
      </div>

      {/* ✅ Wallet */}
      <div className="mt-8 bg-white shadow rounded p-6 border">
        <h2 className="text-xl font-semibold text-gray-800">Wallet Balance</h2>
        <p className="text-gray-700 mt-2">
          ₹<span className="font-bold text-green-700">{wallet}</span>
        </p>

        <button
          onClick={() => alert("Wallet top-up coming soon")}
          className="mt-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          Add Money
        </button>
      </div>

      {/* ✅ AutoPay */}
      <div className="mt-8 bg-white shadow rounded p-6 border">
        <h2 className="text-xl font-semibold text-gray-800">AutoPay</h2>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-gray-700">
            Enable automatic renewal via UPI
          </span>

          <button
            onClick={() => {
              setAutoPay(!autoPay);
              alert("UPI AutoPay coming soon");
            }}
            className={`px-4 py-2 rounded ${
              autoPay ? "bg-green-600 text-white" : "bg-gray-300"
            }`}
          >
            {autoPay ? "Enabled" : "Enable"}
          </button>
        </div>
      </div>

      {/* ✅ Transaction History */}
      <div className="mt-10">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">
          Transaction History
        </h2>

        <div className="bg-white shadow rounded border overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-gray-800">ID</th>
                <th className="p-3 text-gray-800">Plan</th>
                <th className="p-3 text-gray-800">Amount</th>
                <th className="p-3 text-gray-800">Status</th>
                <th className="p-3 text-gray-800">Date</th>
                <th className="p-3 text-gray-800">Action</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 && (
                <tr>
                  <td className="p-4 text-gray-600 text-center" colSpan={6}>
                    No transactions found.
                  </td>
                </tr>
              )}

              {transactions.map((tx) => (
                <tr key={tx.id} className="border-t hover:bg-gray-50">
                  <td className="p-3">{tx.id}</td>
                  <td className="p-3">{tx.plan_key}</td>
                  <td className="p-3 font-semibold">₹{tx.amount}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded text-sm ${
                        tx.status === "success"
                          ? "bg-green-100 text-green-700"
                          : tx.status === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {tx.status}
                    </span>
                  </td>

                  <td className="p-3">
                    {new Date(tx.created_at).toLocaleDateString()}
                  </td>

                  <td className="p-3 space-x-3">
                    {tx.status === "pending" && (
                      <button
                        onClick={() =>
                          window.location.href = "/dashboard/pricing-plan"
                        }
                        className="text-blue-600 hover:underline"
                      >
                        Pay Now
                      </button>
                    )}

                    {tx.status === "success" && (
                      <button
                        onClick={() =>
                          window.open(`/api/invoice/${tx.id}`, "_blank")
                        }
                        className="text-green-700 hover:underline"
                      >
                        Invoice
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
