import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { emails, subject, html } = body;

    if (!emails || !subject || !html) {
      return NextResponse.json(
        { success: false, error: "Missing fields" },
        { status: 400 }
      );
    }

    // 🔹 Get SMTP details
    const smtp = await prisma.smtpCredentials.findFirst({
      orderBy: { createdAt: "desc" },
    });

    if (!smtp) {
      return NextResponse.json(
        { success: false, error: "SMTP not configured" },
        { status: 400 }
      );
    }

    console.log("📨 SMTP CONFIG:", {
      host: smtp.host,
      port: smtp.port,
      user: smtp.username,
    });

    // ✅ Nodemailer config
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: false, // IMPORTANT for 587
      auth: {
        user: smtp.username,
        pass: smtp.password,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const results = [];

    for (const email of emails) {
      try {
        await transporter.sendMail({
          from: `"Astramize" <${smtp.username}>`,
          to: email,
          subject,
          html,
        });

        results.push({
          email,
          status: "success",
        });
      } catch (err: any) {
        console.error("❌ MAIL ERROR:", err.message);

        results.push({
          email,
          status: "failed",
          error: err.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("❌ MAIL API ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
