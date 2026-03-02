export default function SendButton({ emails, subject, html, onResult }: any) {
  const send = async () => {
    const res = await fetch("/api/mail/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        emails: emails.split(","),
        subject,
        html,
      }),
    });

    const data = await res.json();
    onResult(data.results || []);
  };

  return (
    <button
      onClick={send}
      className="bg-blue-600 text-white px-5 py-2 rounded"
    >
      🚀 Send Campaign
    </button>
  );
}
