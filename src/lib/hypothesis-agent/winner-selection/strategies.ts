/**
 * Winner Selection Strategies for Experiments
 * Epic #516
 *
 * Implements different strategies for selecting experiment winners
 * based on business requirements and risk tolerance.
 */

import type { WinnerStrategy } from "@prisma/client";
import type {
  ExperimentVariant,
  StatisticalResult,
  WinnerCandidate,
  WinnerSelectionConfig,
} from "@/types/hypothesis-agent";
import {
  wilsonScoreInterval,
  liftInterval,
} from "../statistical-engine/confidence-intervals";

/**
 * Base class for winner selection strategies.
 */
export abstract class WinnerSelectionStrategy {
  abstract readonly strategy: WinnerStrategy;

  /**
   * Evaluate if we should select a winner.
   *
   * @param variants - Experiment variants with metrics
   * @param config - Strategy configuration
   * @returns Winner candidate or null if not ready
   */
  abstract evaluate(
    variants: ExperimentVariant[],
    config: WinnerSelectionConfig
  ): WinnerCandidate | null;

  /**
   * Get human-readable explanation of the strategy.
   */
  abstract getDescription(): string;
}

/**
 * IMMEDIATE Strategy: Select winner as soon as significance is reached.
 *
 * Best for:
 * - High-velocity testing
 * - Low-risk decisions
 * - Clear winners emerging quickly
 */
export class ImmediateStrategy extends WinnerSelectionStrategy {
  readonly strategy: WinnerStrategy = "IMMEDIATE";

  evaluate(
    variants: ExperimentVariant[],
    config: WinnerSelectionConfig
  ): WinnerCandidate | null {
    // Check minimum sample size
    const meetsMinimum = variants.every((v) => v.impressions >= config.minimumSampleSize);
    if (!meetsMinimum) {
      return null;
    }

    // Calculate conversion rates and confidence intervals
    const results = variants.map((v) => {
      const rate = v.impressions > 0 ? v.conversions / v.impressions : 0;
      const ci = wilsonScoreInterval(v.conversions, v.impressions, config.significanceLevel);

      return { variant: v, rate, ci };
    });

    // Sort by conversion rate
    results.sort((a, b) => b.rate - a.rate);

    const best = results[0];
    const secondBest = results[1];

    if (!best || !secondBest) {
      return null;
    }

    // Check if best variant's lower CI exceeds second best's upper CI
    const isSignificant = best.ci.lower > secondBest.ci.upper;

    if (!isSignificant) {
      return null;
    }

    // Calculate lift vs control (assuming first variant is control)
    const control = variants.find((v) => v.isControl) || variants[0];
    const controlRate = control.impressions > 0 ? control.conversions / control.impressions : 0;

    const lift = controlRate > 0 ? (best.rate - controlRate) / controlRate : 0;

    return {
      variantId: best.variant.id,
      variantName: best.variant.name,
      conversionRate: best.rate,
      confidenceLevel: config.significanceLevel,
      lift,
      meetsThreshold: true,
      reasoning:
        `Winner emerged with ${(config.significanceLevel * 100).toFixed(0)}% confidence. ` +
        `Conversion rate: ${(best.rate * 100).toFixed(2)}%, ` +
        `Lift vs control: ${(lift * 100).toFixed(1)}%`,
    };
  }

  getDescription(): string {
    return "Selects winner immediately when statistical significance is reached. Best for fast iteration.";
  }
}

/**
 * CONSERVATIVE Strategy: Wait for confirmation period after reaching significance.
 *
 * Best for:
 * - Important business decisions
 * - Avoiding false positives
 * - Volatile metrics
 */
export class ConservativeStrategy extends WinnerSelectionStrategy {
  readonly strategy: WinnerStrategy = "CONSERVATIVE";

