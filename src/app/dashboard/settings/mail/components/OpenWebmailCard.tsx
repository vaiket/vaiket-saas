export default function OpenWebmailCard() {
  return (
    <div className="border rounded-lg p-5 bg-white flex items-center justify-between">
      <div>
        <h2 className="font-medium">Webmail Access</h2>
        <p className="text-sm text-gray-500">
          Access your inbox securely via webmail
        </p>
      </div>

      <button
        onClick={() =>
          window.open("https://mail.astramize.com", "_blank")
        }
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Open Webmail
      </button>
    </div>
  );
}
