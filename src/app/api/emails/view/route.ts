// src/app/api/emails/view/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing email ID" }, { status: 400 });
    }

    const email = await prisma.incomingEmail.findUnique({
      where: { id: Number(id) },
    });

    if (!email) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, email });
  } catch (err) {
    console.error("VIEW EMAIL API ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
