/**
 * Mock for @spike-npm-land/shared
 * Provides constants and types for testing
 */

// ============================================================================
// Token Costs
// ============================================================================

export const ENHANCEMENT_COSTS = {
  FREE: 0,
  TIER_1K: 2,
  TIER_2K: 5,
  TIER_4K: 10,
} as const;

export const MCP_GENERATION_COSTS = {
  FREE: 0,
  TIER_1K: 2,
  TIER_2K: 5,
  TIER_4K: 10,
} as const;

// ============================================================================
// Token Regeneration
// ============================================================================

export const TOKEN_REGENERATION = {
  TOKENS_PER_REGEN: 1,
  REGEN_INTERVAL_MS: 15 * 60 * 1000,
  MAX_FREE_TOKENS: 10,
} as const;

// ============================================================================
// Image Constraints
// ============================================================================

export const IMAGE_CONSTRAINTS = {
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,
  ALLOWED_MIME_TYPES: ["image/jpeg", "image/png", "image/webp"] as const,
  MAX_BATCH_SIZE: 20,
  TIER_DIMENSIONS: {
    FREE: 1024,
    TIER_1K: 1024,
    TIER_2K: 2048,
    TIER_4K: 4096,
  } as const,
} as const;

// ============================================================================
// Aspect Ratios
// ============================================================================

export const SUPPORTED_ASPECT_RATIOS = [
  "1:1",
  "3:2",
  "2:3",
  "3:4",
  "4:3",
  "4:5",
  "5:4",
  "9:16",
  "16:9",
  "21:9",
] as const;

// ============================================================================
// Referral Program
// ============================================================================

export const REFERRAL_CONFIG = {
  TOKENS_PER_REFERRAL: 50,
  SIGNUP_BONUS_TOKENS: 10,
} as const;

// ============================================================================
// API Configuration
// ============================================================================

export const API_CONFIG = {
  PRODUCTION_URL: "https://spike.land",
  DEFAULT_TIMEOUT_MS: 30000,
  JOB_POLL_INTERVAL_MS: 2000,
} as const;

// ============================================================================
// Subscription Tiers
// ============================================================================

export const SUBSCRIPTION_TIERS = {
  FREE: {
    name: "Free",
    tokensPerMonth: 0,
    maxRollover: 0,
    priority: false,
    apiAccess: false,
  },
  BASIC: {
    name: "Basic",
    tokensPerMonth: 100,
    maxRollover: 50,
    priority: false,
    apiAccess: false,
  },
  STANDARD: {
    name: "Standard",
    tokensPerMonth: 300,
    maxRollover: 150,
    priority: true,
    apiAccess: false,
  },
  PREMIUM: {
    name: "Premium",
    tokensPerMonth: 1000,
    maxRollover: 500,
    priority: true,
    apiAccess: true,
  },
} as const;

// ============================================================================
// RevenueCat Product IDs
// ============================================================================

export const REVENUECAT_PRODUCTS = {
  TOKEN_PACKAGES: {
    STARTER: "tokens_starter_50",
    PRO: "tokens_pro_150",
    POWER: "tokens_power_500",
  },
  SUBSCRIPTIONS: {
    BASIC_MONTHLY: "sub_basic_monthly",
    STANDARD_MONTHLY: "sub_standard_monthly",
    PREMIUM_MONTHLY: "sub_premium_monthly",
  },
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

export function calculateRegeneratedTokens(
  lastRegeneration: Date,
  currentBalance: number,
  maxBalance: number,
): number {
  const now = Date.now();
  const elapsed = now - lastRegeneration.getTime();
  const intervals = Math.floor(elapsed / TOKEN_REGENERATION.REGEN_INTERVAL_MS);
  const tokensToAdd = intervals * TOKEN_REGENERATION.TOKENS_PER_REGEN;
  return Math.min(tokensToAdd, maxBalance - currentBalance);
}

export function getTimeUntilNextRegen(lastRegeneration: Date): number {
  const now = Date.now();
  const elapsed = now - lastRegeneration.getTime();
  const remaining = TOKEN_REGENERATION.REGEN_INTERVAL_MS -
    (elapsed % TOKEN_REGENERATION.REGEN_INTERVAL_MS);
  return remaining;
}

// ============================================================================
// Types
// ============================================================================

export type UserRole = "USER" | "ADMIN" | "SUPER_ADMIN";
export type EnhancementTier = "FREE" | "TIER_1K" | "TIER_2K" | "TIER_4K";
export type JobStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "REFUNDED"
  | "CANCELLED";
export type PipelineStage = "ANALYZING" | "CROPPING" | "PROMPTING" | "GENERATING";
export type SubscriptionTier = "FREE" | "BASIC" | "STANDARD" | "PREMIUM";
export type SubscriptionStatus = "ACTIVE" | "CANCELED" | "PAST_DUE" | "UNPAID" | "TRIALING";
export type AlbumPrivacy = "PRIVATE" | "UNLISTED" | "PUBLIC";
export type TokenTransactionType =
  | "EARN_REGENERATION"
  | "EARN_PURCHASE"
  | "EARN_BONUS"
  | "SPEND_ENHANCEMENT"
  | "SPEND_MCP_GENERATION"
  | "SPEND_BOX_CREATION"
  | "REFUND";
export type ReferralStatus = "PENDING" | "COMPLETED" | "INVALID";
export type McpJobType = "GENERATE" | "MODIFY";
export type GalleryCategory = "PORTRAIT" | "LANDSCAPE" | "PRODUCT" | "ARCHITECTURE";

// ============================================================================
// Interfaces
// ============================================================================

export interface User {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: Date | null;
  image: string | null;
  createdAt: Date;
  role: UserRole;
  referralCode: string | null;
  referralCount: number;
}

export interface EnhancedImage {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  originalUrl: string;
  originalWidth: number;
  originalHeight: number;
  originalSizeBytes: number;
  originalFormat: string;
  isPublic: boolean;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
  shareToken: string | null;
}

export interface ImageEnhancementJob {
  id: string;
  imageId: string;
  userId: string;
  tier: EnhancementTier;
  tokensCost: number;
  status: JobStatus;
  currentStage: PipelineStage | null;
  enhancedUrl: string | null;
  enhancedWidth: number | null;
  enhancedHeight: number | null;
  enhancedSizeBytes: number | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  processingStartedAt: Date | null;
  processingCompletedAt: Date | null;
  isBlend: boolean;
  isAnonymous: boolean;
}

export interface Album {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  coverImageId: string | null;
  privacy: AlbumPrivacy;
  defaultTier: EnhancementTier;
  shareToken: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TokenTransaction {
  id: string;
  userId: string;
  amount: number;
  type: TokenTransactionType;
  source: string | null;
  sourceId: string | null;
  balanceAfter: number;
  createdAt: Date;
}

export interface Referral {
  id: string;
  referrerId: string;
  refereeId: string;
  status: ReferralStatus;
  tokensGranted: number;
  createdAt: Date;
  completedAt: Date | null;
}

export interface UserTokenBalance {
  id: string;
  userId: string;
  balance: number;
  lastRegeneration: Date;
  tier: SubscriptionTier;
  createdAt: Date;
  updatedAt: Date;
}
