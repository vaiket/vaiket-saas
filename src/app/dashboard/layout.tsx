"use client";

import Image from "next/image";
import Link from "next/link";
import Lottie from "lottie-react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import {
  Bot,
  BriefcaseBusiness,
  Home,
  CreditCard,
  Database,
  Inbox,
  LogOut,
  Mail,
  MessageSquare,
  Search,
  Server,
  Settings,
  Smartphone,
  Sparkles,
  User,
  UserPlus,
  Users,
  QrCode,
  X,
  BarChart3,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ChevronsLeft,
  CheckCheck,
  Clock3,
  ExternalLink,
  SendHorizontal,
  Zap,
} from "lucide-react";
import NotificationBell from "@/components/dashboard/NotificationBell";
import dotsAnimation from "@/assets/dots.json";

type AppUser = {
  name?: string | null;
  email?: string | null;
  role?: string | null;
  profileImage?: string | null;
};

type MenuChild = {
  name: string;
  path: string;
  icon: React.ReactNode;
};

type MenuItem = {
  name: string;
  path: string;
  icon: React.ReactNode;
  children?: MenuChild[];
};

type MenuGroup = {
  name: string;
  items: MenuItem[];
};

type HubLauncherItem = {
  name: string;
  path: string;
  subtitle: string;
  logoPath: string;
  logoAlt: string;
};

type SidebarTheme = {
  parentActive: string;
  parentIdle: string;
  iconActive: string;
  iconIdle: string;
  iconWrapActive: string;
  iconWrapIdle: string;
  submenuToggle: string;
  submenuChevronExpanded: string;
  tailChevronActive: string;
  tailChevronIdle: string;
  childWrap: string;
  childActive: string;
  childIdle: string;
  childIconActive: string;
  childIconIdle: string;
  childDot: string;
  subscriptionRing: string;
  upgradeBadge: string;
  badgeLabel?: string;
  badgeClass?: string;
  withBackdrop?: boolean;
};

