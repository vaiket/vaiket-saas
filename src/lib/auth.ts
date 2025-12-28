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

// ✅ REQUIRED FOR RENDER BUILD
export async function getAuthUser() {
  const cookieStore = cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) return null;

  const decoded: any = jwt.verify(
    token,
    process.env.JWT_SECRET!
  );

  return prisma.user.findUnique({
    where: { id: decoded.userId },
  });
}
