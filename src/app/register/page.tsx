"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Lock,
  Mail,
  Rocket,
  Sparkles,
  Target,
  User2,
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [inviteToken, setInviteToken] = useState("");
  const [invitedEmail, setInvitedEmail] = useState("");
  const isInviteFlow = inviteToken.length > 0;

  const [data, setData] = useState({
    name: "",
    email: "",
    password: "",
    business: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const passwordStrength = useMemo(() => {
    const password = data.password;
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^a-zA-Z\d]/.test(password)) score += 1;
    return score;
  }, [data.password]);

  const passwordRequirements = useMemo(
    () => [
      { label: "8+ characters", met: data.password.length >= 8 },
      {
        label: "Upper + lower case",
        met: /[a-z]/.test(data.password) && /[A-Z]/.test(data.password),
      },
      { label: "One number", met: /\d/.test(data.password) },
      { label: "One symbol", met: /[^a-zA-Z\d]/.test(data.password) },
    ],
    [data.password]
  );

  useEffect(() => {
    let alive = true;

    async function initPageState() {
      if (typeof window === "undefined") return;

      const params = new URLSearchParams(window.location.search);
      const token = params.get("inviteToken")?.trim() ?? "";
      const email = params.get("email")?.trim().toLowerCase() ?? "";
      if (alive) {
        setInviteToken(token);
        setInvitedEmail(email);
      }

      try {
        const meRes = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });
        const meData = await meRes.json().catch(() => null);

        if (!alive) return;

        if (meRes.ok && meData?.success) {
          window.location.replace("/dashboard");
          return;
        }
      } catch {
        // Keep user on register page when auth check fails.
      } finally {
        if (alive) {
          setIsAuthChecking(false);
        }
      }
    }

    initPageState();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!invitedEmail) return;
    setData((prev) => ({ ...prev, email: invitedEmail }));
  }, [invitedEmail]);

  function handleGoogleRegister() {
    if (isInviteFlow) {
      setError("Use email and password to accept this invitation.");
      return;
    }
    window.location.href = "/api/auth/google/login?intent=signup";
  }

  async function handleRegister() {
    setIsLoading(true);
    setError("");

    if (!data.name || !data.email || !data.password || (!isInviteFlow && !data.business)) {
      setError("Please fill all fields");
      setIsLoading(false);
      return;
    }

    if (isInviteFlow && invitedEmail && data.email.trim().toLowerCase() !== invitedEmail) {
      setError(`This invitation is for ${invitedEmail}`);
      setIsLoading(false);
      return;
    }

    if (data.password.length < 8) {
      setError("Password must be at least 8 characters");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          inviteToken: isInviteFlow ? inviteToken : undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error || "Registration failed");
        setIsLoading(false);
        return;
      }

      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();

      if (meData.success) {
        if (!meData.user.onboardingCompleted) {
          router.push("/onboarding");
        } else {
          router.push("/dashboard");
        }
      } else {
        setError("Authentication failed");
      }
    } catch (err) {
      console.error("Register network error:", err);
      setError("Network error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  const strengthLabel = ["Very weak", "Weak", "Fair", "Good", "Strong"][passwordStrength];
  const strengthWidth = ["w-[8%]", "w-[30%]", "w-[55%]", "w-[78%]", "w-full"][passwordStrength];
  const strengthTone = [
    "bg-rose-500",
    "bg-amber-500",
    "bg-yellow-500",
    "bg-cyan-600",
    "bg-emerald-600",
  ][passwordStrength];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_0%_0%,#d1fae5_0%,#f8fafc_35%,#f8fafc_100%)] px-4 py-10 sm:px-6 lg:px-10">
      {isAuthChecking ? (
        <div className="mx-auto flex min-h-[70vh] w-full max-w-4xl items-center justify-center">
          <div className="rounded-2xl border border-slate-200 bg-white/90 px-5 py-4 text-sm font-medium text-slate-700 shadow-sm">
            Checking your session...
          </div>
        </div>
      ) : null}

      {!isAuthChecking ? (
        <>
      <div className="pointer-events-none absolute -left-20 top-20 h-72 w-72 rounded-full bg-teal-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-12 bottom-14 h-72 w-72 rounded-full bg-cyan-200/40 blur-3xl" />

      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="enter-fade order-2 rounded-3xl border border-teal-100/90 bg-[linear-gradient(140deg,#0b1f2a_0%,#0f4c5c_58%,#1e7f8c_100%)] p-7 text-white shadow-[0_35px_65px_-35px_rgba(15,76,92,0.55)] sm:p-9 lg:order-1">
          <div className="mb-8 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/14 ring-1 ring-white/35">
              <Sparkles className="h-5 w-5" />
            </div>
            <h1 className="font-space text-2xl tracking-tight">Vaiket</h1>
          </div>

          <div className="enter-fade delay-1 max-w-xl">
            <p className="mb-4 inline-flex rounded-full border border-teal-100/35 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-100/90">
              Business Growth Platform
            </p>
            <h2 className="font-space text-3xl leading-tight sm:text-[2.5rem]">
              Launch your business presence in minutes - not months.
            </h2>
            <p className="mt-5 max-w-lg text-[15px] leading-7 text-teal-100/90">
              Create your verified Vaiket business profile, get discovered by real customers, and start receiving
              leads without marketing stress.
            </p>
          </div>

          <div className="enter-fade delay-2 mt-8 space-y-4">
            <div className="rounded-2xl border border-white/25 bg-white/10 p-4 backdrop-blur-sm">
              <div className="mb-3 flex items-center gap-2">
                <Rocket className="h-4 w-4 text-emerald-200" />
                <p className="text-sm font-semibold text-white">Instant Online Presence</p>
              </div>
              <p className="text-sm leading-6 text-teal-100/90">
                Your business gets a professional page, branding badge, and discoverability from day one.
              </p>
            </div>

            <div className="rounded-2xl border border-white/25 bg-white/10 p-4 backdrop-blur-sm">
              <div className="mb-3 flex items-center gap-2">
                <Target className="h-4 w-4 text-emerald-200" />
                <p className="text-sm font-semibold text-white">Real Customer Leads</p>
              </div>
              <p className="text-sm leading-6 text-teal-100/90">
                People searching for services in your city can find and contact you directly.
              </p>
            </div>

            <div className="rounded-2xl border border-white/25 bg-white/10 p-4 backdrop-blur-sm">
              <div className="mb-3 flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-emerald-200" />
                <p className="text-sm font-semibold text-white">Verified Recognition</p>
              </div>
              <p className="text-sm leading-6 text-teal-100/90">
                Get a digital recognition certificate that builds trust with customers.
              </p>
            </div>
          </div>

          <div className="enter-fade delay-3 mt-7 flex items-center gap-2 text-sm text-teal-100/95">
            <CheckCircle2 className="h-4 w-4 text-emerald-200" />
            Production-ready tenant onboarding for serious businesses.
          </div>
        </section>

        <section className="enter-fade delay-2 order-1 rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-[0_30px_60px_-35px_rgba(15,23,42,0.35)] backdrop-blur sm:p-8 lg:order-2">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                {isInviteFlow ? "Accept Invitation" : "Create Account"}
              </p>
              <h3 className="font-space mt-2 text-2xl text-slate-900">
                {isInviteFlow ? "Join workspace team" : "Start your workspace"}
              </h3>
            </div>
            <span className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
              Enterprise
            </span>
          </div>

          {!isInviteFlow && (
            <button
              type="button"
              onClick={handleGoogleRegister}
              disabled={isLoading}
              className="mb-5 flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>
          )}

          <div className="mb-5 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            {isInviteFlow ? "complete invitation" : "or register manually"}
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Full Name</span>
              <div className="relative">
                <User2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={data.name}
                  onChange={(e) => setData({ ...data, name: e.target.value })}
                  placeholder="Aman Kumar"
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Work Email</span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={data.email}
                  onChange={(e) => setData({ ...data, email: e.target.value })}
                  placeholder="name@company.com"
                  disabled={Boolean(isInviteFlow && invitedEmail)}
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Password</span>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={data.password}
                  onChange={(e) => setData({ ...data, password: e.target.value })}
                  placeholder="Create a strong password"
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-16 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              {data.password && (
                <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-600">Strength</span>
                    <span className="font-semibold text-slate-700">{strengthLabel}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div className={`h-1.5 ${strengthWidth} ${strengthTone} rounded-full transition-all duration-300`} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {passwordRequirements.map((item) => (
                      <div key={item.label} className="flex items-center gap-1.5">
                        <CheckCircle2 className={`h-3.5 w-3.5 ${item.met ? "text-emerald-600" : "text-slate-300"}`} />
                        <span className={`text-[11px] ${item.met ? "text-emerald-700" : "text-slate-500"}`}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </label>

            {!isInviteFlow && (
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  Company Name
                </span>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={data.business}
                    onChange={(e) => setData({ ...data, business: e.target.value })}
                    placeholder="Your organization"
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                  />
                </div>
              </label>
            )}
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleRegister}
            disabled={isLoading}
            className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(90deg,#0f766e_0%,#0f4c5c_100%)] text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                {isInviteFlow ? "Joining workspace..." : "Creating workspace..."}
              </>
            ) : (
              <>
                {isInviteFlow ? "Join Workspace" : "Create Account"}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          <p className="mt-5 text-center text-xs leading-6 text-slate-500">
            By creating an account, you agree to our <Link href="/terms" className="font-semibold text-teal-700">Terms</Link>,{" "}
            <Link href="/privacy" className="font-semibold text-teal-700">Privacy Policy</Link>, and{" "}
            <Link href="/cookies" className="font-semibold text-teal-700">Cookie Policy</Link>.
          </p>

          <div className="mt-6 border-t border-slate-200 pt-5 text-sm text-slate-600">
            <p>
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-teal-700">
                Sign in
              </Link>
            </p>
          </div>
        </section>
      </div>
        </>
      ) : null}

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap");

        :root {
          --brand-main: #0f766e;
          --brand-deep: #0f4c5c;
          --ink-main: #0f172a;
          --ink-muted: #64748b;
        }

        body {
          font-family: "Manrope", sans-serif;
          color: var(--ink-main);
        }

        .font-space {
          font-family: "Space Grotesk", sans-serif;
        }

        .enter-fade {
          opacity: 0;
          transform: translateY(14px);
          animation: enterFade 0.6s ease forwards;
        }

        .delay-1 {
          animation-delay: 0.08s;
        }

        .delay-2 {
          animation-delay: 0.16s;
        }

        .delay-3 {
          animation-delay: 0.24s;
        }

        @keyframes enterFade {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
