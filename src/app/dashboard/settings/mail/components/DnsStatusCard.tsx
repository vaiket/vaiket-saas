"use client";

type DnsRecord = {
  id: number;
  domain: string;

  spfHost: string;
  spfValue: string;
  spfStatus: string;

  dkimHost: string;
  dkimValue: string;
  dkimStatus: string;

  dmarcHost: string;
  dmarcValue: string;
  dmarcStatus: string;
};

export default function DnsStatusCard({
  dns,
  loading,
}: {
  dns: DnsRecord[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="border rounded-lg p-5">
        <h3 className="font-semibold mb-1">DNS Records</h3>
        <p className="text-sm text-gray-500">Loading DNS records…</p>
      </div>
    );
  }

  if (!Array.isArray(dns) || dns.length === 0) {
    return (
      <div className="border rounded-lg p-5">
        <h3 className="font-semibold mb-1">DNS Records</h3>
        <p className="text-sm text-gray-500">
          DNS records not available yet.
        </p>
      </div>
    );
  }

  const record = dns[0];

  const Status = ({ status }: { status: string }) => (
    <span
      className={`text-xs font-medium px-2 py-1 rounded ${
        status === "verified"
          ? "bg-green-100 text-green-700"
          : "bg-yellow-100 text-yellow-700"
      }`}
    >
      {status}
    </span>
  );

  return (
    <div className="border rounded-lg p-5 space-y-4">
      <h3 className="font-semibold">DNS Records</h3>
      <p className="text-sm text-gray-500">
        Add these DNS records to your domain provider.
      </p>

      {/* SPF */}
      <div className="border rounded-md p-3">
        <div className="flex justify-between mb-1">
          <strong>SPF</strong>
          <Status status={record.spfStatus} />
        </div>
        <div className="text-sm">
          <div>
            Host: <code>{record.spfHost}</code>
          </div>
          <div>
            Value: <code>{record.spfValue}</code>
          </div>
        </div>
      </div>

      {/* DKIM */}
      <div className="border rounded-md p-3">
        <div className="flex justify-between mb-1">
          <strong>DKIM</strong>
          <Status status={record.dkimStatus} />
        </div>
        <div className="text-sm">
          <div>
            Host: <code>{record.dkimHost}</code>
          </div>
          <div className="break-all">
            Value: <code>{record.dkimValue}</code>
          </div>
        </div>
      </div>

      {/* DMARC */}
      <div className="border rounded-md p-3">
        <div className="flex justify-between mb-1">
          <strong>DMARC</strong>
          <Status status={record.dmarcStatus} />
        </div>
        <div className="text-sm">
          <div>
            Host: <code>{record.dmarcHost}</code>
          </div>
          <div>
            Value: <code>{record.dmarcValue}</code>
          </div>
        </div>
      </div>

      <button className="mt-2 px-4 py-2 bg-black text-white rounded hover:bg-gray-900">
        Verify DNS Now
      </button>
    </div>
  );
}
