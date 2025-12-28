// src/app/api/auth/google/login/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI!;
  const scope = encodeURIComponent("https://mail.google.com/ openid email profile");
  const accessType = "offline"; // important to get refresh token
  const includeGrantedScopes = "true";
  const responseType = "code";
  const prompt = "consent"; // to ensure refresh_token is returned for test users

  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=${responseType}&scope=${scope}&access_type=${accessType}&include_granted_scopes=${includeGrantedScopes}&prompt=${prompt}`;

  return NextResponse.redirect(url);
}
