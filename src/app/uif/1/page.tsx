// components/hero-section.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Play, 
  Star, 
  Check, 
  MessageCircle, 
  Zap, 
  Shield,
  Clock,
  TrendingUp,
  Settings,
  Mail,
  MessageSquare,
  Smartphone,
  Bot
} from 'lucide-react';

export default function HeroSection() {
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  return (
    <section className="min-h-screen bg-[#0D1117] relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-br from-[#6366F1]/10 to-[#A855F7]/10 rounded-full blur-3xl"></div>
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-[#6366F1]/5 rounded-full blur-3xl"></div>
      
      <div className="relative container mx-auto px-6 lg:px-8 py-24 lg:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          
          {/* Left Column - Content */}
          <div className="text-center lg:text-left space-y-8">
            
            {/* Trust Badge */}
            <div className="inline-flex items-center space-x-2 bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-full px-4 py-2">
              <div className="flex items-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3 h-3 text-yellow-400 fill-current" />
                ))}
              </div>
              <span className="text-sm text-gray-300 font-medium">Trusted by 1,200+ businesses</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl lg:text-6xl xl:text-7xl font-bold text-white leading-tight tracking-tight">
              Automate Every Customer
              <span className="relative">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6366F1] to-[#A855F7] block">
                  Conversation — Instantly.
                </span>
                <span className="absolute bottom-2 left-0 w-full h-1 bg-gradient-to-r from-[#6366F1] to-[#A855F7] rounded-full opacity-80"></span>
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl lg:text-2xl text-gray-300 leading-relaxed max-w-2xl font-light">
              AI that understands your business, replies to customers, follows up, and grows revenue — without hiring.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              {/* Primary CTA */}
              <Link
                href="/signup"
                className="group relative bg-gradient-to-r from-[#6366F1] to-[#A855F7] text-white px-8 py-4 rounded-xl font-semibold text-lg hover:shadow-2xl hover:shadow-[#6366F1]/30 transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-3"
              >
                <span>Start Free Trial</span>
                <div className="group-hover:translate-x-1 transition-transform duration-200">
                  →
                </div>
                {/* Glow effect */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#A855F7] blur-md opacity-50 group-hover:opacity-70 transition-opacity duration-300 -z-10"></div>
              </Link>

              {/* Secondary CTA */}
              <button
                onClick={() => setIsVideoOpen(true)}
                className="group border border-gray-600 text-gray-300 px-8 py-4 rounded-xl font-semibold text-lg hover:border-gray-500 hover:bg-gray-800/20 transition-all duration-200 flex items-center justify-center space-x-3"
              >
                <Play className="w-5 h-5" />
                <span>Watch Demo</span>
              </button>
            </div>

            {/* Trust Cue */}
            <div className="flex items-center justify-center lg:justify-start space-x-4 text-gray-400 text-sm">
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-green-400" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-green-400" />
                <span>Free forever plan</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-green-400" />
                <span>Cancel anytime</span>
              </div>
            </div>

            {/* Micro Benefits */}
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto lg:mx-0">
              {[
                { icon: Zap, text: "Reply 10× faster" },
                { icon: TrendingUp, text: "Convert more leads" },
                { icon: Settings, text: "Zero setup" },
                { icon: Clock, text: "24/7 availability" }
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center space-x-3 text-gray-300 group hover:text-white transition-coluration-200">
                  <div className="w-10 h-10 bg-gray-800/50 rounded-lg flex items-center justify-center group-hover:bg-gray-700/50 transition-colors duration-200">
                    <Icon className="w-5 h-5 text-[#6366F1]" />
                  </div>
                  <span className="text-sm font-medium">{text}</span>
                </div>
              ))}
            </div>

            {/* Social Proof */}
            <div className="space-y-6 pt-8">
              <p className="text-gray-400 text-sm font-medium text-center lg:text-left">Trusted by teams at</p>
              <div className="flex flex-wrap justify-center lg:justify-start gap-8 opacity-60">
                {["Zoho", "Freshworks", "Razorpay", "Unacademy", "Cred", "Groww"].map((company) => (
                  <div 
                    key={company} 
                    className="text-gray-400 font-semibold text-lg hover:text-gray-300 transition-colors duration-200"
                  >
                    {company}
                  </div>
                ))}
              </div>
            </div>

            {/* Stats & Compliance */}
            <div className="space-y-6 pt-8">
              {/* Performance Stats */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-8">
                {[
                  { value: "50,000+", label: "automated replies" },
                  { value: "98%", label: "response accuracy" },
                  { value: "2min", label: "setup time" }
                ].map((stat) => (
                  <div key={stat.label} className="text-center lg:text-left">
                    <div className="text-2xl font-bold text-white">{stat.value}</div>
                    <div className="text-gray-400 text-sm">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Compliance Badges */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                {[
                  { text: "DPDP Act Compliant", flag: "🇮🇳" },
                  { text: "IMAP/SMTP Secure", icon: "🔐" },
                  { text: "99.9% Uptime", icon: "✅" },
                  { text: "Made in India", flag: "🇮🇳" }
                ].map((item) => (
                  <div 
                    key={item.text} 
                    className="flex items-center space-x-2 bg-gray-800/30 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-700/50"
                  >
                    <span className="text-gray-300 text-sm font-medium">{item.text}</span>
                    <span>{item.flag || item.icon}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Visual */}
          <div className="relative">
            {/* Main Product Visual */}
            <div className="relative bg-gray-800/20 backdrop-blur-sm rounded-3xl border border-gray-700/50 p-8 shadow-2xl">
              
              {/* Unified Inbox Mockup */}
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                    <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  </div>
                  <div className="text-white font-semibold text-lg">Unified Inbox</div>
                  <div className="w-8 h-8 bg-gray-700/50 rounded-lg flex items-center justify-center">
                    <Settings className="w-4 h-4 text-gray-400" />
                  </div>
                </div>

                {/* Channel Tabs */}
                <div className="flex space-x-4 border-b border-gray-700/50 pb-4">
                  {["All", "Email", "WhatsApp", "Instagram"].map((tab) => (
                    <button
                      key={tab}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200 ${
                        tab === "All" 
                          ? "bg-[#6366F1] text-white" 
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Messages */}
                <div className="space-y-4">
                  {/* Incoming Email */}
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                      <Mail className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 bg-gray-700/30 rounded-2xl rounded-tl-none p-4 border border-gray-600/30">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-white font-medium">Sarah Chen</div>
                        <div className="text-gray-400 text-xs">2 min ago</div>
                      </div>
                      <div className="text-gray-300 text-sm">Hi, I need help with my order #1234. When will it ship?</div>
                    </div>
                  </div>

                  {/* AI Reply */}
                  <div className="flex items-start space-x-3 flex-row-reverse">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#6366F1] to-[#A855F7] rounded-xl flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 bg-gradient-to-r from-[#6366F1]/10 to-[#A855F7]/10 border border-[#6366F1]/20 rounded-2xl rounded-tr-none p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="text-white font-medium">Vaiket AI</div>
                        <div className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full font-medium">Auto-reply</div>
                      </div>
                      <div className="text-gray-300 text-sm">Hello Sarah! Your order #1234 has shipped and will arrive by tomorrow. Tracking: XYZ123</div>
                      <div className="flex items-center space-x-4 mt-3">
                        <button className="text-[#6366F1] text-sm font-medium hover:text-[#A855F7] transition-colors">
                          View tracking
                        </button>
                        <button className="text-[#6366F1] text-sm font-medium hover:text-[#A855F7] transition-colors">
                          Modify order
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex space-x-3 pt-4 border-t border-gray-700/50">
                  {[
                    { icon: MessageSquare, label: "Reply" },
                    { icon: Smartphone, label: "Call" },
                    { icon: Zap, label: "Auto-reply" }
                  ].map(({ icon: Icon, label }) => (
                    <button
                      key={label}
                      className="flex-1 flex items-center justify-center space-x-2 bg-gray-700/30 hover:bg-gray-600/30 text-gray-300 hover:text-white py-3 rounded-xl transition-all duration-200"
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Floating Elements */}
              <div className="absolute -top-3 -right-3 bg-gradient-to-r from-[#6366F1] to-[#A855F7] text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
                Live
              </div>
              
              <div className="absolute -bottom-4 -left-4 bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 shadow-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm">3 new replies</div>
                    <div className="text-gray-400 text-xs">AI handling conversations</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#6366F1]/5 rounded-full blur-3xl -z-10"></div>
          </div>
        </div>
      </div>

      {/* Video Modal */}
      {isVideoOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative bg-gray-900 rounded-2xl max-w-4xl w-full border border-gray-700/50">
            <button
              onClick={() => setIsVideoOpen(false)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors duration-200"
            >
              <div className="text-2xl font-light">×</div>
            </button>
            
            {/* Video Placeholder */}
            <div className="aspect-video bg-gray-800 rounded-2xl flex items-center justify-center">
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-gradient-to-r from-[#6366F1] to-[#A855F7] rounded-2xl flex items-center justify-center mx-auto shadow-2xl">
                  <Play className="w-8 h-8 text-white fill-current" />
                </div>
                <div className="space-y-2">
                  <div className="text-white font-semibold text-2xl">See Vaiket in Action</div>
                  <p className="text-gray-400 max-w-md">
                    Watch how businesses automate customer conversations and grow revenue in 45 seconds
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}