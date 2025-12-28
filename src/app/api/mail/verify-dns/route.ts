import { NextResponse } from "next/server";
import dns from "dns/promises";
import { prisma } from "@/lib/prisma";
import { getTokenData } from "@/lib/auth1";

/**
 * 🔹 Mailcow API helper (DKIM fetch)
 */
async function mailcowFetch(path: string) {
  const res = await fetch(`${process.env.MAILCOW_BASE_URL}${path}`, {
    headers: {
      "X-API-Key": process.env.MAILCOW_API_KEY!,
    },
  });

  const text = await res.text();
  let data: any;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw new Error(data?.msg || "Mailcow API error");
  }

  return data;
}

export async function POST(req: Request) {
  try {
    // 🔐 Auth
    const token = getTokenData(req);
    if (!token?.userId) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: token.userId },
      select: { tenantId: true },
    });

    if (!user?.tenantId) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    // 📬 Tenant mailbox
    const mailbox = await prisma.tenantMailbox.findFirst({
      where: { tenantId: user.tenantId },
    });

    if (!mailbox) {
      return NextResponse.json({ success: false, message: "Mailbox not found" });
    }

    const dnsRecord = await prisma.mailboxDNS.findFirst({
      where: { mailboxId: mailbox.id },
    });

    if (!dnsRecord) {
      return NextResponse.json({ success: false, message: "DNS not found" });
    }

    // 🔑 DKIM FETCH (AUTO, ONLY ONCE)
    let dkimValue = dnsRecord.dkimValue;

    if (dkimValue === "PENDING_DKIM") {
      const dkim = await mailcowFetch(`/get/dkim/${dnsRecord.domain}`);

      if (dkim?.dkim_txt) {
        dkimValue = dkim.dkim_txt;

        await prisma.mailboxDNS.update({
          where: { id: dnsRecord.id },
          data: {
            dkimValue: dkimValue,
          },
        });
      }
    }

    // 🔍 DNS LOOKUPS
    const spfTxt = await dns.resolveTxt(dnsRecord.domain);
    const spfOk = spfTxt.flat().some((t) =>
      t.includes(dnsRecord.spfValue)
    );

    const dkimHost = `${dnsRecord.dkimHost}.${dnsRecord.domain}`;
    const dkimTxt = await dns.resolveTxt(dkimHost);
    const dkimOk = dkimTxt.flat().some((t) =>
      t.includes(dkimValue)
    );

    const dmarcHost = `${dnsRecord.dmarcHost}.${dnsRecord.domain}`;
    const dmarcTxt = await dns.resolveTxt(dmarcHost);
    const dmarcOk = dmarcTxt.flat().some((t) =>
      t.includes(dnsRecord.dmarcValue)
    );

    // ✅ UPDATE STATUS (camelCase ONLY)
    await prisma.mailboxDNS.update({
      where: { id: dnsRecord.id },
      data: {
        spfStatus: spfOk ? "verified" : "pending",
        dkimStatus: dkimOk ? "verified" : "pending",
        dmarcStatus: dmarcOk ? "verified" : "pending",
      },
    });

    // 🔥 Auto activate mailbox if all verified
    if (spfOk && dkimOk && dmarcOk) {
      await prisma.tenantMailbox.update({
        where: { id: mailbox.id },
        data: { active: true },
      });
    }

    return NextResponse.json({
      success: true,
      spfOk,
      dkimOk,
      dmarcOk,
    });
  } catch (error) {
    console.error("VERIFY DNS ERROR:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
