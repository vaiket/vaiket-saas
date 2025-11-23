// components/footer.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Mail, 
  MapPin, 
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Github, 
  Twitter, 
  Linkedin, 
  Youtube,
  Instagram,
  Shield,
  Globe,
  Monitor,
  Zap,
  BookOpen,
  Users,
  Briefcase,
  FileText,
  Languages
} from 'lucide-react';

// Language content dictionary
const footerContent = {
  en: {
    // Brand Section
    brand: {
      tagline: "AI-powered communication automation for modern businesses.",
      trust: {
        ssl: "SSL Secure",
        dpdp: "DPDP Compliant",
        uptime: "99.9% Uptime",
        madeIn: "Made in India"
      }
    },
    // Sections
    product: "Product",
    resources: "Resources",
    company: "Company",
    legal: "Legal",
    // Product Links
    productLinks: [
      "AI Email Automation",
      "WhatsApp CRM",
      "Instagram DM Automation",
      "Conversation Inbox",
      "Workflow Builder",
      "Template Library",
      "Analytics Dashboard",
      "API & Integrations",
      "Roadmap"
    ],
    // Resources Links
    resourcesLinks: [
      "Documentation",
      "Blog",
      "Pricing",
      "Case Studies",
      "Video Tutorials",
      "Demo Booking",
      "Status Page",
      "System Changelog"
    ],
    // Company Links
    companyLinks: [
      "About Us",
      "Careers",
      "Partner Program",
      "Contact Support",
      "Investor Relations",
      "Press / Media Kit"
    ],
    // Legal Links
    legalLinks: [
      "Privacy Policy",
      "Terms & Conditions",
      "Refund Policy",
      "Anti-Spam Policy",
      "Data Retention Policy",
      "Affiliate Terms",
      "Responsible Messaging Policy"
    ],
    // Newsletter
    newsletter: {
      title: "Stay ahead in business automation",
      subtitle: "Weekly AI strategies, no spam — unsubscribe anytime.",
      placeholder: "Enter your email",
      button: "Subscribe",
      note: "Double opt-in required. We respect your privacy."
    },
    // Partner CTA
    partnerCta: {
      text: "Earn 30% lifetime commission — Become a Vaiket Partner",
      button: "Join Partner Program"
    },
    // Support
    support: {
      liveChat: "Live Chat",
      knowledgeBase: "Knowledge Base",
      email: "support@vaiket.com"
    },
    // Bottom
    copyright: "All rights reserved.",
    companyInfo: "Vikas Web Development Pvt. Ltd.",
    location: "Ranchi, Jharkhand, India"
  },
  hi: {
    // Brand Section
    brand: {
      tagline: "आधुनिक व्यवसायों के लिए AI-संचालित संचार स्वचालन।",
      trust: {
        ssl: "SSL सुरक्षित",
        dpdp: "DPDP अनुपालन",
        uptime: "99.9% अपटाइम",
        madeIn: "भारत में निर्मित"
      }
    },
    // Sections
    product: "उत्पाद",
    resources: "संसाधन",
    company: "कंपनी",
    legal: "कानूनी",
    // Product Links
    productLinks: [
      "AI ईमेल स्वचालन",
      "व्हाट्सएप सीआरएम",
      "इंस्टाग्राम डीएम स्वचालन",
      "वार्तालाप इनबॉक्स",
      "वर्कफ्लो बिल्डर",
      "टेम्पलेट लाइब्रेरी",
      "एनालिटिक्स डैशबोर्ड",
      "एपीआई और एकीकरण",
      "रोडमैप"
    ],
    // Resources Links
    resourcesLinks: [
      "डॉक्यूमेंटेशन",
      "ब्लॉग",
      "मूल्य निर्धारण",
      "केस स्टडीज",
      "वीडियो ट्यूटोरियल",
      "डेमो बुकिंग",
      "स्टेटस पेज",
      "सिस्टम चेंजलॉग"
    ],
    // Company Links
    companyLinks: [
      "हमारे बारे में",
      "करियर",
      "पार्टनर प्रोग्राम",
      "सहायता से संपर्क करें",
      "निवेशक संबंध",
      "प्रेस / मीडिया किट"
    ],
    // Legal Links
    legalLinks: [
      "गोपनीयता नीति",
      "नियम और शर्तें",
      "धनवापसी नीति",
      "एंटी-स्पैम नीति",
      "डेटा प्रतिधारण नीति",
      "सहबद्ध शर्तें",
      "जिम्मेदार मैसेजिंग नीति"
    ],
    // Newsletter
    newsletter: {
      title: "व्यवसाय स्वचालन में आगे रहें",
      subtitle: "साप्ताहिक AI रणनीतियाँ, कोई स्पैम नहीं — कभी भी अनसब्सक्राइब करें।",
      placeholder: "अपना ईमेल दर्ज करें",
      button: "सब्सक्राइब करें",
      note: "डबल ऑप्ट-इन आवश्यक। हम आपकी गोपनीयता का सम्मान करते हैं।"
    },
    // Partner CTA
    partnerCta: {
      text: "30% लाइफटाइम कमीशन कमाएं — वैकेट पार्टनर बनें",
      button: "पार्टनर प्रोग्राम ज्वाइन करें"
    },
    // Support
    support: {
      liveChat: "लाइव चैट",
      knowledgeBase: "नॉलेज बेस",
      email: "support@vaiket.com"
    },
    // Bottom
    copyright: "सर्वाधिकार सुरक्षित।",
    companyInfo: "विकास वेब डेवलपमेंट प्राइवेट लिमिटेड",
    location: "रांची, झारखंड, भारत"
  }
};

