"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Step = 0 | 1 | 2;

const stepTitles = [
  "Choose your incoming email",
  "Setup AI + SMTP for replies",
  "Finish & activate automation",
];

const aiTones = [
  { id: "friendly", label: "Friendly", desc: "Warm, human, helpful replies." },
  { id: "formal", label: "Formal", desc: "Professional and to-the-point." },
  { id: "sales", label: "Sales Booster", desc: "Persuasive and conversion-focused." },
  { id: "support", label: "Support Pro", desc: "Clear, calm, support-style replies." },
];

export default function ConnectPage() {
  const [step, setStep] = useState<Step>(0);

  // Step 1 state
  const [incomingOption, setIncomingOption] = useState<"custom" | "vaiket" | "buy" | null>(null);
  const [customIncomingEmail, setCustomIncomingEmail] = useState("");

  // Step 2 state
  const [smtpOption, setSmtpOption] = useState<"same" | "vaiket-smtp" | "custom" | null>(null);
  const [aiTone, setAiTone] = useState<string>("friendly");
  const [customSmtpEmail, setCustomSmtpEmail] = useState("");
  const [customSmtpHost, setCustomSmtpHost] = useState("");
  const [customSmtpPort, setCustomSmtpPort] = useState("");
  const [customSmtpUser, setCustomSmtpUser] = useState("");
  const [customSmtpPass, setCustomSmtpPass] = useState("");

  const canGoNext = () => {
    if (step === 0) {
      if (!incomingOption) return false;
      if (incomingOption === "custom" && !customIncomingEmail.trim()) return false;
      return true;
    }
    if (step === 1) {
      if (!smtpOption) return false;
      if (smtpOption === "custom") {
        return (
          customSmtpEmail.trim() &&
          customSmtpHost.trim() &&
          customSmtpPort.trim() &&
          customSmtpUser.trim() &&
          customSmtpPass.trim()
        );
      }
      return true;
    }
    return true;
  };

  const handleNext = () => {
    if (step < 2 && canGoNext()) {
      setStep((prev) => (prev + 1) as Step);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep((prev) => (prev - 1) as Step);
    }
  };

  const handleFinish = () => {
    // Yaha baad me API call / Supabase insert karein:
    // console.log({
    //   incomingOption,
    //   customIncomingEmail,
    //   smtpOption,
    //   aiTone,
    //   customSmtpEmail,
    //   customSmtpHost,
    //   customSmtpPort,
    //   customSmtpUser,
    //   customSmtpPass,
    // });
    alert("Automation setup saved! (Backend connect karna baaki hai 🙂)");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* gradient top */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-72 bg-gradient-to-b from-violet-500/25 via-slate-950 to-slate-950 opacity-70" />

      <main className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-4 pb-12 pt-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-10 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
        >
          <div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Start email automation for your business
            </h1>
            <p className="mt-2 text-sm text-slate-300 md:text-base">
              Connect your inbox, choose AI tone, and launch automation in under 2 minutes.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/40 bg-slate-900/60 px-3 py-1 text-xs text-violet-200 shadow-lg shadow-violet-500/20 md:text-sm">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Automation status: Not activated</span>
          </div>
        </motion.div>

        {/* Stepper */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between gap-3">
            {[0, 1, 2].map((index) => {
              const isActive = step === index;
              const isDone = step > index;
              return (
                <div key={index} className="flex w-full flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={[
                        "flex h-8 w-8 items-center justify-center rounded-full border text-sm font-medium transition-all",
                        isActive
                          ? "border-violet-400 bg-violet-500 text-white shadow-lg shadow-violet-500/50"
                          : isDone
                          ? "border-emerald-400 bg-emerald-500 text-white"
                          : "border-slate-600 bg-slate-900 text-slate-300",
                      ].join(" ")}
                    >
                      {isDone ? "✓" : index + 1}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs uppercase tracking-wide text-slate-400">
                        Step {index + 1}
                      </span>
                      <span className="text-sm font-medium text-slate-100">
                        {stepTitles[index]}
                      </span>
                    </div>
                  </div>
                  {index < 2 && (
                    <div className="ml-4 h-1 w-full rounded-full bg-slate-800">
                      <div
                        className={[
                          "h-1 rounded-full transition-all",
                          step > index ? "bg-emerald-400" : "bg-slate-700",
                        ].join(" ")}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Card wrapper */}
        <section className="relative flex-1">
          <motion.div
            className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70 p-4 shadow-2xl shadow-black/60 backdrop-blur md:p-6 lg:p-8"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            {/* subtle gradient blobs */}
            <div className="pointer-events-none absolute -left-24 -top-24 h-52 w-52 rounded-full bg-violet-600/20 blur-3xl" />
            <div className="pointer-events-none absolute -right-24 -bottom-24 h-52 w-52 rounded-full bg-emerald-500/20 blur-3xl" />

            <AnimatePresence mode="wait">
              {step === 0 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.25 }}
                  className="relative"
                >
                  <Step1IncomingEmail
                    incomingOption={incomingOption}
                    setIncomingOption={setIncomingOption}
                    customIncomingEmail={customIncomingEmail}
                    setCustomIncomingEmail={setCustomIncomingEmail}
                  />
                </motion.div>
              )}

              {step === 1 && (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.25 }}
                  className="relative"
                >
                  <Step2SmtpAndAi
                    smtpOption={smtpOption}
                    setSmtpOption={setSmtpOption}
                    aiTone={aiTone}
                    setAiTone={setAiTone}
                    customSmtpEmail={customSmtpEmail}
                    setCustomSmtpEmail={setCustomSmtpEmail}
                    customSmtpHost={customSmtpHost}
                    setCustomSmtpHost={setCustomSmtpHost}
                    customSmtpPort={customSmtpPort}
                    setCustomSmtpPort={setCustomSmtpPort}
                    customSmtpUser={customSmtpUser}
                    setCustomSmtpUser={setCustomSmtpUser}
                    customSmtpPass={customSmtpPass}
                    setCustomSmtpPass={setCustomSmtpPass}
                  />
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step-3"
                  initial={{ opacity: 0, y: 16, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -16, scale: 0.98 }}
                  transition={{ duration: 0.25 }}
                  className="relative"
                >
                  <Step3Success
                    incomingOption={incomingOption}
                    customIncomingEmail={customIncomingEmail}
                    smtpOption={smtpOption}
                    aiTone={aiTone}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer buttons */}
            <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-slate-800 pt-4 text-sm text-slate-300 md:flex-row">
              <div className="flex items-center gap-2 text-xs md:text-sm">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-[10px] font-semibold text-slate-200">
                  ?
                </span>
                <span>
                  Need help?{" "}
                  <button className="underline decoration-dotted underline-offset-4">
                    Chat with Vaiket support
                  </button>
                </span>
              </div>

              <div className="flex items-center gap-2">
                {step > 0 && (
                  <button
                    onClick={handleBack}
                    className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-200 hover:border-slate-500 hover:bg-slate-800 md:text-sm"
                  >
                    Back
                  </button>
                )}

                {step < 2 && (
                  <button
                    onClick={handleNext}
                    disabled={!canGoNext()}
                    className="rounded-full bg-violet-500 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-violet-500/40 transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:bg-violet-800 disabled:shadow-none md:text-sm"
                  >
                    Continue
                  </button>
                )}

                {step === 2 && (
                  <button
                    onClick={handleFinish}
                    className="rounded-full bg-emerald-500 px-5 py-2 text-xs font-semibold text-slate-950 shadow-lg shadow-emerald-500/40 transition hover:bg-emerald-400 md:text-sm"
                  >
                    Start automation now 🚀
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </section>
      </main>
    </div>
  );
}

// STEP 1 COMPONENT
interface Step1Props {
  incomingOption: "custom" | "vaiket" | "buy" | null;
  setIncomingOption: (val: "custom" | "vaiket" | "buy") => void;
  customIncomingEmail: string;
  setCustomIncomingEmail: (val: string) => void;
}

function Step1IncomingEmail({
  incomingOption,
  setIncomingOption,
  customIncomingEmail,
  setCustomIncomingEmail,
}: Step1Props) {
  return (
    <div className="relative">
      <div className="mb-6 max-w-xl">
        <h2 className="text-xl font-semibold text-slate-50 md:text-2xl">
          Step 1 — Which email should receive customer messages?
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          This is where your customers send their queries. We’ll connect this inbox via IMAP and
          keep it in sync.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Option 1: Custom domain */}
        <button
          type="button"
          onClick={() => setIncomingOption("custom")}
          className={[
            "group flex flex-col justify-between rounded-2xl border p-4 text-left text-sm transition hover:border-violet-400/80 hover:bg-slate-900/80",
            incomingOption === "custom"
              ? "border-violet-500 bg-slate-900/90 shadow-lg shadow-violet-500/30"
              : "border-slate-700 bg-slate-900/60",
          ].join(" ")}
        >
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-50">Use your own domain email</h3>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">
                Popular
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-300">
              Example: <span className="font-mono text-slate-100">support@yourbusiness.com</span>
            </p>
            {incomingOption === "custom" && (
              <div className="mt-3 space-y-2">
                <label className="text-[11px] uppercase tracking-wide text-slate-400">
                  Enter your email
                </label>
                <input
                  type="email"
                  placeholder="you@yourdomain.com"
                  value={customIncomingEmail}
                  onChange={(e) => setCustomIncomingEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-100 outline-none ring-violet-500/50 focus:border-violet-500 focus:ring-1"
                />
                <p className="text-[11px] text-slate-400">
                  We’ll ask IMAP details in the next step if needed.
                </p>
              </div>
            )}
          </div>
        </button>

        {/* Option 2: Vaiket business email */}
        <button
          type="button"
          onClick={() => setIncomingOption("vaiket")}
          className={[
            "group flex flex-col justify-between rounded-2xl border p-4 text-left text-sm transition hover:border-violet-400/80 hover:bg-slate-900/80",
            incomingOption === "vaiket"
              ? "border-violet-500 bg-slate-900/90 shadow-lg shadow-violet-500/30"
              : "border-slate-700 bg-slate-900/60",
          ].join(" ")}
        >
          <div>
            <h3 className="font-semibold text-slate-50">Use Vaiket business email</h3>
            <p className="mt-2 text-xs text-slate-300">
              Instantly get a ready-to-use inbox:{" "}
              <span className="font-mono text-emerald-300">
                yourbusiness@vaiket.com
              </span>
            </p>
            <p className="mt-2 text-[11px] text-emerald-300">
              Zero setup. Managed & secured by Vaiket.
            </p>
          </div>
        </button>

        {/* Option 3: Buy custom email */}
        <button
          type="button"
          onClick={() => setIncomingOption("buy")}
          className={[
            "group flex flex-col justify-between rounded-2xl border p-4 text-left text-sm transition hover:border-violet-400/80 hover:bg-slate-900/80",
            incomingOption === "buy"
              ? "border-violet-500 bg-slate-900/90 shadow-lg shadow-violet-500/30"
              : "border-slate-700 bg-slate-900/60",
          ].join(" ")}
        >
          <div>
            <h3 className="font-semibold text-slate-50">I don&apos;t have a custom email</h3>
            <p className="mt-2 text-xs text-slate-300">
              Get a professional email like{" "}
              <span className="font-mono">hello@yourbrand.com</span> with 1-click setup.
            </p>
          </div>
          <div className="mt-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-3 py-1 text-[11px] font-semibold text-white shadow shadow-violet-500/40">
              Get custom email now
              <span className="text-xs">→</span>
            </span>
            <p className="mt-1 text-[11px] text-slate-400">
              You can finish purchase and come back to connect.
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}

// STEP 2 COMPONENT
interface Step2Props {
  smtpOption: "same" | "vaiket-smtp" | "custom" | null;
  setSmtpOption: (val: "same" | "vaiket-smtp" | "custom") => void;
  aiTone: string;
  setAiTone: (val: string) => void;
  customSmtpEmail: string;
  setCustomSmtpEmail: (val: string) => void;
  customSmtpHost: string;
  setCustomSmtpHost: (val: string) => void;
  customSmtpPort: string;
  setCustomSmtpPort: (val: string) => void;
  customSmtpUser: string;
  setCustomSmtpUser: (val: string) => void;
  customSmtpPass: string;
  setCustomSmtpPass: (val: string) => void;
}

function Step2SmtpAndAi({
  smtpOption,
  setSmtpOption,
  aiTone,
  setAiTone,
  customSmtpEmail,
  setCustomSmtpEmail,
  customSmtpHost,
  setCustomSmtpHost,
  customSmtpPort,
  setCustomSmtpPort,
  customSmtpUser,
  setCustomSmtpUser,
  customSmtpPass,
  setCustomSmtpPass,
}: Step2Props) {
  return (
    <div className="relative">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xl">
          <h2 className="text-xl font-semibold text-slate-50 md:text-2xl">
            Step 2 — Choose SMTP & AI reply tone
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            This email will be used to send automatic replies. Pick a tone that matches your brand
            voice.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-3 text-xs text-slate-300">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Live preview
          </div>
          <p className="text-[11px] leading-relaxed">
            <span className="text-slate-400">AI reply sample:</span> &quot;Hi there! 👋 Thanks for
            reaching out. We&apos;ve received your message and our team will get back to you
            shortly…&quot;
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr,1fr]">
        {/* Left side – SMTP options */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-100">
            Which email should send replies? (SMTP)
          </h3>

          <div className="space-y-3">
            {/* same as incoming */}
            <button
              type="button"
              onClick={() => setSmtpOption("same")}
              className={[
                "w-full rounded-2xl border p-3 text-left text-xs transition hover:border-violet-400/80 hover:bg-slate-900/80",
                smtpOption === "same"
                  ? "border-violet-500 bg-slate-900/90 shadow-md shadow-violet-500/30"
                  : "border-slate-700 bg-slate-900/60",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-slate-50">Use same email as Step 1</span>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                  Simple
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-300">
                Incoming & outgoing from the same inbox. Good for small teams.
              </p>
            </button>

            {/* Vaiket SMTP */}
            <button
              type="button"
              onClick={() => setSmtpOption("vaiket-smtp")}
              className={[
                "w-full rounded-2xl border p-3 text-left text-xs transition hover:border-violet-400/80 hover:bg-slate-900/80",
                smtpOption === "vaiket-smtp"
                  ? "border-violet-500 bg-slate-900/90 shadow-md shadow-violet-500/30"
                  : "border-slate-700 bg-slate-900/60",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-slate-50">Use Vaiket SMTP (recommended)</span>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300">
                  High deliverability
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-300">
                Replies are sent via{" "}
                <span className="font-mono text-emerald-300">
                  yourbusinesssmtp@vaiket.com
                </span>{" "}
                with optimized delivery settings.
              </p>
            </button>

            {/* Custom SMTP */}
            <div
              className={[
                "w-full rounded-2xl border p-3 text-left text-xs transition",
                smtpOption === "custom"
                  ? "border-violet-500 bg-slate-900/90 shadow-md shadow-violet-500/30"
                  : "border-slate-700 bg-slate-900/60 hover:border-violet-400/80 hover:bg-slate-900/80",
              ].join(" ")}
            >
              <button
                type="button"
                onClick={() => setSmtpOption("custom")}
                className="flex w-full items-center justify-between gap-2"
              >
                <span className="font-medium text-slate-50">Bring your own SMTP</span>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                  Advanced
                </span>
              </button>

              {smtpOption === "custom" && (
                <div className="mt-3 space-y-2">
                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">From email</label>
                      <input
                        type="email"
                        value={customSmtpEmail}
                        onChange={(e) => setCustomSmtpEmail(e.target.value)}
                        placeholder="no-reply@yourdomain.com"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-[11px] text-slate-100 outline-none ring-violet-500/50 focus:border-violet-500 focus:ring-1"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">SMTP host</label>
                      <input
                        value={customSmtpHost}
                        onChange={(e) => setCustomSmtpHost(e.target.value)}
                        placeholder="smtp.yourprovider.com"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-[11px] text-slate-100 outline-none ring-violet-500/50 focus:border-violet-500 focus:ring-1"
                      />
                    </div>
                  </div>

                  <div className="grid gap-2 md:grid-cols-[1fr,1fr]">
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">Port</label>
                      <input
                        value={customSmtpPort}
                        onChange={(e) => setCustomSmtpPort(e.target.value)}
                        placeholder="465"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-[11px] text-slate-100 outline-none ring-violet-500/50 focus:border-violet-500 focus:ring-1"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">Username</label>
                      <input
                        value={customSmtpUser}
                        onChange={(e) => setCustomSmtpUser(e.target.value)}
                        placeholder="SMTP username"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-[11px] text-slate-100 outline-none ring-violet-500/50 focus:border-violet-500 focus:ring-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">Password / App password</label>
                    <input
                      type="password"
                      value={customSmtpPass}
                      onChange={(e) => setCustomSmtpPass(e.target.value)}
                      placeholder="••••••••••"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-[11px] text-slate-100 outline-none ring-violet-500/50 focus:border-violet-500 focus:ring-1"
                    />
                    <p className="text-[10px] text-slate-500">
                      Use app password if your provider requires 2FA.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right side – AI tone selector */}
        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <h3 className="text-sm font-semibold text-slate-100">Choose AI tone</h3>
          <p className="text-xs text-slate-300">
            Vaiket AI will use this style when answering customer emails.
          </p>
          <div className="space-y-2">
            {aiTones.map((tone) => (
              <button
                key={tone.id}
                type="button"
                onClick={() => setAiTone(tone.id)}
                className={[
                  "flex w-full flex-col items-start rounded-2xl border px-3 py-2 text-left text-xs transition hover:border-violet-400/80 hover:bg-slate-900",
                  aiTone === tone.id
                    ? "border-violet-500 bg-slate-900 shadow-md shadow-violet-500/30"
                    : "border-slate-700 bg-slate-900/40",
                ].join(" ")}
              >
                <span className="font-medium text-slate-50">{tone.label}</span>
                <span className="mt-1 text-[11px] text-slate-300">{tone.desc}</span>
              </button>
            ))}
          </div>
          <div className="mt-2 rounded-xl bg-slate-900/70 p-3 text-[11px] text-slate-300">
            <span className="font-semibold text-slate-100">Tip:</span> You can change the tone
            anytime from settings. Start with{" "}
            <span className="font-semibold text-emerald-300">Friendly</span> for best results.
          </div>
        </div>
      </div>
    </div>
  );
}

// STEP 3 COMPONENT
interface Step3Props {
  incomingOption: "custom" | "vaiket" | "buy" | null;
  customIncomingEmail: string;
  smtpOption: "same" | "vaiket-smtp" | "custom" | null;
  aiTone: string;
}

function Step3Success({
  incomingOption,
  customIncomingEmail,
  smtpOption,
  aiTone,
}: Step3Props) {
  const incomingLabel =
    incomingOption === "custom"
      ? customIncomingEmail || "your custom domain email"
      : incomingOption === "vaiket"
      ? "yourbusiness@vaiket.com"
      : "to be configured";

  const smtpLabel =
    smtpOption === "same"
      ? "Same as incoming email"
      : smtpOption === "vaiket-smtp"
      ? "yourbusinesssmtp@vaiket.com (Vaiket SMTP)"
      : smtpOption === "custom"
      ? "Custom SMTP"
      : "Not set";

  const toneLabel =
    aiTones.find((t) => t.id === aiTone)?.label ?? "Friendly";

  return (
    <div className="relative">
      <div className="mb-6 max-w-xl">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-50 md:text-2xl">
          🎉 Congratulations — your email AI automation is almost ready!
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          Review your setup below and click &quot;Start automation&quot; to begin processing
          customer emails in real-time.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-3 rounded-2xl border border-emerald-500/60 bg-slate-900/80 p-4 text-sm shadow-lg shadow-emerald-500/30">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
            Incoming email (IMAP)
          </h3>
          <p className="font-mono text-[11px] text-emerald-100">{incomingLabel}</p>
          <p className="text-[11px] text-slate-300">
            Customer queries will be synced from this inbox.
          </p>
        </div>

        <div className="space-y-3 rounded-2xl border border-violet-500/60 bg-slate-900/80 p-4 text-sm shadow-lg shadow-violet-500/30">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-violet-300">
            Outgoing email (SMTP)
          </h3>
          <p className="font-mono text-[11px] text-violet-100">{smtpLabel}</p>
          <p className="text-[11px] text-slate-300">
            AI-powered replies will be sent using this configuration.
          </p>
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-700 bg-slate-900/80 p-4 text-sm">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
            AI reply tone
          </h3>
          <p className="text-sm font-medium text-slate-50">{toneLabel}</p>
          <p className="text-[11px] text-slate-300">
            You can fine-tune tone templates from settings anytime.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-[1.5fr,1fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-300">
          <h4 className="mb-2 text-sm font-semibold text-slate-100">
            What happens after you activate?
          </h4>
          <ul className="space-y-1">
            <li>• New customer emails will be fetched via IMAP every few seconds.</li>
            <li>• Vaiket AI will understand intent, priority and sentiment.</li>
            <li>• Smart replies will be generated and sent from your SMTP.</li>
            <li>• All conversations will be visible inside your Vaiket dashboard.</li>
          </ul>
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-300">
          <h4 className="text-sm font-semibold text-slate-100">Subscription & limits</h4>
          <p>
            Current plan: <span className="font-semibold text-emerald-300">Starter (₹499/mo)</span>
          </p>
          <p>Includes up to 3 connected inboxes and 3,000 AI replies/month.</p>
          <button className="mt-2 inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] font-medium text-slate-100 hover:border-slate-500 hover:bg-slate-800">
            View plans & upgrade →
          </button>
        </div>
      </div>
    </div>
  );
}
