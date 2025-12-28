"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function VerifyResetOtp() {
  const params = useSearchParams();
  const email = params.get("email");

  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleVerify() {
    setError("");

    const res = await fetch("/api/auth/verify-reset-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        otp,
        newPassword: password,
      }),
    });

    const json = await res.json();

    if (json.success) {
      alert("Password updated!");
      window.location.href = "/login";
    } else {
      setError(json.error);
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#0F0F14] p-8 rounded-2xl border border-gray-800 shadow-lg text-white">
        <h1 className="text-2xl font-bold">Reset Password OTP</h1>
        <p className="text-gray-400 mt-1">OTP sent to: <b>{email}</b></p>

        <input
          placeholder="Enter OTP"
          className="w-full mt-5 p-3 rounded bg-[#0A0A0D] border border-gray-700"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
        />

        <input
          placeholder="New Password"
          type="password"
          className="w-full mt-3 p-3 rounded bg-[#0A0A0D] border border-gray-700"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="text-red-500 mt-3">{error}</p>}

        <button
          onClick={handleVerify}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-5 p-3 rounded-lg"
        >
          Verify & Reset Password
        </button>
      </div>
    </div>
  );
}
