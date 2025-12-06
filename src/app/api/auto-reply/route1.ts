import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ success: false, rules: [] });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const { tenantId } = decoded;

    const rules = await prisma.autoReplyRule.findMany({
      where: { tenantId },
      orderBy: { priority: "asc" },
    });

    return NextResponse.json({ success: true, rules });
  } catch (err) {
    console.error("AutoReply GET Error:", err);
    return NextResponse.json(
      { success: false, rules: [] },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
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
    const { userId, tenantId } = decoded;

    if (!tenantId || !userId) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { keyword, response, priority } = body;

    if (!keyword || !response) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    await prisma.autoReplyRule.create({
      data: {
        tenantId,
        keyword,
        replyText: response, // ⬅ FIXED
        priority: Number(priority) || 1,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("AutoReply POST Error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
