import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

export function getTokenData(req: any) {
  try {
    const cookie = req.headers.get("cookie") || "";
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
