import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    emails: [
      {
        id: 1,
        from: "john@example.com",
        subject: "Need product details",
        body: "Hello sir, I want to know about your hosting pricing.",
        createdAt: new Date(),
      },
      {
        id: 2,
        from: "support@company.com",
        subject: "Ticket update",
        body: "Your support ticket has been updated.",
        createdAt: new Date(),
      },
      {
        id: 3,
        from: "customer@xyz.com",
        subject: "(No subject)",
        body: "Please call me back.",
        createdAt: new Date(),
      },
    ],
  });
}
