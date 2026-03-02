"use client";

import Link from "next/link";

import SubscriptionWorkspace from "@/components/subscriptions/SubscriptionWorkspace";

export default function WhatsAppSubscriptionPage() {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p>
            WhatsApp plan active hone par hi WhatsApp Hub actions (send, bulk, workflows, chatbot,
            account connect) allowed rahenge.
          </p>
          <Link
            href="/dashboard/whatsapp"
            className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
          >
            Back to WhatsApp Hub
          </Link>
        </div>
      </section>

      <SubscriptionWorkspace
        fixedProduct="whatsapp"
        title="WhatsApp Prime Bundles"
        subtitle="Choose Basic, Growth or Advance plan and activate instantly with secure Razorpay checkout."
      />
    </div>
  );
}
