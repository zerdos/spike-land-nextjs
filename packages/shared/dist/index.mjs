// src/constants/index.ts
var ENHANCEMENT_COSTS = {
  FREE: 0,
  // Nano model, 1024px output, no cost
  TIER_1K: 2,
  // 1024px max dimension
  TIER_2K: 5,
  // 2048px max dimension
  TIER_4K: 10
  // 4096px max dimension
};
var MCP_GENERATION_COSTS = {
  FREE: 0,
  TIER_1K: 2,
  TIER_2K: 5,
  TIER_4K: 10
};
var TOKEN_REGENERATION = {
  /** Tokens regenerated per interval */
  TOKENS_PER_REGEN: 1,
  /** Regeneration interval in milliseconds (15 minutes) */
  REGEN_INTERVAL_MS: 15 * 60 * 1e3,
  /** Maximum tokens that can be regenerated to */
  MAX_FREE_TOKENS: 10
};
var IMAGE_CONSTRAINTS = {
  /** Maximum file size for upload (10MB) */
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,
  /** Allowed image MIME types */
  ALLOWED_MIME_TYPES: ["image/jpeg", "image/png", "image/webp"],
  /** Maximum batch upload count */
  MAX_BATCH_SIZE: 20,
  /** Output dimensions per tier */
  TIER_DIMENSIONS: {
    FREE: 1024,
    TIER_1K: 1024,
    TIER_2K: 2048,
    TIER_4K: 4096
  }
};
var SUPPORTED_ASPECT_RATIOS = [
  "1:1",
  "3:2",
  "2:3",
  "3:4",
  "4:3",
  "4:5",
  "5:4",
  "9:16",
  "16:9",
  "21:9"
];
var REFERRAL_CONFIG = {
  /** Tokens earned per successful referral */
  TOKENS_PER_REFERRAL: 50,
  /** Tokens given to new user from referral */
  SIGNUP_BONUS_TOKENS: 10
};
var API_CONFIG = {
  /** Base URL for production API */
  PRODUCTION_URL: "https://spike.land",
  /** Default timeout in milliseconds */
  DEFAULT_TIMEOUT_MS: 3e4,
  /** Job polling interval in milliseconds */
  JOB_POLL_INTERVAL_MS: 2e3
};
var SUBSCRIPTION_TIERS = {
  FREE: {
    name: "Free",
    tokensPerMonth: 0,
    maxRollover: 0,
    priority: false,
    apiAccess: false
  },
  BASIC: {
    name: "Basic",
    tokensPerMonth: 100,
    maxRollover: 50,
    priority: false,
    apiAccess: false
  },
  STANDARD: {
    name: "Standard",
    tokensPerMonth: 300,
    maxRollover: 150,
    priority: true,
    apiAccess: false
  },
  PREMIUM: {
    name: "Premium",
    tokensPerMonth: 1e3,
    maxRollover: 500,
    priority: true,
    apiAccess: true
  }
};
var REVENUECAT_PRODUCTS = {
  /** Token package product IDs */
  TOKEN_PACKAGES: {
    STARTER: "tokens_starter_50",
    PRO: "tokens_pro_150",
    POWER: "tokens_power_500"
  },
  /** Subscription product IDs */
  SUBSCRIPTIONS: {
    BASIC_MONTHLY: "sub_basic_monthly",
    STANDARD_MONTHLY: "sub_standard_monthly",
    PREMIUM_MONTHLY: "sub_premium_monthly"
  }
};

// src/validations/index.ts
import { z } from "zod";
var EnhancementTierSchema = z.enum([
  "FREE",
  "TIER_1K",
  "TIER_2K",
  "TIER_4K"
]);
var EnhanceImageRequestSchema = z.object({
  imageId: z.string().min(1),
  tier: EnhancementTierSchema,
  prompt: z.string().optional(),
  pipelineId: z.string().optional()
});
var BatchEnhanceRequestSchema = z.object({
  imageIds: z.array(z.string().min(1)).min(1).max(IMAGE_CONSTRAINTS.MAX_BATCH_SIZE),
  tier: EnhancementTierSchema
});
var AspectRatioSchema = z.enum(SUPPORTED_ASPECT_RATIOS);
var GenerateImageRequestSchema = z.object({
  prompt: z.string().min(1).max(4e3),
  tier: EnhancementTierSchema.default("TIER_1K"),
  aspectRatio: AspectRatioSchema.default("1:1"),
  negativePrompt: z.string().max(1e3).optional()
});
var ModifyImageRequestSchema = z.object({
  prompt: z.string().min(1).max(4e3),
  tier: EnhancementTierSchema.default("TIER_1K"),
  imageUrl: z.string().url().optional(),
  imageBase64: z.string().optional()
});
var AlbumPrivacySchema = z.enum(["PRIVATE", "UNLISTED", "PUBLIC"]);
var CreateAlbumRequestSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  privacy: AlbumPrivacySchema.default("PRIVATE"),
  defaultTier: EnhancementTierSchema.default("TIER_1K")
});
var UpdateAlbumRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  privacy: AlbumPrivacySchema.optional(),
  defaultTier: EnhancementTierSchema.optional(),
  coverImageId: z.string().optional()
});
var RedeemVoucherRequestSchema = z.object({
  code: z.string().min(4).max(20).transform((val) => val.toUpperCase().trim())
});
var AddToCartRequestSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional(),
  imageId: z.string().optional(),
  uploadedImageUrl: z.string().url().optional(),
  quantity: z.number().int().min(1).max(10).default(1),
  customText: z.string().max(100).optional()
});
var ShippingAddressSchema = z.object({
  name: z.string().min(1).max(100),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  state: z.string().max(100).optional(),
  postalCode: z.string().min(1).max(20),
  country: z.string().length(2)
  // ISO 2-letter country code
});
var CreateOrderRequestSchema = z.object({
  shippingAddress: ShippingAddressSchema,
  billingAddress: ShippingAddressSchema.optional(),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
  notes: z.string().max(500).optional()
});
var EmailSchema = z.string().email().max(255);
var CheckEmailRequestSchema = z.object({
  email: EmailSchema
});
var SignUpRequestSchema = z.object({
  email: EmailSchema,
  password: z.string().min(8).max(100),
  name: z.string().min(1).max(100).optional(),
  referralCode: z.string().max(20).optional()
});

