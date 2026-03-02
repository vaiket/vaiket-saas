import { Blocks, Database, ImagePlus, ShieldCheck } from "lucide-react";

import RcsFeatureShell from "@/components/rcs/RcsFeatureShell";

const templateCards = [
  {
    title: "Template Collections",
    description: "Organize onboarding, promotional and service template packs.",
    icon: Database,
  },
  {
    title: "Rich Asset Blocks",
    description: "Prepare media cards, CTA buttons and quick reply sets.",
    icon: ImagePlus,
  },
  {
    title: "Reusable Snippets",
    description: "Save high-performing copy blocks for fast campaign assembly.",
    icon: Blocks,
  },
  {
    title: "Approval Workflow",
    description: "Review templates for compliance and brand safety before publish.",
    icon: ShieldCheck,
  },
];

export default function RcsTemplatesPage() {
  return (
    <RcsFeatureShell
      badge="RCS Templates"
      title="Rich Message Template Library"
      subtitle="Build reusable high-performing message assets for campaigns and automations."
      actions={[
        { label: "Back to RCS Hub", href: "/dashboard/rcs" },
        { label: "Launch Campaign", href: "/dashboard/rcs/campaigns" },
        { label: "Workflow Engine", href: "/dashboard/rcs/workflows" },
        { label: "View Analytics", href: "/dashboard/rcs/analytics" },
      ]}
    >
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {templateCards.map((card) => {
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
