import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

// 🔹 Validate Token Helper
async function validateAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) return { valid: false };

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    return { valid: true, decoded };
  } catch {
    return { valid: false };
  }
}

// 🔹 Update Auto-Reply Rule
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { valid } = await validateAuth();
  if (!valid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const id = Number(params.id);
    const data = await req.json();

    const updated = await prisma.autoReplyRule.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update Rule Error:", error);
    return NextResponse.json({ error: "Failed to update rule" }, { status: 500 });
  }
}

// 🔹 Delete Auto-Reply Rule
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { valid } = await validateAuth();
  if (!valid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const id = Number(params.id);

    await prisma.autoReplyRule.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete Rule Error:", error);
    return NextResponse.json({ error: "Failed to delete rule" }, { status: 500 });
  }
}
