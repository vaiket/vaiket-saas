import { NextResponse } from "next/server";
import { google } from "googleapis";

export async function GET() {
  const redirectUri = process.env.GOOGLE_REDIRECT_URI!;
  console.log("REDIRECT URI USED:", redirectUri);

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "email",
      "profile",
      "https://mail.google.com/"
    ]
  });

  return NextResponse.redirect(url);
}
