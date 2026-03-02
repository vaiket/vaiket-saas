"use client";

export default function SubscriptionsPage() {
  async function handleBuyNow() {
    try {
      const res = await fetch("/api/subscription/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planKey: "BASIC_999",
        }),
      });

      if (!res.ok) {
        alert("Unable to start payment. Please try again.");
        return;
      }

      const data = await res.json();

      // Create PayU auto-submit form
      const form = document.createElement("form");
      form.method = "POST";
      form.action = data.payuUrl;

      Object.entries(data.fields).forEach(([key, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = String(value);
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again.");
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 space-y-10">
      {/* ================= HEADER ================= */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-semibold text-gray-900">
          Choose Your Subscription
        </h1>
        <p className="text-sm text-gray-500">
          Simple pricing. Powerful email automation.
        </p>
      </div>

      {/* ================= PLANS ================= */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* ================= BASIC PLAN ================= */}
        <div className="rounded-2xl border bg-white p-8 shadow-sm flex flex-col">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">
              Automation Plan
            </h2>
            <p className="text-sm text-gray-500">
              Perfect for creators & growing businesses
            </p>
          </div>

          <div className="mt-6">
            <span className="text-4xl font-bold text-gray-900">₹999</span>
            <span className="text-sm text-gray-500"> / month</span>
          </div>

          <ul className="mt-6 space-y-3 text-sm text-gray-700">
            <li>✅ Unlimited email sending</li>
            <li>✅ Unlimited AI tone & replies</li>
            <li>✅ Unlimited mail processing (IMAP)</li>
            <li>✅ SMTP sending included</li>
            <li>✅ SPF, DKIM, DMARC support</li>
            <li>✅ 24×7 system availability</li>
            <li>✅ Project monitoring dashboard</li>
          </ul>

          <button
            onClick={handleBuyNow}
            className="mt-8 w-full rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700"
          >
            Buy Now – ₹999
          </button>
        </div>

        {/* ================= ENTERPRISE PLAN ================= */}
        <div className="rounded-2xl border bg-gray-50 p-8 flex flex-col">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">
              Enterprise Plan
            </h2>
            <p className="text-sm text-gray-500">
              For large teams & custom requirements
            </p>
          </div>

          <div className="mt-6 text-2xl font-semibold text-gray-900">
            Custom Pricing
          </div>

          <ul className="mt-6 space-y-3 text-sm text-gray-700">
            <li>🚀 Dedicated mail infrastructure</li>
            <li>🚀 High-volume sending support</li>
            <li>🚀 Custom AI workflows</li>
            <li>🚀 Priority support</li>
            <li>🚀 SLA & compliance options</li>
            <li>🚀 Team & role management</li>
          </ul>

          <a
            href="https://wa.me/917004614077"
            target="_blank"
            className="mt-8 w-full rounded-lg bg-green-600 px-5 py-3 text-center text-sm font-medium text-white hover:bg-green-700"
          >
            Contact on WhatsApp
          </a>
        </div>
      </div>

      {/* ================= FOOTER NOTE ================= */}
      <div className="text-center text-xs text-gray-500">
        All prices are exclusive of taxes. You can upgrade or cancel anytime.
      </div>
    </div>
  );
}
