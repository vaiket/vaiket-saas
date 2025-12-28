// src/app/payment-required/page.tsx
"use client";

import React from "react";
import { useRouter } from "next/navigation";

export default function PaymentRequired() {
  const router = useRouter();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-3xl w-full bg-white rounded shadow p-8 text-center">
        <h1 className="text-3xl font-bold text-green-800">Action Required — Complete Payment</h1>
        <p className="mt-4 text-gray-600">
          You’ve finished onboarding — one last step to activate your account. Choose a plan and
          complete payment to unlock your dashboard.
        </p>

        <div className="mt-6 flex gap-3 justify-center">
          <button
            onClick={() => router.push("/pricing")}
            className="px-6 py-3 bg-green-600 text-white rounded font-semibold hover:bg-green-700"
          >
            Choose Plan
          </button>

          <button
            onClick={() => router.push("/support")}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded border"
          >
            Contact Support
          </button>
        </div>

        <div className="mt-6 text-sm text-gray-500">
          After payment you will be redirected back to <b>/dashboard</b>. If you run into issues, send a
          screenshot to support.
        </div>
      </div>
    </div>
  );
}
