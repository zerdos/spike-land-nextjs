/**
 * Prisma Mock Factory
 *
 * Provides type-safe factory functions for creating Prisma model mocks.
 * Eliminates the need for `as any` type assertions in test files.
 */

import type {
  Album,
  AlbumPrivacy,
  EnhancedImage,
  EnhancementTier,
  ImageEnhancementJob,
  JobStatus,
  MerchCart,
  MerchCartItem,
  MerchProduct,
  PodProvider,
  Referral,
  ReferralStatus,
  Subscription,
  SubscriptionStatus,
  SubscriptionTier,
  TokenTransaction,
  TokenTransactionType,
  User,
  UserRole,
  UserTokenBalance,
  Voucher,
  VoucherStatus,
  VoucherType,
} from "@prisma/client";
import type { DeepPartial } from "../types";

// =============================================================================
// User Model Mocks
// =============================================================================

/**
 * Default mock user data.
 */
const defaultUser: User = {
  id: "user_test12345678901234567890",
  email: "test@example.com",
  name: "Test User",
  image: null,
  emailVerified: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  stripeCustomerId: null,
  role: "USER" as UserRole,
  referralCode: null,
  referredById: null,
  referralCount: 0,
  passwordHash: null,
};

/**
 * Creates a mock User with the given overrides.
 */
export function createMockUser(overrides: DeepPartial<User> = {}): User {
  return {
    ...defaultUser,
    ...overrides,
    createdAt: overrides.createdAt
      ? new Date(overrides.createdAt as Date | string)
      : defaultUser.createdAt,
    updatedAt: overrides.updatedAt
      ? new Date(overrides.updatedAt as Date | string)
      : defaultUser.updatedAt,
  } as User;
}

// =============================================================================
// Enhanced Image Model Mocks
// =============================================================================

/**
 * Default mock enhanced image data.
 */
