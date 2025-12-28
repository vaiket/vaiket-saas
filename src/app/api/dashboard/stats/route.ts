import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const today = new Date();

    // Today at 00:00:00
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // VISITORS TODAY
    const visitorsToday = await prisma.traffic.aggregate({
      _sum: { visits: true },
      where: { date: { gte: startOfToday } },
    });

    // EMAILS TODAY
    const emailsToday = await prisma.incomingEmail.count({
      where: { createdAt: { gte: startOfToday } },
    });

    // LEADS TODAY
    const leadsToday = await prisma.lead.count({
      where: { createdAt: { gte: startOfToday } },
    });

    // TRAFFIC LAST 7 DAYS
    const traffic = await prisma.traffic.findMany({
      where: { date: { gte: sevenDaysAgo } },
      orderBy: { date: "asc" },
    });

    // EMAILS LAST 7 DAYS
    const emails = await prisma.incomingEmail.groupBy({
      by: ["createdAt"],
      _count: true,
    });

    // TEMP AI USAGE PLACEHOLDER
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
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
