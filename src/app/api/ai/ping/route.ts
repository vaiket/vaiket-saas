

// FILE: src/app/api/ai/ping/route.ts
// API route to expose V-AI health status
import { NextResponse } from "next/server";
import { vaiPing, vaiDeepHealthCheck } from "@/lib/ai/VAI/health";


export async function GET() {
const basic = vaiPing();
const deep = await vaiDeepHealthCheck();


return NextResponse.json({
status: "success",
basic,
deep,
});
}