/**
 * Winner Selector
 * Epic #516
 *
 * Orchestrates winner selection using configured strategy.
 */

import type { WinnerStrategy } from "@prisma/client";
import type {
  ExperimentVariant,
  WinnerCandidate,
  WinnerSelectionConfig,
} from "@/types/hypothesis-agent";
import {
  ImmediateStrategy,
  ConservativeStrategy,
  EconomicStrategy,
  SafetyFirstStrategy,
  type WinnerSelectionStrategy,
} from "./strategies";

/**
 * Registry of available winner selection strategies.
 */
const STRATEGY_REGISTRY: Record<WinnerStrategy, WinnerSelectionStrategy> = {
  IMMEDIATE: new ImmediateStrategy(),
  CONSERVATIVE: new ConservativeStrategy(),
  ECONOMIC: new EconomicStrategy(),
  SAFETY_FIRST: new SafetyFirstStrategy(),
};

/**
 * Select a winner using the configured strategy.
 *
 * @param variants - Experiment variants with metrics
 * @param config - Winner selection configuration
 * @returns Winner candidate or null if not ready
 */
export function selectWinner(
  variants: ExperimentVariant[],
  config: WinnerSelectionConfig
): WinnerCandidate | null {
  if (variants.length < 2) {
    return null;
  }

  const strategy = STRATEGY_REGISTRY[config.strategy];
  if (!strategy) {
    throw new Error(`Unknown winner selection strategy: ${config.strategy}`);
  }

  return strategy.evaluate(variants, config);
}

/**
 * Get human-readable description of a strategy.
 *
 * @param strategy - Strategy identifier
 * @returns Description text
 */
export function getStrategyDescription(strategy: WinnerStrategy): string {
  const strategyObj = STRATEGY_REGISTRY[strategy];
  return strategyObj ? strategyObj.getDescription() : "Unknown strategy";
}

/**
 * Get recommendations for strategy selection based on experiment context.
 *
 * @param context - Experiment context
 * @returns Recommended strategy and reasoning
 */
export function recommendStrategy(context: {
  hasEconomicValue: boolean;
  isHighStakes: boolean;
  desiredSpeed: "fast" | "moderate" | "slow";
  sampleSize: number;
}): {
  strategy: WinnerStrategy;
  reasoning: string;
} {
  // High stakes experiments should use SAFETY_FIRST
  if (context.isHighStakes) {
    return {
      strategy: "SAFETY_FIRST",
      reasoning:
        "High-stakes decision requires maximum confidence (99%) to minimize risk of false positives.",
    };
  }

  // If economic value is available and important, use ECONOMIC
  if (context.hasEconomicValue && context.sampleSize >= 500) {
    return {
      strategy: "ECONOMIC",
      reasoning:
        "Economic value data available. Optimizing for revenue/profit rather than just conversion rate.",
    };
  }

  // For fast iteration, use IMMEDIATE
  if (context.desiredSpeed === "fast") {
    return {
      strategy: "IMMEDIATE",
      reasoning:
        "Fast iteration desired. Winner selected as soon as 95% confidence reached.",
    };
  }

  // Default to CONSERVATIVE for balanced approach
  return {
    strategy: "CONSERVATIVE",
    reasoning:
      "Balanced approach with confirmation period to reduce false positives while maintaining reasonable speed.",
  };
}

/**
 * Validate winner selection configuration.
 *
 * @param config - Configuration to validate
 * @returns Validation errors (empty array if valid)
 */
export function validateWinnerConfig(config: WinnerSelectionConfig): string[] {
  const errors: string[] = [];

  if (config.significanceLevel <= 0 || config.significanceLevel >= 1) {
    errors.push("Significance level must be between 0 and 1");
  }

  if (config.minimumSampleSize < 10) {
    errors.push("Minimum sample size must be at least 10");
  }

  if (config.strategy === "CONSERVATIVE") {
    // No additional validation needed for CONSERVATIVE
  }

  if (config.strategy === "ECONOMIC") {
    // No additional validation - economic data will be checked at runtime
  }

  if (config.strategy === "SAFETY_FIRST") {
    if (config.minimumSampleSize < 100) {
      errors.push("SAFETY_FIRST strategy requires minimum sample size of at least 100");
    }
  }

  return errors;
}

/**
 * Check if experiment is ready for winner selection based on time constraints.
 *
 * @param startedAt - When experiment started
 * @param minDurationDays - Minimum duration before winner selection
 * @param maxDurationDays - Maximum duration (auto-select if reached)
 * @returns Check result with reasoning
 */
export function checkTimeConstraints(
  startedAt: Date,
  minDurationDays?: number,
  maxDurationDays?: number
): {
  isReady: boolean;
  shouldForceSelection: boolean;
  reasoning: string;
} {
  const now = new Date();
  const daysRunning = (now.getTime() - startedAt.getTime()) / (1000 * 60 * 60 * 24);

  // Check if minimum duration met
  if (minDurationDays && daysRunning < minDurationDays) {
    return {
      isReady: false,
      shouldForceSelection: false,
      reasoning: `Experiment must run for at least ${minDurationDays} days. Currently: ${daysRunning.toFixed(1)} days.`,
    };
  }

  // Check if maximum duration exceeded
  if (maxDurationDays && daysRunning >= maxDurationDays) {
    return {
      isReady: true,
      shouldForceSelection: true,
      reasoning: `Maximum duration (${maxDurationDays} days) reached. Should select best performing variant.`,
    };
  }

  return {
    isReady: true,
    shouldForceSelection: false,
    reasoning: `Time constraints met. ${daysRunning.toFixed(1)} days running.`,
  };
}
