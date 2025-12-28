"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Mailbox = {
  email: string;
  status: string;
};

export default function ProjectConfigPage() {
  const { projectId } = useParams<{ projectId: string }>();

  const [project, setProject] = useState<any>(null);
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);

  const [purpose, setPurpose] = useState("Lead Generation");
  const [replyTone, setReplyTone] = useState("Professional");
  const [replyLength, setReplyLength] = useState("Long");
  const [aiEnabled, setAiEnabled] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /* PROJECT */
  useEffect(() => {
    fetch(`/api/automation-projects/${projectId}`)
      .then((r) => r.json())
      .then((d) => {
        setProject(d.project);
        setLoading(false);
      });
  }, [projectId]);

  /* MAILBOX LIST (FIXED) */
  useEffect(() => {
    fetch("/api/mailbox/list")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setMailboxes(d.mailboxes);
          setSelectedEmails(
            d.mailboxes.filter((m: any) => m.status === "active").map((m: any) => m.email)
          );
        }
      });
  }, []);

  async function saveConfiguration() {
    setSaving(true);

    const res = await fetch(
      `/api/automation-projects/${projectId}/config`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose,
          replyTone,
          replyLength,
          aiEnabled,
          selectedEmails,
        }),
      }
    );

    setSaving(false);

    if (!res.ok) {
      alert("Save failed");
      return;
    }

    alert("Configuration saved successfully ✅");
  }

  if (loading) return <p className="p-6">Loading...</p>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          <p className="text-sm text-gray-500">
            Project ID: {project.id} · {project.status}
          </p>
        </div>

        <button
          onClick={saveConfiguration}
          disabled={saving}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg"
        >
          {saving ? "Saving..." : "Save Configuration"}
        </button>
      </div>

      {/* MAILBOXES */}
      <section className="bg-white border rounded-xl p-5">
        <h2 className="font-semibold mb-4">Select Mailboxes</h2>

        <div className="space-y-3">
          {mailboxes.map((mb) => (
            <label
              key={mb.email}
              className="flex justify-between items-center border rounded-lg px-4 py-3"
            >
              <div>
                <p className="font-medium">{mb.email}</p>
                <p className="text-xs text-gray-500">{mb.status}</p>
              </div>

              <input
                type="checkbox"
                checked={selectedEmails.includes(mb.email)}
                onChange={() =>
                  setSelectedEmails((prev) =>
                    prev.includes(mb.email)
                      ? prev.filter((e) => e !== mb.email)
                      : [...prev, mb.email]
                  )
                }
                className="w-5 h-5 accent-blue-600"
              />
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
