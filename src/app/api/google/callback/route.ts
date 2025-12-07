import { prisma } from "@/lib/prisma";
import { google } from "googleapis";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) return new Response("Missing code", { status: 400 });

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!,
  );

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  const userInfo = await google
    .oauth2("v2")
    .userinfo.get({ auth: oauth2Client });

  const email = userInfo.data.email!;
  const accessToken = tokens.access_token!;
  const refreshToken = tokens.refresh_token!;
  const expiresAt = new Date(Date.now() + tokens.expires_in! * 1000);

  // TODO: dynamic tenantId
  const tenantId = 1;

  await prisma.gmailAccount.upsert({
    where: { email },
    update: {
      accessToken,
      refreshToken,
      expiresAt,
      updatedAt: new Date(),
    },
    create: {
      email,
      accessToken,
      refreshToken,
      expiresAt,
      tenantId,
    },
  });

  return Response.redirect("https://ai.vaiket.com/settings/email?connected=1");
}
