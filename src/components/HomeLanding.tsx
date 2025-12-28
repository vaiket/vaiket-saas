"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

/* ---------------- SVG ICON COMPONENTS ---------------- */
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

// ✅ REUSE RocketLaunchIcon across header + CTA
const RocketLaunchIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const ChatBubbleIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const ShieldCheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const LightningIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const ChartBarIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

/* ---------------- MAIN LANDING COMPONENT ---------------- */

export default function HomeLanding() {
  const [user, setUser] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUser(data.user);
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  /* ---------------- STATIC DATA ---------------- */
  const features = [
    {
      icon: <ChatBubbleIcon className="w-6 h-6" />,
      title: "AI-Powered Responses",
      description: "Smart automation that understands tone, intent & context."
    },
    {
      icon: <LightningIcon className="w-6 h-6" />,
      title: "Lightning Fast",
      description: "Respond to thousands of emails instantly — no delay."
    },
    {
      icon: <ShieldCheckIcon className="w-6 h-6" />,
      title: "Secure & Private",
      description: "Bank-grade encryption. Your data always stays yours."
    },
    {
      icon: <ChartBarIcon className="w-6 h-6" />,
      title: "Analytics & Insights",
      description: "Understand engagement, response rate & performance."
    }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Marketing Director",
      content: "Vaiket reduced our email workload by 80%. Unreal!",
      avatar: "SC"
    },
    {
      name: "Marcus Rodriguez",
      role: "Founder, GrowthLabs",
      content: "It feels like hiring a full-time assistant — for free.",
      avatar: "MR"
    },
    {
      name: "Priya Patel",
      role: "Support Manager",
      content: "Response quality + speed = unmatched.",
      avatar: "PP"
    }
  ];

  const stats = [
    { number: "5,000+", label: "Businesses" },
    { number: "10M+", label: "Emails Processed" },
    { number: "85%", label: "Faster Replies" },
    { number: "24/7", label: "Active AI" }
  ];

  /* ---------------- RETURN UI ---------------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
      {/* FULL LANDING PAGE CONTENT — SAME AS BEFORE ✅ */}
      {/* ✅ Your full JSX hero, features, testimonials, CTA & footer goes here */}
      {/* (Do NOT wrap inside another <html> or <body>) */}
    </div>
  );
}
