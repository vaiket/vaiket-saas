export default function AIPanel({ email }) {
  if (!email)
    return <div className="p-5 text-gray-400">AI insights will appear here</div>;

  return (
    <div className="p-5 overflow-y-auto h-full">
      <h2 className="text-xl font-bold mb-3">AI Insights</h2>

      <p className="mb-2">Category: <b>General Query</b></p>
      <p className="mb-2">Urgency: <b>Medium</b></p>
      <p className="mb-2">Sentiment: <b>Neutral</b></p>

      <h3 className="text-lg font-bold mt-4">Summary</h3>
      <p className="text-sm text-gray-600">AI summary will come here...</p>

      <h3 className="text-lg font-bold mt-4">Suggested Reply</h3>
      <textarea
        className="border p-2 w-full h-32"
        placeholder="AI reply recommendation..."
      ></textarea>

      <button className="bg-blue-600 text-white mt-3 p-2 rounded">
        Send Reply
      </button>
    </div>
  );
}
