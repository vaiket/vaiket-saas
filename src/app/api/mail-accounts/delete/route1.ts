import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { id } = await req.json();

    if (!id)
      return NextResponse.json(
        { success: false, message: "Missing ID" },
        { status: 400 }
      );

    await prisma.mailAccount.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Mail account deleted successfully",
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: "Delete failed" },
      { status: 500 }
    );
  }
}
