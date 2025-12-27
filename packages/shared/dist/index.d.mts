import { z } from 'zod';

/**
 * Shared types extracted from Prisma schema for use in mobile and web apps
 * This is a subset of the full Prisma types, containing only what's needed for the mobile app
 */
type UserRole = "USER" | "ADMIN" | "SUPER_ADMIN";
type EnhancementTier = "FREE" | "TIER_1K" | "TIER_2K" | "TIER_4K";
type JobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "REFUNDED" | "CANCELLED";
type PipelineStage = "ANALYZING" | "CROPPING" | "PROMPTING" | "GENERATING";
type SubscriptionTier = "FREE" | "BASIC" | "STANDARD" | "PREMIUM";
type SubscriptionStatus = "ACTIVE" | "CANCELED" | "PAST_DUE" | "UNPAID" | "TRIALING";
type AlbumPrivacy = "PRIVATE" | "UNLISTED" | "PUBLIC";
type TokenTransactionType = "EARN_REGENERATION" | "EARN_PURCHASE" | "EARN_BONUS" | "SPEND_ENHANCEMENT" | "SPEND_MCP_GENERATION" | "SPEND_BOX_CREATION" | "REFUND";
type ReferralStatus = "PENDING" | "COMPLETED" | "INVALID";
type McpJobType = "GENERATE" | "MODIFY";
type GalleryCategory = "PORTRAIT" | "LANDSCAPE" | "PRODUCT" | "ARCHITECTURE";
type MerchOrderStatus = "PENDING" | "PAYMENT_PENDING" | "PAID" | "SUBMITTED" | "IN_PRODUCTION" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED";
type ShipmentStatus = "PENDING" | "PROCESSING" | "SHIPPED" | "IN_TRANSIT" | "OUT_FOR_DELIVERY" | "DELIVERED" | "FAILED";
interface User {
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
interface UserTokenBalance {
    id: string;
    userId: string;
    balance: number;
    lastRegeneration: Date;
    tier: SubscriptionTier;
    createdAt: Date;
    updatedAt: Date;
}
interface EnhancedImage {
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
interface ImageEnhancementJob {
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
interface McpGenerationJob {
    id: string;
    userId: string;
    type: McpJobType;
    tier: EnhancementTier;
    tokensCost: number;
    status: JobStatus;
    prompt: string;
    inputImageUrl: string | null;
    outputImageUrl: string | null;
    outputWidth: number | null;
    outputHeight: number | null;
    errorMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
}
interface Album {
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
interface AlbumImage {
    id: string;
    albumId: string;
    imageId: string;
    sortOrder: number;
    addedAt: Date;
}
interface TokenTransaction {
    id: string;
    userId: string;
    amount: number;
    type: TokenTransactionType;
    source: string | null;
    sourceId: string | null;
    balanceAfter: number;
    createdAt: Date;
}
interface Subscription {
    id: string;
    userId: string;
    status: SubscriptionStatus;
    tier: SubscriptionTier;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
    tokensPerMonth: number;
    rolloverTokens: number;
    maxRollover: number;
}
interface TokensPackage {
    id: string;
    name: string;
    tokens: number;
    priceUSD: number;
    stripePriceId: string;
    active: boolean;
    sortOrder: number;
}
interface Referral {
    id: string;
    referrerId: string;
    refereeId: string;
    status: ReferralStatus;
    tokensGranted: number;
    createdAt: Date;
    completedAt: Date | null;
}
interface MerchCategory {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    icon: string | null;
    sortOrder: number;
    isActive: boolean;
}
interface MerchProduct {
    id: string;
    name: string;
    description: string | null;
    categoryId: string;
    providerSku: string;
    basePrice: number;
    retailPrice: number;
    currency: string;
    isActive: boolean;
    minDpi: number;
    minWidth: number;
    minHeight: number;
    printAreaWidth: number | null;
    printAreaHeight: number | null;
    mockupTemplate: string | null;
    sortOrder: number;
}
interface MerchVariant {
    id: string;
    productId: string;
    name: string;
    providerSku: string;
    priceDelta: number;
    isActive: boolean;
    attributes: Record<string, string> | null;
}
interface MerchCartItem {
    id: string;
    cartId: string;
    productId: string;
    variantId: string | null;
    imageId: string | null;
    uploadedImageUrl: string | null;
    quantity: number;
    customText: string | null;
}
interface MerchOrder {
    id: string;
    userId: string;
    orderNumber: string;
    status: MerchOrderStatus;
    subtotal: number;
    shippingCost: number;
    taxAmount: number;
    totalAmount: number;
    currency: string;
    customerEmail: string;
    customerPhone: string | null;
    createdAt: Date;
    paidAt: Date | null;
}
interface MerchOrderItem {
    id: string;
    orderId: string;
    productId: string;
    variantId: string | null;
    productName: string;
    variantName: string | null;
    imageUrl: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
}
interface FeaturedGalleryItem {
    id: string;
    title: string;
    description: string | null;
    category: GalleryCategory;
    originalUrl: string;
    enhancedUrl: string;
    width: number;
    height: number;
    sortOrder: number;
    isActive: boolean;
}

/**
 * Shared constants for token costs, pricing, and configuration
 * Used by both web and mobile apps
 */
declare const ENHANCEMENT_COSTS: {
    readonly FREE: 0;
    readonly TIER_1K: 2;
    readonly TIER_2K: 5;
    readonly TIER_4K: 10;
};
declare const MCP_GENERATION_COSTS: {
    readonly FREE: 0;
    readonly TIER_1K: 2;
    readonly TIER_2K: 5;
    readonly TIER_4K: 10;
};
type EnhancementTierKey = keyof typeof ENHANCEMENT_COSTS;
declare const TOKEN_REGENERATION: {
    /** Tokens regenerated per interval */
    readonly TOKENS_PER_REGEN: 1;
    /** Regeneration interval in milliseconds (15 minutes) */
    readonly REGEN_INTERVAL_MS: number;
    /** Maximum tokens that can be regenerated to */
    readonly MAX_FREE_TOKENS: 10;
};
declare const IMAGE_CONSTRAINTS: {
    /** Maximum file size for upload (10MB) */
    readonly MAX_FILE_SIZE_BYTES: number;
    /** Allowed image MIME types */
    readonly ALLOWED_MIME_TYPES: readonly ["image/jpeg", "image/png", "image/webp"];
    /** Maximum batch upload count */
    readonly MAX_BATCH_SIZE: 20;
    /** Output dimensions per tier */
    readonly TIER_DIMENSIONS: {
        readonly FREE: 1024;
        readonly TIER_1K: 1024;
        readonly TIER_2K: 2048;
        readonly TIER_4K: 4096;
    };
};
declare const SUPPORTED_ASPECT_RATIOS: readonly ["1:1", "3:2", "2:3", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"];
type AspectRatio = (typeof SUPPORTED_ASPECT_RATIOS)[number];
declare const REFERRAL_CONFIG: {
    /** Tokens earned per successful referral */
    readonly TOKENS_PER_REFERRAL: 50;
    /** Tokens given to new user from referral */
    readonly SIGNUP_BONUS_TOKENS: 10;
};
declare const API_CONFIG: {
    /** Base URL for production API */
    readonly PRODUCTION_URL: "https://spike.land";
    /** Default timeout in milliseconds */
    readonly DEFAULT_TIMEOUT_MS: 30000;
    /** Job polling interval in milliseconds */
    readonly JOB_POLL_INTERVAL_MS: 2000;
};
declare const SUBSCRIPTION_TIERS: {
    readonly FREE: {
        readonly name: "Free";
        readonly tokensPerMonth: 0;
        readonly maxRollover: 0;
        readonly priority: false;
        readonly apiAccess: false;
    };
    readonly BASIC: {
        readonly name: "Basic";
        readonly tokensPerMonth: 100;
        readonly maxRollover: 50;
        readonly priority: false;
        readonly apiAccess: false;
    };
    readonly STANDARD: {
        readonly name: "Standard";
        readonly tokensPerMonth: 300;
        readonly maxRollover: 150;
        readonly priority: true;
        readonly apiAccess: false;
    };
    readonly PREMIUM: {
        readonly name: "Premium";
        readonly tokensPerMonth: 1000;
        readonly maxRollover: 500;
        readonly priority: true;
        readonly apiAccess: true;
    };
};
declare const REVENUECAT_PRODUCTS: {
    /** Token package product IDs */
    readonly TOKEN_PACKAGES: {
        readonly STARTER: "tokens_starter_50";
        readonly PRO: "tokens_pro_150";
        readonly POWER: "tokens_power_500";
    };
    /** Subscription product IDs */
    readonly SUBSCRIPTIONS: {
        readonly BASIC_MONTHLY: "sub_basic_monthly";
        readonly STANDARD_MONTHLY: "sub_standard_monthly";
        readonly PREMIUM_MONTHLY: "sub_premium_monthly";
    };
};

/**
 * Shared Zod validation schemas for API requests
 * Used by both web and mobile apps
 */
declare const EnhancementTierSchema: z.ZodEnum<["FREE", "TIER_1K", "TIER_2K", "TIER_4K"]>;
declare const EnhanceImageRequestSchema: z.ZodObject<{
    imageId: z.ZodString;
    tier: z.ZodEnum<["FREE", "TIER_1K", "TIER_2K", "TIER_4K"]>;
    prompt: z.ZodOptional<z.ZodString>;
    pipelineId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    imageId: string;
    tier: "FREE" | "TIER_1K" | "TIER_2K" | "TIER_4K";
    prompt?: string | undefined;
    pipelineId?: string | undefined;
}, {
    imageId: string;
    tier: "FREE" | "TIER_1K" | "TIER_2K" | "TIER_4K";
    prompt?: string | undefined;
    pipelineId?: string | undefined;
}>;
declare const BatchEnhanceRequestSchema: z.ZodObject<{
    imageIds: z.ZodArray<z.ZodString, "many">;
    tier: z.ZodEnum<["FREE", "TIER_1K", "TIER_2K", "TIER_4K"]>;
}, "strip", z.ZodTypeAny, {
    tier: "FREE" | "TIER_1K" | "TIER_2K" | "TIER_4K";
    imageIds: string[];
}, {
    tier: "FREE" | "TIER_1K" | "TIER_2K" | "TIER_4K";
    imageIds: string[];
}>;
type EnhanceImageRequest = z.infer<typeof EnhanceImageRequestSchema>;
type BatchEnhanceRequest = z.infer<typeof BatchEnhanceRequestSchema>;
declare const AspectRatioSchema: z.ZodEnum<["1:1", "3:2", "2:3", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"]>;
declare const GenerateImageRequestSchema: z.ZodObject<{
    prompt: z.ZodString;
    tier: z.ZodDefault<z.ZodEnum<["FREE", "TIER_1K", "TIER_2K", "TIER_4K"]>>;
    aspectRatio: z.ZodDefault<z.ZodEnum<["1:1", "3:2", "2:3", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"]>>;
    negativePrompt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tier: "FREE" | "TIER_1K" | "TIER_2K" | "TIER_4K";
    prompt: string;
    aspectRatio: "1:1" | "3:2" | "2:3" | "3:4" | "4:3" | "4:5" | "5:4" | "9:16" | "16:9" | "21:9";
    negativePrompt?: string | undefined;
}, {
    prompt: string;
    tier?: "FREE" | "TIER_1K" | "TIER_2K" | "TIER_4K" | undefined;
    aspectRatio?: "1:1" | "3:2" | "2:3" | "3:4" | "4:3" | "4:5" | "5:4" | "9:16" | "16:9" | "21:9" | undefined;
    negativePrompt?: string | undefined;
}>;
declare const ModifyImageRequestSchema: z.ZodObject<{
    prompt: z.ZodString;
    tier: z.ZodDefault<z.ZodEnum<["FREE", "TIER_1K", "TIER_2K", "TIER_4K"]>>;
    imageUrl: z.ZodOptional<z.ZodString>;
    imageBase64: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tier: "FREE" | "TIER_1K" | "TIER_2K" | "TIER_4K";
    prompt: string;
    imageUrl?: string | undefined;
    imageBase64?: string | undefined;
}, {
    prompt: string;
    tier?: "FREE" | "TIER_1K" | "TIER_2K" | "TIER_4K" | undefined;
    imageUrl?: string | undefined;
    imageBase64?: string | undefined;
}>;
type GenerateImageRequest = z.infer<typeof GenerateImageRequestSchema>;
type ModifyImageRequest = z.infer<typeof ModifyImageRequestSchema>;
declare const AlbumPrivacySchema: z.ZodEnum<["PRIVATE", "UNLISTED", "PUBLIC"]>;
declare const CreateAlbumRequestSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    privacy: z.ZodDefault<z.ZodEnum<["PRIVATE", "UNLISTED", "PUBLIC"]>>;
    defaultTier: z.ZodDefault<z.ZodEnum<["FREE", "TIER_1K", "TIER_2K", "TIER_4K"]>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    privacy: "PRIVATE" | "UNLISTED" | "PUBLIC";
    defaultTier: "FREE" | "TIER_1K" | "TIER_2K" | "TIER_4K";
    description?: string | undefined;
}, {
    name: string;
    description?: string | undefined;
    privacy?: "PRIVATE" | "UNLISTED" | "PUBLIC" | undefined;
    defaultTier?: "FREE" | "TIER_1K" | "TIER_2K" | "TIER_4K" | undefined;
}>;
declare const UpdateAlbumRequestSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    privacy: z.ZodOptional<z.ZodEnum<["PRIVATE", "UNLISTED", "PUBLIC"]>>;
    defaultTier: z.ZodOptional<z.ZodEnum<["FREE", "TIER_1K", "TIER_2K", "TIER_4K"]>>;
    coverImageId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    description?: string | undefined;
    privacy?: "PRIVATE" | "UNLISTED" | "PUBLIC" | undefined;
    defaultTier?: "FREE" | "TIER_1K" | "TIER_2K" | "TIER_4K" | undefined;
    coverImageId?: string | undefined;
}, {
    name?: string | undefined;
    description?: string | undefined;
    privacy?: "PRIVATE" | "UNLISTED" | "PUBLIC" | undefined;
    defaultTier?: "FREE" | "TIER_1K" | "TIER_2K" | "TIER_4K" | undefined;
    coverImageId?: string | undefined;
}>;
type CreateAlbumRequest = z.infer<typeof CreateAlbumRequestSchema>;
type UpdateAlbumRequest = z.infer<typeof UpdateAlbumRequestSchema>;
declare const RedeemVoucherRequestSchema: z.ZodObject<{
    code: z.ZodEffects<z.ZodString, string, string>;
}, "strip", z.ZodTypeAny, {
    code: string;
}, {
    code: string;
}>;
type RedeemVoucherRequest = z.infer<typeof RedeemVoucherRequestSchema>;
declare const AddToCartRequestSchema: z.ZodObject<{
    productId: z.ZodString;
    variantId: z.ZodOptional<z.ZodString>;
    imageId: z.ZodOptional<z.ZodString>;
    uploadedImageUrl: z.ZodOptional<z.ZodString>;
    quantity: z.ZodDefault<z.ZodNumber>;
    customText: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    productId: string;
    quantity: number;
    imageId?: string | undefined;
    variantId?: string | undefined;
    uploadedImageUrl?: string | undefined;
    customText?: string | undefined;
}, {
    productId: string;
    imageId?: string | undefined;
    variantId?: string | undefined;
    uploadedImageUrl?: string | undefined;
    quantity?: number | undefined;
    customText?: string | undefined;
}>;
declare const ShippingAddressSchema: z.ZodObject<{
    name: z.ZodString;
    line1: z.ZodString;
    line2: z.ZodOptional<z.ZodString>;
    city: z.ZodString;
    state: z.ZodOptional<z.ZodString>;
    postalCode: z.ZodString;
    country: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    line1: string;
    city: string;
    postalCode: string;
    country: string;
    line2?: string | undefined;
    state?: string | undefined;
}, {
    name: string;
    line1: string;
    city: string;
    postalCode: string;
    country: string;
    line2?: string | undefined;
    state?: string | undefined;
}>;
declare const CreateOrderRequestSchema: z.ZodObject<{
    shippingAddress: z.ZodObject<{
        name: z.ZodString;
        line1: z.ZodString;
        line2: z.ZodOptional<z.ZodString>;
        city: z.ZodString;
        state: z.ZodOptional<z.ZodString>;
        postalCode: z.ZodString;
        country: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        line1: string;
        city: string;
        postalCode: string;
        country: string;
        line2?: string | undefined;
        state?: string | undefined;
    }, {
        name: string;
        line1: string;
        city: string;
        postalCode: string;
        country: string;
        line2?: string | undefined;
        state?: string | undefined;
    }>;
    billingAddress: z.ZodOptional<z.ZodObject<{
        name: z.ZodString;
        line1: z.ZodString;
        line2: z.ZodOptional<z.ZodString>;
        city: z.ZodString;
        state: z.ZodOptional<z.ZodString>;
        postalCode: z.ZodString;
        country: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        line1: string;
        city: string;
        postalCode: string;
        country: string;
        line2?: string | undefined;
        state?: string | undefined;
    }, {
        name: string;
        line1: string;
        city: string;
        postalCode: string;
        country: string;
        line2?: string | undefined;
        state?: string | undefined;
    }>>;
    email: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    shippingAddress: {
        name: string;
        line1: string;
        city: string;
        postalCode: string;
        country: string;
        line2?: string | undefined;
        state?: string | undefined;
    };
    email: string;
    billingAddress?: {
        name: string;
        line1: string;
        city: string;
        postalCode: string;
        country: string;
        line2?: string | undefined;
        state?: string | undefined;
    } | undefined;
    phone?: string | undefined;
    notes?: string | undefined;
}, {
    shippingAddress: {
        name: string;
        line1: string;
        city: string;
        postalCode: string;
        country: string;
        line2?: string | undefined;
        state?: string | undefined;
    };
    email: string;
    billingAddress?: {
        name: string;
        line1: string;
        city: string;
        postalCode: string;
        country: string;
        line2?: string | undefined;
        state?: string | undefined;
    } | undefined;
    phone?: string | undefined;
    notes?: string | undefined;
}>;
type AddToCartRequest = z.infer<typeof AddToCartRequestSchema>;
type ShippingAddress = z.infer<typeof ShippingAddressSchema>;
type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>;
declare const EmailSchema: z.ZodString;
declare const CheckEmailRequestSchema: z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>;
declare const SignUpRequestSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    referralCode: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    name?: string | undefined;
    referralCode?: string | undefined;
}, {
    email: string;
    password: string;
    name?: string | undefined;
    referralCode?: string | undefined;
}>;
type CheckEmailRequest = z.infer<typeof CheckEmailRequestSchema>;
type SignUpRequest = z.infer<typeof SignUpRequestSchema>;

/**
 * Shared utility functions for both web and mobile apps
 */

/**
 * Get the token cost for an enhancement tier
 */
declare function getEnhancementCost(tier: EnhancementTierKey): number;
/**
 * Calculate tokens that would be regenerated since last regeneration
 */
declare function calculateRegeneratedTokens(lastRegeneration: Date, currentBalance: number, maxTokens?: number): number;
/**
 * Get time until next token regeneration in milliseconds
 */
declare function getTimeUntilNextRegen(lastRegeneration: Date): number;
/**
 * Format file size in human-readable format
 */
declare function formatFileSize(bytes: number): string;
/**
 * Format duration in human-readable format
 */
declare function formatDuration(ms: number): string;
/**
 * Format a date as relative time (e.g., "2 hours ago")
 */
declare function formatRelativeTime(date: Date): string;
/**
 * Format currency amount
 */
declare function formatCurrency(amount: number, currency?: string): string;
/**
 * Get dimensions for a tier
 */
declare function getTierDimensions(tier: EnhancementTierKey): number;
/**
 * Parse aspect ratio string to width/height ratio
 */
declare function parseAspectRatio(aspectRatio: string): {
    width: number;
    height: number;
} | null;
/**
 * Calculate dimensions maintaining aspect ratio within max dimension
 */
declare function calculateOutputDimensions(originalWidth: number, originalHeight: number, maxDimension: number): {
    width: number;
    height: number;
};
/**
 * Check if a MIME type is allowed for image upload
 */
declare function isAllowedMimeType(mimeType: string): boolean;
/**
 * Generate a share token for images/albums
 */
declare function generateShareToken(): string;

export { API_CONFIG, type AddToCartRequest, AddToCartRequestSchema, type Album, type AlbumImage, type AlbumPrivacy, AlbumPrivacySchema, type AspectRatio, AspectRatioSchema, type BatchEnhanceRequest, BatchEnhanceRequestSchema, type CheckEmailRequest, CheckEmailRequestSchema, type CreateAlbumRequest, CreateAlbumRequestSchema, type CreateOrderRequest, CreateOrderRequestSchema, ENHANCEMENT_COSTS, EmailSchema, type EnhanceImageRequest, EnhanceImageRequestSchema, type EnhancedImage, type EnhancementTier, type EnhancementTierKey, EnhancementTierSchema, type FeaturedGalleryItem, type GalleryCategory, type GenerateImageRequest, GenerateImageRequestSchema, IMAGE_CONSTRAINTS, type ImageEnhancementJob, type JobStatus, MCP_GENERATION_COSTS, type McpGenerationJob, type McpJobType, type MerchCartItem, type MerchCategory, type MerchOrder, type MerchOrderItem, type MerchOrderStatus, type MerchProduct, type MerchVariant, type ModifyImageRequest, ModifyImageRequestSchema, type PipelineStage, REFERRAL_CONFIG, REVENUECAT_PRODUCTS, type RedeemVoucherRequest, RedeemVoucherRequestSchema, type Referral, type ReferralStatus, SUBSCRIPTION_TIERS, SUPPORTED_ASPECT_RATIOS, type ShipmentStatus, type ShippingAddress, ShippingAddressSchema, type SignUpRequest, SignUpRequestSchema, type Subscription, type SubscriptionStatus, type SubscriptionTier, TOKEN_REGENERATION, type TokenTransaction, type TokenTransactionType, type TokensPackage, type UpdateAlbumRequest, UpdateAlbumRequestSchema, type User, type UserRole, type UserTokenBalance, calculateOutputDimensions, calculateRegeneratedTokens, formatCurrency, formatDuration, formatFileSize, formatRelativeTime, generateShareToken, getEnhancementCost, getTierDimensions, getTimeUntilNextRegen, isAllowedMimeType, parseAspectRatio };
