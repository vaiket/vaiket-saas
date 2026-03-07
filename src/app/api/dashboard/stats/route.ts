import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const today = new Date();

  // Today at 00:00:00
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  // 7 days ago
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  try {
    const [visitorsToday, emailsToday, leadsToday, traffic, emails] = await Promise.all([
      prisma.traffic.aggregate({
        _sum: { visits: true },
        where: { date: { gte: startOfToday } },
      }).catch(() => ({ _sum: { visits: 0 } })),
      prisma.incomingEmail.count({
        where: { createdAt: { gte: startOfToday } },
      }).catch(() => 0),
      prisma.lead.count({
        where: { createdAt: { gte: startOfToday } },
      }).catch(() => 0),
      prisma.traffic.findMany({
        where: { date: { gte: sevenDaysAgo } },
        orderBy: { date: "asc" },
      }).catch(() => []),
      prisma.incomingEmail.groupBy({
        by: ["createdAt"],
        _count: true,
      }).catch(() => []),
    ]);

    const aiUsage = {
      openai: 40,
      deepseek: 25,
      gemini: 18,
      claude: 10,
    };

    return NextResponse.json({
      success: true,
      data: {
        visitorsToday: visitorsToday._sum.visits || 0,
        emailsToday,
        aiCostToday: (emailsToday * 0.008).toFixed(2),
        leadsToday,
        traffic: traffic.map((t) => ({
          day: t.date.toISOString().slice(5, 10),
          visits: t.visits,
        })),
        emails: emails.map((e) => ({
          day: new Date(e.createdAt).toISOString().slice(5, 10),
          count: e._count,
        })),
        aiUsage,
      },
    });

  } catch (err) {
    console.error("DASHBOARD API ERROR:", err);
    return NextResponse.json({
      success: true,
      data: {
        visitorsToday: 0,
        emailsToday: 0,
        aiCostToday: "0.00",
        leadsToday: 0,
        traffic: [],
        emails: [],
        aiUsage: {
          openai: 40,
          deepseek: 25,
          gemini: 18,
          claude: 10,
        },
      },
    });
  }
}
