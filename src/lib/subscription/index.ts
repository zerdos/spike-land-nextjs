/**
 * Workspace Subscription Module
 *
 * Provides workspace-level subscription tier management for Orbit app.
 *
 * @module subscription
 */

export {
  getNextTier,
  getTierLimits,
  isDowngrade,
  isUnlimited,
  isUpgrade,
  WORKSPACE_TIER_DISPLAY_NAMES,
  WORKSPACE_TIER_LIMITS,
  WORKSPACE_TIER_ORDER,
} from "./tier-config";
export type { TierLimits } from "./tier-config";
export { WorkspaceSubscriptionService } from "./workspace-subscription";
export type { LimitCheckResult } from "./workspace-subscription";
