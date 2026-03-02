// FILE: src/app/api/mail-automation/check-dns/route.ts
// PURPOSE: Step-2 DNS verification (SPF / DKIM / DMARC)

import { NextResponse } from "next/server";
import dns from "dns/promises";

function normalizeTxt(records: string[][]): string[] {
  return records.map(r => r.join(""));
}

async function getTxtRecord(name: string): Promise<string[]> {
  try {
    const records = await dns.resolveTxt(name);
    return normalizeTxt(records);
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get("domain");

  if (!domain) {
    return NextResponse.json({ error: "Domain is required" }, { status: 400 });
  }

  // ---------- SPF ----------
  const spfRecords = await getTxtRecord(domain);
  const spfValue = spfRecords.find(r => r.startsWith("v=spf1"));

  const spf = spfValue
    ? { status: "success", current: spfValue }
    : {
        status: "fail",
        expected: "v=spf1 include:_spf.mail.vaiket.com ~all",
        host: "@",
        type: "TXT",
      };

  // ---------- DKIM ----------
  const dkimSelector = "mail"; // mailcow default selector
  const dkimHost = `${dkimSelector}._domainkey.${domain}`;
  const dkimRecords = await getTxtRecord(dkimHost);
  const dkimValue = dkimRecords.find(r => r.includes("v=DKIM1"));

  const dkim = dkimValue
    ? { status: "success", current: dkimValue }
    : {
        status: "fail",
        expected: "v=DKIM1; k=rsa; p=MIIBIjANBgkq...",
        host: `${dkimSelector}._domainkey`,
        type: "TXT",
      };

  // ---------- DMARC ----------
  const dmarcHost = `_dmarc.${domain}`;
  const dmarcRecords = await getTxtRecord(dmarcHost);
  const dmarcValue = dmarcRecords.find(r => r.startsWith("v=DMARC1"));

  const dmarc = dmarcValue
    ? { status: "success", current: dmarcValue }
    : {
        status: "warning",
        expected: "v=DMARC1; p=none; rua=mailto:dmarc@" + domain,
        host: "_dmarc",
        type: "TXT",
      };

  return NextResponse.json({ spf, dkim, dmarc });
}
