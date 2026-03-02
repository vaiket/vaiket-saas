import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { tenantId } = await req.json();

  const mailbox = await prisma.tenantMailbox.findFirst({
    where: { tenantId },
  });

  if (!mailbox)
    return NextResponse.json({ error: "No mailbox" });

  await prisma.smtpCredentials.upsert({
    where: { tenantId },
    update: {
      host: mailbox.smtpHost,
      port: mailbox.smtpPort,
      username: mailbox.email,
    },
    create: {
      tenantId,
      host: mailbox.smtpHost,
      port: mailbox.smtpPort,
      username: mailbox.email,
    },
  });

  return NextResponse.json({ success: true });
}
