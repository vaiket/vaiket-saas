"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertCircle, ArrowRight, Building2, Eye, EyeOff, Loader2, Lock, Mail, Sparkles, User2 } from "lucide-react";

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
        }
      } catch {
      } finally {
        if (alive) setIsAuthChecking(false);
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
        credentials: "include",
        body: JSON.stringify({
          ...data,
          inviteToken: isInviteFlow ? inviteToken : undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error || "Registration failed");
        return;
      }

      const meRes = await fetch("/api/auth/me", {
        credentials: "include",
        cache: "no-store",
      });
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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_0%_0%,#eef2ff_0%,#f8fafc_40%,#f8fafc_100%)] px-4 pb-10 pt-7 sm:px-6 lg:px-8">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <Image src="/vaiket-bridge-mark.svg" alt="Vaiket" width={30} height={30} priority />
          <span className="text-lg font-bold tracking-tight text-slate-900">Vaiket</span>
        </Link>
        <p className="hidden text-sm text-slate-600 sm:block">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-indigo-700 hover:text-indigo-800">
            Sign in
          </Link>
        </p>
      </header>

      <main className="mx-auto mt-8 grid w-full max-w-6xl gap-6 lg:grid-cols-[1.04fr_0.96fr]">
        <section className="hidden rounded-3xl border border-indigo-100 bg-[linear-gradient(145deg,#161b62_0%,#29328f_48%,#4f46e5_100%)] p-8 text-white shadow-[0_30px_70px_-35px_rgba(67,56,202,0.7)] lg:block">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-100">
            <Sparkles className="h-3.5 w-3.5" />
            SaaS Onboarding
          </div>
          <h2 className="text-3xl font-bold leading-tight">
            Launch your workspace with modern automation in minutes.
          </h2>
          <p className="mt-4 text-sm leading-7 text-indigo-100/90">
            Build your team inbox, connect WhatsApp devices, and start handling customer conversations from one clean dashboard.
          </p>
          <div className="mt-8 space-y-3">
            <div className="rounded-2xl border border-white/25 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-sm font-semibold">Unified channels</p>
              <p className="mt-1 text-xs text-indigo-100/90">WhatsApp, Email, and RCS in one workflow-ready place.</p>
            </div>
            <div className="rounded-2xl border border-white/25 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-sm font-semibold">Team access control</p>
              <p className="mt-1 text-xs text-indigo-100/90">Role-based members, secure sessions, and tenant isolation.</p>
            </div>
            <div className="rounded-2xl border border-white/25 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-sm font-semibold">Fast setup</p>
              <p className="mt-1 text-xs text-indigo-100/90">Create account, complete onboarding, and go live quickly.</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_30px_70px_-45px_rgba(15,23,42,0.35)] sm:p-8">
          {isAuthChecking ? (
            <div className="flex min-h-[420px] items-center justify-center">
              <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking your session...
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
                  {isInviteFlow ? "Invitation" : "Create Account"}
                </p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                  {isInviteFlow ? "Join your workspace" : "Start with Vaiket"}
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  {isInviteFlow
                    ? "Complete your details to join the invited workspace."
                    : "Set up your account to access the full communication dashboard."}
                </p>
              </div>

              {!isInviteFlow ? (
                <button
                  type="button"
                  onClick={handleGoogleRegister}
                  disabled={isLoading}
                  className="mb-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
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
              ) : null}

              <div className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                <span className="h-px flex-1 bg-slate-200" />
                {isInviteFlow ? "Or continue with form" : "Or sign up with email"}
                <span className="h-px flex-1 bg-slate-200" />
              </div>

              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleRegister();
                }}
              >
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Full name</span>
                  <div className="relative">
                    <User2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={data.name}
                      onChange={(event) => setData((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder="Enter your full name"
                      className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Email address</span>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={data.email}
                      onChange={(event) => setData((prev) => ({ ...prev, email: event.target.value }))}
                      placeholder="name@company.com"
                      disabled={Boolean(isInviteFlow && invitedEmail)}
                      className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />
                  </div>
                </label>

                {!isInviteFlow ? (
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Organization name</span>
                    <div className="relative">
                      <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={data.business}
                        onChange={(event) => setData((prev) => ({ ...prev, business: event.target.value }))}
                        placeholder="Your company / workspace"
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                      />
                    </div>
                  </label>
                ) : null}

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Password</span>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={data.password}
                      onChange={(event) => setData((prev) => ({ ...prev, password: event.target.value }))}
                      placeholder="Minimum 8 characters"
                      className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-11 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>

                {error ? (
                  <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(90deg,#4f46e5_0%,#4338ca_100%)] text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {isInviteFlow ? "Joining workspace..." : "Creating account..."}
                    </>
                  ) : (
                    <>
                      {isInviteFlow ? "Join Workspace" : "Create Account"}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-5 text-center text-sm text-slate-600 sm:hidden">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-indigo-700 hover:text-indigo-800">
                  Sign in
                </Link>
              </p>

              <p className="mt-6 text-xs leading-6 text-slate-500">
                By creating an account, you agree to our{" "}
                <Link href="/terms" className="font-semibold text-indigo-700">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="font-semibold text-indigo-700">
                  Privacy Policy
                </Link>
                .
              </p>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
