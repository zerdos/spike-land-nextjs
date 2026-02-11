/**
 * Token Cost Calculator
 *
 * Pure computation module for calculating AI model costs.
 */

export const MODEL_PRICING: Record<
  string,
  { inputPer1M: number; outputPer1M: number; cachedPer1M: number }
> = {
  opus: { inputPer1M: 15.0, outputPer1M: 75.0, cachedPer1M: 1.875 },
  sonnet: { inputPer1M: 3.0, outputPer1M: 15.0, cachedPer1M: 0.375 },
  haiku: { inputPer1M: 0.25, outputPer1M: 1.25, cachedPer1M: 0.03125 },
};

// Default pricing for unknown models (use haiku pricing as conservative fallback)
const DEFAULT_PRICING = MODEL_PRICING["haiku"]!;

export interface TokenCostInput {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens?: number;
}

export interface TokenCostResult {
  totalCost: number;
  inputCost: number;
  outputCost: number;
  cachedCost: number;
}

/**
 * Calculate the cost for a single model usage.
 */
export function calculateTokenCost(input: TokenCostInput): TokenCostResult {
  const pricing = MODEL_PRICING[input.model.toLowerCase()] ?? DEFAULT_PRICING;
  const cachedTokens = input.cachedTokens ?? 0;

  const inputCost = (input.inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (input.outputTokens / 1_000_000) * pricing.outputPer1M;
  const cachedCost = (cachedTokens / 1_000_000) * pricing.cachedPer1M;

  return {
    totalCost: inputCost + outputCost + cachedCost,
    inputCost,
    outputCost,
    cachedCost,
  };
}

export interface GenerationCostResult {
  totalCost: number;
  breakdownByModel: Record<string, TokenCostResult>;
}

/**
 * Calculate total cost for a generation attempt that may use multiple models.
 * Expects an array of per-model token usages (e.g., Opus for gen, Sonnet for fixes, Haiku for learning).
 */
export function calculateGenerationCost(
  usages: TokenCostInput[],
): GenerationCostResult {
  const breakdownByModel: Record<string, TokenCostResult> = {};
  let totalCost = 0;

  for (const usage of usages) {
    const key = usage.model.toLowerCase();
    const cost = calculateTokenCost(usage);

    if (breakdownByModel[key]) {
      breakdownByModel[key].inputCost += cost.inputCost;
      breakdownByModel[key].outputCost += cost.outputCost;
      breakdownByModel[key].cachedCost += cost.cachedCost;
      breakdownByModel[key].totalCost += cost.totalCost;
    } else {
      breakdownByModel[key] = cost;
    }

    totalCost += cost.totalCost;
  }

  return { totalCost, breakdownByModel };
}