const MENU_GROUPS: MenuGroup[] = [
  {
    name: "Core",
    items: [
      { name: "Overview", path: "/dashboard", icon: <Home className="h-5 w-5" /> },
      {
        name: "CRM",
        path: "/dashboard/crm",
        icon: <BriefcaseBusiness className="h-5 w-5" />,
        children: [
          {
            name: "Overview",
            path: "/dashboard/crm",
            icon: <Home className="h-3.5 w-3.5" />,
          },
          {
            name: "Leads",
            path: "/dashboard/crm/leads",
            icon: <Users className="h-3.5 w-3.5" />,
          },
          {
            name: "Clients",
            path: "/dashboard/crm/clients",
            icon: <User className="h-3.5 w-3.5" />,
          },
          {
            name: "Pipeline",
            path: "/dashboard/crm/pipeline",
            icon: <BarChart3 className="h-3.5 w-3.5" />,
          },
          {
            name: "Tasks",
            path: "/dashboard/crm/tasks",
            icon: <CheckCheck className="h-3.5 w-3.5" />,
          },
          {
            name: "Appointments",
            path: "/dashboard/crm/appointments",
            icon: <Clock3 className="h-3.5 w-3.5" />,
          },
          {
            name: "Team",
            path: "/dashboard/crm/team",
            icon: <Users className="h-3.5 w-3.5" />,
          },
          {
            name: "Templates",
            path: "/dashboard/crm/templates",
            icon: <Sparkles className="h-3.5 w-3.5" />,
          },
        ],
      },
      {
        name: "WhatsApp Hub",
        path: "/dashboard/whatsapp",
        icon: <Smartphone className="h-5 w-5" />,
        children: [
          {
            name: "Overview",
            path: "/dashboard/whatsapp",
            icon: <Home className="h-3.5 w-3.5" />,
          },
          {
            name: "Accounts",
            path: "/dashboard/whatsapp/accounts",
            icon: <Smartphone className="h-3.5 w-3.5" />,
          },
          {
            name: "Contacts",
            path: "/dashboard/whatsapp/contacts",
            icon: <Users className="h-3.5 w-3.5" />,
          },
          {
            name: "Inbox",
            path: "/dashboard/whatsapp/inbox",
            icon: <MessageSquare className="h-3.5 w-3.5" />,
          },
          {
            name: "Send Messages",
            path: "/dashboard/whatsapp/send-messages",
            icon: <Zap className="h-3.5 w-3.5" />,
          },
          {
            name: "Bulk Messaging",
            path: "/dashboard/whatsapp/bulk",
            icon: <Inbox className="h-3.5 w-3.5" />,
          },
          {
            name: "Workflows",
            path: "/dashboard/whatsapp/workflows",
            icon: <Settings className="h-3.5 w-3.5" />,
          },
          {
            name: "Automation Builder",
            path: "/dashboard/whatsapp/automation-builder",
            icon: <Sparkles className="h-3.5 w-3.5" />,
          },
          {
            name: "Chatbot Rules",
            path: "/dashboard/whatsapp/chatbot",
            icon: <Bot className="h-3.5 w-3.5" />,
          },
          {
            name: "My QR Code",
            path: "/dashboard/whatsapp/my-qr-code",
            icon: <QrCode className="h-3.5 w-3.5" />,
          },
          {
            name: "Subscription",
            path: "/dashboard/whatsapp/subscription",
            icon: <CreditCard className="h-3.5 w-3.5" />,
          },
        ],
      },
      {
        name: "Email Hub",
        path: "/dashboard/email-hub",
        icon: <Mail className="h-5 w-5" />,
        children: [
          {
            name: "Overview",
            path: "/dashboard/email-hub",
            icon: <Home className="h-3.5 w-3.5" />,
          },
          {
            name: "Inbox",
            path: "/dashboard/mail-inbox",
            icon: <Inbox className="h-3.5 w-3.5" />,
          },
          {
            name: "Subscriber",
            path: "/dashboard/leads",
            icon: <Users className="h-3.5 w-3.5" />,
          },
          {
            name: "Mailbox",
            path: "/dashboard/mail-accounts",
            icon: <Server className="h-3.5 w-3.5" />,
          },
          {
            name: "Campaigns",
            path: "/dashboard/campaigns",
            icon: <BarChart3 className="h-3.5 w-3.5" />,
          },
          {
            name: "Automation",
            path: "/dashboard/mail-automation",
            icon: <Bot className="h-3.5 w-3.5" />,
          },
          {
            name: "Templates",
            path: "/dashboard/templates",
            icon: <Database className="h-3.5 w-3.5" />,
          },
          {
            name: "Mail History",
            path: "/dashboard/mail-history",
            icon: <MessageSquare className="h-3.5 w-3.5" />,
          },
          {
            name: "DNS Setup",
            path: "/dashboard/dns-setup",
            icon: <Sparkles className="h-3.5 w-3.5" />,
          },
          {
            name: "SMTP Manager",
            path: "/dashboard/smtp-management",
            icon: <Server className="h-3.5 w-3.5" />,
          },
          {
            name: "Settings",
            path: "/dashboard/settings/mail",
            icon: <Settings className="h-3.5 w-3.5" />,
          },
          {
            name: "Active Mail",
            path: "/dashboard/email-management/activate",
            icon: <Zap className="h-3.5 w-3.5" />,
          },
          {
            name: "Subscription",
            path: "/dashboard/email-hub/subscription",
            icon: <CreditCard className="h-3.5 w-3.5" />,
          },
          {
            name: "Billing",
            path: "/dashboard/billing",
            icon: <CreditCard className="h-3.5 w-3.5" />,
          },
        ],
      },
      {
        name: "RCS Hub",
        path: "/dashboard/rcs",
        icon: <MessageSquare className="h-5 w-5" />,
        children: [
          {
            name: "Overview",
            path: "/dashboard/rcs",
            icon: <Home className="h-3.5 w-3.5" />,
          },
          {
            name: "Accounts",
            path: "/dashboard/rcs/accounts",
            icon: <Smartphone className="h-3.5 w-3.5" />,
          },
          {
            name: "Contacts",
            path: "/dashboard/rcs/contacts",
            icon: <Users className="h-3.5 w-3.5" />,
          },
          {
            name: "Inbox",
            path: "/dashboard/rcs/inbox",
            icon: <Inbox className="h-3.5 w-3.5" />,
          },
          {
            name: "Campaigns",
            path: "/dashboard/rcs/campaigns",
            icon: <SendHorizontal className="h-3.5 w-3.5" />,
          },
          {
            name: "Workflows",
            path: "/dashboard/rcs/workflows",
            icon: <Bot className="h-3.5 w-3.5" />,
          },
          {
            name: "Templates",
            path: "/dashboard/rcs/templates",
            icon: <Database className="h-3.5 w-3.5" />,
          },
          {
            name: "Analytics",
            path: "/dashboard/rcs/analytics",
            icon: <BarChart3 className="h-3.5 w-3.5" />,
          },
          {
            name: "Subscription",
            path: "/dashboard/rcs/subscription",
            icon: <CreditCard className="h-3.5 w-3.5" />,
          },
        ],
      },
    ],
  },
  {
    name: "Automation",
    items: [
      { name: "AI Settings", path: "/dashboard/ai-settings", icon: <Bot className="h-5 w-5" /> },
      {
        name: "Project Settings",
        path: "/dashboard/email-branding",
        icon: <Database className="h-5 w-5" />,
      },
      {
        name: "Onboarding",
        path: "/dashboard/onboarding-details",
        icon: <UserPlus className="h-5 w-5" />,
      },
      { name: "Inbox", path: "/dashboard/inbox", icon: <MessageSquare className="h-5 w-5" /> },
    ],
  },
  {
    name: "Management",
    items: [
      {
        name: "Users Management",
        path: "/dashboard/users-management",
        icon: <Users className="h-5 w-5" />,
      },
    ],
  },
  {
    name: "Workspace",
    items: [
      { name: "Billing", path: "/dashboard/billing", icon: <CreditCard className="h-5 w-5" /> },
      { name: "Settings", path: "/dashboard/settings", icon: <Settings className="h-5 w-5" /> },
    ],
  },
];

const HUB_LAUNCHER_APPS: HubLauncherItem[] = [
  {
    name: "Vaiket CRM",
    path: "/dashboard/crm",
    subtitle: "Leads, clients, pipeline",
    logoPath: "/launcher/crm.png",
    logoAlt: "Vaiket CRM logo",
  },
  {
    name: "WhatsApp Hub",
    path: "/dashboard/whatsapp",
    subtitle: "Accounts, inbox, automation",
    logoPath: "/launcher/whatsapp-business.png",
    logoAlt: "WhatsApp logo",
  },
  {
    name: "Email Hub",
    path: "/dashboard/email-hub",
    subtitle: "Mailboxes, campaigns, inbox",
    logoPath: "/launcher/email.png",
    logoAlt: "Mail logo",
  },
  {
    name: "RCS Hub",
    path: "/dashboard/rcs",
    subtitle: "RCS inbox, workflows, analytics",
    logoPath: "/launcher/rcs.png",
    logoAlt: "RCS logo",
  },
];

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const HUB_ROOT_PATHS = new Set([
  "/dashboard/crm",
  "/dashboard/whatsapp",
  "/dashboard/email-hub",
  "/dashboard/rcs",
]);

