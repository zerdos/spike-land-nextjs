import type { LogContext } from "@/lib/errors/structured-logger";
import prisma from "@/lib/prisma";
import { TokenBalanceManager } from "@/lib/tokens/balance-manager";
import { tryCatch } from "@/lib/try-catch";
import { enhanceImageDirect, type EnhanceImageInput } from "@/workflows/enhance-image.direct";
import { enhanceImage } from "@/workflows/enhance-image.workflow";
import { JobStatus } from "@prisma/client";
import { start } from "workflow/api";

/**
 * Execution mode for the enhancement workflow
 */
export type ExecutionMode = "workflow" | "direct";

/**
 * Determines the execution mode based on environment
 *
 * Override: Set ENHANCEMENT_EXECUTION_MODE to force a specific mode
 * Default: Uses workflow in Vercel, direct in development
 */
export function getExecutionMode(): ExecutionMode {
  const override = process.env.ENHANCEMENT_EXECUTION_MODE;
  if (override === "workflow" || override === "direct") {
    return override;
  }

  // Production: Use Vercel's durable workflow infrastructure
  // Development: Run enhancement directly
  return process.env.VERCEL === "1" ? "workflow" : "direct";
}

/**
 * Checks if running in Vercel environment
 */
export function isVercelEnvironment(): boolean {
  return process.env.VERCEL === "1";
}

/**
 * Result from starting an enhancement
 */
interface EnhancementStartResult {
  success: true;
  workflowRunId?: string;
}

/**
 * Error result from starting an enhancement
 */
interface EnhancementStartError {
  success: false;
  error: string;
}

export type StartEnhancementResult =
  | EnhancementStartResult
  | EnhancementStartError;

/**
 * Context for enhancement execution (for cleanup/rollback)
 */
export interface EnhancementContext {
  jobId: string;
  userId: string;
  tokensCost: number;
}

/**
 * Starts the enhancement process based on execution mode
 *
 * In workflow mode: Uses Vercel's durable workflow infrastructure
 * In direct mode: Runs enhancement directly (fire-and-forget)
 *
 * @param input - Enhancement input parameters
 * @param logger - Optional logger for recording events
 * @returns Result indicating success or failure
 */
export async function startEnhancement(
  input: EnhanceImageInput,
  logger?: { info: (msg: string, ctx?: LogContext) => void; },
): Promise<StartEnhancementResult> {
  const mode = getExecutionMode();

  if (mode === "workflow") {
    return startWorkflowEnhancement(input, logger);
  }

  return startDirectEnhancement(input, logger);
}

/**
 * Starts enhancement using Vercel workflow
 */
async function startWorkflowEnhancement(
  input: EnhanceImageInput,
  logger?: { info: (msg: string, ctx?: LogContext) => void; },
): Promise<StartEnhancementResult> {
  const { data: workflowRun, error: workflowError } = await tryCatch(
    start(enhanceImage, [input]),
  );

  if (workflowError) {
    return {
      success: false,
      error: workflowError instanceof Error
        ? workflowError.message
        : String(workflowError),
    };
  }

  // Store the workflow run ID for cancellation support
  if (workflowRun?.runId) {
    await tryCatch(
      prisma.imageEnhancementJob.update({
        where: { id: input.jobId },
        data: { workflowRunId: workflowRun.runId },
      }),
    );
  }

  logger?.info("Enhancement workflow started (production)", {
    jobId: input.jobId,
    workflowRunId: workflowRun?.runId,
  });

  return {
    success: true,
    workflowRunId: workflowRun?.runId,
  };
}

/**
 * Starts enhancement using direct execution (development mode)
 */
async function startDirectEnhancement(
  input: EnhanceImageInput,
  logger?: { info: (msg: string, ctx?: LogContext) => void; },
): Promise<StartEnhancementResult> {
  logger?.info("Running enhancement directly (dev mode)", {
    jobId: input.jobId,
  });

  // Fire and forget - don't await, let it run in the background
  void (async () => {
    const { error } = await tryCatch(enhanceImageDirect(input));
    if (error) {
      // Error is logged within enhanceImageDirect
    }
  })();

  return { success: true };
}

/**
 * Handles enhancement startup failure
 *
 * Marks job as failed and refunds tokens if applicable
 *
 * @param context - Enhancement context for cleanup
 * @param errorMessage - Error message to record
 */
export async function handleEnhancementFailure(
  context: EnhancementContext,
  errorMessage: string,
): Promise<void> {
  // Mark job as failed/refunded
  await tryCatch(
    prisma.imageEnhancementJob.update({
      where: { id: context.jobId },
      data: {
        status: context.tokensCost > 0 ? JobStatus.REFUNDED : JobStatus.FAILED,
        errorMessage,
      },
    }),
  );

  // Refund tokens if any were consumed
  if (context.tokensCost > 0) {
    await TokenBalanceManager.refundTokens(
      context.userId,
      context.tokensCost,
      context.jobId,
      errorMessage,
    );
  }
}
