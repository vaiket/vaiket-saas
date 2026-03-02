import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { getClientMeta } from "@/lib/auth/session";
import {
  isSmtpConfigured,
  sendInviteAcceptedNotificationEmail,
  sendWorkspaceJoinConfirmationEmail,
} from "@/lib/mail";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");
    const business = String(body?.business ?? "").trim();
    const inviteToken = String(body?.inviteToken ?? "").trim();
    const isInviteFlow = inviteToken.length > 0;

    if (!name || !email || !password || (!isInviteFlow && !business)) {
      return NextResponse.json(
        { success: false, error: "Missing fields" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: {
        id: true,
        tenantId: true,
        status: true,
      },
    });

    const hashed = await bcrypt.hash(password, 10);

    let acceptedInvitationMeta:
      | {
          id: string;
          tenantId: number;
          role: string;
          invitedByUserId: number;
        }
      | null = null;
    const user = await prisma.$transaction(async (tx) => {
      if (isInviteFlow) {
        const tokenHash = crypto.createHash("sha256").update(inviteToken).digest("hex");
        const invitation = await tx.tenantInvitation.findFirst({
          where: {
            tokenHash,
            status: "pending",
            expiresAt: { gt: new Date() },
          },
          select: {
            id: true,
            tenantId: true,
            email: true,
            role: true,
            invitedByUserId: true,
          },
        });

        if (!invitation) {
          throw new Error("Invalid or expired invitation link");
        }

        if (invitation.email.toLowerCase() !== email) {
          throw new Error(`This invitation is for ${invitation.email}`);
        }

        if (existing) {
          if (existing.tenantId === invitation.tenantId) {
            throw new Error("Account already exists in this workspace. Please login.");
          }
          throw new Error(
            "This email already belongs to another workspace. Use another email to accept invite."
          );
        }

        const createdUser = await tx.user.create({
          data: {
            tenantId: invitation.tenantId,
            name,
            email,
            password: hashed,
            role: invitation.role,
            onboardingCompleted: true,
          },
        });

        await tx.tenantInvitation.update({
          where: { id: invitation.id },
          data: {
            status: "accepted",
            acceptedAt: new Date(),
          },
        });

        acceptedInvitationMeta = {
          id: invitation.id,
          tenantId: invitation.tenantId,
          role: invitation.role,
          invitedByUserId: invitation.invitedByUserId,
        };
        return createdUser;
      }

      if (existing) {
        throw new Error("This email is already linked to a workspace. Please login.");
      }

      const tenant = await tx.tenant.create({
        data: {
          name: business,
          timezone: "Asia/Kolkata",
        },
      });

      const createdUser = await tx.user.create({
        data: {
          tenantId: tenant.id,
          name,
          email,
          password: hashed,
          role: "owner",
          onboardingCompleted: false,
        },
      });

      await tx.tenantSettings.create({
        data: {
          tenantId: tenant.id,
          aiPrimary: "deepseek",
          aiFallback: "gemini,chatgpt",
          aiMode: "draft",
        },
      });

      return createdUser;
    });

    const jti = crypto.randomUUID();
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        tenantId: user.tenantId,
        role: user.role,
        jti,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    const { ip, userAgent } = getClientMeta(req);
    await prisma.userSession.create({
      data: {
        userId: user.id,
        tenantId: user.tenantId,
        jti,
        ip,
        userAgent,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        isEmailVerified: true,
      },
    });

    if (!acceptedInvitationMeta) {
      await writeAuditLog({
        tenantId: user.tenantId,
        actorUserId: user.id,
        action: "tenant.auth.signup",
        entity: "User",
        entityId: String(user.id),
        meta: { email, name },
        req,
      });
    }

    if (acceptedInvitationMeta) {
      await writeAuditLog({
        tenantId: user.tenantId,
        actorUserId: user.id,
        action: "tenant.team.invite.accept",
        entity: "TenantInvitation",
        entityId: acceptedInvitationMeta.id,
        meta: { email, userId: user.id },
        req,
      });

      if (isSmtpConfigured()) {
        try {
          const [tenant, inviter] = await Promise.all([
            prisma.tenant.findUnique({
              where: { id: acceptedInvitationMeta.tenantId },
              select: { name: true },
            }),
            prisma.user.findUnique({
              where: { id: acceptedInvitationMeta.invitedByUserId },
              select: { name: true, email: true },
            }),
          ]);

          await sendWorkspaceJoinConfirmationEmail({
            toEmail: user.email,
            tenantName: tenant?.name || "your workspace",
            joinedUserName: user.name || user.email,
            role: acceptedInvitationMeta.role,
          });

          if (
            inviter?.email &&
            inviter.email.trim().toLowerCase() !== user.email.trim().toLowerCase()
          ) {
            await sendInviteAcceptedNotificationEmail({
              toEmail: inviter.email,
              tenantName: tenant?.name || "your workspace",
              joinedUserName: user.name || user.email,
              joinedUserEmail: user.email,
              role: acceptedInvitationMeta.role,
            });
          }
        } catch (mailError) {
          console.error("Invite accept email notification failed:", mailError);
        }
      }
    }

    const response = NextResponse.json({
      success: true,
      onboardingCompleted: user.onboardingCompleted,
      inviteAccepted: Boolean(acceptedInvitationMeta),
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Invalid or expired invitation link") {
        return NextResponse.json(
          { success: false, error: err.message },
          { status: 400 }
        );
      }

      if (
        err.message === "Email already exists" ||
        err.message === "This email is already linked to a workspace. Please login." ||
        err.message.startsWith("This invitation is for ") ||
        err.message.includes("workspace")
      ) {
        return NextResponse.json(
          { success: false, error: err.message },
          { status: 409 }
        );
      }
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { success: false, error: "Email already exists" },
        { status: 409 }
      );
    }

    console.error("Register Error:", err);
    return NextResponse.json(
      { success: false, error: "Server Error" },
      { status: 500 }
    );
  }
}
