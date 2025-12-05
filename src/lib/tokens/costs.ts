/**
 * Single source of truth for token costs across the application
 *
 * This module centralizes all token cost definitions to prevent
 * cost misalignment issues between different parts of the codebase.
 *
 * Enhancement tiers correspond to maximum output dimensions:
 * - TIER_1K: 1024px max dimension
 * - TIER_2K: 2048px max dimension
 * - TIER_4K: 4096px max dimension
 */
export const ENHANCEMENT_COSTS = {
  TIER_1K: 2, // 1024px max dimension
  TIER_2K: 5, // 2048px max dimension
  TIER_4K: 10, // 4096px max dimension
} as const;

export type EnhancementTier = keyof typeof ENHANCEMENT_COSTS;

/**
 * Get the token cost for an enhancement tier
 *
 * @param tier - The enhancement tier (TIER_1K, TIER_2K, or TIER_4K)
 * @returns The token cost for the specified tier
 */
export function getEnhancementCost(tier: EnhancementTier): number {
  return ENHANCEMENT_COSTS[tier];
}
