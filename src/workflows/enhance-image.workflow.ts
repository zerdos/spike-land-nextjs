import {
  type AnalysisDetailedResult,
  analyzeImageV2,
  buildBlendEnhancementPrompt,
  buildDynamicEnhancementPrompt,
  DEFAULT_MODEL,
  DEFAULT_TEMPERATURE,
  enhanceImageWithGemini,
  getModelForTier,
  type ImageAnalysisResultV2,
  type ReferenceImageData,
} from "@/lib/ai/gemini-client";
import prisma from "@/lib/prisma";
import { downloadFromR2, uploadToR2 } from "@/lib/storage/r2-client";
import { TokenBalanceManager } from "@/lib/tokens/balance-manager";
import { tryCatch } from "@/lib/try-catch";
import { EnhancementTier, JobStatus } from "@prisma/client";
import sharp from "sharp";
import { FatalError } from "workflow";
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
} from "./enhance-image.shared";

export type { EnhanceImageInput };

interface ImageMetadata {
  width: number;
  height: number;
  mimeType: string;
  imageBase64: string;
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
 * Step 2: Get image metadata (without padding yet - we may auto-crop first)
 */
async function getImageMetadata(imageBuffer: Buffer): Promise<ImageMetadata> {
  "use step";

  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width || DEFAULT_IMAGE_DIMENSION;
  const height = metadata.height || DEFAULT_IMAGE_DIMENSION;

  // Detect MIME type
  const detectedFormat = metadata.format;
  const mimeType = detectedFormat
    ? `image/${detectedFormat === "jpeg" ? "jpeg" : detectedFormat}`
    : "image/jpeg";

  return {
    width,
    height,
    mimeType,
    imageBase64: imageBuffer.toString("base64"),
  };
}

/**
 * Step 3: Analyze image with vision model
 */
async function analyzeImageStep(
  imageBase64: string,
  mimeType: string,
): Promise<ImageAnalysisResultV2> {
  "use step";

  const { data, error } = await tryCatch(analyzeImageV2(imageBase64, mimeType));

  if (error) {
    // Don't fail the job if analysis fails - return default analysis
    console.warn("Image analysis failed, using defaults:", error);
    return {
      description: "Analysis failed",
      quality: "medium" as const,
      structuredAnalysis: {
        mainSubject: "unknown",
        imageStyle: "photograph" as const,
        lightingCondition: "unknown",
        defects: {
          isDark: false,
          isBlurry: false,
          hasNoise: false,
          hasVHSArtifacts: false,
          isLowResolution: false,
          isOverexposed: false,
          hasColorCast: false,
        },
        cropping: { isCroppingNeeded: false },
      },
    };
  }

  return data;
}

/**
 * Step 4: Save analysis results to database
 */
async function saveAnalysisToDb(
  jobId: string,
  analysisResult: ImageAnalysisResultV2,
): Promise<void> {
  "use step";

  await prisma.imageEnhancementJob.update({
    where: { id: jobId },
    data: {
      analysisResult: JSON.parse(
        JSON.stringify(analysisResult.structuredAnalysis),
      ),
      analysisSource: DEFAULT_MODEL,
    },
  });
}

/**
 * Step 4b: Download and prepare blend source image for reference
 * Returns ReferenceImageData if successful, undefined if failed
 */
async function downloadBlendSourceStep(
  sourceR2Key: string,
): Promise<ReferenceImageData | undefined> {
  "use step";

  const { data: sourceBuffer, error: downloadError } = await tryCatch(
    downloadFromR2(sourceR2Key),
  );

  if (downloadError) {
    console.warn("Failed to download blend source:", downloadError);
    return undefined;
  }

  if (!sourceBuffer) {
    console.warn("Blend source download returned null");
    return undefined;
  }

  const { data: sourceMetadata, error: metadataError } = await tryCatch(
    sharp(sourceBuffer).metadata(),
  );

  if (metadataError) {
    console.warn("Failed to get blend source metadata:", metadataError);
    return undefined;
  }

  const sourceMimeType = sourceMetadata.format
    ? `image/${sourceMetadata.format === "jpeg" ? "jpeg" : sourceMetadata.format}`
    : "image/jpeg";

  return {
    imageData: sourceBuffer.toString("base64"),
    mimeType: sourceMimeType,
    description: "Image to blend/merge with target",
  };
}

/**
 * Helper function to perform the actual cropping operations
 */
async function performCropOperations(
  imageBuffer: Buffer,
  cropRegion: { left: number; top: number; width: number; height: number; },
  originalR2Key: string,
  jobId: string,
  mimeType: string,
): Promise<{
  buffer: Buffer;
  width: number;
  height: number;
  cropDimensions: { left: number; top: number; width: number; height: number; };
}> {
  // Crop the image
  const croppedBuffer = await sharp(imageBuffer)
    .extract(cropRegion)
    .toBuffer();

  // Get new dimensions
  const croppedMetadata = await sharp(croppedBuffer).metadata();
  const newWidth = croppedMetadata.width || cropRegion.width;
  const newHeight = croppedMetadata.height || cropRegion.height;

  // Upload cropped image back to R2 (overwrite original)
  await uploadToR2({
    key: originalR2Key,
    buffer: croppedBuffer,
    contentType: mimeType,
    metadata: { cropped: "true", jobId },
  });

  // Update job with crop info
  await prisma.imageEnhancementJob.update({
    where: { id: jobId },
    data: {
      wasCropped: true,
      cropDimensions: JSON.parse(JSON.stringify(cropRegion)),
    },
  });

  return {
    buffer: croppedBuffer,
    width: newWidth,
    height: newHeight,
    cropDimensions: cropRegion,
  };
}

/**
 * Step 5: Auto-crop image if needed
 * Returns new image buffer and dimensions, or original if no crop needed
 */
async function autoCropStep(
  imageBuffer: Buffer,
  originalWidth: number,
  originalHeight: number,
  analysisResult: AnalysisDetailedResult,
  originalR2Key: string,
  jobId: string,
  mimeType: string,
): Promise<{
  buffer: Buffer;
  width: number;
  height: number;
  wasCropped: boolean;
  cropDimensions:
    | { left: number; top: number; width: number; height: number; }
    | null;
}> {
  "use step";

  const noCropResult = {
    buffer: imageBuffer,
    width: originalWidth,
    height: originalHeight,
    wasCropped: false,
    cropDimensions: null,
  };

  // Check if cropping is needed
  if (
    !analysisResult.cropping.isCroppingNeeded ||
    !analysisResult.cropping.suggestedCrop ||
    !validateCropDimensions(analysisResult.cropping.suggestedCrop)
  ) {
    return noCropResult;
  }

  const cropRegion = cropDimensionsToPixels(
    analysisResult.cropping.suggestedCrop,
    originalWidth,
    originalHeight,
  );

  // Validate calculated region
  if (cropRegion.width <= 0 || cropRegion.height <= 0) {
    return noCropResult;
  }

  const { data, error } = await tryCatch(
    performCropOperations(
      imageBuffer,
      cropRegion,
      originalR2Key,
      jobId,
      mimeType,
    ),
  );

  if (error) {
    console.warn("Auto-crop failed, continuing with original:", error);
    return noCropResult;
  }

  return {
    buffer: data.buffer,
    width: data.width,
    height: data.height,
    wasCropped: true,
    cropDimensions: data.cropDimensions,
  };
}

/**
 * Step 6: Pad image to square for Gemini
 */
async function padImageForGemini(
  imageBuffer: Buffer,
  width: number,
  height: number,
): Promise<string> {
  "use step";

  const maxDimension = Math.max(width, height);
  const paddedBuffer = await sharp(imageBuffer)
    .resize(maxDimension, maxDimension, {
      fit: "contain",
      background: PADDING_BACKGROUND,
    })
    .toBuffer();

  return paddedBuffer.toString("base64");
}

/**
 * Step 7: Enhance image with Gemini AI using dynamic prompt
 */
async function enhanceWithGemini(
  imageBase64: string,
  mimeType: string,
  tier: "1K" | "2K" | "4K",
  originalWidth: number,
  originalHeight: number,
  promptOverride: string,
  referenceImages?: ReferenceImageData[],
  model?: string,
): Promise<Buffer> {
  "use step";

  const { data: enhanced, error } = await tryCatch(
    enhanceImageWithGemini({
      imageData: imageBase64,
      mimeType,
      tier,
      originalWidth,
      originalHeight,
      promptOverride,
      referenceImages,
      model,
    }),
  );

  if (error) {
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

  return enhanced;
}

/**
 * Step 8: Post-process (crop, resize) and upload to R2
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
  const { extractLeft, extractTop, extractWidth, extractHeight } = calculateCropRegion(
    geminiSize,
    originalWidth,
    originalHeight,
  );

  // Calculate target dimensions based on tier
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
 * Step 9: Update job status in database
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
    geminiModel?: string;
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
          geminiModel: data.geminiModel,
          geminiTemp: DEFAULT_TEMPERATURE,
        }
        : {}),
      ...(status === "FAILED" && data?.errorMessage
        ? { errorMessage: data.errorMessage }
        : {}),
    },
  });
}

/**
 * Step 10: Refund tokens on failure
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
 * Orchestrates the 4-stage AI image enhancement pipeline with durable execution:
 *
 * STAGE 1 - Analysis:
 *   1. Download original image from R2
 *   2. Get image metadata
 *   3. Analyze with vision model (detect defects, suggest cropping)
 *   4. Save analysis to database
 *
 * STAGE 2 - Auto-Crop (conditional):
 *   5. Auto-crop if needed, upload cropped version back to R2
 *
 * STAGE 3 - Dynamic Prompt & Enhancement:
 *   6. Pad image to square for Gemini
 *   7. Build dynamic enhancement prompt based on analysis
 *   8. Enhance with Gemini AI using tailored prompt
 *
 * STAGE 4 - Post-processing:
 *   9. Crop to original aspect ratio, resize to tier, upload to R2
 *   10. Update job status
 *   11. Refund tokens on failure
 */
/**
 * Helper function containing the core workflow steps
 */
async function executeEnhancementWorkflow(
  input: EnhanceImageInput,
): Promise<string> {
  const { jobId, originalR2Key, tier, sourceImageR2Key, blendSource } = input;

  // === STAGE 1: ANALYSIS ===

  // Step 1: Download original image
  let imageBuffer = await downloadOriginalImage(originalR2Key);

  // Step 1b: Prepare blend source image for reference (if applicable)
  // Priority: blendSource (new - base64 data) > sourceImageR2Key (deprecated - R2 key)
  let sourceImageData: ReferenceImageData | undefined;
  if (blendSource) {
    // New approach: base64 data provided directly (no download needed)
    sourceImageData = {
      imageData: blendSource.base64,
      mimeType: blendSource.mimeType,
      description: "Image to blend/merge with target",
    };
  } else if (sourceImageR2Key) {
    // Deprecated: download from R2 (for backwards compatibility)
    sourceImageData = await downloadBlendSourceStep(sourceImageR2Key);
  }

  // Step 2: Get image metadata
  const metadata = await getImageMetadata(imageBuffer);
  let currentWidth = metadata.width;
  let currentHeight = metadata.height;

  // Step 3: Analyze image with vision model
  const analysisResult = await analyzeImageStep(
    metadata.imageBase64,
    metadata.mimeType,
  );

  // Step 4: Save analysis to database
  await saveAnalysisToDb(jobId, analysisResult);

  // === STAGE 2: AUTO-CROP (Conditional) ===

  // Step 5: Auto-crop if needed
  const cropResult = await autoCropStep(
    imageBuffer,
    currentWidth,
    currentHeight,
    analysisResult.structuredAnalysis,
    originalR2Key,
    jobId,
    metadata.mimeType,
  );

  // Update current state with crop result
  imageBuffer = cropResult.buffer;
  currentWidth = cropResult.width;
  currentHeight = cropResult.height;

  // === STAGE 3: DYNAMIC PROMPT & ENHANCEMENT ===

  // Step 6: Pad image to square for Gemini
  const paddedBase64 = await padImageForGemini(
    imageBuffer,
    currentWidth,
    currentHeight,
  );

  // Build enhancement prompt based on analysis (blend or dynamic)
  const dynamicPrompt = sourceImageData
    ? buildBlendEnhancementPrompt(analysisResult.structuredAnalysis)
    : buildDynamicEnhancementPrompt(analysisResult.structuredAnalysis);

  // Get the appropriate model for this tier (FREE uses nano model, paid uses premium)
  const modelToUse = getModelForTier(tier);

  // Step 7: Enhance with Gemini using dynamic prompt
  const enhancedBuffer = await enhanceWithGemini(
    paddedBase64,
    metadata.mimeType,
    TIER_TO_SIZE[tier],
    currentWidth,
    currentHeight,
    dynamicPrompt,
    sourceImageData ? [sourceImageData] : undefined,
    modelToUse,
  );

  // === STAGE 4: POST-PROCESSING ===

  // Step 8: Post-process and upload
  const result = await processAndUpload(
    enhancedBuffer,
    tier,
    currentWidth,
    currentHeight,
    originalR2Key,
    jobId,
  );

  // Step 9: Update job as completed
  await updateJobStatus(jobId, "COMPLETED", {
    enhancedUrl: result.enhancedUrl,
    r2Key: result.r2Key,
    width: result.width,
    height: result.height,
    sizeBytes: result.sizeBytes,
    geminiModel: modelToUse,
  });

  return result.enhancedUrl;
}

export async function enhanceImage(input: EnhanceImageInput): Promise<{
  success: boolean;
  enhancedUrl?: string;
  error?: string;
}> {
  "use workflow";

  const { jobId, userId, tokensCost } = input;

  const { data: enhancedUrl, error } = await tryCatch(
    executeEnhancementWorkflow(input),
  );

  if (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Step 10: Refund tokens on failure
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

  return { success: true, enhancedUrl };
}
