// FILE: src/app/api/ai/test/route.ts
// API route to test V-AI with a real message
import { NextResponse } from "next/server";
import { vaiTestMessage } from "@/lib/ai/VAI/test";


export async function GET() {
const result = await vaiTestMessage("Hello V-AI, this is a system test.");


return NextResponse.json({
status: result.ok ? "success" : "error",
result,
});
}