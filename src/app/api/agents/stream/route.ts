/**
 * Agent SSE Stream API
 *
 * GET /api/agents/stream
 * Server-Sent Events endpoint for real-time agent status updates.
 */

import { auth } from "@/auth";
import { getAgentSSEEvents } from "@/lib/agents/redis-client";
import { tryCatch } from "@/lib/try-catch";
import { type NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // Authenticate the request
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;

  // Get last event timestamp from query params
  const { searchParams } = new URL(req.url);
  const lastEventId = searchParams.get("lastEventId");
  let lastTimestamp = lastEventId ? parseInt(lastEventId, 10) : Date.now();

  // Create a TransformStream for SSE
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Function to send SSE event
  const sendEvent = async (
    event: string,
    data: unknown,
    id?: string,
  ) => {
    const eventStr = `event: ${event}\ndata: ${JSON.stringify(data)}\n${id ? `id: ${id}\n` : ""}\n`;
    await writer.write(encoder.encode(eventStr));
  };

  // Function to send heartbeat
  const sendHeartbeat = async () => {
    await sendEvent("heartbeat", { timestamp: Date.now() });
  };

  // Polling interval (check for new events every 2 seconds)
  const pollInterval = 2000;
  let isActive = true;

  // Start polling for events
  const pollForEvents = async () => {
    while (isActive) {
      try {
        const { data: events, error } = await tryCatch(
          getAgentSSEEvents(userId, lastTimestamp),
        );

        if (error) {
          console.error("Error fetching SSE events:", error);
        } else if (events && events.length > 0) {
          for (const event of events) {
            await sendEvent(
              event.type,
              event,
              event.timestamp.toString(),
            );
            lastTimestamp = Math.max(lastTimestamp, event.timestamp);
          }
        }

        // Send heartbeat every poll
        await sendHeartbeat();

        // Wait before next poll
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      } catch (err) {
        console.error("SSE poll error:", err);
        // If write fails, connection is closed
        if (
          err instanceof Error &&
          err.message.includes("WritableStream")
        ) {
          isActive = false;
          break;
        }
        // Otherwise, wait and retry
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }
    }

    // Close writer when done
    try {
      await writer.close();
    } catch {
      // Ignore close errors
    }
  };

  // Handle client disconnect
  req.signal.addEventListener("abort", () => {
    isActive = false;
  });

  // Start polling in background
  pollForEvents().catch((err) => {
    console.error("SSE polling failed:", err);
    isActive = false;
  });

  // Return SSE response
  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
