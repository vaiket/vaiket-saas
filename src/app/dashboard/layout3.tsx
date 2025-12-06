"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Image from "next/image"
import { 
  Home, 
  Users, 
  Mail, 
  Inbox, 
  Settings, 
  BarChart3, 
  CreditCard, 
  Menu, 
  ChevronLeft, 
  ChevronRight,
  Zap,
  Cpu,
  Server,
  UserPlus,
  TrendingUp,
  Shield,
  Bell,
  Search,
  HelpCircle,
  User,
  LogOut,
  MessageSquare,
  Bot,
  Headphones,
  FileText,
  Database,
  X,
  ChevronsLeft,
  ChevronsRight,
  Folder
} from "lucide-react";

// Icons mapping for backward compatibility
const icons: { [key: string]: React.ReactNode } = {
  "Overview": <Home className="w-5 h-5" />,
  "Connect": <Zap className="w-5 h-5" />,
  "Mail Accounts": <Mail className="w-5 h-5" />,
  "Mail Inbox": <Inbox className="w-5 h-5" />,
  "AI Settings": <Bot className="w-5 h-5" />,
  "SMTP Settings": <Server className="w-5 h-5" />,
  "IMAP Settings": <Database className="w-5 h-5" />,
  "Onboarding": <UserPlus className="w-5 h-5" />,
  "Users Management": <Users className="w-5 h-5" />,
  "Leads": <TrendingUp className="w-5 h-5" />,
  "Inbox": <MessageSquare className="w-5 h-5" />,
  "Traffic Analytics": <BarChart3 className="w-5 h-5" />,
  "Billing": <CreditCard className="w-5 h-5" />,
  "Settings": <Settings className="w-5 h-5" />
};

const menu = [
  { name: "Overview", path: "/dashboard" },
  { name: "Connect", path: "/dashboard/connect" },
  { name: "Mail Accounts", path: "/dashboard/mail-accounts" },
  { name: "Mail Inbox", path: "/dashboard/mail-inbox" },
  { name: "AI Settings", path: "/dashboard/ai-settings" },
  { name: "SMTP Settings", path: "/dashboard/smtp-management" },
  { name: "IMAP Settings", path: "/dashboard/imap-management" },
  { name: "Onboarding", path: "/dashboard/onboarding-details" },
  { name: "Users Management", path: "/dashboard/users-management" },
  { name: "Leads", path: "/dashboard/leads" },
  { name: "Inbox", path: "/dashboard/inbox" },
  { name: "Traffic Analytics", path: "/dashboard/traffic" },
  { name: "Billing", path: "/dashboard/billing" },
  { name: "Settings", path: "/dashboard/settings" },
];

