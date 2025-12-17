"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

// ⚠️ Use your public env vars
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Mailbox = {
  email: string;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  quotaMB: number | null;
  active: boolean | null;
};

export default function MailAccountsPage() {
  const router = useRouter();

  const [mailbox, setMailbox] = useState<Mailbox | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /**
   * Fetch mailbox (RLS-protected)
   */
  useEffect(() => {
    async function fetchMailbox() {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("TenantMailbox")
        .select(
          "email, imapHost, imapPort, imapSecure, smtpHost, smtpPort, smtpSecure, quotaMB, active"
        )
        .single();

      if (error) {
        // No mailbox yet = not an error
        if (error.code !== "PGRST116") {
          setError("Failed to load mail account.");
        }
        setMailbox(null);
      } else {
        setMailbox(data);
      }

      setLoading(false);
    }

    fetchMailbox();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">Loading mail account...</p>
      </div>
    );
  }

  /**
   * EMPTY STATE — No mailbox yet
   */
  if (!mailbox) {
    return (
      <div className="max-w-2xl mx-auto mt-20 text-center border rounded-lg p-10 bg-white">
        <h2 className="text-2xl font-semibold mb-3">
          Email not activated yet
        </h2>
        <p className="text-gray-600 mb-6">
          Activate your professional email to use IMAP & SMTP services.
        </p>

        <button
          onClick={() => router.push("/dashboard/settings/mail")}
          className="px-6 py-3 bg-black text-white rounded-md hover:bg-gray-900 transition"
        >
          Activate Email
        </button>
      </div>
    );
  }

  /**
   * MAILBOX DETAILS VIEW
   */
  return (
    <div className="max-w-3xl mx-auto mt-12 bg-white border rounded-lg p-8">
      <h1 className="text-2xl font-semibold mb-6">Mail Account</h1>

      {/* EMAIL */}
      <div className="mb-6">
        <p className="text-sm text-gray-500 mb-1">Email Address</p>
        <div className="flex items-center justify-between bg-gray-50 border rounded px-4 py-3">
          <span className="font-medium">{mailbox.email}</span>
          <CopyButton value={mailbox.email} />
        </div>
      </div>

      {/* IMAP */}
      <Section title="IMAP Settings">
        <Row label="Server" value={mailbox.imapHost} />
        <Row label="Port" value={mailbox.imapPort.toString()} />
        <Row
          label="Security"
          value={mailbox.imapSecure ? "SSL / TLS" : "None"}
        />
      </Section>

      {/* SMTP */}
      <Section title="SMTP Settings">
        <Row label="Server" value={mailbox.smtpHost} />
        <Row label="Port" value={mailbox.smtpPort.toString()} />
        <Row
          label="Security"
          value={mailbox.smtpSecure ? "SSL / TLS" : "STARTTLS"}
        />
      </Section>

      {/* STATUS */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatusBox
          label="Status"
          value={mailbox.active ? "Active" : "Suspended"}
          active={mailbox.active}
        />
        <StatusBox
          label="Storage"
          value={`${mailbox.quotaMB ?? 1024} MB`}
        />
      </div>
    </div>
  );
}

/**
 * COMPONENTS
 */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <h3 className="font-semibold mb-3">{title}</h3>
      <div className="border rounded-md divide-y bg-gray-50">
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-gray-600">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-medium">{value}</span>
        <CopyButton value={value} />
      </div>
    </div>
  );
}

function StatusBox({
  label,
  value,
  active,
}: {
  label: string;
  value: string;
  active?: boolean | null;
}) {
  return (
    <div className="border rounded-md p-4 bg-gray-50">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p
        className={`font-semibold ${
          active === false ? "text-red-600" : "text-green-600"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  return (
    <button
      onClick={() => navigator.clipboard.writeText(value)}
      className="text-xs px-2 py-1 border rounded hover:bg-gray-100"
      title="Copy"
    >
      Copy
    </button>
  );
}
