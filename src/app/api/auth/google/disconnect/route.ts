// src/app/api/auth/google/disconnect/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

function getUserIdFromReq(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) return null;
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
    return payload.userId ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const userId = getUserIdFromReq(req);
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // find Gmail mail account(s) linked to this tenant/user (if you store tenantId)
  // We'll remove oauth fields by finding all mail accounts with provider 'gmail' and tenantId matching user (optional)
  await prisma.mailAccount.updateMany({
    where: { provider: "gmail" },
    data: {
      oauthAccessToken: null,
      oauthRefreshToken: null,
      oauthExpiresAt: null,
      provider: "custom", // or keep 'gmail' but we remove tokens
    },
  });

  return NextResponse.json({ success: true });
}
