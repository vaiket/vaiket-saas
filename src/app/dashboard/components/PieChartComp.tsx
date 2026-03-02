import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
const COLORS = ["#4f46e5","#06b6d4","#f59e0b","#ef4444"];
export default function PieChartComp({ data }: any) {
  return (
    <div style={{ width: "100%", height: 150 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="label" innerRadius={30} outerRadius={60} label>
            {data?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
