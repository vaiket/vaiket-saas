"use client";

import { useState } from "react";
import { Eye, EyeOff, Mail, User, Shield, Zap, Bot, MailOpen, Lock, ArrowRight, Sparkles, CheckCircle, Building } from "lucide-react";
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

  const checkPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
    if (password.match(/\d/)) strength++;
    if (password.match(/[^a-zA-Z\d]/)) strength++;
    setPasswordStrength(strength);
  };

  async function handleRegister() {
    setIsLoading(true);
    setError("");

    // Check if all fields are filled
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
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      
      if (!res.ok) {
        setError(json.error || "Something went wrong");
        setIsLoading(false);
        return;
      }

      console.log(json);
      alert("Registered Successfully!");
      
      // Redirect to login page after successful registration
      router.push("/login");
    } catch (error) {
      setError("Network error occurred");
      setIsLoading(false);
    }
  }

  const features = [
    { icon: <Bot className="w-5 h-5" />, text: "AI-Powered Email Automation" },
    { icon: <Zap className="w-5 h-5" />, text: "Smart Response Generation" },
    { icon: <MailOpen className="w-5 h-5" />, text: "Intelligent Inbox Management" },
    { icon: <Sparkles className="w-5 h-5" />, text: "Predictive Analytics" },
  ];

  const passwordRequirements = [
    { text: "At least 8 characters", met: data.password.length >= 8 },
    { text: "Uppercase & lowercase letters", met: /[a-z]/.test(data.password) && /[A-Z]/.test(data.password) },
    { text: "At least one number", met: /\d/.test(data.password) },
    { text: "Special character", met: /[^a-zA-Z\d]/.test(data.password) },
  ];

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Left Side - Promotional Content */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-8 xl:p-12 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0D3B66]/10 to-[#0D3B66]/5"></div>
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-[#0D3B66]/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 -right-20 w-72 h-72 bg-[#0D3B66]/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#0D3B66]/8 rounded-full blur-3xl"></div>
        
        {/* Header */}
        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 xl:w-12 xl:h-12 bg-[#0D3B66] rounded-xl flex items-center justify-center shadow-lg shadow-[#0D3B66]/25">
              <Mail className="w-5 h-5 xl:w-6 xl:h-6 text-white" />
            </div>
            <span className="text-2xl xl:text-2xl font-bold text-[#0D3B66]">
              VAIKET AI
            </span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-bold leading-tight mb-6 text-gray-800">
            Transform Your
            <span className="text-[#0D3B66] block">
              Email Experience
            </span>
          </h1>

          <p className="text-lg xl:text-xl text-gray-600 mb-8 xl:mb-12 max-w-md leading-relaxed">
            Intelligent email automation powered by advanced AI. Save time, increase productivity, and never miss important messages again.
          </p>

          {/* Features List */}
          <div className="space-y-4 mb-8 xl:mb-12">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center space-x-4 group hover:transform hover:translate-x-2 transition-transform duration-300">
                <div className="w-10 h-10 xl:w-12 xl:h-12 bg-[#0D3B66]/10 rounded-xl flex items-center justify-center group-hover:bg-[#0D3B66]/20 transition-all duration-300 shadow-lg">
                  <div className="text-[#0D3B66]">
                    {feature.icon}
                  </div>
                </div>
                <span className="text-gray-700 text-base xl:text-lg font-medium">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="relative z-10 grid grid-cols-3 gap-6 xl:gap-8">
          <div className="text-center transform hover:scale-110 transition-transform duration-300">
            <div className="text-xl xl:text-2xl font-bold text-[#0D3B66]">98%</div>
            <div className="text-gray-600 text-xs xl:text-sm">Accuracy Rate</div>
          </div>
          <div className="text-center transform hover:scale-110 transition-transform duration-300">
            <div className="text-xl xl:text-2xl font-bold text-[#0D3B66]">10K+</div>
            <div className="text-gray-600 text-xs xl:text-sm">Active Users</div>
          </div>
          <div className="text-center transform hover:scale-110 transition-transform duration-300">
            <div className="text-xl xl:text-2xl font-bold text-[#0D3B66]">24/7</div>
            <div className="text-gray-600 text-xs xl:text-sm">AI Support</div>
          </div>
        </div>
      </div>

      {/* Right Side - Registration Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-8 xl:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center justify-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-[#0D3B66] rounded-xl flex items-center justify-center shadow-lg">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-[#0D3B66]">
              VAIKET AI
            </span>
          </div>

          {/* Form Container */}
          <div className="bg-white rounded-2xl xl:rounded-3xl border border-gray-200 p-6 sm:p-8 lg:p-8 xl:p-10 shadow-2xl shadow-[#0D3B66]/10">
            {/* Header */}
            <div className="text-center mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
                Create Your Account
              </h1>
              <p className="text-gray-600 text-sm sm:text-base">
                Join thousands of professionals using AI-powered email automation
              </p>
            </div>

            {/* Google Sign Up */}
            <button className="w-full py-3 sm:py-4 bg-white border border-gray-300 hover:border-gray-400 rounded-2xl flex items-center justify-center space-x-3 font-semibold text-gray-700 transition-all duration-300 mb-6 group hover:shadow-lg">
              <div className="w-4 h-4 sm:w-5 sm:h-5 bg-gradient-to-r from-red-400 to-yellow-400 rounded-full"></div>
              <span className="text-sm sm:text-base">Continue with Google</span>
              <Zap className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-gray-600" />
            </button>

            {/* Divider */}
            <div className="flex items-center space-x-3 sm:space-x-4 mb-6">
              <div className="flex-1 h-px bg-gray-300"></div>
              <span className="text-gray-500 text-xs sm:text-sm">OR CONTINUE WITH EMAIL</span>
              <div className="flex-1 h-px bg-gray-300"></div>
            </div>

            {/* Form */}
            <div className="space-y-4">
              {/* Full Name */}
              <div className="group">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-gray-400 group-focus-within:text-[#0D3B66] transition-colors" />
                  </div>
                  <input
                    type="text"
                    className="w-full bg-gray-50 border border-gray-300 rounded-2xl pl-10 pr-4 py-3 text-gray-800 placeholder-gray-500 focus:border-[#0D3B66] focus:ring-2 focus:ring-[#0D3B66]/20 transition-all duration-300 text-sm"
                    placeholder="Enter your full name"
                    value={data.name}
                    onChange={(e) => setData({ ...data, name: e.target.value })}
                  />
                </div>
              </div>

              {/* Email */}
              <div className="group">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-gray-400 group-focus-within:text-[#0D3B66] transition-colors" />
                  </div>
                  <input
                    type="email"
                    className="w-full bg-gray-50 border border-gray-300 rounded-2xl pl-10 pr-4 py-3 text-gray-800 placeholder-gray-500 focus:border-[#0D3B66] focus:ring-2 focus:ring-[#0D3B66]/20 transition-all duration-300 text-sm"
                    placeholder="your@email.com"
                    value={data.email}
                    onChange={(e) => setData({ ...data, email: e.target.value })}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="group">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-gray-400 group-focus-within:text-[#0D3B66] transition-colors" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full bg-gray-50 border border-gray-300 rounded-2xl pl-10 pr-12 py-3 text-gray-800 placeholder-gray-500 focus:border-[#0D3B66] focus:ring-2 focus:ring-[#0D3B66]/20 transition-all duration-300 text-sm"
                    placeholder="Create a strong password"
                    value={data.password}
                    onChange={(e) => {
                      setData({ ...data, password: e.target.value });
                      checkPasswordStrength(e.target.value);
                    }}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors" />
                    )}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {data.password && (
                  <div className="mt-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-gray-600">Password strength</span>
                      <span className="text-xs text-gray-600">
                        {passwordStrength === 0 && "Very Weak"}
                        {passwordStrength === 1 && "Weak"}
                        {passwordStrength === 2 && "Fair"}
                        {passwordStrength === 3 && "Good"}
                        {passwordStrength === 4 && "Strong"}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          passwordStrength === 0 ? "w-1/12 bg-red-500" :
                          passwordStrength === 1 ? "w-1/4 bg-red-400" :
                          passwordStrength === 2 ? "w-1/2 bg-yellow-500" :
                          passwordStrength === 3 ? "w-3/4 bg-[#0D3B66]/70" :
                          "w-full bg-[#0D3B66]"
                        }`}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Password Requirements */}
                {data.password && (
                  <div className="mt-3 space-y-2">
                    {passwordRequirements.map((req, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <CheckCircle 
                          className={`h-3 w-3 ${req.met ? "text-green-500" : "text-gray-400"}`} 
                        />
                        <span className={`text-xs ${req.met ? "text-green-600" : "text-gray-500"}`}>
                          {req.text}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Business Name */}
              <div className="group">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Business Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building className="h-4 w-4 text-gray-400 group-focus-within:text-[#0D3B66] transition-colors" />
                  </div>
                  <input
                    type="text"
                    className="w-full bg-gray-50 border border-gray-300 rounded-2xl pl-10 pr-4 py-3 text-gray-800 placeholder-gray-500 focus:border-[#0D3B66] focus:ring-2 focus:ring-[#0D3B66]/20 transition-all duration-300 text-sm"
                    placeholder="Your company name"
                    value={data.business}
                    onChange={(e) => setData({ ...data, business: e.target.value })}
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center space-x-2 text-red-600 bg-red-50 border border-red-200 rounded-2xl p-3">
                  <div className="w-4 h-4 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                  </div>
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleRegister}
                disabled={isLoading}
                className="w-full bg-[#0D3B66] hover:bg-[#0A2E4D] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center space-x-2 shadow-lg shadow-[#0D3B66]/25 mt-4"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    <span className="text-sm">Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span className="text-sm">Create Account</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              {/* Terms */}
              <p className="text-center text-gray-500 text-xs pt-4">
                By signing up, you agree to our{" "}
                <span className="text-[#0D3B66] hover:text-[#0A2E4D] cursor-pointer transition-colors">
                  Terms of Service
                </span>{" "}
                and{" "}
                <span className="text-[#0D3B66] hover:text-[#0A2E4D] cursor-pointer transition-colors">
                  Privacy Policy
                </span>
              </p>
            </div>

            {/* Login Link */}
            <div className="text-center mt-6 pt-6 border-t border-gray-200">
              <p className="text-gray-600 text-sm">
                Already have an account?{" "}
                <Link href="/dashboard/login" className="text-[#0D3B66] hover:text-[#0A2E4D] cursor-pointer font-semibold transition-colors inline-flex items-center gap-1 group">
                  Sign In
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </Link>
              </p>
            </div>
          </div>

          {/* Security Badge */}
          <div className="flex items-center justify-center space-x-2 mt-6 text-gray-500 text-xs">
            <Shield className="w-3 h-3" />
            <span>Enterprise-grade security & encryption</span>
          </div>
        </div>
      </div>
    </div>
  );
}