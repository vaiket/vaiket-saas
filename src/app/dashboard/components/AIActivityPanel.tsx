export default function AIActivityPanel({ data }: any) {
  return (
    <div className="text-sm space-y-3">
      <div><b>Provider:</b> {data?.provider || "DeepSeek / GPT / Gemini"}</div>
      <div><b>Fallbacks:</b> {data?.fallbacks?.join(", ") || "—"}</div>
      <div><b>Token Usage (24h):</b> {data?.tokens24h ?? 0}</div>
      <div><b>Errors (24h):</b> {data?.errors24h ?? 0}</div>
      <div className="mt-3 text-xs text-gray-500">Cost estimation & token details here. Build /api/ai/activity</div>
    </div>
  );
}
