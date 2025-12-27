import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const { purpose } = await req.json();

  await prisma.projectAutoProject.update({
    where: { id: Number(ctx.params.id) },
    data: { purpose, status: "SETUP" },
  });

  return NextResponse.json({ success: true });
}
