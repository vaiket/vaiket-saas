export default function KPICard({ title, value, subtitle }: any) {
  return (
    <div className="bg-white p-4 rounded shadow flex flex-col">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-bold mt-2">{value}</div>
      {subtitle && <div className="text-xs text-gray-400 mt-2">{subtitle}</div>}
    </div>
  );
}
