export default function SuccessPage() {
  return (
    <div className="p-10 text-center">
      <h1 className="text-3xl font-bold text-green-600">Payment Successful 🎉</h1>
      <p className="mt-3">Your subscription is now active.</p>
      <a
        href="/dashboard"
        className="mt-5 inline-block bg-green-600 text-white px-6 py-3 rounded-lg"
      >
        Go to Dashboard
      </a>
    </div>
  );
}