const defaultEnhancedImage: EnhancedImage = {
  id: "img_test12345678901234567890",
  userId: "user_test12345678901234567890",
  name: "test-image.jpg",
  description: null,
  originalUrl: "https://example.com/original.jpg",
  originalR2Key: "originals/test/test-image.jpg",
  originalWidth: 1920,
  originalHeight: 1080,
  originalSizeBytes: 500000,
  originalFormat: "image/jpeg",
  isPublic: false,
  viewCount: 0,
  shareToken: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

/**
 * Creates a mock EnhancedImage with the given overrides.
 */
export function createMockEnhancedImage(
  overrides: DeepPartial<EnhancedImage> = {},
): EnhancedImage {
  return {
    ...defaultEnhancedImage,
    ...overrides,
    createdAt: overrides.createdAt
      ? new Date(overrides.createdAt as Date | string)
      : defaultEnhancedImage.createdAt,
    updatedAt: overrides.updatedAt
      ? new Date(overrides.updatedAt as Date | string)
      : defaultEnhancedImage.updatedAt,
  } as EnhancedImage;
}

// =============================================================================
// Image Enhancement Job Model Mocks
// =============================================================================

/**
 * Default mock enhancement job data.
 */
const defaultEnhancementJob: ImageEnhancementJob = {
  id: "job_test12345678901234567890",
  imageId: "img_test12345678901234567890",
  userId: "user_test12345678901234567890",
  tier: "TIER_1K" as EnhancementTier,
  tokensCost: 2,
  status: "COMPLETED" as JobStatus,
  currentStage: null,
  enhancedUrl: "https://example.com/enhanced.jpg",
  enhancedR2Key: "enhanced/test/enhanced.jpg",
  enhancedWidth: 1920,
  enhancedHeight: 1080,
  enhancedSizeBytes: 600000,
  errorMessage: null,
  retryCount: 0,
  maxRetries: 3,
  geminiPrompt: null,
  geminiModel: null,
  geminiTemp: null,
  processingStartedAt: null,
  processingCompletedAt: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  workflowRunId: null,
  analysisResult: null,
  analysisSource: null,
  wasCropped: false,
  cropDimensions: null,
  pipelineId: null,
  sourceImageId: null,
  isBlend: false,
  isAnonymous: false,
};

/**
 * Creates a mock ImageEnhancementJob with the given overrides.
 */
export function createMockEnhancementJob(
  overrides: DeepPartial<ImageEnhancementJob> = {},
): ImageEnhancementJob {
  return {
    ...defaultEnhancementJob,
    ...overrides,
    createdAt: overrides.createdAt
      ? new Date(overrides.createdAt as Date | string)
      : defaultEnhancementJob.createdAt,
    updatedAt: overrides.updatedAt
      ? new Date(overrides.updatedAt as Date | string)
      : defaultEnhancementJob.updatedAt,
    processingStartedAt: overrides.processingStartedAt
      ? new Date(overrides.processingStartedAt as Date | string)
      : defaultEnhancementJob.processingStartedAt,
    processingCompletedAt: overrides.processingCompletedAt
      ? new Date(overrides.processingCompletedAt as Date | string)
      : defaultEnhancementJob.processingCompletedAt,
  } as ImageEnhancementJob;
}

// =============================================================================
// Token Balance Model Mocks
// =============================================================================

/**
 * Default mock token balance data.
 */
const defaultTokenBalance: UserTokenBalance = {
  id: "balance_test1234567890123456",
  userId: "user_test12345678901234567890",
  balance: 100,
  lastRegeneration: new Date("2024-01-01"),
  tier: "FREE" as SubscriptionTier,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

/**
 * Creates a mock UserTokenBalance with the given overrides.
 */
export function createMockTokenBalance(
  overrides: DeepPartial<UserTokenBalance> = {},
): UserTokenBalance {
  return {
    ...defaultTokenBalance,
    ...overrides,
    lastRegeneration: overrides.lastRegeneration
      ? new Date(overrides.lastRegeneration as Date | string)
      : defaultTokenBalance.lastRegeneration,
    createdAt: overrides.createdAt
      ? new Date(overrides.createdAt as Date | string)
      : defaultTokenBalance.createdAt,
    updatedAt: overrides.updatedAt
      ? new Date(overrides.updatedAt as Date | string)
      : defaultTokenBalance.updatedAt,
  } as UserTokenBalance;
}

// =============================================================================
// Token Transaction Model Mocks
// =============================================================================

/**
 * Default mock token transaction data.
 */
const defaultTokenTransaction: TokenTransaction = {
  id: "txn_test12345678901234567890",
  userId: "user_test12345678901234567890",
  amount: 10,
  type: "EARN_PURCHASE" as TokenTransactionType,
  source: null,
  sourceId: null,
  balanceAfter: 110,
  metadata: null,
  createdAt: new Date("2024-01-01"),
};

/**
 * Creates a mock TokenTransaction with the given overrides.
 */
export function createMockTokenTransaction(
  overrides: DeepPartial<TokenTransaction> = {},
): TokenTransaction {
  return {
    ...defaultTokenTransaction,
    ...overrides,
    createdAt: overrides.createdAt
      ? new Date(overrides.createdAt as Date | string)
      : defaultTokenTransaction.createdAt,
  } as TokenTransaction;
}

// =============================================================================
// Subscription Model Mocks
// =============================================================================

/**
 * Default mock subscription data.
 */
const defaultSubscription: Subscription = {
  id: "sub_test12345678901234567890",
  userId: "user_test12345678901234567890",
  stripeSubscriptionId: "sub_stripe123",
  stripePriceId: "price_123",
  status: "ACTIVE" as SubscriptionStatus,
  tier: "BASIC" as SubscriptionTier,
  currentPeriodStart: new Date("2024-01-01"),
  currentPeriodEnd: new Date("2024-02-01"),
  cancelAtPeriodEnd: false,
  downgradeTo: null,
  tokensPerMonth: 100,
  rolloverTokens: 0,
  maxRollover: 0,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

/**
 * Creates a mock Subscription with the given overrides.
 */
export function createMockSubscription(
  overrides: DeepPartial<Subscription> = {},
): Subscription {
  return {
    ...defaultSubscription,
    ...overrides,
    currentPeriodStart: overrides.currentPeriodStart
      ? new Date(overrides.currentPeriodStart as Date | string)
      : defaultSubscription.currentPeriodStart,
    currentPeriodEnd: overrides.currentPeriodEnd
      ? new Date(overrides.currentPeriodEnd as Date | string)
      : defaultSubscription.currentPeriodEnd,
    createdAt: overrides.createdAt
      ? new Date(overrides.createdAt as Date | string)
      : defaultSubscription.createdAt,
    updatedAt: overrides.updatedAt
      ? new Date(overrides.updatedAt as Date | string)
      : defaultSubscription.updatedAt,
  } as Subscription;
}

// =============================================================================
// Voucher Model Mocks
// =============================================================================

/**
 * Default mock voucher data.
 */
const defaultVoucher: Voucher = {
  id: "voucher_test123456789012345",
  code: "TEST100",
  type: "FIXED_TOKENS" as VoucherType,
  value: 100,
  maxUses: 10,
  currentUses: 0,
  expiresAt: new Date("2025-12-31"),
  status: "ACTIVE" as VoucherStatus,
  metadata: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

/**
 * Creates a mock Voucher with the given overrides.
 */
export function createMockVoucher(
  overrides: DeepPartial<Voucher> = {},
): Voucher {
  return {
    ...defaultVoucher,
    ...overrides,
    expiresAt: overrides.expiresAt
      ? new Date(overrides.expiresAt as Date | string)
      : defaultVoucher.expiresAt,
    createdAt: overrides.createdAt
      ? new Date(overrides.createdAt as Date | string)
      : defaultVoucher.createdAt,
    updatedAt: overrides.updatedAt
      ? new Date(overrides.updatedAt as Date | string)
      : defaultVoucher.updatedAt,
  } as Voucher;
}

// =============================================================================
// Referral Model Mocks
// =============================================================================

/**
 * Default mock referral data.
 */
const defaultReferral: Referral = {
  id: "ref_test123456789012345678",
  referrerId: "user_referrer123456789012",
  refereeId: "user_referee1234567890123",
  status: "PENDING" as ReferralStatus,
  tokensGranted: 0,
  ipAddress: null,
  createdAt: new Date("2024-01-01"),
  completedAt: null,
};

/**
 * Creates a mock Referral with the given overrides.
 */
export function createMockReferral(
  overrides: DeepPartial<Referral> = {},
): Referral {
  return {
    ...defaultReferral,
    ...overrides,
    createdAt: overrides.createdAt
      ? new Date(overrides.createdAt as Date | string)
      : defaultReferral.createdAt,
    completedAt: overrides.completedAt
      ? new Date(overrides.completedAt as Date | string)
      : defaultReferral.completedAt,
  } as Referral;
}

// =============================================================================
// Album Model Mocks
// =============================================================================

/**
 * Default mock album data.
 */
const defaultAlbum: Album = {
  id: "album_test1234567890123456",
  userId: "user_test12345678901234567890",
  name: "Test Album",
  description: null,
  coverImageId: null,
  privacy: "PRIVATE" as AlbumPrivacy,
  defaultTier: "TIER_1K" as EnhancementTier,
  shareToken: null,
  sortOrder: 0,
  pipelineId: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

/**
 * Creates a mock Album with the given overrides.
 */
export function createMockAlbum(overrides: DeepPartial<Album> = {}): Album {
  return {
    ...defaultAlbum,
    ...overrides,
    createdAt: overrides.createdAt
      ? new Date(overrides.createdAt as Date | string)
      : defaultAlbum.createdAt,
    updatedAt: overrides.updatedAt
      ? new Date(overrides.updatedAt as Date | string)
      : defaultAlbum.updatedAt,
  } as Album;
}

// =============================================================================
// Merch Model Mocks
// =============================================================================

/**
 * Creates a mock MerchProduct with the given overrides.
 */
export function createMockMerchProduct(
  overrides: DeepPartial<MerchProduct> = {},
): MerchProduct {
  const defaults: MerchProduct = {
    id: "prod_test1234567890123456",
    name: "Test Product",
    description: "A test product",
    categoryId: "cat_test12345678901234567",
    provider: "PRODIGI" as PodProvider,
    providerSku: "SKU-TEST-001",
    basePrice: {
      toNumber: () => 15.0,
    } as unknown as import("@prisma/client/runtime/library").Decimal,
    retailPrice: {
      toNumber: () => 25.0,
    } as unknown as import("@prisma/client/runtime/library").Decimal,
    currency: "GBP",
    isActive: true,
    minDpi: 150,
    minWidth: 1800,
    minHeight: 1800,
    printAreaWidth: null,
    printAreaHeight: null,
    mockupTemplate: null,
    sortOrder: 0,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  };

  return {
    ...defaults,
    ...overrides,
    createdAt: overrides.createdAt
      ? new Date(overrides.createdAt as Date | string)
      : defaults.createdAt,
    updatedAt: overrides.updatedAt
      ? new Date(overrides.updatedAt as Date | string)
      : defaults.updatedAt,
  } as MerchProduct;
}

/**
 * Creates a mock MerchCart with the given overrides.
 */
export function createMockMerchCart(
  overrides: DeepPartial<MerchCart> = {},
): MerchCart {
  const defaults: MerchCart = {
    id: "cart_test1234567890123456",
    userId: "user_test12345678901234567890",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  };

  return {
    ...defaults,
    ...overrides,
    createdAt: overrides.createdAt
      ? new Date(overrides.createdAt as Date | string)
      : defaults.createdAt,
    updatedAt: overrides.updatedAt
      ? new Date(overrides.updatedAt as Date | string)
      : defaults.updatedAt,
  } as MerchCart;
}

/**
 * Creates a mock MerchCartItem with the given overrides.
 */
export function createMockMerchCartItem(
  overrides: DeepPartial<MerchCartItem> = {},
): MerchCartItem {
  const defaults: MerchCartItem = {
    id: "item_test1234567890123456",
    cartId: "cart_test1234567890123456",
    productId: "prod_test1234567890123456",
    variantId: null,
    imageId: "img_test12345678901234567890",
    uploadedImageR2Key: null,
    uploadedImageUrl: null,
    quantity: 1,
    customText: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  };

  return {
    ...defaults,
    ...overrides,
    createdAt: overrides.createdAt
      ? new Date(overrides.createdAt as Date | string)
      : defaults.createdAt,
    updatedAt: overrides.updatedAt
      ? new Date(overrides.updatedAt as Date | string)
      : defaults.updatedAt,
  } as MerchCartItem;
}
