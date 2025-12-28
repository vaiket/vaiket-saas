"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Building2, 
  User, 
  Globe, 
  Phone, 
  FileText, 
  Settings, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle, 
  Zap,
  Bot,
  Sparkles,
  Target,
  DollarSign,
  MessageCircle
} from "lucide-react";

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

      router.push("/onboarding/complete");

    } catch (err) {
      alert("Something went wrong!");
      setLoading(false);
    }
  }

  const steps = [
    { number: 1, title: "Business Details", icon: <Building2 className="w-4 h-4" /> },
    { number: 2, title: "About Business", icon: <FileText className="w-4 h-4" /> },
    { number: 3, title: "AI Preferences", icon: <Settings className="w-4 h-4" /> },
  ];

  const businessCategories = [
    { value: "Service Business", label: "Service Business" },
    { value: "Local Shop", label: "Local Shop" },
    { value: "IT / SaaS Company", label: "IT / SaaS Company" },
    { value: "Coaching / Courses", label: "Coaching / Courses" },
    { value: "Ecommerce / Online Store", label: "Ecommerce / Online Store" },
    { value: "Agency", label: "Agency" },
    { value: "Other", label: "Other" },
  ];

  const toneOptions = [
    { value: "professional", label: "Professional", description: "Formal and business-appropriate" },
    { value: "friendly", label: "Friendly", description: "Warm and approachable" },
    { value: "casual", label: "Casual", description: "Relaxed and conversational" },
    { value: "energetic", label: "Energetic", description: "Enthusiastic and dynamic" },
    { value: "formal", label: "Formal", description: "Very structured and traditional" },
  ];

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      
      {/* Left Side - Promotional Content */}
      <div className="hidden lg:flex lg:w-2/5 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0D3B66]/10 to-[#0D3B66]/5"></div>
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-[#0D3B66]/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 -right-20 w-72 h-72 bg-[#0D3B66]/5 rounded-full blur-3xl"></div>
        
        {/* Header */}
        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-12 h-12 bg-[#0D3B66] rounded-xl flex items-center justify-center shadow-lg shadow-[#0D3B66]/25">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-[#0D3B66]">
              VAIKET AI
            </span>
          </div>

          <h1 className="text-4xl font-bold leading-tight mb-6 text-gray-800">
            Complete Your
            <span className="text-[#0D3B66] block">
              Business Profile
            </span>
          </h1>

          <p className="text-lg text-gray-600 mb-8 max-w-md leading-relaxed">
            Personalize your AI email automation with your business details. This helps create more relevant and effective communication.
          </p>

          {/* Features */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Zap className="w-4 h-4 text-green-600" />
              </div>
              <span className="text-gray-700">AI-powered email responses</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Target className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-gray-700">Personalized communication</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-purple-600" />
              </div>
              <span className="text-gray-700">Smart automation workflows</span>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-600">Setup Progress</span>
            <span className="text-sm font-semibold text-[#0D3B66]">{step}/3</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-[#0D3B66] h-2 rounded-full transition-all duration-500"
              style={{ width: `${(step / 3) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Right Side - Onboarding Form */}
      <div className="w-full lg:w-3/5 flex items-center justify-center p-6 sm:p-8 lg:p-12">
        <div className="w-full max-w-2xl">
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center justify-center space-x-3 mb-8">
            <div className="w-12 h-12 bg-[#0D3B66] rounded-xl flex items-center justify-center shadow-lg">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-[#0D3B66]">
              VAIKET AI
            </span>
          </div>

          {/* Progress Steps - Mobile */}
          <div className="lg:hidden flex justify-between mb-8">
            {steps.map((stepItem) => (
              <div key={stepItem.number} className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step === stepItem.number 
                    ? 'bg-[#0D3B66] text-white' 
                    : step > stepItem.number 
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  {step > stepItem.number ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    stepItem.icon
                  )}
                </div>
                <span className="text-xs mt-1 text-gray-600">{stepItem.title}</span>
              </div>
            ))}
          </div>

          {/* Form Container */}
          <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 lg:p-10 shadow-2xl shadow-[#0D3B66]/10">
            
            {/* Step Header */}
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
                {step === 1 && "Business Information"}
                {step === 2 && "About Your Business"}
                {step === 3 && "Communication Style"}
              </h2>
              <p className="text-gray-600">
                {step === 1 && "Tell us about your business basics"}
                {step === 2 && "Describe what you do and offer"}
                {step === 3 && "Set your preferred communication tone"}
              </p>
            </div>

            {/* STEP 1 - Business Details */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="group">
                  <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center">
                    <Building2 className="w-4 h-4 mr-2" />
                    Business Name *
                  </label>
                  <input
                    className="w-full bg-gray-50 border border-gray-300 rounded-2xl px-4 py-3 text-gray-800 placeholder-gray-500 focus:border-[#0D3B66] focus:ring-2 focus:ring-[#0D3B66]/20 transition-all duration-300"
                    placeholder="Enter your business name"
                    value={form.businessName}
                    onChange={(e) => update("businessName", e.target.value)}
                  />
                </div>

                <div className="group">
                  <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    Business Category *
                  </label>
                  <select
                    className="w-full bg-gray-50 border border-gray-300 rounded-2xl px-4 py-3 text-gray-800 focus:border-[#0D3B66] focus:ring-2 focus:ring-[#0D3B66]/20 transition-all duration-300"
                    value={form.category}
                    onChange={(e) => update("category", e.target.value)}
                  >
                    <option value="">Select your business type</option>
                    {businessCategories.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="group">
                    <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center">
                      <Phone className="w-4 h-4 mr-2" />
                      Phone Number
                    </label>
                    <input
                      className="w-full bg-gray-50 border border-gray-300 rounded-2xl px-4 py-3 text-gray-800 placeholder-gray-500 focus:border-[#0D3B66] focus:ring-2 focus:ring-[#0D3B66]/20 transition-all duration-300"
                      placeholder="+1 (555) 123-4567"
                      value={form.phone}
                      onChange={(e) => update("phone", e.target.value)}
                    />
                  </div>

                  <div className="group">
                    <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center">
                      <Globe className="w-4 h-4 mr-2" />
                      Website URL
                    </label>
                    <input
                      className="w-full bg-gray-50 border border-gray-300 rounded-2xl px-4 py-3 text-gray-800 placeholder-gray-500 focus:border-[#0D3B66] focus:ring-2 focus:ring-[#0D3B66]/20 transition-all duration-300"
                      placeholder="https://yourbusiness.com"
                      value={form.website}
                      onChange={(e) => update("website", e.target.value)}
                    />
                  </div>
                </div>

                <button
                  onClick={() => setStep(2)}
                  disabled={!form.businessName || !form.category}
                  className="w-full bg-[#0D3B66] hover:bg-[#0A2E4D] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center space-x-2 shadow-lg shadow-[#0D3B66]/25"
                >
                  <span>Continue to Business Details</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* STEP 2 - About Business */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="group">
                  <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    About Your Business *
                  </label>
                  <textarea
                    className="w-full bg-gray-50 border border-gray-300 rounded-2xl px-4 py-3 h-32 text-gray-800 placeholder-gray-500 focus:border-[#0D3B66] focus:ring-2 focus:ring-[#0D3B66]/20 transition-all duration-300 resize-none"
                    placeholder="Describe your business, your mission, and what makes you unique..."
                    value={form.about}
                    onChange={(e) => update("about", e.target.value)}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {form.about.length}/500 characters
                  </div>
                </div>

                <div className="group">
                  <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center">
                    <Target className="w-4 h-4 mr-2" />
                    Services & Offerings *
                  </label>
                  <textarea
                    className="w-full bg-gray-50 border border-gray-300 rounded-2xl px-4 py-3 h-32 text-gray-800 placeholder-gray-500 focus:border-[#0D3B66] focus:ring-2 focus:ring-[#0D3B66]/20 transition-all duration-300 resize-none"
                    placeholder="What services do you provide? List your main offerings..."
                    value={form.services}
                    onChange={(e) => update("services", e.target.value)}
                  />
                </div>

                <div className="group">
                  <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Pricing Information
                  </label>
                  <textarea
                    className="w-full bg-gray-50 border border-gray-300 rounded-2xl px-4 py-3 h-24 text-gray-800 placeholder-gray-500 focus:border-[#0D3B66] focus:ring-2 focus:ring-[#0D3B66]/20 transition-all duration-300 resize-none"
                    placeholder="Starting prices, packages, or pricing structure (optional)"
                    value={form.pricing}
                    onChange={(e) => update("pricing", e.target.value)}
                  />
                </div>

                <div className="flex justify-between space-x-4">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 border border-gray-300 text-gray-700 font-medium py-3.5 rounded-2xl transition-all duration-300 hover:border-gray-400 flex items-center justify-center space-x-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>

                  <button
                    onClick={() => setStep(3)}
                    disabled={!form.about || !form.services}
                    className="flex-1 bg-[#0D3B66] hover:bg-[#0A2E4D] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center space-x-2 shadow-lg shadow-[#0D3B66]/25"
                  >
                    <span>Continue to Preferences</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3 - AI Preferences */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="group">
                  <label className="text-sm font-medium text-gray-700 mb-4 block flex items-center">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Communication Tone *
                  </label>
                  <div className="grid gap-3">
                    {toneOptions.map((tone) => (
                      <label
                        key={tone.value}
                        className={`flex items-start p-4 border-2 rounded-2xl cursor-pointer transition-all duration-200 ${
                          form.tone === tone.value
                            ? 'border-[#0D3B66] bg-[#0D3B66]/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="tone"
                          value={tone.value}
                          checked={form.tone === tone.value}
                          onChange={(e) => update("tone", e.target.value)}
                          className="mt-1 text-[#0D3B66] focus:ring-[#0D3B66]"
                        />
                        <div className="ml-3">
                          <div className="font-medium text-gray-800">{tone.label}</div>
                          <div className="text-sm text-gray-600 mt-1">{tone.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                  <h3 className="text-sm font-semibold text-[#0D3B66] mb-2">Almost Done!</h3>
                  <p className="text-xs text-gray-600">
                    Your AI will use this information to create personalized email responses that match your business style and tone.
                  </p>
                </div>

                <div className="flex justify-between space-x-4">
                  <button
                    onClick={() => setStep(2)}
                    className="flex-1 border border-gray-300 text-gray-700 font-medium py-3.5 rounded-2xl transition-all duration-300 hover:border-gray-400 flex items-center justify-center space-x-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>

                  <button
                    onClick={submitOnboarding}
                    disabled={loading}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center space-x-2 shadow-lg shadow-green-500/25"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        <span>Setting Up...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Complete Setup</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}