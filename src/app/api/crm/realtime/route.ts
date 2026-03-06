import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { ensureCrmAccess } from "@/lib/crm/auth";
import { prisma } from "@/lib/prisma";

function eventChunk(event: string, payload: Record<string, unknown>) {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

export async function GET(req: Request) {
  const guard = await ensureCrmAccess(req, "member");
  if (!guard.ok) return guard.response;
  const { auth } = guard;

  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(
        encoder.encode(
          eventChunk("ready", {
            tenantId: auth.tenantId,
            connectedAt: new Date().toISOString(),
          })
        )
      );

      const heartbeat = setInterval(async () => {
        if (closed) return;
        try {
          const [activity] = await prisma.$queryRaw<Array<{ latest: Date | null }>>(
            Prisma.sql`
              SELECT MAX(created_at) AS latest
              FROM crm_activity_logs
              WHERE tenant_id = ${auth.tenantId}
            `
          );
          controller.enqueue(
            encoder.encode(
              eventChunk("pulse", {
                latestActivityAt: activity?.latest ? activity.latest.toISOString() : null,
                ts: new Date().toISOString(),
              })
            )
          );
        } catch {
          controller.enqueue(
            encoder.encode(eventChunk("pulse", { latestActivityAt: null, ts: new Date().toISOString() }))
          );
        }
      }, 12000);

      setTimeout(() => {
        clearInterval(heartbeat);
        if (!closed) {
          controller.enqueue(encoder.encode(eventChunk("close", { reason: "refresh-channel" })));
          controller.close();
        }
      }, 58000);
    },
    cancel() {
      closed = true;
    },
  });

  return new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
