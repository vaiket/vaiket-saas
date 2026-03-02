import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
;

export async function GET() {
  try {
    const now = new Date().toISOString();

    // 1. Find subscriptions which have expired today
    const { data: expiring, error } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .lte("end_date", now)
      .eq("status", "active");

    if (error) {
      console.error("Lookup error:", error);
      return NextResponse.json({ ok: false });
    }

    console.log("Expiring subscriptions:", expiring.length);

    for (const sub of expiring) {
      try {
        // TODO: Use PayU recurring API here
        // Placeholder: mark expired
        await supabaseAdmin
          .from("subscriptions")
          .update({
            status: "expired",
            updated_at: new Date().toISOString(),
          })
          .eq("id", sub.id);

        console.log("Subscription expired:", sub.id);
      } catch (err) {
        console.error("Renewal error:", err);
      }
    }

    return NextResponse.json({ ok: true, processed: expiring.length });
  } catch (e) {
    console.error("Cron error:", e);
    return NextResponse.json({ ok: false });
  }
}
