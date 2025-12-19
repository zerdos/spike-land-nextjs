import { auth } from "@/auth";
import { getUserFriendlyError } from "@/lib/errors/error-messages";
import { generateRequestId, logger } from "@/lib/errors/structured-logger";
import prisma from "@/lib/prisma";
import { checkRateLimit, rateLimitConfigs } from "@/lib/rate-limiter";
import { TokenBalanceManager } from "@/lib/tokens/balance-manager";
import { ENHANCEMENT_COSTS } from "@/lib/tokens/costs";
import { attributeConversion } from "@/lib/tracking/attribution";
import { tryCatch } from "@/lib/try-catch";
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

  const { data: body, error: jsonError } = await tryCatch(request.json());
  if (jsonError) {
    requestLogger.error(
      "Failed to parse request body",
      jsonError instanceof Error ? jsonError : new Error(String(jsonError)),
    );
    const errorMessage = getUserFriendlyError(
      jsonError instanceof Error ? jsonError : new Error("Invalid JSON"),
      400,
    );
    return NextResponse.json(
      {
        error: errorMessage.message,
        title: errorMessage.title,
        suggestion: "Please provide a valid JSON request body.",
      },
      { status: 400, headers: { "X-Request-ID": requestId } },
    );
  }

  const { imageId, tier, blendSource } = body as {
    imageId: string;
    tier: EnhancementTier;
    /** Optional: blend source for image mixing */
    blendSource?: {
      // Option A: Upload (existing) - base64 data from file drop
      base64?: string;
      mimeType?: string;
      // Option B: Stored image (new) - reference to existing image by ID
      imageId?: string;
    };
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

  // Variables to track blend source for job creation
  let resolvedBlendSource: { base64: string; mimeType: string; } | null = null;
  let sourceImageId: string | null = null;

  // Validate blend source data (if provided)
  if (blendSource) {
    // Option B: Blend with stored image by ID
    if (blendSource.imageId) {
      const { data: sourceImage, error: sourceError } = await tryCatch(
        prisma.enhancedImage.findUnique({
          where: { id: blendSource.imageId },
          select: {
            id: true,
            userId: true,
            originalUrl: true,
            originalFormat: true,
          },
        }),
      );

      if (sourceError || !sourceImage) {
        requestLogger.warn("Blend source image not found", {
          sourceImageId: blendSource.imageId,
        });
        return NextResponse.json(
          {
            error: "Blend source image not found",
            title: "Image not found",
            suggestion: "The selected image may have been deleted.",
          },
          { status: 404, headers: { "X-Request-ID": requestId } },
        );
      }

      // Verify user owns the source image
      if (sourceImage.userId !== session.user.id) {
        requestLogger.warn("User does not own blend source image", {
          sourceImageId: blendSource.imageId,
          userId: session.user.id,
        });
        return NextResponse.json(
          {
            error: "Access denied to blend source image",
            title: "Access denied",
            suggestion: "You can only blend with your own images.",
          },
          { status: 403, headers: { "X-Request-ID": requestId } },
        );
      }

      // Fetch the image from R2 and convert to base64
      const { data: fetchResponse, error: fetchError } = await tryCatch(
        fetch(sourceImage.originalUrl, {
          headers: { "Accept": "image/*" },
        }),
      );

      if (fetchError || !fetchResponse || !fetchResponse.ok) {
        requestLogger.error(
          "Failed to fetch blend source image from R2",
          fetchError instanceof Error ? fetchError : new Error("Fetch failed"),
          { sourceImageId: blendSource.imageId, url: sourceImage.originalUrl },
        );
        return NextResponse.json(
          {
            error: "Failed to load blend source image",
            title: "Image load failed",
            suggestion: "Please try again or select a different image.",
          },
          { status: 500, headers: { "X-Request-ID": requestId } },
        );
      }

      const { data: arrayBuffer, error: bufferError } = await tryCatch(
        fetchResponse.arrayBuffer(),
      );

      if (bufferError || !arrayBuffer) {
        requestLogger.error(
          "Failed to read blend source image data",
          bufferError instanceof Error ? bufferError : new Error("Buffer read failed"),
          { sourceImageId: blendSource.imageId },
        );
        return NextResponse.json(
          {
            error: "Failed to process blend source image",
            title: "Processing failed",
            suggestion: "Please try again or select a different image.",
          },
          { status: 500, headers: { "X-Request-ID": requestId } },
        );
      }

      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const mimeType = fetchResponse.headers.get("content-type") ||
        `image/${sourceImage.originalFormat || "jpeg"}`;

      resolvedBlendSource = { base64, mimeType };
      sourceImageId = sourceImage.id;

      requestLogger.info("Blend mode: stored image resolved", {
        sourceImageId: sourceImage.id,
        targetImageId: imageId,
        mimeType,
      });
    } // Option A: Blend with uploaded file (base64)
    else if (blendSource.base64) {
      if (typeof blendSource.base64 !== "string") {
        requestLogger.warn("Invalid blend source - invalid base64 data");
        return NextResponse.json(
          {
            error: "Invalid blend image data",
            title: "Invalid blend",
            suggestion: "Please try dropping the image again.",
          },
          { status: 400, headers: { "X-Request-ID": requestId } },
        );
      }

      if (!blendSource.mimeType || !blendSource.mimeType.startsWith("image/")) {
        requestLogger.warn("Invalid blend source - invalid mimeType", {
          mimeType: blendSource.mimeType,
        });
        return NextResponse.json(
          {
            error: "Invalid blend image type",
            title: "Invalid blend",
            suggestion: "Please use a valid image file (JPEG, PNG, WebP, or GIF).",
          },
          { status: 400, headers: { "X-Request-ID": requestId } },
        );
      }

      // Validate base64 size (rough estimate: base64 adds ~33% overhead)
      const estimatedSize = (blendSource.base64.length * 3) / 4;
      const maxSize = 20 * 1024 * 1024; // 20MB
      if (estimatedSize > maxSize) {
        requestLogger.warn("Blend source too large", {
          estimatedSize,
          maxSize,
        });
        return NextResponse.json(
          {
            error: "Blend image is too large",
            title: "File too large",
            suggestion: "Please use an image smaller than 20MB.",
          },
          { status: 400, headers: { "X-Request-ID": requestId } },
        );
      }

      resolvedBlendSource = {
        base64: blendSource.base64,
        mimeType: blendSource.mimeType,
      };

      requestLogger.info("Blend mode: uploaded file validated", {
        mimeType: blendSource.mimeType,
        targetImageId: imageId,
      });
    } else {
      requestLogger.warn("Invalid blend source - no imageId or base64 provided");
      return NextResponse.json(
        {
          error: "Invalid blend source",
          title: "Invalid blend",
          suggestion: "Please provide either an image ID or base64 data.",
        },
        { status: 400, headers: { "X-Request-ID": requestId } },
      );
    }
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

  const { data: job, error: jobError } = await tryCatch(
    prisma.imageEnhancementJob.create({
      data: {
        imageId,
        userId: session.user.id,
        tier,
        tokensCost: tokenCost,
        status: JobStatus.PROCESSING,
        processingStartedAt: new Date(),
        // Set sourceImageId when blending with stored image (null for uploaded files)
        sourceImageId: sourceImageId,
      },
    }),
  );

  if (jobError || !job) {
    requestLogger.error(
      "Failed to create enhancement job",
      jobError instanceof Error ? jobError : new Error(String(jobError)),
      { userId: session.user.id, imageId },
    );
    // Refund tokens since job creation failed
    await TokenBalanceManager.refundTokens(
      session.user.id,
      tokenCost,
      "job-creation-failed",
      "Failed to create enhancement job",
    );
    const errorMessage = getUserFriendlyError(
      jobError instanceof Error ? jobError : new Error("Failed to create job"),
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

  requestLogger.info("Enhancement job created", {
    jobId: job.id,
    tier,
    isBlend: !!resolvedBlendSource,
    sourceImageId: sourceImageId,
  });

  // Track enhancement conversion attribution for campaign analytics (first enhancement only)
  // Fire-and-forget: don't block the response on attribution tracking
  void (async () => {
    const { error } = await tryCatch(
      attributeConversion(session.user.id, "ENHANCEMENT", tokenCost),
    );
    if (error) {
      requestLogger.warn("Failed to track enhancement attribution", {
        userId: session.user.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })();

  const enhancementInput: EnhanceImageInput = {
    jobId: job.id,
    imageId: image.id,
    userId: session.user.id,
    originalR2Key: image.originalR2Key,
    tier,
    tokensCost: tokenCost,
    blendSource: resolvedBlendSource, // Resolved blend source (from stored image or uploaded file)
  };

  if (isVercelEnvironment()) {
    // Production: Use Vercel's durable workflow infrastructure
    const { data: workflowRun, error: workflowError } = await tryCatch(
      start(enhanceImage, [enhancementInput]),
    );

    if (workflowError) {
      requestLogger.error(
        "Failed to start enhancement workflow",
        workflowError instanceof Error
          ? workflowError
          : new Error(String(workflowError)),
        { jobId: job.id },
      );
      // Mark job as failed and refund tokens
      await tryCatch(
        prisma.imageEnhancementJob.update({
          where: { id: job.id },
          data: {
            status: JobStatus.REFUNDED,
            errorMessage: "Failed to start workflow",
          },
        }),
      );
      await TokenBalanceManager.refundTokens(
        session.user.id,
        tokenCost,
        job.id,
        "Workflow startup failed",
      );
      const errorMessage = getUserFriendlyError(
        workflowError instanceof Error
          ? workflowError
          : new Error("Failed to start workflow"),
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
    void (async () => {
      const { error } = await tryCatch(enhanceImageDirect(enhancementInput));
      if (error) {
        requestLogger.error(
          "Direct enhancement failed",
          error instanceof Error ? error : new Error(String(error)),
          {
            jobId: job.id,
          },
        );
      }
    })();
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
}
