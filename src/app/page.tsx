"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user) {
        setUser(authData.user);
      }
    })();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubscribed(true);
    setEmail("");
  };

  // SVG Icon Components
  const CheckIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );

  const StarIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  );

  const RocketLaunchIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );

  const features = [
    {
      icon: "💬",
      title: "AI-Powered Responses",
      description: "Smart email automation that learns from your communication style and responds intelligently."
    },
    {
      icon: "⚡",
      title: "Lightning Fast",
      description: "Process thousands of emails in seconds with our optimized AI infrastructure."
    },
    {
      icon: "🛡️",
      title: "Enterprise Security",
      description: "Bank-grade security with end-to-end encryption and compliance with global standards."
    },
    {
      icon: "📊",
      title: "Smart Analytics",
      description: "Deep insights into your email performance and customer engagement metrics."
    }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Marketing Director",
      content: "Vaiket reduced our email response time by 85% and increased customer satisfaction scores by 40%. Game-changing!",
      avatar: "SC"
    },
    {
      name: "Marcus Rodriguez",
      role: "CEO, GrowthLabs",
      content: "The AI understands context perfectly. It's like having a personal assistant that never sleeps.",
      avatar: "MR"
    },
    {
      name: "Priya Patel",
      role: "Customer Success Manager",
      content: "We handle 5,000+ customer emails monthly. Vaiket makes it feel like we have a team of 10 instead of 2.",
      avatar: "PP"
    }
  ];

  const stats = [
    { number: "5,000+", label: "Happy Businesses" },
    { number: "10M+", label: "Emails Processed" },
    { number: "85%", label: "Faster Responses" },
    { number: "24/7", label: "Customer Support" }
  ];

  const pricingPlans = [
    {
      name: "Basic",
      price: "499",
      period: "month",
      description: "Perfect for startups",
      features: ["1,250 AI responses/month", "Basic automation", "1 email account", "Standard support"],
      popular: false
    },
    {
      name: "Growth",
      price: "999",
      period: "month",
      description: "Most popular choice",
      features: ["3,250 AI responses/month", "Advanced automation", "5 email accounts", "Priority support", "+750 bonus"],
      popular: true
    },
    {
      name: "Professional",
      price: "2,999",
      period: "month",
      description: "For established businesses",
      features: ["4,000 AI responses/month", "Premium AI features", "Unlimited accounts", "24/7 support"],
      popular: false
    }
  ];

  const comparisonData = [
    {
      aspect: "Work Hours",
      human: "6-7 hours/day",
      ai: "24/7, 365 days",
      aiWin: true
    },
    {
      aspect: "Monthly Cost",
      human: "₹15,000+",
      ai: "From ₹999/month",
      aiWin: true
    },
    {
      aspect: "Customers/Month",
      human: "200-300",
      ai: "10,000+",
      aiWin: true
    },
    {
      aspect: "Response Time",
      human: "Minutes to hours",
      ai: "2.1 seconds avg",
      aiWin: true
    },
    {
      aspect: "Availability",
      human: "Limited hours",
      ai: "Always active",
      aiWin: true
    }
  ];

  const faqs = [
    {
      question: "How quickly can I set up Vaiket?",
      answer: "Most businesses are up and running in under 5 minutes. Just connect your email and let our AI learn your style."
    },
    {
      question: "Is there a free trial?",
      answer: "Yes! All plans include a 14-day free trial with full features. No credit card required to start."
    },
    {
      question: "What email providers do you support?",
      answer: "We support Gmail, Outlook, Yahoo, and any IMAP/SMTP enabled email service."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 overflow-x-hidden">
      {/* Enhanced Navigation */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-lg z-50 border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center h-14 sm:h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <RocketLaunchIcon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                <span className="ml-2 text-lg sm:text-xl font-bold text-gray-900">Vaiket.com</span>
              </div>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:block">
              <div className="ml-4 flex items-baseline space-x-4 lg:space-x-6">
                <a href="#features" className="text-gray-700 hover:text-blue-600 px-2 py-1 text-sm font-medium transition-colors">Features</a>
                <a href="#comparison" className="text-gray-700 hover:text-blue-600 px-2 py-1 text-sm font-medium transition-colors">AI vs Human</a>
                <a href="#pricing" className="text-gray-700 hover:text-blue-600 px-2 py-1 text-sm font-medium transition-colors">Pricing</a>
                <a href="#testimonials" className="text-gray-700 hover:text-blue-600 px-2 py-1 text-sm font-medium transition-colors">Success Stories</a>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:block">
              <div className="ml-4 flex items-center space-x-3">
                {user ? (
                  <Link href="/dashboard" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm">
                    Dashboard
                  </Link>
                ) : (
                  <>
                    <Link href="/login" className="text-gray-700 hover:text-blue-600 px-3 py-1 text-sm font-medium transition-colors">
                      Sign In
                    </Link>
                    <Link href="/signup" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-colors text-sm shadow-lg">
                      Get Started
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex items-center justify-center p-1.5 rounded-md text-gray-700 hover:text-blue-600 focus:outline-none"
              >
                <svg className="h-5 w-5" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200 animate-slideDown">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <a href="#features" className="text-gray-700 hover:text-blue-600 block px-3 py-2 text-base font-medium" onClick={() => setIsMenuOpen(false)}>Features</a>
              <a href="#comparison" className="text-gray-700 hover:text-blue-600 block px-3 py-2 text-base font-medium" onClick={() => setIsMenuOpen(false)}>AI vs Human</a>
              <a href="#pricing" className="text-gray-700 hover:text-blue-600 block px-3 py-2 text-base font-medium" onClick={() => setIsMenuOpen(false)}>Pricing</a>
              <a href="#testimonials" className="text-gray-700 hover:text-blue-600 block px-3 py-2 text-base font-medium" onClick={() => setIsMenuOpen(false)}>Success Stories</a>
              <div className="pt-3 pb-2 border-t border-gray-200">
                {user ? (
                  <Link href="/dashboard" className="bg-blue-600 text-white block text-center px-3 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors" onClick={() => setIsMenuOpen(false)}>
                    Go to Dashboard
                  </Link>
                ) : (
                  <>
                    <Link href="/login" className="text-gray-700 hover:text-blue-600 block px-3 py-2 text-base font-medium" onClick={() => setIsMenuOpen(false)}>Sign In</Link>
                    <Link href="/signup" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white block text-center px-3 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-colors mt-2" onClick={() => setIsMenuOpen(false)}>
                      Get Started Free
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Enhanced Hero Section */}
      <section className="pt-24 pb-12 sm:pt-32 sm:pb-20 px-3 sm:px-4 lg:px-6 relative overflow-hidden">
        {/* Mobile-optimized Background Elements */}
        {!isMobile && (
          <>
            <div className="absolute top-10 left-5 w-12 h-12 bg-blue-200 rounded-full opacity-20 animate-pulse"></div>
            <div className="absolute top-40 right-5 w-10 h-10 bg-purple-200 rounded-full opacity-30 animate-bounce"></div>
          </>
        )}
        
        <div className="max-w-7xl mx-auto relative">
          <div className="flex flex-col lg:flex-row items-center gap-6 sm:gap-8 lg:gap-12">
            {/* Hero Content */}
            <div className="text-center lg:text-left flex-1 w-full">
              <div className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-xs font-medium mb-4 sm:mb-6">
                <StarIcon className="w-3 h-3" />
                <span className="text-xs sm:text-sm">Trusted by 5,000+ Businesses</span>
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight">
                Automate Your Business &{" "}
                <span className="text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text block sm:inline">Dominate Digital</span>
              </h1>

              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-3 sm:p-4 mb-4 sm:mb-6 border border-blue-200">
                <p className="text-sm sm:text-base lg:text-lg text-gray-700 font-medium text-center lg:text-left">
                  <span className="text-red-600">Human: 200 customers/month ❌</span><br className="sm:hidden"/>
                  <span className="text-green-600">Vaiket AI: 10,000+ customers/month ✅</span>
                </p>
                <p className="text-xs sm:text-sm text-gray-600 mt-2 text-center lg:text-left">
                  24/7 AI-powered automation • Starting at ₹999/month • 1000% better results!
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-4 sm:mb-6">
                <Link 
                  href={user ? "/dashboard" : "/signup"}
                  className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95"
                >
                  <RocketLaunchIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  Start 14-Day Free Trial
                </Link>
                <a 
                  href="#comparison" 
                  className="inline-flex items-center justify-center gap-2 bg-white border border-gray-300 hover:border-blue-500 text-gray-700 px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg transition-all duration-200 active:scale-95"
                >
                  📊 See Comparison
                </a>
              </div>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <CheckIcon className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
                  No credit card
                </div>
                <div className="flex items-center gap-1">
                  <CheckIcon className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
                  5-min setup
                </div>
                <div className="flex items-center gap-1">
                  <CheckIcon className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
                  Made in India 🇮🇳
                </div>
              </div>
            </div>

            {/* Mobile-optimized Hero Visual */}
            <div className="flex-1 w-full max-w-md lg:max-w-none">
              <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-1.5 sm:p-2 shadow-xl">
                <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6">
                  <div className="space-y-3 sm:space-y-4">
                    {[1, 2, 3].map((item) => (
                      <div key={item} className={`flex items-center gap-2 sm:gap-3 ${item % 2 === 0 ? '' : 'animate-pulse'}`}>
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-600 text-sm">💬</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="h-3 sm:h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-2 sm:h-3 bg-gray-100 rounded w-1/2 mt-1"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 sm:mt-6 grid grid-cols-3 gap-2 sm:gap-4 p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg sm:rounded-xl">
                    <div className="text-center">
                      <div className="text-base sm:text-lg font-bold text-gray-900">98%</div>
                      <div className="text-xs text-gray-600">Accuracy</div>
                    </div>
                    <div className="text-center">
                      <div className="text-base sm:text-lg font-bold text-gray-900">2.1s</div>
                      <div className="text-xs text-gray-600">Response</div>
                    </div>
                    <div className="text-center">
                      <div className="text-base sm:text-lg font-bold text-gray-900">24/7</div>
                      <div className="text-xs text-gray-600">Active</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Stats Section */}
      <section className="py-8 sm:py-12 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center p-2 sm:p-4">
                <div className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-900 mb-1 sm:mb-2">{stat.number}</div>
                <div className="text-xs sm:text-sm text-gray-600 font-medium leading-tight">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced Features Section */}
      <section id="features" className="py-12 sm:py-16 lg:py-20 px-3 sm:px-4 lg:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-12 lg:mb-16">
            <h2 className="text-xl sm:text-2xl lg:text-4xl xl:text-5xl font-bold text-gray-900 mb-3 sm:mb-4">
              Why Businesses <span className="text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text">Love Vaiket</span>
            </h2>
            <p className="text-sm sm:text-base lg:text-xl text-gray-600 max-w-3xl mx-auto px-2">
              Built for India's digital revolution with powerful AI features
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 active:scale-95 lg:hover:-translate-y-2"
              >
                <div className="text-2xl sm:text-3xl mb-3 sm:mb-4">{feature.icon}</div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3 leading-tight">{feature.title}</h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced AI vs Human Comparison */}
      <section id="comparison" className="py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-blue-600 to-purple-700 text-white px-3 sm:px-4 lg:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-12 lg:mb-16">
            <h2 className="text-xl sm:text-2xl lg:text-4xl font-bold mb-3 sm:mb-4">
              AI vs Human: <span className="text-transparent bg-gradient-to-r from-yellow-300 to-green-300 bg-clip-text">1000% Better</span>
            </h2>
            <p className="text-sm sm:text-base lg:text-xl text-blue-100 max-w-4xl mx-auto">
              Why pay ₹15,000 when AI gives better results at 1/10th cost?
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border border-white/20">
            <div className="overflow-x-auto">
              <div className="grid grid-cols-3 gap-2 min-w-max mb-4 sm:mb-6">
                <div className="w-32 sm:w-48"></div>
                <div className="text-center">
                  <div className="bg-red-500 text-white px-3 sm:px-4 py-2 rounded-xl font-bold text-sm sm:text-base">
                    ❌ Human
                  </div>
                </div>
                <div className="text-center">
                  <div className="bg-green-500 text-white px-3 sm:px-4 py-2 rounded-xl font-bold text-sm sm:text-base">
                    ✅ Vaiket AI
                  </div>
                </div>
              </div>

              {comparisonData.map((item, index) => (
                <div key={index} className={`grid grid-cols-3 gap-2 sm:gap-4 py-3 sm:py-4 ${index % 2 === 0 ? 'bg-white/5' : ''} rounded-xl min-w-max`}>
                  <div className="flex items-center font-bold text-sm sm:text-base lg:text-lg w-32 sm:w-48">
                    {item.aspect}
                  </div>
                  <div className="text-center text-red-200 font-medium text-sm sm:text-base">
                    {item.human}
                  </div>
                  <div className="text-center text-green-200 font-bold text-sm sm:text-base">
                    {item.ai}
                    {item.aiWin && (
                      <span className="ml-1 sm:ml-2 bg-green-500 text-white px-1 sm:px-2 py-0.5 rounded-full text-xs">
                        WIN
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary Box */}
          <div className="mt-6 sm:mt-8 lg:mt-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-center shadow-2xl">
            <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-3 sm:mb-4">
              🚀 The Bottom Line
            </h3>
            <div className="grid grid-cols-3 gap-2 sm:gap-4 text-sm sm:text-base font-medium">
              <div>
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold">₹999/m</div>
                <div className="text-green-100 text-xs sm:text-sm">vs ₹15,000+</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold">10K+</div>
                <div className="text-green-100 text-xs sm:text-sm">vs 200 customers</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold">24/7</div>
                <div className="text-green-100 text-xs sm:text-sm">vs 6-7 hours</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Pricing Section */}
      <section id="pricing" className="py-12 sm:py-16 lg:py-20 bg-white px-3 sm:px-4 lg:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-12 lg:mb-16">
            <h2 className="text-xl sm:text-2xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              Simple, Transparent <span className="text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text">Pricing</span>
            </h2>
            <p className="text-sm sm:text-base lg:text-xl text-gray-600 max-w-3xl mx-auto">
              Start small and scale as you grow. No hidden fees.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <div
                key={index}
                className={`bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl border-2 transition-all duration-300 active:scale-95 lg:hover:scale-105 ${
                  plan.popular
                    ? 'border-purple-500 relative shadow-2xl'
                    : 'border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 sm:px-4 py-1 rounded-full text-xs font-bold shadow-lg">
                      ⭐ POPULAR
                    </div>
                  </div>
                )}

                <div className="text-center mb-4 sm:mb-6">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2">{plan.name}</h3>
                  <p className="text-gray-600 text-sm mb-2 sm:mb-3">{plan.description}</p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">₹{plan.price}</span>
                    <span className="text-gray-600 text-sm">/{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-2">
                      <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700 leading-tight">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={user ? "/dashboard" : "/signup"}
                  className={`w-full py-3 sm:py-4 px-4 rounded-xl font-bold text-sm sm:text-base text-center block transition-all duration-200 active:scale-95 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg hover:shadow-xl'
                      : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:shadow-xl'
                  }`}
                >
                  Start Free Trial
                </Link>
              </div>
            ))}
          </div>

          {/* Payment Methods */}
          <div className="text-center mt-6 sm:mt-8 lg:mt-12">
            <p className="text-gray-600 text-sm sm:text-base mb-3 sm:mb-4">We Accept All Indian Payment Methods</p>
            <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-3">
              {['UPI', 'Net Banking', 'Credit Card', 'Debit Card', 'Paytm'].map((method) => (
                <div key={method} className="bg-gray-100 px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm border border-gray-200">
                  {method}
                </div>
              ))}
              <div className="bg-gradient-to-r from-green-600 to-orange-500 text-white px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-bold">
                Made in India 🇮🇳
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Testimonials */}
      <section id="testimonials" className="py-12 sm:py-16 lg:py-20 bg-gray-50 px-3 sm:px-4 lg:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 sm:mb-12 lg:mb-16">
            <h2 className="text-xl sm:text-2xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              Success <span className="text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text">Stories</span>
            </h2>
            <p className="text-sm sm:text-base lg:text-xl text-gray-600 max-w-3xl mx-auto">
              See how businesses are scaling with Vaiket AI
            </p>
          </div>

          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-gray-100 p-4 sm:p-6 lg:p-8">
            <div className="flex items-center mb-4 sm:mb-6">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg sm:text-xl">
                {testimonials[activeTestimonial].avatar}
              </div>
              <div className="ml-3 sm:ml-4">
                <div className="font-bold text-lg sm:text-xl text-gray-900">{testimonials[activeTestimonial].name}</div>
                <div className="text-gray-600 text-sm sm:text-base">{testimonials[activeTestimonial].role}</div>
              </div>
            </div>
            <p className="text-gray-700 text-base sm:text-lg lg:text-xl italic leading-relaxed">
              "{testimonials[activeTestimonial].content}"
            </p>
            
            <div className="flex justify-center mt-4 sm:mt-6 space-x-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveTestimonial(index)}
                  className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all ${
                    index === activeTestimonial ? 'bg-blue-600 scale-125' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced FAQ */}
      <section id="faq" className="py-12 sm:py-16 lg:py-20 bg-white px-3 sm:px-4 lg:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 sm:mb-12 lg:mb-16">
            <h2 className="text-xl sm:text-2xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              Frequently Asked <span className="text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text">Questions</span>
            </h2>
          </div>

          <div className="space-y-4 sm:space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-gray-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:shadow-lg transition-shadow">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">{faq.question}</h3>
                <p className="text-gray-700 text-sm sm:text-base leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced Newsletter */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-r from-blue-600 to-purple-700 px-3 sm:px-4 lg:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-3 sm:mb-4">
            Join Digital India Revolution
          </h2>
          <p className="text-sm sm:text-base lg:text-xl text-blue-100 mb-4 sm:mb-6 max-w-2xl mx-auto">
            Get tips, updates, and exclusive offers
          </p>
          
          {subscribed ? (
            <div className="bg-green-500 text-white px-4 sm:px-6 py-4 sm:py-6 rounded-2xl shadow-2xl">
              <h3 className="text-lg sm:text-xl font-bold mb-2">🎉 Welcome!</h3>
              <p className="text-green-100 text-sm sm:text-base">Thank you for subscribing!</p>
            </div>
          ) : (
            <form onSubmit={handleNewsletter} className="max-w-md mx-auto">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 rounded-xl border-0 focus:ring-2 focus:ring-blue-300 text-sm sm:text-base"
                  required
                />
                <button
                  type="submit"
                  className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 sm:px-6 py-3 rounded-xl font-bold text-sm sm:text-base shadow-lg hover:shadow-xl transition-all active:scale-95"
                >
                  Subscribe
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Enhanced Final CTA */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-gray-900 to-blue-900 text-white px-3 sm:px-4 lg:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-xl sm:text-2xl lg:text-4xl font-bold mb-3 sm:mb-4">
            Ready to <span className="text-transparent bg-gradient-to-r from-green-300 to-blue-300 bg-clip-text">Dominate</span>?
          </h2>
          <p className="text-sm sm:text-base lg:text-xl text-gray-300 mb-4 sm:mb-6 max-w-2xl mx-auto">
            Join thousands growing 10x faster with AI
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link 
              href={user ? "/dashboard" : "/signup"}
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-bold text-sm sm:text-base shadow-lg hover:shadow-xl transition-all active:scale-95"
            >
              <RocketLaunchIcon className="w-4 h-4" />
              Start Free Trial - ₹0
            </Link>
          </div>
          <p className="text-gray-400 text-xs sm:text-sm mt-3 sm:mt-4">
            No credit card • 14-day trial • 5-min setup • Made in India 🇮🇳
          </p>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className="bg-gray-900 text-white py-8 sm:py-12 lg:py-16 px-3 sm:px-4 lg:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center mb-3 sm:mb-4">
                <RocketLaunchIcon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400" />
                <span className="ml-2 text-lg sm:text-xl font-bold">Vaiket.com</span>
              </div>
              <p className="text-gray-400 text-sm sm:text-base mb-4">
                <strong>Automate Your Business & Dominate Digital World</strong>
              </p>
              <div className="flex gap-2 flex-wrap">
                <div className="bg-green-600 text-white px-2 py-1 rounded text-xs font-bold">
                  Digital India
                </div>
                <div className="bg-orange-500 text-white px-2 py-1 rounded text-xs font-bold">
                  Made in India
                </div>
              </div>
            </div>
            
            {[
              {
                title: "Product",
                links: ["Features", "Pricing", "AI vs Human", "Use Cases"]
              },
              {
                title: "Company", 
                links: ["About Us", "Who We Are", "Services", "Careers"]
              },
              {
                title: "Support",
                links: ["Help Center", "Contact", "Privacy Policy", "Terms"]
              }
            ].map((section, index) => (
              <div key={index}>
                <h4 className="font-bold text-white text-base sm:text-lg mb-2 sm:mb-3">{section.title}</h4>
                <ul className="space-y-1 sm:space-y-2">
                  {section.links.map((link, linkIndex) => (
                    <li key={linkIndex}>
                      <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm sm:text-base">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          {/* Payment Methods */}
          <div className="border-t border-gray-800 mt-6 sm:mt-8 pt-6 sm:pt-8">
            <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
              <div>
                <p className="text-gray-400 text-sm sm:text-base font-medium mb-2">We Accept All Payments</p>
                <div className="flex gap-1 sm:gap-2 flex-wrap">
                  {['UPI', 'Net Banking', 'Credit Card', 'Debit Card', 'Paytm'].map((method) => (
                    <span key={method} className="bg-gray-800 px-2 py-1 rounded text-xs">{method}</span>
                  ))}
                </div>
              </div>
              
              <div className="text-center lg:text-right">
                <div className="bg-gradient-to-r from-green-600 to-orange-500 text-white px-3 sm:px-4 py-2 rounded-lg font-bold text-sm sm:text-base">
                  Made in India 🇮🇳
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-4 sm:mt-6 pt-4 sm:pt-6 text-center text-gray-500 text-xs sm:text-sm">
            <p>© 2024 Vaiket.com. All rights reserved. Built with ❤️ for Indian Businesses.</p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}