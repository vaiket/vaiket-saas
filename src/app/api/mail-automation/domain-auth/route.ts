// FILE: src/app/api/mail-automation/domain-auth/route.ts
// PURPOSE: DomainAuthenticationCard ke liye DNS verification

import { NextResponse } from "next/server";
import dns from "dns/promises";

/* ------------------ helpers ------------------ */

function normalizeTxt(records: string[][]): string[] {
  return records.map(r => r.join(""));
}

async function getTxt(name: string): Promise<string[]> {
  try {
    const records = await dns.resolveTxt(name);
    return normalizeTxt(records);
  } catch {
    return [];
  }
}

function success(host: string, value: string, note: string) {
  return {
    host,
    type: "TXT",
    value,
    status: "success",
    note,
  };
}

function pending(host: string, value: string, note: string) {
  return {
    host,
    type: "TXT",
    value,
    status: "pending",
    note,
  };
}

function fail(host: string, value: string, note: string) {
  return {
    host,
    type: "TXT",
    value,
    status: "fail",
    note,
  };
}

/* ------------------ API ------------------ */

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get("domain");

  if (!domain) {
    return NextResponse.json(
      { error: "domain is required" },
      { status: 400 }
    );
  }

  /* ================= SPF ================= */
  const spfExpected = "v=spf1 include:_spf.mail.vaiket.com ~all";
  const spfRecords = await getTxt(domain);
  const spfFound = spfRecords.find(r => r.startsWith("v=spf1"));

  const spf = spfFound
    ? success("@", spfFound, "SPF record verified successfully.")
    : pending(
        "@",
        spfExpected,
        "Add this SPF record to authorize sending servers."
      );

  /* ================= DKIM ================= */
  const dkimSelector = "mail";
  const dkimHostFull = `${dkimSelector}._domainkey.${domain}`;
  const dkimExpected =
    "v=DKIM1; k=rsa; p=MIIBIjANBgkq...";

  const dkimRecords = await getTxt(dkimHostFull);
  const dkimFound = dkimRecords.find(r => r.includes("v=DKIM1"));

  const dkim = dkimFound
    ? success(
        `${dkimSelector}._domainkey`,
        dkimFound,
        "DKIM record verified successfully."
      )
    : pending(
        `${dkimSelector}._domainkey`,
        dkimExpected,
        "Add this DKIM record to sign outgoing emails."
      );

  /* ================= DMARC ================= */
  const dmarcHostFull = `_dmarc.${domain}`;
  const dmarcExpected = `v=DMARC1; p=none; rua=mailto:dmarc@${domain}`;

  const dmarcRecords = await getTxt(dmarcHostFull);
  const dmarcFound = dmarcRecords.find(r => r.startsWith("v=DMARC1"));

  const dmarc = dmarcFound
    ? success(
        "_dmarc",
        dmarcFound,
        "DMARC policy detected."
      )
    : pending(
        "_dmarc",
        dmarcExpected,
        "DMARC is optional but recommended for better delivery."
      );

  /* ================= RESPONSE ================= */

  return NextResponse.json({
    spf,
    dkim,
    dmarc,
  });
}
