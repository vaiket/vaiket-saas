import React from 'react';
import {
  Shield,
  Brain,
  UserCheck,
  Rocket,
  CheckCircle,
  AlertTriangle,
  Clock,
  Phone,
  Mail,
  Globe,
  Server,
  Database,
  Lock,
  FileText,
  Zap,
  Code,
  MessageSquare,
  CreditCard,
  BarChart,
  Users,
  Settings,
  Cloud,
  Cpu,
  Smartphone,
  Key,
  Bell,
  Eye,
  ShieldCheck,
  TrendingUp,
  Headphones,
  Calendar,
  PenTool,
  GitBranch,
  Terminal,
  TestTube,
  Send,
  Monitor
} from 'lucide-react';

const QuotationPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 md:p-8">
      {/* Main Container */}
      <div className="max-w-7xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white p-8 md:p-12 relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 25px 25px, white 2%, transparent 0%), 
                              radial-gradient(circle at 75px 75px, white 2%, transparent 0%)`,
              backgroundSize: '100px 100px'
            }}></div>
          </div>
          
          <div className="relative z-10">
            {/* Company Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold font-['Poppins'] mb-3">VAiKET</h1>
                <p className="text-blue-100 text-lg font-light">Intelligent Automation & Digital Solutions</p>
                <div className="flex items-center gap-4 mt-4 text-blue-100">
                  <div className="flex items-center gap-2">
                    <Phone size={18} />
                    <span className="font-medium">+91 7004614077</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail size={18} />
                    <span className="font-medium">support@vaiket.com</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 md:mt-0 bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <div className="text-center">
                  <p className="text-blue-100 mb-2">Quotation #</p>
                  <p className="text-2xl font-bold">VQ-WA-2025-018</p>
                  <div className="w-20 h-1 bg-blue-300 mx-auto my-3"></div>
                  <p className="text-blue-100">Valid for 30 days</p>
                </div>
              </div>
            </div>
            
            {/* Main Title */}
            <div className="text-center max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
                AI-Powered WhatsApp Automation System
              </h2>
              <p className="text-xl text-blue-100">
                Secure, Human-Controlled Business Communication Platform
              </p>
              
              {/* Core Principle Banner */}
              <div className="mt-10 bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 max-w-2xl mx-auto">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                      <Brain className="text-white" size={28} />
                    </div>
                    <div>
                      <p className="text-blue-100 font-medium">AI Understands</p>
                      <p className="text-white text-sm">Intent analysis & suggestions</p>
                    </div>
                  </div>
                  
                  <div className="text-blue-200">
                    <ArrowRight />
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                      <UserCheck className="text-white" size={28} />
                    </div>
                    <div>
                      <p className="text-blue-100 font-medium">Human Approves</p>
                      <p className="text-white text-sm">Final decision authority</p>
                    </div>
                  </div>
                  
                  <div className="text-blue-200">
                    <ArrowRight />
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
                      <Rocket className="text-white" size={28} />
                    </div>
                    <div>
                      <p className="text-blue-100 font-medium">System Executes</p>
                      <p className="text-white text-sm">Approved actions only</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Critical Notice */}
        <div className="border-l-4 border-red-500 bg-red-50 mx-8 md:mx-12 -mt-6 rounded-r-xl p-6 relative z-20 shadow-lg">
          <div className="flex items-start gap-4">
            <AlertTriangle className="text-red-500 flex-shrink-0 mt-1" size={24} />
            <div>
              <h3 className="text-lg font-bold text-red-800 mb-2">Important Terms & Conditions</h3>
              <p className="text-red-700">
                This quotation includes critical terms for project success. Please review sections marked with 
                <span className="inline-block bg-red-100 text-red-800 px-2 py-1 rounded text-sm font-medium mx-2">
                  🔴 MUST READ
                </span>
                badges carefully.
              </p>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="p-8 md:p-12">
          
          {/* 🔴 MUST READ Sections */}
          <Section title="🔴 Critical Business Terms">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TermCard
                type="critical"
                icon={<FileText />}
                title="Assumptions & Dependencies"
                badge="🔴 MUST READ"
                items={[
                  "WhatsApp Business Manager access required",
                  "Telegram bot access to be approved",
                  "Timely feedback for timeline adherence",
                  "Third-party approval delays not under our control"
                ]}
                note="Prevents timeline disputes"
              />
              
              <TermCard
                type="critical"
                icon={<ShieldCheck />}
                title="Acceptance & Sign-Off"
                badge="🔴 MUST READ"
                items={[
                  "Project delivered after successful demo",
                  "Post-sign-off feedback = Change Request",
                  "Formal sign-off document provided",
                  "14-day testing period post-deployment"
                ]}
                note="Prevents endless revisions"
              />
              
              <TermCard
                type="critical"
                icon={<CreditCard />}
                title="Payment Terms & Milestones"
                badge="🔴 MUST READ"
                items={[
                  "50% Advance: Project initiation",
                  "50% Balance: On final delivery",
                  "Monthly Fees: Billed at start of each month",
                  "7-day payment terms for all invoices"
                ]}
                note="Ensures project continuity"
              />
              
              <TermCard
                type="critical"
                icon={<GitBranch />}
                title="Scope Lock & Change Policy"
                badge="🔴 MUST READ"
                items={[
                  "Quotation based on defined scope only",
                  "Additional features = Separate quotation",
                  "Scope changes affect timeline",
                  "Change requests require written approval"
                ]}
                note="Prevents scope creep"
              />
            </div>
          </Section>
          
          {/* 🟠 IMPORTANT Sections */}
          <Section title="🟠 Security & Compliance" bg="bg-blue-50">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TermCard
                type="important"
                icon={<Brain />}
                title="AI Limitation Disclaimer"
                badge="🟠 IMPORTANT"
                items={[
                  "AI provides suggestions only - not financial advice",
                  "Final decisions remain with human users",
                  "System assists, does not replace human judgment",
                  "Finance + AI = Critical safety requirement"
                ]}
                note="Essential for financial applications"
              />
              
              <TermCard
                type="important"
                icon={<Server />}
                title="Service Reliability"
                badge="🟠 IMPORTANT"
                items={[
                  "Uptime depends on third-party services",
                  "WhatsApp Cloud API dependency",
                  "AI/LLM Provider dependency",
                  "Third-party outages outside our control"
                ]}
                note="Transparent expectation setting"
              />
              
              <TermCard
                type="important"
                icon={<Database />}
                title="Data Ownership & Security"
                badge="🟠 IMPORTANT"
                items={[
                  "Client owns all business data",
                  "No data used for AI training",
                  "Official WhatsApp API (Meta-compliant)",
                  "Encrypted credential storage"
                ]}
                note="Enterprise trust & compliance"
              />
              
              <TermCard
                type="important"
                icon={<Lock />}
                title="Security & Compliance"
                badge="🟠 IMPORTANT"
                items={[
                  "Official WhatsApp Cloud API integration",
                  "No plain-text credential storage",
                  "End-to-end message encryption",
                  "GDPR-compliant data handling"
                ]}
                note="Professional security standards"
              />
            </div>
          </Section>
          
          {/* Development Process */}
          <Section title="Development Process & Timeline">
            <div className="space-y-8">
              {developmentPhases.map((phase, index) => (
                <PhaseCard key={index} phase={phase} index={index} />
              ))}
            </div>
          </Section>
          
          {/* Investment & Pricing */}
          <Section title="Investment & Pricing Structure" bg="bg-blue-50">
            <div className="overflow-x-auto">
              <table className="w-full rounded-xl overflow-hidden shadow-lg">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                    <th className="p-6 text-left font-bold">Description</th>
                    <th className="p-6 text-left font-bold">Details</th>
                    <th className="p-6 text-left font-bold">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-blue-100 hover:bg-blue-50 transition-colors">
                    <td className="p-6">
                      <div className="font-bold text-lg text-blue-900">Complete Development & Setup</div>
                    </td>
                    <td className="p-6 text-blue-700">
                      Full system development, integration, testing & deployment
                    </td>
                    <td className="p-6">
                      <div className="text-3xl font-bold text-blue-600">₹55,000</div>
                    </td>
                  </tr>
                  <tr className="hover:bg-blue-50 transition-colors">
                    <td className="p-6">
                      <div className="font-bold text-lg text-blue-900">Monthly Management</div>
                    </td>
                    <td className="p-6 text-blue-700">
                      Hosting, AI usage, monitoring, maintenance & support
                    </td>
                    <td className="p-6">
                      <div className="text-3xl font-bold text-blue-600">₹4,000/month</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
              <div className="bg-gradient-to-br from-green-50 to-white border-l-4 border-green-500 p-6 rounded-xl shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="text-green-500" size={24} />
                  <h4 className="font-bold text-green-800 text-lg">Included in Monthly</h4>
                </div>
                <ul className="space-y-2 text-green-700">
                  <li className="flex items-center gap-2">• Server hosting & maintenance</li>
                  <li className="flex items-center gap-2">• AI usage (500 messages/month)</li>
                  <li className="flex items-center gap-2">• System monitoring & alerts</li>
                  <li className="flex items-center gap-2">• Basic support (Mon-Fri, 9-6 IST)</li>
                  <li className="flex items-center gap-2">• Data backup & security updates</li>
                </ul>
              </div>
              
              <div className="bg-gradient-to-br from-red-50 to-white border-l-4 border-red-400 p-6 rounded-xl shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="text-red-400" size={24} />
                  <h4 className="font-bold text-red-800 text-lg">Not Included</h4>
                </div>
                <ul className="space-y-2 text-red-700">
                  <li className="flex items-center gap-2">• New feature development</li>
                  <li className="flex items-center gap-2">• Additional WhatsApp numbers</li>
                  <li className="flex items-center gap-2">• Payment gateway integration</li>
                  <li className="flex items-center gap-2">• Extra message volume beyond 500/month</li>
                  <li className="flex items-center gap-2">• Major UI/UX redesigns</li>
                </ul>
              </div>
            </div>
          </Section>
          
          {/* Optional Add-ons */}
          <Section title="🟡 Optional Add-ons & Scalability">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TermCard
                type="optional"
                icon={<Headphones />}
                title="Priority Support Package"
                badge="🟡 OPTIONAL"
                items={[
                  "Standard: Mon-Fri, 9 AM - 6 PM IST",
                  "Priority: 24/7 emergency support",
                  "4-hour response time SLA",
                  "Dedicated support manager",
                  "Available as monthly add-on"
                ]}
                note="Enhanced support for critical operations"
              />
              
              <TermCard
                type="optional"
                icon={<TrendingUp />}
                title="Future Scalability Options"
                badge="🟡 OPTIONAL"
                items={[
                  "Higher message volume packages",
                  "Multiple WhatsApp numbers",
                  "Advanced AI workflows",
                  "Custom reporting & analytics",
                  "Integration with other platforms",
                  "Quoted separately based on requirements"
                ]}
                note="Designed for business growth"
              />
            </div>
          </Section>
          
          {/* Contact Section */}
          <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white rounded-2xl p-8 md:p-12 mt-12">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Business Communication?</h2>
              <p className="text-blue-200 text-lg mb-10">
                Contact us today to discuss your requirements and initiate the development process.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <ContactCard
                  icon={<Phone />}
                  title="Call Us"
                  detail="+91 7004614077"
                  note="Available during business hours"
                />
                
                <ContactCard
                  icon={<Mail />}
                  title="Email Us"
                  detail="support@vaiket.com"
                  note="Typically respond within 4 hours"
                />
                
                <ContactCard
                  icon={<Globe />}
                  title="Website"
                  detail="www.vaiket.com"
                  note="Learn more about our services"
                />
              </div>
              
              <div className="border-t border-blue-700 pt-8">
                <div className="flex flex-col md:flex-row justify-center items-center gap-6 text-blue-200">
                  <div className="flex items-center gap-2">
                    <Clock size={18} />
                    <span>Support Hours: Monday–Friday, 9 AM – 6 PM IST</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap size={18} />
                    <span>Critical issues handled on priority basis</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="max-w-2xl">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Final Value Proposition</h3>
                <p className="text-gray-600">
                  This system reduces manual work by 70%, prevents financial mistakes with human approval, 
                  and gives you full control over business conversations while leveraging AI intelligence safely.
                </p>
                <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-blue-800 italic text-center">
                    "A custom AI-powered WhatsApp automation system with human approval for financial actions, 
                    built on official APIs and designed for long-term business use."
                  </p>
                </div>
              </div>
              
              <div className="md:text-right">
                <div className="mb-6">
                  <div className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full font-bold">
                    <Calendar size={18} className="inline mr-2" />
                    Valid for 30 Days
                  </div>
                </div>
                
                <div className="border-t pt-6 mt-6">
                  <h4 className="font-bold text-gray-800 mb-2">For VAiKET Technologies</h4>
                  <p className="text-gray-600">Authorized Signature</p>
                  <div className="w-48 h-0.5 bg-gray-300 mt-4"></div>
                </div>
              </div>
            </div>
            
            <div className="mt-12 pt-6 border-t border-gray-200 text-center text-gray-500 text-sm">
              <p>© 2025 VAiKET Technologies. All rights reserved. | support@vaiket.com | +91 7004614077</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Components
const Section = ({ title, children, bg = 'bg-white' }: any) => (
  <div className={`${bg} rounded-2xl p-8 mb-12 shadow-sm`}>
    <div className="flex items-center gap-3 mb-8">
      <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
        <Shield className="text-white" size={24} />
      </div>
      <h2 className="text-2xl md:text-3xl font-bold text-gray-800">{title}</h2>
    </div>
    {children}
  </div>
);

const TermCard = ({ type, icon, title, badge, items, note }: any) => {
  const colors = {
    critical: { bg: 'bg-red-50', border: 'border-red-200', iconBg: 'bg-red-500', text: 'text-red-700' },
    important: { bg: 'bg-orange-50', border: 'border-orange-200', iconBg: 'bg-orange-500', text: 'text-orange-700' },
    optional: { bg: 'bg-blue-50', border: 'border-blue-200', iconBg: 'bg-blue-500', text: 'text-blue-700' }
  };
  
  const color = colors[type as keyof typeof colors];
  
  return (
    <div className={`${color.bg} border ${color.border} rounded-2xl p-6 hover:shadow-md transition-shadow`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={`${color.iconBg} p-3 rounded-xl text-white`}>
            {React.cloneElement(icon, { size: 24 })}
          </div>
          <h3 className="font-bold text-gray-800 text-lg">{title}</h3>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${type === 'critical' ? 'bg-red-100 text-red-800' : type === 'important' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
          {badge}
        </span>
      </div>
      
      <ul className="space-y-2 mb-4">
        {items.map((item: string, idx: number) => (
          <li key={idx} className="flex items-start gap-2">
            <div className={`w-2 h-2 rounded-full mt-2 ${color.iconBg}`}></div>
            <span className={`${color.text}`}>{item}</span>
          </li>
        ))}
      </ul>
      
      {note && (
        <div className="pt-4 border-t border-gray-200">
          <p className="text-gray-500 text-sm flex items-center gap-2">
            <Eye size={16} />
            <span className="italic">{note}</span>
          </p>
        </div>
      )}
    </div>
  );
};

const PhaseCard = ({ phase, index }: any) => (
  <div className="flex flex-col md:flex-row gap-6">
    <div className="flex-shrink-0">
      <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
        {index + 1}
      </div>
    </div>
    
    <div className="flex-1">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          {React.cloneElement(phase.icon, { className: "text-blue-600", size: 24 })}
        </div>
        <h3 className="text-xl font-bold text-gray-800">{phase.title}</h3>
      </div>
      <p className="text-gray-600 mb-4">{phase.description}</p>
      
      <div className="flex flex-wrap gap-2">
        {phase.technologies.map((tech: string, idx: number) => (
          <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
            {tech}
          </span>
        ))}
      </div>
    </div>
  </div>
);

const ContactCard = ({ icon, title, detail, note }: any) => (
  <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-colors">
    <div className="flex items-center gap-3 mb-4">
      <div className="p-3 bg-white/20 rounded-xl">
        {React.cloneElement(icon, { className: "text-white", size: 24 })}
      </div>
      <h4 className="font-bold text-lg">{title}</h4>
    </div>
    <p className="text-2xl font-bold mb-2">{detail}</p>
    <p className="text-blue-200 text-sm">{note}</p>
  </div>
);

const ArrowRight = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
  </svg>
);

// Development Phases Data
const developmentPhases = [
  {
    title: "Planning & Access Setup",
    description: "Requirement finalization, scope lock, and access setup for all third-party services.",
    icon: <Settings />,
    technologies: ["WhatsApp Cloud API", "Telegram Bot", "Hosting Setup", "Database Design"]
  },
  {
    title: "Core Backend Development",
    description: "Backend APIs built using Next.js with secure webhooks and message handling.",
    icon: <Code />,
    technologies: ["Next.js API", "PostgreSQL", "Webhooks", "Message Logging"]
  },
  {
    title: "AI (LLM) Integration",
    description: "Integration of LLM API for intelligent message understanding and intent classification.",
    icon: <Cpu />,
    technologies: ["LLM API", "Intent Analysis", "Message Classification", "Safety Checks"]
  },
  {
    title: "Conditional Routing Logic",
    description: "Business rules for routing messages - normal vs financial, with safety checks.",
    icon: <GitBranch />,
    technologies: ["Business Logic", "Routing Rules", "Safety Protocols", "Queue Management"]
  },
  {
    title: "Approval System",
    description: "Human-in-the-loop approval system via web dashboard and Telegram notifications.",
    icon: <UserCheck />,
    technologies: ["Web Dashboard", "Telegram Bot", "Approval Workflow", "Real-time Notifications"]
  },
  {
    title: "Execution & Logging",
    description: "Secure execution of approved actions with complete audit trail and logging.",
    icon: <Send />,
    technologies: ["WhatsApp API", "Action Execution", "Audit Trail", "Security Logs"]
  },
  {
    title: "Testing & Deployment",
    description: "End-to-end testing, load testing, deployment, and handover with training.",
    icon: <TestTube />,
    technologies: ["E2E Testing", "Load Testing", "Deployment", "Training & Documentation"]
  }
];

export default QuotationPage;