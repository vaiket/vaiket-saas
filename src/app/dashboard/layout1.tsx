"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const menu = [
  { name: "Overview", path: "/dashboard" },
  { name: "Mail Accounts", path: "/dashboard/mail-accounts" },
  { name: "Inbox", path: "/dashboard/inbox" },
  { name: "AI Settings", path: "/dashboard/ai-settings" },

  // ⭐ NEWLY ADDED MENU ITEMS
  { name: "SMTP Settings", path: "/dashboard/smtp-management" },
  { name: "IMAP Settings", path: "/dashboard/imap-management" },
  { name: "Onboarding", path: "/dashboard/onboarding-details" },
  { name: "users mnge", path: "/dashboard/users-management" },

  { name: "Leads", path: "/dashboard/leads" },
  { name: "Mail inbox", path: "/dashboard/mail-inbox" },
  { name: "Traffic Analytics", path: "/dashboard/traffic" },
  { name: "Billing", path: "/dashboard/billing" },
  { name: "Settings", path: "/dashboard/settings" },
];

export default function DashboardLayout({ children }: any) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r shadow-sm">
        <div className="p-5 text-xl font-bold">VAIKET PANEL</div>

        <nav className="mt-4 px-2">
          {menu.map((item) => (
            <Link key={item.path} href={item.path}>
              <div
                className={`p-3 rounded-md mb-1 cursor-pointer ${
                  pathname === item.path
                    ? "bg-blue-600 text-white"
                    : "hover:bg-gray-200"
                }`}
              >
                {item.name}
              </div>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
