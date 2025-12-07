import { enhanceImageWithGemini } from "@/lib/ai/gemini-client";
import prisma from "@/lib/prisma";
import { downloadFromR2, uploadToR2 } from "@/lib/storage/r2-client";
import { TokenBalanceManager } from "@/lib/tokens/balance-manager";
import { EnhancementTier, JobStatus } from "@prisma/client";
import sharp from "sharp";
import { FatalError } from "workflow";

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

interface ImageMetadata {
  width: number;
  height: number;
  mimeType: string;
  paddedBase64: string;
}

interface EnhancedResult {
  enhancedUrl: string;
  r2Key: string;
  width: number;
  height: number;
  sizeBytes: number;
}

/**
 * Step 1: Download original image from R2
 */
async function downloadOriginalImage(r2Key: string): Promise<Buffer> {
  "use step";

  const buffer = await downloadFromR2(r2Key);
  if (!buffer) {
    throw new FatalError("Failed to download original image from R2");
  }
  return buffer;
}

/**
 * Step 2: Get image metadata and prepare for Gemini
 */
async function prepareImageForGemini(imageBuffer: Buffer): Promise<ImageMetadata> {
  "use step";

  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width || DEFAULT_IMAGE_DIMENSION;
  const height = metadata.height || DEFAULT_IMAGE_DIMENSION;

  // Detect MIME type
  const detectedFormat = metadata.format;
  const mimeType = detectedFormat
    ? `image/${detectedFormat === "jpeg" ? "jpeg" : detectedFormat}`
    : "image/jpeg";

  // Pad image to square for Gemini (requires square inputs)
  const maxDimension = Math.max(width, height);
  const paddedBuffer = await sharp(imageBuffer)
    .resize(maxDimension, maxDimension, {
      fit: "contain",
      background: PADDING_BACKGROUND,
    })
    .toBuffer();

  return {
    width,
    height,
    mimeType,
    paddedBase64: paddedBuffer.toString("base64"),
  };
}

/**
 * Step 3: Enhance image with Gemini AI
 */
async function enhanceWithGemini(
  imageBase64: string,
  mimeType: string,
  tier: "1K" | "2K" | "4K",
  originalWidth: number,
  originalHeight: number,
): Promise<Buffer> {
  "use step";

  try {
    const enhanced = await enhanceImageWithGemini({
      imageData: imageBase64,
      mimeType,
      tier,
      originalWidth,
      originalHeight,
    });
    return enhanced;
  } catch (error) {
    // Gemini errors that indicate permanent failure
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes("API key") ||
      message.includes("quota") ||
      message.includes("invalid")
    ) {
      throw new FatalError(`Gemini API error: ${message}`);
    }
    // Other errors will be retried automatically
    throw error;
  }
}

/**
 * Step 4: Post-process (crop, resize) and upload to R2
 */
async function processAndUpload(
  enhancedBuffer: Buffer,
  tier: EnhancementTier,
  originalWidth: number,
  originalHeight: number,
  originalR2Key: string,
  jobId: string,
): Promise<EnhancedResult> {
  "use step";

  // Get Gemini output dimensions
  const geminiMetadata = await sharp(enhancedBuffer).metadata();
  const geminiSize = geminiMetadata.width;

  if (!geminiSize) {
    throw new FatalError("Failed to get Gemini output dimensions");
  }

  // Calculate crop region to restore original aspect ratio
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

  return {
    enhancedUrl: uploadResult.url,
    r2Key: enhancedR2Key,
    width: finalMetadata.width || targetWidth,
    height: finalMetadata.height || targetHeight,
    sizeBytes: finalBuffer.length,
  };
}

/**
 * Step 5: Update job status in database
 */
async function updateJobStatus(
  jobId: string,
  status: "COMPLETED" | "FAILED",
  data?: {
    enhancedUrl?: string;
    r2Key?: string;
    width?: number;
    height?: number;
    sizeBytes?: number;
    errorMessage?: string;
  },
): Promise<void> {
  "use step";

  await prisma.imageEnhancementJob.update({
    where: { id: jobId },
    data: {
      status: status === "COMPLETED" ? JobStatus.COMPLETED : JobStatus.FAILED,
      ...(status === "COMPLETED" && data
        ? {
          enhancedUrl: data.enhancedUrl,
          enhancedR2Key: data.r2Key,
          enhancedWidth: data.width,
          enhancedHeight: data.height,
          enhancedSizeBytes: data.sizeBytes,
          processingCompletedAt: new Date(),
        }
        : {}),
      ...(status === "FAILED" && data?.errorMessage
        ? { errorMessage: data.errorMessage }
        : {}),
    },
  });
}

/**
 * Step 6: Refund tokens on failure
 */
async function refundTokens(
  userId: string,
  amount: number,
  jobId: string,
  reason: string,
): Promise<void> {
  "use step";

  const result = await TokenBalanceManager.refundTokens(
    userId,
    amount,
    jobId,
    reason,
  );

  if (!result.success) {
    console.error("Failed to refund tokens:", result.error);
    // Don't throw - token refund failure shouldn't block job status update
  }
}

/**
 * Main Enhancement Workflow
 *
 * Orchestrates the image enhancement process with durable execution:
 * 1. Downloads original image from R2
 * 2. Prepares image for Gemini (metadata, padding)
 * 3. Enhances with Gemini AI
 * 4. Post-processes and uploads result
 * 5. Updates job status
 * 6. Refunds tokens on failure
 */
export async function enhanceImage(input: EnhanceImageInput): Promise<{
  success: boolean;
  enhancedUrl?: string;
  error?: string;
}> {
  "use workflow";

  const { jobId, userId, originalR2Key, tier, tokensCost } = input;

  try {
    // Step 1: Download original image
    const imageBuffer = await downloadOriginalImage(originalR2Key);

    // Step 2: Prepare for Gemini
    const metadata = await prepareImageForGemini(imageBuffer);

    // Step 3: Enhance with Gemini
    const enhancedBuffer = await enhanceWithGemini(
      metadata.paddedBase64,
      metadata.mimeType,
      TIER_TO_SIZE[tier],
      metadata.width,
      metadata.height,
    );

    // Step 4: Post-process and upload
    const result = await processAndUpload(
      enhancedBuffer,
      tier,
      metadata.width,
      metadata.height,
      originalR2Key,
      jobId,
    );

    // Step 5: Update job as completed
    await updateJobStatus(jobId, "COMPLETED", {
      enhancedUrl: result.enhancedUrl,
      r2Key: result.r2Key,
      width: result.width,
      height: result.height,
      sizeBytes: result.sizeBytes,
    });

    return { success: true, enhancedUrl: result.enhancedUrl };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Step 6: Refund tokens on failure
    await refundTokens(userId, tokensCost, jobId, errorMessage);

    // Update job as failed
    await updateJobStatus(jobId, "FAILED", { errorMessage });

    // Re-throw for workflow observability
    // FatalError will not be retried, other errors will be
    if (error instanceof FatalError) {
      throw error;
    }

    return { success: false, error: errorMessage };
  }
}
