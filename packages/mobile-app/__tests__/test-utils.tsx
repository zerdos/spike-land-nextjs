/**
 * Test Utilities for React Native Mobile App
 * Provides common test helpers, providers wrapper, and mock state creators
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, RenderOptions, RenderResult } from "@testing-library/react-native";
import React, { ReactElement, ReactNode } from "react";

import type { SubscriptionTier, User } from "@spike-npm-land/shared";

// ============================================================================
// Types
// ============================================================================

export interface MockUser extends User {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: Date | null;
  image: string | null;
  createdAt: Date;
  role: "USER" | "ADMIN" | "SUPER_ADMIN";
  referralCode: string | null;
  referralCount: number;
}

export interface MockAuthState {
  user: MockUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface MockTokenState {
  balance: number;
  tier: SubscriptionTier;
  lastRegeneration: Date | null;
  maxBalance: number;
  timeUntilNextRegen: number;
  isLoading: boolean;
  error: string | null;
}

export interface MockCartItem {
  id: string;
  cartId: string;
  productId: string;
  variantId: string | null;
  imageId: string | null;
  uploadedImageUrl: string | null;
  quantity: number;
  customText: string | null;
  product: {
    id: string;
    name: string;
    retailPrice: number;
    currency: string;
    mockupTemplate: string | null;
  };
  variant: {
    id: string;
    name: string;
    priceDelta: number;
  } | null;
  imageUrl: string | null;
}

export interface MockCart {
  id: string;
  items: MockCartItem[];
  itemCount: number;
  subtotal: number;
}

// ============================================================================
// Mock State Creators
// ============================================================================

/**
 * Create a mock user for testing
 */
export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: "test-user-id",
    name: "Test User",
    email: "test@example.com",
    emailVerified: new Date("2024-01-01T00:00:00.000Z"),
    image: "https://example.com/avatar.jpg",
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    role: "USER",
    referralCode: "TEST123",
    referralCount: 0,
    ...overrides,
  };
}

/**
 * Create a mock authenticated state
 */
export function createMockAuthState(overrides: Partial<MockAuthState> = {}): MockAuthState {
  return {
    user: createMockUser(),
    isAuthenticated: true,
    isLoading: false,
    error: null,
    ...overrides,
  };
}

/**
 * Create a mock unauthenticated state
 */
export function createMockUnauthenticatedState(): MockAuthState {
  return {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  };
}

/**
 * Create a mock loading auth state
 */
export function createMockLoadingAuthState(): MockAuthState {
  return {
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  };
}

/**
 * Create a mock error auth state
 */
export function createMockErrorAuthState(error: string): MockAuthState {
  return {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error,
  };
}

/**
 * Create a mock token state
 */
export function createMockTokenState(overrides: Partial<MockTokenState> = {}): MockTokenState {
  return {
    balance: 10,
    tier: "FREE",
    lastRegeneration: new Date(),
    maxBalance: 10,
    timeUntilNextRegen: 3600000, // 1 hour
    isLoading: false,
    error: null,
    ...overrides,
  };
}

/**
 * Create a mock premium token state
 */
export function createMockPremiumTokenState(): MockTokenState {
  return createMockTokenState({
    balance: 100,
    tier: "PREMIUM",
    maxBalance: 200,
  });
}

/**
 * Create a mock empty token state
 */
export function createMockEmptyTokenState(): MockTokenState {
  return createMockTokenState({
    balance: 0,
    timeUntilNextRegen: 1800000, // 30 minutes
  });
}

/**
 * Create a mock cart item
 */
export function createMockCartItem(overrides: Partial<MockCartItem> = {}): MockCartItem {
  return {
    id: "cart-item-1",
    cartId: "cart-1",
    productId: "product-1",
    variantId: "variant-1",
    imageId: "image-1",
    uploadedImageUrl: null,
    quantity: 1,
    customText: null,
    product: {
      id: "product-1",
      name: "Test Product",
      retailPrice: 19.99,
      currency: "GBP",
      mockupTemplate: null,
    },
    variant: {
      id: "variant-1",
      name: "Size M",
      priceDelta: 0,
    },
    imageUrl: "https://example.com/product.jpg",
    ...overrides,
  };
}

/**
 * Create a mock cart
 */
export function createMockCart(items: MockCartItem[] = []): MockCart {
  const cartItems = items.length > 0 ? items : [createMockCartItem()];
  return {
    id: "cart-1",
    items: cartItems,
    itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: cartItems.reduce(
      (sum, item) =>
        sum + (item.product.retailPrice + (item.variant?.priceDelta ?? 0)) * item.quantity,
      0,
    ),
  };
}

/**
 * Create an empty mock cart
 */
export function createMockEmptyCart(): MockCart {
  return {
    id: "cart-1",
    items: [],
    itemCount: 0,
    subtotal: 0,
  };
}

// ============================================================================
// Test Query Client
// ============================================================================

/**
 * Create a fresh QueryClient for testing
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

// ============================================================================
// Provider Wrapper
// ============================================================================

interface AllProvidersProps {
  children: ReactNode;
  queryClient?: QueryClient;
}

/**
 * Wrapper component with all providers needed for testing
 */
function AllProviders({ children, queryClient }: AllProvidersProps): ReactElement {
  const testQueryClient = queryClient ?? createTestQueryClient();

  return <QueryClientProvider client={testQueryClient}>{children}</QueryClientProvider>;
}

// ============================================================================
// Custom Render Function
// ============================================================================

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  queryClient?: QueryClient;
}

/**
 * Custom render function that wraps components with all providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {},
): RenderResult {
  const { queryClient, ...renderOptions } = options;

  return render(ui, {
    wrapper: ({ children }) => <AllProviders queryClient={queryClient}>{children}</AllProviders>,
    ...renderOptions,
  });
}

// ============================================================================
// Wait Helpers
// ============================================================================

/**
 * Wait for a specific condition to be true
 */
export async function waitForCondition(
  condition: () => boolean,
  timeout = 5000,
  interval = 100,
): Promise<void> {
  const startTime = Date.now();
  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error("Timeout waiting for condition");
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

/**
 * Flush all pending promises
 */
export async function flushPromises(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
}

// ============================================================================
// Mock API Response Helpers
// ============================================================================

/**
 * Create a successful API response
 */
export function createSuccessResponse<T>(data: T): { data: T; error: null; } {
  return { data, error: null };
}

/**
 * Create an error API response
 */
export function createErrorResponse(error: string): { data: null; error: string; } {
  return { data: null, error };
}

// ============================================================================
// Re-exports
// ============================================================================

export * from "@testing-library/react-native";
export { render };
