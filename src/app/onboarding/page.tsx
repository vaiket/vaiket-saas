"use client";

import Image from "next/image";
import { Inter } from "next/font/google";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bot,
  Building2,
  CircleAlert,
  CircleCheckBig,
  FileText,
  Globe,
  IndianRupee,
  MessageSquareText,
  Phone,
  Sparkles,
  Target,
} from "lucide-react";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

type FormState = {
  businessName: string;
  category: string;
  phone: string;
  website: string;
  about: string;
  services: string;
  pricing: string;
  tone: string;
};

const STEPS = [
  { number: 1, title: "Company Basics" },
  { number: 2, title: "What You Offer" },
  { number: 3, title: "AI Voice" },
] as const;

const BUSINESS_CATEGORIES = [
  "IT Services",
  "SaaS Product",
  "D2C / Ecommerce",
  "Agency",
  "Healthcare",
  "EdTech",
  "FinTech",
  "Real Estate",
  "Local Services",
  "Manufacturing",
  "Other",
];

const TONE_OPTIONS = [
  {
    value: "professional",
    label: "Professional",
    description: "Clear, polite and business-standard communication.",
  },
  {
    value: "friendly",
    label: "Friendly",
    description: "Warm and approachable tone with human feel.",
  },
  {
    value: "consultative",
    label: "Consultative",
    description: "Advisory style focused on solving customer goals.",
  },
  {
    value: "energetic",
    label: "Energetic",
    description: "High-energy responses for sales and campaigns.",
  },
];

