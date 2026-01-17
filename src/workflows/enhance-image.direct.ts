/**
 * Direct Image Enhancement (Primary Execution Mode)
 *
 * This module provides the primary image enhancement execution path using
 * plain JavaScript with built-in retry logic and error handling.
 *
 * **Features:**
 * - Automatic retries with exponential backoff for transient failures
 * - Retry logic for R2 operations (download/upload)
 * - Retry logic for Gemini API calls (analysis and enhancement)
 * - Full error handling with token refunds on failure
 *
 * **Execution Model:**
 * - Uses Next.js `after()` for background processing (fire-and-forget)
 * - Response returns immediately with job ID
 * - Client polls job status for completion
 */

import {
  analyzeImageV2,
  buildBlendEnhancementPrompt,
  buildDynamicEnhancementPrompt,
  DEFAULT_MODEL,
  DEFAULT_TEMPERATURE,
  enhanceImageWithGemini,
  getModelForTier,
  type ReferenceImageData,
} from "@/lib/ai/gemini-client";
import { retryWithBackoff } from "@/lib/errors/retry-logic";
import prisma from "@/lib/prisma";
import { downloadFromR2, uploadToR2 } from "@/lib/storage/r2-client";
import { TokenBalanceManager } from "@/lib/tokens/balance-manager";
import { tryCatch } from "@/lib/try-catch";
import { JobStatus, PipelineStage } from "@prisma/client";
import {
  calculateCropRegion,
  calculateTargetDimensions,
  cropDimensionsToPixels,
  DEFAULT_IMAGE_DIMENSION,
  ENHANCED_JPEG_QUALITY,
  type EnhanceImageInput,
  generateEnhancedR2Key,
  PADDING_BACKGROUND,
  TIER_TO_SIZE,
  validateCropDimensions,
  validateEnhanceImageInput,
} from "./enhance-image.shared";

export type { EnhanceImageInput };

// Lazy-load sharp to prevent build-time native module loading
// Sharp is only needed at runtime when processing jobs
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _sharp: any = null;
async function getSharp() {
  if (!_sharp) {
    // Dynamic import for CommonJS module
    const mod = await import("sharp");
    // Handle both ESM default export and CommonJS module.exports
    _sharp = mod.default || mod;
  }
  return _sharp;
}

/**
 * Retry configuration for different operation types
 */
const RETRY_CONFIG = {
  // R2 operations - retry on network/timeout errors
  r2: {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 5000,
    shouldRetry: (error: Error) => {
      const msg = error.message.toLowerCase();
      return (
        msg.includes("network") ||
        msg.includes("timeout") ||
        msg.includes("fetch failed") ||
        msg.includes("econnrefused") ||
        msg.includes("503") ||
        msg.includes("502") ||
        msg.includes("500")
      );
    },
  },
  // Gemini API - retry on transient errors, not on API key/quota issues
  gemini: {
    maxAttempts: 3,
    initialDelayMs: 2000,
    maxDelayMs: 10000,
    shouldRetry: (error: Error) => {
      const msg = error.message.toLowerCase();
      // Don't retry on permanent errors
      if (
        msg.includes("api key") ||
        msg.includes("quota") ||
        msg.includes("invalid") ||
        msg.includes("not found")
      ) {
        return false;
      }
      // Retry on transient errors
      return (
        msg.includes("timeout") ||
        msg.includes("network") ||
        msg.includes("503") ||
        msg.includes("502") ||
        msg.includes("overloaded") ||
        msg.includes("rate limit")
      );
    },
  },
};

/**
 * Download from R2 with retry logic
 */
async function downloadFromR2WithRetry(r2Key: string): Promise<Buffer | null> {
  const result = await retryWithBackoff(
    () => downloadFromR2(r2Key),
    {
      ...RETRY_CONFIG.r2,
      onRetry: (error, attempt, delayMs) => {
        console.log(
          `[Direct Enhancement] R2 download retry ${attempt} after ${delayMs}ms: ${error.message}`,
        );
      },
    },
  );

  if (!result.success) {
    console.error(
      `[Direct Enhancement] R2 download failed after ${result.attempts} attempts:`,
      result.error,
    );
    return null;
  }

  return result.data ?? null;
}

/**
 * Upload to R2 with retry logic
 */
async function uploadToR2WithRetry(params: {
  key: string;
  buffer: Buffer;
  contentType: string;
  metadata?: Record<string, string>;
}): Promise<{ success: boolean; url?: string; }> {
  const result = await retryWithBackoff(
    () => uploadToR2(params),
    {
      ...RETRY_CONFIG.r2,
      onRetry: (error, attempt, delayMs) => {
        console.log(
          `[Direct Enhancement] R2 upload retry ${attempt} after ${delayMs}ms: ${error.message}`,
        );
      },
    },
  );

  if (!result.success || !result.data?.success) {
    console.error(
      `[Direct Enhancement] R2 upload failed after ${result.attempts} attempts:`,
      result.error,
    );
    return { success: false };
  }

  return result.data;
}

