import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    emailsPerDay: [
      { date: "2025-11-01", value: 120 },
      { date: "2025-11-02", value: 150 },
      { date: "2025-11-03", value: 90 },
      { date: "2025-11-04", value: 220 },
      { date: "2025-11-05", value: 180 },
    ],
    aiVsHuman: [
      { label: "AI", value: 1240 },
      { label: "Human", value: 380 },
    ],
    categories: [
      { label: "Sales", value: 41 },
      { label: "Support", value: 65 },
      { label: "Billing", value: 23 },
      { label: "Other", value: 12 },
    ],
  });
}
