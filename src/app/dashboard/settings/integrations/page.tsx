"use client";

const integrations = [
  "Google account connection",
  "Mail provider connection",
  "Webhook endpoint setup",
  "Tenant API key management",
  "Provider health and last sync info",
];

export default function IntegrationsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">
          Integrations and API Keys
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Connect external providers for this tenant and manage secure API
          credentials.
        </p>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Planned modules</h2>
        <ul className="mt-4 space-y-2 text-sm text-gray-700">
          {integrations.map((item) => (
            <li key={item} className="rounded-lg bg-gray-50 px-3 py-2">
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
