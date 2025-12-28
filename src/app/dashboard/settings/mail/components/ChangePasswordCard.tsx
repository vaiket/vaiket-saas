export default function ChangePasswordCard() {
  return (
    <div className="border rounded-lg p-5 bg-white">
      <h2 className="font-medium mb-3">Change Mailbox Password</h2>

      <div className="space-y-3">
        <input
          type="password"
          placeholder="New password"
          className="w-full border rounded px-3 py-2"
        />
        <input
          type="password"
          placeholder="Confirm password"
          className="w-full border rounded px-3 py-2"
        />

        <button className="bg-gray-800 text-white px-4 py-2 rounded w-full">
          Update Password
        </button>
      </div>

      <p className="text-xs text-gray-500 mt-2">
        Password applies to IMAP, SMTP & Webmail.
      </p>
    </div>
  );
}
