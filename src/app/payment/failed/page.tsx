export default function FailedPage() {
  return (
    <div className="p-10 text-center">
      <h1 className="text-3xl font-bold text-red-600">Payment Failed ❌</h1>
      <p className="mt-3">Your payment could not be completed.</p>
      <a
        href="/pricing"
        className="mt-5 inline-block bg-red-600 text-white px-6 py-3 rounded-lg"
      >
        Try Again
      </a>
    </div>
  );
}
