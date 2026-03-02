import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";

type OAuthState = {
  intent?: "login" | "signup";
  gmailConnect?: boolean;
  redirectUri?: string;
};

type WhatsAppOAuthState = {
  nonce: string;
  tenantId: number;
  userId: number;
  expiresAt: number;
};

function readText(value: unknown) {
  return String(value ?? "").trim();
}

function getPublicBaseUrl(req: Request) {
  const envBase = readText(
    process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.BASE_URL
  );
  if (envBase && !/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(envBase)) {
    return envBase.replace(/\/+$/g, "");
  }

  const requestUrl = new URL(req.url);
  const forwardedProto = readText(req.headers.get("x-forwarded-proto"));
  const forwardedHost = readText(req.headers.get("x-forwarded-host"));
  const host = forwardedHost || readText(req.headers.get("host")) || requestUrl.host;
  const proto = forwardedProto || requestUrl.protocol.replace(":", "");
  const normalizedHost = host.startsWith("0.0.0.0:")
    ? host.replace("0.0.0.0", "app.vaiket.com")
    : host.startsWith("localhost:")
    ? host.replace("localhost", "app.vaiket.com")
    : host;

  return `${proto}://${normalizedHost}`;
}

function getGoogleRedirectUri(req: Request) {
  const configured = readText(process.env.GOOGLE_REDIRECT_URI);
  if (configured && !(process.env.NODE_ENV === "production" && /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(configured))) {
    return configured;
  }

  return `${getPublicBaseUrl(req)}/api/google/callback`;
}

function resolveGoogleRedirectUri(req: Request, state: OAuthState) {
  const stateUri = readText(state.redirectUri);
  if (stateUri) {
    return stateUri;
  }
  return getGoogleRedirectUri(req);
}

function parseOAuthState(raw: string | null): unknown {
  if (!raw) return {};
  try {
    const json = Buffer.from(raw, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as unknown;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function isGoogleState(value: unknown): value is OAuthState {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return "intent" in v || "gmailConnect" in v;
}

function isWhatsAppState(value: unknown): value is WhatsAppOAuthState {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.nonce === "string" &&
    typeof v.tenantId === "number" &&
    typeof v.userId === "number" &&
    typeof v.expiresAt === "number"
  );
}

export async function GET(req: Request) {
  const appBaseUrl = getPublicBaseUrl(req);
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const parsedState = parseOAuthState(url.searchParams.get("state"));

    // If Meta WhatsApp OAuth callback was accidentally pointed to Google callback,
    // forward it to the dedicated WhatsApp callback route with all query params.
    if (isWhatsAppState(parsedState)) {
      const target = new URL("/api/whatsapp/connect/callback", appBaseUrl);
      target.search = url.search;
      return NextResponse.redirect(target);
    }

    const state = isGoogleState(parsedState) ? parsedState : {};
    const intent = state.intent === "signup" ? "signup" : "login";

    if (!code) {
      return NextResponse.redirect(new URL("/login?error=google_missing_code", appBaseUrl));
    }

    const redirectUri = resolveGoogleRedirectUri(req, state);
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const jwtSecret = process.env.JWT_SECRET;

    if (!redirectUri || !clientId || !clientSecret || !jwtSecret) {
      return NextResponse.redirect(new URL("/login?error=google_config", appBaseUrl));
    }

    // 1) Code -> Tokens
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
    if (!tokenRes.ok || !tokenJson?.access_token) {
      console.error("Google token error:", tokenJson);
      return NextResponse.redirect(new URL("/login?error=google_token", appBaseUrl));
    }

    // 2) Token -> User profile
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    const profile = await profileRes.json();

    const profileEmail = profile?.email as string | undefined;
    const email = profileEmail?.trim().toLowerCase();
    if (!email) {
      return NextResponse.redirect(new URL("/login?error=no_email", appBaseUrl));
    }

    const name = (profile?.name as string | undefined) || email.split("@")[0];
    const avatarUrl = profile?.picture as string | undefined;

    // 3) Check if user already exists
    let user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      orderBy: { id: "asc" },
    });

    // 4) If not exists -> create tenant + user only on explicit signup intent
    if (!user) {
      if (intent !== "signup") {
        return NextResponse.redirect(new URL("/login?error=google_no_account", appBaseUrl));
      }

      const tenant = await prisma.tenant.create({
        data: {
          name: `${name}'s Workspace`,
          timezone: "Asia/Kolkata",
        },
      });

      const randomPassword = crypto.randomUUID();
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      user = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          name,
          email,
          profileImage: avatarUrl,
          role: "owner",
          password: hashedPassword,
          onboardingCompleted: false,
        },
      });
    } else if (!user.profileImage && avatarUrl) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { profileImage: avatarUrl },
      });
    }

    // Ensure default tenant settings exist
    await prisma.tenantSettings.upsert({
      where: { tenantId: user.tenantId },
      update: {},
      create: { tenantId: user.tenantId },
    });

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        tenantId: user.tenantId,
      },
      jwtSecret,
      { expiresIn: "7d" }
    );

    const response = NextResponse.redirect(new URL("/dashboard", appBaseUrl));

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (err) {
    console.error("Google callback error:", err);
    return NextResponse.redirect(new URL("/login?error=google_callback", appBaseUrl));
  }
}
