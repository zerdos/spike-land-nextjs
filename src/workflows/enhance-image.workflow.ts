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
} from "@/lib/ai/gemini-client--workflow";
import prisma from "@/lib/prisma";
import { downloadFromR2, uploadToR2 } from "@/lib/storage/r2-client--workflow";
import { TokenBalanceManager } from "@/lib/tokens/balance-manager--workflow";
import { tryCatch } from "@/lib/try-catch--no-track";
import { EnhancementTier, JobStatus } from "@prisma/client";
import sharp from "sharp";
import { FatalError } from "workflow";
import {
  calculateCropRegion,
  calculateTargetDimensions,
  createWorkflowContext,
  cropDimensionsToPixels,
  DEFAULT_IMAGE_DIMENSION,
  ENHANCED_JPEG_QUALITY,
  type EnhanceImageInput,
  generateEnhancedR2Key,
  PADDING_BACKGROUND,
  recordSoftFailure,
  recordStageSuccess,
  TIER_TO_SIZE,
  validateCropDimensions,
  type WorkflowContext,
  WorkflowStage,
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

/** Blend source input - either base64 data or R2 key */
interface BlendSourceInput {
  /** Base64 data provided directly (preferred) */
  blendSource?: { base64: string; mimeType: string; } | null;
  /** R2 key for backwards compatibility (deprecated) */
  sourceImageR2Key?: string | null;
}

/**
 * Resolves blend source from multiple input formats
 *
 * Handles two input formats:
 * 1. blendSource (new): Base64 data provided directly from client upload
 * 2. sourceImageR2Key (deprecated): R2 key requiring download
 *
 * Error Boundary: BLEND_SOURCE (recoverable)
 * - On failure: Returns undefined, workflow continues without blend
 *
 * @param input - Blend source input containing either base64 or R2 key
 * @param context - Workflow context for tracking
 * @returns ReferenceImageData if successful, undefined if failed or not provided
 */
async function resolveBlendSource(
  input: BlendSourceInput,
  context: WorkflowContext,
): Promise<ReferenceImageData | undefined> {
  const { blendSource, sourceImageR2Key } = input;

  // Priority 1: Use blendSource if provided (new approach - no download needed)
  if (blendSource?.base64 && blendSource?.mimeType) {
    recordStageSuccess(context, WorkflowStage.BLEND_SOURCE);
    return {
      imageData: blendSource.base64,
      mimeType: blendSource.mimeType,
      description: "Image to blend/merge with target",
    };
  }

  // Priority 2: Download from R2 if key provided (deprecated approach)
  if (sourceImageR2Key) {
    const result = await downloadBlendSourceStep(sourceImageR2Key);
    if (result) {
      recordStageSuccess(context, WorkflowStage.BLEND_SOURCE);
      return result;
    }
    // downloadBlendSourceStep handles its own error logging
    recordSoftFailure(
      context,
      WorkflowStage.BLEND_SOURCE,
      "Failed to download blend source from R2",
    );
    return undefined;
  }

  // No blend source provided - this is fine, not an error
  return undefined;
}

/**
 * Step 1: Download original image from R2
 *
 * Error Boundary: DOWNLOAD (non-recoverable, retryable)
 * - On failure: FatalError thrown, workflow stops
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
 *
 * Error Boundary: METADATA (recoverable)
 * - On failure: Uses default dimensions (1024x1024) and JPEG mime type
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
 *
 * Error Boundary: ANALYSIS (recoverable)
 * - On failure: Returns default analysis with no defects detected
 * - Workflow continues with generic enhancement prompt
 */
async function analyzeImageStep(
  imageBase64: string,
  mimeType: string,
): Promise<ImageAnalysisResultV2> {
  "use step";

  const { data, error } = await tryCatch(analyzeImageV2(imageBase64, mimeType));

  if (error) {
    // Soft failure: Don't fail the job if analysis fails - return default analysis
    // This is documented as a recoverable error in ERROR_BOUNDARIES[WorkflowStage.ANALYSIS]
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
 *
 * Error Boundary: SAVE (non-recoverable, retryable)
 * - On failure: Error propagates, workflow retries
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
 *
 * Error Boundary: BLEND_SOURCE (recoverable)
 * - On failure: Returns undefined, workflow continues without blend
 * - This step is soft-failing by design
 *
 * @deprecated Use resolveBlendSource() which handles both base64 and R2 key inputs
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
 *
 * Error Boundary: CROP (recoverable)
 * - On failure: Returns original image without cropping
 * - Workflow continues with uncropped image
 *
 * @returns New image buffer and dimensions, or original if no crop needed/failed
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
 *
 * Error Boundary: PAD (non-recoverable, retryable)
 * - On failure: Error propagates, workflow retries
 * - Required for Gemini which expects square input
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
 *
 * Error Boundary: ENHANCE (non-recoverable, selective retry)
 * - On API key/quota/invalid errors: FatalError thrown, no retry
 * - On transient errors: Error propagates, workflow retries
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
 *
 * Error Boundary: POST_PROCESS (non-recoverable, retryable)
 * - On dimension errors: FatalError thrown
 * - On upload errors: Error propagates, workflow retries
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
 *
 * Error Boundary: SAVE (non-recoverable, retryable)
 * - On failure: Error propagates, workflow retries
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
 *
 * Error Boundary: REFUND (recoverable)
 * - On failure: Error is logged but not propagated
 * - Job status update continues regardless of refund success
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
 * Orchestrates the 4-stage AI image enhancement pipeline with durable execution.
 *
 * ## Error Boundary Summary
 *
 * | Stage       | Error Type          | Behavior                    |
 * |-------------|---------------------|----------------------------|
 * | DOWNLOAD    | Non-recoverable     | FatalError, stops workflow |
 * | METADATA    | Recoverable         | Uses defaults (1024x1024)  |
 * | ANALYSIS    | Recoverable         | Uses generic prompt        |
 * | BLEND_SOURCE| Recoverable         | Proceeds without blend     |
 * | CROP        | Recoverable         | Keeps original image       |
 * | PAD         | Non-recoverable     | Retries automatically      |
 * | ENHANCE     | Selective           | FatalError on API errors   |
 * | POST_PROCESS| Non-recoverable     | Retries or FatalError      |
 * | SAVE        | Non-recoverable     | Retries automatically      |
 * | REFUND      | Recoverable         | Logs error, continues      |
 *
 * ## Pipeline Stages
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

  // Create workflow context for tracking progress and errors
  const context = createWorkflowContext(jobId);

  // === STAGE 1: ANALYSIS ===

  // Step 1: Download original image (DOWNLOAD - non-recoverable)
  let imageBuffer = await downloadOriginalImage(originalR2Key);
  recordStageSuccess(context, WorkflowStage.DOWNLOAD);

  // Step 1b: Resolve blend source using unified handler (BLEND_SOURCE - recoverable)
  // This consolidates the 6+ conditional branches into a single function
  const sourceImageData = await resolveBlendSource(
    { blendSource, sourceImageR2Key },
    context,
  );

  // Step 2: Get image metadata (METADATA - recoverable, uses defaults)
  const metadata = await getImageMetadata(imageBuffer);
  recordStageSuccess(context, WorkflowStage.METADATA);
  let currentWidth = metadata.width;
  let currentHeight = metadata.height;

  // Step 3: Analyze image with vision model (ANALYSIS - recoverable)
  const analysisResult = await analyzeImageStep(
    metadata.imageBase64,
    metadata.mimeType,
  );
  recordStageSuccess(context, WorkflowStage.ANALYSIS);

  // Step 4: Save analysis to database (SAVE - retryable)
  await saveAnalysisToDb(jobId, analysisResult);

  // === STAGE 2: AUTO-CROP (Conditional) ===

  // Step 5: Auto-crop if needed (CROP - recoverable)
  const cropResult = await autoCropStep(
    imageBuffer,
    currentWidth,
    currentHeight,
    analysisResult.structuredAnalysis,
    originalR2Key,
    jobId,
    metadata.mimeType,
  );
  recordStageSuccess(context, WorkflowStage.CROP);

  // Update current state with crop result
  imageBuffer = cropResult.buffer;
  currentWidth = cropResult.width;
  currentHeight = cropResult.height;

  // === STAGE 3: DYNAMIC PROMPT & ENHANCEMENT ===

  // Step 6: Pad image to square for Gemini (PAD - retryable)
  const paddedBase64 = await padImageForGemini(
    imageBuffer,
    currentWidth,
    currentHeight,
  );
  recordStageSuccess(context, WorkflowStage.PAD);

  // Build enhancement prompt based on analysis (blend or dynamic)
  const dynamicPrompt = sourceImageData
    ? buildBlendEnhancementPrompt(analysisResult.structuredAnalysis)
    : buildDynamicEnhancementPrompt(analysisResult.structuredAnalysis);

  // Get the appropriate model for this tier (FREE uses nano model, paid uses premium)
  const modelToUse = getModelForTier(tier);

  // Step 7: Enhance with Gemini using dynamic prompt (ENHANCE - selective retry)
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
  recordStageSuccess(context, WorkflowStage.ENHANCE);

  // === STAGE 4: POST-PROCESSING ===

  // Step 8: Post-process and upload (POST_PROCESS - retryable)
  const result = await processAndUpload(
    enhancedBuffer,
    tier,
    currentWidth,
    currentHeight,
    originalR2Key,
    jobId,
  );
  recordStageSuccess(context, WorkflowStage.POST_PROCESS);

  // Step 9: Update job as completed (SAVE - retryable)
  await updateJobStatus(jobId, "COMPLETED", {
    enhancedUrl: result.enhancedUrl,
    r2Key: result.r2Key,
    width: result.width,
    height: result.height,
    sizeBytes: result.sizeBytes,
    geminiModel: modelToUse,
  });
  recordStageSuccess(context, WorkflowStage.SAVE);

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
