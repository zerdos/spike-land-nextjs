import { auth } from "@/auth";
import { getUserFriendlyError } from "@/lib/errors/error-messages";
import { generateRequestId, logger } from "@/lib/errors/structured-logger";
import prisma from "@/lib/prisma";
import { checkRateLimit, rateLimitConfigs } from "@/lib/rate-limiter";
import { TokenBalanceManager } from "@/lib/tokens/balance-manager";
import { ENHANCEMENT_COSTS } from "@/lib/tokens/costs";
import { tryCatch } from "@/lib/try-catch";
import { enhanceImageDirect, type EnhanceImageInput } from "@/workflows/enhance-image.direct";
import { enhanceImage } from "@/workflows/enhance-image.workflow";
import { EnhancementTier, JobStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { start } from "workflow/api";

// Allow longer execution time for parallel 4K image enhancements (10 minutes)
export const maxDuration = 600;

// Check if we're running in Vercel environment
function isVercelEnvironment(): boolean {
  return process.env.VERCEL === "1";
}

interface ParallelEnhanceRequest {
  imageId: string;
  tiers: EnhancementTier[];
}

interface JobResponse {
  jobId: string;
  tier: EnhancementTier;
  tokenCost: number;
  status: "PROCESSING";
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const requestLogger = logger.child({
    requestId,
    route: "/api/images/parallel-enhance",
  });

  requestLogger.info("Parallel enhancement request received");

  const session = await auth();
  if (!session?.user?.id) {
    requestLogger.warn("Unauthorized parallel enhancement attempt");
    const errorMessage = getUserFriendlyError(new Error("Unauthorized"), 401);
    return NextResponse.json(
      {
        error: errorMessage.message,
        title: errorMessage.title,
        suggestion: errorMessage.suggestion,
      },
      { status: 401 },
    );
  }

  requestLogger.info("User authenticated", { userId: session.user.id });

  // Check rate limit before processing
  const rateLimitResult = await checkRateLimit(
    `enhance:${session.user.id}`,
    rateLimitConfigs.imageEnhancement,
  );

  if (rateLimitResult.isLimited) {
    requestLogger.warn("Rate limit exceeded", { userId: session.user.id });
    const errorMessage = getUserFriendlyError(new Error("Rate limit"), 429);
    const retryAfter = Math.ceil(
      (rateLimitResult.resetAt - Date.now()) / 1000,
    );
    return NextResponse.json(
      {
        error: errorMessage.message,
        title: errorMessage.title,
        suggestion: errorMessage.suggestion,
        retryAfter,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rateLimitResult.resetAt),
          "X-Request-ID": requestId,
        },
      },
    );
  }

  const body = await request.json();
  const { imageId, tiers } = body as ParallelEnhanceRequest;

  // Validate input
  if (!imageId || !tiers || !Array.isArray(tiers)) {
    requestLogger.warn("Missing or invalid required fields", {
      imageId,
      tiers,
    });
    const errorMessage = getUserFriendlyError(
      new Error("Invalid input"),
      400,
    );
    return NextResponse.json(
      {
        error: errorMessage.message,
        title: errorMessage.title,
        suggestion: "Please provide imageId and an array of tiers.",
      },
      { status: 400, headers: { "X-Request-ID": requestId } },
    );
  }

  // Validate tiers array (1-3 unique tiers)
  if (tiers.length === 0 || tiers.length > 3) {
    requestLogger.warn("Invalid tiers array length", {
      tierCount: tiers.length,
    });
    const errorMessage = getUserFriendlyError(
      new Error("Invalid input"),
      400,
    );
    return NextResponse.json(
      {
        error: errorMessage.message,
        title: errorMessage.title,
        suggestion: "Please provide 1-3 enhancement tiers.",
      },
      { status: 400, headers: { "X-Request-ID": requestId } },
    );
  }

  // Check for duplicate tiers
  const uniqueTiers = Array.from(new Set(tiers));
  if (uniqueTiers.length !== tiers.length) {
    requestLogger.warn("Duplicate tiers detected", { tiers });
    const errorMessage = getUserFriendlyError(
      new Error("Invalid input"),
      400,
    );
    return NextResponse.json(
      {
        error: errorMessage.message,
        title: errorMessage.title,
        suggestion: "Each tier can only be selected once.",
      },
      { status: 400, headers: { "X-Request-ID": requestId } },
    );
  }

  // Validate all tiers are valid
  const validTiers = Object.keys(ENHANCEMENT_COSTS) as EnhancementTier[];
  const invalidTiers = tiers.filter((tier) => !validTiers.includes(tier));
  if (invalidTiers.length > 0) {
    requestLogger.warn("Invalid tiers", { invalidTiers });
    const errorMessage = getUserFriendlyError(
      new Error("Invalid input"),
      400,
    );
    return NextResponse.json(
      {
        error: errorMessage.message,
        title: errorMessage.title,
        suggestion: "Please select valid enhancement tiers (TIER_1K, TIER_2K, or TIER_4K).",
      },
      { status: 400, headers: { "X-Request-ID": requestId } },
    );
  }

  // Verify image exists and user has access
  const { data: image, error: imageError } = await tryCatch(
    prisma.enhancedImage.findUnique({
      where: { id: imageId },
    }),
  );

  if (imageError) {
    requestLogger.error(
      "Unexpected error in parallel enhance API",
      imageError,
    );
    const errorMessage = getUserFriendlyError(imageError, 500);
    return NextResponse.json(
      {
        error: errorMessage.message,
        title: errorMessage.title,
        suggestion: errorMessage.suggestion,
      },
      { status: 500, headers: { "X-Request-ID": requestId } },
    );
  }

  if (!image || image.userId !== session.user.id) {
    requestLogger.warn("Image not found or access denied", {
      imageId,
      userId: session.user.id,
    });
    const errorMessage = getUserFriendlyError(new Error("Not found"), 404);
    return NextResponse.json(
      {
        error: errorMessage.message,
        title: errorMessage.title,
        suggestion: errorMessage.suggestion,
      },
      { status: 404, headers: { "X-Request-ID": requestId } },
    );
  }

  // Calculate total token cost
  const totalCost = tiers.reduce(
    (sum, tier) => sum + ENHANCEMENT_COSTS[tier],
    0,
  );

  requestLogger.info("Calculated total cost", { totalCost, tiers });

  // Check if user has enough tokens for ALL tiers
  const hasEnough = await TokenBalanceManager.hasEnoughTokens(
    session.user.id,
    totalCost,
  );

  if (!hasEnough) {
    requestLogger.warn("Insufficient tokens for parallel enhancement", {
      userId: session.user.id,
      required: totalCost,
    });
    const errorMessage = getUserFriendlyError(
      new Error("Insufficient tokens"),
      402,
    );
    return NextResponse.json(
      {
        error: errorMessage.message,
        title: errorMessage.title,
        suggestion: errorMessage.suggestion,
        required: totalCost,
      },
      { status: 402, headers: { "X-Request-ID": requestId } },
    );
  }

  // Use transaction to atomically:
  // 1. Consume tokens
  // 2. Create all jobs

  const { data: result, error: transactionError } = await tryCatch(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prisma.$transaction(async (tx: any) => {
      // Consume tokens atomically
      const tokenBalance = await tx.userTokenBalance.findUnique({
        where: { userId: session.user.id },
      });

      if (!tokenBalance) {
        // Ensure User record exists
        await tx.user.upsert({
          where: { id: session.user.id },
          update: {},
          create: { id: session.user.id },
        });

        // Create initial balance
        await tx.userTokenBalance.create({
          data: {
            userId: session.user.id,
            balance: 0,
            lastRegeneration: new Date(),
          },
        });
      }

      // Re-check balance within transaction
      const currentBalance = await tx.userTokenBalance.findUnique({
        where: { userId: session.user.id },
      });

      if (!currentBalance || currentBalance.balance < totalCost) {
        throw new Error(
          `Insufficient tokens. Required: ${totalCost}, Available: ${currentBalance?.balance ?? 0}`,
        );
      }

      // Update balance
      const updatedBalance = await tx.userTokenBalance.update({
        where: { userId: session.user.id },
        data: {
          balance: {
            decrement: totalCost,
          },
        },
      });

      // Create transaction record
      await tx.tokenTransaction.create({
        data: {
          userId: session.user.id,
          amount: -totalCost,
          type: "SPEND_ENHANCEMENT",
          source: "parallel_image_enhancement",
          sourceId: imageId,
          balanceAfter: updatedBalance.balance,
          metadata: { tiers, requestId },
        },
      });

      // Create all jobs
      const jobs = await Promise.all(
        tiers.map(async (tier) => {
          const job = await tx.imageEnhancementJob.create({
            data: {
              imageId,
              userId: session.user.id,
              tier,
              tokensCost: ENHANCEMENT_COSTS[tier],
              status: JobStatus.PROCESSING,
              processingStartedAt: new Date(),
            },
          });
          return job;
        }),
      );

      return { jobs, newBalance: updatedBalance.balance };
    }),
  );

  if (transactionError) {
    requestLogger.error(
      "Unexpected error in parallel enhance API",
      transactionError,
    );
    const errorMessage = getUserFriendlyError(transactionError, 500);
    return NextResponse.json(
      {
        error: errorMessage.message,
        title: errorMessage.title,
        suggestion: errorMessage.suggestion,
      },
      { status: 500, headers: { "X-Request-ID": requestId } },
    );
  }

  requestLogger.info("Parallel enhancement jobs created", {
    jobCount: result.jobs.length,
    jobIds: result.jobs.map((j) => j.id),
  });

  // Start all enhancement workflows in parallel (fire-and-forget)
  const workflowPromises = result.jobs.map(async (job) => {
    const enhancementInput: EnhanceImageInput = {
      jobId: job.id,
      imageId: image.id,
      userId: session.user.id,
      originalR2Key: image.originalR2Key,
      tier: job.tier,
      tokensCost: job.tokensCost,
    };

    if (isVercelEnvironment()) {
      // Production: Use Vercel's durable workflow infrastructure
      const workflowRun = await start(enhanceImage, [enhancementInput]);

      // Store the workflow run ID for cancellation support (if available)
      if (workflowRun?.runId) {
        const { error: updateError } = await tryCatch(
          prisma.imageEnhancementJob.update({
            where: { id: job.id },
            data: { workflowRunId: workflowRun.runId },
          }),
        );

        if (updateError) {
          requestLogger.error(
            "Failed to store workflowRunId - job may not be cancellable",
            updateError,
            { jobId: job.id, workflowRunId: workflowRun.runId },
          );
          // Continue - workflow is running, we just can't cancel it
        }
      }

      requestLogger.info("Enhancement workflow started (production)", {
        jobId: job.id,
        tier: job.tier,
        workflowRunId: workflowRun?.runId,
      });
    } else {
      // Development: Run enhancement directly (fire-and-forget)
      requestLogger.info("Running enhancement directly (dev mode)", {
        jobId: job.id,
        tier: job.tier,
      });

      // Fire and forget - don't await, let it run in the background
      enhanceImageDirect(enhancementInput).catch((error) => {
        requestLogger.error(
          "Direct enhancement failed",
          error instanceof Error ? error : new Error(String(error)),
          {
            jobId: job.id,
            tier: job.tier,
          },
        );
      });
    }
  });

  // Don't await the workflows - they run in the background
  Promise.allSettled(workflowPromises).catch((error) => {
    requestLogger.error(
      "Error starting enhancement workflows",
      error instanceof Error ? error : new Error(String(error)),
    );
  });

  // Build response
  const jobsResponse: JobResponse[] = result.jobs.map((job) => ({
    jobId: job.id,
    tier: job.tier,
    tokenCost: job.tokensCost,
    status: "PROCESSING" as const,
  }));

  return NextResponse.json(
    {
      success: true,
      jobs: jobsResponse,
      totalCost,
      newBalance: result.newBalance,
    },
    { headers: { "X-Request-ID": requestId } },
  );
}
