import { NextResponse } from "next/server";

import { getAuthContext, hasRoleAtLeast, type AuthContext, type Role } from "@/lib/auth/session";
import { ensureCrmSchema } from "@/lib/crm/schema";

type CrmGuardSuccess = {
  ok: true;
  auth: AuthContext;
};

type CrmGuardFailure = {
  ok: false;
  response: NextResponse;
};

export async function ensureCrmAccess(
  req: Request,
  minimumRole: Role = "member"
): Promise<CrmGuardSuccess | CrmGuardFailure> {
  const auth = await getAuthContext(req);
  if (!auth) {
    return {
      ok: false,
      response: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (!hasRoleAtLeast(auth.role, minimumRole)) {
    return {
      ok: false,
      response: NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }),
    };
  }

  await ensureCrmSchema();

  return { ok: true, auth };
}
