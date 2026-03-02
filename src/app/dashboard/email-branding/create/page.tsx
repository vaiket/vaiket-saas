"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, FolderPlus } from "lucide-react";

export default function CreateAutomationProjectPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    setError("");

    if (!name.trim()) {
      setError("Project name is required");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/automation-projects/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Failed to create project");
        setLoading(false);
        return;
      }

      // ✅ redirect to automation project list (email branding)
      router.push("/dashboard/email-branding");
    } catch (err) {
      setError("Network error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          Create Automation Project
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Create a new email automation project to configure branding, mailbox,
          and AI workflows.
        </p>
      </div>

      {/* Card */}
      <div className="bg-white border rounded-xl p-6 shadow-sm space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Project Name
          </label>
          <input
            type="text"
            placeholder="e.g. Sales Inbox Automation"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-11 rounded-lg border px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-600">{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={() => router.back()}
            className="px-5 py-2.5 text-sm rounded-lg border hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            onClick={handleCreate}
            disabled={loading}
            className="px-5 py-2.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create Project"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="mt-8 flex items-start gap-3 text-sm text-gray-500">
        <FolderPlus className="w-5 h-5 text-gray-400" />
        <p>
          Each automation project represents one complete email workflow. After
          creation, you can configure email branding, connect mailboxes, and
          enable AI-powered automation.
        </p>
      </div>
    </div>
  );
}
