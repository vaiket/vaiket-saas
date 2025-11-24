"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export default function ResetPasswordForm({ email }: { email: string }) {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [show2, setShow2] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    setError("");
    if (!email) return setError("Missing email");
    if (!password || !confirm) return setError("Fill both fields");
    if (password !== confirm) return setError("Passwords do not match");

    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const json = await res.json();
    setLoading(false);

    if (!json.success) return setError(json.error || "Failed to reset");
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#0F0F14] p-8 rounded-2xl border border-gray-800 shadow-lg text-white">
        <h1 className="text-2xl font-bold">Reset Password</h1>
        <p className="text-gray-400 mt-1">
          Set a new password for <b>{email}</b>
        </p>

        <div className="relative mt-4">
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            type={show ? "text" : "password"}
            className="w-full p-3 rounded bg-[#0B0B0F] border border-gray-700"
          />
          <button
            onClick={() => setShow(!show)}
            className="absolute right-3 top-3 text-neutral-400"
          >
            {show ? <EyeOff /> : <Eye />}
          </button>
        </div>

        <div className="relative mt-4">
          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm password"
            type={show2 ? "text" : "password"}
            className="w-full p-3 rounded bg-[#0B0B0F] border border-gray-700"
          />
          <button
            onClick={() => setShow2(!show2)}
            className="absolute right-3 top-3 text-neutral-400"
          >
            {show2 ? <EyeOff /> : <Eye />}
          </button>
        </div>

        {error && <p className="text-red-400 mt-3">{error}</p>}

        <button
          onClick={handleReset}
          disabled={loading}
          className="w-full mt-6 bg-blue-600 py-3 rounded font-semibold"
        >
          {loading ? "Resetting..." : "Reset Password"}
        </button>
      </div>
    </div>
  );
}
