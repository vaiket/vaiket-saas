import { Bot, GitBranch, ShieldCheck, Timer } from "lucide-react";

import RcsFeatureShell from "@/components/rcs/RcsFeatureShell";

const workflowCards = [
  {
    title: "Journey Designer",
    description: "Create event-driven automations from contact behavior and triggers.",
    icon: GitBranch,
  },
  {
    title: "AI Response Layer",
    description: "Inject dynamic response logic with safety and brand tone checks.",
    icon: Bot,
  },
  {
    title: "Timing Controls",
    description: "Set quiet hours, retry windows and escalation wait states.",
    icon: Timer,
  },
  {
    title: "Governance",
    description: "Apply review and approval gates before workflow activation.",
    icon: ShieldCheck,
  },
];

export default function RcsWorkflowsPage() {
  return (
    <RcsFeatureShell
      badge="RCS Workflows"
      title="Automation & Journey Engine"
      subtitle="Build rule-based and AI-assisted journeys for lifecycle messaging at scale."
      actions={[
        { label: "Back to RCS Hub", href: "/dashboard/rcs" },
        { label: "Open Campaigns", href: "/dashboard/rcs/campaigns" },
        { label: "Open Inbox", href: "/dashboard/rcs/inbox" },
        { label: "Performance Metrics", href: "/dashboard/rcs/analytics" },
      ]}
    >
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {workflowCards.map((card) => {
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
