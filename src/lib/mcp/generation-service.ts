import { type AspectRatio, detectAspectRatio } from "@/lib/ai/aspect-ratio";
import {
  DEFAULT_MODEL,
  generateImageWithGemini,
  modifyImageWithGemini,
} from "@/lib/ai/gemini-client";
import prisma from "@/lib/prisma";
import { uploadToR2 } from "@/lib/storage/r2-client";
import { TokenBalanceManager } from "@/lib/tokens/balance-manager";
import { EnhancementTier, getMcpGenerationCost } from "@/lib/tokens/costs";
import { tryCatch } from "@/lib/try-catch";
import { JobStatus, McpJobType } from "@prisma/client";
import sharp from "sharp";

// Security: Maximum concurrent PROCESSING jobs per user to prevent burst attacks
const MAX_CONCURRENT_JOBS_PER_USER = 3;

/**
 * Classifies errors into user-friendly messages with error codes
 * Helps users understand what went wrong and how to fix it
 * @internal Exported for testing purposes
 */
export function classifyError(
  error: unknown,
): { message: string; code: string; } {
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();

    // Timeout errors
    if (
      errorMessage.includes("timeout") || errorMessage.includes("timed out")
    ) {
      return {
        message: "Generation took too long. Try a lower quality tier.",
        code: "TIMEOUT",
      };
    }

    // Content policy violations
    if (
      errorMessage.includes("content") &&
      (errorMessage.includes("policy") || errorMessage.includes("blocked"))
    ) {
      return {
        message: "Your prompt may violate content policies. Please revise.",
        code: "CONTENT_POLICY",
      };
    }

    // Rate limiting
    if (
      errorMessage.includes("rate") || errorMessage.includes("quota") ||
      errorMessage.includes("429")
    ) {
      return {
        message: "Service temporarily unavailable. Please try again later.",
        code: "RATE_LIMITED",
      };
    }

    // API key or authentication errors
    if (
      errorMessage.includes("api key") ||
      errorMessage.includes("unauthorized") ||
      errorMessage.includes("401")
    ) {
      return {
        message: "API configuration error. Please contact support.",
        code: "AUTH_ERROR",
      };
    }

    // Image processing errors
    if (
      errorMessage.includes("image") &&
      (errorMessage.includes("invalid") || errorMessage.includes("corrupt"))
    ) {
      return {
        message: "Unable to process the image. Please try a different format.",
        code: "INVALID_IMAGE",
      };
    }

    // Return original message for other errors
    return { message: error.message, code: "GENERATION_ERROR" };
  }

  return { message: "An unexpected error occurred", code: "UNKNOWN" };
}

export interface CreateGenerationJobParams {
  userId: string;
  apiKeyId?: string;
  prompt: string;
  tier: EnhancementTier;
  negativePrompt?: string;
  /** Optional aspect ratio for the generated image (default: 1:1) */
  aspectRatio?: AspectRatio;
}

export interface CreateModificationJobParams {
  userId: string;
  apiKeyId?: string;
  prompt: string;
  tier: EnhancementTier;
  imageData: string; // Base64 encoded
  mimeType: string;
}

export interface JobResult {
  success: boolean;
  jobId?: string;
  tokensCost?: number;
  error?: string;
}

/**
 * Check if user has too many concurrent processing jobs
 */
async function checkConcurrentJobLimit(userId: string): Promise<boolean> {
  const processingCount = await prisma.mcpGenerationJob.count({
    where: {
      userId,
      status: JobStatus.PROCESSING,
    },
  });
  return processingCount < MAX_CONCURRENT_JOBS_PER_USER;
}

/**
 * Creates and processes a new image generation job
 * Uses atomic token consumption to prevent race conditions
 */
