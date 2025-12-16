import { auth } from "@/auth";
import { getUserFriendlyError } from "@/lib/errors/error-messages";
import { generateRequestId, logger } from "@/lib/errors/structured-logger";
import prisma from "@/lib/prisma";
import { checkRateLimit, rateLimitConfigs } from "@/lib/rate-limiter";
import { processAndUploadImage } from "@/lib/storage/upload-handler";
import { TokenBalanceManager } from "@/lib/tokens/balance-manager";
import { ENHANCEMENT_COSTS } from "@/lib/tokens/costs";
import { isSecureFilename } from "@/lib/upload/validation";
import { enhanceImageDirect, type EnhanceImageInput } from "@/workflows/enhance-image.direct";
import { enhanceImage } from "@/workflows/enhance-image.workflow";
import { JobStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { start } from "workflow/api";

// Allow longer execution time for image processing
export const maxDuration = 300;

// Check if we're running in Vercel environment
function isVercelEnvironment(): boolean {
  return process.env.VERCEL === "1";
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const requestLogger = logger.child({
    requestId,
    route: "/api/images/upload",
  });

  try {
    requestLogger.info("Upload request received");

    const session = await auth();
    if (!session?.user?.id) {
      requestLogger.warn("Unauthorized upload attempt");
      const errorMessage = getUserFriendlyError(new Error("Unauthorized"), 401);
      return NextResponse.json(
        {
          error: errorMessage.message,
          title: errorMessage.title,
          suggestion: errorMessage.suggestion,
        },
        { status: 401, headers: { "X-Request-ID": requestId } },
      );
    }

    requestLogger.info("User authenticated", { userId: session.user.id });

    // Check rate limit before processing
    const rateLimitResult = await checkRateLimit(
      `upload:${session.user.id}`,
      rateLimitConfigs.imageUpload,
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

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const albumId = formData.get("albumId") as string | null;

    if (!file) {
      requestLogger.warn("No file provided");
      const errorMessage = getUserFriendlyError(
        new Error("Invalid input"),
        400,
      );
      return NextResponse.json(
        {
          error: errorMessage.message,
          title: errorMessage.title,
          suggestion: "Please provide a file to upload.",
        },
        { status: 400, headers: { "X-Request-ID": requestId } },
      );
    }

    // albumId is now required
    if (!albumId) {
      requestLogger.warn("No album ID provided");
      const errorMessage = getUserFriendlyError(
        new Error("Invalid input"),
        400,
      );
      return NextResponse.json(
        {
          error: errorMessage.message,
          title: errorMessage.title,
          suggestion: "Please select an album before uploading.",
        },
        { status: 400, headers: { "X-Request-ID": requestId } },
      );
    }

    // Validate filename for security (path traversal, hidden files)
    if (!isSecureFilename(file.name)) {
      requestLogger.warn("Insecure filename rejected", { filename: file.name });
      return NextResponse.json(
        {
          error:
            "Invalid filename. Filenames cannot contain path traversal characters or be hidden files.",
        },
        { status: 400, headers: { "X-Request-ID": requestId } },
      );
    }

    // Validate album exists and belongs to user
    const album = await prisma.album.findFirst({
      where: {
        id: albumId,
        userId: session.user.id,
      },
    });

    if (!album) {
      requestLogger.warn("Invalid album ID", {
        albumId,
        userId: session.user.id,
      });
      const errorMessage = getUserFriendlyError(
        new Error("Invalid input"),
        400,
      );
      return NextResponse.json(
        {
          error: errorMessage.message,
          title: errorMessage.title,
          suggestion: "Album not found or you don't have access to it.",
        },
        { status: 400, headers: { "X-Request-ID": requestId } },
      );
    }

    // Check token balance for auto-enhancement
    const tokenCost = ENHANCEMENT_COSTS[album.defaultTier];
    const hasEnoughTokens = await TokenBalanceManager.hasEnoughTokens(
      session.user.id,
      tokenCost,
    );

    if (!hasEnoughTokens) {
      const { balance } = await TokenBalanceManager.getBalance(session.user.id);
      requestLogger.warn("Insufficient tokens for upload", {
        userId: session.user.id,
        required: tokenCost,
        available: balance,
      });
      const errorMessage = getUserFriendlyError(
        new Error("Insufficient tokens"),
        402,
      );
      return NextResponse.json(
        {
          error: errorMessage.message,
          title: errorMessage.title,
          suggestion:
            `You need ${tokenCost} tokens to upload and enhance this image. You have ${balance} tokens.`,
          required: tokenCost,
          balance,
        },
        { status: 402, headers: { "X-Request-ID": requestId } },
      );
    }

    requestLogger.info("Processing file upload", {
      filename: file.name,
      fileSize: file.size,
      userId: session.user.id,
    });

    // Ensure user exists in database (upsert for JWT-based auth)
    await prisma.user.upsert({
      where: { id: session.user.id },
      update: {
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      },
      create: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      },
    });

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Process and upload image
    const result = await processAndUploadImage({
      buffer,
      originalFilename: file.name,
      userId: session.user.id,
    });

    if (!result.success) {
      requestLogger.error(
        "Upload processing failed",
        new Error(result.error || "Unknown error"),
        {
          filename: file.name,
          userId: session.user.id,
        },
      );
      const errorMessage = getUserFriendlyError(
        new Error(result.error || "Upload processing failed"),
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

    // Create database record
    const enhancedImage = await prisma.enhancedImage.create({
      data: {
        userId: session.user.id,
        name: file.name,
        originalUrl: result.url,
        originalR2Key: result.r2Key,
        originalWidth: result.width,
        originalHeight: result.height,
        originalSizeBytes: result.sizeBytes,
        originalFormat: result.format,
        isPublic: false,
      },
    });

    // Create junction record to link image to album
    await prisma.albumImage.create({
      data: {
        albumId,
        imageId: enhancedImage.id,
      },
    });

    // Consume tokens for auto-enhancement
    const consumeResult = await TokenBalanceManager.consumeTokens({
      userId: session.user.id,
      amount: tokenCost,
      source: "image_upload_enhancement",
      sourceId: enhancedImage.id,
      metadata: { tier: album.defaultTier, requestId, albumId },
    });

    if (!consumeResult.success) {
      requestLogger.error(
        "Failed to consume tokens after upload",
        new Error(consumeResult.error),
        { userId: session.user.id, imageId: enhancedImage.id },
      );
      // Image is uploaded but enhancement won't start
      // Return success but without enhancement
      return NextResponse.json(
        {
          success: true,
          image: {
            id: enhancedImage.id,
            name: enhancedImage.name,
            url: enhancedImage.originalUrl,
            width: enhancedImage.originalWidth,
            height: enhancedImage.originalHeight,
            size: enhancedImage.originalSizeBytes,
            format: enhancedImage.originalFormat,
          },
          enhancement: null,
          warning: "Image uploaded but enhancement could not start due to token error",
        },
        { headers: { "X-Request-ID": requestId } },
      );
    }

    // Create enhancement job
    const job = await prisma.imageEnhancementJob.create({
      data: {
        imageId: enhancedImage.id,
        userId: session.user.id,
        tier: album.defaultTier,
        tokensCost: tokenCost,
        status: JobStatus.PROCESSING,
        processingStartedAt: new Date(),
        pipelineId: album.pipelineId,
      },
    });

    requestLogger.info("Enhancement job created for upload", {
      jobId: job.id,
      tier: album.defaultTier,
    });

    // Start enhancement workflow
    const enhancementInput: EnhanceImageInput = {
      jobId: job.id,
      imageId: enhancedImage.id,
      userId: session.user.id,
      originalR2Key: result.r2Key,
      tier: album.defaultTier,
      tokensCost: tokenCost,
    };

    if (isVercelEnvironment()) {
      const workflowRun = await start(enhanceImage, [enhancementInput]);
      if (workflowRun?.runId) {
        try {
          await prisma.imageEnhancementJob.update({
            where: { id: job.id },
            data: { workflowRunId: workflowRun.runId },
          });
        } catch (updateError) {
          requestLogger.error(
            "Failed to store workflowRunId",
            updateError instanceof Error ? updateError : new Error(String(updateError)),
            { jobId: job.id },
          );
        }
      }
      requestLogger.info("Enhancement workflow started (production)", {
        jobId: job.id,
        workflowRunId: workflowRun?.runId,
      });
    } else {
      // Development: Run enhancement directly
      requestLogger.info("Running enhancement directly (dev mode)", { jobId: job.id });
      enhanceImageDirect(enhancementInput).catch((error) => {
        requestLogger.error(
          "Direct enhancement failed",
          error instanceof Error ? error : new Error(String(error)),
          { jobId: job.id },
        );
      });
    }

    requestLogger.info("Upload completed successfully with auto-enhancement", {
      imageId: enhancedImage.id,
      jobId: job.id,
      filename: file.name,
    });

    return NextResponse.json(
      {
        success: true,
        image: {
          id: enhancedImage.id,
          name: enhancedImage.name,
          url: enhancedImage.originalUrl,
          width: enhancedImage.originalWidth,
          height: enhancedImage.originalHeight,
          size: enhancedImage.originalSizeBytes,
          format: enhancedImage.originalFormat,
        },
        enhancement: {
          jobId: job.id,
          tier: album.defaultTier,
          tokenCost,
          newBalance: consumeResult.balance,
        },
      },
      { headers: { "X-Request-ID": requestId } },
    );
  } catch (error) {
    requestLogger.error(
      "Unexpected error in upload API",
      error instanceof Error ? error : new Error(String(error)),
    );
    const errorMessage = getUserFriendlyError(
      error instanceof Error ? error : new Error("Upload failed"),
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
