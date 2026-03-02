"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type WaContact = {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  address: string | null;
  tags: string[];
  optedIn: boolean;
  lastMessageAt: string | null;
  createdAt: string;
  _count: { conversations: number };
};

type FormState = {
  name: string;
  phone: string;
  email: string;
  address: string;
  tags: string;
  optedIn: boolean;
};

const initialForm: FormState = {
  name: "",
  phone: "",
  email: "",
  address: "",
  tags: "",
  optedIn: true,
};

async function readJsonSafe(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export default function WhatsAppContactsPage() {
  const [contacts, setContacts] = useState<WaContact[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const q = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
      const res = await fetch(`/api/whatsapp/contacts${q}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await readJsonSafe(res);

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load contacts");
      }

      setContacts(data.contacts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setMessage(null);

      const tags = form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      const res = await fetch("/api/whatsapp/contacts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          email: form.email,
          address: form.address,
          tags,
          optedIn: form.optedIn,
        }),
      });
      const data = await readJsonSafe(res);

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save contact");
      }

      setMessage("Contact saved.");
      setForm(initialForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">WhatsApp Contacts</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage opted-in contacts and segmentation tags for campaigns and automation.
            </p>
          </div>
          <Link
            href="/dashboard/whatsapp"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Back to Hub
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Add or Update Contact</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Contact name"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            value={form.phone}
            onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            placeholder="+919999999999"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="customer@email.com"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            value={form.address}
            onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
            placeholder="Address"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            value={form.tags}
            onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))}
            placeholder="vip, lead, support"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm md:col-span-2"
          />
        </div>

        <label className="mt-3 inline-flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={form.optedIn}
            onChange={(e) => setForm((prev) => ({ ...prev, optedIn: e.target.checked }))}
          />
          Opted in for WhatsApp messaging
        </label>

        {(message || error) && (
          <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
            {message && <p className="text-green-700">{message}</p>}
            {error && <p className="text-red-700">{error}</p>}
          </div>
        )}

        <button
          onClick={onSave}
          disabled={saving}
          className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Contact"}
        </button>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Contact List</h2>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by mobile, name, or email"
            className="ml-auto rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            onClick={load}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Search
          </button>
        </div>

        {loading ? (
          <p className="mt-3 text-sm text-gray-600">Loading contacts...</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b text-left text-gray-600">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Mobile</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Address</th>
                  <th className="py-2 pr-3">Tags</th>
                  <th className="py-2 pr-3">Opt-In</th>
                  <th className="py-2 pr-3">Conversations</th>
                  <th className="py-2 pr-3">Last Message</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.id} className="border-b">
                    <td className="py-3 pr-3">{contact.name || "-"}</td>
                    <td className="py-3 pr-3">{contact.phone}</td>
                    <td className="py-3 pr-3">{contact.email || "-"}</td>
                    <td className="py-3 pr-3">{contact.address || "-"}</td>
                    <td className="py-3 pr-3">{contact.tags.join(", ") || "-"}</td>
                    <td className="py-3 pr-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          contact.optedIn
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {contact.optedIn ? "yes" : "no"}
                      </span>
                    </td>
                    <td className="py-3 pr-3">{contact._count.conversations}</td>
                    <td className="py-3 pr-3">
                      {contact.lastMessageAt
                        ? new Date(contact.lastMessageAt).toLocaleString()
                        : "Never"}
                    </td>
                  </tr>
                ))}
                {!loading && contacts.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-3 text-gray-500">
                      No contacts found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
