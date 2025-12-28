import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ success: true, message: "Logged out" });

  res.cookies.set("token", "", {
    httpOnly: true,
    secure: false,
    path: "/",
    maxAge: 0, // delete cookie
  });

  return res;
}
