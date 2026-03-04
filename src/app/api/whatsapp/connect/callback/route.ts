import { NextResponse } from "next/server";
import { cookies } from "next/headers";

type OAuthStatePayload = {
  nonce: string;
  tenantId: number;
  userId: number;
  expiresAt: number;
};

type GraphResponse = {
  ok: boolean;
  status: number;
  data: Record<string, unknown> | null;
  error: string | null;
};

type BusinessRow = {
  id: string;
  name: string;
};

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

function getGraphVersion() {
  return readText(process.env.WHATSAPP_GRAPH_API_VERSION) || "v25.0";
}

function decodeState(raw: string): OAuthStatePayload | null {
  try {
    const decoded = Buffer.from(raw, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as OAuthStatePayload;
    if (!parsed?.nonce || !parsed?.tenantId || !parsed?.userId || !parsed?.expiresAt) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function encodeContext(payload: ConnectContextPayload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function getAppBaseUrl(req: Request) {
  const envBase = readText(process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL);
  if (envBase) return envBase.replace(/\/+$/g, "");

  const requestUrl = new URL(req.url);
  const forwardedProto = readText(req.headers.get("x-forwarded-proto"));
  const forwardedHost = readText(req.headers.get("x-forwarded-host"));
  const host = forwardedHost || readText(req.headers.get("host")) || requestUrl.host;
  const proto = forwardedProto || requestUrl.protocol.replace(":", "");
  const normalizedHost = host.startsWith("0.0.0.0:") ? host.replace("0.0.0.0", "localhost") : host;
  return `${proto}://${normalizedHost}`;
}

async function graphGet(
  accessToken: string,
  path: string,
  params?: Record<string, string>
): Promise<GraphResponse> {
  const endpoint = new URL(`https://graph.facebook.com/${getGraphVersion()}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      endpoint.searchParams.set(key, value);
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(endpoint.toString(), {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: controller.signal,
    });

    let payload: Record<string, unknown> | null = null;
    try {
      payload = (await res.json()) as Record<string, unknown>;
    } catch {
      payload = null;
    }

    if (!res.ok) {
      const payloadError =
        payload && typeof payload.error === "object"
          ? (payload.error as Record<string, unknown>)
          : null;

      return {
        ok: false,
        status: res.status,
        data: payload,
        error:
          readText(payloadError?.message) ||
          readText(payload?.message) ||
          `Graph API error (${res.status})`,
      };
    }

    return {
      ok: true,
      status: res.status,
      data: payload,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      error:
        error instanceof Error
          ? error.name === "AbortError"
            ? "Graph API request timeout"
            : error.message
          : "Graph API request failed",
    };
  } finally {
    clearTimeout(timeout);
  }
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function normalizePhone(value: string) {
  const cleaned = value.replace(/[^\d+]/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("+")) return cleaned;
  return `+${cleaned}`;
}

function parseCandidates(
  source: "owned" | "client",
  business: BusinessRow,
  payload: Record<string, unknown> | null
) {
  const rows = asArray<Record<string, unknown>>(payload?.data);
  const candidates: ConnectCandidate[] = [];

  for (const row of rows) {
    const wabaId = readText(row.id);
    if (!wabaId) continue;
    const wabaName = readText(row.name) || "WhatsApp Account";

    const phoneContainer = row.phone_numbers as Record<string, unknown> | undefined;
    const phones = asArray<Record<string, unknown>>(phoneContainer?.data);
    for (const phone of phones) {
      const phoneNumberId = readText(phone.id);
      const phoneNumber = normalizePhone(readText(phone.display_phone_number));
      if (!phoneNumberId || !phoneNumber) continue;

      const key = `${business.id}:${wabaId}:${phoneNumberId}`;
      candidates.push({
        key,
        source,
        businessId: business.id,
        businessName: business.name,
        wabaId,
        wabaName,
        phoneNumberId,
        phoneNumber,
        verifiedName: readText(phone.verified_name) || null,
        qualityRating: readText(phone.quality_rating) || null,
        verificationStatus: readText(phone.code_verification_status) || null,
        nameStatus: readText(phone.name_status) || null,
      });
    }
  }

  return candidates;
}

function dedupeCandidates(candidates: ConnectCandidate[]) {
  const dedupe = new Map<string, ConnectCandidate>();
  for (const item of candidates) {
    if (dedupe.has(item.phoneNumberId)) continue;
    dedupe.set(item.phoneNumberId, item);
  }
  return Array.from(dedupe.values());
}

function trimContextToCookieLimit(payload: ConnectContextPayload) {
  const mutable: ConnectContextPayload = {
    ...payload,
    candidates: [...payload.candidates],
  };

  let encoded = encodeContext(mutable);
  while (encoded.length > 3600 && mutable.candidates.length > 1) {
    mutable.candidates.pop();
    encoded = encodeContext(mutable);
  }

  return {
    payload: mutable,
    encoded,
  };
}

function redirectToAccounts(req: Request, params: Record<string, string>) {
  const url = new URL("/dashboard/whatsapp/accounts", getAppBaseUrl(req));
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  return url;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const error = readText(url.searchParams.get("error"));
  const code = readText(url.searchParams.get("code"));
  const state = readText(url.searchParams.get("state"));

  const cookieStore = await cookies();
  const stateCookie = readText(cookieStore.get("wa_connect_state")?.value);

  const clearStateAndRedirect = (target: URL) => {
    const response = NextResponse.redirect(target);
    response.cookies.set("wa_connect_state", "", {
      httpOnly: true,
      sameSite: "lax",
      secure: target.protocol === "https:",
      path: "/",
      maxAge: 0,
    });
    return response;
  };

  if (error) {
    return clearStateAndRedirect(
      redirectToAccounts(req, {
        connect: "error",
        reason: error,
      })
    );
  }

  if (!code || !state || !stateCookie) {
    return clearStateAndRedirect(
      redirectToAccounts(req, {
        connect: "error",
        reason: "missing_state_or_code",
      })
    );
  }

  if (state !== stateCookie) {
    return clearStateAndRedirect(
      redirectToAccounts(req, {
        connect: "error",
        reason: "state_mismatch",
      })
    );
  }

  const statePayload = decodeState(state);
  if (!statePayload || statePayload.expiresAt <= Date.now()) {
    return clearStateAndRedirect(
      redirectToAccounts(req, {
        connect: "error",
        reason: "state_expired",
      })
    );
  }

  const appId = readText(process.env.META_APP_ID);
  const appSecret = readText(process.env.META_APP_SECRET);
  if (!appId || !appSecret) {
    return clearStateAndRedirect(
      redirectToAccounts(req, {
        connect: "error",
        reason: "meta_config_missing",
      })
    );
  }

  const appBaseUrl = getAppBaseUrl(req);
  const redirectUri =
    readText(process.env.META_REDIRECT_URI) || `${appBaseUrl}/api/whatsapp/connect/callback`;

  const tokenExchangeUrl = new URL(`https://graph.facebook.com/${getGraphVersion()}/oauth/access_token`);
  tokenExchangeUrl.searchParams.set("client_id", appId);
  tokenExchangeUrl.searchParams.set("client_secret", appSecret);
  tokenExchangeUrl.searchParams.set("redirect_uri", redirectUri);
  tokenExchangeUrl.searchParams.set("code", code);

  let tokenPayload: Record<string, unknown> | null = null;
  try {
    const tokenRes = await fetch(tokenExchangeUrl.toString(), {
      method: "GET",
      cache: "no-store",
    });

    try {
      tokenPayload = (await tokenRes.json()) as Record<string, unknown>;
    } catch {
      tokenPayload = null;
    }

    if (!tokenRes.ok) {
      const tokenError =
        tokenPayload && typeof tokenPayload.error === "object"
          ? (tokenPayload.error as Record<string, unknown>)
          : null;
      const reason = readText(tokenError?.message) || "token_exchange_failed";
      return clearStateAndRedirect(
        redirectToAccounts(req, {
          connect: "error",
          reason,
        })
      );
    }
  } catch {
    return clearStateAndRedirect(
      redirectToAccounts(req, {
        connect: "error",
        reason: "token_exchange_failed",
      })
    );
  }

  const accessToken = readText(tokenPayload?.access_token);
  if (!accessToken) {
    return clearStateAndRedirect(
      redirectToAccounts(req, {
        connect: "error",
        reason: "empty_access_token",
      })
    );
  }

  const meRes = await graphGet(accessToken, "/me", { fields: "id,name" });
  const meData = (meRes.data || {}) as Record<string, unknown>;

  const candidatesBucket: ConnectCandidate[] = [];
  const wabaFields =
    "id,name,phone_numbers{id,display_phone_number,verified_name,quality_rating,code_verification_status,name_status}";

  // Prefer user-level WhatsApp account edges. These generally work with only
  // `whatsapp_business_management` / `whatsapp_business_messaging`.
  const fallbackBusiness: BusinessRow = {
    id: readText(meData.id) || "me",
    name: readText(meData.name) || "Meta Account",
  };

  const ownedFallback = await graphGet(accessToken, "/me/owned_whatsapp_business_accounts", {
    fields: wabaFields,
    limit: "25",
  });
  if (ownedFallback.ok) {
    candidatesBucket.push(...parseCandidates("owned", fallbackBusiness, ownedFallback.data));
  }

  const clientFallback = await graphGet(accessToken, "/me/client_whatsapp_business_accounts", {
    fields: wabaFields,
    limit: "25",
  });
  if (clientFallback.ok) {
    candidatesBucket.push(...parseCandidates("client", fallbackBusiness, clientFallback.data));
  }

  // Only if nothing is found, try business portfolio edges (may require `business_management`).
  let businessesRes: GraphResponse | null = null;
  if (candidatesBucket.length === 0) {
    businessesRes = await graphGet(accessToken, "/me/businesses", {
      fields: "id,name",
      limit: "12",
    });

    if (businessesRes.ok) {
      const businesses = asArray<Record<string, unknown>>(businessesRes.data?.data)
        .map((item) => ({
          id: readText(item.id),
          name: readText(item.name) || "Business",
        }))
        .filter((item) => item.id);

      for (const business of businesses) {
        const owned = await graphGet(accessToken, `/${business.id}/owned_whatsapp_business_accounts`, {
          fields: wabaFields,
          limit: "25",
        });
        if (owned.ok) {
          candidatesBucket.push(...parseCandidates("owned", business, owned.data));
        }

        const client = await graphGet(accessToken, `/${business.id}/client_whatsapp_business_accounts`, {
          fields: wabaFields,
          limit: "25",
        });
        if (client.ok) {
          candidatesBucket.push(...parseCandidates("client", business, client.data));
        }
      }
    }
  }

  const candidates = dedupeCandidates(candidatesBucket);
  if (candidates.length === 0) {
    const errorReason =
      ownedFallback.error || clientFallback.error || businessesRes?.error || "no_whatsapp_accounts_found";
    return clearStateAndRedirect(
      redirectToAccounts(req, {
        connect: "error",
        reason: errorReason,
      })
    );
  }

  const now = Date.now();
  const contextPayload: ConnectContextPayload = {
    tenantId: statePayload.tenantId,
    userId: statePayload.userId,
    connectedAt: now,
    expiresAt: now + 30 * 60 * 1000,
    metaUserId: readText(meData.id) || null,
    metaUserName: readText(meData.name) || null,
    accessToken,
    candidates,
  };

  const trimmed = trimContextToCookieLimit(contextPayload);

  const target = redirectToAccounts(req, {
    connect: "success",
    count: String(trimmed.payload.candidates.length),
  });
  const response = clearStateAndRedirect(target);
  response.cookies.set("wa_connect_ctx", trimmed.encoded, {
    httpOnly: true,
    sameSite: "lax",
    secure: target.protocol === "https:",
    path: "/",
    maxAge: 30 * 60,
  });

  return response;
}
