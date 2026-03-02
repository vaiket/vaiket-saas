"use client";

type Mailbox = {
  id: number;
  email: string;
};

export default function MailboxSelector({
  mailboxes,
  selectedId,
  onSelect,
}: {
  mailboxes: Mailbox[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Select Mailbox</label>

      <select
        value={selectedId ?? ""}
        onChange={(e) => onSelect(Number(e.target.value))}
        className="w-full border rounded-lg px-4 py-2"
      >
        <option value="" disabled>
          -- Choose a mailbox --
        </option>

        {mailboxes.map((mb) => (
          <option key={mb.id} value={mb.id}>
            {mb.email}
          </option>
        ))}
      </select>
    </div>
  );
}
