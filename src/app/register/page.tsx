"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff, Mail, User, Lock, ArrowRight, CheckCircle, Globe, Zap, ChevronRight, AlertCircle, Key, Server, Users, Clock, Shield, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
    if (password.match(/\d/)) strength++;
    if (password.match(/[^a-zA-Z\d]/)) strength++;
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

  const features = [
    { 
      icon: <Sparkles className="w-5 h-5" />, 
      text: "AI-Powered Automation", 
      desc: "Smart email responses powered by advanced AI"
    },
    { 
      icon: <Zap className="w-5 h-5" />, 
      text: "Real-time Processing", 
      desc: "Handle emails instantly without delays"
    },
    { 
      icon: <Users className="w-5 h-5" />, 
      text: "Team Collaboration", 
      desc: "Work together seamlessly with your team"
    },
    { 
      icon: <Shield className="w-5 h-5" />, 
      text: "Enterprise Security", 
      desc: "Bank-level security for your communications"
    },
  ];

  const passwordRequirements = [
    { text: "At least 8 characters", met: data.password.length >= 8 },
    { text: "Uppercase & lowercase letters", met: /[a-z]/.test(data.password) && /[A-Z]/.test(data.password) },
    { text: "At least one number", met: /\d/.test(data.password) },
    { text: "Special character", met: /[^a-zA-Z\d]/.test(data.password) },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F0F2F5] text-gray-900 font-sans antialiased">
      {/* Left Side - Meta-style Information */}
      <div className="hidden lg:flex lg:w-2/5 flex-col justify-center p-12 xl:p-16 bg-white relative">
        {/* Meta-style gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-gray-50" />
        
        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center space-x-3 mb-12">
            <div className="w-10 h-10 bg-gradient-to-r from-[#1877F2] to-[#42B72A] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">V</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">Vaiket AI</span>
          </div>

          {/* Hero Section */}
          <div className="mb-12">
            <h1 className="text-4xl xl:text-5xl font-bold text-gray-900 mb-4">
              Transform Your
              <span className="block text-[#1877F2]">Email Workflow</span>
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              Join thousands of businesses using AI to automate their email communication.
              Save time, increase productivity, and focus on what matters.
            </p>
          </div>

          {/* Features Grid - Meta Style */}
          <div className="grid grid-cols-2 gap-6 mb-12">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="group p-4 bg-white rounded-xl border border-gray-200 hover:border-[#1877F2]/30 hover:shadow-md transition-all duration-300"
              >
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-[#1877F2]/10 transition-colors duration-300">
                    <div className="text-[#1877F2]">
                      {feature.icon}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{feature.text}</h3>
                    <p className="text-sm text-gray-600">{feature.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 pt-8 border-t border-gray-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">99.9%</div>
              <div className="text-sm text-gray-600">Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">10K+</div>
              <div className="text-sm text-gray-600">Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">24/7</div>
              <div className="text-sm text-gray-600">Support</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Registration Form */}
      <div className="w-full lg:w-3/5 flex items-center justify-center p-6 md:p-8 lg:p-12 xl:p-20">
        <div className="w-full max-w-md">
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center justify-center space-x-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-r from-[#1877F2] to-[#42B72A] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">V</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Vaiket AI</span>
          </div>

          {/* Form Container - Meta Style */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                Create Your Account
              </h2>
              <p className="text-gray-600">
                Get started with Vaiket AI in minutes
              </p>
            </div>

            {/* Google Sign Up - Meta Style */}
            <button className="w-full h-12 bg-white border border-gray-300 hover:border-gray-400 rounded-lg flex items-center justify-center space-x-3 font-medium text-gray-700 transition-all duration-300 mb-6 hover:shadow-sm">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Divider */}
            <div className="flex items-center mb-6">
              <div className="flex-1 h-px bg-gray-300" />
              <span className="px-4 text-sm text-gray-500">or</span>
              <div className="flex-1 h-px bg-gray-300" />
            </div>

            {/* Form */}
            <div className="space-y-4">
              {/* Full Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Full Name</label>
                <div className="relative">
                  <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors duration-300 ${activeInput === 'name' ? 'text-[#1877F2]' : 'text-gray-400'}`}>
                    <User className="h-5 w-5" />
                  </div>
                  <input
                    type="text"
                    className="w-full h-11 bg-white border border-gray-300 rounded-lg pl-10 pr-4 text-gray-900 placeholder-gray-500 focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20 transition-all duration-300"
                    placeholder="Enter your full name"
                    value={data.name}
                    onChange={(e) => setData({ ...data, name: e.target.value })}
                    onFocus={() => setActiveInput('name')}
                    onBlur={() => setActiveInput(null)}
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Email Address</label>
                <div className="relative">
                  <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors duration-300 ${activeInput === 'email' ? 'text-[#1877F2]' : 'text-gray-400'}`}>
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    type="email"
                    className="w-full h-11 bg-white border border-gray-300 rounded-lg pl-10 pr-4 text-gray-900 placeholder-gray-500 focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20 transition-all duration-300"
                    placeholder="your@email.com"
                    value={data.email}
                    onChange={(e) => setData({ ...data, email: e.target.value })}
                    onFocus={() => setActiveInput('email')}
                    onBlur={() => setActiveInput(null)}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <div className="relative">
                  <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors duration-300 ${activeInput === 'password' ? 'text-[#1877F2]' : 'text-gray-400'}`}>
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full h-11 bg-white border border-gray-300 rounded-lg pl-10 pr-12 text-gray-900 placeholder-gray-500 focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20 transition-all duration-300"
                    placeholder="Create a password"
                    value={data.password}
                    onChange={(e) => {
                      setData({ ...data, password: e.target.value });
                      checkPasswordStrength(e.target.value);
                    }}
                    onFocus={() => setActiveInput('password')}
                    onBlur={() => setActiveInput(null)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                    )}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {data.password && (
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Password strength</span>
                      <span className={`text-xs font-medium ${
                        passwordStrength === 0 ? 'text-red-500' :
                        passwordStrength === 1 ? 'text-orange-500' :
                        passwordStrength === 2 ? 'text-yellow-500' :
                        passwordStrength === 3 ? 'text-blue-500' :
                        'text-green-500'
                      }`}>
                        {passwordStrength === 0 && "Very Weak"}
                        {passwordStrength === 1 && "Weak"}
                        {passwordStrength === 2 && "Fair"}
                        {passwordStrength === 3 && "Good"}
                        {passwordStrength === 4 && "Strong"}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          passwordStrength === 0 ? "w-1/12 bg-red-500" :
                          passwordStrength === 1 ? "w-1/4 bg-orange-500" :
                          passwordStrength === 2 ? "w-1/2 bg-yellow-500" :
                          passwordStrength === 3 ? "w-3/4 bg-blue-500" :
                          "w-full bg-green-500"
                        }`}
                      />
                    </div>
                    
                    {/* Password Requirements */}
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      {passwordRequirements.map((req, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <CheckCircle 
                            className={`h-3 w-3 ${req.met ? 'text-green-500' : 'text-gray-300'}`} 
                          />
                          <span className={`text-xs ${req.met ? 'text-green-600' : 'text-gray-500'}`}>
                            {req.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Business Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Company Name</label>
                <div className="relative">
                  <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors duration-300 ${activeInput === 'business' ? 'text-[#1877F2]' : 'text-gray-400'}`}>
                    <Globe className="h-5 w-5" />
                  </div>
                  <input
                    type="text"
                    className="w-full h-11 bg-white border border-gray-300 rounded-lg pl-10 pr-4 text-gray-900 placeholder-gray-500 focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20 transition-all duration-300"
                    placeholder="Your company name"
                    value={data.business}
                    onChange={(e) => setData({ ...data, business: e.target.value })}
                    onFocus={() => setActiveInput('business')}
                    onBlur={() => setActiveInput(null)}
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center space-x-2 bg-red-50 border border-red-200 rounded-lg p-3">
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <span className="text-sm text-red-600">{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleRegister}
                disabled={isLoading}
                className="w-full h-11 bg-[#1877F2] hover:bg-[#166FE5] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-300 flex items-center justify-center space-x-2 mt-6"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Terms */}
              <p className="text-center text-gray-500 text-xs pt-4">
                By clicking Create Account, you agree to our{" "}
                <Link href="/terms" className="text-[#1877F2] hover:underline cursor-pointer">
                  Terms
                </Link>
                ,{" "}
                <Link href="/privacy" className="text-[#1877F2] hover:underline cursor-pointer">
                  Privacy Policy
                </Link>
                {" "}and{" "}
                <Link href="/cookies" className="text-[#1877F2] hover:underline cursor-pointer">
                  Cookie Policy
                </Link>
                .
              </p>
            </div>

            {/* Login Link */}
            <div className="text-center mt-8 pt-8 border-t border-gray-200">
              <p className="text-gray-600">
                Already have an account?{" "}
                <Link href="/login" className="text-[#1877F2] hover:underline cursor-pointer font-semibold">
                  Sign in
                </Link>
              </p>
            </div>

            {/* Security Badge */}
            <div className="flex items-center justify-center space-x-2 mt-6 pt-6 border-t border-gray-200">
              <Key className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500">Protected by enterprise-grade security</span>
            </div>
          </div>

          {/* Business Info */}
          <div className="mt-6 text-center">
            <Link href="/business" className="text-[#1877F2] hover:underline text-sm">
              Create a Page
            </Link>
            {" "}
            <span className="text-gray-500">for a celebrity, brand or business.</span>
          </div>
        </div>
      </div>

      {/* Mobile Features */}
      <div className="lg:hidden w-full p-6 bg-white border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
          Why Choose Vaiket AI?
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {features.slice(0, 4).map((feature, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <div className="text-[#1877F2]">
                    {feature.icon}
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-900">{feature.text}</span>
              </div>
              <p className="text-xs text-gray-600">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="w-full p-4 bg-white border-t border-gray-200 lg:hidden">
        <div className="text-center text-sm text-gray-500">
          Vaiket AI © {new Date().getFullYear()}
        </div>
      </div>

      {/* Global Styles */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }

        /* Meta-style smooth transitions */
        * {
          transition: background-color 0.2s ease, border-color 0.2s ease;
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        ::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }

        /* Selection */
        ::selection {
          background: rgba(24, 119, 242, 0.2);
        }
      `}</style>
    </div>
  );
}