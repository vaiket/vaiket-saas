import { NextResponse } from "next/server";

async function runCron() {
  try {
    // Call your main cron route
    await fetch("http://localhost:3000/api/cron/imap-sync/ping", {
      method: "GET",
      cache: "no-store",
    });
  } catch (err) {
    console.error("Cron failed:", err);
  }
}

export async function GET() {
  // Run cron immediately
  await runCron();

  // Schedule next run
  setTimeout(async () => {
    try {
      await fetch("http://localhost:3000/api/cron/imap-sync/daemon", {
        method: "GET",
        cache: "no-store",
      });
    } catch (err) {
      console.error("Daemon loop error:", err);
    }
  }, 7000); // 7 seconds interval

  return NextResponse.json({
    ok: true,
    message: "IMAP + AI Daemon running (auto-loop every 7 seconds)",
    interval: "7s",
  });
}
