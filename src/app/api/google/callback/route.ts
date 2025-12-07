import { PrismaClient } from "@prisma/client";
import { google } from "googleapis";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

// Static tenant for now — will attach real logged-in tenant later
const TENANT_ID = 1;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");

    if (!code) return NextResponse.json({ error: "No code provided" }, { status: 400 });

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
      process.env.GOOGLE_REDIRECT_URI!,
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const userInfo = await google.oauth2("v2").userinfo.get({ auth: oauth2Client });

    const email = userInfo.data.email;
    if (!email) return NextResponse.json({ error: "No email provided" }, { status: 400 });

    const accessToken = tokens.access_token!;
    const refreshToken = tokens.refresh_token ?? null;

    const expiresIn = (tokens as any).expiry_date
      ? Math.floor(((tokens as any).expiry_date - Date.now()) / 1000)
      : (tokens as any).expires_in ?? 3600;

    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Save Gmail OAuth credentials in DB (Multi-tenant)
    await prisma.gmailAccount.upsert({
      where: { email },
      update: {
        accessToken,
        refreshToken,
        expiresAt,
        updatedAt: new Date(),
      },
      create: {
        email,
        accessToken,
        refreshToken,
        expiresAt,
        tenantId: TENANT_ID,
      },
    });

    console.log("Gmail Connected:", email);

    return NextResponse.redirect(
      "https://ai.vaiket.com/settings/email?connected=1"
    );
  } catch (error) {
    console.error("OAuth Error:", error);
    return NextResponse.redirect(
      "https://ai.vaiket.com/settings/email?error=1"
    );
  }
}
