/**
 * Direct Image Enhancement (Dev Mode Fallback)
 *
 * This module provides a non-workflow version of the image enhancement logic
 * for local development where Vercel Workflow infrastructure is not available.
 *
 * In production, use the workflow version via start() from workflow/api.
 */

import { enhanceImageWithGemini } from "@/lib/ai/gemini-client";
import prisma from "@/lib/prisma";
import { downloadFromR2, uploadToR2 } from "@/lib/storage/r2-client";
import { TokenBalanceManager } from "@/lib/tokens/balance-manager";
import { EnhancementTier, JobStatus } from "@prisma/client";
import sharp from "sharp";

// Resolution constants for each enhancement tier
const TIER_RESOLUTIONS = {
  TIER_1K: 1024,
  TIER_2K: 2048,
  TIER_4K: 4096,
} as const;

const TIER_TO_SIZE = {
  TIER_1K: "1K" as const,
  TIER_2K: "2K" as const,
  TIER_4K: "4K" as const,
};

// Image processing constants
const ENHANCED_JPEG_QUALITY = 95;
const DEFAULT_IMAGE_DIMENSION = 1024;
const PADDING_BACKGROUND = { r: 0, g: 0, b: 0, alpha: 1 };

export interface EnhanceImageInput {
  jobId: string;
  imageId: string;
  userId: string;
  originalR2Key: string;
  tier: EnhancementTier;
  tokensCost: number;
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
  const { jobId, userId, originalR2Key, tier, tokensCost } = input;

  try {
    console.log(`[Dev Enhancement] Starting job ${jobId} (${tier})`);

    // Step 1: Download original image
    console.log(`[Dev Enhancement] Downloading from R2: ${originalR2Key}`);
    const imageBuffer = await downloadFromR2(originalR2Key);
    if (!imageBuffer) {
      throw new Error("Failed to download original image from R2");
    }

    // Step 2: Prepare image for Gemini
    console.log(`[Dev Enhancement] Preparing image for Gemini`);
    const sharpMetadata = await sharp(imageBuffer).metadata();
    const width = sharpMetadata.width || DEFAULT_IMAGE_DIMENSION;
    const height = sharpMetadata.height || DEFAULT_IMAGE_DIMENSION;

    const detectedFormat = sharpMetadata.format;
    const mimeType = detectedFormat
      ? `image/${detectedFormat === "jpeg" ? "jpeg" : detectedFormat}`
      : "image/jpeg";

    const maxDimension = Math.max(width, height);
    const paddedBuffer = await sharp(imageBuffer)
      .resize(maxDimension, maxDimension, {
        fit: "contain",
        background: PADDING_BACKGROUND,
      })
      .toBuffer();

    const paddedBase64 = paddedBuffer.toString("base64");

    // Step 3: Enhance with Gemini
    console.log(`[Dev Enhancement] Calling Gemini API for ${TIER_TO_SIZE[tier]} enhancement`);
    const enhancedBuffer = await enhanceImageWithGemini({
      imageData: paddedBase64,
      mimeType,
      tier: TIER_TO_SIZE[tier],
      originalWidth: width,
      originalHeight: height,
    });

    // Step 4: Post-process and upload
    console.log(`[Dev Enhancement] Post-processing and uploading`);
    const geminiMetadata = await sharp(enhancedBuffer).metadata();
    const geminiSize = geminiMetadata.width;

    if (!geminiSize) {
      throw new Error("Failed to get Gemini output dimensions");
    }

    // Calculate crop region to restore original aspect ratio
    const aspectRatio = width / height;

    let extractLeft = 0;
    let extractTop = 0;
    let extractWidth = geminiSize;
    let extractHeight = geminiSize;

    if (aspectRatio > 1) {
      extractHeight = Math.round(geminiSize / aspectRatio);
      extractTop = Math.round((geminiSize - extractHeight) / 2);
    } else {
      extractWidth = Math.round(geminiSize * aspectRatio);
      extractLeft = Math.round((geminiSize - extractWidth) / 2);
    }

    // Calculate target dimensions based on tier
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
    const enhancedR2Key = originalR2Key
      .replace("/originals/", `/enhanced/`)
      .replace(/\.[^.]+$/, `/${jobId}.jpg`);

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
        enhancedUrl: uploadResult.url,
        enhancedR2Key: enhancedR2Key,
        enhancedWidth: finalMetadata.width || targetWidth,
        enhancedHeight: finalMetadata.height || targetHeight,
        enhancedSizeBytes: finalBuffer.length,
        processingCompletedAt: new Date(),
      },
    });

    return { success: true, enhancedUrl: uploadResult.url };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Dev Enhancement] Job ${jobId} failed:`, errorMessage);

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

    // Update job as failed
    await prisma.imageEnhancementJob.update({
      where: { id: jobId },
      data: {
        status: JobStatus.FAILED,
        errorMessage,
      },
    });

    return { success: false, error: errorMessage };
  }
}