const SIDEBAR_HUB_PATHS = new Set([
  "/dashboard/crm",
  "/dashboard/whatsapp",
  "/dashboard/email-hub",
  "/dashboard/rcs",
]);

const HUB_CHILD_SCOPE_EXCLUDE = new Set([
  "/dashboard/billing",
]);

const SIDEBAR_THEMES: Record<"default" | "hubBlue", SidebarTheme> = {
  default: {
    parentActive:
      "border border-blue-300/55 bg-[linear-gradient(135deg,rgba(59,130,246,0.26)_0%,rgba(99,102,241,0.16)_100%)] text-white shadow-[0_14px_26px_-20px_rgba(59,130,246,0.95)]",
    parentIdle:
      "border border-transparent text-[var(--sidebar-text)] hover:border-slate-400/35 hover:bg-white/[0.06] hover:text-white",
    iconActive: "text-blue-100",
    iconIdle: "text-slate-400 group-hover:text-blue-100",
    iconWrapActive: "grid h-7 w-7 place-items-center rounded-lg bg-blue-500/20",
    iconWrapIdle:
      "grid h-7 w-7 place-items-center rounded-lg bg-slate-800/45 group-hover:bg-blue-500/16",
    submenuToggle:
      "mr-1.5 rounded-lg p-1.5 text-slate-400 transition hover:bg-white/[0.08] hover:text-slate-100",
    submenuChevronExpanded: "rotate-180 text-blue-200",
    tailChevronActive: "translate-x-0 text-blue-200",
    tailChevronIdle: "translate-x-0.5 text-slate-500 group-hover:text-blue-200",
    childWrap: "ml-4 mt-2 space-y-1.5 border-l border-slate-600/70 pl-3",
    childActive:
      "border border-blue-400/35 bg-[linear-gradient(135deg,rgba(59,130,246,0.24)_0%,rgba(99,102,241,0.18)_100%)] text-blue-100",
    childIdle:
      "border border-transparent text-slate-300 hover:border-slate-500/35 hover:bg-white/[0.04] hover:text-slate-100",
    childIconActive: "bg-blue-400/20",
    childIconIdle: "bg-slate-700/70",
    childDot: "ml-auto h-1.5 w-1.5 rounded-full bg-blue-200",
    subscriptionRing: "",
    upgradeBadge: "border-blue-300/35 bg-blue-500/10 text-blue-100",
  },
  hubBlue: {
    parentActive:
      "border border-sky-300/55 bg-[linear-gradient(135deg,rgba(56,189,248,0.24)_0%,rgba(59,130,246,0.18)_100%)] text-white shadow-[0_14px_26px_-20px_rgba(56,189,248,0.95)]",
    parentIdle:
      "border border-transparent text-[var(--sidebar-text)] hover:border-slate-400/35 hover:bg-white/[0.06] hover:text-white",
    iconActive: "text-sky-100",
    iconIdle: "text-slate-400 group-hover:text-sky-100",
    iconWrapActive:
      "grid h-7 w-7 place-items-center rounded-lg bg-sky-500/20",
    iconWrapIdle:
      "grid h-7 w-7 place-items-center rounded-lg bg-slate-800/45 group-hover:bg-sky-500/15",
    submenuToggle:
      "mr-1.5 rounded-lg p-1.5 text-slate-400 transition hover:bg-white/[0.08] hover:text-slate-100",
    submenuChevronExpanded: "rotate-180 text-sky-200",
    tailChevronActive: "translate-x-0 text-sky-200",
    tailChevronIdle: "translate-x-0.5 text-slate-500 group-hover:text-sky-200",
    childWrap: "ml-4 mt-2 space-y-1.5 border-l border-slate-600/70 pl-3",
    childActive:
      "border border-sky-300/45 bg-[linear-gradient(135deg,rgba(56,189,248,0.22)_0%,rgba(59,130,246,0.15)_100%)] text-sky-50",
    childIdle:
      "border border-transparent text-slate-300 hover:border-slate-500/35 hover:bg-white/[0.04] hover:text-slate-100",
    childIconActive: "bg-sky-300/25",
    childIconIdle: "bg-slate-700/70",
    childDot: "ml-auto h-1.5 w-1.5 rounded-full bg-sky-200",
    subscriptionRing: "",
    upgradeBadge: "border-sky-300/35 bg-sky-500/10 text-sky-100",
  },
};

