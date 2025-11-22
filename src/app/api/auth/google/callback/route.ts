// src/app/api/auth/google/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

async function getUserFromRequest(req: NextRequest) {
  // Read your session JWT cookie named "token"
  const token = req.cookies.get("token")?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
    return payload; // should contain userId / tenantId per your implementation
  } catch (e) {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI!;

  // Exchange code -> tokens
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
    return NextResponse.redirect(new URL("/dashboard/mail-accounts?error=oauth_failed", req.url));
  }

  const { access_token, refresh_token, expires_in } = tokenJson;

  // fetch basic user info (email)
  const uiRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  const userInfo = await uiRes.json();
  const email = userInfo.email;
  const name = userInfo.name || email;

  if (!email) {
    return NextResponse.redirect(new URL("/dashboard/mail-accounts?error=no_email", req.url));
  }

  // identify logged-in user to link to tenant/user (optional)
  const session = await getUserFromRequest(req);
  const tenantId = session?.tenantId ?? null;
  const userId = session?.userId ?? null;

  // Upsert MailAccount with Gmail details (overwrite or update)
  await prisma.mailAccount.upsert({
    where: { email },
    create: {
      name: `${name} (Gmail)`,
      email,
      provider: "gmail",
      smtpHost: "smtp.gmail.com",
      smtpPort: 465,
      smtpSecure: true,
      smtpUser: email,
      smtpPass: "", // we will use OAuth for SMTP
      imapHost: "imap.gmail.com",
      imapPort: 993,
      imapSecure: true,
      imapUser: email,
      imapPass: "",
      active: true,
      tenantId,
      oauthProvider: "google",
      oauthAccessToken: access_token,
      oauthRefreshToken: refresh_token ?? null,
      oauthExpiresAt: expires_in ? new Date(Date.now() + Number(expires_in) * 1000) : null,
    },
    update: {
      provider: "gmail",
      smtpHost: "smtp.gmail.com",
      smtpPort: 465,
      smtpSecure: true,
      smtpUser: email,
      imapHost: "imap.gmail.com",
      imapPort: 993,
      imapSecure: true,
      imapUser: email,
      active: true,
      oauthProvider: "google",
      oauthAccessToken: access_token,
      oauthRefreshToken: refresh_token ?? undefined, // keep existing refresh token if Google didn't return one
      oauthExpiresAt: expires_in ? new Date(Date.now() + Number(expires_in) * 1000) : undefined,
    },
  });

  // Redirect to mail accounts page
  return NextResponse.redirect(new URL("/dashboard/mail-accounts?connected=1", req.url));
}
