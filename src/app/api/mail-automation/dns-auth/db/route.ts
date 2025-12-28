import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/*
 PURPOSE:
 - Get tenantId from /api/auth/me logic
 - Load SPF / DKIM / DMARC from mailbox_dns table
*/

export async function GET(req: Request) {
  try {
    /* 1️⃣ GET AUTH USER */
    const authRes = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/me`,
      { cache: "no-store", headers: req.headers }
    );

    if (!authRes.ok) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await authRes.json();
    const tenantId = user?.tenantId;

    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 400 }
      );
    }

    /* 2️⃣ GET DNS RECORDS FOR TENANT */
    const dnsRecords = await prisma.mailboxDNS.findMany({
      where: { tenantId },
      orderBy: { id: "asc" },
    });

    return NextResponse.json({
      success: true,
      dns: dnsRecords,
    });
  } catch (err) {
    console.error("DNS DB LOAD ERROR:", err);
    return NextResponse.json(
      { error: "Failed to load DNS records" },
      { status: 500 }
    );
  }
}
