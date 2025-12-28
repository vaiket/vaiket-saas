"use client";

import { useEffect, useState } from "react";

export default function OnboardingDetailsPage() {
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [data, setData] = useState<any>(null);

  // Form state
  const [form, setForm] = useState({
    businessName: "",
    phone: "",
    website: "",
    about: "",
    services: "",
    pricing: "",
    tone: "",
  });

  function updateField(key: string, value: string) {
    setForm({ ...form, [key]: value });
  }

  // Load onboarding data
  async function loadData() {
    setLoading(true);
    const res = await fetch("/api/onboarding/get");
    const json = await res.json();

    if (json.success && json.onboarding) {
      setData(json.onboarding);
      setForm(json.onboarding);
    }

    setLoading(false);
  }

  // Save updated onboarding info
  async function saveData() {
    const res = await fetch("/api/onboarding/update", {
      method: "POST",
      body: JSON.stringify(form),
    });

    const json = await res.json();
    if (json.success) {
      alert("Updated successfully!");
      setEditing(false);
      loadData();
    } else {
      alert(json.error);
    }
  }

  // Delete onboarding info
  async function deleteData() {
    if (!confirm("Are you sure you want to delete onboarding details?")) return;

    const res = await fetch("/api/onboarding/delete", {
      method: "POST",
    });

    const json = await res.json();
    if (json.success) {
      alert("Deleted successfully!");
      setData(null);
      setForm({
        businessName: "",
        phone: "",
        website: "",
        about: "",
        services: "",
        pricing: "",
        tone: "",
      });
    } else {
      alert(json.error);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <div className="p-6 text-xl">Loading...</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Onboarding Details</h1>

      {/* If no onboarding data */}
      {!data && !editing && (
        <div className="text-gray-600">
          No onboarding details found.
          <button
            onClick={() => setEditing(true)}
            className="ml-3 px-4 py-2 bg-blue-600 text-white rounded"
          >
            Add Details
          </button>
        </div>
      )}

      {/* VIEW MODE */}
      {!editing && data && (
        <div className="bg-white shadow rounded p-5 space-y-3">
          <div>
            <strong>Business Name:</strong> {data.businessName || "—"}
          </div>
          <div>
            <strong>Phone:</strong> {data.phone || "—"}
          </div>
          <div>
            <strong>Website:</strong> {data.website || "—"}
          </div>
          <div>
            <strong>About:</strong> {data.about || "—"}
          </div>
          <div>
            <strong>Services:</strong> {data.services || "—"}
          </div>
          <div>
            <strong>Pricing:</strong> {data.pricing || "—"}
          </div>
          <div>
            <strong>Tone:</strong> {data.tone || "—"}
          </div>

          <div className="flex gap-4 mt-4">
            <button
              onClick={() => setEditing(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              Edit
            </button>
            <button
              onClick={deleteData}
              className="px-4 py-2 bg-red-600 text-white rounded"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* EDIT MODE */}
      {editing && (
        <div className="bg-white shadow rounded p-5 space-y-4">
          {Object.keys(form).map((key) => (
            <div key={key}>
              <label className="font-semibold block mb-1">
                {key.toUpperCase()}
              </label>
              <textarea
                rows={key === "about" || key === "services" ? 4 : 2}
                value={(form as any)[key] || ""}
                onChange={(e) => updateField(key, e.target.value)}
                className="border w-full p-2 rounded"
              />
            </div>
          ))}

          <div className="flex gap-4 mt-3">
            <button
              onClick={saveData}
              className="px-4 py-2 bg-green-600 text-white rounded"
            >
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-2 bg-gray-400 text-white rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
