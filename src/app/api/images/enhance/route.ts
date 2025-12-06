import { auth } from "@/auth";
import { enhanceImageWithGemini } from "@/lib/ai/gemini-client";
import { getUserFriendlyError } from "@/lib/errors/error-messages";
import { retryWithBackoff } from "@/lib/errors/retry-logic";
import { generateRequestId, logger } from "@/lib/errors/structured-logger";
import prisma from "@/lib/prisma";
import { checkRateLimit, rateLimitConfigs } from "@/lib/rate-limiter";
import { downloadFromR2, uploadToR2 } from "@/lib/storage/r2-client";
import { TokenBalanceManager } from "@/lib/tokens/balance-manager";
import { ENHANCEMENT_COSTS } from "@/lib/tokens/costs";
import { EnhancementTier, JobStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

const TIER_TO_SIZE = {
  TIER_1K: "1K" as const,
  TIER_2K: "2K" as const,
  TIER_4K: "4K" as const,
};

// Resolution constants for each enhancement tier
const TIER_RESOLUTIONS = {
  TIER_1K: 1024,
  TIER_2K: 2048,
  TIER_4K: 4096,
} as const;

// Image processing constants
const ENHANCED_JPEG_QUALITY = 95; // High quality for enhanced images
const DEFAULT_IMAGE_DIMENSION = 1024; // Fallback dimension if metadata unavailable
const PADDING_BACKGROUND = { r: 0, g: 0, b: 0, alpha: 1 }; // Black background for letterboxing

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const requestLogger = logger.child({ requestId, route: "/api/images/enhance" });

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
    const rateLimitResult = checkRateLimit(
      `enhance:${session.user.id}`,
      rateLimitConfigs.imageEnhancement,
    );

    if (rateLimitResult.isLimited) {
      requestLogger.warn("Rate limit exceeded", { userId: session.user.id });
      const errorMessage = getUserFriendlyError(new Error("Rate limit"), 429);
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
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
    const { imageId, tier } = body as { imageId: string; tier: EnhancementTier; };

    if (!imageId || !tier) {
      requestLogger.warn("Missing required fields", { imageId, tier });
      const errorMessage = getUserFriendlyError(new Error("Invalid input"), 400);
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
      const errorMessage = getUserFriendlyError(new Error("Invalid input"), 400);
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
      requestLogger.warn("Image not found or access denied", { imageId, userId: session.user.id });
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
      requestLogger.error("Failed to consume tokens", new Error(consumeResult.error), {
        userId: session.user.id,
      });
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

    processEnhancement(
      job.id,
      image.originalR2Key,
      tier,
      session.user.id,
      requestId,
    ).catch((error) => {
      requestLogger.error("Enhancement processing failed", error, { jobId: job.id });
    });

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

/**
 * Process image enhancement with aspect ratio preservation
 *
 * Algorithm:
 * 1. Pad input image to square (Gemini requires square inputs)
 * 2. Send to Gemini for enhancement
 * 3. Crop Gemini output back to original aspect ratio
 * 4. Resize to target tier resolution
 *
 * @param jobId - Enhancement job ID
 * @param originalR2Key - R2 storage key for original image
 * @param tier - Enhancement tier (1K/2K/4K)
 * @param userId - User ID for token refunds on failure
 * @param requestId - Request ID for tracing
 */
async function processEnhancement(
  jobId: string,
  originalR2Key: string,
  tier: EnhancementTier,
  userId: string,
  requestId: string,
) {
  const processLogger = logger.child({ requestId, jobId, tier });

  try {
    processLogger.info("Starting enhancement processing");

    // Download original image with retry logic
    const downloadResult = await retryWithBackoff(
      async () => {
        const buffer = await downloadFromR2(originalR2Key);
        if (!buffer) {
          throw new Error("Failed to download original image");
        }
        return buffer;
      },
      {
        maxAttempts: 3,
        onRetry: (error, attempt, delay) => {
          processLogger.warn("Retrying image download", {
            attempt,
            delay,
            error: error.message,
          });
        },
      },
    );

    if (!downloadResult.success || !downloadResult.data) {
      throw new Error(
        `Failed to download image after ${downloadResult.attempts} attempts: ${downloadResult.error?.message}`,
      );
    }

    const originalBuffer = downloadResult.data;
    processLogger.debug("Original image downloaded successfully");

    // Get original image metadata for aspect ratio preservation and MIME type detection
    const originalMetadata = await sharp(originalBuffer).metadata();
    const originalWidth = originalMetadata.width || DEFAULT_IMAGE_DIMENSION;
    const originalHeight = originalMetadata.height || DEFAULT_IMAGE_DIMENSION;

    // Detect actual MIME type from image buffer to prevent type confusion attacks
    const detectedFormat = originalMetadata.format;
    const mimeType = detectedFormat
      ? `image/${detectedFormat === "jpeg" ? "jpeg" : detectedFormat}`
      : "image/jpeg"; // fallback for unknown formats

    // Pad image to square to preserve aspect ratio during Gemini generation
    const maxDimension = Math.max(originalWidth, originalHeight);
    const paddedBuffer = await sharp(originalBuffer)
      .resize(maxDimension, maxDimension, {
        fit: "contain",
        background: PADDING_BACKGROUND,
      })
      .toBuffer();

    const base64Image = paddedBuffer.toString("base64");

    const tierSize = TIER_TO_SIZE[tier];

    processLogger.info("Enhancing image with Gemini", {
      resolution: tierSize,
      originalWidth,
      originalHeight,
    });

    // Enhance with Gemini using retry logic
    const geminiResult = await retryWithBackoff(
      async () => {
        return await enhanceImageWithGemini({
          imageData: base64Image,
          mimeType,
          tier: tierSize,
          originalWidth,
          originalHeight,
        });
      },
      {
        maxAttempts: 2, // Gemini calls are expensive, limit retries
        onRetry: (error, attempt, delay) => {
          processLogger.warn("Retrying Gemini enhancement", {
            attempt,
            delay,
            error: error.message,
          });
        },
      },
    );

    if (!geminiResult.success || !geminiResult.data) {
      throw new Error(
        `Gemini enhancement failed after ${geminiResult.attempts} attempts: ${geminiResult.error?.message}`,
      );
    }

    const geminiBuffer = geminiResult.data;
    processLogger.debug("Gemini enhancement completed successfully");

    // Calculate dimensions to crop back to original aspect ratio
    const geminiMetadata = await sharp(geminiBuffer).metadata();
    const geminiSize = geminiMetadata.width;

    if (!geminiSize) {
      throw new Error("Failed to get Gemini output dimensions");
    }

    // Use original aspect ratio for precise calculations
    const aspectRatio = originalWidth / originalHeight;

    let extractLeft = 0;
    let extractTop = 0;
    let extractWidth = geminiSize;
    let extractHeight = geminiSize;

    if (aspectRatio > 1) {
      // Landscape: content is full width, centered vertically
      extractHeight = Math.round(geminiSize / aspectRatio);
      extractTop = Math.round((geminiSize - extractHeight) / 2);
    } else {
      // Portrait/Square: content is full height, centered horizontally
      extractWidth = Math.round(geminiSize * aspectRatio);
      extractLeft = Math.round((geminiSize - extractWidth) / 2);
    }

    // Crop to remove padding and resize to target resolution
    const tierResolution = TIER_RESOLUTIONS[tier];

    let targetWidth: number;
    let targetHeight: number;

    if (aspectRatio > 1) {
      targetWidth = tierResolution;
      targetHeight = Math.round(tierResolution / aspectRatio);
    } else {
      targetHeight = tierResolution;
      targetWidth = Math.round(tierResolution * aspectRatio);
    }

    const enhancedBuffer = await sharp(geminiBuffer)
      .extract({
        left: extractLeft,
        top: extractTop,
        width: extractWidth,
        height: extractHeight,
      })
      .resize(targetWidth, targetHeight, {
        fit: "fill",
        kernel: "lanczos3",
      })
      .jpeg({ quality: ENHANCED_JPEG_QUALITY })
      .toBuffer();

    const metadata = await sharp(enhancedBuffer).metadata();

    // Generate unique R2 key for this enhancement job to prevent overwriting
    // Format: users/{userId}/enhanced/{imageId}/{jobId}.jpg
    const enhancedR2Key = originalR2Key
      .replace("/originals/", `/enhanced/`)
      .replace(/\.[^.]+$/, `/${jobId}.jpg`);

    // Upload enhanced image with retry logic
    const uploadResult = await retryWithBackoff(
      async () => {
        return await uploadToR2({
          key: enhancedR2Key,
          buffer: enhancedBuffer,
          contentType: "image/jpeg",
          metadata: {
            tier,
            jobId,
          },
        });
      },
      {
        maxAttempts: 3,
        onRetry: (error, attempt, delay) => {
          processLogger.warn("Retrying image upload", {
            attempt,
            delay,
            error: error.message,
          });
        },
      },
    );

    if (!uploadResult.success || !uploadResult.data?.success) {
      throw new Error(
        `Failed to upload enhanced image after ${uploadResult.attempts} attempts`,
      );
    }

    processLogger.debug("Enhanced image uploaded successfully", {
      url: uploadResult.data.url,
    });

    await prisma.imageEnhancementJob.update({
      where: { id: jobId },
      data: {
        status: JobStatus.COMPLETED,
        enhancedUrl: uploadResult.data.url,
        enhancedR2Key,
        enhancedWidth: metadata.width,
        enhancedHeight: metadata.height,
        enhancedSizeBytes: enhancedBuffer.length,
        geminiPrompt: "Enhanced with Gemini AI",
        processingCompletedAt: new Date(),
      },
    });

    processLogger.info("Enhancement completed successfully");
  } catch (error) {
    const enhancementError = error instanceof Error ? error : new Error(String(error));
    processLogger.error("Enhancement processing failed", enhancementError);

    const job = await prisma.imageEnhancementJob.findUnique({
      where: { id: jobId },
    });

    if (job) {
      // Refund tokens on failure
      const refundResult = await TokenBalanceManager.refundTokens(
        userId,
        job.tokensCost,
        jobId,
        enhancementError.message,
      );

      if (refundResult.success) {
        processLogger.info("Tokens refunded", { amount: job.tokensCost });
      } else {
        processLogger.error("Failed to refund tokens", new Error(refundResult.error));
      }

      // Update job status
      await prisma.imageEnhancementJob.update({
        where: { id: jobId },
        data: {
          status: JobStatus.FAILED,
          errorMessage: enhancementError.message,
        },
      });
    }
  }
}
