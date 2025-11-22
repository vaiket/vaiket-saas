import Imap from "imap";
import dotenv from "dotenv";

dotenv.config();

const imap = new Imap({
  user: "urgent@jharvision.com",
  password: "VIDYA#6206101926",
  host: "mail.jharvision.com",
  port: 993,
  tls: true,
  tlsOptions: {
    rejectUnauthorized: false   // 🔥 FIX: Ignore SSL mismatch
  }
});

imap.once("ready", () => {
  console.log("✅ IMAP Connected Successfully!");

  imap.openBox("INBOX", true, (err, box) => {
    if (err) {
      console.error("❌ Error opening inbox:", err);
      return;
    }

    console.log("📬 Total Emails:", box.messages.total);

    imap.end();
  });
});

imap.once("error", (err) => {
  console.error("❌ IMAP Error:", err);
});

imap.connect();