/**
 * Analyze image with retry logic
 */
async function analyzeImageWithRetry(
  imageBase64: string,
  mimeType: string,
): Promise<Awaited<ReturnType<typeof analyzeImageV2>>> {
  const result = await retryWithBackoff(
    () => analyzeImageV2(imageBase64, mimeType),
    {
      ...RETRY_CONFIG.gemini,
      onRetry: (error, attempt, delayMs) => {
        console.log(
          `[Direct Enhancement] Image analysis retry ${attempt} after ${delayMs}ms: ${error.message}`,
        );
      },
    },
  );

  if (!result.success) {
    throw result.error || new Error("Image analysis failed after retries");
  }

  return result.data!;
}

/**
 * Enhance with Gemini with retry logic
 */
async function enhanceWithGeminiRetry(
  params: Parameters<typeof enhanceImageWithGemini>[0],
): Promise<Buffer> {
  const result = await retryWithBackoff(
    () => enhanceImageWithGemini(params),
    {
      ...RETRY_CONFIG.gemini,
      onRetry: (error, attempt, delayMs) => {
        console.log(
          `[Direct Enhancement] Gemini enhancement retry ${attempt} after ${delayMs}ms: ${error.message}`,
        );
      },
    },
  );

  if (!result.success) {
    throw result.error || new Error("Gemini enhancement failed after retries");
  }

  return result.data!;
}

/**
 * Safely update the job's current stage with error handling.
 * Stage updates are non-critical - failures are logged but don't block processing.
 */
async function updateJobStage(
  jobId: string,
  stage: PipelineStage,
): Promise<void> {
  const { error } = await tryCatch(
    prisma.imageEnhancementJob.update({
      where: { id: jobId },
      data: { currentStage: stage },
    }),
  );

  if (error) {
    console.warn(
      `[Direct Enhancement] Failed to update stage to ${stage} for job ${jobId}:`,
      error instanceof Error ? error.message : error,
    );
    // Continue processing - stage update is non-critical for functionality
  }
}

/**
 * Helper to perform cropping with error handling.
 * Returns updated image data or original if cropping fails.
 */
async function performCrop(
  imageBuffer: Buffer,
  cropRegion: { left: number; top: number; width: number; height: number; },
  _originalR2Key: string, // Kept for function signature compatibility, no longer used for upload
  _mimeType: string, // Kept for function signature compatibility, no longer used for upload
  _jobId: string, // Kept for function signature compatibility, no longer used for upload
  originalWidth: number,
  originalHeight: number,
): Promise<{
  buffer: Buffer;
  width: number;
  height: number;
  wasCropped: boolean;
  cropDimensions: typeof cropRegion | null;
}> {
  const sharp = await getSharp();
  const { data: croppedBuffer, error: cropError } = await tryCatch(
    sharp(imageBuffer).extract(cropRegion).toBuffer() as Promise<Buffer>,
  );

  if (cropError) {
    console.warn(
      `[Direct Enhancement] Auto-crop failed, continuing with original:`,
      cropError,
    );
    return {
      buffer: imageBuffer,
      width: originalWidth,
      height: originalHeight,
      wasCropped: false,
      cropDimensions: null,
    };
  }

  const sharpMetadata = await sharp(croppedBuffer).metadata();
  const newWidth = sharpMetadata.width || originalWidth;
  const newHeight = sharpMetadata.height || originalHeight;

  // NOTE: We intentionally do NOT upload the cropped image back to R2.
  // The original must be preserved for future enhancements with correct aspect ratio.
  // The cropped buffer is only used in-memory for this enhancement.

  console.log(
    `[Direct Enhancement] Auto-crop applied: ${cropRegion.width}x${cropRegion.height}`,
  );

  return {
    buffer: croppedBuffer,
    width: newWidth,
    height: newHeight,
    wasCropped: true,
    cropDimensions: cropRegion,
  };
}

/**
 * Core enhancement processing logic.
 * Separated from main function to enable tryCatch wrapping.
 */
