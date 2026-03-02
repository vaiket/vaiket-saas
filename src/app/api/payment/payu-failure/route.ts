import { NextResponse } from "next/server";

function getAppBaseUrl() {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.BASE_URL ||
    "https://app.vaiket.com";

  return raw.replace(/\/+$/, "");
}

export async function POST() {
  return NextResponse.redirect(new URL("/pricing?payment=failed", getAppBaseUrl()));
}
