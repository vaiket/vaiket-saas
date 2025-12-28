"use client";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-600">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

interface ImapSmtpCardProps {
  config: {
    email: string;
    imapHost: string;
    imapPort: number;
    imapSecure: boolean;
    smtpHost: string;
    smtpPort: number;
    smtpSecure: boolean;
    active: boolean;
  } | null;
}

export default function ImapSmtpCard({ config }: ImapSmtpCardProps) {
  if (!config) {
    return (
      <div className="border rounded-lg p-5 bg-white">
        <h2 className="font-medium mb-3">IMAP / SMTP Settings</h2>
        <p className="text-sm text-gray-500">
          Mailbox configuration not available.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-5 bg-white">
      <h2 className="font-medium mb-3">IMAP / SMTP Settings</h2>

      <div className="space-y-2">
        <Row label="IMAP Server" value={config.imapHost} />
        <Row
          label="IMAP Port"
          value={`${config.imapPort} (${config.imapSecure ? "SSL" : "Plain"})`}
        />
        <Row label="SMTP Server" value={config.smtpHost} />
        <Row
          label="SMTP Port"
          value={`${config.smtpPort} (${config.smtpSecure ? "TLS" : "Plain"})`}
        />
        <Row label="Username" value={config.email} />
      </div>

      {!config.active && (
        <p className="text-xs text-yellow-600 mt-3">
          ⚠️ Mailbox is inactive. Sending/receiving may not work.
        </p>
      )}

      <p className="text-xs text-gray-500 mt-3">
        Use these details in Outlook, Thunderbird, or mobile apps.
      </p>
    </div>
  );
}