async function processEnhancement(input: EnhanceImageInput): Promise<string> {
  const { jobId, originalR2Key, tier, blendSource } = input;

  const isBlendMode = !!blendSource;
  console.log(
    `[Direct Enhancement] Starting job ${jobId} (${tier})${isBlendMode ? " [BLEND MODE]" : ""}`,
  );

  // Step 1: Download original image (with retry)
  console.log(`[Direct Enhancement] Downloading from R2: ${originalR2Key}`);
  let imageBuffer = await downloadFromR2WithRetry(originalR2Key);
  if (!imageBuffer) {
    throw new Error("Failed to download original image from R2");
  }

  // Load sharp for image processing
  const sharp = await getSharp();

  // Step 1b: Prepare blend source data (if provided - already base64 from client upload)
  let sourceImageData: ReferenceImageData | null = null;
  if (blendSource) {
    console.log(
      `[Direct Enhancement] Using uploaded blend source (${blendSource.mimeType})`,
    );
    sourceImageData = {
      imageData: blendSource.base64,
      mimeType: blendSource.mimeType,
      description: "Image to blend/merge with target",
    };
  }

  // Step 2: Get image metadata
  console.log(`[Direct Enhancement] Getting image metadata`);
  const sharpMetadata = await sharp(imageBuffer).metadata();
  // Store ORIGINAL dimensions for final output calculations (aspect ratio preservation)
  const originalWidth = sharpMetadata.width || DEFAULT_IMAGE_DIMENSION;
  const originalHeight = sharpMetadata.height || DEFAULT_IMAGE_DIMENSION;
  // Mutable dimensions for processing (may be modified by auto-crop)
  let width = originalWidth;
  let height = originalHeight;

  const detectedFormat = sharpMetadata.format;
  const mimeType = detectedFormat
    ? `image/${detectedFormat === "jpeg" ? "jpeg" : detectedFormat}`
    : "image/jpeg";

  // Step 3: STAGE 1 - Analyze image with vision model (with retry)
  console.log(`[Direct Enhancement] Stage 1: Analyzing image with vision model`);
  await updateJobStage(jobId, PipelineStage.ANALYZING);
  const imageBase64ForAnalysis = imageBuffer.toString("base64");
  const analysisResult = await analyzeImageWithRetry(
    imageBase64ForAnalysis,
    mimeType,
  );

  // Save analysis to database
  await prisma.imageEnhancementJob.update({
    where: { id: jobId },
    data: {
      analysisResult: JSON.parse(
        JSON.stringify(analysisResult.structuredAnalysis),
      ),
      analysisSource: DEFAULT_MODEL,
    },
  });
  console.log(
    `[Direct Enhancement] Analysis saved: ${
      JSON.stringify(analysisResult.structuredAnalysis.defects)
    }`,
  );

  // Step 4: STAGE 2 - Auto-crop if needed
  let wasCropped = false;
  let cropDimensionsUsed = null;

  await updateJobStage(jobId, PipelineStage.CROPPING);

  if (
    analysisResult.structuredAnalysis.cropping.isCroppingNeeded &&
    analysisResult.structuredAnalysis.cropping.suggestedCrop &&
    validateCropDimensions(
      analysisResult.structuredAnalysis.cropping.suggestedCrop,
    )
  ) {
    console.log(
      `[Direct Enhancement] Stage 2: Auto-cropping image (reason: ${analysisResult.structuredAnalysis.cropping.cropReason})`,
    );

    const cropRegion = cropDimensionsToPixels(
      analysisResult.structuredAnalysis.cropping.suggestedCrop,
      width,
      height,
    );

    // Validate calculated region
    if (cropRegion.width > 0 && cropRegion.height > 0) {
      const cropResult = await performCrop(
        imageBuffer,
        cropRegion,
        originalR2Key,
        mimeType,
        jobId,
        width,
        height,
      );
      imageBuffer = cropResult.buffer;
      width = cropResult.width;
      height = cropResult.height;
      wasCropped = cropResult.wasCropped;
      cropDimensionsUsed = cropResult.cropDimensions;
    }
  }

  // Update job with crop info
  if (wasCropped) {
    await prisma.imageEnhancementJob.update({
      where: { id: jobId },
      data: {
        wasCropped: true,
        cropDimensions: cropDimensionsUsed
          ? JSON.parse(JSON.stringify(cropDimensionsUsed))
          : null,
      },
    });
  }

  // Step 5: STAGE 3 - Build enhancement prompt (blend or dynamic)
  console.log(
    `[Direct Enhancement] Stage 3: Building ${
      sourceImageData ? "blend" : "dynamic"
    } enhancement prompt`,
  );
  await updateJobStage(jobId, PipelineStage.PROMPTING);
  const dynamicPrompt = sourceImageData
    ? buildBlendEnhancementPrompt(analysisResult.structuredAnalysis)
    : buildDynamicEnhancementPrompt(analysisResult.structuredAnalysis);

  // Step 6: Prepare image for Gemini (pad to square)
  console.log(`[Direct Enhancement] Preparing image for Gemini`);
  const maxDimension = Math.max(width, height);
  const paddedBuffer = await sharp(imageBuffer)
    .resize(maxDimension, maxDimension, {
      fit: "contain",
      background: PADDING_BACKGROUND,
    })
    .toBuffer();

  const paddedBase64 = paddedBuffer.toString("base64");

  // Step 7: STAGE 4 - Enhance with Gemini using dynamic prompt (with retry)
  // Get the appropriate model for this tier (FREE uses nano model, paid uses premium)
  const modelToUse = getModelForTier(tier);
  console.log(
    `[Direct Enhancement] Stage 4: Calling Gemini API for ${TIER_TO_SIZE[tier]} enhancement${
      sourceImageData ? " [BLEND]" : ""
    } using model: ${modelToUse}`,
  );
  await updateJobStage(jobId, PipelineStage.GENERATING);
  const enhancedBuffer = await enhanceWithGeminiRetry({
    imageData: paddedBase64,
    mimeType,
    tier: TIER_TO_SIZE[tier],
    originalWidth: originalWidth, // Use ORIGINAL dimensions for aspect ratio preservation
    originalHeight: originalHeight,
    promptOverride: dynamicPrompt,
    referenceImages: sourceImageData ? [sourceImageData] : undefined,
    model: modelToUse,
  });

  // Step 8: Post-process and upload (with retry)
  console.log(`[Direct Enhancement] Post-processing and uploading`);
  const geminiMetadata = await sharp(enhancedBuffer).metadata();
  const geminiWidth = geminiMetadata.width;
  const geminiHeight = geminiMetadata.height;

  if (!geminiWidth || !geminiHeight) {
    throw new Error("Failed to get Gemini output dimensions");
  }

  console.log(
    `[Direct Enhancement] Gemini output: ${geminiWidth}x${geminiHeight}, Original: ${originalWidth}x${originalHeight}`,
  );

  // Calculate crop region to restore original aspect ratio (use ORIGINAL dimensions)
  const { extractLeft, extractTop, extractWidth, extractHeight } = calculateCropRegion(
    geminiWidth,
    geminiHeight,
    originalWidth,
    originalHeight,
  );

  // Calculate target dimensions based on tier (use ORIGINAL dimensions for correct aspect ratio)
  const { targetWidth, targetHeight } = calculateTargetDimensions(
    tier,
    originalWidth,
    originalHeight,
  );

  // Crop and resize
  const finalBuffer = await sharp(enhancedBuffer)
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

  const finalMetadata = await sharp(finalBuffer).metadata();

  // Generate R2 key for enhanced image
  const enhancedR2Key = generateEnhancedR2Key(originalR2Key, jobId);

  // Upload to R2 (with retry)
  const uploadResult = await uploadToR2WithRetry({
    key: enhancedR2Key,
    buffer: finalBuffer,
    contentType: "image/jpeg",
    metadata: {
      tier,
      jobId,
    },
  });

  if (!uploadResult.success || !uploadResult.url) {
    throw new Error("Failed to upload enhanced image to R2");
  }

  // Step 5: Update job as completed
  console.log(`[Direct Enhancement] Job ${jobId} completed successfully`);
  await prisma.imageEnhancementJob.update({
    where: { id: jobId },
    data: {
      status: JobStatus.COMPLETED,
      currentStage: null, // Clear stage on completion
      enhancedUrl: uploadResult.url,
      enhancedR2Key: enhancedR2Key,
      enhancedWidth: finalMetadata.width || targetWidth,
      enhancedHeight: finalMetadata.height || targetHeight,
      enhancedSizeBytes: finalBuffer.length,
      processingCompletedAt: new Date(),
      geminiModel: modelToUse,
      geminiTemp: DEFAULT_TEMPERATURE,
    },
  });

  return uploadResult.url;
}

/**
 * Direct enhancement execution for dev mode.
 * This runs the enhancement synchronously without workflow infrastructure.
 */
export async function enhanceImageDirect(input: EnhanceImageInput): Promise<{
  success: boolean;
  enhancedUrl?: string;
  error?: string;
}> {
  // Validate input parameters
  validateEnhanceImageInput(input);

  const { jobId, userId, tokensCost } = input;

  const { data: enhancedUrl, error } = await tryCatch(
    processEnhancement(input),
  );

  if (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // Include full error stack trace for better debugging
    console.error(`[Direct Enhancement] Job ${jobId} failed:`, error);

    // Refund tokens on failure
    const refundResult = await TokenBalanceManager.refundTokens(
      userId,
      tokensCost,
      jobId,
      errorMessage,
    );

    if (!refundResult.success) {
      console.error(
        "[Direct Enhancement] Failed to refund tokens:",
        refundResult.error,
      );
    }

    // Update job as failed and refunded
    await prisma.imageEnhancementJob.update({
      where: { id: jobId },
      data: {
        status: JobStatus.REFUNDED,
        errorMessage,
        currentStage: null, // Clear stage on failure
      },
    });

    return { success: false, error: errorMessage };
  }

  return { success: true, enhancedUrl };
}
