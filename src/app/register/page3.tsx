"use client";

import { useState, useEffect } from "react";
import {
  Eye,
  EyeOff,
  Mail,
  User,
  Lock,
  ArrowRight,
  CheckCircle,
  Globe,
  Zap,
  AlertCircle,
  Key,
  Users,
  Shield,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();

  const [data, setData] = useState({
    name: "",
    email: "",
    password: "",
    business: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [activeInput, setActiveInput] = useState<string | null>(null);

  const checkPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;
    setPasswordStrength(strength);
  };

  async function handleRegister() {
    setIsLoading(true);
    setError("");

    if (!data.name || !data.email || !data.password || !data.business) {
      setError("Please fill all fields");
      setIsLoading(false);
      return;
    }

    if (data.password.length < 8) {
      setError("Password must be at least 8 characters");
      setIsLoading(false);
      return;
    }

    try {
      // 1️⃣ REGISTER
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error || "Registration failed");
        setIsLoading(false);
        return;
      }

      // 2️⃣ FETCH AUTH CONTEXT (cookie already set)
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
      setError("Network error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  const passwordRequirements = [
    { text: "At least 8 characters", met: data.password.length >= 8 },
    {
      text: "Uppercase & lowercase letters",
      met: /[a-z]/.test(data.password) && /[A-Z]/.test(data.password),
    },
    { text: "At least one number", met: /\d/.test(data.password) },
    {
      text: "Special character",
      met: /[^a-zA-Z\d]/.test(data.password),
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F0F2F5] px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border p-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Create your account
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            Get started with Vaiket AI
          </p>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <input
            className="w-full h-11 border rounded-lg px-4"
            placeholder="Full name"
            value={data.name}
            onChange={(e) => setData({ ...data, name: e.target.value })}
          />

          {/* Email */}
          <input
            className="w-full h-11 border rounded-lg px-4"
            placeholder="Email"
            type="email"
            value={data.email}
            onChange={(e) => setData({ ...data, email: e.target.value })}
          />

          {/* Password */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              className="w-full h-11 border rounded-lg px-4 pr-12"
              placeholder="Password"
              value={data.password}
              onChange={(e) => {
                setData({ ...data, password: e.target.value });
                checkPasswordStrength(e.target.value);
              }}
            />
            <button
              type="button"
              className="absolute right-3 top-3"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </button>
          </div>

          {/* Password rules */}
          {data.password && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              {passwordRequirements.map((req, i) => (
                <div key={i} className="flex items-center gap-1">
                  <CheckCircle
                    className={`w-3 h-3 ${
                      req.met ? "text-green-500" : "text-gray-300"
                    }`}
                  />
                  <span>{req.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Business */}
          <input
            className="w-full h-11 border rounded-lg px-4"
            placeholder="Company name"
            value={data.business}
            onChange={(e) => setData({ ...data, business: e.target.value })}
          />

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-600">{error}</span>
            </div>
          )}

          <button
            onClick={handleRegister}
            disabled={isLoading}
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2"
          >
            {isLoading ? "Creating account..." : "Create Account"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <p className="text-center text-sm text-gray-600 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 font-semibold">
            Sign in
          </Link>
        </p>

        <div className="flex items-center justify-center gap-2 mt-6 text-xs text-gray-500">
          <Key className="w-4 h-4" />
          Enterprise-grade security
        </div>
      </div>
    </div>
  );
}
