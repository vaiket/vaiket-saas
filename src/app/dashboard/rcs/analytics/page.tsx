import { BarChart3, Gauge, MousePointerClick, TrendingUp } from "lucide-react";

import RcsFeatureShell from "@/components/rcs/RcsFeatureShell";

const analyticsCards = [
  {
    title: "Delivery Analytics",
    description: "Track sent, delivered, read and failure trends by campaign.",
    icon: Gauge,
  },
  {
    title: "Engagement Analytics",
    description: "Measure replies, click-through and rich interaction events.",
    icon: MousePointerClick,
  },
  {
    title: "Conversion Funnel",
    description: "Analyze message-to-action drop-off and optimization opportunities.",
    icon: TrendingUp,
  },
  {
    title: "Executive Reporting",
    description: "Summarize growth and ROI metrics for leadership snapshots.",
    icon: BarChart3,
  },
];

export default function RcsAnalyticsPage() {
  return (
    <RcsFeatureShell
      badge="RCS Analytics"
      title="Performance & Conversion Intelligence"
      subtitle="Monitor message health and optimize journeys using conversion-driven reporting."
      actions={[
        { label: "Back to RCS Hub", href: "/dashboard/rcs" },
        { label: "Open Campaigns", href: "/dashboard/rcs/campaigns" },
        { label: "Open Workflows", href: "/dashboard/rcs/workflows" },
        { label: "Plan & Billing", href: "/dashboard/rcs/subscription" },
      ]}
    >
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {analyticsCards.map((card) => {
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
