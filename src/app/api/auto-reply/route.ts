import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

// 🟦 Validate and extract user from JWT Cookie
const getUserFromToken = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) return null;

  try {
    return jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return null;
  }
};

// 🟩 GET — Fetch Rules
export async function GET() {
  try {
    const decoded: any = await getUserFromToken();
    if (!decoded)
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });

    const { tenantId } = decoded;

    const rules = await prisma.autoReplyRule.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" }, // priority removed from schema
    });

    return NextResponse.json({ success: true, rules });
  } catch (error) {
    console.error("AutoReply GET Error:", error);
    return NextResponse.json(
      { error: "Server Error" },
      { status: 500 }
    );
  }
}

// 🟦 POST — Create Rule
export async function POST(req: Request) {
  try {
    const decoded: any = await getUserFromToken();
    if (!decoded)
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });

    const { tenantId } = decoded;
    const { keyword, replyText } = await req.json();

    if (!keyword || !replyText) {
      return NextResponse.json(
        { error: "Keyword & Reply Text required" },
        { status: 400 }
      );
    }

    await prisma.autoReplyRule.create({
      data: {
        tenantId,
        keyword,
        replyText,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("AutoReply POST Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

// 🟦 DELETE — Delete Rule
export async function DELETE(req: Request) {
  try {
    const decoded: any = await getUserFromToken();
    if (!decoded)
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });

    const { id } = await req.json();
    if (!id)
      return NextResponse.json({ error: "Rule ID required" }, { status: 400 });

    await prisma.autoReplyRule.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("AutoReply DELETE Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

// 🟦 PUT — Update Rule
export async function PUT(req: Request) {
  try {
    const decoded: any = await getUserFromToken();
    if (!decoded)
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });

    const { id, keyword, replyText } = await req.json();

    if (!id || !keyword || !replyText) {
      return NextResponse.json(
        { error: "Rule ID + Keyword + ReplyText required" },
        { status: 400 }
      );
    }

    await prisma.autoReplyRule.update({
      where: { id },
      data: { keyword, replyText },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("AutoReply PUT Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
