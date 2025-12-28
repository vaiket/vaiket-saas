// src/lib/auth/otp-memory.ts
type OtpRecord = { email: string; otp: string; expiresAt: number; used?: boolean };
const STORE = new Map<string, OtpRecord>();

export function saveOtp(email: string, otp: string, ttlSeconds = 300) {
  STORE.set(email, { email, otp, expiresAt: Date.now() + ttlSeconds * 1000, used: false });
}
export function getOtpRecord(email: string) {
  return STORE.get(email) ?? null;
}
export function markOtpUsed(email: string) {
  const r = STORE.get(email);
  if (r) { r.used = true; STORE.set(email, r); }
}
export function cleanupExpired() {
  for (const [k, v] of STORE.entries()) if (v.expiresAt < Date.now()) STORE.delete(k);
}