// src/utils/index.ts
function getEnhancementCost(tier) {
  return ENHANCEMENT_COSTS[tier];
}
function calculateRegeneratedTokens(lastRegeneration, currentBalance, maxTokens = TOKEN_REGENERATION.MAX_FREE_TOKENS) {
  const now = Date.now();
  const lastRegenMs = lastRegeneration.getTime();
  const elapsedMs = now - lastRegenMs;
  const intervals = Math.floor(
    elapsedMs / TOKEN_REGENERATION.REGEN_INTERVAL_MS
  );
  const tokensToAdd = intervals * TOKEN_REGENERATION.TOKENS_PER_REGEN;
  return Math.min(currentBalance + tokensToAdd, maxTokens) - currentBalance;
}
function getTimeUntilNextRegen(lastRegeneration) {
  const now = Date.now();
  const lastRegenMs = lastRegeneration.getTime();
  const elapsedMs = now - lastRegenMs;
  const remainingMs = TOKEN_REGENERATION.REGEN_INTERVAL_MS - elapsedMs % TOKEN_REGENERATION.REGEN_INTERVAL_MS;
  return remainingMs;
}
function formatFileSize(bytes) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1e3);
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
function formatRelativeTime(date) {
  const now = /* @__PURE__ */ new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1e3);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays > 7) {
    return date.toLocaleDateString();
  }
  if (diffDays > 0) {
    return `${diffDays}d ago`;
  }
  if (diffHours > 0) {
    return `${diffHours}h ago`;
  }
  if (diffMinutes > 0) {
    return `${diffMinutes}m ago`;
  }
  return "Just now";
}
function formatCurrency(amount, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency
  }).format(amount);
}
function getTierDimensions(tier) {
  const dimensions = {
    FREE: 1024,
    TIER_1K: 1024,
    TIER_2K: 2048,
    TIER_4K: 4096
  };
  return dimensions[tier];
}
function parseAspectRatio(aspectRatio) {
  const parts = aspectRatio.split(":");
  if (parts.length !== 2) return null;
  const width = parseInt(parts[0], 10);
  const height = parseInt(parts[1], 10);
  if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
    return null;
  }
  return { width, height };
}
function calculateOutputDimensions(originalWidth, originalHeight, maxDimension) {
  const aspectRatio = originalWidth / originalHeight;
  if (originalWidth >= originalHeight) {
    const width = Math.min(originalWidth, maxDimension);
    const height = Math.round(width / aspectRatio);
    return { width, height };
  } else {
    const height = Math.min(originalHeight, maxDimension);
    const width = Math.round(height * aspectRatio);
    return { width, height };
  }
}
function isAllowedMimeType(mimeType) {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  return allowed.includes(mimeType);
}
function generateShareToken() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
export {
  API_CONFIG,
  AddToCartRequestSchema,
  AlbumPrivacySchema,
  AspectRatioSchema,
  BatchEnhanceRequestSchema,
  CheckEmailRequestSchema,
  CreateAlbumRequestSchema,
  CreateOrderRequestSchema,
  ENHANCEMENT_COSTS,
  EmailSchema,
  EnhanceImageRequestSchema,
  EnhancementTierSchema,
  GenerateImageRequestSchema,
  IMAGE_CONSTRAINTS,
  MCP_GENERATION_COSTS,
  ModifyImageRequestSchema,
  REFERRAL_CONFIG,
  REVENUECAT_PRODUCTS,
  RedeemVoucherRequestSchema,
  SUBSCRIPTION_TIERS,
  SUPPORTED_ASPECT_RATIOS,
  ShippingAddressSchema,
  SignUpRequestSchema,
  TOKEN_REGENERATION,
  UpdateAlbumRequestSchema,
  calculateOutputDimensions,
  calculateRegeneratedTokens,
  formatCurrency,
  formatDuration,
  formatFileSize,
  formatRelativeTime,
  generateShareToken,
  getEnhancementCost,
  getTierDimensions,
  getTimeUntilNextRegen,
  isAllowedMimeType,
  parseAspectRatio
};
