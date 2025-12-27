import { NextResponse } from "next/server";
import dns from "dns/promises";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

function normalizeTxt(records: string[][]) {
  return records.map(r => r.join(""));
}

async function getTxt(name: string) {
  try {
    return normalizeTxt(await dns.resolveTxt(name));
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const domain = searchParams.get("domain");
  if (!domain) {
    return NextResponse.json({ error: "domain required" }, { status: 400 });
  }

  /* 🔹 Find mailbox */
  const mailbox = await prisma.tenantMailbox.findFirst({
    where: { tenantId: user.tenantId, domain },
  });
  if (!mailbox) {
    return NextResponse.json({ error: "Mailbox not found" }, { status: 404 });
  }

  /* 🔹 Fetch DNS row */
  const dnsRow = await prisma.mailboxDNS.findFirst({
    where: { mailboxId: mailbox.id },
  });
  if (!dnsRow) {
    return NextResponse.json({ error: "DNS not initialized" }, { status: 404 });
  }

  /* ================= SPF ================= */
  const spfRecords = await getTxt(domain);
  const spfOk = spfRecords.some(r => r.includes("v=spf1"));

  /* ================= DKIM ================= */
  const dkimHost = dnsRow.dkimHost + "." + domain;
  const dkimRecords = await getTxt(dkimHost);
  const dkimOk = dkimRecords.some(r => r.includes("v=DKIM1"));

  /* ================= DMARC ================= */
  const dmarcHost = `_dmarc.${domain}`;
  const dmarcRecords = await getTxt(dmarcHost);
  const dmarcOk = dmarcRecords.some(r => r.startsWith("v=DMARC1"));

  /* 🔁 Update DB */
  await prisma.mailboxDNS.update({
    where: { id: dnsRow.id },
    data: {
      spfStatus: spfOk ? "success" : "pending",
      dkimStatus: dkimOk ? "success" : "pending",
      dmarcStatus: dmarcOk ? "success" : "pending",
    },
  });

  return NextResponse.json({
    spf: { ok: spfOk },
    dkim: { ok: dkimOk },
    dmarc: { ok: dmarcOk },
  });
}
