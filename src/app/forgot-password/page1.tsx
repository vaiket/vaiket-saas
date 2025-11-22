// src/app/forgot-password/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleSend() {
    setMsg("");
    if (!email) return setMsg("Enter your email");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      setLoading(false);
      if (!json.success) return setMsg(json.error || "Failed to send OTP");
      // go to verify page
      router.push(`/verify-reset-otp?email=${encodeURIComponent(email)}`);
    } catch (e) {
      setLoading(false);
      setMsg("Server error");
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#0F0F14] p-8 rounded-2xl border border-gray-800 shadow-lg text-white">
        <div className="flex gap-4 items-center">
          <img src="/mnt/data/90870f6a-5838-43e6-ac10-7d6d8c315466.png" alt="hero" className="w-14 h-14 rounded" />
          <div>
            <h1 className="text-2xl font-bold">Forgot Password</h1>
            <p className="text-sm text-gray-400">Enter your email — we'll send a reset OTP.</p>
          </div>
        </div>

        <div className="mt-6">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@domain.com"
            className="w-full p-3 rounded bg-[#0B0B0F] border border-gray-700 outline-none"
          />
        </div>

        {msg && <p className="text-sm text-red-400 mt-3">{msg}</p>}

        <button
          onClick={handleSend}
          disabled={loading}
          className="w-full mt-6 bg-blue-600 py-3 rounded font-semibold hover:bg-blue-700"
        >
          {loading ? "Sending..." : "Send OTP"}
        </button>

        <p className="text-gray-400 text-sm mt-4 text-center">
          Got an account? <a href="/login" className="text-blue-400">Login</a>
        </p>
      </div>
    </div>
  );
}
