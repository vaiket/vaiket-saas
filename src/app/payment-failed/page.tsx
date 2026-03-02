"use client";
import Link from "next/link";

export default function PaymentFailedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-red-50">
      <h1 className="text-3xl font-bold text-red-700 mb-4">
        ❌ Payment Failed
      </h1>
      <p className="text-lg text-gray-700 mb-6">
        Something went wrong. Please try again.
      </p>
      <Link
        href="/dashboard/billing"
        className="bg-red-600 text-white px-6 py-3 rounded-lg shadow hover:bg-red-700"
      >
        Return to Billing
      </Link>
    </div>
  );
}
