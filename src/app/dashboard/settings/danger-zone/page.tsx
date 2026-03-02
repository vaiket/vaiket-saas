"use client";

const actions = [
  {
    title: "Disable automation for tenant",
    detail: "Stop all automated replies and background send flows.",
  },
  {
    title: "Export tenant data",
    detail: "Generate full export for compliance or backup.",
  },
  {
    title: "Delete tenant workspace",
    detail: "Permanent delete of tenant data after strict confirmation.",
  },
];

export default function DangerZonePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="rounded-2xl border border-red-300 bg-red-50 p-6">
        <h1 className="text-2xl font-semibold text-red-800">Danger Zone</h1>
        <p className="mt-2 text-sm text-red-700">
          These actions are high impact and should be limited to tenant owners.
        </p>
      </div>

      <div className="space-y-3">
        {actions.map((action) => (
          <section
            key={action.title}
            className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-base font-semibold text-gray-900">{action.title}</h2>
            <p className="mt-1 text-sm text-gray-600">{action.detail}</p>
            <button
              type="button"
              className="mt-4 rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
            >
              Restricted Action
            </button>
          </section>
        ))}
      </div>
    </div>
  );
}
