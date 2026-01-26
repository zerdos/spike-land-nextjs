/**
 * Sandbox Cleanup Cron Job
 *
 * Runs every 15 minutes to handle stale sandbox jobs:
 * 1. Marks jobs stuck in PENDING/SPAWNING/RUNNING for >10 min as TIMEOUT
 * 2. Notifies users via system message
 * 3. Attempts to stop any running sandboxes
 *
 * Cron Schedule: every 15 minutes
 */

import { broadcastToApp } from "@/app/api/apps/[id]/messages/stream/route";
import prisma from "@/lib/prisma";
import { stopSandbox } from "@/lib/sandbox/agent-sandbox";
import { tryCatch } from "@/lib/try-catch";
import { setAgentWorking } from "@/lib/upstash/client";
import { NextResponse } from "next/server";

// Cron jobs should complete quickly
export const maxDuration = 30;

// Timeout threshold in minutes
const TIMEOUT_MINUTES = 10;

/**
 * GET /api/cron/cleanup-sandboxes
 *
 * Called by Vercel Cron every 15 minutes
 */
export async function GET(request: Request) {
  // Verify this is called by Vercel Cron (or in development)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env["CRON_SECRET"];

  // In production, verify the cron secret
  if (
    process.env["NODE_ENV"] === "production" &&
    cronSecret &&
    authHeader !== `Bearer ${cronSecret}`
  ) {
    console.warn("[cleanup-sandboxes] Unauthorized cron request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[cleanup-sandboxes] Starting cleanup job");

  const timeoutThreshold = new Date(Date.now() - TIMEOUT_MINUTES * 60 * 1000);

  // Find stale jobs
  const { data: staleJobs, error: findError } = await tryCatch(
    prisma.sandboxJob.findMany({
      where: {
        status: {
          in: ["PENDING", "SPAWNING", "RUNNING"],
        },
        startedAt: {
          lt: timeoutThreshold,
        },
      },
      include: {
        app: {
          select: {
            id: true,
            name: true,
            userId: true,
          },
        },
      },
    }),
  );

  if (findError) {
    console.error("[cleanup-sandboxes] Failed to find stale jobs:", findError);
    return NextResponse.json(
      { error: "Failed to query stale jobs" },
      { status: 500 },
    );
  }

  if (!staleJobs || staleJobs.length === 0) {
    console.log("[cleanup-sandboxes] No stale jobs found");
    return NextResponse.json({
      success: true,
      message: "No stale jobs found",
      processed: 0,
    });
  }

  console.log("[cleanup-sandboxes] Found", staleJobs.length, "stale jobs");

  let processed = 0;
  let errors = 0;

  for (const job of staleJobs) {
    try {
      console.log(
        "[cleanup-sandboxes] Processing stale job:",
        job.id,
        "status:",
        job.status,
        "sandbox:",
        job.sandboxId,
      );

      // Try to stop the sandbox if it has a sandboxId
      if (job.sandboxId) {
        const stopped = await stopSandbox(job.sandboxId);
        console.log(
          "[cleanup-sandboxes] Sandbox",
          job.sandboxId,
          stopped ? "stopped" : "already stopped or not found",
        );
      }

      // Update job to TIMEOUT status
      await prisma.sandboxJob.update({
        where: { id: job.id },
        data: {
          status: "TIMEOUT",
          error: `Job timed out after ${TIMEOUT_MINUTES} minutes`,
          completedAt: new Date(),
        },
      });

      // Create a system message to notify the user
      await prisma.appMessage.create({
        data: {
          appId: job.appId,
          role: "SYSTEM",
          content:
            `⚠️ The agent took too long to respond and was stopped after ${TIMEOUT_MINUTES} minutes. Please try again with a simpler request.`,
        },
      });

      // Clear agent working status
      await setAgentWorking(job.appId, false);

      // Broadcast updates to connected clients
      broadcastToApp(job.appId, {
        type: "status",
        data: {
          error: true,
          message: "Agent request timed out. Please try again.",
        },
      });

      broadcastToApp(job.appId, {
        type: "agent_working",
        data: { isWorking: false },
      });

      processed++;
    } catch (error) {
      console.error(
        "[cleanup-sandboxes] Error processing job:",
        job.id,
        error,
      );
      errors++;
    }
  }

  console.log(
    "[cleanup-sandboxes] Cleanup complete. Processed:",
    processed,
    "Errors:",
    errors,
  );

  return NextResponse.json({
    success: true,
    message: `Processed ${processed} stale jobs`,
    processed,
    errors,
  });
}
