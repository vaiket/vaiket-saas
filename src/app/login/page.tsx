"use client";

import { useState } from "react";
import { Eye, EyeOff, Mail, Lock, ArrowRight, Zap, Shield, Bot, Sparkles, Users, Key, Clock, ChevronRight, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const router = useRouter();
  const [data, setData] = useState({
    email: "",
    password: "",
  });

  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeInput, setActiveInput] = useState<string | null>(null);

  async function submit() {
    setIsLoading(true);
    setError("");

    if (!data.email || !data.password) {
      setError("Please fill all fields");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      const json = await res.json();
      console.log("LOGIN RESPONSE:", json);

      if (!json.success) {
        setError(json.error || "Invalid email or password");
        return;
      }

      localStorage.setItem("loggedIn", "true");
      localStorage.setItem("email", data.email);

      if (json.onboardingCompleted) {
        window.location.href = "/dashboard";
      } else {
        window.location.href = "/onboarding";
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong!");
    } finally {
      setIsLoading(false);
    }
  }

  const features = [
    { 
      icon: <Bot className="w-5 h-5" />, 
      text: "AI-Powered Automation", 
      desc: "Smart email responses powered by AI"
    },
    { 
      icon: <Zap className="w-5 h-5" />, 
      text: "Real-time Processing", 
      desc: "Handle emails instantly without delays"
    },
    { 
      icon: <Sparkles className="w-5 h-5" />, 
      text: "Predictive Analytics", 
      desc: "Insights to improve your workflow"
    },
  ];

  const stats = [
    { value: "98%", label: "Accuracy Rate" },
    { value: "10K+", label: "Active Users" },
    { value: "24/7", label: "AI Support" },
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
              Welcome Back to
              <span className="block text-[#1877F2]">Your Workspace</span>
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              Continue your journey with intelligent email automation. 
              Access your AI-powered inbox and smart workflows.
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
              <div className="text-2xl font-bold text-gray-900 mb-1">98%</div>
              <div className="text-sm text-gray-600">Accuracy</div>
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

      {/* Right Side - Login Form */}
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
                Welcome Back
              </h2>
              <p className="text-gray-600">
                Sign in to continue to your workspace
              </p>
            </div>

            {/* Google Login - Meta Style */}
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
                    onChange={(e) => {
                      setData({ ...data, email: e.target.value });
                      setActiveInput('email');
                    }}
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
                    type={showPass ? "text" : "password"}
                    className="w-full h-11 bg-white border border-gray-300 rounded-lg pl-10 pr-12 text-gray-900 placeholder-gray-500 focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20 transition-all duration-300"
                    placeholder="Enter your password"
                    onChange={(e) => {
                      setData({ ...data, password: e.target.value });
                      setActiveInput('password');
                    }}
                    onFocus={() => setActiveInput('password')}
                    onBlur={() => setActiveInput(null)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPass(!showPass)}
                  >
                    {showPass ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                    )}
                  </button>
                </div>
              </div>

              {/* Forgot Password Link */}
              <div className="flex justify-end">
                <Link 
                  href="/forgot-password" 
                  className="text-[#1877F2] hover:underline text-sm font-medium"
                >
                  Forgot Password?
                </Link>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center space-x-2 bg-red-50 border border-red-200 rounded-lg p-3">
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <span className="text-sm text-red-600">{error}</span>
                </div>
              )}

              {/* Login Button */}
              <button
                onClick={submit}
                disabled={isLoading}
                className="w-full h-11 bg-[#1877F2] hover:bg-[#166FE5] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-300 flex items-center justify-center space-x-2 mt-4"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Terms */}
              <p className="text-center text-gray-500 text-xs pt-4">
                By signing in, you agree to our{" "}
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

            {/* Register Link */}
            <div className="text-center mt-8 pt-8 border-t border-gray-200">
              <p className="text-gray-600">
                Don't have an account?{" "}
                <Link href="/register" className="text-[#1877F2] hover:underline cursor-pointer font-semibold">
                  Create New Account
                </Link>
              </p>
            </div>

            {/* Security Badge */}
            <div className="flex items-center justify-center space-x-2 mt-6 pt-6 border-t border-gray-200">
              <Shield className="w-4 h-4 text-gray-400" />
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
          {features.map((feature, index) => (
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