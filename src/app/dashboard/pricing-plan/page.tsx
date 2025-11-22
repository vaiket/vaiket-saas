// ✅ Server Component — src/app/dashboard/pricing-plan/page.tsx
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import PricingPlanClient from "@/components/PricingPlanClient";

export default async function PricingPlanPage() {
  // ✅ Await cookies() — required in Next.js 16
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value || null;

  if (!token) {
    // ✅ But proxy already protects — so don’t redirect here
    console.warn("Warning: No token found — but proxy should block unauth access.");
    return (
      <div className="p-10 text-center text-red-600">
        Authentication error — please login again.
      </div>
    );
  }

  // ✅ Decode JWT (no DB call)
  let decoded: any = null;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!);
  } catch (e) {
    console.error("JWT decode failed:", e);
  }

  return (
    <PricingPlanClient
      userId={decoded?.userId ?? null}
      tenantId={decoded?.tenantId ?? null}
      email={decoded?.email ?? null}
      name={decoded?.name ?? null}
    />
  );
}
