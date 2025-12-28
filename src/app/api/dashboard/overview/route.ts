import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    totalEmails: 4821,
    aiReplies: 1240,
    awaitingReply: 96,
    avgResponseTime: "1.8 min",
    connectedMailboxes: 4,
    spamBlocked: 231,
  });
}
