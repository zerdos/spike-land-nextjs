/**
 * Admin SSE Stream Endpoint
 *
 * Server-Sent Events endpoint for real-time admin dashboard updates.
 * Sends keepalive pings and event notifications to connected clients.
 */

import { auth } from "@/auth";
import { verifyAdminAccess } from "@/lib/auth/admin-middleware";
import { SSE_KEEPALIVE_INTERVAL, SSE_MAX_CONNECTION_MS } from "@/lib/admin/swarm/constants";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const hasAccess = await verifyAdminAccess(session);
  if (!hasAccess) {
    return new Response("Forbidden", { status: 403 });
  }

  const encoder = new TextEncoder();
  let keepaliveInterval: ReturnType<typeof setInterval> | null = null;
  let maxConnectionTimeout: ReturnType<typeof setTimeout> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      let eventId = 0;

      // Send initial connection event
      const connectEvent = formatSSE(++eventId, "connected", {
        userId: session.user?.id,
        timestamp: Date.now(),
      });
      controller.enqueue(encoder.encode(connectEvent));

      // Keepalive ping every 15 seconds
      keepaliveInterval = setInterval(() => {
        try {
          const ping = formatSSE(++eventId, "keepalive", {
            timestamp: Date.now(),
          });
          controller.enqueue(encoder.encode(ping));
        } catch {
          // Client disconnected
          cleanup();
        }
      }, SSE_KEEPALIVE_INTERVAL);

      // Max connection duration (Vercel limit: ~300s, we use 280s)
      maxConnectionTimeout = setTimeout(() => {
        try {
          const closeEvent = formatSSE(++eventId, "connection_closing", {
            reason: "max_duration",
            timestamp: Date.now(),
          });
          controller.enqueue(encoder.encode(closeEvent));
          controller.close();
        } catch {
          // Already closed
        }
        cleanup();
      }, SSE_MAX_CONNECTION_MS);

      // Handle client disconnect
      request.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });

      function cleanup() {
        if (keepaliveInterval) {
          clearInterval(keepaliveInterval);
          keepaliveInterval = null;
        }
        if (maxConnectionTimeout) {
          clearTimeout(maxConnectionTimeout);
          maxConnectionTimeout = null;
        }
      }
    },
    cancel() {
      if (keepaliveInterval) clearInterval(keepaliveInterval);
      if (maxConnectionTimeout) clearTimeout(maxConnectionTimeout);
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

function formatSSE(
  id: number,
  type: string,
  data: Record<string, unknown>,
): string {
  return `id: ${id}\nevent: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
}