export async function createGenerationJob(
  params: CreateGenerationJobParams,
): Promise<JobResult> {
  const { userId, apiKeyId, prompt, tier, negativePrompt, aspectRatio } = params;
  const tokensCost = getMcpGenerationCost(tier);

  // Security: Check concurrent job limit to prevent burst attacks
  const canCreateJob = await checkConcurrentJobLimit(userId);
  if (!canCreateJob) {
    return {
      success: false,
      error:
        `Too many concurrent jobs. Maximum ${MAX_CONCURRENT_JOBS_PER_USER} jobs can be processed at once. Please wait for existing jobs to complete.`,
    };
  }

  // Atomic token consumption - handles balance check within transaction
  // This prevents race conditions where two requests could both pass a separate balance check
  const consumeResult = await TokenBalanceManager.consumeTokens({
    userId,
    amount: tokensCost,
    source: "mcp_generation",
    sourceId: "pending", // Will be job ID
    metadata: { tier, type: "GENERATE" },
  });

  if (!consumeResult.success) {
    return {
      success: false,
      error: consumeResult.error ||
        `Insufficient token balance. Required: ${tokensCost} tokens`,
    };
  }

  // Create job record
  const job = await prisma.mcpGenerationJob.create({
    data: {
      userId,
      apiKeyId: apiKeyId || null,
      type: McpJobType.GENERATE,
      tier,
      tokensCost,
      status: JobStatus.PROCESSING,
      prompt,
      geminiModel: DEFAULT_MODEL,
      processingStartedAt: new Date(),
    },
  });

  // Process generation in the background
  processGenerationJob(job.id, {
    prompt,
    tier: tier.replace("TIER_", "") as "1K" | "2K" | "4K",
    negativePrompt,
    aspectRatio,
    userId,
  }).catch((error) => {
    console.error(`Generation job ${job.id} failed:`, error);
  });

  return {
    success: true,
    jobId: job.id,
    tokensCost,
  };
}

/**
 * Creates and processes a new image modification job
 * Uses atomic token consumption to prevent race conditions
 */
export async function createModificationJob(
  params: CreateModificationJobParams,
): Promise<JobResult> {
  const { userId, apiKeyId, prompt, tier, imageData, mimeType } = params;
  const tokensCost = getMcpGenerationCost(tier);

  // Security: Check concurrent job limit to prevent burst attacks
  const canCreateJob = await checkConcurrentJobLimit(userId);
  if (!canCreateJob) {
    return {
      success: false,
      error:
        `Too many concurrent jobs. Maximum ${MAX_CONCURRENT_JOBS_PER_USER} jobs can be processed at once. Please wait for existing jobs to complete.`,
    };
  }

  // Atomic token consumption - handles balance check within transaction
  // This prevents race conditions where two requests could both pass a separate balance check
  const consumeResult = await TokenBalanceManager.consumeTokens({
    userId,
    amount: tokensCost,
    source: "mcp_generation",
    sourceId: "pending",
    metadata: { tier, type: "MODIFY" },
  });

  if (!consumeResult.success) {
    return {
      success: false,
      error: consumeResult.error ||
        `Insufficient token balance. Required: ${tokensCost} tokens`,
    };
  }

  // Create job record
  const job = await prisma.mcpGenerationJob.create({
    data: {
      userId,
      apiKeyId: apiKeyId || null,
      type: McpJobType.MODIFY,
      tier,
      tokensCost,
      status: JobStatus.PROCESSING,
      prompt,
      geminiModel: DEFAULT_MODEL,
      processingStartedAt: new Date(),
    },
  });

  // Process modification in the background
  processModificationJob(job.id, {
    prompt,
    tier: tier.replace("TIER_", "") as "1K" | "2K" | "4K",
    imageData,
    mimeType,
    userId,
  }).catch((error) => {
    console.error(`Modification job ${job.id} failed:`, error);
  });

  return {
    success: true,
    jobId: job.id,
    tokensCost,
  };
}

/**
 * Process a generation job (runs in background)
 */
async function processGenerationJob(
  jobId: string,
  params: {
    prompt: string;
    tier: "1K" | "2K" | "4K";
    negativePrompt?: string;
    aspectRatio?: AspectRatio;
    userId: string;
  },
): Promise<void> {
  const { data: imageBuffer, error: generateError } = await tryCatch(
    generateImageWithGemini({
      prompt: params.prompt,
      tier: params.tier,
      negativePrompt: params.negativePrompt,
      aspectRatio: params.aspectRatio,
    }),
  );

  if (generateError) {
    await handleGenerationJobFailure(jobId, generateError);
    return;
  }

  const { data: metadata, error: metadataError } = await tryCatch(
    sharp(imageBuffer).metadata(),
  );

  if (metadataError) {
    await handleGenerationJobFailure(jobId, metadataError);
    return;
  }

  const r2Key = `mcp-generated/${params.userId}/${jobId}.jpg`;
  const { data: uploadResult, error: uploadError } = await tryCatch(
    uploadToR2({
      key: r2Key,
      buffer: imageBuffer,
      contentType: "image/jpeg",
    }),
  );

  if (uploadError) {
    await handleGenerationJobFailure(jobId, uploadError);
    return;
  }

  const { error: updateError } = await tryCatch(
    prisma.mcpGenerationJob.update({
      where: { id: jobId },
      data: {
        status: JobStatus.COMPLETED,
        outputImageUrl: uploadResult.url,
        outputImageR2Key: r2Key,
        outputWidth: metadata.width,
        outputHeight: metadata.height,
        outputSizeBytes: imageBuffer.length,
        processingCompletedAt: new Date(),
      },
    }),
  );

  if (updateError) {
    await handleGenerationJobFailure(jobId, updateError);
    return;
  }

  console.log(`Generation job ${jobId} completed successfully`);
}

