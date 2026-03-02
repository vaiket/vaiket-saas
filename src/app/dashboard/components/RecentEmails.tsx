export default function RecentEmails({ emails }: any) {
  if (!emails || emails.length === 0) return <div className="text-gray-500">No recent emails</div>;
  return (
    <div className="space-y-3 max-h-96 overflow-auto">
      {emails.map((e: any) => (
        <div key={e.id} className="p-3 border rounded hover:bg-gray-50">
          <div className="flex justify-between">
            <div>
              <div className="font-semibold">{e.from}</div>
              <div className="text-sm text-gray-600">{e.subject || "(no subject)"}</div>
            </div>
            <div className="text-xs text-gray-400">{new Date(e.createdAt).toLocaleString()}</div>
          </div>
          <div className="text-sm text-gray-700 mt-2 line-clamp-2">{e.body}</div>
        </div>
      ))}
    </div>
  );
}
