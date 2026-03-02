// src/app/api/settings/ai/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

interface TokenPayload {
  tenantId: number | string;
  [key: string]: any;
}

async function getUser(): Promise<TokenPayload | null> {
  const cookieStore = await cookies(); // ✅ FIX — await required
  const token = cookieStore.get("token")?.value;
  if (!token) return null;

  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
  } catch {
    return null;
  }
}

export async function GET() {
  const user = await getUser(); // ✅ FIX — await
  if (!user)
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );

  const tenantId = Number(user.tenantId); // ✅ ensure number

  const settings = await prisma.tenantSettings.findUnique({
    where: { tenantId },
  });

  return NextResponse.json({ success: true, data: settings });
}

export async function POST(req: Request) {
  const user = await getUser(); // ✅ FIX — await
  if (!user)
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );

  const tenantId = Number(user.tenantId); // ✅ ensure number
  const body = await req.json();

  await prisma.tenantSettings.upsert({
    where: { tenantId },
    update: { ...body },
    create: { tenantId, ...body },
  });

  return NextResponse.json({ success: true });
}
