import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect("/login");
  }

  // 1) Code -> Tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });

  const tokenJson = await tokenRes.json();
  if (!tokenRes.ok) {
    console.error("Google token error:", tokenJson);
    return NextResponse.redirect("/login?error=google_token");
  }

  // 2) Token -> User profile
  const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });

  const profile = await profileRes.json();
  const email = profile.email as string;
  const name = (profile.name as string) || email.split("@")[0];
  const avatarUrl = profile.picture as string | undefined;

  if (!email) {
    return NextResponse.redirect("/login?error=no_email");
  }

  // 3) Check if user already exists
  let user = await prisma.user.findUnique({
    where: { email },
    include: { tenant: true },
  });

  // 4) If not exists -> create tenant + user
  if (!user) {
    // 4a) Create tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: `${name}'s Workspace`,
        // country, timezone can be null or you can infer later
      },
    });

    // 4b) Fake random password (we never use it for google login)
    const randomPassword = crypto.randomUUID();
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    // 4c) Create user
    user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        name,
        email,
        profileImage: avatarUrl,
        role: "owner",       // ya "admin" / "user" jaisa tumhara system hai
        password: hashedPassword,
      },
      include: { tenant: true },
    });

    // (optional) TenantSettings default row
    await prisma.tenantSettings.create({
      data: {
        tenantId: tenant.id,
        // baaki fields default se aa jayenge
      },
    });
  }

  // 5) Create session (use your existing session logic)
  // Example placeholder:
  // const response = NextResponse.redirect("/dashboard");
  // await createSessionCookie(response, { userId: user.id, tenantId: user.tenantId });

  const response = NextResponse.redirect("/dashboard");
  // TODO: yaha apna real session cookie helper call karo
  response.cookies.set("session_user_id", String(user.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return response;
}
