import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const incomingUrl = new URL(req.url);
  const targetUrl = new URL("/api/auth/google/login", incomingUrl.origin);

  // Preserve existing query params, if any.
  targetUrl.search = incomingUrl.search;

  return NextResponse.redirect(targetUrl);
}