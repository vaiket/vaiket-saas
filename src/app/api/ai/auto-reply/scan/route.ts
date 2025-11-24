import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function GET() {
  try {
    const tenants = await prisma.tenantSettings.findMany({
      where: {} // ✅ temporary fix — no TypeScript error
    });

    for (const t of tenants) {
      const tenantId = t.tenantId;

      const pending = await prisma.incomingEmail.findMany({
        where: {
          tenantId,
          processed: false
        },
        orderBy: { createdAt: "asc" }
      });

      for (const mail of pending) {
        console.log("AI processing mail:", mail.id);

        const prompt = `${t.aiPrimary}\n\nUser email:\n${mail.subject}\n${mail.body}`;

        const ai = await openai.chat.completions.create({
          model: t.aiModel || "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
        });

        const reply =
          ai.choices?.[0]?.message?.content?.trim() || t.aiFallback;

        const acc = await prisma.mailAccount.findFirst({
          where: { tenantId, active: true }
        });

        if (!acc) {
          console.log("No SMTP account for tenant", tenantId);
          continue;
        }

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

  } catch (error: any) {
    console.error("AUTO REPLY SCAN ERROR:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
