import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function LineChartArea({ data }: any) {
  // data format: [{ date: '2025-11-01', value: 10 }, ...]
  return (
    <div style={{ width: "100%", height: 240 }}>
      <ResponsiveContainer>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorA" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <CartesianGrid strokeDasharray="3 3" />
          <Area type="monotone" dataKey="value" stroke="#4f46e5" fillOpacity={1} fill="url(#colorA)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
