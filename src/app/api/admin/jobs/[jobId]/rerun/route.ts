/**
 * Admin Job Rerun API
 *
 * POST /api/admin/jobs/[jobId]/rerun - Duplicate and rerun a job
 *
 * Supports both EnhancementJob and McpGenerationJob
 */

import { auth } from "@/auth";
import { isAdminByUserId } from "@/lib/auth/admin-middleware";
import { rerunMcpJob } from "@/lib/mcp/generation-service";
import prisma from "@/lib/prisma";
import { TokenBalanceManager } from "@/lib/tokens/balance-manager";
import { ENHANCEMENT_COSTS } from "@/lib/tokens/costs";
import { tryCatch } from "@/lib/try-catch";
import { enhanceImageDirect } from "@/workflows/enhance-image.direct";
import type { EnhancementTier } from "@prisma/client";
import { JobStatus } from "@prisma/client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ jobId: string; }>;
}

/**
 * POST /api/admin/jobs/[jobId]/rerun
 * Create a duplicate job and start processing
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { jobId } = await params;

  // Auth check
  const { data: session, error: authError } = await tryCatch(auth());
  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: isAdmin } = await tryCatch(isAdminByUserId(session.user.id));
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Try enhancement job first
  const { data: enhancementJob } = await tryCatch(
    prisma.imageEnhancementJob.findUnique({
      where: { id: jobId },
      include: {
        image: {
          select: {
            id: true,
            originalUrl: true,
            originalR2Key: true,
            name: true,
            originalWidth: true,
            originalHeight: true,
          },
        },
      },
    }),
  );

  if (enhancementJob) {
    return await rerunEnhancementJob(enhancementJob);
  }

  // Try MCP job
  const { data: mcpJob } = await tryCatch(
    prisma.mcpGenerationJob.findUnique({
      where: { id: jobId },
      select: { id: true },
    }),
  );

  if (mcpJob) {
    const result = await rerunMcpJob(jobId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({
      success: true,
      newJobId: result.newJobId,
      source: "mcp",
    });
  }

  return NextResponse.json({ error: "Job not found" }, { status: 404 });
}

/**
 * Rerun an enhancement job
 */
async function rerunEnhancementJob(
  job: {
    id: string;
    userId: string;
    tier: EnhancementTier;
    geminiPrompt: string | null;
    imageId: string;
    image: {
      id: string;
      originalUrl: string;
      originalR2Key: string | null;
      name: string;
      originalWidth: number | null;
      originalHeight: number | null;
    };
  },
): Promise<NextResponse> {
  // Validate required R2 key
  if (!job.image.originalR2Key) {
    return NextResponse.json(
      { error: "Cannot rerun job: original R2 key is missing" },
      { status: 400 },
    );
  }

  const tokensCost = ENHANCEMENT_COSTS[job.tier] || 0;

  // Consume tokens for new job
  const consumeResult = await TokenBalanceManager.consumeTokens({
    userId: job.userId,
    amount: tokensCost,
    source: "enhancement_rerun",
    sourceId: job.id,
    metadata: { tier: job.tier, rerunOf: job.id },
  });

  if (!consumeResult.success) {
    return NextResponse.json(
      {
        error: consumeResult.error ||
          `Insufficient token balance. Required: ${tokensCost} tokens`,
      },
      { status: 402 },
    );
  }

  // Create new enhancement job
  const { data: newJob, error: createError } = await tryCatch(
    prisma.imageEnhancementJob.create({
      data: {
        userId: job.userId,
        imageId: job.imageId,
        tier: job.tier,
        tokensCost,
        status: JobStatus.PROCESSING,
        geminiPrompt: job.geminiPrompt,
        processingStartedAt: new Date(),
      },
    }),
  );

  if (createError || !newJob) {
    // Refund tokens if job creation failed
    await TokenBalanceManager.refundTokens(
      job.userId,
      tokensCost,
      job.id,
      "Job creation failed during rerun",
    );
    return NextResponse.json(
      { error: "Failed to create new job" },
      { status: 500 },
    );
  }

  // Start enhancement in background
  enhanceImageDirect({
    jobId: newJob.id,
    imageId: job.image.id,
    userId: job.userId,
    originalR2Key: job.image.originalR2Key,
    tier: job.tier,
    tokensCost,
  }).catch((error) => {
    console.error(`Rerun enhancement job ${newJob.id} failed:`, error);
  });

  return NextResponse.json({
    success: true,
    newJobId: newJob.id,
    source: "enhancement",
    tokensCost,
  });
}
