import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // 🔐 get user from session (reuse auth)
    const user = await prisma.user.findFirst({
      where: { onboardingCompleted: true },
      include: {
        tenant: {
          include: {
            onboarding: true,
          },
        },
      },
    });

    if (!user?.tenant?.onboarding?.[0]?.website) {
      return NextResponse.json(
        { success: false, message: "Domain not found" },
        { status: 400 }
      );
    }

    const domain = user.tenant.onboarding[0].website
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/.*$/, "")
      .toLowerCase();

    const mailHost = `mail.${domain}`;

    const records = [
      {
        type: "MX",
        host: "@",
        value: mailHost,
        priority: 10,
      },
      {
        type: "TXT",
        host: "@",
        value: `v=spf1 mx a ip4:51.91.157.95 ~all`,
      },
      {
        type: "TXT",
        host: "_dmarc",
        value: `v=DMARC1; p=none; rua=mailto:dmarc@${domain}; ruf=mailto:dmarc@${domain}; fo=1`,
      },
      {
        type: "TXT",
        host: "mail._domainkey",
        value: "DKIM will be generated automatically",
      },
    ];

    return NextResponse.json({
      success: true,
      domain,
      records,
    });
  } catch (err) {
    console.error("DNS API ERROR:", err);
    return NextResponse.json(
      { success: false, message: "Failed to load DNS records" },
      { status: 500 }
    );
  }
}
