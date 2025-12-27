/**
 * Mock Factories Index
 *
 * Re-exports all mock factory functions for convenient importing in tests.
 */

// Session mock factories
export {
  createMinimalSession,
  createMockAdminSession,
  createMockSession,
  createMockSuperAdminSession,
  mockSessions,
} from "./session";

// Prisma model mock factories
export {
  createMockAlbum,
  createMockEnhancedImage,
  createMockEnhancementJob,
  createMockMerchCart,
  createMockMerchCartItem,
  createMockMerchProduct,
  createMockReferral,
  createMockSubscription,
  createMockTokenBalance,
  createMockTokenTransaction,
  createMockUser,
  createMockVoucher,
} from "./prisma";
