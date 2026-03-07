import jwt from "jsonwebtoken";

import { ensureAuthSchema } from "@/lib/auth/schema";
import { prisma } from "@/lib/prisma";

export type Role = "owner" | "admin" | "member" | "viewer";

type TokenPayload = {
  userId?: number;
  tenantId?: number;
  email?: string;
  role?: string;
  jti?: string;
  iat?: number;
  exp?: number;
};

export type AuthContext = {
  userId: number;
  tenantId: number;
  email: string;
  role: Role;
  jti: string | null;
};

type AuthContextOptions = {
  allowSessionFallback?: boolean;
};

const roleRank: Record<Role, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

function asRole(value: string | null | undefined): Role {
  if (value === "owner") return "owner";
  if (value === "admin") return "admin";
  if (value === "member") return "member";
  return "viewer";
}

export function hasRoleAtLeast(current: string | null | undefined, minimum: Role) {
  const currentRole = asRole(current);
  return roleRank[currentRole] >= roleRank[minimum];
}

export function getClientMeta(req: Request) {
  const xff = req.headers.get("x-forwarded-for");
  const ip = xff?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
  const userAgent = req.headers.get("user-agent") || null;
  return { ip, userAgent };
}

export function getTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)token=([^;]+)/);
  return match?.[1] ?? null;
}

export async function getAuthContext(
  req: Request,
  options?: AuthContextOptions
): Promise<AuthContext | null> {
  const token = getTokenFromRequest(req);
  if (!token) return null;

  let decoded: TokenPayload;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
  } catch {
    return null;
  }

  if (!decoded?.userId || !decoded?.tenantId || !decoded?.email) return null;

  await ensureAuthSchema();

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: {
      id: true,
      tenantId: true,
      email: true,
      role: true,
      status: true,
    },
  });

  if (!user) return null;
  if (user.tenantId !== decoded.tenantId) return null;
  if (user.status !== "active") return null;

  if (decoded.jti) {
    try {
      const session = await prisma.userSession.findUnique({
        where: { jti: decoded.jti },
        select: {
          id: true,
          revokedAt: true,
          expiresAt: true,
        },
      });

      if (!session) {
        if (!options?.allowSessionFallback) return null;
      } else {
        if (session.revokedAt) return null;
        if (session.expiresAt.getTime() <= Date.now()) return null;

        await prisma.userSession.update({
          where: { jti: decoded.jti },
          data: { lastSeenAt: new Date() },
        });
      }
    } catch (error) {
      if (!options?.allowSessionFallback) {
        console.error("getAuthContext session lookup failed:", error);
        return null;
      }
      console.warn("getAuthContext falling back to JWT-only session validation");
    }
  }

  return {
    userId: user.id,
    tenantId: user.tenantId,
    email: user.email,
    role: asRole(user.role),
    jti: decoded.jti ?? null,
  };
}
