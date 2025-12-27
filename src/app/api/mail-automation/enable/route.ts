// FILE: src/app/api/mail-automation/enable/route.ts
// PURPOSE: Step-3 Final approval – mark mailbox as APPROVED for automation

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// 🔐 simple AES encryption helper (can be replaced later)
function encrypt(text: string) {
  const secret = process.env.MAILBOX_SECRET_KEY;
  if (!secret) throw new Error("MAILBOX_SECRET_KEY missing");

  const iv = crypto.randomBytes(16);
  const key = crypto.createHash("sha256").update(secret).digest();
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  return iv.toString("hex") + ":" + encrypted;
}

export async function POST(req: Request) {
  try {
    const { tenantMailboxId, password } = await req.json();

    if (!tenantMailboxId || !password) {
      return NextResponse.json(
        { error: "tenantMailboxId and password are required" },
        { status: 400 }
      );
    }

    // 1️⃣ Fetch mailbox
    const mailbox = await prisma.tenantMailbox.findUnique({
      where: { id: tenantMailboxId },
    });

    if (!mailbox || mailbox.active === false) {
      return NextResponse.json({ error: "Mailbox not found" }, { status: 404 });
    }

    // 2️⃣ Encrypt password (worker will decrypt later)
    const encryptedPassword = encrypt(password);

    // 3️⃣ Upsert automation record
    await prisma.tenantMailboxAutomation.upsert({
      where: { tenantMailboxId },
      update: {
        encryptedPassword,
        automationEnabled: true,
        status: "APPROVED",
      },
      create: {
        tenantMailboxId,
        tenantId: mailbox.tenantId,
        encryptedPassword,
        automationEnabled: true,
        status: "APPROVED",
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("ENABLE AUTOMATION ERROR", err);
    return NextResponse.json(
      { error: "Failed to enable automation" },
      { status: 500 }
    );
  }
}
