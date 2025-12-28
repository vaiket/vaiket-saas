import crypto from "crypto";

const MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID!;
const CLIENT_ID = process.env.PHONEPE_CLIENT_ID!;
const CLIENT_SECRET = process.env.PHONEPE_CLIENT_SECRET!;
const BASE_URL = process.env.PHONEPE_BASE_URL!; // https://api.phonepe.com/apis/hermes

export function generateChecksum(payload: string) {
  const salt = CLIENT_SECRET;
  const checksum = crypto
    .createHash("sha256")
    .update(payload + salt)
    .digest("hex");

  return checksum + "###" + salt;
}

export function encodePayload(obj: any) {
  return Buffer.from(JSON.stringify(obj)).toString("base64");
}
