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
  buildDynamicEnhancementPrompt,
  DEFAULT_MODEL,
  DEFAULT_TEMPERATURE,
  enhanceImageWithGemini,
} from "@/lib/ai/gemini-client";
import prisma from "@/lib/prisma";
import { downloadFromR2, uploadToR2 } from "@/lib/storage/r2-client";
import { TokenBalanceManager } from "@/lib/tokens/balance-manager";
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
async function updateJobStage(jobId: string, stage: PipelineStage): Promise<void> {
  try {
    await prisma.imageEnhancementJob.update({
      where: { id: jobId },
      data: { currentStage: stage },
    });
  } catch (error) {
    console.warn(
      `[Dev Enhancement] Failed to update stage to ${stage} for job ${jobId}:`,
      error instanceof Error ? error.message : error,
    );
    // Continue processing - stage update is non-critical for functionality
  }
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

  const { jobId, userId, originalR2Key, tier, tokensCost } = input;

  try {
    console.log(`[Dev Enhancement] Starting job ${jobId} (${tier})`);

    // Step 1: Download original image
    console.log(`[Dev Enhancement] Downloading from R2: ${originalR2Key}`);
    let imageBuffer = await downloadFromR2(originalR2Key);
    if (!imageBuffer) {
      throw new Error("Failed to download original image from R2");
    }

    // Step 2: Get image metadata
    console.log(`[Dev Enhancement] Getting image metadata`);
    let sharpMetadata = await sharp(imageBuffer).metadata();
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
    const analysisResult = await analyzeImageV2(imageBase64ForAnalysis, mimeType);

    // Save analysis to database
    await prisma.imageEnhancementJob.update({
      where: { id: jobId },
      data: {
        analysisResult: JSON.parse(JSON.stringify(analysisResult.structuredAnalysis)),
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
      validateCropDimensions(analysisResult.structuredAnalysis.cropping.suggestedCrop)
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
        try {
          // Crop the image
          const croppedBuffer = await sharp(imageBuffer)
            .extract(cropRegion)
            .toBuffer();

          // Update imageBuffer and dimensions for subsequent processing
          imageBuffer = croppedBuffer;
          sharpMetadata = await sharp(imageBuffer).metadata();
          width = sharpMetadata.width || width;
          height = sharpMetadata.height || height;

          wasCropped = true;
          cropDimensionsUsed = cropRegion;

          // Upload cropped image back to R2 (overwrite original)
          await uploadToR2({
            key: originalR2Key,
            buffer: imageBuffer,
            contentType: mimeType,
            metadata: { cropped: "true", jobId },
          });

          console.log(
            `[Dev Enhancement] Auto-crop applied: ${cropRegion.width}x${cropRegion.height}`,
          );
        } catch (cropError) {
          console.warn(`[Dev Enhancement] Auto-crop failed, continuing with original:`, cropError);
        }
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

    // Step 5: STAGE 3 - Build dynamic enhancement prompt
    console.log(`[Dev Enhancement] Stage 3: Building dynamic enhancement prompt`);
    await updateJobStage(jobId, PipelineStage.PROMPTING);
    const dynamicPrompt = buildDynamicEnhancementPrompt(analysisResult.structuredAnalysis);

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
      `[Dev Enhancement] Stage 4: Calling Gemini API for ${TIER_TO_SIZE[tier]} enhancement`,
    );
    await updateJobStage(jobId, PipelineStage.GENERATING);
    const enhancedBuffer = await enhanceImageWithGemini({
      imageData: paddedBase64,
      mimeType,
      tier: TIER_TO_SIZE[tier],
      originalWidth: width,
      originalHeight: height,
      promptOverride: dynamicPrompt,
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
    const { targetWidth, targetHeight } = calculateTargetDimensions(tier, width, height);

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

    return { success: true, enhancedUrl: uploadResult.url };
  } catch (error) {
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
      console.error("[Dev Enhancement] Failed to refund tokens:", refundResult.error);
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
}
