import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

export function getTokenData(req: any) {
  try {
    const cookie =
      req?.headers?.get?.("cookie") ||
      req?.headers?.cookie ||
      "";

    const match = cookie.match(/token=([^;]+)/);
    if (!match) return null;

    const decoded: any = jwt.verify(
      match[1],
      process.env.JWT_SECRET!
    );

    return decoded;
  } catch {
    return null;
  }
}

type JwtPayload = {
  userId?: number;
};

// ✅ Supports both API request context and server component context
export async function getAuthUser(req?: Request) {
  let token: string | null = null;

  if (req) {
    const cookieHeader = req.headers.get("cookie") ?? "";
    token = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/)?.[1] ?? null;
  } else {
    const cookieStore = await cookies();
    token = cookieStore.get("token")?.value ?? null;
  }

  if (!token) return null;

  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
  } catch {
    return null;
  }

  if (!decoded?.userId) return null;

  return prisma.user.findUnique({
    where: { id: decoded.userId },
  });
}
