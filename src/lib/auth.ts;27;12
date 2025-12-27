// src/lib/auth.ts
import jwt from "jsonwebtoken";

export function getTokenData(req: any) {
  try {
    // Next.js app route request has headers.get
    const cookie = req?.headers?.get?.("cookie") || req?.headers?.cookie || "";
    const match = cookie.match(/token=([^;]+)/);
    if (!match) return null;

    const token = match[1];
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    return {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      email: decoded.email,
    };
  } catch (e) {
    return null;
  }
}
