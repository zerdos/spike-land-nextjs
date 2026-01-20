/**
 * Test Utility Types
 *
 * Type helpers for creating type-safe mocks in test files.
 * These types help replace `as any` casts with proper typing.
 *
 * @see Issue #797: Type Safety Improvements
 */

import type { Prisma } from "@prisma/client";

// =============================================================================
// Prisma Mock Types
// =============================================================================

/**
 * Deep partial type that makes all nested properties optional
 * Useful for creating partial mock objects
 */
export type DeepPartial<T> = T extends object ? {
    [P in keyof T]?: DeepPartial<T[P]>;
  }
  : T;

/**
 * Mock referral object for testing
 */
export interface MockReferral {
  id: string;
  referrerId: string;
  refereeId: string;
  status: "PENDING" | "COMPLETED" | "INVALID";
  tokensGranted?: number;
  createdAt?: Date;
  completedAt?: Date | null;
  referrer?: { id: string; email: string | null; };
  referee?: { id: string; email: string | null; };
}

/**
 * Mock user object for testing
 */
export interface MockUser {
  id: string;
  email: string | null;
  name: string | null;
  role?: string;
  referralCode?: string | null;
  referralCount?: number;
  createdAt?: Date;
}

/**
 * Mock token balance result
 */
export interface MockTokenBalanceResult {
  success: boolean;
  balance: number;
  error?: string;
}

/**
 * Mock social account for testing
 */
export interface MockSocialAccount {
  id: string;
  platform: string;
  workspaceId: string;
  accountId?: string;
  username?: string;
  displayName?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
}

/**
 * Mock app for testing
 */
export interface MockApp {
  id: string;
  name: string;
  ownerId?: string;
  deletedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Mock workspace for testing
 */
export interface MockWorkspace {
  id: string;
  name: string;
  ownerId?: string;
  email?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Mock identity for testing
 */
export interface MockIdentity {
  id: string;
  userId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Mock identifier for testing
 */
export interface MockIdentifier {
  id: string;
  identityId: string;
  type: string;
  value: string;
  createdAt?: Date;
}

// =============================================================================
// Transaction Mock Types
// =============================================================================

/**
 * Minimal transaction client type for mocking
 */
export interface MockTransactionClient {
  referral?: {
    update: ReturnType<typeof vi.fn>;
    findUnique?: ReturnType<typeof vi.fn>;
  };
  user?: {
    update: ReturnType<typeof vi.fn>;
    findUnique?: ReturnType<typeof vi.fn>;
  };
  tokenTransaction?: {
    create: ReturnType<typeof vi.fn>;
  };
  userTokenBalance?: {
    update: ReturnType<typeof vi.fn>;
    findUnique?: ReturnType<typeof vi.fn>;
  };
}

/**
 * Type for Prisma transaction callback
 */
export type TransactionCallback<T> = (tx: MockTransactionClient) => Promise<T>;

// =============================================================================
// Vitest Mock Helpers
// =============================================================================

// Import vitest types for use in declaration
import type { Mock, vi } from "vitest";

/**
 * Type-safe mock return value setter
 * Use this instead of `as any` for mocked Prisma methods
 */
export function mockResolvedValue<T>(
  mockFn: Mock,
  value: T,
): void {
  mockFn.mockResolvedValue(value);
}

/**
 * Type-safe mock implementation setter for transactions
 */
export function mockTransaction<T>(
  transactionFn: Mock,
  callback: (txCallback: TransactionCallback<T>) => Promise<T>,
): void {
  transactionFn.mockImplementation(callback);
}

// =============================================================================
// Content Suggestion Mock Types
// =============================================================================

/**
 * Mock content suggestion record
 */
export interface MockContentSuggestion {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  draftContent: string;
  contentType: string;
  suggestedPlatforms: string[];
  trendData: Prisma.JsonValue;
  relevanceScore: number;
  timelinessScore: number;
  brandAlignmentScore: number;
  overallScore: number;
  status: string;
  generatedAt: Date;
  expiresAt: Date | null;
  usedAt: Date | null;
  dismissedAt: Date | null;
  dismissalReason: string | null;
  feedback: string | null;
}

// =============================================================================
// Order/Product Mock Types (for POD tests)
// =============================================================================

/**
 * Mock order for testing
 */
export interface MockOrder {
  id: string;
  userId: string;
  orderNumber?: string;
  status: string;
  subtotal?: number;
  shippingCost?: number;
  taxAmount?: number;
  totalAmount: number;
  currency?: string;
  customerEmail?: string;
  createdAt?: Date;
  paidAt?: Date | null;
}

/**
 * Mock order item for testing
 */
export interface MockOrderItem {
  id: string;
  orderId: string;
  productId: string;
  variantId?: string | null;
  productName: string;
  variantName?: string | null;
  imageUrl: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

/**
 * Mock product for testing
 */
export interface MockProduct {
  id: string;
  name: string;
  description?: string | null;
  categoryId: string;
  providerSku: string;
  basePrice: number;
  retailPrice: number;
  currency?: string;
  isActive?: boolean;
}

// =============================================================================
// Allocator Mock Types
// =============================================================================

/**
 * Mock campaign for testing
 */
export interface MockCampaign {
  id: string;
  name: string;
  status: string;
  dailyBudget?: number;
  totalSpend?: number;
  impressions?: number;
  clicks?: number;
  conversions?: number;
}

/**
 * Mock autopilot config for testing
 */
export interface MockAutopilotConfig {
  id: string;
  workspaceId: string;
  isEnabled: boolean;
  targetCpa?: number;
  maxDailyBudget?: number;
  minDailyBudget?: number;
}

/**
 * Mock audit log for testing
 */
export interface MockAuditLog {
  id: string;
  workspaceId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Prisma.JsonValue;
  createdAt?: Date;
}
