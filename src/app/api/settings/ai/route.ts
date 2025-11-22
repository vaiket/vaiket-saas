import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

// 🔐 Helper: Extract and verify token
function getUser(req: Request) {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;

  const tokenMatch = cookieHeader.match(/token=([^;]+)/);
  const token = tokenMatch ? tokenMatch[1] : null;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    return decoded;
  } catch (err) {
    return null;
  }
}

// ======================================================
//  🔍 GET — Load AI Settings
// ======================================================
export async function GET(req: Request) {
  const user = getUser(req);
  if (!user)
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const settings = await prisma.tenantSettings.findUnique({
      where: { tenantId: String(user.tenantId) },
    });

    return NextResponse.json({
      success: true,
      settings,
    });

  } catch (err) {
    console.error("AI Settings GET Error:", err);
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 });
  }
}

// ======================================================
//  💾 POST — Save AI Settings
// ======================================================
export async function POST(req: Request) {
  const user = getUser(req);
  if (!user)
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { aiPrimary, aiFallback, aiModel, aiMode, tone, autoReply } = body;

    const updated = await prisma.tenantSettings.upsert({
      where: { tenantId: String(user.tenantId) },
      update: {
        aiPrimary,
        aiFallback,
        aiModel,
        aiMode,
        tone,
        autoReply,
      },
      create: {
        tenantId: String(user.tenantId),
        aiPrimary,
        aiFallback,
        aiModel,
        aiMode,
        tone,
        autoReply,
      },
    });

    return NextResponse.json({ success: true, settings: updated });

  } catch (err) {
    console.error("AI Settings POST Error:", err);
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 });
  }
}