export default function Footer() {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    product: false,
    resources: false,
    company: false,
    legal: false
  });
  const [language, setLanguage] = useState<'en' | 'hi'>('en');

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'hi' : 'en');
  };

  const content = footerContent[language];
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#0D1117] text-gray-300 border-t border-[#1F2937]">
      {/* Partner CTA Banner */}
      <div className="bg-gradient-to-r from-[#1E293B] to-[#334155] py-4 px-6">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white font-medium text-center sm:text-left">
            {content.partnerCta.text}
          </p>
          <Link
            href="/affiliate"
            className="bg-[#6366F1] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#5a5fcf] transition-colors whitespace-nowrap"
          >
            {content.partnerCta.button}
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-6 lg:px-20 py-16">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-12">
          
          {/* Brand & Identity Section */}
          <div className="lg:col-span-1 space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#6366F1] to-[#A855F7] rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-white font-bold text-xl">Vaiket</span>
                <div className="flex items-center space-x-1 mt-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-500 text-xs">
                    {language === 'en' ? 'All Systems Operational' : 'सभी सिस्टम Operational'}
                  </span>
                </div>
              </div>
            </div>
            
            <p className="text-gray-400 text-sm leading-relaxed">
              {content.brand.tagline}
            </p>

            {/* Trust Badges */}
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center space-x-1 bg-[#111827] px-2 py-1 rounded text-xs">
                  <Shield className="w-3 h-3 text-green-500" />
                  <span>{content.brand.trust.ssl}</span>
                </div>
                <div className="flex items-center space-x-1 bg-[#111827] px-2 py-1 rounded text-xs">
                  <span>🔒</span>
                  <span>{content.brand.trust.dpdp}</span>
                </div>
                <div className="flex items-center space-x-1 bg-[#111827] px-2 py-1 rounded text-xs">
                  <span>⚡</span>
                  <span>{content.brand.trust.uptime}</span>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <span>{content.brand.trust.madeIn}</span>
                <span className="text-lg">🇮🇳</span>
              </div>
            </div>
          </div>

          {/* Product Section - Mobile Accordion */}
          <div className="lg:hidden">
            <button
              onClick={() => toggleSection('product')}
              className="flex items-center justify-between w-full py-4 text-white font-semibold text-lg"
            >
              {content.product}
              {openSections.product ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            {openSections.product && (
              <div className="pb-4 space-y-3">
                {content.productLinks.map((item, index) => (
                  <Link
                    key={index}
                    href={`/product/${footerContent.en.productLinks[index].toLowerCase().replace(/\s+/g, '-')}`}
                    className="block text-gray-400 hover:text-[#6366F1] transition-colors duration-200 text-sm py-2"
                  >
                    {item}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Product Section - Desktop */}
          <div className="hidden lg:block space-y-4">
            <h3 className="text-white font-semibold text-lg">{content.product}</h3>
            <ul className="space-y-3 text-sm">
              {content.productLinks.map((item, index) => (
                <li key={index}>
                  <Link 
                    href={`/product/${footerContent.en.productLinks[index].toLowerCase().replace(/\s+/g, '-')}`}
                    className="text-gray-400 hover:text-[#6366F1] transition-colors duration-200 hover:underline"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Section - Mobile Accordion */}
          <div className="lg:hidden">
            <button
              onClick={() => toggleSection('resources')}
              className="flex items-center justify-between w-full py-4 text-white font-semibold text-lg"
            >
              {content.resources}
              {openSections.resources ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            {openSections.resources && (
              <div className="pb-4 space-y-3">
                {content.resourcesLinks.map((item, index) => (
                  <Link
                    key={index}
                    href={`/resources/${footerContent.en.resourcesLinks[index].toLowerCase().replace(/\s+/g, '-')}`}
                    className="block text-gray-400 hover:text-[#6366F1] transition-colors duration-200 text-sm py-2"
                  >
                    {item}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Resources Section - Desktop */}
          <div className="hidden lg:block space-y-4">
            <h3 className="text-white font-semibold text-lg">{content.resources}</h3>
            <ul className="space-y-3 text-sm">
              {content.resourcesLinks.map((item, index) => (
                <li key={index}>
                  <Link 
                    href={`/resources/${footerContent.en.resourcesLinks[index].toLowerCase().replace(/\s+/g, '-')}`}
                    className="text-gray-400 hover:text-[#6366F1] transition-colors duration-200 hover:underline"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Section - Mobile Accordion */}
          <div className="lg:hidden">
            <button
              onClick={() => toggleSection('company')}
              className="flex items-center justify-between w-full py-4 text-white font-semibold text-lg"
            >
              {content.company}
              {openSections.company ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            {openSections.company && (
              <div className="pb-4 space-y-3">
                {content.companyLinks.map((item, index) => (
                  <Link
                    key={index}
                    href={`/company/${footerContent.en.companyLinks[index].toLowerCase().replace(/\s+/g, '-')}`}
                    className="block text-gray-400 hover:text-[#6366F1] transition-colors duration-200 text-sm py-2"
                  >
                    {item}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Company Section - Desktop */}
          <div className="hidden lg:block space-y-4">
            <h3 className="text-white font-semibold text-lg">{content.company}</h3>
            <ul className="space-y-3 text-sm">
              {content.companyLinks.map((item, index) => (
                <li key={index}>
                  <Link 
                    href={`/company/${footerContent.en.companyLinks[index].toLowerCase().replace(/\s+/g, '-')}`}
                    className="text-gray-400 hover:text-[#6366F1] transition-colors duration-200 hover:underline"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Section - Mobile Accordion */}
          <div className="lg:hidden">
            <button
              onClick={() => toggleSection('legal')}
              className="flex items-center justify-between w-full py-4 text-white font-semibold text-lg"
            >
              {content.legal}
              {openSections.legal ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            {openSections.legal && (
              <div className="pb-4 space-y-3">
                {content.legalLinks.map((item, index) => (
                  <Link
                    key={index}
                    href={`/legal/${footerContent.en.legalLinks[index].toLowerCase().replace(/\s+/g, '-')}`}
                    className="block text-gray-400 hover:text-[#6366F1] transition-colors duration-200 text-sm py-2"
                  >
                    {item}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Legal Section - Desktop */}
          <div className="hidden lg:block space-y-4">
            <h3 className="text-white font-semibold text-lg">{content.legal}</h3>
            <ul className="space-y-3 text-sm">
              {content.legalLinks.map((item, index) => (
                <li key={index}>
                  <Link 
                    href={`/legal/${footerContent.en.legalLinks[index].toLowerCase().replace(/\s+/g, '-')}`}
                    className="text-gray-400 hover:text-[#6366F1] transition-colors duration-200 hover:underline"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Newsletter Section */}
        <div className="border-t border-[#1F2937] pt-12 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-3">
              <h3 className="text-white font-semibold text-xl">
                {content.newsletter.title}
              </h3>
              <p className="text-gray-400 text-sm">
                {content.newsletter.subtitle}
              </p>
            </div>
            <div className="space-y-3">
              <form className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  placeholder={content.newsletter.placeholder}
                  className="flex-1 px-4 py-3 bg-[#111827] border border-[#1F2937] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                  required
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-[#6366F1] to-[#A855F7] text-white text-sm font-medium rounded-lg hover:from-[#5a5fcf] hover:to-[#9333ea] transition-all duration-200 transform hover:scale-105"
                >
                  {content.newsletter.button}
                </button>
              </form>
              <p className="text-xs text-gray-500">
                {content.newsletter.note}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-[#1F2937] pt-8">
          <div className="flex flex-col lg:flex-row justify-between items-center space-y-6 lg:space-y-0">
            
            {/* Social Icons */}
            <div className="flex space-x-4">
              {[
                { icon: Linkedin, href: "https://linkedin.com/company/vaiket", label: "LinkedIn" },
                { icon: Twitter, href: "https://twitter.com/vaiket", label: "Twitter" },
                { icon: Instagram, href: "https://instagram.com/vaiket", label: "Instagram" },
                { icon: Youtube, href: "https://youtube.com/vaiket", label: "YouTube" },
                { icon: Github, href: "https://github.com/vaiket", label: "GitHub" },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  className="w-10 h-10 bg-[#111827] rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#6366F1] transition-all duration-200 hover:scale-110"
                  aria-label={label}
                >
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>

            {/* Support & Utilities */}
            <div className="flex flex-wrap items-center justify-center gap-4">
              {/* Live Chat */}
              <button className="flex items-center space-x-2 px-4 py-2 bg-[#111827] rounded-lg text-gray-400 hover:text-white transition-colors text-sm">
                <MessageCircle className="w-4 h-4" />
                <span>{content.support.liveChat}</span>
              </button>

              {/* Knowledge Base */}
              <Link
                href="/knowledge-base"
                className="flex items-center space-x-2 px-4 py-2 bg-[#111827] rounded-lg text-gray-400 hover:text-white transition-colors text-sm"
              >
                <BookOpen className="w-4 h-4" />
                <span>{content.support.knowledgeBase}</span>
              </Link>

              {/* Support Email */}
              <a
                href="mailto:support@vaiket.com"
                className="flex items-center space-x-2 text-gray-400 hover:text-[#6366F1] transition-colors text-sm"
              >
                <Mail className="w-4 h-4" />
                <span>{content.support.email}</span>
              </a>
            </div>

            {/* Language & Theme */}
            <div className="flex items-center space-x-4">
              {/* Language Selector */}
              <button
                onClick={toggleLanguage}
                className="flex items-center space-x-2 bg-[#111827] rounded-lg px-3 py-2 text-gray-400 hover:text-white transition-colors"
              >
                <Languages className="w-4 h-4" />
                <span className="text-sm">
                  {language === 'en' ? 'English' : 'हिंदी'}
                </span>
                <span className="text-xs bg-[#6366F1] text-white px-2 py-1 rounded">
                  {language === 'en' ? 'HI' : 'EN'}
                </span>
              </button>

              {/* Theme Toggle */}
              <button className="w-10 h-10 bg-[#111827] rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                <Monitor className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Copyright & Legal Info */}
          <div className="border-t border-[#1F2937] mt-8 pt-6">
            <div className="flex flex-col lg:flex-row justify-between items-center space-y-4 lg:space-y-0 text-center lg:text-left">
              <div className="space-y-2">
                <p className="text-gray-500 text-sm">
                  © {currentYear} Vaiket. {content.copyright}
                </p>
                <p className="text-gray-600 text-xs">
                  {content.companyInfo} • {content.location}
                </p>
              </div>
              
              <div className="flex flex-wrap justify-center gap-6 text-xs text-gray-500">
                <span>GDPR Compliant</span>
                <span>ISO 27001 Certified</span>
                <span>SOC 2 Type II</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp Floating Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <a
          href="https://wa.me/your-whatsapp-number"
          className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
          aria-label={language === 'en' ? "Chat on WhatsApp" : "WhatsApp पर चैट करें"}
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </a>
      </div>
    </footer>
  );
}