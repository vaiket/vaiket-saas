import nodemailer from "nodemailer";

export async function testSmtp({
  host,
  port,
  secure,
  user,
  pass,
}: {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}) {
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    requireTLS: true,
    tls: { rejectUnauthorized: false },
    connectionTimeout: 15000,
  });

  await transporter.sendMail({
    from: user,
    to: user,
    subject: "SMTP Verification",
    text: "SMTP authentication successful",
  });

  return true;
}
