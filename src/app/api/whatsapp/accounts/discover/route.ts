import { NextResponse } from "next/server";

import { getAuthContext, hasRoleAtLeast } from "@/lib/auth/session";
import { ensureWhatsAppSubscriptionAccess } from "@/lib/subscriptions/whatsapp-gate";

type DiscoverBody = {
  accessToken?: unknown;
  businessId?: unknown;
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

type Candidate = {
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

function readText(value: unknown) {
  return String(value ?? "").trim();
}

function graphVersion() {
  return readText(process.env.WHATSAPP_GRAPH_API_VERSION) || "v22.0";
}

function isValidMetaId(value: string) {
  return /^\d{8,32}$/.test(value);
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

async function graphGet(
  accessToken: string,
  path: string,
  params?: Record<string, string>
): Promise<GraphResponse> {
  const endpoint = new URL(`https://graph.facebook.com/${graphVersion()}${path}`);
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
            ? "Meta request timeout"
            : error.message
          : "Meta request failed",
    };
  } finally {
    clearTimeout(timeout);
  }
}

function parseCandidates(
  source: "owned" | "client",
  business: BusinessRow,
  payload: Record<string, unknown> | null
) {
  const rows = asArray<Record<string, unknown>>(payload?.data);
  const candidates: Candidate[] = [];

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

      candidates.push({
        key: `${business.id}:${wabaId}:${phoneNumberId}`,
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

function dedupeCandidates(candidates: Candidate[]) {
  const map = new Map<string, Candidate>();
  for (const item of candidates) {
    if (map.has(item.phoneNumberId)) continue;
    map.set(item.phoneNumberId, item);
  }
  return Array.from(map.values());
}

export async function POST(req: Request) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!hasRoleAtLeast(auth.role, "admin")) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const subscriptionBlocked = await ensureWhatsAppSubscriptionAccess(auth);
    if (subscriptionBlocked) return subscriptionBlocked;

    let body: DiscoverBody;
    try {
      body = (await req.json()) as DiscoverBody;
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const accessToken = readText(body.accessToken);
    const businessId = readText(body.businessId);

    if (!accessToken || accessToken.length < 30) {
      return NextResponse.json(
        { success: false, error: "Valid access token is required" },
        { status: 400 }
      );
    }

    if (businessId && !isValidMetaId(businessId)) {
      return NextResponse.json(
        { success: false, error: "Invalid businessId format" },
        { status: 400 }
      );
    }

    const wabaFields =
      "id,name,phone_numbers{id,display_phone_number,verified_name,quality_rating,code_verification_status,name_status}";

    const candidatesBucket: Candidate[] = [];
    const warnings: string[] = [];

    const meRes = await graphGet(accessToken, "/me", { fields: "id,name" });
    const meData = (meRes.data || {}) as Record<string, unknown>;
    const fallbackBusiness: BusinessRow = {
      id: businessId || readText(meData.id) || "manual",
      name: readText(meData.name) || "Meta Account",
    };

    if (businessId) {
      const ownedFromBusiness = await graphGet(
        accessToken,
        `/${businessId}/owned_whatsapp_business_accounts`,
        { fields: wabaFields, limit: "30" }
      );
      if (ownedFromBusiness.ok) {
        candidatesBucket.push(...parseCandidates("owned", { id: businessId, name: "Business" }, ownedFromBusiness.data));
      } else if (ownedFromBusiness.error) {
        warnings.push(`Business owned edge: ${ownedFromBusiness.error}`);
      }

      const clientFromBusiness = await graphGet(
        accessToken,
        `/${businessId}/client_whatsapp_business_accounts`,
        { fields: wabaFields, limit: "30" }
      );
      if (clientFromBusiness.ok) {
        candidatesBucket.push(...parseCandidates("client", { id: businessId, name: "Business" }, clientFromBusiness.data));
      } else if (clientFromBusiness.error) {
        warnings.push(`Business client edge: ${clientFromBusiness.error}`);
      }
    }

    const meOwned = await graphGet(accessToken, "/me/owned_whatsapp_business_accounts", {
      fields: wabaFields,
      limit: "30",
    });
    if (meOwned.ok) {
      candidatesBucket.push(...parseCandidates("owned", fallbackBusiness, meOwned.data));
    } else if (meOwned.error) {
      warnings.push(`Me owned edge: ${meOwned.error}`);
    }

    const meClient = await graphGet(accessToken, "/me/client_whatsapp_business_accounts", {
      fields: wabaFields,
      limit: "30",
    });
    if (meClient.ok) {
      candidatesBucket.push(...parseCandidates("client", fallbackBusiness, meClient.data));
    } else if (meClient.error) {
      warnings.push(`Me client edge: ${meClient.error}`);
    }

    const businessesRes = await graphGet(accessToken, "/me/businesses", {
      fields: "id,name",
      limit: "25",
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
          limit: "30",
        });
        if (owned.ok) {
          candidatesBucket.push(...parseCandidates("owned", business, owned.data));
        }

        const client = await graphGet(accessToken, `/${business.id}/client_whatsapp_business_accounts`, {
          fields: wabaFields,
          limit: "30",
        });
        if (client.ok) {
          candidatesBucket.push(...parseCandidates("client", business, client.data));
        }
      }
    } else if (businessesRes.error) {
      warnings.push(`Businesses edge: ${businessesRes.error}`);
    }

    const candidates = dedupeCandidates(candidatesBucket);
    if (candidates.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No WhatsApp phone IDs found with this token. Check token permissions and assigned assets.",
          detail: warnings[0] || null,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      candidates,
      metaUserName: readText(meData.name) || null,
      warnings,
      graphApiVersion: graphVersion(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to discover WhatsApp IDs",
      },
      { status: 500 }
    );
  }
}
