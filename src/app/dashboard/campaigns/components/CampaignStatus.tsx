export default function CampaignStatus({ results }: any) {
  return (
    <div>
      {results.map((r: any, i: number) => (
        <p key={i} className={r.status === "success" ? "text-green-600" : "text-red-600"}>
          {r.email} → {r.status}
        </p>
      ))}
    </div>
  );
}
