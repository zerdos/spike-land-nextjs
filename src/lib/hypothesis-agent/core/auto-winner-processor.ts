/**
 * Auto-Winner Processor
 * Epic #516
 *
 * Processes running experiments to automatically select winners
 * when configured criteria are met.
 */

import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import {
  getExperiment,
  completeExperiment,
  getActiveExperiments as getAllActiveExperiments,
} from "./experiment-manager";
import { selectWinner } from "../winner-selection/winner-selector";
import { checkTimeConstraints } from "../winner-selection/winner-selector";
import type { WinnerSelectionConfig } from "@/types/hypothesis-agent";

export interface AutoWinnerResult {
  totalChecked: number;
  winnersSelected: number;
  stillRunning: number;
  errors: Array<{ experimentId: string; error: string }>;
}

/**
 * Process all running experiments with auto-winner enabled.
 *
 * @param limit - Maximum number of experiments to process
 * @returns Processing result summary
 */
export async function processAutoWinnerSelection(
  limit: number = 50
): Promise<AutoWinnerResult> {
  const result: AutoWinnerResult = {
    totalChecked: 0,
    winnersSelected: 0,
    stillRunning: 0,
    errors: [],
  };

  try {
    // Fetch all running experiments with auto-winner enabled
    const { data: experiments, error: fetchError } = await tryCatch(
      prisma.experiment.findMany({
        where: {
          status: "RUNNING",
          autoSelectWinner: true,
        },
        include: {
          variants: true,
        },
        take: limit,
        orderBy: {
          startedAt: "asc", // Process oldest first
        },
      })
    );

    if (fetchError || !experiments) {
      result.errors.push({
        experimentId: "N/A",
        error: `Failed to fetch experiments: ${fetchError?.message || "Unknown error"}`,
      });
      return result;
    }

    result.totalChecked = experiments.length;

    // Process each experiment
    for (const experiment of experiments) {
      try {
        const shouldSelect = await shouldSelectWinner(experiment);

        if (shouldSelect.shouldSelect) {
          // Select winner
          const config: WinnerSelectionConfig = {
            strategy: experiment.winnerStrategy,
            minimumSampleSize: experiment.minimumSampleSize,
            significanceLevel: experiment.significanceLevel,
          };

          const winnerCandidate = selectWinner(experiment.variants, config);

          if (winnerCandidate) {
            // Complete experiment with winner
            await completeExperiment(experiment.id, winnerCandidate.variantId);
            result.winnersSelected++;

            console.log(
              `[auto-winner] Selected winner for experiment ${experiment.id}: ` +
                `Variant ${winnerCandidate.variantName} (${shouldSelect.reason})`
            );
          } else if (shouldSelect.forceSelection) {
            // Force select best performing variant
            const bestVariant = experiment.variants.reduce((best, current) => {
              const bestRate = best.impressions > 0 ? best.conversions / best.impressions : 0;
              const currentRate =
                current.impressions > 0 ? current.conversions / current.impressions : 0;
              return currentRate > bestRate ? current : best;
            });

            await completeExperiment(experiment.id, bestVariant.id);
            result.winnersSelected++;

            console.log(
              `[auto-winner] Force-selected winner for experiment ${experiment.id}: ` +
                `Variant ${bestVariant.name} (${shouldSelect.reason})`
            );
          } else {
            result.stillRunning++;
          }
        } else {
          result.stillRunning++;
        }
      } catch (error) {
        result.errors.push({
          experimentId: experiment.id,
          error: error instanceof Error ? error.message : String(error),
        });
        console.error(
          `[auto-winner] Error processing experiment ${experiment.id}:`,
          error
        );
      }
    }
  } catch (error) {
    result.errors.push({
      experimentId: "N/A",
      error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  return result;
}

/**
 * Determine if an experiment should have a winner selected.
 *
 * @param experiment - Experiment to evaluate
 * @returns Decision object
 */
async function shouldSelectWinner(experiment: {
  id: string;
  significanceLevel: number;
  minimumSampleSize: number;
  winnerStrategy: "IMMEDIATE" | "CONSERVATIVE" | "ECONOMIC" | "SAFETY_FIRST";
  startedAt: Date | null;
  metadata: unknown;
  variants: Array<{
    id: string;
    impressions: number;
    conversions: number;
    isControl: boolean;
  }>;
}): Promise<{
  shouldSelect: boolean;
  forceSelection: boolean;
  reason: string;
}> {
  // Check time constraints
  const metadata = experiment.metadata as
    | { maxDurationDays?: number; minDurationDays?: number }
    | null
    | undefined;

  if (experiment.startedAt) {
    const timeCheck = checkTimeConstraints(
      experiment.startedAt,
      metadata?.minDurationDays,
      metadata?.maxDurationDays
    );

    // Force selection if max duration reached
    if (timeCheck.shouldForceSelection) {
      return {
        shouldSelect: true,
        forceSelection: true,
        reason: timeCheck.reasoning,
      };
    }

    // Don't select if minimum duration not met
    if (!timeCheck.isReady) {
      return {
        shouldSelect: false,
        forceSelection: false,
        reason: timeCheck.reasoning,
      };
    }
  }

  // Check if we have a statistically significant winner
  const config: WinnerSelectionConfig = {
    strategy: experiment.winnerStrategy,
    minimumSampleSize: experiment.minimumSampleSize,
    significanceLevel: experiment.significanceLevel,
  };

  const winnerCandidate = selectWinner(experiment.variants, config);

  if (winnerCandidate && winnerCandidate.meetsThreshold) {
    return {
      shouldSelect: true,
      forceSelection: false,
      reason: winnerCandidate.reasoning,
    };
  }

  return {
    shouldSelect: false,
    forceSelection: false,
    reason: "No statistically significant winner yet",
  };
}

/**
 * Get summary of experiments eligible for auto-winner selection.
 *
 * @returns Summary statistics
 */
export async function getAutoWinnerEligibleSummary(): Promise<{
  totalEligible: number;
  byStrategy: Record<string, number>;
}> {
  const { data: experiments } = await tryCatch(
    prisma.experiment.findMany({
      where: {
        status: "RUNNING",
        autoSelectWinner: true,
      },
      select: {
        id: true,
        winnerStrategy: true,
      },
    })
  );

  if (!experiments) {
    return {
      totalEligible: 0,
      byStrategy: {},
    };
  }

  const byStrategy: Record<string, number> = {};
  experiments.forEach((exp) => {
    byStrategy[exp.winnerStrategy] = (byStrategy[exp.winnerStrategy] || 0) + 1;
  });

  return {
    totalEligible: experiments.length,
    byStrategy,
  };
}
