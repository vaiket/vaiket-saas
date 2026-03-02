"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Lock,
  Mail,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";

export default function LoginPage() {
  const [data, setData] = useState({
    email: "",
    password: "",
  });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  useEffect(() => {
    let alive = true;

    async function initAuthState() {
      if (typeof window === "undefined") return;

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
        // Keep user on login page when auth check fails.
      } finally {
        if (alive) {
          const params = new URLSearchParams(window.location.search);
          const authError = params.get("error");
          if (authError === "google_no_account") {
            setError("No account found for this Google email. Use 'Create account' for new workspace.");
          }
          setIsAuthChecking(false);
        }
      }
    }

    initAuthState();

    return () => {
      alive = false;
    };
  }, []);

  function handleGoogleLogin() {
    window.location.href = "/api/auth/google/login?intent=login";
  }

  async function submit() {
    setIsLoading(true);
    setError("");

    if (!data.email || !data.password) {
      setError("Please fill all fields");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Invalid email or password");
        return;
      }

      localStorage.setItem("loggedIn", "true");
      localStorage.setItem("email", data.email);

      if (json.onboardingCompleted) {
        window.location.href = "/dashboard";
      } else {
        window.location.href = "/onboarding";
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

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
            <h2 className="font-space text-3xl leading-tight sm:text-[2.4rem]">Welcome back. Your next customer lead is waiting.</h2>
            <p className="mt-5 max-w-lg text-[15px] leading-7 text-teal-100/90">
              Sign in to manage your verified Vaiket profile, respond to real inquiries, and keep your business growth
              engine active without marketing overload.
            </p>
          </div>

          <div className="enter-fade delay-2 mt-8 space-y-4">
            <div className="rounded-2xl border border-white/25 bg-white/10 p-4 backdrop-blur-sm">
              <div className="mb-3 flex items-center gap-2">
                <Rocket className="h-4 w-4 text-emerald-200" />
                <p className="text-sm font-semibold text-white">Instant Lead Response</p>
              </div>
              <p className="text-sm leading-6 text-teal-100/90">Reply faster and convert inquiries before competitors do.</p>
            </div>

            <div className="rounded-2xl border border-white/25 bg-white/10 p-4 backdrop-blur-sm">
              <div className="mb-3 flex items-center gap-2">
                <Target className="h-4 w-4 text-emerald-200" />
                <p className="text-sm font-semibold text-white">City-level Discoverability</p>
              </div>
              <p className="text-sm leading-6 text-teal-100/90">Track and handle customers discovering your services daily.</p>
            </div>
          </div>

          <div className="enter-fade delay-3 mt-7 flex items-center gap-2 text-sm text-teal-100/95">
            <ShieldCheck className="h-4 w-4 text-emerald-200" />
            Enterprise security with tenant-isolated access control.
          </div>
        </section>

        <section className="enter-fade delay-2 order-1 rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-[0_30px_60px_-35px_rgba(15,23,42,0.35)] backdrop-blur sm:p-8 lg:order-2">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Secure Access</p>
              <h3 className="font-space mt-2 text-2xl text-slate-900">Sign in to your workspace</h3>
            </div>
            <span className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
              Enterprise
            </span>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
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

          <div className="mb-5 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            or login manually
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Work Email</span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={data.email}
                  onChange={(e) => setData({ ...data, email: e.target.value })}
                  placeholder="name@company.com"
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Password</span>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPass ? "text" : "password"}
                  value={data.password}
                  onChange={(e) => setData({ ...data, password: e.target.value })}
                  placeholder="Enter your password"
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-16 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  {showPass ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-sm font-semibold text-teal-700 hover:text-teal-800">
                Forgot password?
              </Link>
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={isLoading}
            className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(90deg,#0f766e_0%,#0f4c5c_100%)] text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Signing in...
              </>
            ) : (
              <>
                Sign In
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          <p className="mt-5 text-center text-xs leading-6 text-slate-500">
            By signing in, you agree to our <Link href="/terms" className="font-semibold text-teal-700">Terms</Link>,{" "}
            <Link href="/privacy" className="font-semibold text-teal-700">Privacy Policy</Link>, and{" "}
            <Link href="/cookies" className="font-semibold text-teal-700">Cookie Policy</Link>.
          </p>

          <div className="mt-6 border-t border-slate-200 pt-5 text-sm text-slate-600">
            <p>
              Don&apos;t have an account?{" "}
              <Link href="/register" className="font-semibold text-teal-700">
                Create account
              </Link>
            </p>
            <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
              <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />
              Protected by enterprise-grade account security.
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
