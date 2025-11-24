// src/app/api/start-crawl/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { domain, tenantId } = body;

    if (!domain) {
      return NextResponse.json(
        { success: false, error: "Domain required" },
        { status: 400 }
      );
    }

    // ✅ tenantId optional — send only if exists
    await fetch("http://localhost:4000/crawl/website", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: domain,
        tenantId: tenantId ?? null,
        maxPages: 200,
        maxDepth: 3,
      }),
    });

    return NextResponse.json({
      success: true,
      message: "Crawling started",
    });
  } catch (error: any) {
    console.error("Crawl start error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Server error" },
      { status: 500 }
    );
  }
}
