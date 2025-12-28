"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const router = useRouter();

  const [data, setData] = useState({
    phone: "",
    website: "",
    about: "",
    services: "",
    pricing: "",
    tone: "professional",
  });

  const [loading, setLoading] = useState(false);

  async function submitOnboarding() {
    try {
      setLoading(true);

      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      setLoading(false);

      if (!json.success) {
        alert(json.error || "Failed");
        return;
      }

      alert("Onboarding completed!");
      router.push("/dashboard");

    } catch (err) {
      console.log(err);
      alert("Something went wrong!");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-10">
      <h1 className="text-3xl font-bold">Welcome! Let's Setup Your AI Workspace</h1>
      <p className="text-gray-400 mt-2">Fill these details so AI can fully understand your business.</p>

      <div className="mt-8 grid gap-5">

        <input
          className="border p-3 rounded w-full"
          placeholder="Phone Number"
          value={data.phone}
          onChange={e => setData({ ...data, phone: e.target.value })}
        />

        <input
          className="border p-3 rounded w-full"
          placeholder="Website URL (optional)"
          value={data.website}
          onChange={e => setData({ ...data, website: e.target.value })}
        />

        <textarea
          className="border p-3 rounded w-full h-24"
          placeholder="About your business"
          value={data.about}
          onChange={e => setData({ ...data, about: e.target.value })}
        />

        <textarea
          className="border p-3 rounded w-full h-24"
          placeholder="Services you provide"
          value={data.services}
          onChange={e => setData({ ...data, services: e.target.value })}
        />

        <textarea
          className="border p-3 rounded w-full h-24"
          placeholder="Your pricing (plans / starting price)"
          value={data.pricing}
          onChange={e => setData({ ...data, pricing: e.target.value })}
        />

        <select
          className="border p-3 rounded w-full"
          value={data.tone}
          onChange={e => setData({ ...data, tone: e.target.value })}
        >
          <option value="professional">Professional</option>
          <option value="friendly">Friendly</option>
          <option value="aggressive">Aggressive</option>
          <option value="casual">Casual</option>
        </select>

        <button
          onClick={submitOnboarding}
          disabled={loading}
          className="bg-blue-600 text-white p-3 rounded text-lg"
        >
          {loading ? "Saving..." : "Complete Onboarding"}
        </button>

      </div>
    </div>
  );
}
