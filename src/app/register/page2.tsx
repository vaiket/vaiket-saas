"use client";

import { useState } from "react";
import { Eye, EyeOff, Mail, User } from "lucide-react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [data, setData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [error, setError] = useState("");

  async function handleSendOtp() {
    setError("");

    if (!data.fullName || !data.email || !data.password || !data.confirmPassword) {
      return setError("Please fill all fields");
    }

    if (data.password !== data.confirmPassword) {
      return setError("Passwords do not match");
    }

    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json = await res.json();

    if (!json.success) {
      setError(json.error || "Something went wrong");
      return;
    }

    // Redirect to OTP page
    router.push(`/verify-otp?email=${data.email}`);
  }

  return (
    <div className="flex h-screen bg-black text-white">
      {/* LEFT SIDE */}
      <div className="w-1/2 bg-[url('/dashbird.png')] bg-cover bg-center hidden md:block"></div>

      {/* RIGHT SIDE FORM */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-10">
        <div className="w-full max-w-md space-y-6">

          <h1 className="text-3xl font-bold">Create your account</h1>
          <p className="opacity-70">Start your free trial — secure signup</p>

          {/* Google Button */}
          <button className="w-full py-3 bg-white text-black rounded flex items-center justify-center gap-2 font-semibold">
            🔥 Continue with Google
          </button>

          <div className="flex items-center gap-4 opacity-50">
            <hr className="flex-1 border-gray-600" /> OR <hr className="flex-1 border-gray-600" />
          </div>

          {/* FULL NAME */}
          <div>
            <label className="text-sm">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-3 opacity-50" size={20} />
              <input
                type="text"
                className="w-full bg-[#111] border border-gray-700 rounded px-10 py-3 mt-1"
                placeholder="Your Name"
                onChange={(e) => setData({ ...data, fullName: e.target.value })}
              />
            </div>
          </div>

          {/* EMAIL */}
          <div>
            <label className="text-sm">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 opacity-50" size={20} />
              <input
                type="email"
                className="w-full bg-[#111] border border-gray-700 rounded px-10 py-3 mt-1"
                placeholder="your@email.com"
                onChange={(e) => setData({ ...data, email: e.target.value })}
              />
            </div>
          </div>

          {/* PASSWORD */}
          <div>
            <label className="text-sm">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="w-full bg-[#111] border border-gray-700 rounded px-4 py-3 mt-1"
                onChange={(e) => setData({ ...data, password: e.target.value })}
              />
              <span
                className="absolute right-3 top-4 cursor-pointer"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </span>
            </div>
          </div>

          {/* CONFIRM PASSWORD */}
          <div>
            <label className="text-sm">Confirm Password</label>
            <div className="relative">
              <input
                type={showPassword2 ? "text" : "password"}
                className="w-full bg-[#111] border border-gray-700 rounded px-4 py-3 mt-1"
                onChange={(e) => setData({ ...data, confirmPassword: e.target.value })}
              />
              <span
                className="absolute right-3 top-4 cursor-pointer"
                onClick={() => setShowPassword2(!showPassword2)}
              >
                {showPassword2 ? <EyeOff /> : <Eye />}
              </span>
            </div>
          </div>

          {/* ERROR */}
          {error && <p className="text-red-400">{error}</p>}

          {/* SUBMIT BUTTON */}
          <button
            onClick={handleSendOtp}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded font-semibold"
          >
            Create Account & Send OTP
          </button>

          <p className="text-xs opacity-50">
            By signing up you agree to our <span className="text-blue-400">Terms</span> &{" "}
            <span className="text-blue-400">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
