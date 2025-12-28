import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const transporter = nodemailer.createTransport({
      host: body.host,
      port: Number(body.port),
      secure: body.secure,
      auth: {
        user: body.username,
        pass: body.password,
      },
    });

    await transporter.verify();

    return NextResponse.json({
      success: true,
      message: "SMTP Connected Successfully",
    });
  } catch (err: any) {
    console.error("SMTP Test Error:", err);
    return NextResponse.json({
      success: false,
      error: err.message,
    });
  }
}
