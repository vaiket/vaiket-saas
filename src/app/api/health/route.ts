import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    imapStatus: "Connected",
    smtpStatus: "Connected",
    queueWorkers: true,
    aiActivity: {
      provider: "deepseek",
      fallbacks: ["gemini"],
      tokens24h: 4800,
      errors24h: 3,
    }
  });
}
