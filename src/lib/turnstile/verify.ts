// src/lib/turnstile/verify.ts
export async function verifyTurnstile(token: string, remoteip?: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) throw new Error("TURNSTILE_SECRET_KEY not set");

  const form = new URLSearchParams();
  form.set("secret", secret);
  form.set("response", token);
  if (remoteip) form.set("remoteip", remoteip);

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
  });
  const data = await res.json();
  return data; // contains { success, challenge_ts, hostname, 'error-codes'... }
}
