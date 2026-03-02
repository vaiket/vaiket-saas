import { Goal, ImagePlus, SendHorizontal, Users } from "lucide-react";

import RcsFeatureShell from "@/components/rcs/RcsFeatureShell";

const campaignCards = [
  {
    title: "Audience Targeting",
    description: "Pick segments with opt-in + engagement confidence before blast.",
    icon: Users,
  },
  {
    title: "Rich Message Builder",
    description: "Compose cards, carousels and quick-reply CTA combinations.",
    icon: ImagePlus,
  },
  {
    title: "Launch Controls",
    description: "Schedule, throttle and stage campaigns for safer volume ramp-up.",
    icon: SendHorizontal,
  },
  {
    title: "Conversion Goals",
    description: "Attach revenue actions and measure CTA-driven outcomes.",
    icon: Goal,
  },
];

export default function RcsCampaignsPage() {
  return (
    <RcsFeatureShell
      badge="RCS Campaigns"
      title="High-Conversion Campaign Studio"
      subtitle="Design rich campaign experiences and send with enterprise-grade controls."
      actions={[
        { label: "Back to RCS Hub", href: "/dashboard/rcs" },
        { label: "Template Library", href: "/dashboard/rcs/templates" },
        { label: "Automation Workflows", href: "/dashboard/rcs/workflows" },
        { label: "Campaign Analytics", href: "/dashboard/rcs/analytics" },
      ]}
    >
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {campaignCards.map((card) => {
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
