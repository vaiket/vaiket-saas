import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error:
        "Legacy subscription gateway removed. Use /dashboard/billing or /dashboard/email-hub/subscription.",
    },
    { status: 410 }
  );
}
