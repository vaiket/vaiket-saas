import nodemailer from "nodemailer";

type InviteEmailParams = {
  toEmail: string;
  tenantName: string;
  inviterName: string;
  role: string;
  inviteToken: string;
  expiresAt: Date;
  requestUrl?: string | null;
};

type JoinWelcomeEmailParams = {
  toEmail: string;
  tenantName: string;
  joinedUserName: string;
  role: string;
};

type InviteAcceptedNotifyParams = {
  toEmail: string;
  tenantName: string;
  joinedUserName: string;
  joinedUserEmail: string;
  role: string;
};

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`${name} is not configured`);
  }
  return value.trim();
}

function getBaseUrl(requestUrl?: string | null) {
  const fromEnv =
    process.env.TEAM_INVITE_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.BASE_URL ||
    "";

  if (fromEnv.trim()) {
    return fromEnv.replace(/\/+$/, "");
  }

  if (requestUrl) {
    try {
      const url = new URL(requestUrl);
      return `${url.protocol}//${url.host}`;
    } catch {
      return "http://localhost:3000";
    }
  }

  return "http://localhost:3000";
}

export function isSmtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_PORT?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim()
  );
}

function createSmtpTransporter() {
  const host = getRequiredEnv("SMTP_HOST");
  const port = Number(getRequiredEnv("SMTP_PORT"));
  const user = getRequiredEnv("SMTP_USER");
  const pass = getRequiredEnv("SMTP_PASS");

  if (!Number.isFinite(port) || port <= 0) {
    throw new Error("SMTP_PORT is invalid");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

function getFromAddress() {
  const from = (
    process.env.TEAM_INVITE_FROM ||
    process.env.EMAIL_FROM ||
    process.env.SMTP_USER ||
    ""
  ).trim();
  if (!from) {
    throw new Error("TEAM_INVITE_FROM or EMAIL_FROM is not configured");
  }
  return from;
}

export async function sendTenantInviteEmail(params: InviteEmailParams) {
  const transporter = createSmtpTransporter();
  const from = getFromAddress();

  const baseUrl = getBaseUrl(params.requestUrl);
  const inviteUrl = `${baseUrl}/register?inviteToken=${encodeURIComponent(
    params.inviteToken
  )}&email=${encodeURIComponent(params.toEmail)}`;
  const roleLabel = params.role.charAt(0).toUpperCase() + params.role.slice(1);
  const expiresLabel = params.expiresAt.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const subject = `Invitation to join ${params.tenantName} on Vaiket`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #111827;">
      <h2 style="margin: 0 0 14px;">You are invited to join ${params.tenantName}</h2>
      <p style="margin: 0 0 12px;">
        ${params.inviterName} invited you as <b>${roleLabel}</b> on Vaiket.
      </p>
      <p style="margin: 0 0 16px;">
        This invitation expires on <b>${expiresLabel}</b>.
      </p>
      <a
        href="${inviteUrl}"
        style="display:inline-block; background:#2563eb; color:#ffffff; text-decoration:none; padding:12px 18px; border-radius:8px; font-weight:600;"
      >
        Accept Invitation
      </a>
      <p style="margin: 18px 0 8px; color:#6b7280; font-size:13px;">
        If the button does not work, use this link:
      </p>
      <p style="margin: 0; font-size:13px; word-break: break-all;">
        <a href="${inviteUrl}">${inviteUrl}</a>
      </p>
    </div>
  `;

  await transporter.sendMail({
    from,
    to: params.toEmail,
    subject,
    html,
  });

  return { inviteUrl };
}

export async function sendWorkspaceJoinConfirmationEmail(params: JoinWelcomeEmailParams) {
  const transporter = createSmtpTransporter();
  const from = getFromAddress();
  const roleLabel = params.role.charAt(0).toUpperCase() + params.role.slice(1);

  await transporter.sendMail({
    from,
    to: params.toEmail,
    subject: `Welcome to ${params.tenantName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #111827;">
        <h2 style="margin: 0 0 14px;">Congratulations, you joined ${params.tenantName}</h2>
        <p style="margin: 0 0 12px;">
          Hi ${params.joinedUserName}, your workspace access is now active.
        </p>
        <p style="margin: 0 0 12px;">
          Assigned role: <b>${roleLabel}</b>
        </p>
        <p style="margin: 0;">
          You can login and start using your workspace immediately.
        </p>
      </div>
    `,
  });
}

export async function sendInviteAcceptedNotificationEmail(params: InviteAcceptedNotifyParams) {
  const transporter = createSmtpTransporter();
  const from = getFromAddress();
  const roleLabel = params.role.charAt(0).toUpperCase() + params.role.slice(1);

  await transporter.sendMail({
    from,
    to: params.toEmail,
    subject: `${params.joinedUserName} joined your workspace`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #111827;">
        <h2 style="margin: 0 0 14px;">Invite accepted in ${params.tenantName}</h2>
        <p style="margin: 0 0 12px;">
          <b>${params.joinedUserName}</b> (${params.joinedUserEmail}) joined your workspace.
        </p>
        <p style="margin: 0 0 12px;">
          Joined role: <b>${roleLabel}</b>
        </p>
        <p style="margin: 0;">
          You can manage their access from Team and Security settings.
        </p>
      </div>
    `,
  });
}
