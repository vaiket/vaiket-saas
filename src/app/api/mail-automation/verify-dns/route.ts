import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import dns from "dns/promises";
import { getTokenData } from "@/lib/auth1";

export async function POST(req: Request) {
  try {
    /* 1️⃣ AUTH */
    const token = getTokenData(req);
    if (!token?.userId) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: token.userId },
      select: { tenantId: true },
    });

    if (!user?.tenantId) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    /* 2️⃣ MAILBOX + DNS FROM DB */
    const mailbox = await prisma.tenantMailbox.findFirst({
      where: { tenantId: user.tenantId },
    });

    if (!mailbox) {
      return NextResponse.json(
        { success: false, message: "Mailbox not found" },
        { status: 404 }
      );
    }

    const dnsRow = await prisma.mailboxDNS.findFirst({
      where: { mailboxId: mailbox.id },
    });

    if (!dnsRow) {
      return NextResponse.json(
        { success: false, message: "DNS records not found" },
        { status: 404 }
      );
    }

    /* 3️⃣ VERIFY DNS (SAFE MODE) */
    const results = {
      spf: "pending",
      dkim: "pending",
      dmarc: "pending",
    };

    // SPF
    try {
      const spfTxt = await dns.resolveTxt(mailbox.domain);
      const flat = spfTxt.flat().join(" ");
      if (flat.includes(dnsRow.spfValue)) {
        results.spf = "verified";
      }
    } catch {
      /* ignore – still pending */
    }

    // DKIM
    try {
      const dkimHost = `${dnsRow.dkimHost}.${mailbox.domain}`;
      const dkimTxt = await dns.resolveTxt(dkimHost);
      const flat = dkimTxt.flat().join("");
      if (flat.includes("v=DKIM1")) {
        results.dkim = "verified";
      }
    } catch {
      /* ignore – very common before propagation */
    }

    // DMARC
    try {
      const dmarcHost = `${dnsRow.dmarcHost}.${mailbox.domain}`;
      const dmarcTxt = await dns.resolveTxt(dmarcHost);
      const flat = dmarcTxt.flat().join(" ");
      if (flat.includes("v=DMARC1")) {
        results.dmarc = "verified";
      }
    } catch {
      /* ignore */
    }

    /* 4️⃣ UPDATE DB (NO FAIL EVER) */
    await prisma.mailboxDNS.update({
      where: { id: dnsRow.id },
      data: {
        spfStatus: results.spf,
        dkimStatus: results.dkim,
        dmarcStatus: results.dmarc,
      },
    });

    /* 5️⃣ RESPONSE */
    return NextResponse.json({
      success: true,
      results,
    });
  } catch (err) {
    console.error("VERIFY DNS ERROR:", err);
    return NextResponse.json(
      { success: false, message: "DNS check failed gracefully" },
      { status: 200 } // 👈 IMPORTANT
    );
  }
}
