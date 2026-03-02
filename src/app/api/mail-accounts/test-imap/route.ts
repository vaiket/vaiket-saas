import { NextResponse } from "next/server";
import imaps from "imap-simple";

export async function POST(req: Request) {
  try {
    const {
      imapHost,
      imapPort,
      imapUser,
      imapPass,
      imapSecure,
    } = await req.json();

    if (!imapHost || !imapUser || !imapPass || !imapPort) {
      return NextResponse.json(
        { success: false, message: "Missing IMAP fields" },
        { status: 400 }
      );
    }

    const config = {
      imap: {
        user: imapUser,
        password: imapPass,
        host: imapHost,
        port: Number(imapPort),
        tls: imapSecure === true,
        authTimeout: 20000,
        tlsOptions: { rejectUnauthorized: false },
      },
    };

    const connection = await imaps.connect(config);
    await connection.openBox("INBOX");
    await connection.end();

    return NextResponse.json({
      success: true,
      message: "IMAP connection successful!",
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      message: err.message || "IMAP connection failed",
    });
  }
}
