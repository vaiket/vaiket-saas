"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Lock, Shield, Mail, ArrowRight, Bot, Zap, Sparkles, ArrowLeft, Key, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

export default function VerifyResetOtp() {
  const params = useSearchParams();
  const router = useRouter();
  const email = params.get("email");

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    
    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const checkPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
    if (password.match(/\d/)) strength++;
    if (password.match(/[^a-zA-Z\d]/)) strength++;
    setPasswordStrength(strength);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (/^\d+$/.test(pastedData)) {
      const newOtp = pastedData.split('').slice(0, 6);
      setOtp([...newOtp, ...Array(6 - newOtp.length).fill('')]);
      
      // Focus the last input with data
      const lastFilledIndex = newOtp.length - 1;
      if (lastFilledIndex < 5) {
        otpRefs.current[lastFilledIndex + 1]?.focus();
      } else {
        otpRefs.current[5]?.focus();
      }
    }
  };

  const handleResendOtp = async () => {
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (json.success) {
        setTimeLeft(300); // Reset timer to 5 minutes
        setError(""); // Clear any existing errors
        // You might want to show a success message here
      } else {
        setError(json.error || "Failed to resend OTP");
      }
    } catch (err) {
      setError("Failed to resend OTP");
    }
  };

  async function handleVerify() {
    setIsLoading(true);
    setError("");

    const otpString = otp.join('');
    
    if (!otpString || otpString.length !== 6) {
      setError("Please enter the 6-digit OTP");
      setIsLoading(false);
      return;
    }

    if (!password || !confirmPassword) {
      setError("Please fill all password fields");
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/verify-reset-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otp: otpString,
          newPassword: password,
        }),
      });

      const json = await res.json();

      if (json.success) {
        router.push("/login?message=Password reset successfully");
      } else {
        setError(json.error || "Invalid OTP or verification failed");
      }
    } catch (err) {
      setError("Network error - please try again");
    } finally {
      setIsLoading(false);
    }
  }

  const features = [
    { icon: <Bot className="w-5 h-5" />, text: "AI-Powered Email Automation" },
    { icon: <Zap className="w-5 h-5" />, text: "Smart Response Generation" },
    { icon: <Sparkles className="w-5 h-5" />, text: "Predictive Analytics" },
  ];

  const passwordRequirements = [
    { text: "At least 8 characters", met: password.length >= 8 },
    { text: "Uppercase & lowercase letters", met: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    { text: "At least one number", met: /\d/.test(password) },
    { text: "Special character", met: /[^a-zA-Z\d]/.test(password) },
  ];

  const getStrengthColor = () => {
    switch (passwordStrength) {
      case 0: return "bg-red-500";
      case 1: return "bg-red-400";
      case 2: return "bg-yellow-500";
      case 3: return "bg-blue-500";
      case 4: return "bg-green-500";
      default: return "bg-gray-300";
    }
  };

  const getStrengthText = () => {
    switch (passwordStrength) {
      case 0: return "Very Weak";
      case 1: return "Weak";
      case 2: return "Fair";
      case 3: return "Good";
      case 4: return "Strong";
      default: return "";
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Left Side - Promotional Content */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0D3B66]/10 to-[#0D3B66]/5"></div>
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-[#0D3B66]/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 -right-20 w-72 h-72 bg-[#0D3B66]/5 rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-12 h-12 bg-[#0D3B66] rounded-xl flex items-center justify-center shadow-lg">
              <Key className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-[#0D3B66]">VAIKET AI</span>
          </div>

          <h1 className="text-5xl font-bold leading-tight mb-6 text-gray-800">
            Secure Your
            <span className="text-[#0D3B66] block">Account Access</span>
          </h1>

          <p className="text-xl text-gray-600 mb-12 max-w-md leading-relaxed">
            Verify your identity and create a new secure password to regain access to your AI-powered workspace.
          </p>

          <div className="space-y-4 mb-12">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center space-x-4 group">
                <div className="w-12 h-12 bg-[#0D3B66]/10 rounded-xl flex items-center justify-center group-hover:bg-[#0D3B66]/20 transition-all duration-300">
                  <div className="text-[#0D3B66]">{feature.icon}</div>
                </div>
                <span className="text-gray-700 text-lg font-medium">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-8">
          {["98% Accuracy", "10K+ Users", "24/7 Support"].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-2xl font-bold text-[#0D3B66]">{stat.split(' ')[0]}</div>
              <div className="text-gray-600 text-sm">{stat.split(' ').slice(1).join(' ')}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Side - Verification Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center justify-center space-x-3 mb-8">
            <div className="w-12 h-12 bg-[#0D3B66] rounded-xl flex items-center justify-center shadow-lg">
              <Key className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-[#0D3B66]">VAIKET AI</span>
          </div>

          <Link 
            href="/forgot-password" 
            className="inline-flex items-center space-x-2 text-[#0D3B66] hover:text-[#0A2E4D] transition-colors mb-6 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back</span>
          </Link>

          <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 lg:p-10 shadow-2xl shadow-[#0D3B66]/10">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-[#0D3B66]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-[#0D3B66]" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
                Reset Password
              </h1>
              <p className="text-gray-600 text-sm">
                Code sent to <span className="text-[#0D3B66] font-medium">{email}</span>
              </p>
            </div>

            {/* OTP Input Section */}
            <div className="mb-6">
              <label className="text-sm font-medium text-gray-700 mb-3 block">
                Verification Code
                <span className="ml-2 text-xs font-normal text-gray-500">
                  (Expires in {formatTime(timeLeft)})
                </span>
              </label>
              <div className="flex space-x-2 justify-center" onPaste={handlePaste}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (otpRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-12 h-12 text-center text-lg font-semibold bg-gray-50 border border-gray-300 rounded-xl focus:border-[#0D3B66] focus:ring-2 focus:ring-[#0D3B66]/20 transition-all duration-200"
                  />
                ))}
              </div>
            </div>

            {/* Password Fields */}
            <div className="space-y-4">
              <div className="group">
                <label className="text-sm font-medium text-gray-700 mb-2 block">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full bg-gray-50 border border-gray-300 rounded-2xl pl-10 pr-10 py-3 text-gray-800 placeholder-gray-500 focus:border-[#0D3B66] focus:ring-2 focus:ring-[#0D3B66]/20 transition-all duration-300"
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      checkPasswordStrength(e.target.value);
                    }}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-3.5"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>

                {password && (
                  <div className="mt-3 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-600">Password strength</span>
                      <span className={`font-medium ${
                        passwordStrength === 0 ? "text-red-500" :
                        passwordStrength === 1 ? "text-red-400" :
                        passwordStrength === 2 ? "text-yellow-500" :
                        passwordStrength === 3 ? "text-blue-500" :
                        "text-green-500"
                      }`}>
                        {getStrengthText()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor()}`}
                        style={{ width: `${(passwordStrength / 4) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="group">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full bg-gray-50 border border-gray-300 rounded-2xl pl-10 pr-4 py-3 text-gray-800 placeholder-gray-500 focus:border-[#0D3B66] focus:ring-2 focus:ring-[#0D3B66]/20 transition-all duration-300"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center space-x-2 text-red-600 bg-red-50 border border-red-200 rounded-2xl p-3">
                  <div className="w-4 h-4 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                  </div>
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <button
                onClick={handleVerify}
                disabled={isLoading || timeLeft <= 0}
                className="w-full bg-[#0D3B66] hover:bg-[#0A2E4D] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center space-x-2 shadow-lg"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Resetting Password...</span>
                  </>
                ) : (
                  <>
                    <span>Reset Password</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            <div className="text-center mt-6 pt-6 border-t border-gray-200">
              <p className="text-gray-600 text-sm">
                Didn't receive the code?{" "}
                <button
                  onClick={handleResendOtp}
                  disabled={timeLeft > 0}
                  className="text-[#0D3B66] hover:text-[#0A2E4D] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Resend OTP {timeLeft > 0 && `(${formatTime(timeLeft)})`}
                </button>
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center space-x-2 mt-6 text-gray-500 text-sm">
            <Shield className="w-4 h-4" />
            <span>Enterprise-grade security</span>
          </div>
        </div>
      </div>
    </div>
  );
}