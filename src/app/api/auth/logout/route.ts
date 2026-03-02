import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const token = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/)?.[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { jti?: string };
      if (decoded?.jti) {
        await prisma.userSession.updateMany({
          where: { jti: decoded.jti, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
    } catch {
      // no-op, cookie will still be cleared
    }
  }

  const res = NextResponse.json({ success: true, message: "Logged out" });

  res.cookies.set("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0, // delete cookie
  });

  return res;
}
