import { NextResponse } from "next/server";

function getAppBaseUrl() {
  const raw =
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.BASE_URL ||
    "https://app.vaiket.com";

  return raw.replace(/\/+$/, "");
}

async function runCron() {
  try {
    // Call your main cron route
    await fetch(`${getAppBaseUrl()}/api/cron/imap-sync/ping`, {
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
      await fetch(`${getAppBaseUrl()}/api/cron/imap-sync/daemon`, {
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
