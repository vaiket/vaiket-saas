import { NextResponse } from "next/server";
import { google } from "googleapis";

export async function GET() {
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!redirectUri) {
    console.error("❌ Missing GOOGLE_REDIRECT_URI from env!");
    return NextResponse.json(
      { error: "Server config missing redirect URI" },
      { status: 500 }
    );
  }

  console.log("🔍 Using Redirect URI:", redirectUri);

  // Create OAuth2 client using correct redirect URI from env
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "openid",
      "email",
      "profile",
      "https://mail.google.com/",
    ],
    redirect_uri: redirectUri, // IMPORTANT: Inline force override
  });

  console.log("🔗 Redirecting to Google OAuth URL:", authUrl);

  return NextResponse.redirect(authUrl);
}
