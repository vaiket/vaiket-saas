import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenData } from "@/lib/auth1";

export async function POST(req: Request) {
  try {
    /* 1️⃣ AUTH (NO INTERNAL FETCH) */
    const token = getTokenData(req);

    if (!token?.userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: token.userId },
      select: { tenantId: true },
    });

    if (!user?.tenantId) {
      return NextResponse.json(
        { success: false, message: "Tenant not found" },
        { status: 400 }
      );
    }

    const tenantId = user.tenantId;

    /* 2️⃣ MAILBOX */
    const mailbox = await prisma.tenantMailbox.findFirst({
      where: { tenantId },
    });

    if (!mailbox) {
      return NextResponse.json(
        { success: false, message: "Mailbox not found" },
        { status: 404 }
      );
    }

    /* 3️⃣ FETCH DKIM FROM MAILCOW */
    const res = await fetch(
      `${process.env.MAILCOW_BASE_URL}/get/dkim/${mailbox.domain}`,
      {
        headers: {
          "X-API-Key": process.env.MAILCOW_API_KEY!,
        },
      }
    );

    const data = await res.json();

    if (!data?.dkim_txt) {
      return NextResponse.json(
        { success: false, message: "DKIM not generated yet" },
        { status: 400 }
      );
    }

    /* 4️⃣ UPSERT DNS (SAFE) */
    await prisma.mailboxDNS.upsert({
      where: {
        mailboxId: mailbox.id, // UNIQUE INDEX exists ✅
      },
      update: {
        dkimHost: "default._domainkey",
        dkimValue: data.dkim_txt,
        dkimStatus: "verified",
      },
      create: {
        tenantId,
        mailboxId: mailbox.id,
        domain: mailbox.domain,

        spfHost: "@",
        spfValue: "",
        spfStatus: "pending",

        dkimHost: "default._domainkey",
        dkimValue: data.dkim_txt,
        dkimStatus: "verified",

        dmarcHost: "_dmarc",
        dmarcValue: "",
        dmarcStatus: "pending",
      },
    });

    return NextResponse.json({
      success: true,
      message: "DKIM fetched & saved successfully",
    });
  } catch (err) {
    console.error("FETCH DKIM ERROR:", err);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
