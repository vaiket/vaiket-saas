"use client";

import Link from "next/link";

import SubscriptionWorkspace from "@/components/subscriptions/SubscriptionWorkspace";

export default function EmailHubSubscriptionPage() {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p>
            Email Hub plans ke through mailbox automation, campaigns aur premium email workflows
            activate honge. Checkout Razorpay par secure payment ke saath hota hai.
          </p>
          <Link
            href="/dashboard/email-hub"
            className="rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
          >
            Back to Email Hub
          </Link>
        </div>
      </section>

      <SubscriptionWorkspace
        fixedProduct="core"
        title="Email Services Pricing"
        subtitle="Choose your email automation bundle and activate instantly using Razorpay checkout."
      />
    </div>
  );
}
