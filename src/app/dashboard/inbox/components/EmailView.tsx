export default function EmailView({ email }) {
  if (!email)
    return <div className="p-5 text-gray-400">Select an email to view</div>;

  return (
    <div className="p-5 overflow-y-auto h-full">
      <h2 className="text-xl font-bold">{email.subject}</h2>
      <p className="text-gray-500 mt-1">From: {email.from}</p>

      <div className="mt-4 whitespace-pre-wrap">
        {email.body}
      </div>
    </div>
  );
}
