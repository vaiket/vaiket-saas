import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getAuthContext, hasRoleAtLeast } from "@/lib/auth/session";
import { ensureWhatsAppSubscriptionAccess } from "@/lib/subscriptions/whatsapp-gate";

type ConnectCandidate = {
  key: string;
  source: "owned" | "client";
  businessId: string;
  businessName: string;
  wabaId: string;
  wabaName: string;
  phoneNumberId: string;
  phoneNumber: string;
  verifiedName: string | null;
  qualityRating: string | null;
  verificationStatus: string | null;
  nameStatus: string | null;
};

type ConnectContextPayload = {
  tenantId: number;
  userId: number;
  connectedAt: number;
  expiresAt: number;
  metaUserId: string | null;
  metaUserName: string | null;
  accessToken: string;
  candidates: ConnectCandidate[];
};

function readText(value: unknown) {
  return String(value ?? "").trim();
}

function decodeContext(raw: string): ConnectContextPayload | null {
  try {
    const decoded = Buffer.from(raw, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as ConnectContextPayload;
    if (!parsed?.tenantId || !parsed?.userId || !parsed?.expiresAt || !parsed?.connectedAt) {
      return null;
    }
    if (!Array.isArray(parsed.candidates) || parsed.candidates.length === 0) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function withClearCookie(
  payload: Record<string, unknown>,
  params?: { status?: number; secure?: boolean }
) {
  const response = NextResponse.json(payload, { status: params?.status || 200 });
  response.cookies.set("wa_connect_ctx", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: Boolean(params?.secure),
    path: "/",
    maxAge: 0,
  });
  return response;
}

export async function GET(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasRoleAtLeast(auth.role, "admin")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const subscriptionBlocked = await ensureWhatsAppSubscriptionAccess(auth);
  if (subscriptionBlocked) return subscriptionBlocked;

  const cookieStore = await cookies();
  const raw = readText(cookieStore.get("wa_connect_ctx")?.value);
  if (!raw) {
    return NextResponse.json({ success: true, available: false });
  }

  const parsed = decodeContext(raw);
  const secure = new URL(req.url).protocol === "https:";

  if (!parsed) {
    return withClearCookie(
      { success: true, available: false, cleared: true, reason: "invalid_context" },
      { secure }
    );
  }

  if (parsed.expiresAt <= Date.now()) {
    return withClearCookie(
      { success: true, available: false, cleared: true, reason: "expired_context" },
      { secure }
    );
  }

  if (parsed.tenantId !== auth.tenantId || parsed.userId !== auth.userId) {
    return withClearCookie(
      { success: true, available: false, cleared: true, reason: "context_mismatch" },
      { secure }
    );
  }

  return NextResponse.json({
    success: true,
    available: true,
    connectedAt: parsed.connectedAt,
    expiresAt: parsed.expiresAt,
    metaUserId: parsed.metaUserId,
    metaUserName: parsed.metaUserName,
    hasFetchedAccessToken: Boolean(parsed.accessToken),
    candidates: parsed.candidates,
  });
}

export async function DELETE(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasRoleAtLeast(auth.role, "admin")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const subscriptionBlocked = await ensureWhatsAppSubscriptionAccess(auth);
  if (subscriptionBlocked) return subscriptionBlocked;

  const secure = new URL(req.url).protocol === "https:";
  return withClearCookie({ success: true, cleared: true }, { secure });
}
