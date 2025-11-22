"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [tenantId, setTenantId] = useState<number | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(true);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // ----------------------------------------------------
  // 🔥 On page load → check user login + fetch tenant Id
  // ----------------------------------------------------
  useEffect(() => {
    (async () => {
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();

        if (authError || !authData.user) {
          // User NOT logged in → send to login
          window.location.href = "/login?redirect=/pricing";
          return;
        }

        setUser(authData.user);

        // Fetch user record from User table
        const { data: userRecord, error: userError } = await supabase
          .from("User")
          .select("tenantId, name, email, mobile")
          .eq("email", authData.user.email)
          .single();

        if (userRecord) {
          setTenantId(userRecord.tenantId);
        } else {
          console.error("User record not found:", userError);
        }
      } catch (error) {
        console.error("Auth error:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ----------------------------------------------------
  // 🔥 PAYMENT START
  // ----------------------------------------------------
  async function handleBuy(planKey: string) {
    try {
      setLoadingPlan(planKey);

      const PLANS: any = {
        basic: { monthly: 499, yearly: 4999, key: "basic" },
        popular: { monthly: 999, yearly: 9999, key: "popular" },
        pro: { monthly: 2999, yearly: 12000, key: "pro" },
      };

      const plan = PLANS[planKey] || PLANS["basic"];
      const amount = billingPeriod === "yearly" ? plan.yearly : plan.monthly;

      const res = await fetch("/api/payments/payu/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          productinfo: `Vaiket ${planKey} plan`,
          firstname: user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User",
          email: user?.email,
          phone: user?.user_metadata?.mobile || "9999999999",
          userId: user?.id,
          tenantId: tenantId,
        }),
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Payment initiation failed");

      if (data.html) {
        const w = window.open("", "_self");
        if (!w) throw new Error("Unable to open payment window");
        w.document.write(data.html);
        w.document.close();
        return;
      }

      alert("Error: No PayU HTML received.");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Payment initiation failed");
    } finally {
      setLoadingPlan(null);
    }
  }

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading pricing...</p>
        </div>
      </div>
    );
  }

  // Show loading until we have user and tenantId
  if (!user || !tenantId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Setting up your account...</p>
        </div>
      </div>
    );
  }

  const plans = [
    {
      key: "basic",
      name: "Basic",
      description: "Perfect for individuals & small projects",
      monthlyPrice: 499,
      yearlyPrice: 4999,
      monthlyResponses: "1,250",
      yearlyResponses: "1,250",
      popular: false,
      features: [
        "1,250 AI responses per month",
        "Basic email automation",
        "IMAP + SMTP integration",
        "1 email account",
        "Standard support (48h)",
        "Basic analytics",
        "5GB storage",
        "Up to 500 contacts",
        "Mobile app",
        "Email templates"
      ],
      cta: "Get Started",
      color: "blue"
    },
    {
      key: "popular",
      name: "Growth",
      description: "Most popular - perfect for growing businesses",
      monthlyPrice: 999,
      yearlyPrice: 9999,
      monthlyResponses: "3,250",
      yearlyResponses: "1,00,000",
      popular: true,
      features: [
        "3,250 responses (2,500 + 750 bonus)",
        "Advanced AI automation",
        "Priority IMAP + SMTP",
        "5 email accounts",
        "Priority support (24h)",
        "Advanced analytics",
        "50GB storage",
        "Up to 5,000 contacts",
        "Custom sequences",
        "A/B testing",
        "API access",
        "Team collaboration"
      ],
      cta: "Start Growing",
      color: "purple"
    },
    {
      key: "pro",
      name: "Professional",
      description: "For businesses needing maximum power",
      monthlyPrice: 2999,
      yearlyPrice: 12000,
      monthlyResponses: "4,000",
      yearlyResponses: "Unlimited",
      popular: false,
      features: [
        "4,000 AI responses monthly",
        "Premium AI with custom training",
        "Dedicated servers",
        "Unlimited email accounts",
        "24/7 premium support",
        "Advanced AI analytics",
        "500GB storage",
        "Unlimited contacts",
        "Advanced workflows",
        "Multi-channel campaigns",
        "Full API access",
        "Dedicated manager",
        "Custom integrations",
        "SLA guarantee",
        "Advanced security"
      ],
      cta: "Go Pro",
      color: "emerald"
    }
  ];

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

  const ShieldCheckIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );

  const RocketLaunchIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );

  const ChartBarIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 py-12 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center max-w-4xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
          <StarIcon className="w-4 h-4" />
          Trusted by 5,000+ businesses worldwide
        </div>
        
        <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
          Pricing that <span className="text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text">scales</span> with you
        </h1>
        
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
          Start small, grow big. Upgrade anytime with our flexible plans designed for every stage.
        </p>

        {/* Billing Toggle */}
        <div className="inline-flex items-center bg-white rounded-lg p-1 border border-gray-200 shadow-sm mb-12">
          <button
            onClick={() => setBillingPeriod("monthly")}
            className={`px-6 py-3 rounded-md text-sm font-medium transition-all duration-200 ${
              billingPeriod === "monthly"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setBillingPeriod("yearly")}
            className={`px-6 py-3 rounded-md text-sm font-medium transition-all duration-200 relative ${
              billingPeriod === "yearly"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Yearly Billing
            <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
              Save 60%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-6 items-stretch">
        {plans.map((plan) => (
          <div
            key={plan.key}
            className={`relative rounded-3xl transition-all duration-300 hover:scale-105 ${
              plan.popular
                ? "bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-2xl shadow-purple-500/25 transform -translate-y-4"
                : "bg-white text-gray-900 shadow-xl shadow-gray-200/50 border border-gray-100"
            }`}
          >
            {/* Popular Badge */}
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg shadow-yellow-500/25">
                  ⭐ MOST POPULAR
                </div>
              </div>
            )}

            <div className="p-8">
              {/* Plan Header */}
              <div className="text-center mb-6">
                <h3 className={`text-2xl font-bold mb-2 ${plan.popular ? "text-white" : "text-gray-900"}`}>
                  {plan.name}
                </h3>
                <p className={`text-sm ${plan.popular ? "text-blue-100" : "text-gray-600"} mb-4`}>
                  {plan.description}
                </p>
                
                {/* Response Limit */}
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                  plan.popular 
                    ? "bg-blue-500/20 text-blue-200" 
                    : "bg-blue-100 text-blue-700"
                }`}>
                  <ChartBarIcon className="w-4 h-4" />
                  {billingPeriod === "monthly" ? plan.monthlyResponses : plan.yearlyResponses} AI Responses
                </div>
              </div>

              {/* Price */}
              <div className="text-center mb-6">
                <div className="flex items-baseline justify-center gap-2">
                  <span className={`text-4xl font-bold ${plan.popular ? "text-white" : "text-gray-900"}`}>
                    ₹{billingPeriod === "yearly" ? plan.yearlyPrice : plan.monthlyPrice}
                  </span>
                  {billingPeriod === "monthly" && (
                    <span className={`text-lg ${plan.popular ? "text-blue-100" : "text-gray-600"}`}>
                      /month
                    </span>
                  )}
                </div>
                
                {billingPeriod === "yearly" && (
                  <div className="mt-2">
                    <p className={`text-sm ${plan.popular ? "text-blue-100" : "text-gray-600"}`}>
                      Equivalent to ₹{Math.round(plan.yearlyPrice / 12)}/month
                    </p>
                    <div className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-medium mt-2">
                      <CheckIcon className="w-3 h-3" />
                      Save {Math.round((1 - (plan.yearlyPrice / 12) / plan.monthlyPrice) * 100)}% annually
                    </div>
                  </div>
                )}
              </div>

              {/* CTA Button */}
              <button
                onClick={() => handleBuy(plan.key)}
                disabled={loadingPlan === plan.key}
                className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-200 shadow-lg hover:shadow-xl ${
                  plan.popular
                    ? "bg-white text-purple-600 hover:bg-gray-50 hover:scale-105"
                    : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white hover:scale-105"
                } disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
              >
                {loadingPlan === plan.key ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    {plan.cta}
                    <RocketLaunchIcon className="w-5 h-5" />
                  </div>
                )}
              </button>

              {/* Features List */}
              <ul className="mt-8 space-y-4">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckIcon
                      className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                        plan.popular ? "text-blue-200" : "text-green-500"
                      }`}
                    />
                    <span className={`text-sm ${plan.popular ? "text-blue-100" : "text-gray-600"}`}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Upgrade Notice */}
            {billingPeriod === "yearly" && (
              <div className={`border-t ${
                plan.popular ? "border-blue-500" : "border-gray-200"
              } p-4 text-center`}>
                <div className="flex items-center justify-center gap-2 text-sm">
                  <CheckIcon className={`w-4 h-4 ${
                    plan.popular ? "text-blue-300" : "text-green-500"
                  }`} />
                  <span className={plan.popular ? "text-blue-200" : "text-gray-600"}>
                    Upgrade or downgrade anytime
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Visual Comparison Section */}
      <div className="max-w-6xl mx-auto mt-20">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
          See the Difference
        </h2>
        <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
          Visual comparison of what each plan offers to help you make the right choice
        </p>

        {/* Response Limit Graph */}
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8 mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
            AI Response Limits Comparison
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan, index) => (
              <div key={plan.key} className="text-center">
                <div className={`h-48 flex items-end justify-center mb-4 ${
                  plan.popular ? 'bg-gradient-to-t from-purple-500/20 to-blue-500/20' : 'bg-gray-100'
                } rounded-xl p-4`}>
                  <div 
                    className={`w-16 rounded-t-lg transition-all duration-1000 ${
                      plan.popular 
                        ? 'bg-gradient-to-t from-purple-600 to-blue-600' 
                        : 'bg-gradient-to-t from-blue-400 to-blue-300'
                    }`}
                    style={{ 
                      height: plan.popular ? '180px' : 
                              plan.key === 'basic' ? '80px' : '140px'
                    }}
                  ></div>
                </div>
                <h4 className={`font-bold text-lg ${
                  plan.popular ? 'text-purple-600' : 'text-gray-900'
                }`}>
                  {plan.name}
                </h4>
                <p className="text-gray-600 text-sm mt-1">
                  {billingPeriod === 'monthly' ? plan.monthlyResponses : plan.yearlyResponses} responses
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Comparison Table */}
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Detailed Feature Comparison
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-4 font-semibold text-gray-900">Features</th>
                  {plans.map((plan) => (
                    <th key={plan.key} className="text-center py-4 font-semibold text-gray-900">
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <td className="py-4 font-medium text-gray-700">AI Responses/Month</td>
                  <td className="text-center py-4">
                    <span className="font-bold text-blue-600">1,250</span>
                  </td>
                  <td className="text-center py-4">
                    <span className="font-bold text-purple-600">3,250</span>
                    <div className="text-xs text-green-600 mt-1">+750 bonus</div>
                  </td>
                  <td className="text-center py-4">
                    <span className="font-bold text-emerald-600">4,000</span>
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-4 font-medium text-gray-700">Yearly Responses</td>
                  <td className="text-center py-4">15,000</td>
                  <td className="text-center py-4">
                    <span className="font-bold">1,00,000</span>
                  </td>
                  <td className="text-center py-4">
                    <span className="font-bold text-green-600">Unlimited</span>
                  </td>
                </tr>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <td className="py-4 font-medium text-gray-700">Email Accounts</td>
                  <td className="text-center py-4">1</td>
                  <td className="text-center py-4">5</td>
                  <td className="text-center py-4">Unlimited</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-4 font-medium text-gray-700">Storage</td>
                  <td className="text-center py-4">5GB</td>
                  <td className="text-center py-4">50GB</td>
                  <td className="text-center py-4">500GB</td>
                </tr>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <td className="py-4 font-medium text-gray-700">Support</td>
                  <td className="text-center py-4">Standard (48h)</td>
                  <td className="text-center py-4">Priority (24h)</td>
                  <td className="text-center py-4">24/7 Premium</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-4 font-medium text-gray-700">API Access</td>
                  <td className="text-center py-4">-</td>
                  <td className="text-center py-4">
                    <CheckIcon className="w-5 h-5 text-green-500 mx-auto" />
                  </td>
                  <td className="text-center py-4">
                    <CheckIcon className="w-5 h-5 text-green-500 mx-auto" />
                  </td>
                </tr>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <td className="py-4 font-medium text-gray-700">Advanced Analytics</td>
                  <td className="text-center py-4">Basic</td>
                  <td className="text-center py-4">
                    <CheckIcon className="w-5 h-5 text-green-500 mx-auto" />
                  </td>
                  <td className="text-center py-4">
                    <CheckIcon className="w-5 h-5 text-green-500 mx-auto" />
                  </td>
                </tr>
                <tr>
                  <td className="py-4 font-medium text-gray-700">Dedicated Manager</td>
                  <td className="text-center py-4">-</td>
                  <td className="text-center py-4">-</td>
                  <td className="text-center py-4">
                    <CheckIcon className="w-5 h-5 text-green-500 mx-auto" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-4xl mx-auto mt-20">
        <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">Frequently Asked Questions</h3>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h4 className="font-semibold text-gray-900 mb-3">Can I upgrade or downgrade later?</h4>
            <p className="text-gray-600 text-sm">Yes! You can change your plan anytime. We'll prorate the difference and the changes take effect immediately.</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h4 className="font-semibold text-gray-900 mb-3">Is there a free trial?</h4>
            <p className="text-gray-600 text-sm">All plans include a 14-day free trial. No credit card required to start.</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h4 className="font-semibold text-gray-900 mb-3">What happens if I exceed response limits?</h4>
            <p className="text-gray-600 text-sm">We'll notify you before you reach your limit. You can upgrade or purchase additional responses as needed.</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h4 className="font-semibold text-gray-900 mb-3">Do you offer custom enterprise plans?</h4>
            <p className="text-gray-600 text-sm">Yes! Contact our sales team for custom pricing and features tailored to your enterprise needs.</p>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="max-w-2xl mx-auto mt-20 text-center bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-8 text-white shadow-2xl shadow-purple-500/25">
        <h3 className="text-2xl font-bold mb-4">Ready to Supercharge Your Email Productivity?</h3>
        <p className="text-blue-100 mb-6">Join 5,000+ businesses that trust us with their communication</p>
        <button
          onClick={() => handleBuy("popular")}
          className="bg-white text-blue-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-50 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          Start Your 14-Day Free Trial
        </button>
        <p className="text-blue-200 text-sm mt-4">No credit card required • Cancel anytime • Upgrade/downgrade flexible</p>
      </div>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto mt-20 pt-8 border-t border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h4 className="font-bold text-gray-900 mb-4">Vaiket AI</h4>
            <p className="text-gray-600 text-sm">
              Intelligent email automation for modern businesses. Scale your communication with AI-powered responses.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><a href="#" className="hover:text-blue-600">Features</a></li>
              <li><a href="#" className="hover:text-blue-600">Pricing</a></li>
              <li><a href="#" className="hover:text-blue-600">Use Cases</a></li>
              <li><a href="#" className="hover:text-blue-600">Integrations</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><a href="#" className="hover:text-blue-600">Help Center</a></li>
              <li><a href="#" className="hover:text-blue-600">Contact Us</a></li>
              <li><a href="#" className="hover:text-blue-600">API Docs</a></li>
              <li><a href="#" className="hover:text-blue-600">Status</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><a href="#" className="hover:text-blue-600">About</a></li>
              <li><a href="#" className="hover:text-blue-600">Blog</a></li>
              <li><a href="#" className="hover:text-blue-600">Careers</a></li>
              <li><a href="#" className="hover:text-blue-600">Privacy</a></li>
            </ul>
          </div>
        </div>
        <div className="text-center text-gray-500 text-sm mt-8 pt-6 border-t border-gray-200">
          <p>© 2024 Vaiket AI. All rights reserved. Built with ❤️ for better communication.</p>
        </div>
      </footer>
    </div>
  );
}