// Group menu items
const menuGroups = [
  {
    name: "Main",
    items: menu.slice(0, 4) // Overview to Mail Inbox
  },
  {
    name: "Settings & Configuration",
    items: menu.slice(4, 8) // AI Settings to Onboarding
  },
  {
    name: "Management",
    items: menu.slice(8, 12) // Users Management to Traffic Analytics
  },
  {
    name: "Account",
    items: menu.slice(12) // Billing and Settings
  }
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [user] = useState({ 
    name: "John Doe", 
    email: "john@example.com",
    role: "Admin" 
  });

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Filter menu items based on search
  const filteredMenuGroups = menuGroups.map(group => ({
    ...group,
    items: group.items.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(group => group.items.length > 0);

  const handleLogout = () => {
    // Your existing logout logic here
    console.log("Logging out...");
    router.push('/login');
  };

  const getActiveItem = () => {
    return menu.find(item => item.path === pathname)?.name || "Dashboard";
  };

  return (
    <div className="flex h-screen bg-[#F0F2F5] text-gray-900 font-sans antialiased">
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed lg:relative z-50
          bg-white border-r border-gray-200
          transition-all duration-300 ease-in-out
          flex flex-col
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'w-20' : 'w-64'}
          h-full
          shadow-sm
        `}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            {!isCollapsed ? (
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-[#1877F2] to-[#42B72A] rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-base">V</span>
                </div>
                <div>
                  <h1 className="font-bold text-lg text-gray-900">Vaiket Panel</h1>
                  <p className="text-xs text-gray-500">Dashboard v2.0</p>
                </div>
              </div>
            ) : (
              <div className="w-10 h-10 bg-gradient-to-r from-[#1877F2] to-[#42B72A] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-base">V</span>
              </div>
            )}
            
            {/* Toggle Button - Desktop */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors duration-200"
            >
              <ChevronsLeft className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Active Item Indicator */}
          {!isCollapsed && (
            <div className="mt-4">
              <div className="flex items-center space-x-2 bg-[#1877F2]/5 rounded-lg p-2">
                <div className="w-2 h-2 bg-[#1877F2] rounded-full"></div>
                <span className="text-sm font-medium text-[#1877F2]">{getActiveItem()}</span>
              </div>
            </div>
          )}
        </div>

        {/* Search - Expanded State Only */}
        {!isCollapsed && (
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2]/20 focus:border-[#1877F2] transition-all duration-300"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          {filteredMenuGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="mb-6 last:mb-0">
              {/* Group Title - Only show when not collapsed */}
              {!isCollapsed && group.items.length > 0 && (
                <div className="px-4 mb-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {group.name}
                  </h3>
                </div>
              )}

              {/* Menu Items */}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.path;
                  const IconComponent = icons[item.name];

                  return (
                    <Link key={item.path} href={item.path}>
                      <div
                        className={`
                          group flex items-center px-4 py-3 mx-2 rounded-lg cursor-pointer
                          transition-all duration-200
                          ${isActive 
                            ? 'bg-[#1877F2]/10 border-r-3 border-[#1877F2]' 
                            : 'hover:bg-gray-50'
                          }
                          ${isCollapsed ? 'justify-center' : ''}
                        `}
                      >
                        <div className={`
                          transition-colors duration-200
                          ${isActive ? 'text-[#1877F2]' : 'text-gray-500 group-hover:text-[#1877F2]'}
                        `}>
                          {IconComponent}
                        </div>
                        
                        {!isCollapsed && (
                          <>
                            <span className={`
                              ml-3 text-sm font-medium transition-colors duration-200
                              ${isActive ? 'text-[#1877F2] font-semibold' : 'text-gray-700 group-hover:text-[#1877F2]'}
                            `}>
                              {item.name}
                            </span>
                            {isActive && (
                              <div className="ml-auto w-2 h-2 bg-[#1877F2] rounded-full"></div>
                            )}
                          </>
                        )}

                        {/* Tooltip for collapsed state */}
                        {isCollapsed && (
                          <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-40 shadow-lg">
                            {item.name}
                            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-r-4 border-r-gray-900"></div>
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Profile */}
        <div className={`
          border-t border-gray-200 p-4
          ${isCollapsed ? 'flex flex-col items-center' : ''}
        `}>
          {!isCollapsed ? (
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-r from-[#1877F2] to-[#42B72A] rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{user.name.charAt(0)}</span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-gray-900 truncate">{user.name}</h4>
                <p className="text-xs text-gray-500 truncate">{user.role} • {user.email}</p>
              </div>
              <div className="flex items-center space-x-1">
                <button className="relative w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors duration-200">
                  <Bell className="w-4 h-4 text-gray-500" />
                  <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></div>
                </button>
                <button 
                  onClick={handleLogout}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors duration-200"
                >
                  <LogOut className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-r from-[#1877F2] to-[#42B72A] rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{user.name.charAt(0)}</span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
              <div className="flex items-center space-x-1">
                <button className="relative w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors duration-200">
                  <Bell className="w-4 h-4 text-gray-500" />
                  <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></div>
                </button>
                <button 
                  onClick={handleLogout}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors duration-200"
                >
                  <LogOut className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Help & Support */}
        {!isCollapsed && (
          <div className="border-t border-gray-200 p-4">
            <div className="bg-[#1877F2]/5 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <HelpCircle className="w-4 h-4 text-[#1877F2]" />
                <span className="text-sm font-medium text-[#1877F2]">Need help?</span>
              </div>
              <p className="text-xs text-gray-600 mb-3">Check our documentation or contact support</p>
              <Link href="/dashboard/support">
                <button className="w-full py-2 bg-[#1877F2] hover:bg-[#166FE5] text-white text-sm font-medium rounded-lg transition-colors duration-200">
                  Get Help
                </button>
              </Link>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Left: Mobile menu button and breadcrumb */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setIsMobileOpen(!isMobileOpen)}
                  className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                >
                  <Menu className="w-5 h-5 text-gray-600" />
                </button>
                
                {/* Breadcrumb */}
                <div className="hidden lg:flex items-center space-x-2 text-sm">
                  <span className="text-gray-500">Dashboard</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-gray-900">{getActiveItem()}</span>
                </div>

                {/* Mobile Title */}
                <div className="lg:hidden">
                  <h1 className="text-lg font-semibold text-gray-900">
                    {getActiveItem()}
                  </h1>
                  <p className="text-xs text-gray-500">Dashboard</p>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center space-x-4">
                {/* Search - Mobile Only */}
                <button className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                  <Search className="w-5 h-5 text-gray-600" />
                </button>

                {/* Quick Actions */}
                <div className="hidden lg:flex items-center space-x-3">
                  <button className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                    <HelpCircle className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Help</span>
                  </button>
                  <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                    <Bell className="w-5 h-5 text-gray-600" />
                    <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></div>
                  </button>
                </div>

                {/* User Profile */}
                <div className="hidden lg:flex items-center space-x-3 group relative">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.role}</p>
                  </div>
                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-r from-[#1877F2] to-[#42B72A] rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">{user.name.charAt(0)}</span>
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                  </div>
                  
                  {/* Dropdown Menu */}
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-40">
                    <div className="px-4 py-2 border-b border-gray-200">
                      <p className="text-sm font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    <Link href="/dashboard/profile">
                      <div className="flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 cursor-pointer">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-700">Profile</span>
                      </div>
                    </Link>
                    <Link href="/dashboard/settings">
                      <div className="flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 cursor-pointer">
                        <Settings className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-700">Settings</span>
                      </div>
                    </Link>
                    <div className="border-t border-gray-200 my-1"></div>
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 text-left"
                    >
                      <LogOut className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-700">Logout</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6">
            {/* Page Header */}
            <div className="mb-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {getActiveItem()}
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Welcome back, {user.name}! Here's what's happening today.
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 text-sm font-medium">
                    Export Data
                  </button>
                  <button className="px-4 py-2 bg-[#1877F2] text-white rounded-lg hover:bg-[#166FE5] transition-colors duration-200 text-sm font-medium">
                    + New Item
                  </button>
                </div>
              </div>
              
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Active Accounts</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">12</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                      <Mail className="w-6 h-6 text-[#1877F2]" />
                    </div>
                  </div>
                  <p className="text-xs text-green-600 mt-2">+2 this week</p>
                </div>
                
                <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Processed Emails</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">1,248</p>
                    </div>
                    <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                      <Inbox className="w-6 h-6 text-[#42B72A]" />
                    </div>
                  </div>
                  <p className="text-xs text-green-600 mt-2">+12% this month</p>
                </div>
                
                <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">AI Responses</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">856</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                      <Bot className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                  <p className="text-xs text-green-600 mt-2">+23% this month</p>
                </div>
                
                <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Active Leads</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">45</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                  <p className="text-xs text-green-600 mt-2">+5 this week</p>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              {children}
            </div>
          </div>
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-2 px-4 shadow-lg">
          <div className="flex items-center justify-around">
            <Link href="/dashboard">
              <div className={`flex flex-col items-center p-2 ${pathname === '/dashboard' ? 'text-[#1877F2]' : 'text-gray-500'}`}>
                <Home className="w-5 h-5" />
                <span className="text-xs mt-1">Home</span>
              </div>
            </Link>
            <Link href="/dashboard/mail-inbox">
              <div className={`flex flex-col items-center p-2 ${pathname === '/dashboard/mail-inbox' ? 'text-[#1877F2]' : 'text-gray-500'}`}>
                <Inbox className="w-5 h-5" />
                <span className="text-xs mt-1">Inbox</span>
              </div>
            </Link>
            <Link href="/dashboard/ai-settings">
              <div className={`flex flex-col items-center p-2 ${pathname === '/dashboard/ai-settings' ? 'text-[#1877F2]' : 'text-gray-500'}`}>
                <Bot className="w-5 h-5" />
                <span className="text-xs mt-1">AI</span>
              </div>
            </Link>
            <Link href="/dashboard/settings">
              <div className={`flex flex-col items-center p-2 ${pathname === '/dashboard/settings' ? 'text-[#1877F2]' : 'text-gray-500'}`}>
                <Settings className="w-5 h-5" />
                <span className="text-xs mt-1">More</span>
              </div>
            </Link>
          </div>
        </div>
      </main>

      {/* Global Styles */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }

        /* Smooth transitions */
        * {
          transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }

        ::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }

        ::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 3px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }

        /* Selection */
        ::selection {
          background: rgba(24, 119, 242, 0.2);
        }

        /* Hide scrollbar for sidebar */
        nav::-webkit-scrollbar {
          width: 4px;
        }

        nav::-webkit-scrollbar-track {
          background: transparent;
        }

        nav::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}