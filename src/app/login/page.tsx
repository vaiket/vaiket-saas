"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Sparkles,
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_0%_0%,#eef2ff_0%,#f8fafc_40%,#f8fafc_100%)] px-4 pb-10 pt-7 sm:px-6 lg:px-8">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <Image src="/vaiket-bridge-mark.svg" alt="Vaiket" width={30} height={30} priority />
          <span className="text-lg font-bold tracking-tight text-slate-900">Vaiket</span>
        </Link>
        <p className="hidden text-sm text-slate-600 sm:block">
          New here?{" "}
          <Link href="/register" className="font-semibold text-indigo-700 hover:text-indigo-800">
            Create account
          </Link>
        </p>
      </header>

      <main className="mx-auto mt-8 grid w-full max-w-6xl gap-6 lg:grid-cols-[1.04fr_0.96fr]">
        <section className="hidden rounded-3xl border border-indigo-100 bg-[linear-gradient(145deg,#161b62_0%,#29328f_48%,#4f46e5_100%)] p-8 text-white shadow-[0_30px_70px_-35px_rgba(67,56,202,0.7)] lg:block">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-100">
            <Sparkles className="h-3.5 w-3.5" />
            Workspace Access
          </div>
          <h2 className="text-3xl font-bold leading-tight">Welcome back to your communication command center.</h2>
          <p className="mt-4 text-sm leading-7 text-indigo-100/90">
            Manage inboxes, automate replies, and collaborate with your team from one secure SaaS workspace.
          </p>
          <div className="mt-8 space-y-3">
            <div className="rounded-2xl border border-white/25 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-sm font-semibold">Live inbox operations</p>
              <p className="mt-1 text-xs text-indigo-100/90">Track chats, handle SLAs, and resolve tickets faster.</p>
            </div>
            <div className="rounded-2xl border border-white/25 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-sm font-semibold">Automations + CRM sync</p>
              <p className="mt-1 text-xs text-indigo-100/90">Workflows, tags, and profile updates in one flow.</p>
            </div>
            <div className="rounded-2xl border border-white/25 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-sm font-semibold">Secure by design</p>
              <p className="mt-1 text-xs text-indigo-100/90">Role-based access with tenant-isolated data boundaries.</p>
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
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">Secure Login</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Sign in to Vaiket</h1>
                <p className="mt-2 text-sm text-slate-600">
                  Continue where your team left off and manage customer conversations instantly.
                </p>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
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

              <div className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                <span className="h-px flex-1 bg-slate-200" />
                Or login with email
                <span className="h-px flex-1 bg-slate-200" />
              </div>

              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submit();
                }}
              >
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Work email</span>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={data.email}
                      onChange={(event) => setData({ ...data, email: event.target.value })}
                      placeholder="name@company.com"
                      className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
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
                      onChange={(event) => setData({ ...data, password: event.target.value })}
                      placeholder="Enter your password"
                      className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                    >
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>

                <div className="flex justify-end">
                  <Link href="/forgot-password" className="text-sm font-semibold text-indigo-700 hover:text-indigo-800">
                    Forgot password?
                  </Link>
                </div>

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
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-5 text-center text-sm text-slate-600 sm:hidden">
                New here?{" "}
                <Link href="/register" className="font-semibold text-indigo-700 hover:text-indigo-800">
                  Create account
                </Link>
              </p>

              <p className="mt-6 text-xs leading-6 text-slate-500">
                By signing in, you agree to our{" "}
                <Link href="/terms" className="font-semibold text-indigo-700">
                  Terms
                </Link>
                ,{" "}
                <Link href="/privacy" className="font-semibold text-indigo-700">
                  Privacy Policy
                </Link>{" "}
                and{" "}
                <Link href="/cookies" className="font-semibold text-indigo-700">
                  Cookie Policy
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
