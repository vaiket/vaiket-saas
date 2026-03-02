import { NextResponse } from "next/server";

import type { AuthContext } from "@/lib/auth/session";
import { hasActiveProductSubscription } from "@/lib/subscriptions/access";

export async function ensureWhatsAppSubscriptionAccess(auth: AuthContext) {
  const isActive = await hasActiveProductSubscription(auth.userId, auth.tenantId, "whatsapp");
  if (isActive) return null;

  return NextResponse.json(
    {
      success: false,
      error: "WhatsApp subscription required",
      code: "whatsapp_subscription_required",
    },
    { status: 402 }
  );
}