const getSidebarThemeKey = (path: string): keyof typeof SIDEBAR_THEMES => {
  if (HUB_ROOT_PATHS.has(path)) return "hubBlue";
  return "default";
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const sidebarRef = useRef<HTMLDivElement>(null);

  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(
    MENU_GROUPS.map((group) => group.name)
  );
  const [expandedSubmenus, setExpandedSubmenus] = useState<string[]>([]);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [appsMenuOpen, setAppsMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const appsMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const savedState = localStorage.getItem("dashboard-sidebar-collapsed");
      if (savedState === "1") setIsCollapsed(true);
    } catch {
      // noop
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("dashboard-sidebar-collapsed", isCollapsed ? "1" : "0");
    } catch {
      // noop
    }
  }, [isCollapsed]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("dashboard-submenu-expanded");
      if (!saved) return;
      const parsed: unknown = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const valid = parsed.filter(
          (entry): entry is string =>
            typeof entry === "string" &&
            MENU_GROUPS.some((group) =>
              group.items.some((item) => item.path === entry && item.children?.length)
            )
        );
        setExpandedSubmenus(valid);
      }
    } catch {
      // noop
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        "dashboard-submenu-expanded",
        JSON.stringify(expandedSubmenus)
      );
    } catch {
      // noop
    }
  }, [expandedSubmenus]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setIsSidebarOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsSidebarOpen(false);
    };

    if (isSidebarOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isSidebarOpen]);

  useEffect(() => {
    if (!profileMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setProfileMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [profileMenuOpen]);

  useEffect(() => {
    if (!appsMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        appsMenuRef.current &&
        !appsMenuRef.current.contains(event.target as Node)
      ) {
        setAppsMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAppsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [appsMenuOpen]);

  useEffect(() => {
    setIsSidebarOpen(false);
    setProfileMenuOpen(false);
    setAppsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
          signal: controller.signal,
        });
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

    return () => controller.abort();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // noop
    }
    router.push("/login");
  };

  const goTo = (path: string) => {
    setProfileMenuOpen(false);
    setAppsMenuOpen(false);
    router.push(path);
  };

  const isPathMatch = useCallback(
    (path: string) => pathname === path || pathname.startsWith(`${path}/`),
    [pathname]
  );

  const activeHubPath = useMemo(() => {
    const coreGroup = MENU_GROUPS.find((group) => group.name === "Core");
    if (!coreGroup) return null;

    const hubItems = coreGroup.items.filter((item) => SIDEBAR_HUB_PATHS.has(item.path));

    const rootMatch = hubItems.find((item) => isPathMatch(item.path));
    if (rootMatch) return rootMatch.path;

    const childMatch = hubItems.find((item) =>
      (item.children || []).some(
        (child) => !HUB_CHILD_SCOPE_EXCLUDE.has(child.path) && isPathMatch(child.path)
      )
    );

    return childMatch?.path ?? null;
  }, [isPathMatch]);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupName)
        ? prev.filter((name) => name !== groupName)
        : [...prev, groupName]
    );
  };

  const toggleSubmenu = (itemPath: string) => {
    setExpandedSubmenus((prev) =>
      prev.includes(itemPath)
        ? prev.filter((path) => path !== itemPath)
        : [...prev, itemPath]
    );
  };

  useEffect(() => {
    const activeGroupNames = MENU_GROUPS.filter((group) =>
      group.items.some((item) => {
        if (isPathMatch(item.path)) return true;
        return (item.children || []).some((child) => isPathMatch(child.path));
      })
    ).map((group) => group.name);

    if (activeGroupNames.length > 0) {
      setExpandedGroups((prev) => Array.from(new Set([...prev, ...activeGroupNames])));
    }

    const activeParentPaths = MENU_GROUPS.flatMap((group) => group.items)
      .filter((item) => item.children?.length)
      .filter(
        (item) =>
          isPathMatch(item.path) ||
          (item.children || []).some((child) => isPathMatch(child.path))
      )
      .map((item) => item.path);

    if (activeParentPaths.length > 0) {
      setExpandedSubmenus((prev) => Array.from(new Set([...prev, ...activeParentPaths])));
    }
  }, [isPathMatch]);

  const scopedMenuGroups = useMemo(() => {
    if (!activeHubPath) return MENU_GROUPS;

    return MENU_GROUPS.map((group) => {
      if (group.name !== "Core") return group;

      return {
        ...group,
        items: group.items.filter((item) => {
          if (!SIDEBAR_HUB_PATHS.has(item.path)) return true;
          return item.path === activeHubPath;
        }),
      };
    });
  }, [activeHubPath]);

  const filteredMenuGroups = useMemo(() => {
    const query = deferredSearchQuery.trim().toLowerCase();
    if (!query) return scopedMenuGroups;

    return scopedMenuGroups.map((group) => ({
      ...group,
      items: group.items
        .map((item) => {
          const itemMatch = item.name.toLowerCase().includes(query);
          const filteredChildren = (item.children || []).filter((child) =>
            child.name.toLowerCase().includes(query)
          );

          if (itemMatch) return item;
          if (filteredChildren.length > 0) {
            return { ...item, children: filteredChildren };
          }

          return null;
        })
        .filter((item): item is MenuItem => Boolean(item)),
    })).filter((group) => group.items.length > 0);
  }, [deferredSearchQuery, scopedMenuGroups]);

  const pageTitle = useMemo(() => {
    const allItems = MENU_GROUPS.flatMap((group) => group.items);
    const allChildren = allItems.flatMap((item) => item.children || []);

    const childExact = allChildren.find((child) => child.path === pathname);
    if (childExact) return childExact.name;

    const exact = allItems.find((item) => item.path === pathname);
    if (exact) return exact.name;

    const childNested = allChildren
      .filter((child) => pathname.startsWith(`${child.path}/`))
      .sort((a, b) => b.path.length - a.path.length)[0];
    if (childNested) return childNested.name;

    const nested = allItems
      .filter((item) => pathname.startsWith(`${item.path}/`))
      .sort((a, b) => b.path.length - a.path.length)[0];

    return nested?.name ?? "Dashboard";
  }, [pathname]);

  const navContext = useMemo(() => {
    const allItems = MENU_GROUPS.flatMap((group) => group.items);
    const activeItem = allItems
      .filter((item) => {
        if (isPathMatch(item.path)) return true;
        return (item.children || []).some((child) => isPathMatch(child.path));
      })
      .sort((a, b) => b.path.length - a.path.length)[0];

    if (!activeItem) return "Workspace";

    const groupName =
      MENU_GROUPS.find((group) => group.items.some((item) => item.path === activeItem.path))
        ?.name ?? "Workspace";

    if (activeItem.children?.length) {
      return `${groupName} / ${activeItem.name}`;
    }

    return groupName;
  }, [isPathMatch]);

  const forceExpandInSearch = deferredSearchQuery.trim().length > 0;

  if (loadingUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-sm text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        .sidebar-shell {
          --sidebar-primary: #0f172a;
          --sidebar-accent: #3b82f6;
          --sidebar-hover: #60a5fa;
          --sidebar-bg: #0f172a;
          --sidebar-divider: rgba(148, 163, 184, 0.28);
          --sidebar-text: #dbe3f1;
          --sidebar-label: #94a3b8;
        }
        .sidebar-panel {
          background-image:
            radial-gradient(circle at 10% 10%, rgba(56, 189, 248, 0.22), transparent 34%),
            radial-gradient(circle at 92% 2%, rgba(99, 102, 241, 0.2), transparent 36%),
            linear-gradient(180deg, #0b1220 0%, #0f172a 52%, #111827 100%);
        }
        .layout-surface {
          background-image:
            radial-gradient(circle at 12% -10%, rgba(59, 130, 246, 0.12), transparent 36%),
            radial-gradient(circle at 88% 6%, rgba(14, 165, 233, 0.1), transparent 28%),
            linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
        }
        .app-scrollbar::-webkit-scrollbar {
          width: 7px;
        }
        .app-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .app-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(99, 102, 241, 0.72);
          border-radius: 999px;
          border: 1px solid transparent;
          background-clip: padding-box;
        }
        .app-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(99, 102, 241, 0.96);
        }
        .app-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(99, 102, 241, 0.72) transparent;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          scroll-behavior: smooth;
          touch-action: pan-y;
          contain: content;
        }
        .gpu-layer {
          transform: translateZ(0);
          will-change: transform;
          backface-visibility: hidden;
        }
        @media (prefers-reduced-motion: reduce) {
          .sidebar-motion-safe {
            transition-duration: 0ms !important;
            animation-duration: 0ms !important;
          }
        }
      `}</style>

      <div className={`${plusJakarta.className} sidebar-shell layout-surface min-h-screen text-gray-900 antialiased`}>
        {isSidebarOpen && (
          <div className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[2px] lg:hidden" />
        )}

        {/* Sidebar */}
        <aside
          ref={sidebarRef}
          className={`
            gpu-layer sidebar-motion-safe sidebar-panel fixed left-0 top-0 z-50 h-screen overflow-hidden border-r border-[var(--sidebar-divider)] bg-[var(--sidebar-bg)] shadow-[0_20px_45px_-28px_rgba(2,6,23,0.95)]
            transition-all duration-300 ease-out
            ${isCollapsed ? "lg:w-20 w-[84%] max-w-[320px]" : "lg:w-72 w-[84%] max-w-[320px]"}
            ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
            flex flex-col
          `}
        >
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0)_26%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-[104px] h-px bg-gradient-to-r from-transparent via-sky-300/30 to-transparent" />

          <div className="relative z-10 flex-shrink-0 border-b border-[var(--sidebar-divider)] px-4 pb-4 pt-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-3">
                {isCollapsed ? (
                  <Image
                    src="/vaiket-bridge-mark.svg"
                    alt="Vaiket Bridge"
                    width={42}
                    height={42}
                    className="h-10 w-10 rounded-xl shadow-[0_2px_14px_rgba(20,184,166,0.25)]"
                    priority
                  />
                ) : (
                  <Image
                    src="/vaiket-bridge-logo.svg"
                    alt="Vaiket Bridge Automation Workspace"
                    width={256}
                    height={64}
                    className="h-11 w-auto object-contain"
                    priority
                  />
                )}
              </div>

              <button
                onClick={() => setIsSidebarOpen(false)}
                className="rounded-xl p-2 text-slate-300 transition hover:bg-white/10 hover:text-white lg:hidden"
                aria-label="Close sidebar"
              >
                <X className="h-5 w-5" />
              </button>

              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="sidebar-motion-safe hidden h-9 w-9 items-center justify-center rounded-xl border border-[var(--sidebar-divider)] bg-white/[0.04] text-slate-200 transition hover:border-indigo-400/45 hover:bg-indigo-400/15 hover:text-indigo-100 lg:flex"
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <ChevronsLeft
                  className={`sidebar-motion-safe h-4 w-4 transition-transform ${
                    isCollapsed ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>

            {!isCollapsed && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-sky-300/25 bg-white/[0.05] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-sky-100">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                Workspace Ready
              </div>
            )}
          </div>

          {!isCollapsed && (
            <div className="relative z-10 flex-shrink-0 border-b border-[var(--sidebar-divider)] px-4 py-3.5">
              <div className="relative rounded-xl border border-slate-500/55 bg-slate-900/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Find menu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-transparent bg-transparent py-2.5 pl-10 pr-11 text-sm text-slate-100 outline-none placeholder:text-slate-400 transition focus:border-blue-400/45 focus:ring-2 focus:ring-blue-400/20"
                  aria-label="Search menu items"
                />
                {!searchQuery && (
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md border border-slate-500/50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
                    /
                  </span>
                )}
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-700/70 hover:text-slate-100"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="app-scrollbar relative z-10 min-h-0 flex-1 overflow-y-auto px-2.5 py-3.5">
            <nav>
              {filteredMenuGroups.map((group) => {
                const groupId = `menu-group-${group.name.toLowerCase().replace(/\s+/g, "-")}`;
                const isExpanded =
                  forceExpandInSearch || expandedGroups.includes(group.name);
                return (
                  <div key={group.name} className="mb-3">
                    {!isCollapsed && group.items.length > 0 && (
                      <button
                        onClick={() => toggleGroup(group.name)}
                        className="sidebar-motion-safe flex w-full items-center justify-between rounded-xl px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--sidebar-label)] transition hover:bg-white/[0.05] hover:text-slate-100"
                        aria-expanded={isExpanded}
                        aria-controls={groupId}
                      >
                        <span className="inline-flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-sky-300/85" />
                          {group.name}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}

                    <div
                      id={groupId}
                      className={`${isCollapsed || isExpanded ? "block" : "hidden"}`}
                    >
                      {group.items.map((item) => {
                        const hasChildren = Boolean(item.children && item.children.length > 0);
                        const childActive = (item.children || []).some(
                          (child) => isPathMatch(child.path)
                        );
                        const active = isPathMatch(item.path) || childActive;
                        const isSubmenuExpanded =
                          forceExpandInSearch ||
                          expandedSubmenus.includes(item.path) ||
                          childActive ||
                          pathname === item.path;
                        const theme = SIDEBAR_THEMES[getSidebarThemeKey(item.path)];
                        const parentStateClass = active
                          ? theme.parentActive
                          : theme.parentIdle;
                        const iconClass = active ? theme.iconActive : theme.iconIdle;
                        const iconWrapClass = active
                          ? theme.iconWrapActive
                          : theme.iconWrapIdle;
                        const submenuToggleClass = theme.submenuToggle;
                        const submenuChevronClass = isSubmenuExpanded
                          ? theme.submenuChevronExpanded
                          : "";
                        const tailChevronClass = active
                          ? theme.tailChevronActive
                          : theme.tailChevronIdle;
                        const childWrapClass = theme.childWrap;

                        const parentItemClass = `flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium ${
                          isCollapsed ? "justify-center px-2" : ""
                        }`;
                        const submenuId = `submenu-${item.path.replace(/[^\w-]/g, "-")}`;

                        return (
                          <div key={item.path} className="mb-1.5">
                            <div
                              className={`
                                sidebar-motion-safe group relative flex items-center overflow-hidden rounded-[14px] border transition-[transform,background-color,border-color,color,box-shadow] duration-200 hover:-translate-y-[1px]
                                ${parentStateClass}
                                ${theme.withBackdrop ? "backdrop-blur-[2px]" : ""}
                                ${isCollapsed ? "justify-center" : ""}
                              `}
                            >
                              {hasChildren ? (
                                <button
                                  type="button"
                                  onClick={() => toggleSubmenu(item.path)}
                                  title={isCollapsed ? item.name : undefined}
                                  className={`${parentItemClass} text-left`}
                                  aria-expanded={isSubmenuExpanded}
                                  aria-controls={submenuId}
                                >
                                  <span className={iconWrapClass}>
                                    <div className={iconClass}>{item.icon}</div>
                                  </span>
                                  {!isCollapsed && (
                                    <span className="flex-1 truncate">{item.name}</span>
                                  )}
                                  {!isCollapsed && theme.badgeLabel && (
                                    <span className={theme.badgeClass}>{theme.badgeLabel}</span>
                                  )}
                                </button>
                              ) : (
                                <Link
                                  href={item.path}
                                  title={isCollapsed ? item.name : undefined}
                                  className={parentItemClass}
                                  aria-current={active ? "page" : undefined}
                                >
                                  <span className={iconWrapClass}>
                                    <div className={iconClass}>{item.icon}</div>
                                  </span>
                                  {!isCollapsed && (
                                    <span className="flex-1 truncate">{item.name}</span>
                                  )}
                                  {!isCollapsed && theme.badgeLabel && (
                                    <span className={theme.badgeClass}>{theme.badgeLabel}</span>
                                  )}
                                </Link>
                              )}

                              {!isCollapsed && hasChildren && (
                                <button
                                  type="button"
                                  onClick={() => toggleSubmenu(item.path)}
                                  aria-label={`${isSubmenuExpanded ? "Collapse" : "Expand"} ${
                                    item.name
                                  } submenu`}
                                  aria-expanded={isSubmenuExpanded}
                                  className={submenuToggleClass}
                                >
                                  <ChevronDown
                                    className={`h-4 w-4 transition-transform ${
                                      submenuChevronClass
                                    }`}
                                  />
                                </button>
                              )}

                              {!isCollapsed && !hasChildren && (
                                <div className="mr-1.5">
                                  <ChevronRight
                                    className={`h-4 w-4 transition-transform ${
                                      tailChevronClass
                                    }`}
                                  />
                                </div>
                              )}
                            </div>

                            {!isCollapsed && hasChildren && isSubmenuExpanded && (
                              <div id={submenuId} className={childWrapClass}>
                                {item.children?.map((child) => {
                                  const isChildActive = isPathMatch(child.path);
                                  const isSubscriptionChild = child.path.endsWith("/subscription");
                                  const childLinkClass = isChildActive
                                    ? theme.childActive
                                    : theme.childIdle;
                                  const childIconWrapClass = isChildActive
                                    ? theme.childIconActive
                                    : theme.childIconIdle;

                                  return (
                                    <Link
                                      key={child.path}
                                      href={child.path}
                                      className={`sidebar-motion-safe flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-[12px] font-medium transition-all duration-200 ${childLinkClass} ${
                                        isSubscriptionChild && !isChildActive
                                          ? theme.subscriptionRing
                                          : ""
                                      }`}
                                    >
                                      <span className={`flex h-5 w-5 items-center justify-center rounded-md ${childIconWrapClass}`}>
                                        {child.icon}
                                      </span>
                                      <span className="truncate">{child.name}</span>
                                      {isSubscriptionChild && !isChildActive && (
                                        <span
                                          className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] ${theme.upgradeBadge}`}
                                        >
                                          Upgrade
                                        </span>
                                      )}
                                      {isChildActive && (
                                        <span className={theme.childDot} />
                                      )}
                                    </Link>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </nav>
          </div>

          <div className="relative z-10 flex-shrink-0 border-t border-[var(--sidebar-divider)] px-3.5 pb-[max(16px,env(safe-area-inset-bottom))] pt-3.5">
            {isCollapsed ? (
              <div className="flex flex-col items-center gap-2">
                <div className="relative flex-shrink-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-500 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(79,70,229,0.45)]">
                    {user?.name?.charAt(0) || "U"}
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-[#0f172a] bg-emerald-400" />
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-xl border border-slate-500/60 p-2 text-slate-300 transition hover:border-rose-300/55 hover:bg-rose-500/15 hover:text-rose-100"
                  title="Logout"
                  aria-label="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3 shadow-[0_18px_30px_-24px_rgba(2,6,23,0.9)] backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <div className="relative flex-shrink-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-500 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(79,70,229,0.45)]">
                      {user?.name?.charAt(0) || "U"}
                    </div>
                    <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-[#0f172a] bg-emerald-400" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-100">
                      {user?.name || "User"}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {user?.email || "user@example.com"}
                    </p>
                    <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-slate-500/45 bg-slate-800/45 px-2 py-0.5 text-[10px] text-slate-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      {user?.role || "admin"}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => goTo("/dashboard/profile")}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-500/50 bg-white/[0.04] px-2 py-2 text-xs font-medium text-slate-200 transition hover:border-blue-300/50 hover:bg-blue-500/12 hover:text-blue-100"
                  >
                    <User className="h-3.5 w-3.5" />
                    Profile
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-500/50 bg-white/[0.04] px-2 py-2 text-xs font-medium text-slate-200 transition hover:border-rose-300/55 hover:bg-rose-500/14 hover:text-rose-100"
                    title="Logout"
                    aria-label="Logout"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>

        <div
          className={`relative min-h-screen transition-[padding] duration-300 ${
            isCollapsed ? "lg:pl-20" : "lg:pl-72"
          }`}
        >
          <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.45)] backdrop-blur-xl">
            <div className="flex h-[72px] items-center justify-between gap-3 px-4 md:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="sidebar-motion-safe inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 lg:hidden"
                  aria-label="Open sidebar"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <rect x="3" y="4" width="6.5" height="16" rx="1.8" />
                    <path d="M13 8.5h8" />
                    <path d="M13 12h8" />
                    <path d="M13 15.5h8" />
                  </svg>
                </button>

                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate text-base font-semibold text-slate-900 md:text-lg">
                      {pageTitle}
                    </p>
                    <span className="hidden max-w-[220px] truncate rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-blue-700 md:inline-flex">
                      {navContext}
                    </span>
                  </div>
                  <p className="truncate font-mono text-[11px] text-slate-500">{pathname}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <NotificationBell />
                <div className="hidden items-center gap-2 rounded-xl border border-blue-200 bg-[linear-gradient(135deg,#ffffff_0%,#eff6ff_100%)] px-3 py-2 text-xs font-medium text-blue-700 shadow-[0_8px_20px_-16px_rgba(37,99,235,0.65)] md:flex">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  Tenant Workspace
                </div>

                <div className="relative" ref={appsMenuRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setAppsMenuOpen((prev) => !prev);
                      setProfileMenuOpen(false);
                    }}
                    className={`group relative inline-flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200/90 bg-[radial-gradient(circle_at_15%_15%,#dbeafe_0%,#ffffff_42%,#e0e7ff_100%)] shadow-[0_10px_20px_-16px_rgba(15,23,42,0.75)] transition-all duration-300 hover:border-blue-300 hover:shadow-[0_16px_34px_-22px_rgba(59,130,246,0.95)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 ${
                      appsMenuOpen ? "border-blue-300 bg-[radial-gradient(circle_at_20%_20%,#c7d2fe_0%,#eff6ff_48%,#e9d5ff_100%)]" : ""
                    }`}
                    aria-label="Open apps launcher"
                    aria-haspopup="menu"
                    aria-expanded={appsMenuOpen}
                    title="Apps"
                  >
                    <span
                      className={`pointer-events-none absolute inset-0 rounded-xl transition-all duration-300 ${
                        appsMenuOpen
                          ? "ring-2 ring-blue-400/90 shadow-[0_0_0_6px_rgba(59,130,246,0.22)]"
                          : "ring-1 ring-blue-200/80 shadow-[0_0_0_4px_rgba(59,130,246,0.12)] group-hover:ring-2 group-hover:ring-blue-300/90 group-hover:shadow-[0_0_0_6px_rgba(59,130,246,0.16)]"
                      }`}
                      aria-hidden="true"
                    />
                    <span
                      className={`pointer-events-none absolute -top-2 left-1/2 inline-flex -translate-x-1/2 items-center justify-center rounded-full border border-blue-200 bg-white px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-blue-700 shadow-sm transition ${
                        appsMenuOpen ? "opacity-100" : "animate-pulse opacity-100"
                      }`}
                      aria-hidden="true"
                    >
                      Apps
                    </span>
                    <span
                      className={`pointer-events-none inline-flex h-9 w-9 items-center justify-center transition-transform duration-300 ${
                        appsMenuOpen ? "scale-105" : "group-hover:scale-105"
                      }`}
                    >
                      <Lottie
                        animationData={dotsAnimation}
                        loop
                        autoplay
                        className="h-9 w-9"
                        rendererSettings={{ preserveAspectRatio: "xMidYMid meet" }}
                      />
                    </span>
                  </button>

                  {appsMenuOpen && (
                    <div className="absolute right-0 z-50 mt-2 w-[360px] max-w-[calc(100vw-1rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_48px_-28px_rgba(15,23,42,0.5)] sm:w-[440px]">
                      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50 px-4 py-3">
                        <p className="text-sm font-semibold text-slate-900">Apps</p>
                        <p className="text-xs text-slate-500">Quick switch between Vaiket hubs</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 p-3 sm:grid-cols-4">
                        {HUB_LAUNCHER_APPS.map((app) => {
                          const active = isPathMatch(app.path);
                          const isCrmApp = app.path === "/dashboard/crm";
                          const isRcsApp = app.path === "/dashboard/rcs";
                          return (
                            <button
                              key={app.path}
                              onClick={() => goTo(app.path)}
                              className={`group relative rounded-2xl border p-2.5 text-left transition ${
                                active
                                  ? "border-blue-300 bg-blue-50 shadow-[0_12px_26px_-20px_rgba(37,99,235,0.9)]"
                                  : "border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/50"
                              }`}
                            >
                              <div
                                className={`mb-2 inline-flex items-center justify-center rounded-xl border ring-4 ${
                                  isCrmApp
                                    ? "h-12 w-12 overflow-hidden border-blue-300 bg-[radial-gradient(circle_at_32%_28%,#eef6ff_0%,#dbeafe_58%,#bfdbfe_100%)] ring-blue-100/90"
                                    : "h-10 w-10 border-slate-200 bg-white ring-slate-50"
                                }`}
                              >
                                <Image
                                  src={app.logoPath}
                                  alt={app.logoAlt}
                                  width={isCrmApp ? 56 : isRcsApp ? 30 : 24}
                                  height={isCrmApp ? 56 : isRcsApp ? 30 : 24}
                                  className={
                                    isCrmApp
                                      ? "h-full w-full scale-[1.32] object-cover object-center"
                                      : isRcsApp
                                      ? "h-7 w-7 object-contain"
                                      : "h-6 w-6 object-contain"
                                  }
                                />
                              </div>
                              <p className="truncate text-xs font-semibold text-slate-900">{app.name}</p>
                              <p className="mt-1 min-h-[28px] text-[11px] leading-tight text-slate-500">{app.subtitle}</p>
                              <ExternalLink className={`absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-300 transition ${active ? "text-blue-500" : "group-hover:text-blue-500"}`} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative" ref={profileMenuRef}>
                  <button
                    onClick={() => {
                      setProfileMenuOpen((prev) => !prev);
                      setAppsMenuOpen(false);
                    }}
                    className="group flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-2.5 py-1.5 shadow-[0_8px_18px_-16px_rgba(15,23,42,0.7)] transition hover:border-blue-200 hover:bg-blue-50/50"
                    aria-label="Open profile menu"
                  >
                    <div className="relative flex-shrink-0">
                      <img
                        src={user?.profileImage || "/api/avatar-default.png"}
                        alt="Profile"
                        className="h-8 w-8 rounded-full border-2 border-blue-100"
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
                    </div>

                    <div className="hidden min-w-0 text-left lg:block">
                      <p className="max-w-[120px] truncate text-xs font-semibold text-slate-900">
                        {user?.name || "User"}
                      </p>
                      <p className="max-w-[120px] truncate text-[11px] text-slate-500">
                        {user?.role || "member"}
                      </p>
                    </div>

                    <ChevronDown
                      className={`h-4 w-4 text-slate-500 transition-transform ${
                        profileMenuOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {profileMenuOpen && (
                    <div className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50 px-4 py-3">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {user?.name || "New User"}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {user?.email || ""}
                        </p>
                        <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                          <Sparkles className="h-3 w-3" />
                          Tenant Workspace
                        </div>
                      </div>

                      <div className="p-2">
                        <button
                          onClick={() => goTo("/dashboard/profile")}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                        >
                          <User className="h-4 w-4 text-slate-500" />
                          Profile Settings
                        </button>
                        <button
                          onClick={() => goTo("/dashboard/ai-settings")}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                        >
                          <Bot className="h-4 w-4 text-slate-500" />
                          AI Settings
                        </button>
                        <button
                          onClick={() => goTo("/dashboard/settings")}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                        >
                          <Settings className="h-4 w-4 text-slate-500" />
                          Workspace Settings
                        </button>
                      </div>

                      <div className="border-t border-slate-100 p-2">
                        <button
                          onClick={handleLogout}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-rose-600 transition hover:bg-rose-50"
                        >
                          <LogOut className="h-4 w-4" />
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          <main className="p-4 md:p-6 lg:p-7">
            {children}
          </main>
        </div>

      </div>
    </>
  );
}
