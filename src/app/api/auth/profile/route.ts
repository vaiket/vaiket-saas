import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth/session";

type ProfilePayload = {
  name?: unknown;
  mobile?: unknown;
  profileImage?: unknown;
};

export async function POST(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = (await req.json()) as ProfilePayload;
  const hasName = body.name !== undefined;
  const hasMobile = body.mobile !== undefined;
  const hasProfileImage = body.profileImage !== undefined;

  if (!hasName && !hasMobile && !hasProfileImage) {
    return NextResponse.json(
      { success: false, error: "Nothing to update" },
      { status: 400 }
    );
  }

  const name = hasName ? String(body.name ?? "").trim() : null;
  const mobile = hasMobile ? String(body.mobile ?? "").trim() : null;
  const profileImage = hasProfileImage
    ? String(body.profileImage ?? "").trim()
    : null;

  if (hasName && !name) {
    return NextResponse.json(
      { success: false, error: "Name is required" },
      { status: 400 }
    );
  }

  if (name && name.length > 80) {
    return NextResponse.json(
      { success: false, error: "Name is too long" },
      { status: 400 }
    );
  }

  if (mobile && mobile.length > 20) {
    return NextResponse.json(
      { success: false, error: "Mobile number is too long" },
      { status: 400 }
    );
  }

  if (profileImage && profileImage.length > 2048) {
    return NextResponse.json(
      { success: false, error: "Profile image URL is too long" },
      { status: 400 }
    );
  }

  const data: {
    name?: string;
    mobile?: string | null;
    profileImage?: string | null;
  } = {};

  if (hasName && name) data.name = name;
  if (hasMobile) data.mobile = mobile || null;
  if (hasProfileImage) data.profileImage = profileImage || null;

  const user = await prisma.user.update({
    where: { id: auth.userId },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      mobile: true,
      profileImage: true,
      role: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ success: true, user });
}

