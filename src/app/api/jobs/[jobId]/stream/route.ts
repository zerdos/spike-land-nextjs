import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

interface JobStreamData {
  type: "status" | "error" | "connected";
  status?: string;
  currentStage?: string | null;
  enhancedUrl?: string | null;
  enhancedWidth?: number | null;
  enhancedHeight?: number | null;
  errorMessage?: string | null;
  message?: string;
}

// Polling intervals based on job status (reduced from 1s to reduce DB load)
const PENDING_POLL_INTERVAL = 5000; // 5 seconds for pending jobs (in queue)
const PROCESSING_POLL_INTERVAL = 3000; // 3 seconds for processing jobs
const MAX_POLL_INTERVAL = 5000; // Maximum interval with backoff
const BACKOFF_THRESHOLD = 5; // Start backoff after this many polls

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
  let pollCount = 0;
  let lastSentStage: string | null = null; // Track stage for transition logging

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

      // Calculate next poll interval based on job status and poll count
      const getNextPollInterval = (status: string): number => {
        // Base interval depends on job status
        let baseInterval = status === "PENDING"
          ? PENDING_POLL_INTERVAL
          : PROCESSING_POLL_INTERVAL;

        // Apply exponential backoff after threshold
        if (pollCount > BACKOFF_THRESHOLD) {
          const backoffMultiplier = Math.min(
            Math.pow(1.2, pollCount - BACKOFF_THRESHOLD),
            MAX_POLL_INTERVAL / baseInterval,
          );
          baseInterval = Math.min(baseInterval * backoffMultiplier, MAX_POLL_INTERVAL);
        }

        return Math.round(baseInterval);
      };

      // Send initial connected event
      sendEvent({ type: "connected", message: "Connected to job stream" });

      const checkStatus = async () => {
        if (isStreamClosed) return;
        pollCount++;

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

          // Log stage transitions for debugging
          if (currentJob.currentStage !== lastSentStage) {
            console.log(
              `[JobStream ${jobId}] Stage transition: ${lastSentStage || "none"} → ${
                currentJob.currentStage || "none"
              }`,
            );
            lastSentStage = currentJob.currentStage;
          }

          sendEvent({
            type: "status",
            status: currentJob.status,
            currentStage: currentJob.currentStage,
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

          // Calculate next poll interval based on status and poll count
          const nextInterval = getNextPollInterval(currentJob.status);
          timeoutId = setTimeout(checkStatus, nextInterval);
        } catch (error) {
          console.error("Error checking job status:", error);
          sendEvent({
            type: "error",
            message: "Failed to check job status",
          });
          // Don't close stream on transient errors, retry with backoff
          const nextInterval = getNextPollInterval("PROCESSING");
          timeoutId = setTimeout(checkStatus, nextInterval);
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
