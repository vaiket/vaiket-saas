"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function VerifyOTP() {
  const params = useSearchParams();
  const router = useRouter();

  const email = params.get("email") || "";
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");

  async function handleVerify() {
    setError("");

    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email, otp }),
    });

    const json = await res.json();

    if (!json.success) {
      setError(json.error || "Server Error");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="w-full h-screen flex items-center justify-center bg-black">
      <div className="bg-[#111] p-10 rounded-xl w-[400px]">
        <h2 className="text-white text-2xl font-bold mb-4">Verify OTP</h2>

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
          className="w-full mt-4 bg-blue-600 text-white p-3 rounded"
        >
          Verify OTP
        </button>
      </div>
    </div>
  );
}
