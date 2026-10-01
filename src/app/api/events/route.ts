import { NextRequest } from "next/server";
import { realtimeBus, RealtimePayload } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: any) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // stream closed
        }
      };

      // Initial connection heartbeat
      send({ type: "CONNECTED", timestamp: new Date().toISOString() });

      const onEvent = (payload: RealtimePayload) => {
        send(payload);
      };

      realtimeBus.on("realtime", onEvent);

      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`));
        } catch {
          clearInterval(keepAlive);
        }
      }, 15000);

      req.signal.addEventListener("abort", () => {
        clearInterval(keepAlive);
        realtimeBus.off("realtime", onEvent);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
