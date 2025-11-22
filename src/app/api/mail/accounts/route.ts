import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function GET(req: Request) {
  // extract tenant from token later
  const accounts = await prisma.mailAccount.findMany();
  return NextResponse.json({ accounts });
}

export async function POST(req: Request) {
  try {
    const data = await req.json();

    await prisma.mailAccount.create({
      data: {
        tenantId: 1, // TEMP (replace with real token later)
        ...data,
        status: "Not Connected",
      },
    });

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: "Error saving" });
  }
}
