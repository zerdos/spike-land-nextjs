import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { isAgentWorking } from "@/lib/upstash";
import type { NextRequest } from "next/server";

// Event types for SSE
export type SSEEventType =
  | "connected"
  | "message"
  | "status"
  | "agent_working"
  | "code_updated"
  | "sync_in_progress"
  | "heartbeat";

interface SSEEvent {
  type: SSEEventType;
  data: unknown;
  timestamp: number;
}

/**
 * SSE Connection Store
 *
 * IMPORTANT: Current implementation uses in-memory storage which has limitations:
 *
 * 1. SINGLE INSTANCE ONLY: Connections are not shared across server instances.
 *    In multi-instance deployments (Vercel, Kubernetes), clients connected to
 *    different instances won't receive broadcasts from other instances.
 *
 * 2. NO PERSISTENCE: Connections are lost on server restart.
 *
 * TODO(#805): For production multi-instance support, implement Redis Pub/Sub
 *
 * For now, this works correctly for single-instance deployments.
 */
const activeConnections = new Map<
  string,
  Set<ReadableStreamDefaultController<Uint8Array>>
>();

/**
 * Broadcast an event to all connected clients for an app
 */
export function broadcastToApp(
  appId: string,
  event: Omit<SSEEvent, "timestamp">,
) {
  const connections = activeConnections.get(appId);
  console.log(
    `[SSE] Broadcasting ${event.type} to app ${appId}: ${connections?.size || 0} connections`,
  );
  if (!connections || connections.size === 0) return;

  const fullEvent: SSEEvent = {
    ...event,
    timestamp: Date.now(),
  };

  const eventString = `data: ${JSON.stringify(fullEvent)}\n\n`;
  const encoder = new TextEncoder();
  const encoded = encoder.encode(eventString);

  for (const controller of connections) {
    try {
      controller.enqueue(encoded);
    } catch {
      // Intentionally silent: Connection closed - controller will be cleaned up by stream cancel handler.
      // Logging here would be too noisy for normal SSE disconnections.
    }
  }
}

/**
 * GET /api/apps/[id]/messages/stream
 * SSE endpoint for real-time updates
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string; }>; },
) {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: params, error: paramsError } = await tryCatch(context.params);
  if (paramsError) {
    return new Response(JSON.stringify({ error: "Invalid parameters" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const { id } = params;

  // Verify user owns this app
  const { data: app, error: appError } = await tryCatch(
    prisma.app.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      select: {
        id: true,
        status: true,
      },
    }),
  );

  if (appError) {
    console.error("Error fetching app:", appError);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!app) {
    return new Response(JSON.stringify({ error: "App not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Create readable stream for SSE
  const encoder = new TextEncoder();
  let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef = controller;

      // Add to active connections
      if (!activeConnections.has(id)) {
        activeConnections.set(id, new Set());
      }
      activeConnections.get(id)!.add(controller);
      console.log(
        `[SSE] Client connected to app ${id}. Total connections: ${
          activeConnections.get(id)!.size
        }`,
      );

      // Send connected event
      const connectedEvent: SSEEvent = {
        type: "connected",
        data: { appId: id, status: app.status },
        timestamp: Date.now(),
      };
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(connectedEvent)}\n\n`),
      );

      // Check and send agent working status
      isAgentWorking(id).then((working) => {
        if (working) {
          const workingEvent: SSEEvent = {
            type: "agent_working",
            data: { isWorking: true },
            timestamp: Date.now(),
          };
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(workingEvent)}\n\n`),
            );
          } catch {
            // Intentionally silent: Client disconnected between agent status check and enqueue.
          }
        }
      });

      // Set up heartbeat interval (every 30 seconds)
      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeat: SSEEvent = {
            type: "heartbeat",
            data: null,
            timestamp: Date.now(),
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(heartbeat)}\n\n`),
          );
        } catch {
          // Intentionally silent: Client disconnected - clean up heartbeat interval.
          clearInterval(heartbeatInterval);
        }
      }, 30000);

      // Clean up on close
      const cleanup = () => {
        clearInterval(heartbeatInterval);
        const connections = activeConnections.get(id);
        if (connections) {
          connections.delete(controller);
          if (connections.size === 0) {
            activeConnections.delete(id);
          }
        }
      };

      // Store cleanup function for cancel
      (controller as unknown as { cleanup: () => void; }).cleanup = cleanup;
    },

    cancel() {
      if (controllerRef) {
        const cleanup = (controllerRef as unknown as { cleanup?: () => void; }).cleanup;
        if (cleanup) cleanup();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}

/**
 * Helper to broadcast a new message to app clients
 */
export function broadcastMessage(
  appId: string,
  message: {
    id: string;
    role: string;
    content: string;
    createdAt: Date;
    attachments?: Array<{ imageId: string; url: string; }>;
  },
) {
  broadcastToApp(appId, {
    type: "message",
    data: message,
  });
}

/**
 * Helper to broadcast status change to app clients
 */
export function broadcastStatus(
  appId: string,
  status: string,
  message?: string,
) {
  broadcastToApp(appId, {
    type: "status",
    data: { status, message },
  });
}

/**
 * Helper to broadcast agent working status to app clients
 */
export function broadcastAgentWorking(appId: string, isWorking: boolean) {
  broadcastToApp(appId, {
    type: "agent_working",
    data: { isWorking },
  });
}

/**
 * Helper to broadcast code update to app clients (triggers iframe reload)
 */
export function broadcastCodeUpdated(appId: string) {
  broadcastToApp(appId, {
    type: "code_updated",
    data: { reloadRequired: true },
  });
}
/**
 * Helper to broadcast sync in progress status to app clients
 */
export function broadcastSyncInProgress(appId: string, isSyncing: boolean) {
  broadcastToApp(appId, {
    type: "sync_in_progress",
    data: { isSyncing },
  });
}
