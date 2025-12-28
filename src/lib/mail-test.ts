import Imap from "imap";
import nodemailer from "nodemailer";

export async function testIMAP(config: {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
}) {
  return new Promise<void>((resolve, reject) => {
    const imap = new Imap({
      user: config.user,
      password: config.password,
      host: config.host,
      port: config.port,
      tls: config.secure,
    });

    imap.once("ready", () => {
      imap.end();
      resolve();
    });

    imap.once("error", (err) => {
      reject(err);
    });

    imap.connect();
  });
}

export async function testSMTP(config: {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
}) {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.password,
    },
  });

  await transporter.verify();
}
