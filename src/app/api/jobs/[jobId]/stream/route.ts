import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

interface JobStreamData {
  type: "status" | "error" | "connected";
  status?: string;
  enhancedUrl?: string | null;
  enhancedWidth?: number | null;
  enhancedHeight?: number | null;
  errorMessage?: string | null;
  message?: string;
}

/**
 * SSE endpoint for real-time job status updates
 *
 * Streams job status changes to the client without requiring polling.
 * The server polls the database internally and pushes updates.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string; }>; },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { jobId } = await params;

  // Verify job exists and belongs to user
  const job = await prisma.imageEnhancementJob.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    return new Response(JSON.stringify({ error: "Job not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (job.userId !== session.user.id) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  let isStreamClosed = false;
  let timeoutId: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: JobStreamData) => {
        if (isStreamClosed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Stream was closed
          isStreamClosed = true;
        }
      };

      // Send initial connected event
      sendEvent({ type: "connected", message: "Connected to job stream" });

      const checkStatus = async () => {
        if (isStreamClosed) return;

        try {
          const currentJob = await prisma.imageEnhancementJob.findUnique({
            where: { id: jobId },
          });

          if (!currentJob) {
            sendEvent({ type: "error", message: "Job not found" });
            controller.close();
            isStreamClosed = true;
            return;
          }

          sendEvent({
            type: "status",
            status: currentJob.status,
            enhancedUrl: currentJob.enhancedUrl,
            enhancedWidth: currentJob.enhancedWidth,
            enhancedHeight: currentJob.enhancedHeight,
            errorMessage: currentJob.errorMessage,
          });

          // Close stream on terminal states
          if (
            currentJob.status === "COMPLETED" ||
            currentJob.status === "FAILED" ||
            currentJob.status === "CANCELLED" ||
            currentJob.status === "REFUNDED"
          ) {
            controller.close();
            isStreamClosed = true;
            return;
          }

          // Continue checking every 1 second (server-side polling)
          timeoutId = setTimeout(checkStatus, 1000);
        } catch (error) {
          console.error("Error checking job status:", error);
          sendEvent({
            type: "error",
            message: "Failed to check job status",
          });
          // Don't close stream on transient errors, retry
          timeoutId = setTimeout(checkStatus, 2000);
        }
      };

      // Start polling
      await checkStatus();
    },

    cancel() {
      isStreamClosed = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    },
  });

  // Handle client disconnect
  request.signal.addEventListener("abort", () => {
    isStreamClosed = true;
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}
