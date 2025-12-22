/**
 * Enhancement tier options for image processing.
 * Each tier represents a different output resolution and quality level.
 */
export type EnhancementTier = "TIER_1K" | "TIER_2K" | "TIER_4K";

/**
 * Token cost mapping for each enhancement tier.
 * Higher resolution tiers consume more platform tokens.
 */
const TIER_COSTS: Record<EnhancementTier, number> = {
  TIER_1K: 2,
  TIER_2K: 5,
  TIER_4K: 10,
};

/**
 * Display information and metadata for each enhancement tier.
 * Used for UI rendering and user-facing tier descriptions.
 */
export const TIER_INFO: Record<
  EnhancementTier,
  {
    name: string;
    resolution: string;
    cost: number;
    description: string;
  }
> = {
  TIER_1K: {
    name: "1K",
    resolution: "1024px",
    cost: 2,
    description: "Good for web",
  },
  TIER_2K: {
    name: "2K",
    resolution: "2048px",
    cost: 5,
    description: "High quality",
  },
  TIER_4K: {
    name: "4K",
    resolution: "4096px",
    cost: 10,
    description: "Maximum quality",
  },
};

/**
 * Runtime status of a single enhancement job.
 * Tracks the current state of an image enhancement operation.
 */
export interface JobStatus {
  /** Unique identifier for the enhancement job */
  jobId: string;
  /** Enhancement tier being processed */
  tier: EnhancementTier;
  /** Current processing status */
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
  /** URL of the enhanced image (available when status is COMPLETED) */
  enhancedUrl?: string;
  /** Width of the enhanced image in pixels */
  enhancedWidth?: number;
  /** Height of the enhanced image in pixels */
  enhancedHeight?: number;
  /** Error message if status is FAILED */
  error?: string;
  /** Number of platform tokens consumed for this job */
  tokensCost: number;
}

/**
 * Calculate the total platform token cost for selected enhancement tiers.
 *
 * @param tiers - Array of enhancement tiers to calculate cost for
 * @returns Total token cost as a sum of individual tier costs
 *
 * @example
 * ```typescript
 * const cost = calculateTotalCost(["TIER_1K", "TIER_2K"]); // Returns 7
 * ```
 */
export function calculateTotalCost(tiers: EnhancementTier[]): number {
  return tiers.reduce((sum, tier) => sum + TIER_COSTS[tier], 0);
}

/**
 * Check if a user has sufficient token balance to afford selected tiers.
 *
 * @param tiers - Array of enhancement tiers to check affordability for
 * @param balance - User's current platform token balance
 * @returns true if balance is sufficient, false otherwise
 *
 * @example
 * ```typescript
 * const canAfford = canAffordTiers(["TIER_4K"], 15); // Returns true
 * const cannotAfford = canAffordTiers(["TIER_4K"], 5); // Returns false
 * ```
 */
export function canAffordTiers(
  tiers: EnhancementTier[],
  balance: number,
): boolean {
  return calculateTotalCost(tiers) <= balance;
}
