import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Vaiket privacy policy.",
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
            <Link href="/privacy" className="font-semibold text-slate-900">
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

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" subtitle="Last updated: March 4, 2026">
      <Section title="1. Overview">
        <p>
          This policy explains how Vaiket Bridge ("we", "us") collects, uses, and shares information when you use our
          website and services (the "Service").
        </p>
      </Section>

      <Section title="2. Information We Collect">
        <ul className="list-disc space-y-1 pl-6">
          <li>Account info: name, email, password (hashed), workspace/tenant details.</li>
          <li>Messaging data: WhatsApp inbox metadata and message content you send/receive through the Service.</li>
          <li>Email data: mailbox credentials or OAuth tokens (if you connect email accounts) and message metadata.</li>
          <li>Usage data: logs, device/browser data, and basic analytics for security and performance.</li>
          <li>Billing data: subscription status, invoices/receipts, and payment references from payment providers.</li>
        </ul>
      </Section>

      <Section title="3. How We Use Information">
        <ul className="list-disc space-y-1 pl-6">
          <li>Provide and operate the Service (inbox, messaging, automation, billing).</li>
          <li>Authenticate users and secure accounts (sessions, fraud prevention, abuse detection).</li>
          <li>Support, troubleshooting, and product improvements.</li>
          <li>Comply with legal obligations and enforce our terms.</li>
        </ul>
      </Section>

      <Section title="4. How We Share Information">
        <p>We may share data with service providers to operate the Service, such as:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Meta/WhatsApp APIs (to deliver WhatsApp messages and receive webhook events).</li>
          <li>Email providers and SMTP/IMAP services (to send/receive emails you configure).</li>
          <li>Payment gateways (to process subscriptions and payments).</li>
          <li>Infrastructure providers (hosting, storage, logging, monitoring).</li>
        </ul>
        <p>We may also share information if required by law or to protect the Service and users.</p>
      </Section>

      <Section title="5. Data Retention">
        <p>
          We keep data as long as needed to provide the Service and comply with legal obligations. You can request
          deletion as described in our data deletion instructions.
        </p>
      </Section>

      <Section title="6. Security">
        <p>
          We use reasonable security measures to protect data. No method of transmission or storage is 100% secure, so we
          cannot guarantee absolute security.
        </p>
      </Section>

      <Section title="7. Your Choices">
        <ul className="list-disc space-y-1 pl-6">
          <li>Update workspace/profile information in your dashboard.</li>
          <li>Disconnect integrations you no longer want to use.</li>
          <li>Request data deletion via our data deletion page.</li>
        </ul>
      </Section>

      <Section title="8. Contact">
        <p>
          If you have questions about this policy, contact{" "}
          <a className="font-semibold text-slate-700 hover:text-slate-900" href="mailto:support@vaiket.com">
            support@vaiket.com
          </a>
          .
        </p>
      </Section>
    </LegalShell>
  );
}
