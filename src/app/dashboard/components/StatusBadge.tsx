export default function StatusBadge({ label, status }: any) {
  const color = status === "ok" || status === "Connected" ? "bg-green-100 text-green-800" :
                status === "idle" || status === "unknown" ? "bg-yellow-100 text-yellow-800" :
                "bg-red-100 text-red-800";
  return (
    <div className={`px-3 py-1 rounded-full text-sm font-medium ${color}`}>
      <span className="font-semibold mr-2">{label}</span>
      <span>{status}</span>
    </div>
  );
}
