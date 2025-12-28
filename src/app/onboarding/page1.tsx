"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    businessName: "",
    category: "",
    phone: "",
    website: "",
    about: "",
    services: "",
    pricing: "",
    tone: "professional",
  });

  function update(key: string, value: string) {
    setForm({ ...form, [key]: value });
  }

  async function submitOnboarding() {
    try {
      setLoading(true);

      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: form.phone,
          website: form.website,
          about: form.about,
          services: form.services,
          pricing: form.pricing,
          tone: form.tone,
          businessName: form.businessName,
          category: form.category,
        }),
      });

      const json = await res.json();
      setLoading(false);

      if (!json.success) {
        alert(json.error || "Error!");
        return;
      }

      router.push("/dashboard");

    } catch (err) {
      alert("Something went wrong!");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      
      {/* LEFT SIDE */}
      <div className="hidden md:flex flex-col justify-center items-center bg-black text-white w-1/3 p-10">
        <h1 className="text-4xl font-bold">Complete Your</h1>
        <h1 className="text-4xl font-bold mt-1 text-blue-400">Business Setup</h1>
        <p className="mt-4 text-gray-300">AI will personalize automations using this info.</p>
      </div>

      {/* RIGHT SIDE */}
      <div className="w-full md:w-2/3 p-10">
        
        {/* STEP HEADER */}
        <h2 className="text-2xl font-bold mb-5">
          {step === 1 && "Business Details"}
          {step === 2 && "About Your Business"}
          {step === 3 && "AI Tone & Preferences"}
        </h2>

        {/* STEP 1 */}
        {step === 1 && (
          <div className="grid gap-4">

            <input
              className="border p-3 rounded"
              placeholder="Business Name"
              value={form.businessName}
              onChange={(e) => update("businessName", e.target.value)}
            />

            <select
              className="border p-3 rounded"
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
            >
              <option value="">Select Business Category</option>
              <option value="Service Business">Service Business</option>
              <option value="Local Shop">Local Shop</option>
              <option value="IT / SaaS Company">IT / SaaS Company</option>
              <option value="Coaching / Courses">Coaching / Courses</option>
              <option value="Ecommerce / Online Store">Ecommerce / Online Store</option>
              <option value="Agency">Agency</option>
              <option value="Other">Other</option>
            </select>

            <input
              className="border p-3 rounded"
              placeholder="Phone Number"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
            />

            <input
              className="border p-3 rounded"
              placeholder="Website URL (optional)"
              value={form.website}
              onChange={(e) => update("website", e.target.value)}
            />

            <button
              onClick={() => setStep(2)}
              className="bg-blue-600 text-white p-3 rounded mt-3"
            >
              Next →
            </button>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="grid gap-4">

            <textarea
              className="border p-3 h-24 rounded"
              placeholder="Write about your business..."
              value={form.about}
              onChange={(e) => update("about", e.target.value)}
            />

            <textarea
              className="border p-3 h-24 rounded"
              placeholder="Which services do you provide?"
              value={form.services}
              onChange={(e) => update("services", e.target.value)}
            />

            <textarea
              className="border p-3 h-24 rounded"
              placeholder="Your pricing (optional)"
              value={form.pricing}
              onChange={(e) => update("pricing", e.target.value)}
            />

            <div className="flex justify-between mt-3">
              <button
                onClick={() => setStep(1)}
                className="border p-3 rounded"
              >
                ← Back
              </button>

              <button
                onClick={() => setStep(3)}
                className="bg-blue-600 text-white p-3 rounded"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="grid gap-4">

            <select
              className="border p-3 rounded"
              value={form.tone}
              onChange={(e) => update("tone", e.target.value)}
            >
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="casual">Casual</option>
              <option value="energetic">Energetic</option>
              <option value="formal">Formal</option>
            </select>

            <div className="flex justify-between mt-3">
              <button
                onClick={() => setStep(2)}
                className="border p-3 rounded"
              >
                ← Back
              </button>

              <button
                onClick={submitOnboarding}
                disabled={loading}
                className="bg-green-600 text-white p-3 rounded"
              >
                {loading ? "Saving..." : "Finish Setup"}
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
