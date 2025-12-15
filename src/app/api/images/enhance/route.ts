import { auth } from "@/auth";
import { getUserFriendlyError } from "@/lib/errors/error-messages";
import { generateRequestId, logger } from "@/lib/errors/structured-logger";
import prisma from "@/lib/prisma";
import { checkRateLimit, rateLimitConfigs } from "@/lib/rate-limiter";
import { TokenBalanceManager } from "@/lib/tokens/balance-manager";
import { ENHANCEMENT_COSTS } from "@/lib/tokens/costs";
import { enhanceImageDirect, type EnhanceImageInput } from "@/workflows/enhance-image.direct";
import { enhanceImage } from "@/workflows/enhance-image.workflow";
import { EnhancementTier, JobStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { start } from "workflow/api";

// Allow longer execution time for 4K image enhancements (5 minutes)
// Vercel Pro plan supports up to 300s function timeout
export const maxDuration = 300;

// Check if we're running in Vercel environment
function isVercelEnvironment(): boolean {
  return process.env.VERCEL === "1";
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const requestLogger = logger.child({
    requestId,
    route: "/api/images/enhance",
  });

  try {
    requestLogger.info("Enhancement request received");

    const session = await auth();
    if (!session?.user?.id) {
      requestLogger.warn("Unauthorized enhancement attempt");
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
    const { imageId, tier } = body as {
      imageId: string;
      tier: EnhancementTier;
    };

    if (!imageId || !tier) {
      requestLogger.warn("Missing required fields", { imageId, tier });
      const errorMessage = getUserFriendlyError(
        new Error("Invalid input"),
        400,
      );
      return NextResponse.json(
        {
          error: errorMessage.message,
          title: errorMessage.title,
          suggestion: "Please provide both imageId and tier.",
        },
        { status: 400, headers: { "X-Request-ID": requestId } },
      );
    }

    if (!Object.keys(ENHANCEMENT_COSTS).includes(tier)) {
      requestLogger.warn("Invalid tier", { tier });
      const errorMessage = getUserFriendlyError(
        new Error("Invalid input"),
        400,
      );
      return NextResponse.json(
        {
          error: errorMessage.message,
          title: errorMessage.title,
          suggestion: "Please select a valid enhancement tier (1K, 2K, or 4K).",
        },
        { status: 400, headers: { "X-Request-ID": requestId } },
      );
    }

    const image = await prisma.enhancedImage.findUnique({
      where: { id: imageId },
    });

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

    const tokenCost = ENHANCEMENT_COSTS[tier];
    const hasEnough = await TokenBalanceManager.hasEnoughTokens(
      session.user.id,
      tokenCost,
    );

    if (!hasEnough) {
      requestLogger.warn("Insufficient tokens", {
        userId: session.user.id,
        required: tokenCost,
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
          required: tokenCost,
        },
        { status: 402, headers: { "X-Request-ID": requestId } },
      );
    }

    const consumeResult = await TokenBalanceManager.consumeTokens({
      userId: session.user.id,
      amount: tokenCost,
      source: "image_enhancement",
      sourceId: imageId,
      metadata: { tier, requestId },
    });

    if (!consumeResult.success) {
      requestLogger.error(
        "Failed to consume tokens",
        new Error(consumeResult.error),
        {
          userId: session.user.id,
        },
      );
      const errorMessage = getUserFriendlyError(
        new Error(consumeResult.error || "Failed to consume tokens"),
        500,
      );
      return NextResponse.json(
        {
          error: errorMessage.message,
          title: errorMessage.title,
          suggestion: errorMessage.suggestion,
        },
        { status: 500, headers: { "X-Request-ID": requestId } },
      );
    }

    const job = await prisma.imageEnhancementJob.create({
      data: {
        imageId,
        userId: session.user.id,
        tier,
        tokensCost: tokenCost,
        status: JobStatus.PROCESSING,
        processingStartedAt: new Date(),
      },
    });

    requestLogger.info("Enhancement job created", { jobId: job.id, tier });

    const enhancementInput: EnhanceImageInput = {
      jobId: job.id,
      imageId: image.id,
      userId: session.user.id,
      originalR2Key: image.originalR2Key,
      tier,
      tokensCost: tokenCost,
    };

    if (isVercelEnvironment()) {
      // Production: Use Vercel's durable workflow infrastructure
      const workflowRun = await start(enhanceImage, [enhancementInput]);

      // Store the workflow run ID for cancellation support (if available)
      if (workflowRun?.runId) {
        try {
          await prisma.imageEnhancementJob.update({
            where: { id: job.id },
            data: { workflowRunId: workflowRun.runId },
          });
        } catch (updateError) {
          requestLogger.error(
            "Failed to store workflowRunId - job may not be cancellable",
            updateError instanceof Error
              ? updateError
              : new Error(String(updateError)),
            { jobId: job.id, workflowRunId: workflowRun.runId },
          );
          // Continue - workflow is running, we just can't cancel it
        }
      }

      requestLogger.info("Enhancement workflow started (production)", {
        jobId: job.id,
        workflowRunId: workflowRun?.runId,
      });
    } else {
      // Development: Run enhancement directly (fire-and-forget)
      // The workflow infrastructure doesn't fully execute in dev mode
      requestLogger.info("Running enhancement directly (dev mode)", {
        jobId: job.id,
      });

      // Fire and forget - don't await, let it run in the background
      enhanceImageDirect(enhancementInput).catch((error) => {
        requestLogger.error(
          "Direct enhancement failed",
          error instanceof Error ? error : new Error(String(error)),
          {
            jobId: job.id,
          },
        );
      });
    }

    return NextResponse.json(
      {
        success: true,
        jobId: job.id,
        tokenCost,
        newBalance: consumeResult.balance,
      },
      { headers: { "X-Request-ID": requestId } },
    );
  } catch (error) {
    requestLogger.error(
      "Unexpected error in enhance API",
      error instanceof Error ? error : new Error(String(error)),
    );
    const errorMessage = getUserFriendlyError(
      error instanceof Error ? error : new Error("Enhancement failed"),
      500,
    );
    return NextResponse.json(
      {
        error: errorMessage.message,
        title: errorMessage.title,
        suggestion: errorMessage.suggestion,
      },
      { status: 500, headers: { "X-Request-ID": requestId } },
    );
  }
}
