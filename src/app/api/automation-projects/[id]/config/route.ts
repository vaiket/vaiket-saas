import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export async function POST(
  req: Request,
  ctx: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const projectId = Number(ctx.params.id);

    const body = await req.json();
    const {
      purpose,
      replyTone,
      replyLength,
      aiEnabled,
      selectedEmails,
    } = body;

    await prisma.projectAutoConfig.upsert({
      where: { projectId },
      update: {
        purpose,
        replyTone,
        replyLength,
        aiEnabled,
        mailboxes: selectedEmails,
      },
      create: {
        projectId,
        tenantId: decoded.tenantId,
        purpose,
        replyTone,
        replyLength,
        aiEnabled,
        mailboxes: selectedEmails,
      },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Save Config Error:", e);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
