import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const data = await req.json();

  await prisma.projectAutoProject.update({
    where: { id: Number(ctx.params.id) },
    data,
  });

  return NextResponse.json({ success: true });
}
