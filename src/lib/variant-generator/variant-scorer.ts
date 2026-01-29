/**
 * Variant performance scoring service
 *
 * Predicts variant performance based on historical data and heuristics.
 * Resolves #551
 */

import logger from "@/lib/logger";
import type {
  VariantScore,
  CopyVariant,
  HistoricalPerformanceData,
  CopyTone,
} from "@/types/variant-generator";

/**
 * Platform-specific optimal length ranges
 */
const PLATFORM_OPTIMAL_LENGTHS: Record<string, [number, number]> = {
  twitter: [100, 140],
  instagram: [125, 150],
  facebook: [100, 250],
  linkedin: [150, 300],
};

/**
 * Default optimal length range if no platform specified
 */
const DEFAULT_OPTIMAL_LENGTH: [number, number] = [120, 180];

/**
 * Score variant copy length (0-100)
 */
function scoreCopyLength(
  characterCount: number,
  optimalRange: [number, number],
): number {
  const [minOptimal, maxOptimal] = optimalRange;

  // Perfect score if within optimal range
  if (characterCount >= minOptimal && characterCount <= maxOptimal) {
    return 100;
  }

  // Calculate distance from optimal range
  let distance: number;
  if (characterCount < minOptimal) {
    distance = minOptimal - characterCount;
  } else {
    distance = characterCount - maxOptimal;
  }

  // Penalize based on distance (max penalty 50 points)
  const penalty = Math.min(50, distance / 2);
  return Math.max(50, 100 - penalty);
}

/**
 * Score CTA presence and quality (0-100)
 */
function scoreCtaPresence(variant: CopyVariant): number {
  const { text, ctaStyle } = variant;
  const lowerText = text.toLowerCase();

  // Base score for having CTA style
  let score = ctaStyle ? 70 : 40;

  // Common CTA keywords and patterns
  const actionWords = [
    "get",
    "try",
    "shop",
    "buy",
    "start",
    "join",
    "sign up",
    "learn",
    "discover",
    "explore",
  ];
  const urgencyWords = ["now", "today", "limited", "don't miss", "hurry"];
  const questionMarks = (text.match(/\?/g) || []).length;

  // Bonus for action words
  const hasActionWord = actionWords.some((word) => lowerText.includes(word));
  if (hasActionWord) score += 15;

  // Bonus for urgency words
  const hasUrgency = urgencyWords.some((word) => lowerText.includes(word));
  if (hasUrgency) score += 10;

  // Bonus for questions (engagement)
  if (questionMarks > 0) score += 5;

  return Math.min(100, score);
}

/**
 * Score tone match with audience (0-100)
 */
function scoreToneMatch(
  tone: CopyTone,
  historicalData?: HistoricalPerformanceData,
): number {
  if (!historicalData || !historicalData.bestTones) {
    // Default score if no historical data
    return 70;
  }

  // Check if tone matches historical best performers
  if (historicalData.bestTones.includes(tone)) {
    return 95;
  }

  // Moderate score for tones not in historical data
  return 60;
}

/**
 * Calculate historical pattern score (0-100)
 */
function scoreHistoricalPattern(
  variant: CopyVariant,
  historicalData?: HistoricalPerformanceData,
): number {
  if (!historicalData) {
    return 70; // Default score with no data
  }

  let score = 50;

  // Check if length matches historical optimal
  if (historicalData.optimalLengthRange) {
    const [minOpt, maxOpt] = historicalData.optimalLengthRange;
    if (
      variant.characterCount >= minOpt && variant.characterCount <= maxOpt
    ) {
      score += 30;
    }
  }

  // Bonus for large sample size (more confidence)
  if (historicalData.sampleSize > 100) {
    score += 20;
  } else if (historicalData.sampleSize > 50) {
    score += 10;
  }

  return Math.min(100, score);
}

/**
 * Score a single variant
 *
 * @param variant - Copy variant to score
 * @param historicalData - Optional historical performance data
 * @param platform - Optional platform name for length optimization
 * @returns Performance score with breakdown
 */
export function scoreVariant(
  variant: CopyVariant,
  historicalData?: HistoricalPerformanceData,
  platform?: string,
): VariantScore {
  logger.info("[VARIANT_SCORER] Scoring variant", {
    tone: variant.tone,
    length: variant.length,
    characterCount: variant.characterCount,
  });

  // Determine optimal length range
  const optimalLength = platform && PLATFORM_OPTIMAL_LENGTHS[platform]
    ? PLATFORM_OPTIMAL_LENGTHS[platform]
    : historicalData?.optimalLengthRange || DEFAULT_OPTIMAL_LENGTH;

  // Calculate individual factor scores
  const lengthScore = scoreCopyLength(variant.characterCount, optimalLength);
  const ctaScore = scoreCtaPresence(variant);
  const toneScore = scoreToneMatch(variant.tone, historicalData);
  const historicalScore = scoreHistoricalPattern(variant, historicalData);

  // Weight factors
  const weights = {
    length: 0.25,
    cta: 0.30,
    tone: 0.25,
    historical: 0.20,
  };

  // Calculate weighted scores (0-1 range)
  const weightedScores = {
    lengthScore: (lengthScore / 100) * weights.length,
    ctaScore: (ctaScore / 100) * weights.cta,
    toneScore: (toneScore / 100) * weights.tone,
    historicalScore: (historicalScore / 100) * weights.historical,
  };

  // Predicted metrics (simplified heuristic model)
  // In a real system, these would come from ML models
  const baseScore = Object.values(weightedScores).reduce(
    (sum, score) => sum + score,
    0,
  );

  const predictedCTR = baseScore * 0.05; // 0-5% CTR range
  const predictedER = baseScore * 0.08; // 0-8% engagement range
  const predictedCR = baseScore * 0.02; // 0-2% conversion range

  // Confidence score based on data availability
  let confidenceScore = 60; // Base confidence
  if (historicalData) {
    confidenceScore += 20;
    if (historicalData.sampleSize > 100) {
      confidenceScore += 20;
    }
  }

  const score: VariantScore = {
    variantId: "", // Will be set by caller
    predictedCTR,
    predictedER,
    predictedCR,
    confidenceScore: Math.min(100, confidenceScore),
    factorsAnalyzed: {
      lengthScore,
      ctaScore,
      toneScore,
      historicalScore,
    },
  };

  logger.info("[VARIANT_SCORER] Variant scored", {
    predictedCTR: score.predictedCTR.toFixed(3),
    predictedER: score.predictedER.toFixed(3),
    confidenceScore: score.confidenceScore,
  });

  return score;
}

/**
 * Score multiple variants and rank them
 *
 * @param variants - Array of variants to score
 * @param historicalData - Optional historical performance data
 * @param platform - Optional platform name
 * @returns Sorted array of scores (best first)
 */
export function scoreAndRankVariants(
  variants: CopyVariant[],
  historicalData?: HistoricalPerformanceData,
  platform?: string,
): VariantScore[] {
  logger.info("[VARIANT_SCORER] Scoring and ranking variants", {
    count: variants.length,
  });

  const scores = variants.map((variant) =>
    scoreVariant(variant, historicalData, platform)
  );

  // Sort by predicted CTR (descending)
  scores.sort((a, b) => b.predictedCTR - a.predictedCTR);

  return scores;
}
