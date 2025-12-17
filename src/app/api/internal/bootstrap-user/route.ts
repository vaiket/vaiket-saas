import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // 🔥 REQUIRED
);

export async function POST(req: Request) {
  try {
    const { email, name } = await req.json();

    if (!email) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    // 1️⃣ Find user
    let { data: user } = await supabase
      .from("User")
      .select("id, tenantId")
      .eq("email", email)
      .single();

    // 2️⃣ If not exists → create tenant + user
    if (!user) {
      const { data: tenant, error: tenantErr } = await supabase
        .from("Tenant")
        .insert({ name: name || "My Business" })
        .select("id")
        .single();

      if (tenantErr || !tenant) {
        return NextResponse.json(
          { success: false, error: "tenant_create_failed" },
          { status: 500 }
        );
      }

      const { data: newUser, error: userErr } = await supabase
        .from("User")
        .insert({
          email,
          name: name || "User",
          role: "admin",
          tenantId: tenant.id,
          password: "oauth",
        })
        .select("id, tenantId")
        .single();

      if (userErr || !newUser) {
        return NextResponse.json(
          { success: false, error: "user_create_failed" },
          { status: 500 }
        );
      }

      user = newUser;
    }

    // 3️⃣ Fetch onboarding
    const { data: onboarding } = await supabase
      .from("Onboarding")
      .select("website")
      .eq("userId", user.id)
      .single();

    return NextResponse.json({
      success: true,
      userId: user.id,
      tenantId: user.tenantId,
      website: onboarding?.website || null,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
}
