import Link from "next/link";
import { CheckCircle2, CreditCard, Crown, Sparkles } from "lucide-react";

import RcsFeatureShell from "@/components/rcs/RcsFeatureShell";

const plans = [
  {
    key: "starter",
    title: "RCS Starter",
    price: "INR 2,499 / month",
    highlight: "Best for early pilots",
    features: [
      "Up to 25,000 RCS conversations",
      "1 sender profile + basic campaign flows",
      "Template library + delivery reporting",
    ],
  },
  {
    key: "growth",
    title: "RCS Growth",
    price: "INR 7,499 / month",
    highlight: "Best for scaling teams",
    features: [
      "Up to 150,000 RCS conversations",
      "Multi-journey automation + agent inbox",
      "Advanced analytics and conversion tracking",
    ],
    popular: true,
  },
  {
    key: "enterprise",
    title: "RCS Enterprise",
    price: "Custom",
    highlight: "Best for large-scale rollouts",
    features: [
      "High-volume throughput with priority routing",
      "Custom SLAs, dedicated onboarding support",
      "Compliance controls and enterprise governance",
    ],
  },
];

export default function RcsSubscriptionPage() {
  return (
    <RcsFeatureShell
      badge="RCS Subscription"
      title="RCS Service Plans"
      subtitle="Pricing UI is ready. Backend billing and checkout wiring can be connected in next step."
      statusLabel="Checkout Stage"
      statusValue="UI Scaffolded"
      actions={[
        { label: "Back to RCS Hub", href: "/dashboard/rcs" },
        { label: "See Global Billing", href: "/dashboard/billing" },
        { label: "Campaign Studio", href: "/dashboard/rcs/campaigns" },
        { label: "Analytics View", href: "/dashboard/rcs/analytics" },
      ]}
    >
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {plans.map((plan) => (
          <article
            key={plan.key}
            className={`relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm ${
              plan.popular ? "border-sky-300 shadow-sky-100" : "border-sky-100"
            }`}
          >
            {plan.popular ? (
              <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-sky-600 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                <Crown className="h-3 w-3" />
                Popular
              </span>
            ) : null}

            <h3 className="text-lg font-semibold text-slate-900">{plan.title}</h3>
            <p className="mt-1 text-xs text-slate-500">{plan.highlight}</p>

            <p className="mt-4 text-3xl font-bold text-slate-900">{plan.price}</p>
            <p className="mt-1 text-xs text-slate-500">Taxes as applicable</p>

            <ul className="mt-4 space-y-1.5">
              {plan.features.map((feature) => (
                <li key={feature} className="inline-flex w-full items-start gap-2 text-xs text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-sky-600" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sky-300 bg-sky-50 px-3 py-2.5 text-sm font-semibold text-sky-800"
            >
              <CreditCard className="h-4 w-4" />
              Connect Checkout Later
            </button>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Sparkles className="h-4 w-4 text-sky-700" />
            Next: backend billing integration
          </p>
          <Link
            href="/dashboard/billing"
            className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800 hover:bg-sky-100"
          >
            Open Billing Workspace
          </Link>
        </div>
      </section>
    </RcsFeatureShell>
  );
}
