import { NextResponse } from "next/server";
import { getPublicBaseUrl } from "@/lib/url/public-base";

export async function GET(req: Request) {
  const incomingUrl = new URL(req.url);
  const targetUrl = new URL("/api/auth/google/callback", getPublicBaseUrl(req));
  targetUrl.search = incomingUrl.search;

  return NextResponse.redirect(targetUrl);
}
