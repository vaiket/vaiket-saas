import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
export default function BarChartComp({ data }: any) {
  return (
    <div style={{ width: "100%", height: 150 }}>
      <ResponsiveContainer>
        <BarChart data={data}>
          <XAxis dataKey="label"/>
          <YAxis/>
          <Tooltip/>
          <Bar dataKey="value" fill="#10b981"/>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