/**
 * Handle generation job failure - logs error, updates job status, and refunds tokens
 */
async function handleGenerationJobFailure(
  jobId: string,
  error: Error,
): Promise<void> {
  console.error(`Generation job ${jobId} failed:`, error);

  // Classify error for user-friendly message
  const classifiedError = classifyError(error);
  console.log(
    `Generation job ${jobId} error classified as: ${classifiedError.code}`,
  );

  // Update job with failure
  await tryCatch(
    prisma.mcpGenerationJob.update({
      where: { id: jobId },
      data: {
        status: JobStatus.FAILED,
        errorMessage: classifiedError.message,
        processingCompletedAt: new Date(),
      },
    }),
  );

  // Refund tokens
  const { data: job } = await tryCatch(
    prisma.mcpGenerationJob.findUnique({
      where: { id: jobId },
    }),
  );

  if (job) {
    await TokenBalanceManager.refundTokens(
      job.userId,
      job.tokensCost,
      jobId,
      `Generation job failed: ${classifiedError.code}`,
    );

    await tryCatch(
      prisma.mcpGenerationJob.update({
        where: { id: jobId },
        data: { status: JobStatus.REFUNDED },
      }),
    );
  }
}

/**
 * Process a modification job (runs in background)
 */
async function processModificationJob(
  jobId: string,
  params: {
    prompt: string;
    tier: "1K" | "2K" | "4K";
    imageData: string;
    mimeType: string;
    userId: string;
  },
): Promise<void> {
  // Store input image in R2 for before/after comparison and retry capability
  const inputBuffer = Buffer.from(params.imageData, "base64");
  const inputExtension = params.mimeType.split("/")[1] || "jpg";
  const inputR2Key = `mcp-input/${params.userId}/${jobId}.${inputExtension}`;

  // Get input image metadata to detect aspect ratio
  const { data: inputMetadata, error: inputMetadataError } = await tryCatch(
    sharp(inputBuffer).metadata(),
  );

  if (inputMetadataError) {
    await handleModificationJobFailure(jobId, inputMetadataError);
    return;
  }

  // Auto-detect aspect ratio from input image dimensions
  const detectedAspectRatio = detectAspectRatio(
    inputMetadata.width || 1024,
    inputMetadata.height || 1024,
  );
  console.log(
    `Modification job ${jobId}: detected aspect ratio ${detectedAspectRatio} from ${inputMetadata.width}x${inputMetadata.height}`,
  );

  const { data: inputUploadResult, error: inputUploadError } = await tryCatch(
    uploadToR2({
      key: inputR2Key,
      buffer: inputBuffer,
      contentType: params.mimeType,
    }),
  );

  if (inputUploadError) {
    await handleModificationJobFailure(jobId, inputUploadError);
    return;
  }

  // Update job with input image URL
  const { error: inputUpdateError } = await tryCatch(
    prisma.mcpGenerationJob.update({
      where: { id: jobId },
      data: {
        inputImageUrl: inputUploadResult.url,
        inputImageR2Key: inputR2Key,
      },
    }),
  );

  if (inputUpdateError) {
    await handleModificationJobFailure(jobId, inputUpdateError);
    return;
  }

  // Modify image with auto-detected aspect ratio
  const { data: imageBuffer, error: modifyError } = await tryCatch(
    modifyImageWithGemini({
      prompt: params.prompt,
      tier: params.tier,
      imageData: params.imageData,
      mimeType: params.mimeType,
      aspectRatio: detectedAspectRatio,
    }),
  );

  if (modifyError) {
    await handleModificationJobFailure(jobId, modifyError);
    return;
  }

  // Get image metadata
  const { data: metadata, error: metadataError } = await tryCatch(
    sharp(imageBuffer).metadata(),
  );

  if (metadataError) {
    await handleModificationJobFailure(jobId, metadataError);
    return;
  }

  // Upload to R2
  const r2Key = `mcp-modified/${params.userId}/${jobId}.jpg`;
  const { data: uploadResult, error: uploadError } = await tryCatch(
    uploadToR2({
      key: r2Key,
      buffer: imageBuffer,
      contentType: "image/jpeg",
    }),
  );

  if (uploadError) {
    await handleModificationJobFailure(jobId, uploadError);
    return;
  }

  // Update job with success
  const { error: updateError } = await tryCatch(
    prisma.mcpGenerationJob.update({
      where: { id: jobId },
      data: {
        status: JobStatus.COMPLETED,
        outputImageUrl: uploadResult.url,
        outputImageR2Key: r2Key,
        outputWidth: metadata.width,
        outputHeight: metadata.height,
        outputSizeBytes: imageBuffer.length,
        processingCompletedAt: new Date(),
      },
    }),
  );

  if (updateError) {
    await handleModificationJobFailure(jobId, updateError);
    return;
  }

  console.log(`Modification job ${jobId} completed successfully`);
}