const INITIAL_FORM: FormState = {
  businessName: "",
  category: "",
  phone: "",
  website: "",
  about: "",
  services: "",
  pricing: "",
  tone: "professional",
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  const completion = useMemo(() => Math.round((step / 3) * 100), [step]);

  const update = (key: keyof FormState, value: string) => {
    setError("");
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const canContinueStep1 = form.businessName.trim().length > 1 && form.category.trim().length > 0;
  const canContinueStep2 = form.about.trim().length >= 20 && form.services.trim().length >= 10;

  const continueFromStep1 = () => {
    if (form.businessName.trim().length < 2) {
      setError("Business name must be at least 2 characters.");
      return;
    }
    if (!form.category.trim()) {
      setError("Please select your business category.");
      return;
    }
    setError("");
    setStep(2);
  };

  const continueFromStep2 = () => {
    if (form.about.trim().length < 20) {
      setError("Please add at least 20 characters in About your business.");
      return;
    }
    if (form.services.trim().length < 10) {
      setError("Please add at least 10 characters in Services / Products.");
      return;
    }
    setError("");
    setStep(3);
  };

  const submitOnboarding = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
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
      if (!json.success) {
        setError(json.error || "Unable to save onboarding details.");
        setLoading(false);
        return;
      }

      router.replace("/dashboard");
    } catch {
      setError("Network issue. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className={`${inter.className} min-h-screen bg-[#F8FAFC]`}>
      <div className="grid min-h-screen lg:grid-cols-[1.04fr_1fr]">
        <aside className="relative hidden overflow-hidden border-r border-slate-200/80 bg-[radial-gradient(circle_at_10%_15%,rgba(79,70,229,0.18),transparent_45%),linear-gradient(180deg,#F8FAFC_0%,#EEF2FF_45%,#E2E8F0_100%)] px-12 py-10 lg:flex lg:flex-col">
          <div className="absolute -right-16 top-24 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="absolute -left-10 bottom-10 h-64 w-64 rounded-full bg-sky-400/10 blur-3xl" />

          <div className="relative z-10">
            <Image
              src="/vaiket-bridge-logo.svg"
              alt="Vaiket Bridge"
              width={360}
              height={96}
              className="h-auto w-[310px]"
              priority
            />
          </div>

          <div className="relative z-10 mt-10 max-w-md">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-300/70 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
              <Sparkles className="h-3.5 w-3.5" />
              Built For India Startups
            </span>

            <h1 className="mt-5 text-4xl font-semibold leading-tight text-slate-900">
              Set up your automation workspace in under 3 minutes.
            </h1>

            <p className="mt-4 text-[15px] leading-relaxed text-slate-600">
              Share your startup profile once. Vaiket will personalize inbox replies,
              lead follow-ups, and campaign messaging for your exact business context.
            </p>
          </div>

          <div className="relative z-10 mt-8 space-y-4">
            <FeatureLine
              icon={<BadgeCheck className="h-4 w-4" />}
              text="Startup-ready templates and AI reply quality control"
            />
            <FeatureLine
              icon={<Target className="h-4 w-4" />}
              text="Better conversion-focused messaging for Indian market"
            />
            <FeatureLine
              icon={<IndianRupee className="h-4 w-4" />}
              text="Cost-efficient operations with smart automation routing"
            />
          </div>

          <div className="relative z-10 mt-auto rounded-2xl border border-slate-300/60 bg-white/70 p-4 backdrop-blur">
            <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-600">
              <span>Workspace setup progress</span>
              <span>{completion}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-indigo-600 to-indigo-500 transition-all duration-500"
                style={{ width: `${completion}%` }}
              />
            </div>
          </div>
        </aside>

        <main className="flex items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
          <div className="w-full max-w-2xl">
            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Image
                    src="/vaiket-bridge-mark.svg"
                    alt="Vaiket"
                    width={34}
                    height={34}
                    className="h-8 w-8 sm:h-9 sm:w-9"
                  />
                  <div>
                    <p className="text-[13px] font-semibold text-slate-800 sm:text-sm">
                      Onboarding Setup
                    </p>
                    <p className="text-[11px] text-slate-500 sm:text-xs">
                      Complete your profile to continue
                    </p>
                  </div>
                </div>
                <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">
                  Step {step}/3
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {STEPS.map((item) => {
                  const isDone = step > item.number;
                  const isActive = step === item.number;
                  return (
                    <div
                      key={item.number}
                      className={`rounded-xl border px-2 py-2 text-center sm:px-3 ${
                        isDone
                          ? "border-emerald-200 bg-emerald-50"
                          : isActive
                            ? "border-indigo-300 bg-indigo-50"
                            : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold sm:h-7 sm:w-7 sm:text-xs">
                        {isDone ? (
                          <CircleCheckBig className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <span className={isActive ? "text-indigo-700" : "text-slate-500"}>
                            {item.number}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-[11px] font-medium text-slate-700 sm:text-xs">
                        {item.title}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_10px_40px_rgba(15,23,42,0.06)] sm:p-8">
              <div className="mb-7">
                <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                  {step === 1 && "Tell us about your startup"}
                  {step === 2 && "Business positioning and offerings"}
                  {step === 3 && "Pick your brand communication style"}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  {step === 1 && "Basic details help create your tenant identity and defaults."}
                  {step === 2 && "This context improves reply quality, lead qualification, and campaigns."}
                  {step === 3 && "Set voice tone so automation feels consistent with your brand."}
                </p>
              </div>

              {error && (
                <div className="mb-5 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                  <CircleAlert className="mt-0.5 h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-5">
                  <Field
                    label="Business Name *"
                    icon={<Building2 className="h-4 w-4" />}
                    value={form.businessName}
                    onChange={(value) => update("businessName", value)}
                    placeholder="e.g. Vaiket Technologies Pvt Ltd"
                  />

                  <div>
                    <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                      <Bot className="h-4 w-4 text-slate-500" />
                      Business Category *
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) => update("category", e.target.value)}
                      className="h-12 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                    >
                      <option value="">Select your category</option>
                      {BUSINESS_CATEGORIES.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Phone Number"
                      icon={<Phone className="h-4 w-4" />}
                      value={form.phone}
                      onChange={(value) => update("phone", value)}
                      placeholder="+91 98XXXXXXXX"
                    />
                    <Field
                      label="Website URL"
                      icon={<Globe className="h-4 w-4" />}
                      value={form.website}
                      onChange={(value) => update("website", value)}
                      placeholder="https://yourstartup.com"
                    />
                  </div>

                  <ActionRow
                    right={
                      <button
                        onClick={continueFromStep1}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
                      >
                        Continue
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    }
                  />
                  {!canContinueStep1 && (
                    <p className="text-xs text-slate-500">
                      Add business name and category to continue.
                    </p>
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <TextareaField
                    label="About Your Business *"
                    icon={<FileText className="h-4 w-4" />}
                    value={form.about}
                    onChange={(value) => update("about", value)}
                    placeholder="Describe your startup, audience, and what value you deliver."
                    hint={`${form.about.length}/600 characters`}
                  />

                  <TextareaField
                    label="Services / Products *"
                    icon={<Target className="h-4 w-4" />}
                    value={form.services}
                    onChange={(value) => update("services", value)}
                    placeholder="List your key offerings and use-cases."
                    hint="Mention top 3-5 offerings for better AI suggestions."
                  />

                  <TextareaField
                    label="Pricing Information"
                    icon={<IndianRupee className="h-4 w-4" />}
                    value={form.pricing}
                    onChange={(value) => update("pricing", value)}
                    placeholder="Optional: starting plans, retainers, package pricing."
                  />

                  <ActionRow
                    left={
                      <button
                        onClick={() => setStep(1)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                      </button>
                    }
                    right={
                      <button
                        onClick={continueFromStep2}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
                      >
                        Continue
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    }
                  />
                  {!canContinueStep2 && (
                    <p className="text-xs text-slate-500">
                      About (20+ chars) and Services (10+ chars) required.
                    </p>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                      <MessageSquareText className="h-4 w-4 text-slate-500" />
                      Preferred Tone *
                    </label>
                    <div className="grid gap-3">
                      {TONE_OPTIONS.map((tone) => {
                        const active = form.tone === tone.value;
                        return (
                          <label
                            key={tone.value}
                            className={`cursor-pointer rounded-xl border p-3.5 transition ${
                              active
                                ? "border-indigo-300 bg-indigo-50"
                                : "border-slate-200 bg-slate-50 hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="radio"
                                name="tone"
                                value={tone.value}
                                checked={active}
                                onChange={(e) => update("tone", e.target.value)}
                                className="mt-0.5 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                              />
                              <div>
                                <p className="text-sm font-semibold text-slate-800">{tone.label}</p>
                                <p className="mt-0.5 text-xs text-slate-600">{tone.description}</p>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3.5">
                    <p className="text-xs font-medium text-indigo-800">
                      Final step: After save, we configure your workspace defaults and mark onboarding complete.
                    </p>
                  </div>

                  <ActionRow
                    left={
                      <button
                        onClick={() => setStep(2)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                      </button>
                    }
                    right={
                      <button
                        onClick={submitOnboarding}
                        disabled={loading}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {loading ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <CircleCheckBig className="h-4 w-4" />
                            Complete Setup
                          </>
                        )}
                      </button>
                    }
                  />
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
        <span className="text-slate-500">{icon}</span>
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
      />
    </div>
  );
}

function TextareaField({
  label,
  icon,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
        <span className="text-slate-500">{icon}</span>
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-28 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
      />
      {hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function FeatureLine({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200/70 bg-white/70 px-3 py-2.5">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
        {icon}
      </span>
      <span className="text-sm text-slate-700">{text}</span>
    </div>
  );
}

function ActionRow({
  left,
  right,
}: {
  left?: React.ReactNode;
  right: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:justify-between">
      <div>{left}</div>
      <div className="sm:ml-auto">{right}</div>
    </div>
  );
}
