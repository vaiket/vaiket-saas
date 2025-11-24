// src/app/api/auth/google/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

async function getUserFromRequest(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as any;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI!;

  // Exchange authorization code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokenJson = await tokenRes.json();
  if (!tokenRes.ok) {
    console.error("Token exchange error:", tokenJson);
    return NextResponse.redirect(
      new URL("/dashboard/mail-accounts?error=oauth_failed", req.url)
    );
  }

  const { access_token, refresh_token, expires_in } = tokenJson;

  // Fetch Google user info (email)
  const uiRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  const userInfo = await uiRes.json();
  const email = userInfo.email;
  const name = userInfo.name || email;

  if (!email) {
    return NextResponse.redirect(
      new URL("/dashboard/mail-accounts?error=no_email", req.url)
    );
  }

  // Logged-in tenant & user
  const session = await getUserFromRequest(req);
  const tenantId = session?.tenantId ?? null;

  // ✅ Check if MailAccount already exists
  const existing = await prisma.mailAccount.findFirst({
    where: { email, tenantId },
  });

  if (existing) {
    // ✅ Update existing Gmail account
    await prisma.mailAccount.update({
      where: { id: existing.id },
      data: {
        name: `${name} (Gmail)`,
        provider: "gmail",
        smtpHost: "smtp.gmail.com",
        smtpPort: 465,
        smtpSecure: true,
        smtpUser: email,
        smtpPass: "",
        imapHost: "imap.gmail.com",
        imapPort: 993,
        imapSecure: true,
        imapUser: email,
        imapPass: "",
        active: true,
        oauthProvider: "google",
        oauthAccessToken: access_token,
        oauthRefreshToken: refresh_token ?? undefined,
        oauthExpiresAt: expires_in
          ? new Date(Date.now() + Number(expires_in) * 1000)
          : undefined,
      },
    });
  } else {
    // ✅ Create new Gmail MailAccount
    await prisma.mailAccount.create({
      data: {
        tenantId,
        name: `${name} (Gmail)`,
        email,
        provider: "gmail",
        smtpHost: "smtp.gmail.com",
        smtpPort: 465,
        smtpSecure: true,
        smtpUser: email,
        smtpPass: "",
        imapHost: "imap.gmail.com",
        imapPort: 993,
        imapSecure: true,
        imapUser: email,
        imapPass: "",
        active: true,
        oauthProvider: "google",
        oauthAccessToken: access_token,
        oauthRefreshToken: refresh_token ?? null,
        oauthExpiresAt: expires_in
          ? new Date(Date.now() + Number(expires_in) * 1000)
          : null,
      },
    });
  }

  return NextResponse.redirect(
    new URL("/dashboard/mail-accounts?connected=1", req.url)
  );
}
