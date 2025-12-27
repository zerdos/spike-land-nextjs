/**
 * Test Utilities Index
 *
 * Central export point for all test utilities, mock factories, and helper types.
 *
 * @example
 * import { createMockSession, createMockUser, DeepPartial } from "@/test-utils";
 */

// Type utilities
export type {
  DeepPartial,
  MockApiResponse,
  MockPrismaModel,
  MockSession,
  MockSessionUser,
  OptionalKeys,
  RequireKeys,
} from "./types";

export { isObject } from "./types";

// Mock factories
export * from "./mock-factories";

// Marketing mocks
export {
  createFetchMock,
  mockCampaignsData,
  mockFunnelData,
  mockMarketingData,
  mockOverviewData,
} from "./marketing-mocks";
