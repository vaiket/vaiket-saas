"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  Bot,
  Building2,
  ChevronRight,
  CreditCard,
  Mail,
  PlugZap,
  ShieldCheck,
  Users,
} from "lucide-react";

type Status = "Live" | "Ready" | "Planned";

type SettingCard = {
  title: string;
  description: string;
  href: string;
  status: Status;
  icon: React.ReactNode;
};

const statusStyles: Record<Status, string> = {
  Live: "bg-green-100 text-green-700 border-green-200",
  Ready: "bg-blue-100 text-blue-700 border-blue-200",
  Planned: "bg-gray-100 text-gray-700 border-gray-200",
};

const cards: SettingCard[] = [
  {
    title: "Tenant Profile",
    description: "Company details, timezone, website, and invoice profile.",
    href: "/dashboard/settings/company",
    status: "Ready",
    icon: <Building2 className="h-5 w-5" />,
  },
  {
    title: "Mail Settings",
    description: "Mailbox overview, IMAP/SMTP config, and DNS records.",
    href: "/dashboard/settings/mail",
    status: "Live",
    icon: <Mail className="h-5 w-5" />,
  },
  {
    title: "AI Settings",
    description: "Provider, model, tone, and automation defaults.",
    href: "/dashboard/settings/ai",
    status: "Ready",
    icon: <Bot className="h-5 w-5" />,
  },
  {
    title: "Billing and Plan",
    description: "Current plan, invoices, renewals, and payment history.",
    href: "/dashboard/settings/billing",
    status: "Live",
    icon: <CreditCard className="h-5 w-5" />,
  },
  {
    title: "Team and Security",
    description: "Member roles, access controls, and session security.",
    href: "/dashboard/settings/team-security",
    status: "Ready",
    icon: <Users className="h-5 w-5" />,
  },
  {
    title: "Integrations and Keys",
    description: "Google, SMTP providers, webhook endpoints, and API keys.",
    href: "/dashboard/settings/integrations",
    status: "Planned",
    icon: <PlugZap className="h-5 w-5" />,
  },
  {
    title: "Notifications",
    description: "Live workspace alerts for signup, join, invite, and message actions.",
    href: "/dashboard/settings/notifications",
    status: "Live",
    icon: <Bell className="h-5 w-5" />,
  },
  {
    title: "Danger Zone",
    description: "High-impact actions like tenant disable and data export.",
    href: "/dashboard/settings/danger-zone",
    status: "Ready",
    icon: <AlertTriangle className="h-5 w-5" />,
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-white p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tenant Settings</h1>
            <p className="mt-1 text-sm text-gray-600">
              Configure workspace-level controls for billing, mail, AI, and
              team access.
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="rounded-lg bg-gray-100 p-2 text-gray-700 group-hover:bg-blue-100 group-hover:text-blue-700">
                {card.icon}
              </div>
              <span
                className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusStyles[card.status]}`}
              >
                {card.status}
              </span>
            </div>

            <h2 className="text-base font-semibold text-gray-900">{card.title}</h2>
            <p className="mt-1 text-sm text-gray-600">{card.description}</p>

            <div className="mt-4 flex items-center text-sm font-medium text-blue-700">
              Open
              <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
