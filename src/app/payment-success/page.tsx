"use client";
import Link from "next/link";

export default function PaymentSuccessPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-green-50">
      <h1 className="text-3xl font-bold text-green-700 mb-4">
        🎉 Payment Successful!
      </h1>
      <p className="text-lg text-gray-700 mb-6">
        Your subscription has been activated.
      </p>
      <Link
        href="/dashboard/billing"
        className="bg-green-600 text-white px-6 py-3 rounded-lg shadow hover:bg-green-700"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
