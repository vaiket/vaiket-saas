import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Clock3, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

type QuickAction = {
  label: string;
  href: string;
};

type RcsFeatureShellProps = {
  badge: string;
  title: string;
  subtitle: string;
  statusLabel?: string;
  statusValue?: string;
  actions?: QuickAction[];
  children?: ReactNode;
};

export default function RcsFeatureShell({
  badge,
  title,
  subtitle,
  statusLabel = "Integration Status",
  statusValue = "UI Ready",
  actions = [],
  children,
}: RcsFeatureShellProps) {
  return (
    <div className="mx-auto w-full max-w-[1700px] space-y-5">
      <section className="relative overflow-hidden rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-blue-50 px-5 py-6 shadow-sm md:px-7 md:py-7">
        <div className="pointer-events-none absolute -right-14 -top-20 h-64 w-64 rounded-full bg-sky-200/50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-blue-100/55 blur-3xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
              <Sparkles className="h-3.5 w-3.5" />
              {badge}
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-slate-900 md:text-4xl">{title}</h1>
            <p className="mt-2 text-sm text-slate-600 md:text-base">{subtitle}</p>
          </div>

          <div className="w-full max-w-[380px] space-y-2 rounded-2xl border border-sky-200 bg-white/90 p-4 shadow-sm">
            <div className="flex items-center justify-between rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-xs">
              <span className="font-medium text-slate-600">{statusLabel}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {statusValue}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-sky-100 bg-white px-3 py-2 text-xs">
              <span className="font-medium text-slate-600">Backend Hookup</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700">
                <Clock3 className="h-3.5 w-3.5" />
                Pending
              </span>
            </div>
          </div>
        </div>
      </section>

      {actions.length > 0 ? (
        <section className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {actions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="inline-flex items-center justify-between rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-800 transition hover:bg-sky-100"
              >
                {action.label}
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {children}
    </div>
  );
}
