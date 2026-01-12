import { auth } from "@/auth";
import { allocatorAuditLogger } from "@/lib/allocator/allocator-audit-logger";
import prisma from "@/lib/prisma";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { workspaceSlug: string; }; },
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
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const encoder = new TextEncoder();
  let isClosed = false;

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection message
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`));

      // 1. Send recent logs (last 50)
      try {
        const initialLogs = await allocatorAuditLogger.search({
          workspaceId: workspace.id,
          limit: 20,
        });

        if (initialLogs.logs.length > 0) {
          // Send individually or as a batch? Usually individual for stream is nice, but batch is more efficient.
          // Let's send a batch event for initial load
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "initial", logs: initialLogs.logs })}\n\n`,
            ),
          );
        }
      } catch (error) {
        console.error("Error fetching initial logs", error);
      }

      let lastCheck = new Date();

      // Polling loop
      // Determine if we need to filter by specific correlationId?
      // User can filter client side, but server side filtering saves bandwidth.
      // For now, stream ALL workspace events.

      const interval = setInterval(async () => {
        if (isClosed) {
          clearInterval(interval);
          return;
        }

        try {
          const newLogs = await allocatorAuditLogger.search({
            workspaceId: workspace.id,
            startDate: lastCheck,
            limit: 50,
          });

          if (newLogs.logs.length > 0) {
            // Filter out logs strictly older/equal to lastCheck if handled by db query
            // The search uses gte, so we might get duplicates if timestamp matches exactly.
            // Ideally we track by ID, but simplified for now.

            // Send update
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "update", logs: newLogs.logs })}\n\n`),
            );

            // Update lastCheck to the newest log's date
            // Assuming logs[0] is newest
            const latestLog = newLogs.logs[0]; // items are sorted desc by default in search?
            // search sorts desc. So [0] is latest.
            if (latestLog) {
              lastCheck = new Date(latestLog.createdAt.getTime() + 1);
            }
          }
        } catch (error) {
          console.error("Error in stream poll", error);
        }
      }, 5000); // Poll every 5 seconds

      req.signal.onabort = () => {
        isClosed = true;
        clearInterval(interval);
        controller.close();
      };
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
