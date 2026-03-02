"use client";
export const dynamic = "force-dynamic";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function VerifyResetOTPForm() {
  const params = useSearchParams();
  const router = useRouter();

  const email = params.get("email") || "";
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleVerify() {
    setError("");

    if (!otp) return setError("Enter OTP");

    setLoading(true);

    const res = await fetch("/api/auth/verify-reset-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });

    const json = await res.json();
    setLoading(false);

    if (!json.success) {
      setError(json.error || "Invalid OTP");
      return;
    }

    router.push("/reset-password?email=" + email);
  }

  return (
    <div className="w-full h-screen flex items-center justify-center bg-black">
      <div className="bg-[#111] p-10 rounded-xl w-[400px] border border-gray-800">
        <h2 className="text-white text-2xl font-bold mb-4">Verify Reset OTP</h2>

        <p className="text-gray-400 text-sm mb-3">
          OTP sent to: <b>{email}</b>
        </p>

        <input
          className="w-full p-3 bg-black border border-gray-700 rounded text-white"
          placeholder="Enter OTP"
          onChange={(e) => setOtp(e.target.value)}
        />

        {error && <p className="text-red-500 mt-2">{error}</p>}

        <button
          onClick={handleVerify}
          disabled={loading}
          className="w-full mt-4 bg-blue-600 text-white p-3 rounded disabled:bg-blue-400"
        >
          {loading ? "Verifying..." : "Verify OTP"}
        </button>
      </div>
    </div>
  );
}

export default function VerifyResetOTPPage() {
  return (
    <Suspense fallback={<div className="text-white p-10">Loading...</div>}>
      <VerifyResetOTPForm />
    </Suspense>
  );
}
