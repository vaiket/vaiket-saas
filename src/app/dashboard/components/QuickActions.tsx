export default function QuickActions({ onManualSync }: any) {
  return (
    <div className="flex flex-col gap-3">
      <button className="bg-blue-600 text-white p-2 rounded" onClick={() => window.location.href = "/dashboard/mail-accounts"}>Add Mailbox</button>
      <button className="bg-indigo-600 text-white p-2 rounded" onClick={() => window.location.href = "/dashboard/inbox"}>Open Inbox</button>
      <button className="bg-green-600 text-white p-2 rounded" onClick={() => onManualSync()}>Manual IMAP Sync</button>
      <button className="bg-amber-500 text-white p-2 rounded" onClick={() => window.location.href = "/dashboard/ai-studio"}>Open AI Studio</button>
    </div>
  );
}
