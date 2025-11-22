"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, ArrowRight, Shield, Zap, Bot, Sparkles, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleSend() {
    setMsg("");
    if (!email) return setMsg("Please enter your email address");
    
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return setMsg("Please enter a valid email address");
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      setLoading(false);
      if (!json.success) return setMsg(json.error || "Failed to send reset OTP");
      // go to verify page
      router.push(`/verify-reset-otp?email=${encodeURIComponent(email)}`);
    } catch (e) {
      setLoading(false);
      setMsg("Server error - please try again later");
    }
  }

  const features = [
    { icon: <Bot className="w-5 h-5" />, text: "AI-Powered Email Automation" },
    { icon: <Zap className="w-5 h-5" />, text: "Smart Response Generation" },
    { icon: <Sparkles className="w-5 h-5" />, text: "Predictive Analytics" },
  ];

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Left Side - Promotional Content */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0D3B66]/10 to-[#0D3B66]/5"></div>
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-[#0D3B66]/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 -right-20 w-72 h-72 bg-[#0D3B66]/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#0D3B66]/8 rounded-full blur-3xl"></div>
        
        {/* Header */}
        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-12 h-12 bg-[#0D3B66] rounded-xl flex items-center justify-center shadow-lg shadow-[#0D3B66]/25">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-[#0D3B66]">
              VAIKET AI
            </span>
          </div>

          <h1 className="text-5xl font-bold leading-tight mb-6 text-gray-800">
            Reset Your
            <span className="text-[#0D3B66] block">
              Password
            </span>
          </h1>

          <p className="text-xl text-gray-600 mb-12 max-w-md leading-relaxed">
            Secure password recovery process. We'll send you a one-time password to reset your account access.
          </p>

          {/* Features List */}
          <div className="space-y-4 mb-12">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center space-x-4 group hover:transform hover:translate-x-2 transition-transform duration-300">
                <div className="w-12 h-12 bg-[#0D3B66]/10 rounded-xl flex items-center justify-center group-hover:bg-[#0D3B66]/20 transition-all duration-300 shadow-lg">
                  <div className="text-[#0D3B66]">
                    {feature.icon}
                  </div>
                </div>
                <span className="text-gray-700 text-lg font-medium">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="relative z-10 grid grid-cols-3 gap-8">
          <div className="text-center transform hover:scale-110 transition-transform duration-300">
            <div className="text-2xl font-bold text-[#0D3B66]">98%</div>
            <div className="text-gray-600 text-sm">Accuracy Rate</div>
          </div>
          <div className="text-center transform hover:scale-110 transition-transform duration-300">
            <div className="text-2xl font-bold text-[#0D3B66]">10K+</div>
            <div className="text-gray-600 text-sm">Active Users</div>
          </div>
          <div className="text-center transform hover:scale-110 transition-transform duration-300">
            <div className="text-2xl font-bold text-[#0D3B66]">24/7</div>
            <div className="text-gray-600 text-sm">AI Support</div>
          </div>
        </div>
      </div>

      {/* Right Side - Forgot Password Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center justify-center space-x-3 mb-8">
            <div className="w-12 h-12 bg-[#0D3B66] rounded-xl flex items-center justify-center shadow-lg">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-[#0D3B66]">
              VAIKET AI
            </span>
          </div>

          {/* Back Button */}
          <Link 
            href="/login" 
            className="inline-flex items-center space-x-2 text-[#0D3B66] hover:text-[#0A2E4D] transition-colors mb-6 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back to Login</span>
          </Link>

          {/* Form Container */}
          <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 lg:p-10 shadow-2xl shadow-[#0D3B66]/10">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-[#0D3B66]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-[#0D3B66]" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
                Reset Your Password
              </h1>
              <p className="text-gray-600 text-sm sm:text-base">
                Enter your email address and we'll send you a one-time password to reset your password
              </p>
            </div>

            {/* Form */}
            <div className="space-y-6">
              {/* Email Input */}
              <div className="group">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 group-focus-within:text-[#0D3B66] transition-colors" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-2xl pl-10 pr-4 py-3 sm:py-4 text-gray-800 placeholder-gray-500 focus:border-[#0D3B66] focus:ring-2 focus:ring-[#0D3B66]/20 transition-all duration-300 text-sm sm:text-base"
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              {/* Message Display */}
              {msg && (
                <div className={`flex items-center space-x-2 rounded-2xl p-3 sm:p-4 ${
                  msg.includes("Failed") || msg.includes("error") || msg.includes("Invalid") 
                    ? "text-red-600 bg-red-50 border border-red-200"
                    : "text-blue-600 bg-blue-50 border border-blue-200"
                }`}>
                  <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.includes("Failed") || msg.includes("error") || msg.includes("Invalid")
                      ? "bg-red-100"
                      : "bg-blue-100"
                  }`}>
                    <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                      msg.includes("Failed") || msg.includes("error") || msg.includes("Invalid")
                        ? "bg-red-500"
                        : "bg-blue-500"
                    }`}></div>
                  </div>
                  <span className="text-sm">{msg}</span>
                </div>
              )}

              {/* Send OTP Button */}
              <button
                onClick={handleSend}
                disabled={loading}
                className="w-full bg-[#0D3B66] hover:bg-[#0A2E4D] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 sm:py-4 px-6 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center space-x-2 shadow-lg shadow-[#0D3B66]/25"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    <span className="text-sm sm:text-base">Sending OTP...</span>
                  </>
                ) : (
                  <>
                    <span className="text-sm sm:text-base">Send Reset OTP</span>
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              {/* Additional Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-[#0D3B66] mb-2">What to expect:</h3>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• We'll send a 6-digit OTP to your email</li>
                  <li>• The OTP will be valid for 15 minutes</li>
                  <li>• Check your spam folder if you don't see the email</li>
                </ul>
              </div>
            </div>

            {/* Login Link */}
            <div className="text-center mt-6 pt-6 border-t border-gray-200">
              <p className="text-gray-600 text-sm sm:text-base">
                Remember your password?{" "}
                <Link href="/login" className="text-[#0D3B66] hover:text-[#0A2E4D] cursor-pointer font-semibold transition-colors inline-flex items-center gap-1 group">
                  Back to Login
                  <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </p>
            </div>
          </div>

          {/* Security Badge */}
          <div className="flex items-center justify-center space-x-2 mt-6 text-gray-500 text-xs sm:text-sm">
            <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>Enterprise-grade security & encryption</span>
          </div>
        </div>
      </div>
    </div>
  );
}