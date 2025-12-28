"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="p-10">
      <h2 className="text-3xl font-bold text-purple-600 mb-8">
        ⚙️ Settings
      </h2>

      {/* Settings Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Billing Card */}
        <Link href="/dashboard/settings/billing">
          <Card className="cursor-pointer hover:shadow-xl transition shadow-md border border-purple-200">
            <CardContent className="p-6 text-center">
              <h3 className="text-xl font-bold text-purple-700 mb-2">
                💳 Billing & Subscription
              </h3>
              <p className="text-gray-600">
                Manage subscription & download invoices
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Other settings (future ready placeholder UI) */}
        <Card className="opacity-50 shadow-md border border-gray-200">
          <CardContent className="p-6 text-center">
            <h3 className="text-xl font-bold mb-2">Company Details</h3>
            <p className="text-gray-500 text-sm">Coming Soon...</p>
          </CardContent>
        </Card>

        <Card className="opacity-50 shadow-md border border-gray-200">
          <CardContent className="p-6 text-center">
            <h3 className="text-xl font-bold mb-2">Email Automation Settings</h3>
            <p className="text-gray-500 text-sm">Coming Soon...</p>
          </CardContent>
        </Card>

        <Card className="opacity-50 shadow-md border border-gray-200">
          <CardContent className="p-6 text-center">
            <h3 className="text-xl font-bold mb-2">Team & Security</h3>
            <p className="text-gray-500 text-sm">Coming Soon...</p>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
