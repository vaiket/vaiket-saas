"use client";

export default function AISettingsPage() {
  const defaultControls = [
    "Primary provider",
    "Fallback provider",
    "Model selection",
    "Reply tone",
    "Reply length",
    "Automation mode (draft/auto-send)",
  ];

  const safetyControls = [
    "Confidence threshold",
    "Do not auto-send for payment issues",
    "Escalate sensitive emails to human",
    "Fallback if provider fails",
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">AI Settings</h1>
        <p className="mt-2 text-sm text-gray-600">
          Configure tenant-level AI behavior used by automation and draft
          generation across this workspace.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Default Controls</h2>
          <ul className="mt-4 space-y-2 text-sm text-gray-700">
            {defaultControls.map((item) => (
              <li key={item} className="rounded-lg bg-gray-50 px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            Guardrails and Safety
          </h2>
          <ul className="mt-4 space-y-2 text-sm text-gray-700">
            {safetyControls.map((item) => (
              <li key={item} className="rounded-lg bg-gray-50 px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Next Implementation</h2>
        <p className="mt-2 text-sm text-gray-600">
          We can wire this page to `/api/settings/ai` next so tenant admins can
          save real values.
        </p>
      </section>
    </div>
  );
}
