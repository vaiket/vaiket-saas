import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Vaiket terms of service.",
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
            <Link href="/terms" className="font-semibold text-slate-900">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-slate-900">
              Privacy
            </Link>
            <Link href="/data-deletion" className="hover:text-slate-900">
              Data deletion
            </Link>
          </nav>
        </header>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm sm:p-10">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{props.title}</h1>
          <p className="mt-2 text-sm text-slate-600">{props.subtitle}</p>

          <div className="mt-8 space-y-7 text-sm leading-6 text-slate-700">{props.children}</div>
        </section>

        <footer className="mt-6 text-xs text-slate-500">
          <p>
            Questions? Email{" "}
            <a className="font-semibold text-slate-700 hover:text-slate-900" href="mailto:support@vaiket.com">
              support@vaiket.com
            </a>
            .
          </p>
        </footer>
      </div>
    </main>
  );
}

function Section(props: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-slate-900">{props.title}</h2>
      <div className="space-y-2">{props.children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" subtitle="Last updated: March 4, 2026">
      <Section title="1. Agreement">
        <p>
          These Terms of Service govern your use of Vaiket Bridge (the "Service"). By creating an account or using the
          Service, you agree to these terms.
        </p>
      </Section>

      <Section title="2. Accounts and Access">
        <p>
          You are responsible for maintaining the confidentiality of your account credentials and for all activity under
          your account. You must provide accurate information and keep it up to date.
        </p>
      </Section>

      <Section title="3. Acceptable Use">
        <p>You agree not to use the Service to:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Send spam, scam, or unlawful messages or emails.</li>
          <li>Infringe intellectual property, privacy, or other rights of others.</li>
          <li>Upload malicious code or attempt to disrupt or abuse the Service.</li>
          <li>Bypass rate limits, authentication, or security controls.</li>
        </ul>
        <p>
          When using WhatsApp Business APIs, you must comply with WhatsApp policies, including user consent/opt-in and
          template rules.
        </p>
      </Section>

      <Section title="4. Third-Party Services">
        <p>
          The Service may integrate with third-party providers (for example, Meta/WhatsApp, Google, email providers, and
          payment gateways). Your use of those services is governed by their terms and policies.
        </p>
      </Section>

      <Section title="5. Subscriptions and Payments">
        <p>
          Some features require a paid subscription. Pricing, billing cycles, refunds, and trials (if offered) are shown
          at purchase time and may vary by plan.
        </p>
      </Section>

      <Section title="6. Data and Content">
        <p>
          You retain ownership of your content. You grant us permission to process your content only as needed to provide
          the Service (for example, delivering messages, storing inbox history, and generating invoices).
        </p>
      </Section>

      <Section title="7. Service Availability and Changes">
        <p>
          We may modify, suspend, or discontinue parts of the Service. We aim for high availability but do not guarantee
          uninterrupted operation.
        </p>
      </Section>

      <Section title="8. Disclaimer">
        <p>
          The Service is provided "as is" without warranties of any kind. We do not provide legal, financial, or
          compliance advice.
        </p>
      </Section>

      <Section title="9. Limitation of Liability">
        <p>
          To the maximum extent permitted by law, Vaiket Bridge and its operators will not be liable for indirect,
          incidental, special, consequential, or punitive damages, or for loss of data, revenue, or profits.
        </p>
      </Section>

      <Section title="10. Termination">
        <p>
          You may stop using the Service at any time. We may suspend or terminate access for violations of these terms or
          to protect the Service and users.
        </p>
      </Section>

      <Section title="11. Contact">
        <p>
          For questions about these terms, contact{" "}
          <a className="font-semibold text-slate-700 hover:text-slate-900" href="mailto:support@vaiket.com">
            support@vaiket.com
          </a>
          .
        </p>
      </Section>
    </LegalShell>
  );
}
