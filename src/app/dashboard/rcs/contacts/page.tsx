import { Filter, ShieldCheck, Tags, Users } from "lucide-react";

import RcsFeatureShell from "@/components/rcs/RcsFeatureShell";

const contactCards = [
  {
    title: "Audience Segments",
    description: "Create dynamic cohorts by lifecycle stage, geography and behavior.",
    icon: Users,
  },
  {
    title: "Consent Controls",
    description: "Track explicit opt-in/out status for compliant RCS messaging.",
    icon: ShieldCheck,
  },
  {
    title: "Tagging Layer",
    description: "Apply intent and engagement tags to power campaign targeting.",
    icon: Tags,
  },
  {
    title: "Smart Filters",
    description: "Filter audiences instantly for growth and retention playbooks.",
    icon: Filter,
  },
];

export default function RcsContactsPage() {
  return (
    <RcsFeatureShell
      badge="RCS Contacts"
      title="Contact Intelligence Workspace"
      subtitle="Prepare clean, opted-in segments for high-deliverability conversational campaigns."
      actions={[
        { label: "Back to RCS Hub", href: "/dashboard/rcs" },
        { label: "Open Campaigns", href: "/dashboard/rcs/campaigns" },
        { label: "Workflow Engine", href: "/dashboard/rcs/workflows" },
        { label: "Message Inbox", href: "/dashboard/rcs/inbox" },
      ]}
    >
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {contactCards.map((card) => {
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
