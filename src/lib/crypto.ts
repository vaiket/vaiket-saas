// src/lib/crypto.ts
import crypto from "crypto";

const ALGO = "aes-256-cbc";

// ✅ force 32-byte key
const RAW_KEY = process.env.ENCRYPTION_KEY || "default_dev_key";
const KEY = crypto.createHash("sha256").update(RAW_KEY).digest(); // 32 bytes

export function encrypt(text: string) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  return iv.toString("hex") + ":" + encrypted;
}

export function decrypt(text: string) {
  const [ivHex, encrypted] = text.split(":");
  const iv = Buffer.from(ivHex, "hex");

  const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
