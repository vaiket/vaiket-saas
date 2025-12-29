'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function EmailManagementPage() {
  const router = useRouter();

  const automationActive = true; // backend se aayega
  const mailActive = false; // backend se aayega

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* PAGE TITLE */}
      <h1 className="text-2xl font-semibold mb-6">Email Management</h1>

      {/* CURRENT STATUS */}
      <div className="border rounded-lg p-5 mb-10 bg-white shadow-sm">
        <h2 className="text-lg font-medium mb-2">Current Mail Status</h2>

        {!mailActive ? (
          <p className="text-gray-600">
            No active mail plan yet.
            <br />
            <span className="text-sm text-green-600">
              Automation subscription is active.
            </span>
          </p>
        ) : (
          <div className="text-gray-700">
            <p><strong>Mail ID:</strong> info@yourdomain.com</p>
            <p><strong>Plan:</strong> Free (2 GB)</p>
            <p><strong>Status:</strong> Active</p>
          </div>
        )}
      </div>

      {/* PLANS */}
      <h2 className="text-xl font-medium mb-4">Choose a Mail Plan</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* STARTER FREE PLAN */}
        <div className="border rounded-lg p-5 bg-white shadow-sm">
          <h3 className="text-lg font-semibold mb-2">Starter Mail</h3>
          <p className="text-sm text-gray-600 mb-3">
            Free with your Automation Subscription
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

          {automationActive ? (
            <button
              className="w-full bg-black text-white py-2 rounded hover:opacity-90 transition"
              onClick={() => router.push('/dashboard/email-activation')}
            >
              Claim Free with Automation
            </button>
          ) : (
            <button
              className="w-full bg-gray-300 text-gray-600 py-2 rounded cursor-not-allowed"
              disabled
            >
              Buy Automation First
            </button>
          )}
        </div>

        {/* BASIC PLAN */}
        <div className="border rounded-lg p-5 bg-gray-50">
          <h3 className="text-lg font-semibold mb-2">Basic Mail</h3>
          <p className="text-sm text-gray-600 mb-3">
            For growing businesses
          </p>

          <ul className="text-sm text-gray-700 mb-4 space-y-1">
            <li>• Storage: 15 GB</li>
            <li>• 1 Mailbox</li>
            <li>• IMAP & SMTP</li>
          </ul>

          <div className="mb-4 font-semibold">₹299 / month</div>

          <button
            className="w-full bg-gray-300 text-gray-600 py-2 rounded cursor-not-allowed"
            disabled
          >
            Coming Soon
          </button>
        </div>

        {/* PRO PLAN */}
        <div className="border rounded-lg p-5 bg-gray-50">
          <h3 className="text-lg font-semibold mb-2">Pro Mail</h3>
          <p className="text-sm text-gray-600 mb-3">
            High volume & teams
          </p>

          <ul className="text-sm text-gray-700 mb-4 space-y-1">
            <li>• Storage: 50 GB</li>
            <li>• Multiple Mailboxes</li>
            <li>• Priority Delivery</li>
          </ul>

          <div className="mb-4 font-semibold">₹699 / month</div>

          <button
            className="w-full bg-gray-300 text-gray-600 py-2 rounded cursor-not-allowed"
            disabled
          >
            Coming Soon
          </button>
        </div>
      </div>
    </div>
  );
}
