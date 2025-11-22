import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

function getUser(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/token=([^;]+)/);
  if (!match) return null;
  try {
    return jwt.verify(match[1], process.env.JWT_SECRET!);
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" });

  const settings = await prisma.tenantSettings.findUnique({
    where: { tenantId: user.tenantId.toString() },
  });

  return NextResponse.json({ success: true, data: settings });
}

export async function POST(req: Request) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" });

  const body = await req.json();

  await prisma.tenantSettings.upsert({
    where: { tenantId: user.tenantId.toString() },
    update: { ...body },
    create: { tenantId: user.tenantId.toString(), ...body },
  });

  return NextResponse.json({ success: true });
}
