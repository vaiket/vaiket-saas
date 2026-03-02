import { ImapFlow } from "imapflow";

export async function testImap({
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
  const imap = new ImapFlow({
    host,
    port,
    secure,
    auth: { user, pass },
    socketTimeout: 15000,
    greetingTimeout: 15000,
    authTimeout: 15000,
    tls: { rejectUnauthorized: false },
  });

  try {
    await imap.connect();
    return true;
  } finally {
    try { await imap.logout(); } catch {}
    await imap.close();
  }
}
