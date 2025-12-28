import { prisma } from "@/lib/prisma";

export async function GET() {
  const logs = await prisma.mailLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return Response.json(logs);
}
