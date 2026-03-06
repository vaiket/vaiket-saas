"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, MessageCircleMore, RefreshCcw } from "lucide-react";

type ClientProfilePayload = {
  success: boolean;
  client?: {
    id: string;
    name: string;
    phoneNumber: string | null;
    email: string | null;
    company: string | null;
    address: string | null;
    tags: string[];
  };
  timeline?: Array<{
    id: string;
    action: string;
    description: string | null;
    createdAt: string;
  }>;
  whatsapp?: {
    conversationCount: number;
    messages: Array<{
      id: string;
      direction: string;
      text: string | null;
      createdAt: string;
    }>;
  };
  error?: string;
};

async function readJsonSafe(res: Response) {
  const raw = await res.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export default function CrmClientProfilePage({ params }: { params: Promise<{ clientId: string }> }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState<ClientProfilePayload | null>(null);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      const resolved = await params;
      if (!mounted) return;
      const res = await fetch(`/api/crm/clients/${encodeURIComponent(resolved.clientId)}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await readJsonSafe(res)) as ClientProfilePayload;
      if (!mounted) return;
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to load client profile");
      } else {
        setPayload(data);
      }
      setLoading(false);
    };
    void run();
    return () => {
      mounted = false;
    };
  }, [params]);

  if (loading) {
    return (
      <div className="p-6 text-sm text-slate-600">
        <RefreshCcw className="mr-2 inline h-4 w-4 animate-spin" />
        Loading client profile...
      </div>
    );
  }

  if (error || !payload?.client) {
    return (
      <div className="space-y-3 p-6">
        <Link href="/dashboard/crm/clients" className="inline-flex items-center text-sm font-semibold text-indigo-600">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to clients
        </Link>
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error || "Client profile unavailable."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/dashboard/crm/clients" className="inline-flex items-center text-sm font-semibold text-indigo-600">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to clients
        </Link>
        <Link href="/dashboard/whatsapp/inbox" className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
          <MessageCircleMore className="mr-1 h-3.5 w-3.5" />
          Open WhatsApp Inbox
        </Link>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">{payload.client.name}</h1>
        <p className="mt-1 text-sm text-slate-600">{payload.client.phoneNumber || payload.client.email || "No primary contact"}</p>
        <p className="text-sm text-slate-500">{payload.client.company || "No company"}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {payload.client.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">{tag}</span>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-base font-semibold text-slate-900">Activity timeline</h2>
          <div className="space-y-2">
            {(payload.timeline || []).map((row) => (
              <div key={row.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-sm font-medium text-slate-900">{row.description || row.action}</p>
                <p className="text-xs text-slate-500">{new Date(row.createdAt).toLocaleString()}</p>
              </div>
            ))}
            {!payload.timeline?.length && <p className="text-sm text-slate-500">No timeline events yet.</p>}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-base font-semibold text-slate-900">WhatsApp conversation history</h2>
          <p className="mb-3 text-xs text-slate-500">Conversations: {payload.whatsapp?.conversationCount || 0}</p>
          <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
            {(payload.whatsapp?.messages || []).map((message) => (
              <div
                key={message.id}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  message.direction === "outbound"
                    ? "ml-auto bg-emerald-100 text-emerald-900"
                    : "bg-slate-100 text-slate-800"
                }`}
              >
                <p>{message.text || "[media message]"}</p>
                <p className="mt-1 text-[11px] opacity-70">{new Date(message.createdAt).toLocaleString()}</p>
              </div>
            ))}
            {!payload.whatsapp?.messages?.length && <p className="text-sm text-slate-500">No WhatsApp messages linked with this client.</p>}
          </div>
        </article>
      </section>
    </div>
  );
}
