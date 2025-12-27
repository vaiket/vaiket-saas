"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";

const tabs = [
  { name: "Overview", slug: "" },
  { name: "Branding", slug: "branding" },
  { name: "Mailbox", slug: "mailbox" },
  { name: "Automation", slug: "automation" },
  { name: "Logs", slug: "logs" },
];

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { projectId } = useParams();
  const pathname = usePathname();

  return (
    <div className="w-full min-h-screen bg-[#f6f8fb]">
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">
            Automation Project
          </h1>
          <p className="text-sm text-gray-500">
            Project ID: {projectId}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b mb-6">
          {tabs.map((tab) => {
            const href = `/dashboard/email-branding/${projectId}/${tab.slug}`;
            const active =
              pathname === href ||
              (tab.slug === "" &&
                pathname === `/dashboard/email-branding/${projectId}`);

            return (
              <Link
                key={tab.name}
                href={href}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                  active
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                {tab.name}
              </Link>
            );
          })}
        </div>

        {/* CONTENT */}
        <div className="bg-white rounded-xl shadow p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
