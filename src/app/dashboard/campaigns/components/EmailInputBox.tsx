export default function EmailInputBox({ value, onChange }: any) {
  return (
    <textarea
      className="w-full border p-2"
      placeholder="user1@gmail.com, user2@gmail.com"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
