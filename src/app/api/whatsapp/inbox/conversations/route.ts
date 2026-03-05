import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthContext, hasRoleAtLeast } from "@/lib/auth/session";
import { ensureWhatsAppSubscriptionAccess } from "@/lib/subscriptions/whatsapp-gate";

const ALLOWED_STATUSES = new Set(["active", "closed"]);

export async function GET(req: Request) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!hasRoleAtLeast(auth.role, "member")) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const subscriptionBlocked = await ensureWhatsAppSubscriptionAccess(auth);
    if (subscriptionBlocked) return subscriptionBlocked;

    const url = new URL(req.url);
    const statusParam = (url.searchParams.get("status") || "").trim().toLowerCase();
    const status = statusParam && ALLOWED_STATUSES.has(statusParam) ? statusParam : "";
    const accountId = (url.searchParams.get("accountId") || "").trim();

    const conversations = await prisma.waConversation.findMany({
      where: {
        tenantId: auth.tenantId,
        ...(status ? { status } : {}),
        ...(accountId ? { accountId } : {}),
      },
      orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
      take: 120,
      select: {
        id: true,
        status: true,
        assignedUserId: true,
        lastMessageAt: true,
        createdAt: true,
        updatedAt: true,
        account: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
          },
        },
        contact: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            address: true,
            source: true,
            tags: true,
            optedIn: true,
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            direction: true,
            messageType: true,
            text: true,
            mediaUrl: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, conversations });
  } catch (error) {
    console.error("GET /api/whatsapp/inbox/conversations failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to load conversations",
      },
      { status: 500 }
    );
  }
}
