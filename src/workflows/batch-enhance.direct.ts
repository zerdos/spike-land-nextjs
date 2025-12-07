/**
 * Direct Batch Image Enhancement (Dev Mode Fallback)
 *
 * This module provides a non-workflow version of the batch image enhancement logic
 * for local development where Vercel Workflow infrastructure is not available.
 *
 * In production, use the workflow version via start() from workflow/api.
 */

import prisma from "@/lib/prisma";
import { TokenBalanceManager } from "@/lib/tokens/balance-manager";
import { ENHANCEMENT_COSTS } from "@/lib/tokens/costs";
import { EnhancementTier, JobStatus } from "@prisma/client";
import { enhanceImageDirect } from "./enhance-image.direct";

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
 * Direct batch enhancement execution for dev mode.
 * This runs the enhancement synchronously without workflow infrastructure.
 */
export async function batchEnhanceImagesDirect(
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
  const { batchId, userId, images, tier } = input;
  const tokenCost = ENHANCEMENT_COSTS[tier];
  const results: BatchResult[] = [];

  console.log(`[Dev Batch Enhancement] Starting batch ${batchId} with ${images.length} images`);

  // Validate we have images to process
  if (!images || images.length === 0) {
    throw new Error("No images provided for batch enhancement");
  }

  // Process each image sequentially to avoid rate limits
  for (const image of images) {
    try {
      // Create job for this image
      const job = await prisma.imageEnhancementJob.create({
        data: {
          imageId: image.imageId,
          userId,
          tier,
          tokensCost: tokenCost,
          status: JobStatus.PROCESSING,
          processingStartedAt: new Date(),
        },
      });

      console.log(`[Dev Batch Enhancement] Processing image ${image.imageId} (job ${job.id})`);

      // Run the single image enhancement directly
      const result = await enhanceImageDirect({
        jobId: job.id,
        imageId: image.imageId,
        userId,
        originalR2Key: image.originalR2Key,
        tier,
        tokensCost: tokenCost,
      });

      results.push({
        imageId: image.imageId,
        jobId: job.id,
        success: result.success,
        error: result.error,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(
        `[Dev Batch Enhancement] Failed to process image ${image.imageId}:`,
        errorMessage,
      );
      results.push({
        imageId: image.imageId,
        success: false,
        error: errorMessage,
      });
    }
  }

  // Calculate summary
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(
    `[Dev Batch Enhancement] Batch ${batchId} completed: ${successful} successful, ${failed} failed`,
  );

  // Refund tokens for any failed jobs
  if (failed > 0) {
    const refundAmount = failed * tokenCost;
    const reason = `${failed} of ${images.length} jobs failed in batch`;

    const refundResult = await TokenBalanceManager.refundTokens(
      userId,
      refundAmount,
      batchId,
      reason,
    );

    if (!refundResult.success) {
      console.error("[Dev Batch Enhancement] Failed to refund tokens:", refundResult.error);
    }
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
