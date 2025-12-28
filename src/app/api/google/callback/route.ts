import { NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";


export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");

    if (!code) {
      return NextResponse.json({ error: "Missing authorization code" }, { status: 400 });
    }

    const redirectUri = process.env.GOOGLE_REDIRECT_URI!;
    console.log("CALLBACK REDIRECT URI:", redirectUri);

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const accessToken = tokens.access_token!;
    const refreshToken = tokens.refresh_token!;
    const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : null;

    // Fetch Gmail user profile
    const gmail = google.oauth2({ auth: oauth2Client, version: "v2" });
    const { data } = await gmail.userinfo.get();
    const email = data.email!;

    console.log("Connected Gmail:", email);

    // TODO: get tenant dynamically — now using default=1
    const tenantId = 1;

    // Save Gmail account into DB
    await prisma.gmailAccount.upsert({
      where: { email },
      update: {
        accessToken,
        refreshToken,
        expiresAt
      },
      create: {
        email,
        accessToken,
        refreshToken,
        expiresAt,
        tenantId
      }
    });

    console.log("Saved Gmail Account Successfully!");

    return NextResponse.redirect("https://ai.vaiket.com/success?email=" + email);
  } catch (err: any) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect("https://ai.vaiket.com/error?reason=" + err.message);
  }
}
