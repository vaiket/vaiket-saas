import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

function getUser(req: Request) {
  const cookie = req.headers.get("cookie") ?? "";
  const token = cookie.match(/token=([^;]+)/)?.[1];
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" });

  const { name, password, profileImage } = await req.json();

  const update: any = {};
  if (name) update.name = name;
  if (profileImage) update.profileImage = profileImage;
  if (password) update.password = await bcrypt.hash(password, 10);

  await prisma.user.update({
    where: { id: user.userId },
    data: update,
  });

  return NextResponse.json({ success: true });
}
