/**
 * Direct Image Enhancement (Dev Mode Fallback)
 *
 * This module provides a non-workflow version of the image enhancement logic
 * for local development where Vercel Workflow infrastructure is not available.
 *
 * In production, use the workflow version via start() from workflow/api.
 *
 * **Dev Mode Limitations:**
 * - Runs synchronously without workflow infrastructure
 * - No automatic retries on transient failures
 * - No durable execution - if process crashes, jobs may be abandoned
 * - Uses in-process execution instead of isolated steps
 */

import {
  analyzeImageV2,
  buildBlendEnhancementPrompt,
  buildDynamicEnhancementPrompt,
  DEFAULT_MODEL,
  DEFAULT_TEMPERATURE,
  enhanceImageWithGemini,
  type ReferenceImageData,
} from "@/lib/ai/gemini-client";
import prisma from "@/lib/prisma";
import { downloadFromR2, uploadToR2 } from "@/lib/storage/r2-client";
import { TokenBalanceManager } from "@/lib/tokens/balance-manager";
import { tryCatch } from "@/lib/try-catch";
import { JobStatus, PipelineStage } from "@prisma/client";
import sharp from "sharp";
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
      `[Dev Enhancement] Failed to update stage to ${stage} for job ${jobId}:`,
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
  originalR2Key: string,
  mimeType: string,
  jobId: string,
  originalWidth: number,
  originalHeight: number,
): Promise<{
  buffer: Buffer;
  width: number;
  height: number;
  wasCropped: boolean;
  cropDimensions: typeof cropRegion | null;
}> {
  const { data: croppedBuffer, error: cropError } = await tryCatch(
    sharp(imageBuffer).extract(cropRegion).toBuffer(),
  );

  if (cropError) {
    console.warn(
      `[Dev Enhancement] Auto-crop failed, continuing with original:`,
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

  // Upload cropped image back to R2 (overwrite original)
  await uploadToR2({
    key: originalR2Key,
    buffer: croppedBuffer,
    contentType: mimeType,
    metadata: { cropped: "true", jobId },
  });

  console.log(
    `[Dev Enhancement] Auto-crop applied: ${cropRegion.width}x${cropRegion.height}`,
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
    `[Dev Enhancement] Starting job ${jobId} (${tier})${isBlendMode ? " [BLEND MODE]" : ""}`,
  );

  // Step 1: Download original image
  console.log(`[Dev Enhancement] Downloading from R2: ${originalR2Key}`);
  let imageBuffer = await downloadFromR2(originalR2Key);
  if (!imageBuffer) {
    throw new Error("Failed to download original image from R2");
  }

  // Step 1b: Prepare blend source data (if provided - already base64 from client upload)
  let sourceImageData: ReferenceImageData | null = null;
  if (blendSource) {
    console.log(
      `[Dev Enhancement] Using uploaded blend source (${blendSource.mimeType})`,
    );
    sourceImageData = {
      imageData: blendSource.base64,
      mimeType: blendSource.mimeType,
      description: "Image to blend/merge with target",
    };
  }

  // Step 2: Get image metadata
  console.log(`[Dev Enhancement] Getting image metadata`);
  const sharpMetadata = await sharp(imageBuffer).metadata();
  let width = sharpMetadata.width || DEFAULT_IMAGE_DIMENSION;
  let height = sharpMetadata.height || DEFAULT_IMAGE_DIMENSION;

  const detectedFormat = sharpMetadata.format;
  const mimeType = detectedFormat
    ? `image/${detectedFormat === "jpeg" ? "jpeg" : detectedFormat}`
    : "image/jpeg";

  // Step 3: STAGE 1 - Analyze image with vision model
  console.log(`[Dev Enhancement] Stage 1: Analyzing image with vision model`);
  await updateJobStage(jobId, PipelineStage.ANALYZING);
  const imageBase64ForAnalysis = imageBuffer.toString("base64");
  const analysisResult = await analyzeImageV2(
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
    `[Dev Enhancement] Analysis saved: ${
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
      `[Dev Enhancement] Stage 2: Auto-cropping image (reason: ${analysisResult.structuredAnalysis.cropping.cropReason})`,
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
    `[Dev Enhancement] Stage 3: Building ${
      sourceImageData ? "blend" : "dynamic"
    } enhancement prompt`,
  );
  await updateJobStage(jobId, PipelineStage.PROMPTING);
  const dynamicPrompt = sourceImageData
    ? buildBlendEnhancementPrompt(analysisResult.structuredAnalysis)
    : buildDynamicEnhancementPrompt(analysisResult.structuredAnalysis);

  // Step 6: Prepare image for Gemini (pad to square)
  console.log(`[Dev Enhancement] Preparing image for Gemini`);
  const maxDimension = Math.max(width, height);
  const paddedBuffer = await sharp(imageBuffer)
    .resize(maxDimension, maxDimension, {
      fit: "contain",
      background: PADDING_BACKGROUND,
    })
    .toBuffer();

  const paddedBase64 = paddedBuffer.toString("base64");

  // Step 7: STAGE 4 - Enhance with Gemini using dynamic prompt
  console.log(
    `[Dev Enhancement] Stage 4: Calling Gemini API for ${TIER_TO_SIZE[tier]} enhancement${
      sourceImageData ? " [BLEND]" : ""
    }`,
  );
  await updateJobStage(jobId, PipelineStage.GENERATING);
  const enhancedBuffer = await enhanceImageWithGemini({
    imageData: paddedBase64,
    mimeType,
    tier: TIER_TO_SIZE[tier],
    originalWidth: width,
    originalHeight: height,
    promptOverride: dynamicPrompt,
    referenceImages: sourceImageData ? [sourceImageData] : undefined,
  });

  // Step 8: Post-process and upload
  console.log(`[Dev Enhancement] Post-processing and uploading`);
  const geminiMetadata = await sharp(enhancedBuffer).metadata();
  const geminiSize = geminiMetadata.width;

  if (!geminiSize) {
    throw new Error("Failed to get Gemini output dimensions");
  }

  // Calculate crop region to restore original aspect ratio
  const { extractLeft, extractTop, extractWidth, extractHeight } = calculateCropRegion(
    geminiSize,
    width,
    height,
  );

  // Calculate target dimensions based on tier
  const { targetWidth, targetHeight } = calculateTargetDimensions(
    tier,
    width,
    height,
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

  // Upload to R2
  const uploadResult = await uploadToR2({
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
  console.log(`[Dev Enhancement] Job ${jobId} completed successfully`);
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
      geminiModel: DEFAULT_MODEL,
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
    console.error(`[Dev Enhancement] Job ${jobId} failed:`, error);

    // Refund tokens on failure
    const refundResult = await TokenBalanceManager.refundTokens(
      userId,
      tokensCost,
      jobId,
      errorMessage,
    );

    if (!refundResult.success) {
      console.error(
        "[Dev Enhancement] Failed to refund tokens:",
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
