import { NextResponse } from "next/server";

export async function GET() {
  try {
    const domain = "vaiket.com"; // 🔁 test domain (change if needed)

    const res = await fetch(
      `${process.env.MAILCOW_BASE_URL}/get/dkim/${domain}`,
      {
        headers: {
          "X-API-Key": process.env.MAILCOW_API_KEY!,
        },
      }
    );

    const data = await res.json();

    if (!data?.dkim_txt) {
      return NextResponse.json(
        {
          success: false,
          message: "DKIM not found",
          raw: data,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      domain,
      dkim: data.dkim_txt,
    });
  } catch (err: any) {
    console.error("DKIM TEST ERROR:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message,
      },
      { status: 500 }
    );
  }
}
