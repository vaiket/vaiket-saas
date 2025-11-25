import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Test Query
    const { data, error } = await supabase.from("users").select("*").limit(1);

    if (error) {
      return NextResponse.json({
        ok: false,
        message: "Supabase connected but query failed",
        error: error.message,
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Supabase database connected successfully!",
      sample: data,
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      message: "Supabase connection failed",
      error: err.message,
    });
  }
}
