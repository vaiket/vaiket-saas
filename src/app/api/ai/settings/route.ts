import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

interface TokenPayload {
  tenantId: string | number;
  [key: string]: any;
}

function getUser(req: Request): TokenPayload | null {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/token=([^;]+)/);
  if (!match) return null;
  try {
    return jwt.verify(match[1], process.env.JWT_SECRET!) as TokenPayload;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const user = getUser(req);
  if (!user)
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );

  const settings = await prisma.tenantSettings.findUnique({
    where: { tenantId: Number(user.tenantId) }, // ✅ FIXED
  });

  return NextResponse.json({ success: true, data: settings });
}

export async function POST(req: Request) {
  const user = getUser(req);
  if (!user)
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );

  const body = await req.json();

  await prisma.tenantSettings.upsert({
    where: { tenantId: Number(user.tenantId) }, // ✅ FIXED
    update: { ...body },
    create: { tenantId: Number(user.tenantId), ...body }, // ✅ FIXED
  });

  return NextResponse.json({ success: true });
}
