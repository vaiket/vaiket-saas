"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import StatusDot from "./StatusDot";

export interface DNSRecord {
  status: "pending" | "success" | "fail" | "warning";
  type?: string;
  host?: string;
  value?: string;
}

interface Props {
  label: string;
  status: "pending" | "success" | "fail" | "warning";
  record?: DNSRecord;
}

export default function DNSFixRow({ label, status, record }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const canFix = status !== "success" && record?.value;

  const copyValue = async () => {
    if (!record?.value) return;
    await navigator.clipboard.writeText(record.value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="border rounded-xl p-4 bg-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StatusDot status={status} />
          <span className="font-medium">{label}</span>
        </div>

        {canFix && (
          <button
            onClick={() => setOpen(!open)}
            className="text-sm text-blue-600 flex items-center gap-1"
          >
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            Fix
          </button>
        )}
      </div>

      {open && record && (
        <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <p className="text-xs text-gray-500">Type</p>
              <code className="block bg-white p-2 rounded">
                {record.type || "TXT"}
              </code>
            </div>
            <div>
              <p className="text-xs text-gray-500">Host</p>
              <code className="block bg-white p-2 rounded">
                {record.host || "@"}
              </code>
            </div>
            <div>
              <p className="text-xs text-gray-500">Value</p>
              <code className="block bg-white p-2 rounded break-all">
                {record.value}
              </code>
            </div>
          </div>

          <button
            onClick={copyValue}
            className="flex items-center gap-1 text-xs text-blue-600"
          >
            {copied ? (
              <Check size={14} />
            ) : (
              <Copy size={14} />
            )}
            {copied ? "Copied" : "Copy value"}
          </button>
        </div>
      )}
    </div>
  );
}
