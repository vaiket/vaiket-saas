export default function SmtpSyncCard() {
  const sync = async () => {
    await fetch("/api/edit-smtp/sync", { method: "POST" });
    alert("SMTP Synced");
  };

  return (
    <button
      className="bg-green-600 text-white px-4 py-2 rounded"
      onClick={sync}
    >
      Sync SMTP
    </button>
  );
}
