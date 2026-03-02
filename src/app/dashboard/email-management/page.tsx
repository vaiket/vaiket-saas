'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export const dynamic = "force-dynamic";

export default function EmailManagementPage() {
  const router = useRouter();

  const [automationActive, setAutomationActive] = useState(false);
  const [loading, setLoading] = useState(true);

  // 🔥 Fetch payment status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/payment/status', {
          credentials: 'include',
          cache: 'no-store',
        });

        const data = await res.json();
        console.log("Payment status:", data);

        setAutomationActive(!!data?.isActive);
      } catch (err) {
        console.error("Failed to fetch status", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* TITLE */}
      <h1 className="text-2xl font-semibold mb-6">Email Management</h1>

      {/* STATUS BOX */}
      <div className="border rounded-lg p-5 mb-10 bg-white shadow-sm">
        <h2 className="text-lg font-medium mb-2">Current Mail Status</h2>

        {automationActive ? (
          <p className="text-green-600">
            ✅ Automation subscription active
          </p>
        ) : (
          <p className="text-red-500">
            No active mail plan yet.
            <br />
            Automation subscription not active.
          </p>
        )}
      </div>

      {/* PLANS */}
      <h2 className="text-xl font-medium mb-4">Choose a Mail Plan</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* STARTER MAIL */}
        <div className="border rounded-lg p-5 bg-white shadow-sm">
          <h3 className="text-lg font-semibold mb-2">Starter Mail</h3>
          <p className="text-sm text-gray-600 mb-3">
            Free with Automation Subscription
          </p>

          <ul className="text-sm text-gray-700 mb-4 space-y-1">
            <li>• Storage: 2 GB</li>
            <li>• 1 Mailbox</li>
            <li>• IMAP & SMTP</li>
          </ul>

          <div className="mb-4">
            <span className="line-through text-gray-400 mr-2">₹149</span>
            <span className="text-green-600 font-semibold">Free</span>
          </div>

          <button
            disabled={loading}
            onClick={() =>
              automationActive
                ? router.push('/dashboard/email-activation')
                : router.push('/dashboard/Subscriptions')
            }
            className={`w-full py-2 rounded transition ${
              automationActive
                ? 'bg-black text-white hover:opacity-90'
                : 'bg-gray-300 text-gray-600'
            }`}
          >
            {automationActive
              ? 'Claim Free with Automation'
              : 'Buy Automation First'}
          </button>
        </div>

        {/* BASIC PLAN */}
        <div className="border rounded-lg p-5 bg-gray-50">
          <h3 className="text-lg font-semibold mb-2">Basic Mail</h3>
          <p className="text-sm text-gray-600 mb-3">For growing businesses</p>

          <ul className="text-sm text-gray-700 mb-4 space-y-1">
            <li>• Storage: 15 GB</li>
            <li>• 1 Mailbox</li>
            <li>• IMAP & SMTP</li>
          </ul>

          <div className="mb-4 font-semibold">₹299 / month</div>

          <button
            disabled
            className="w-full bg-gray-300 text-gray-600 py-2 rounded"
          >
            Coming Soon
          </button>
        </div>

        {/* PRO PLAN */}
        <div className="border rounded-lg p-5 bg-gray-50">
          <h3 className="text-lg font-semibold mb-2">Pro Mail</h3>
          <p className="text-sm text-gray-600 mb-3">High volume & teams</p>

          <ul className="text-sm text-gray-700 mb-4 space-y-1">
            <li>• Storage: 50 GB</li>
            <li>• Multiple Mailboxes</li>
            <li>• Priority Delivery</li>
          </ul>

          <div className="mb-4 font-semibold">₹699 / month</div>

          <button
            disabled
            className="w-full bg-gray-300 text-gray-600 py-2 rounded"
          >
            Coming Soon
          </button>
        </div>
      </div>
    </div>
  );
}
