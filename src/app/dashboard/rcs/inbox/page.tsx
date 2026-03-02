import { Bell, MessageSquare, ShieldCheck, UserRound } from "lucide-react";

import RcsFeatureShell from "@/components/rcs/RcsFeatureShell";

const inboxCards = [
  {
    title: "Conversation Stream",
    description: "Unified thread view for inbound and outbound RCS interactions.",
    icon: MessageSquare,
  },
  {
    title: "Agent Assignment",
    description: "Route high-intent conversations to support and sales queues.",
    icon: UserRound,
  },
  {
    title: "Priority Alerts",
    description: "Highlight conversations with SLA risk or conversion opportunity.",
    icon: Bell,
  },
  {
    title: "Compliance Guard",
    description: "Apply tone and policy checks before manual outbound replies.",
    icon: ShieldCheck,
  },
];

export default function RcsInboxPage() {
  return (
    <RcsFeatureShell
      badge="RCS Inbox"
      title="Conversational Inbox Operations"
      subtitle="Manage customer conversations with assignment, priority and response quality controls."
      actions={[
        { label: "Back to RCS Hub", href: "/dashboard/rcs" },
        { label: "Contact Segments", href: "/dashboard/rcs/contacts" },
        { label: "Automation Rules", href: "/dashboard/rcs/workflows" },
        { label: "Performance View", href: "/dashboard/rcs/analytics" },
      ]}
    >
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {inboxCards.map((card) => {
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
