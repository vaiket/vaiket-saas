import { isAutomationActive } from "@/lib/subscription";
import { NextResponse } from "next/server";

export async function GET() {
  const tenantId = 1; // temp (logged-in tenant later)
  const active = await isAutomationActive(tenantId);

  return NextResponse.json({
    automationActive: active,
  });
}
