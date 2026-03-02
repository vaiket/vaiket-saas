export default function EmailList({ emails, onSelect }) {
  return (
    <div className="p-3 overflow-y-auto h-full">
      <h2 className="text-xl font-bold mb-4">Inbox</h2>

      {emails.map((email) => (
        <div
          key={email.id}
          className="p-3 border rounded mb-2 cursor-pointer hover:bg-gray-100"
          onClick={() => onSelect(email)}
        >
          <p className="font-bold">{email.from}</p>
          <p className="text-sm">{email.subject || "No Subject"}</p>
          <p className="text-xs text-gray-500">{new Date(email.createdAt).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}
