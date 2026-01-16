import { auth } from "@/auth";
import { allocatorAuditLogger } from "@/lib/allocator/allocator-audit-logger";
import prisma from "@/lib/prisma";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Maximum stream duration: 5 minutes
const MAX_STREAM_DURATION = 5 * 60 * 1000;
const POLL_INTERVAL = 5000;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceSlug: string; }>; },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Resolve params
  const { workspaceSlug } = await params;

  // Resolve workspace by slug & check access
  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
    include: {
      members: {
        where: { userId: session.user.id },
      },
    },
  });

  if (!workspace || workspace.members.length === 0) {
    return NextResponse.json(
      { error: "Workspace not found or access denied" },
      { status: 404 },
    );
  }

  const encoder = new TextEncoder();
  let isClosed = false;
  const startTime = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      const safeEnqueue = (data: string) => {
        if (isClosed) return false;
        try {
          controller.enqueue(encoder.encode(data));
          return true;
        } catch (e) {
          console.error("Failed to enqueue SSE data", e);
          isClosed = true;
          return false;
        }
      };

      // Send initial connection message
      if (!safeEnqueue(`data: ${JSON.stringify({ type: "connected" })}\n\n`)) {
        return;
      }

      // 1. Send recent logs (last 20)
      try {
        const initialLogs = await allocatorAuditLogger.search({
          workspaceId: workspace.id,
          limit: 20,
        });

        if (initialLogs.logs.length > 0) {
          if (
            !safeEnqueue(
              `data: ${JSON.stringify({ type: "initial", logs: initialLogs.logs })}\n\n`,
            )
          ) return;
        }
      } catch (error) {
        console.error("Error fetching initial logs", error);
      }

      let lastCheck = new Date();

      const interval = setInterval(async () => {
        // Check for client disconnect or max duration
        if (isClosed || (Date.now() - startTime > MAX_STREAM_DURATION)) {
          clearInterval(interval);
          if (!isClosed) {
            try {
              controller.close();
            } catch (_e) {
              // ignore
            }
          }
          return;
        }

        try {
          const newLogs = await allocatorAuditLogger.search({
            workspaceId: workspace.id,
            startDate: lastCheck,
            limit: 50,
          });

          if (newLogs.logs.length > 0) {
            // Send update
            if (
              !safeEnqueue(
                `data: ${JSON.stringify({ type: "update", logs: newLogs.logs })}\n\n`,
              )
            ) {
              clearInterval(interval);
              return;
            }

            // Update lastCheck to the newest log's date
            const latestLog = newLogs.logs[0];
            if (latestLog) {
              lastCheck = new Date(latestLog.createdAt.getTime() + 1);
            }
          }
        } catch (error) {
          console.error("Error in stream poll", error);
        }
      }, POLL_INTERVAL);

      const cleanup = () => {
        isClosed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch (_e) {
          // ignore
        }
      };

      req.signal.onabort = cleanup;
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
