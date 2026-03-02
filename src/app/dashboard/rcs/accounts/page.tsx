import { ShieldCheck, Smartphone, UserCheck, Webhook } from "lucide-react";

import RcsFeatureShell from "@/components/rcs/RcsFeatureShell";

const accountCards = [
  {
    title: "Sender Onboarding",
    description: "Provision agent IDs, brand profiles and sender capabilities.",
    icon: Smartphone,
  },
  {
    title: "Verification Layer",
    description: "Run KYC and brand verification steps before production traffic.",
    icon: ShieldCheck,
  },
  {
    title: "Operator Routing",
    description: "Map carriers/operators and fallback strategy for delivery assurance.",
    icon: Webhook,
  },
  {
    title: "Access & Roles",
    description: "Control account-level permissions for ops, marketing and support teams.",
    icon: UserCheck,
  },
];

export default function RcsAccountsPage() {
  return (
    <RcsFeatureShell
      badge="RCS Accounts"
      title="RCS Account & Sender Management"
      subtitle="Configure and verify sender infrastructure before enabling live campaigns."
      actions={[
        { label: "Go to Overview", href: "/dashboard/rcs" },
        { label: "Plan & Pricing", href: "/dashboard/rcs/subscription" },
        { label: "Build Campaign", href: "/dashboard/rcs/campaigns" },
        { label: "View Analytics", href: "/dashboard/rcs/analytics" },
      ]}
    >
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {accountCards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.title} className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
              <div className="inline-flex rounded-lg bg-sky-100 p-2 text-sky-700">
                <Icon className="h-4 w-4" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-slate-900">{card.title}</h3>
              <p className="mt-1 text-xs text-slate-600">{card.description}</p>
            </article>
          );
        })}
      </section>
    </RcsFeatureShell>
  );
}