  evaluate(
    variants: ExperimentVariant[],
    config: WinnerSelectionConfig
  ): WinnerCandidate | null {
    // First check if we meet immediate criteria
    const immediate = new ImmediateStrategy();
    const candidate = immediate.evaluate(variants, config);

    if (!candidate) {
      return null;
    }

    // Check if experiment has been running long enough for confirmation
    const winner = variants.find((v) => v.id === candidate.variantId);
    if (!winner) {
      return null;
    }

    // For conservative strategy, require experiment to run for additional confirmation period
    // This is typically checked at the application level using createdAt/updatedAt
    // Here we add additional statistical checks

    // Require 1.5x the minimum sample size
    const conservativeMinimum = config.minimumSampleSize * 1.5;
    const meetsConservativeMinimum = variants.every(
      (v) => v.impressions >= conservativeMinimum
    );

    if (!meetsConservativeMinimum) {
      return {
        ...candidate,
        meetsThreshold: false,
        reasoning:
          `Candidate winner identified, but waiting for confirmation. ` +
          `Need ${conservativeMinimum} samples per variant. ` +
          `Current: ${Math.min(...variants.map((v) => v.impressions))}`,
      };
    }

    return {
      ...candidate,
      reasoning:
        `Winner confirmed after extended observation period. ` +
        `${candidate.reasoning} Confidence maintained across ${conservativeMinimum}+ samples.`,
    };
  }

  getDescription(): string {
    return "Waits for additional confirmation period after significance to reduce false positives.";
  }
}

/**
 * ECONOMIC Strategy: Optimize for economic value, not just conversion rate.
 *
 * Best for:
 * - Revenue optimization
 * - Cost-sensitive experiments
 * - When conversion value varies significantly
 */
export class EconomicStrategy extends WinnerSelectionStrategy {
  readonly strategy: WinnerStrategy = "ECONOMIC";

  evaluate(
    variants: ExperimentVariant[],
    config: WinnerSelectionConfig
  ): WinnerCandidate | null {
    // Check minimum sample size
    const meetsMinimum = variants.every((v) => v.impressions >= config.minimumSampleSize);
    if (!meetsMinimum) {
      return null;
    }

    // Calculate economic value per impression
    const results = variants.map((v) => {
      const avgValue = v.impressions > 0 ? v.totalValue / v.impressions : 0;
      const rate = v.impressions > 0 ? v.conversions / v.impressions : 0;

      return { variant: v, avgValue, rate };
    });

    // Sort by average economic value
    results.sort((a, b) => b.avgValue - a.avgValue);

    const best = results[0];
    const control = results.find((r) => r.variant.isControl) || results[results.length - 1];

    if (!best) {
      return null;
    }

    // Calculate economic lift
    const economicLift =
      control.avgValue > 0 ? (best.avgValue - control.avgValue) / control.avgValue : 0;

    // Check if economic improvement is significant
    // For economic strategy, we use a higher threshold for total value improvement
    const totalValueGain = (best.avgValue - control.avgValue) * best.variant.impressions;

    const meetsEconomicThreshold = totalValueGain >= (config.minimumSampleSize * 0.1); // 10% of minimum sample size

    if (!meetsEconomicThreshold) {
      return null;
    }

    // Also check statistical significance of conversion rate
    const rateCI = wilsonScoreInterval(
      best.variant.conversions,
      best.variant.impressions,
      config.significanceLevel
    );
    const controlCI = wilsonScoreInterval(
      control.variant.conversions,
      control.variant.impressions,
      config.significanceLevel
    );

    const isRateSignificant = rateCI.lower > controlCI.upper;

    return {
      variantId: best.variant.id,
      variantName: best.variant.name,
      conversionRate: best.rate,
      confidenceLevel: config.significanceLevel,
      lift: economicLift,
      totalValue: best.variant.totalValue,
      meetsThreshold: meetsEconomicThreshold && isRateSignificant,
      reasoning:
        `Economic winner with ${(economicLift * 100).toFixed(1)}% value improvement. ` +
        `Average value per impression: $${best.avgValue.toFixed(2)} ` +
        `(vs $${control.avgValue.toFixed(2)} control). ` +
        `Total value gain: $${totalValueGain.toFixed(2)}`,
    };
  }

