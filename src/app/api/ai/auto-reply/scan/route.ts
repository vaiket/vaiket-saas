import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function GET() {
  try {
    const tenants = await prisma.tenantSettings.findMany({
      where: { autoReplyEnabled: true }
    });

    for (const t of tenants) {
      const tenantId = t.tenantId;

      // 1. Load ONLY unprocessed emails
      const pending = await prisma.incomingEmail.findMany({
        where: {
          tenantId,
          processed: false
        },
        orderBy: { createdAt: "asc" }
      });

      for (const mail of pending) {
        console.log("AI processing mail:", mail.id);

        // -------------------------------------------------------
        // 2. Generate AI reply FIRST (important)
        // -------------------------------------------------------
        const prompt = `${t.aiPrimary}\n\nUser email:\n${mail.subject}\n${mail.body}`;

        const ai = await openai.chat.completions.create({
          model: t.aiModel || "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
        });

        const reply =
          ai.choices?.[0]?.message?.content?.trim() || t.aiFallback;

        // 3. Prepare SMTP for sending
        const acc = await prisma.mailAccount.findFirst({
          where: { tenantId, active: true }
        });

        if (!acc) {
          console.log("No SMTP account for tenant", tenantId);
          continue;
        }

        // -------------------------------------------------------
        // 4. Save outgoing mail (daemon will send)
        // -------------------------------------------------------
        await prisma.mailLog.create({
          data: {
            mailAccountId: acc.id,
            type: "outgoing",
            to: mail.from || "",
            from: acc.email,
            subject: "Re: " + (mail.subject || ""),
            body: reply,
            status: "pending",
          },
        });

        console.log("AI reply queued:", mail.id);

        // -------------------------------------------------------
        // 5. Mark processed LAST (important)
        // -------------------------------------------------------
        await prisma.incomingEmail.update({
          where: { id: mail.id },
          data: { processed: true }
        });
      }
    }

    return NextResponse.json({
      ok: true,
      message: "AI auto-reply scan completed"
    });

  } catch (error) {
    console.error("AUTO REPLY SCAN ERROR:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
