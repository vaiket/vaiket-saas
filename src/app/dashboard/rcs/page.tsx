import Link from "next/link";
import type { ComponentType } from "react";
import {
  ArrowUpRight,
  BarChart3,
  Bot,
  CheckCheck,
  CreditCard,
  Database,
  Inbox,
  MessageSquare,
  SendHorizontal,
  ShieldCheck,
  Smartphone,
  Users,
} from "lucide-react";

type ModuleItem = {
  title: string;
  description: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  badge: string;
};

const MODULE_ITEMS: ModuleItem[] = [
  {
    title: "RCS Accounts",
    description: "Connect sender IDs, manage verification and keep account health in check.",
    href: "/dashboard/rcs/accounts",
    icon: Smartphone,
    badge: "Core",
  },
  {
    title: "Contacts",
    description: "Organize opted-in contacts and audience groups for targeted messaging.",
    href: "/dashboard/rcs/contacts",
    icon: Users,
    badge: "CRM",
  },
  {
    title: "Inbox",
    description: "Handle inbound RCS conversations with reply workflows and agent ownership.",
    href: "/dashboard/rcs/inbox",
    icon: MessageSquare,
    badge: "Support",
  },
  {
    title: "Campaigns",
    description: "Run rich-card campaigns using media, CTA buttons and segmentation controls.",
    href: "/dashboard/rcs/campaigns",
    icon: SendHorizontal,
    badge: "Growth",
  },
  {
    title: "Workflows",
    description: "Design trigger-action journeys for onboarding, reminders and nurture flows.",
    href: "/dashboard/rcs/workflows",
    icon: Bot,
    badge: "Automation",
  },
  {
    title: "Templates",
    description: "Create reusable RCS template blocks for high-conversion message journeys.",
    href: "/dashboard/rcs/templates",
    icon: Database,
    badge: "Content",
  },
  {
    title: "Analytics",
    description: "Track delivery, read, click and conversion metrics across campaigns.",
    href: "/dashboard/rcs/analytics",
    icon: BarChart3,
    badge: "Insights",
  },
  {
    title: "Subscription",
    description: "Manage RCS plan tiers, messaging capacity and billing controls.",
    href: "/dashboard/rcs/subscription",
    icon: CreditCard,
    badge: "Billing",
  },
];

const KPI_CARDS = [
  {
    label: "Projected Reach",
    value: "125K / day",
    hint: "Estimated recipient capacity for your first production rollout.",
    icon: SendHorizontal,
  },
  {
    label: "Expected Read Rate",
    value: "72%",
    hint: "Benchmark for verified business messages with media-rich cards.",
    icon: CheckCheck,
  },
  {
    label: "Rich Message Types",
    value: "11",
    hint: "Cards, carousels, buttons, suggested replies and branded assets.",
    icon: Inbox,
  },
  {
    label: "Conversion Lift",
    value: "+28%",
    hint: "Typical click-to-action uplift vs plain text channels.",
    icon: ShieldCheck,
  },
];

const ROLLOUT_STEPS = [
  "Finalize account onboarding and sender verification",
  "Configure contact opt-in capture and compliance checks",
  "Design template library with brand-safe visual tone",
  "Launch pilot campaigns with delivery + read tracking",
  "Promote to full automation workflows and scale controls",
];

export default function RcsHubOverviewPage() {
  return (
    <div className="mx-auto w-full max-w-[1700px] space-y-5">
      <section className="relative overflow-hidden rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-indigo-50 px-5 py-6 shadow-sm md:px-7 md:py-7">
        <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-sky-200/55 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-indigo-100/60 blur-3xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
              <ShieldCheck className="h-3.5 w-3.5" />
              RCS Business Messaging Suite
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-slate-900 md:text-4xl">
              RCS Hub Command Center
            </h1>
            <p className="mt-2 text-sm text-slate-600 md:text-base">
              Build, launch and optimize interactive RCS experiences with premium messaging,
              automation and conversion analytics from one workspace.
            </p>
          </div>

          <div className="w-full max-w-[360px] rounded-2xl border border-sky-200 bg-white/95 p-4 shadow-sm">
            <p className="text-[11px] uppercase tracking-wide text-sky-700">Launch State</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">UI Ready for Integration</p>
            <p className="mt-2 text-xs text-slate-600">
              Backend connectors can be wired in the next phase without redesigning pages.
            </p>
            <Link
              href="/dashboard/rcs/accounts"
              className="mt-4 inline-flex items-center gap-1 rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800 hover:bg-sky-100"
            >
              Start With Accounts
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPI_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-wide text-sky-700">{card.label}</p>
                <Icon className="h-4 w-4 text-sky-700" />
              </div>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{card.value}</p>
              <p className="mt-1 text-xs text-slate-600">{card.hint}</p>
            </article>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <article className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm xl:col-span-2">
          <p className="text-sm font-semibold text-slate-900">RCS Feature Modules</p>
          <p className="mt-1 text-xs text-slate-500">
            Explore each workspace module. APIs can be plugged in route-by-route.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {MODULE_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className="group rounded-xl border border-sky-100 bg-sky-50/60 p-3 transition hover:-translate-y-0.5 hover:border-sky-300 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="inline-flex rounded-lg bg-sky-100 p-2 text-sky-700 transition group-hover:bg-sky-200">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="rounded-full bg-sky-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-700">
                      {item.badge}
                    </span>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-1 text-xs text-slate-600">{item.description}</p>
                </Link>
              );
            })}
          </div>
        </article>

        <article className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Rollout Blueprint</p>
          <p className="mt-1 text-xs text-slate-500">
            Recommended sequence for smooth go-live and strong early conversion.
          </p>
          <ol className="mt-4 space-y-2">
            {ROLLOUT_STEPS.map((step, index) => (
              <li key={step} className="flex items-start gap-2 rounded-xl border border-sky-100 bg-sky-50 p-2.5">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-600 text-[11px] font-semibold text-white">
                  {index + 1}
                </span>
                <span className="text-xs text-slate-700">{step}</span>
              </li>
            ))}
          </ol>
        </article>
      </section>
    </div>
  );
}