  getDescription(): string {
    return "Optimizes for economic value (revenue, profit) rather than just conversion rate.";
  }
}

/**
 * SAFETY_FIRST Strategy: Requires very high confidence (99%+) before selecting winner.
 *
 * Best for:
 * - High-stakes decisions
 * - Major product changes
 * - Regulatory or compliance-sensitive changes
 */
export class SafetyFirstStrategy extends WinnerSelectionStrategy {
  readonly strategy: WinnerStrategy = "SAFETY_FIRST";

  evaluate(
    variants: ExperimentVariant[],
    config: WinnerSelectionConfig
  ): WinnerCandidate | null {
    // Require 2x minimum sample size
    const safetyMinimum = config.minimumSampleSize * 2;
    const meetsMinimum = variants.every((v) => v.impressions >= safetyMinimum);

    if (!meetsMinimum) {
      return null;
    }

    // Calculate conversion rates with 99% confidence intervals
    const highConfidence = 0.99;
    const results = variants.map((v) => {
      const rate = v.impressions > 0 ? v.conversions / v.impressions : 0;
      const ci = wilsonScoreInterval(v.conversions, v.impressions, highConfidence);

      return { variant: v, rate, ci };
    });

    // Sort by conversion rate
    results.sort((a, b) => b.rate - a.rate);

    const best = results[0];
    const secondBest = results[1];

    if (!best || !secondBest) {
      return null;
    }

    // Require winner's 99% CI lower bound to exceed second best's upper bound
    const isHighlySignificant = best.ci.lower > secondBest.ci.upper;

    if (!isHighlySignificant) {
      return {
        variantId: best.variant.id,
        variantName: best.variant.name,
        conversionRate: best.rate,
        confidenceLevel: highConfidence,
        lift: 0,
        meetsThreshold: false,
        reasoning:
          `Leading variant identified, but not yet safe to call winner. ` +
          `Need 99% confidence with ${safetyMinimum}+ samples. ` +
          `Current confidence intervals overlap.`,
      };
    }

    // Calculate lift vs control
    const control = variants.find((v) => v.isControl) || variants[0];
    const controlRate = control.impressions > 0 ? control.conversions / control.impressions : 0;

    const liftCalc = liftInterval(
      best.rate,
      best.variant.impressions,
      controlRate,
      control.impressions,
      highConfidence
    );

    // Require lift to be positive even at 99% CI lower bound
    const liftLowerBoundPositive = liftCalc.lower > 0;

    if (!liftLowerBoundPositive) {
      return {
        variantId: best.variant.id,
        variantName: best.variant.name,
        conversionRate: best.rate,
        confidenceLevel: highConfidence,
        lift: liftCalc.lift,
        meetsThreshold: false,
        reasoning:
          `Leading variant, but lift confidence interval includes zero. ` +
          `Lift: ${(liftCalc.lift * 100).toFixed(1)}% ` +
          `(99% CI: ${(liftCalc.lower * 100).toFixed(1)}% to ${(liftCalc.upper * 100).toFixed(1)}%)`,
      };
    }

    return {
      variantId: best.variant.id,
      variantName: best.variant.name,
      conversionRate: best.rate,
      confidenceLevel: highConfidence,
      lift: liftCalc.lift,
      meetsThreshold: true,
      reasoning:
        `Winner confirmed with 99% confidence. ` +
        `Conversion rate: ${(best.rate * 100).toFixed(2)}% ` +
        `(99% CI: ${(best.ci.lower * 100).toFixed(2)}% - ${(best.ci.upper * 100).toFixed(2)}%). ` +
        `Lift: ${(liftCalc.lift * 100).toFixed(1)}% ` +
        `(99% CI: ${(liftCalc.lower * 100).toFixed(1)}% - ${(liftCalc.upper * 100).toFixed(1)}%)`,
    };
  }

  getDescription(): string {
    return "Requires 99% confidence and double minimum sample size for maximum safety.";
  }
}