/**
 * Handle modification job failure - logs error, updates job status, and refunds tokens
 */
async function handleModificationJobFailure(
  jobId: string,
  error: Error,
): Promise<void> {
  console.error(`Modification job ${jobId} failed:`, error);

  // Classify error for user-friendly message
  const classifiedError = classifyError(error);
  console.log(
    `Modification job ${jobId} error classified as: ${classifiedError.code}`,
  );

  // Update job with failure
  await tryCatch(
    prisma.mcpGenerationJob.update({
      where: { id: jobId },
      data: {
        status: JobStatus.FAILED,
        errorMessage: classifiedError.message,
        processingCompletedAt: new Date(),
      },
    }),
  );

  // Refund tokens
  const { data: job } = await tryCatch(
    prisma.mcpGenerationJob.findUnique({
      where: { id: jobId },
    }),
  );

  if (job) {
    await TokenBalanceManager.refundTokens(
      job.userId,
      job.tokensCost,
      jobId,
      `Modification job failed: ${classifiedError.code}`,
    );

    await tryCatch(
      prisma.mcpGenerationJob.update({
        where: { id: jobId },
        data: { status: JobStatus.REFUNDED },
      }),
    );
  }
}

/**
 * Get a job by ID
 */
export async function getJob(jobId: string, userId?: string) {
  const where = userId ? { id: jobId, userId } : { id: jobId };

  return prisma.mcpGenerationJob.findFirst({
    where,
    select: {
      id: true,
      type: true,
      tier: true,
      tokensCost: true,
      status: true,
      prompt: true,
      inputImageUrl: true,
      outputImageUrl: true,
      outputWidth: true,
      outputHeight: true,
      errorMessage: true,
      createdAt: true,
      processingStartedAt: true,
      processingCompletedAt: true,
    },
  });
}

/**
 * Get job history for a user
 */
export async function getJobHistory(
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    type?: McpJobType;
  } = {},
) {
  const { limit = 20, offset = 0, type } = options;

  const where = {
    userId,
    ...(type && { type }),
  };

  const [jobs, total] = await Promise.all([
    prisma.mcpGenerationJob.findMany({
      where,
      select: {
        id: true,
        type: true,
        tier: true,
        tokensCost: true,
        status: true,
        prompt: true,
        inputImageUrl: true,
        outputImageUrl: true,
        outputWidth: true,
        outputHeight: true,
        createdAt: true,
        processingCompletedAt: true,
        apiKey: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.mcpGenerationJob.count({ where }),
  ]);

  return {
    jobs: jobs.map((job) => ({
      id: job.id,
      type: job.type,
      tier: job.tier,
      tokensCost: job.tokensCost,
      status: job.status,
      prompt: job.prompt,
      inputImageUrl: job.inputImageUrl,
      outputImageUrl: job.outputImageUrl,
      outputWidth: job.outputWidth,
      outputHeight: job.outputHeight,
      createdAt: job.createdAt.toISOString(),
      processingCompletedAt: job.processingCompletedAt?.toISOString() || null,
      apiKeyName: job.apiKey?.name || null,
    })),
    total,
    hasMore: offset + limit < total,
  };
}
