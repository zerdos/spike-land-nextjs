/**
 * Job Cleanup Utilities
 *
 * Provides automatic cleanup for stuck enhancement jobs that exceed timeout thresholds.
 * Handles refunding tokens and updating job status to prevent indefinite PROCESSING state.
 */

import { logger } from "@/lib/errors/structured-logger";
import prisma from "@/lib/prisma";
import { TokenBalanceManager } from "@/lib/tokens/balance-manager";
import { JobStatus } from "@prisma/client";

export interface CleanupOptions {
  /**
   * Timeout threshold in milliseconds
   * @default 300000 (5 minutes)
   */
  timeoutMs?: number;

  /**
   * Dry run mode - find stuck jobs without making changes
   * @default false
   */
  dryRun?: boolean;

  /**
   * Maximum number of jobs to process in one cleanup run
   * @default 100
   */
  batchSize?: number;
}

export interface CleanupResult {
  /**
   * Total number of stuck jobs found
   */
  totalFound: number;

  /**
   * Number of jobs successfully cleaned up
   */
  cleanedUp: number;

  /**
   * Number of jobs that failed to clean up
   */
  failed: number;

  /**
   * Total tokens refunded across all jobs
   */
  tokensRefunded: number;

  /**
   * Details of cleaned up jobs
   */
  jobs: Array<{
    id: string;
    userId: string;
    tokensRefunded: number;
    processingDuration: number;
    error?: string;
  }>;

  /**
   * Any errors encountered during cleanup
   */
  errors: Array<{
    jobId: string;
    error: string;
  }>;
}

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_BATCH_SIZE = 100;

/**
 * Find jobs that have been stuck in PROCESSING state for too long
 */
export async function findStuckJobs(
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
  batchSize: number = DEFAULT_BATCH_SIZE,
): Promise<
  Array<{
    id: string;
    userId: string;
    tokensCost: number;
    processingStartedAt: Date | null;
    updatedAt: Date;
  }>
> {
  const timeoutThreshold = new Date(Date.now() - timeoutMs);
  const cleanupLogger = logger.child({ action: "find_stuck_jobs" });

  cleanupLogger.debug("Searching for stuck jobs", {
    timeoutMs,
    timeoutThreshold: timeoutThreshold.toISOString(),
    batchSize,
  });

  const stuckJobs = await prisma.imageEnhancementJob.findMany({
    where: {
      status: JobStatus.PROCESSING,
      OR: [
        // Jobs that started processing but never completed
        {
          processingStartedAt: {
            lte: timeoutThreshold,
          },
        },
        // Jobs marked as PROCESSING but never got processingStartedAt timestamp
        // (shouldn't happen, but defensive check)
        {
          processingStartedAt: null,
          updatedAt: {
            lte: timeoutThreshold,
          },
        },
      ],
    },
    select: {
      id: true,
      userId: true,
      tokensCost: true,
      processingStartedAt: true,
      updatedAt: true,
    },
    orderBy: {
      updatedAt: "asc", // Process oldest jobs first
    },
    take: batchSize,
  });

  cleanupLogger.info("Found stuck jobs", {
    count: stuckJobs.length,
    oldestJob: stuckJobs.length > 0 && stuckJobs[0]
      ? (stuckJobs[0].processingStartedAt?.toISOString() ??
        stuckJobs[0].updatedAt.toISOString())
      : null,
  });

  return stuckJobs;
}

/**
 * Clean up a single stuck job
 */
