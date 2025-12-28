"use client";

import { Mail, CheckCircle, Clock, XCircle } from "lucide-react";

type MailboxStatus = "active" | "pending" | "inactive";

interface MailboxOverviewProps {
  mailbox: {
    email?: string | null;
    status?: string | null;
    createdAt?: string | null;
  } | null;
}

export default function MailboxOverview({ mailbox }: MailboxOverviewProps) {
  // ✅ Safe empty state
  if (!mailbox || !mailbox.email) {
    return (
      <div className="rounded-xl border p-5 bg-white">
        <h3 className="font-semibold text-lg mb-2">Mailbox Overview</h3>
        <p className="text-sm text-gray-500">
          No mailbox created for this tenant yet.
        </p>
      </div>
    );
  }

  // ✅ Normalize status (backend safety)
  const normalizedStatus: MailboxStatus =
    mailbox.status?.toLowerCase() === "active"
      ? "active"
      : mailbox.status?.toLowerCase() === "pending"
      ? "pending"
      : "inactive";

  // ✅ Status config (never undefined)
  const statusConfig: Record<
    MailboxStatus,
    { label: string; color: string; icon: JSX.Element }
  > = {
    active: {
      label: "Active",
      color: "text-green-600 bg-green-100",
      icon: <CheckCircle size={16} />,
    },
    pending: {
      label: "Pending",
      color: "text-yellow-600 bg-yellow-100",
      icon: <Clock size={16} />,
    },
    inactive: {
      label: "Inactive",
      color: "text-red-600 bg-red-100",
      icon: <XCircle size={16} />,
    },
  };

  const status = statusConfig[normalizedStatus];

  return (
    <div className="rounded-xl border p-5 bg-white">
      <h3 className="font-semibold text-lg mb-4">Mailbox Overview</h3>

      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-2">
          <Mail size={16} className="text-gray-500" />
          <span className="font-medium">Email:</span>
          <span>{mailbox.email}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-medium">Status:</span>
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}
          >
            {status.icon}
            {status.label}
          </span>
        </div>

        {mailbox.createdAt && (
          <div>
            <span className="font-medium">Created:</span>{" "}
            {new Date(mailbox.createdAt).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
}
