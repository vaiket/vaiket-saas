"use client";

import { useEffect, useState } from "react";

export default function OnboardingDetailsPage() {
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [saving, setSaving] = useState(false);

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
    try {
      const res = await fetch("/api/onboarding/get");
      const json = await res.json();

      if (json.success && json.onboarding) {
        setData(json.onboarding);
        setForm(json.onboarding);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  }

  // Save updated onboarding info
  async function saveData() {
    setSaving(true);
    try {
      const res = await fetch("/api/onboarding/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await res.json();
      if (json.success) {
        setEditing(false);
        await loadData();
      } else {
        alert(json.error);
      }
    } catch (error) {
      console.error("Failed to save:", error);
      alert("Failed to save data");
    } finally {
      setSaving(false);
    }
  }

  // Delete onboarding info
  async function deleteData() {
    if (!confirm("Are you sure you want to delete your onboarding details? This action cannot be undone.")) return;

    try {
      const res = await fetch("/api/onboarding/delete", {
        method: "POST",
      });

      const json = await res.json();
      if (json.success) {
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
    } catch (error) {
      console.error("Failed to delete:", error);
      alert("Failed to delete data");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your onboarding details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/30 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Business Profile</h1>
              <p className="text-gray-600 mt-2">Manage your business information and preferences</p>
            </div>
            
            {!data && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-xl"
              >
                <PlusIcon className="w-5 h-5" />
                Setup Business Profile
              </button>
            )}
          </div>
        </div>

        {/* Empty State */}
        {!data && !editing && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BusinessIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Business Profile</h3>
              <p className="text-gray-600 mb-6">
                Set up your business profile to personalize your experience and streamline customer interactions.
              </p>
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-xl"
              >
                <PlusIcon className="w-5 h-5" />
                Create Business Profile
              </button>
            </div>
          </div>
        )}

        {/* VIEW MODE */}
        {!editing && data && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-200 px-6 py-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Business Information</h2>
                  <p className="text-sm text-gray-600 mt-1">Your current business profile settings</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setEditing(true)}
                    className="inline-flex items-center gap-2 bg-white border border-gray-300 hover:border-gray-400 text-gray-700 px-4 py-2 rounded-lg font-medium transition-all duration-200"
                  >
                    <PencilIcon className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={deleteData}
                    className="inline-flex items-center gap-2 bg-white border border-red-200 hover:border-red-300 text-red-600 px-4 py-2 rounded-lg font-medium transition-all duration-200"
                  >
                    <TrashIcon className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <InfoCard
                  label="Business Name"
                  value={data.businessName}
                  icon={<BuildingIcon className="w-5 h-5" />}
                />
                
                <InfoCard
                  label="Phone Number"
                  value={data.phone}
                  icon={<PhoneIcon className="w-5 h-5" />}
                />
                
                <InfoCard
                  label="Website"
                  value={data.website}
                  icon={<GlobeIcon className="w-5 h-5" />}
                  isLink
                />
                
                <InfoCard
                  label="Communication Tone"
                  value={data.tone}
                  icon={<ChatIcon className="w-5 h-5" />}
                />

                <div className="lg:col-span-2">
                  <InfoCard
                    label="About Business"
                    value={data.about}
                    icon={<InformationCircleIcon className="w-5 h-5" />}
                    fullWidth
                  />
                </div>

                <div className="lg:col-span-2">
                  <InfoCard
                    label="Services Offered"
                    value={data.services}
                    icon={<ServicesIcon className="w-5 h-5" />}
                    fullWidth
                  />
                </div>

                <div className="lg:col-span-2">
                  <InfoCard
                    label="Pricing Information"
                    value={data.pricing}
                    icon={<CurrencyIcon className="w-5 h-5" />}
                    fullWidth
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EDIT MODE */}
        {editing && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-200 px-6 py-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {data ? "Edit Business Profile" : "Create Business Profile"}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Provide your business details to enhance customer experience
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <FormField
                  label="Business Name"
                  value={form.businessName}
                  onChange={(value) => updateField("businessName", value)}
                  placeholder="Enter your business name"
                  icon={<BuildingIcon className="w-5 h-5" />}
                />

                <FormField
                  label="Phone Number"
                  value={form.phone}
                  onChange={(value) => updateField("phone", value)}
                  placeholder="+1 (555) 123-4567"
                  icon={<PhoneIcon className="w-5 h-5" />}
                />

                <FormField
                  label="Website"
                  value={form.website}
                  onChange={(value) => updateField("website", value)}
                  placeholder="https://example.com"
                  icon={<GlobeIcon className="w-5 h-5" />}
                />

                <FormField
                  label="Communication Tone"
                  value={form.tone}
                  onChange={(value) => updateField("tone", value)}
                  placeholder="Professional, Friendly, Casual, etc."
                  icon={<ChatIcon className="w-5 h-5" />}
                />

                <FormField
                  label="About Business"
                  value={form.about}
                  onChange={(value) => updateField("about", value)}
                  placeholder="Describe your business, mission, and values..."
                  icon={<InformationCircleIcon className="w-5 h-5" />}
                  textArea
                  fullWidth
                />

                <FormField
                  label="Services Offered"
                  value={form.services}
                  onChange={(value) => updateField("services", value)}
                  placeholder="List the services you provide..."
                  icon={<ServicesIcon className="w-5 h-5" />}
                  textArea
                  fullWidth
                />

                <FormField
                  label="Pricing Information"
                  value={form.pricing}
                  onChange={(value) => updateField("pricing", value)}
                  placeholder="Describe your pricing structure, packages, or rates..."
                  icon={<CurrencyIcon className="w-5 h-5" />}
                  textArea
                  fullWidth
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-end pt-6 mt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    if (data) {
                      setForm(data);
                    } else {
                      setForm({
                        businessName: "",
                        phone: "",
                        website: "",
                        about: "",
                        services: "",
                        pricing: "",
                        tone: "",
                      });
                    }
                    setEditing(false);
                  }}
                  className="px-6 py-3 border border-gray-300 hover:border-gray-400 text-gray-700 rounded-lg font-medium transition-all duration-200"
                >
                  Cancel
                </button>
                
                <button
                  onClick={saveData}
                  disabled={saving}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-xl disabled:shadow-none disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Spinner className="w-4 h-4" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckIcon className="w-5 h-5" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Component for view mode cards
function InfoCard({ label, value, icon, isLink = false, fullWidth = false }: any) {
  if (!value) return null;

  return (
    <div className={`bg-gray-50 rounded-xl p-4 ${fullWidth ? 'col-span-2' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-200">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
          {isLink && value ? (
            <a 
              href={value.startsWith('http') ? value : `https://${value}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 font-medium text-sm break-words"
            >
              {value}
            </a>
          ) : (
            <p className="text-gray-900 text-sm break-words">
              {value}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Component for form fields
function FormField({ label, value, onChange, placeholder, icon, textArea = false, fullWidth = false }: any) {
  const InputComponent = textArea ? "textarea" : "input";

  return (
    <div className={`${fullWidth ? 'lg:col-span-2' : ''}`}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="relative">
        <div className="absolute left-3 top-3.5 text-gray-400">
          {icon}
        </div>
        <InputComponent
          value={value || ""}
          onChange={(e: any) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={textArea ? 4 : 1}
          className={`w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
            textArea ? 'resize-vertical' : ''
          }`}
        />
      </div>
    </div>
  );
}

// Icon components
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function InformationCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ServicesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}

function CurrencyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
    </svg>
  );
}

function BusinessIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
}