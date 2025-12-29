"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";

import {
  Home,
  Users,
  Mail,
  Inbox,
  Settings,
  BarChart3,
  CreditCard,
  Menu,
  ChevronRight,
  Zap,
  Server,
  UserPlus,
  TrendingUp,
  MessageSquare,
  Bot,
  Database,
  LogOut,
  Search,
  X,
  ChevronsLeft,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const icons: { [key: string]: React.ReactNode } = {
  Overview: <Home className="w-5 h-5" />,
  Connect: <Zap className="w-5 h-5" />,
  "Mail Accounts": <Mail className="w-5 h-5" />,
  "Mail Automation": <Inbox className="w-5 h-5" />,
  "AI Settings": <Bot className="w-5 h-5" />,
  "Subscriptions": <Server className="w-5 h-5" />,
  "Project Settings": <Database className="w-5 h-5" />,
  Onboarding: <UserPlus className="w-5 h-5" />,
  "Users Management": <Users className="w-5 h-5" />,
  Leads: <TrendingUp className="w-5 h-5" />,
  Inbox: <MessageSquare className="w-5 h-5" />,
  "Campaigns": <BarChart3 className="w-5 h-5" />,
  Billing: <CreditCard className="w-5 h-5" />,
  Settings: <Settings className="w-5 h-5" />,
};

const menu = [
  { name: "Overview", path: "/dashboard" },
  { name: "Connect", path: "/dashboard/email-management" },
  { name: "Mail Accounts", path: "/dashboard/mail-accounts" },
  { name: "Mail Automation", path: "/dashboard/mail-automation" },
  { name: "AI Settings", path: "/dashboard/ai-settings" },
  { name: "Subscriptions", path: "/dashboard/Subscriptions" },
  { name: "Project Settings", path: "/dashboard/email-branding" },
  { name: "Onboarding", path: "/dashboard/onboarding-details" },
  { name: "Users Management", path: "/dashboard/users-management" },
  { name: "Leads", path: "/dashboard/leads" },
  { name: "Inbox", path: "/dashboard/inbox" },
  { name: "Campaigns", path: "/dashboard/campaigns" },
  { name: "Billing", path: "/dashboard/billing" },
  { name: "Settings", path: "/dashboard/settings" },
];

const menuGroups = [
  { name: "Main", items: menu.slice(0, 4) },
  { name: "Settings & Configuration", items: menu.slice(4, 8) },
  { name: "Management", items: menu.slice(8, 12) },
  { name: "Account", items: menu.slice(12) },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const sidebarRef = useRef<HTMLDivElement>(null);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<number[]>([0, 1, 2, 3]);
  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Close mobile sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setIsMobileOpen(false);
      }
    };

    if (isMobileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isMobileOpen]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Fetch user session
  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        const data = await res.json();

        if (data.success) {
          setUser(data.user);
        } else {
          router.push("/login");
        }
      } catch {
        router.push("/login");
      } finally {
        setLoadingUser(false);
      }
    }

    loadUser();
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const toggleGroup = (index: number) => {
    setExpandedGroups(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const filteredMenuGroups = menuGroups.map(group => ({
    ...group,
    items: group.items.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(group => group.items.length > 0);

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#1877F2] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        .sidebar-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .sidebar-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .sidebar-scrollbar::-webkit-scrollbar-thumb {
          background-color: #D1D5DB;
          border-radius: 20px;
        }
        .sidebar-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #9CA3AF;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
      
      <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900 antialiased">
        {/* Mobile Overlay */}
        {isMobileOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-fadeIn" />
        )}

        {/* Fixed Sidebar - Exact same design as before */}
        <aside
          ref={sidebarRef}
          className={`
            fixed top-0 left-0 h-screen bg-white border-r border-gray-200 
            transition-all duration-300 ease-in-out z-50
            ${isCollapsed ? 'lg:w-20 w-20' : 'lg:w-64 w-64'}
            ${isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0 lg:shadow-lg'}
            flex flex-col
          `}
        >
          {/* Sidebar Header */}
          <div 
            className="border-b border-gray-200 p-6 bg-white flex-shrink-0"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-[#1877F2] to-[#42B72A] text-white rounded-xl font-bold flex items-center justify-center shadow-md">
                  {user?.name?.charAt(0) || "V"}
                </div>
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <h1 className="font-bold text-lg truncate text-gray-900">Vaiket Panel</h1>
                    <p className="text-xs text-gray-500 truncate">Dashboard v2.0</p>
                  </div>
                )}
              </div>
              
              {/* Close button for mobile */}
              <button
                onClick={() => setIsMobileOpen(false)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>

              {/* Collapse button for desktop */}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden lg:flex items-center justify-center w-8 h-8 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <ChevronsLeft className={`w-4 h-4 text-gray-500 transition-transform ${isCollapsed ? "rotate-180" : ""}`} />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          {!isCollapsed && (
            <div 
              className="border-b border-gray-200 p-4 bg-white flex-shrink-0"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search menu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2]/20 focus:border-[#1877F2] transition-all"
                  aria-label="Search menu items"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-200 rounded"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Menu Container - Scrollable */}
          <div 
            className="flex-1 overflow-y-auto overscroll-contain sidebar-scrollbar"
          >
            <nav className="py-4 px-2">
              {filteredMenuGroups.map((group, i) => {
                const isExpanded = expandedGroups.includes(i);
                return (
                  <div key={i} className="mb-2">
                    {!isCollapsed && group.items.length > 0 && (
                      <button
                        onClick={() => toggleGroup(i)}
                        className="flex items-center justify-between w-full px-2 py-3 text-xs font-semibold text-gray-500 uppercase hover:text-gray-700 transition-colors"
                        aria-expanded={isExpanded}
                        aria-controls={`menu-group-${i}`}
                      >
                        <span>{group.name}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    )}
                    
                    <div 
                      id={`menu-group-${i}`}
                      className={`${isCollapsed || isExpanded ? "block" : "hidden"}`}
                    >
                      {group.items.map(item => {
                        const active = pathname === item.path;
                        return (
                          <Link
                            key={item.path}
                            href={item.path}
                            className={`
                              flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer mb-1
                              transition-all duration-200
                              ${active 
                                ? "bg-gradient-to-r from-[#1877F2]/10 to-[#42B72A]/5 text-[#1877F2] font-semibold shadow-sm border border-[#1877F2]/20" 
                                : "hover:bg-gray-50 hover:pl-4"
                              }
                              ${isCollapsed ? "justify-center px-2" : ""}
                            `}
                            aria-current={active ? "page" : undefined}
                          >
                            <div className={`${active ? "text-[#1877F2]" : "text-gray-500"}`}>
                              {icons[item.name]}
                            </div>
                            {!isCollapsed && (
                              <>
                                <span className="flex-1 text-sm">{item.name}</span>
                                {active && <ChevronRight className="w-4 h-4" />}
                              </>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Fixed User Section at Bottom */}
          <div 
            className="border-t border-gray-200 p-4 bg-white"
          >
            <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3"}`}>
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#1877F2] to-[#42B72A] flex items-center justify-center text-white font-semibold shadow-md">
                  {user?.name?.charAt(0) || "U"}
                </div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
              </div>
              
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate text-gray-900">{user?.name || "User"}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email || "user@example.com"}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-gray-500">Admin</span>
                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                    <span className="text-xs text-green-500 font-medium">Online</span>
                  </div>
                </div>
              )}
              
              <button
                onClick={handleLogout}
                className={`p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 ${isCollapsed ? "" : "ml-auto"}`}
                title="Logout"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4 text-gray-600 hover:text-red-500 transition-colors" />
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div 
          className="flex-1 flex flex-col min-h-screen w-full transition-all duration-300"
          style={{
            marginLeft: isMobileOpen ? (isCollapsed ? '80px' : '256px') : '0',
            width: isMobileOpen ? `calc(100% - ${isCollapsed ? '80px' : '256px'})` : '100%',
          }}
        >
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileOpen(true)}
            className="lg:hidden fixed top-4 left-4 z-30 p-3 bg-white rounded-xl shadow-lg hover:bg-gray-50 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5 text-gray-700" />
          </button>

          {/* Main Content */}
          <main className="flex-1 p-4 md:p-5 lg:p-6 pt-16 lg:pt-6">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}