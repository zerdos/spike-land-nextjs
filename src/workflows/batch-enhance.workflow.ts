import prisma from "@/lib/prisma";
import { TokenBalanceManager } from "@/lib/tokens/balance-manager--workflow";
import { ENHANCEMENT_COSTS } from "@/lib/tokens/costs";
import { tryCatch } from "@/lib/try-catch--no-track";
import type { EnhancementTier } from "@prisma/client";
import { JobStatus } from "@prisma/client";
import { FatalError } from "workflow";
import { enhanceImage } from "./enhance-image.workflow";

// Allow 15 minutes for batch enhancements (to handle sequential processing)
export const maxDuration = 900;

export interface BatchEnhanceInput {
  batchId: string;
  userId: string;
  images: Array<{
    imageId: string;
    originalR2Key: string;
  }>;
  tier: EnhancementTier;
}

interface BatchResult {
  imageId: string;
  jobId?: string;
  success: boolean;
  error?: string;
}

/**
 * Step: Create enhancement job in database
 */
async function createEnhancementJob(
  imageId: string,
  userId: string,
  tier: EnhancementTier,
  tokensCost: number,
): Promise<string> {
  "use step";

  const job = await prisma.imageEnhancementJob.create({
    data: {
      imageId,
      userId,
      tier,
      tokensCost,
      status: JobStatus.PROCESSING,
      processingStartedAt: new Date(),
    },
  });

  return job.id;
}

/**
 * Step: Refund tokens for failed jobs
 */
async function refundFailedJobs(
  userId: string,
  failedCount: number,
  tier: EnhancementTier,
  batchId: string,
  reason: string,
): Promise<void> {
  "use step";

  if (failedCount === 0) return;

  const tokenCost = ENHANCEMENT_COSTS[tier];
  const refundAmount = failedCount * tokenCost;

  const result = await TokenBalanceManager.refundTokens(
    userId,
    refundAmount,
    batchId,
    reason,
  );

  if (!result.success) {
    console.error("Failed to refund tokens for batch:", result.error);
  }
}

/**
 * Batch Enhancement Workflow
 *
 * Orchestrates the enhancement of multiple images:
 * 1. Creates jobs for each image
 * 2. Runs individual enhance workflows sequentially (to avoid rate limits)
 * 3. Tracks results and handles partial failures
 * 4. Refunds tokens for any failed jobs
 */
export async function batchEnhanceImages(
  input: BatchEnhanceInput,
): Promise<{
  batchId: string;
  results: BatchResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}> {
  "use workflow";

  const { batchId, userId, images, tier } = input;
  const tokenCost = ENHANCEMENT_COSTS[tier];
  const results: BatchResult[] = [];

  // Validate we have images to process
  if (!images || images.length === 0) {
    throw new FatalError("No images provided for batch enhancement");
  }

  // Process each image sequentially to avoid rate limits
  for (const image of images) {
    // Create job for this image
    const jobResult = await tryCatch(
      createEnhancementJob(image.imageId, userId, tier, tokenCost),
    );

    if (jobResult.error) {
      const errorMessage = jobResult.error instanceof Error
        ? jobResult.error.message
        : String(jobResult.error);
      results.push({
        imageId: image.imageId,
        success: false,
        error: errorMessage,
      });
      continue;
    }

    const jobId = jobResult.data;

    // Run the single image enhancement workflow
    const enhanceResult = await tryCatch(
      enhanceImage({
        jobId,
        imageId: image.imageId,
        userId,
        originalR2Key: image.originalR2Key,
        tier,
        tokensCost: tokenCost,
      }),
    );

    if (enhanceResult.error) {
      const errorMessage = enhanceResult.error instanceof Error
        ? enhanceResult.error.message
        : String(enhanceResult.error);
      results.push({
        imageId: image.imageId,
        jobId,
        success: false,
        error: errorMessage,
      });
      continue;
    }

    results.push({
      imageId: image.imageId,
      jobId,
      success: enhanceResult.data.success,
      error: enhanceResult.data.error,
    });
  }

  // Calculate summary
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  // Refund tokens for any failed jobs
  if (failed > 0) {
    await refundFailedJobs(
      userId,
      failed,
      tier,
      batchId,
      `${failed} of ${images.length} jobs failed in batch`,
    );
  }

  return {
    batchId,
    results,
    summary: {
      total: images.length,
      successful,
      failed,
    },
  };
}
