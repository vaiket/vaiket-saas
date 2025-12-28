// src/app/api/payments/failure/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    console.error("PayU failure/cancel:", Object.fromEntries(formData as any));
  } catch (e) {
    console.error("Error reading PayU failure payload", e);
  }

  return NextResponse.redirect(
    new URL("/dashboard/settings/billing?payment=failed", req.url)
  );
}
