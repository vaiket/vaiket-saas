import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Data Deletion Instructions",
  description: "How to request deletion of your Vaiket Bridge data.",
};

function LegalShell(props: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_0%_0%,#d1fae5_0%,#f8fafc_35%,#f8fafc_100%)] px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-4xl">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/login" className="text-sm font-semibold tracking-tight text-slate-900">
            Vaiket Bridge
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
            <Link href="/terms" className="hover:text-slate-900">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-slate-900">
              Privacy
            </Link>
            <Link href="/data-deletion" className="font-semibold text-slate-900">
              Data deletion
            </Link>
          </nav>
        </header>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm sm:p-10">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{props.title}</h1>
          <p className="mt-2 text-sm text-slate-600">{props.subtitle}</p>

          <div className="mt-8 space-y-6 text-sm leading-6 text-slate-700">{props.children}</div>
        </section>

        <footer className="mt-6 text-xs text-slate-500">
          <p>
            Support email:{" "}
            <a className="font-semibold text-slate-700 hover:text-slate-900" href="mailto:support@vaiket.com">
              support@vaiket.com
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}

export default function DataDeletionPage() {
  return (
    <LegalShell title="Data Deletion Instructions" subtitle="Last updated: March 4, 2026">
      <p>
        You can request deletion of your Vaiket Bridge account and associated workspace data by emailing{" "}
        <a className="font-semibold text-slate-700 hover:text-slate-900" href="mailto:support@vaiket.com">
          support@vaiket.com
        </a>
        .
      </p>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="font-semibold text-slate-900">Include the following in your request:</p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>Your account email used to sign in</li>
          <li>Your workspace/tenant name (if known)</li>
          <li>Whether you want full deletion or only disconnect specific integrations</li>
        </ul>
      </div>

      <p>
        We may ask you to verify ownership of the account before processing deletion. After verification, we will delete
        or anonymize data where applicable, subject to legal retention requirements (for example, billing records).
      </p>
    </LegalShell>
  );
}