async function cleanupSingleJob(
  job: {
    id: string;
    userId: string;
    tokensCost: number;
    processingStartedAt: Date | null;
    updatedAt: Date;
  },
): Promise<{
  success: boolean;
  tokensRefunded: number;
  processingDuration: number;
  error?: string;
}> {
  const jobLogger = logger.child({
    jobId: job.id,
    userId: job.userId,
  });

  try {
    jobLogger.info("Cleaning up stuck job", {
      tokensCost: job.tokensCost,
      processingStartedAt: job.processingStartedAt?.toISOString(),
    });

    // Calculate how long the job was stuck
    const stuckSince = job.processingStartedAt || job.updatedAt;
    const processingDuration = Date.now() - stuckSince.getTime();

    // Use transaction to ensure atomic update + refund
    await prisma.$transaction(async (tx) => {
      // Update job status to FAILED
      await tx.imageEnhancementJob.update({
        where: { id: job.id },
        data: {
          status: JobStatus.FAILED,
          errorMessage: `Job timed out after ${
            Math.round(processingDuration / 1000)
          }s. Automatically cleaned up and tokens refunded.`,
          processingCompletedAt: new Date(),
        },
      });

      jobLogger.debug("Job marked as FAILED");
    });

    // Refund tokens outside transaction to avoid nested transaction issues
    const refundResult = await TokenBalanceManager.refundTokens(
      job.userId,
      job.tokensCost,
      job.id,
      `Job timeout cleanup - stuck for ${Math.round(processingDuration / 1000)}s`,
    );

    if (!refundResult.success) {
      throw new Error(`Token refund failed: ${refundResult.error}`);
    }

    jobLogger.info("Job cleaned up successfully", {
      tokensRefunded: job.tokensCost,
      processingDuration: Math.round(processingDuration / 1000),
    });

    return {
      success: true,
      tokensRefunded: job.tokensCost,
      processingDuration,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    jobLogger.error(
      "Failed to cleanup job",
      error instanceof Error ? error : new Error(errorMessage),
    );

    return {
      success: false,
      tokensRefunded: 0,
      processingDuration: 0,
      error: errorMessage,
    };
  }
}

/**
 * Clean up stuck jobs that exceed the timeout threshold
 *
 * This function:
 * 1. Finds jobs stuck in PROCESSING state
 * 2. Marks them as FAILED with timeout error message
 * 3. Refunds tokens to the user
 * 4. Returns detailed cleanup results
 *
 * @param options - Cleanup configuration options
 * @returns Detailed results of the cleanup operation
 */
export async function cleanupStuckJobs(
  options: CleanupOptions = {},
): Promise<CleanupResult> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    dryRun = false,
    batchSize = DEFAULT_BATCH_SIZE,
  } = options;

  const cleanupLogger = logger.child({
    action: "cleanup_stuck_jobs",
    timeoutMs,
    dryRun,
  });

  cleanupLogger.info("Starting stuck jobs cleanup", {
    timeoutMs,
    timeoutMinutes: timeoutMs / 60000,
    dryRun,
    batchSize,
  });

  try {
    // Find stuck jobs
    const stuckJobs = await findStuckJobs(timeoutMs, batchSize);

    if (stuckJobs.length === 0) {
      cleanupLogger.info("No stuck jobs found");
      return {
        totalFound: 0,
        cleanedUp: 0,
        failed: 0,
        tokensRefunded: 0,
        jobs: [],
        errors: [],
      };
    }

    // If dry run, just return what we found without making changes
    if (dryRun) {
      cleanupLogger.info("Dry run - no changes made", {
        jobsFound: stuckJobs.length,
      });
      return {
        totalFound: stuckJobs.length,
        cleanedUp: 0,
        failed: 0,
        tokensRefunded: 0,
        jobs: stuckJobs.map((job) => ({
          id: job.id,
          userId: job.userId,
          tokensRefunded: 0,
          processingDuration: Date.now() -
            (job.processingStartedAt || job.updatedAt).getTime(),
        })),
        errors: [],
      };
    }

    // Clean up each job
    const results = await Promise.all(
      stuckJobs.map((job) => cleanupSingleJob(job)),
    );

    // Aggregate results
    const cleanedUp = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const tokensRefunded = results.reduce(
      (sum, r) => sum + r.tokensRefunded,
      0,
    );

    const jobDetails = stuckJobs.map((job, index) => {
      const result = results[index];
      if (!result) {
        throw new Error(`Missing result for job ${job.id}`);
      }
      return {
        id: job.id,
        userId: job.userId,
        tokensRefunded: result.tokensRefunded,
        processingDuration: result.processingDuration,
        ...(result.error && { error: result.error }),
      };
    });

    const errors = stuckJobs
      .map((job, index) => {
        const result = results[index];
        return {
          jobId: job.id,
          error: result?.error || "",
        };
      })
      .filter((e) => e.error);

    cleanupLogger.info("Cleanup completed", {
      totalFound: stuckJobs.length,
      cleanedUp,
      failed,
      tokensRefunded,
    });

    return {
      totalFound: stuckJobs.length,
      cleanedUp,
      failed,
      tokensRefunded,
      jobs: jobDetails,
      errors,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    cleanupLogger.error(
      "Cleanup process failed",
      error instanceof Error ? error : new Error(errorMessage),
    );

    throw error;
  }
}
