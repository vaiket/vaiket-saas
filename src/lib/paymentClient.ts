"use client";

export async function initiatePayment(
  planKey: string,
  userId: string,
  tenantId: string,
  amount: number
) {
  const res = await fetch("/api/payments/payu/initiate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount,
      productinfo: `Vaiket ${planKey} plan`,
      firstname: "User",
      email: "customer@example.com",
      phone: "9999999999",
      userId: Number(userId),
      tenantId: Number(tenantId),
    }),
  });

  return await res.json();
}
