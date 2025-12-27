/**
 * Session Mock Factory
 *
 * Provides type-safe factory functions for creating NextAuth session mocks.
 * Eliminates the need for `as any` type assertions in test files.
 */

import type { MockSession, MockSessionUser } from "../types";

/**
 * Default mock user data.
 */
const defaultUser: MockSessionUser = {
  id: "user_test12345678901234567890",
  email: "test@example.com",
  name: "Test User",
  image: null,
  role: "USER",
};

/**
 * Creates a mock session with the given user overrides.
 *
 * @param userOverrides - Partial user properties to override defaults
 * @returns A complete MockSession object
 *
 * @example
 * // Basic session
 * const session = createMockSession();
 *
 * // Admin session
 * const adminSession = createMockSession({ role: "ADMIN" });
 *
 * // Custom user
 * const customSession = createMockSession({
 *   id: "user_custom",
 *   email: "admin@example.com",
 *   role: "SUPER_ADMIN"
 * });
 */
export function createMockSession(
  userOverrides: Partial<MockSessionUser> = {},
): MockSession {
  return {
    user: {
      ...defaultUser,
      ...userOverrides,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Creates a mock admin session.
 *
 * @param overrides - Optional user property overrides
 * @returns A MockSession with ADMIN role
 *
 * @example
 * const adminSession = createMockAdminSession();
 * const customAdmin = createMockAdminSession({ email: "admin@test.com" });
 */
export function createMockAdminSession(
  overrides: Partial<MockSessionUser> = {},
): MockSession {
  return createMockSession({
    id: "user_admin123456789012345678",
    email: "admin@example.com",
    name: "Admin User",
    role: "ADMIN",
    ...overrides,
  });
}

/**
 * Creates a mock super admin session.
 *
 * @param overrides - Optional user property overrides
 * @returns A MockSession with SUPER_ADMIN role
 */
export function createMockSuperAdminSession(
  overrides: Partial<MockSessionUser> = {},
): MockSession {
  return createMockSession({
    id: "user_superadmin1234567890123",
    email: "superadmin@example.com",
    name: "Super Admin",
    role: "SUPER_ADMIN",
    ...overrides,
  });
}

/**
 * Creates a mock session with just the user ID.
 * Useful for minimal session mocks in auth checks.
 *
 * @param userId - The user ID to use
 * @returns A MockSession with the specified user ID
 */
export function createMinimalSession(userId: string): MockSession {
  return {
    user: { id: userId },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Pre-configured mock sessions for common test scenarios.
 */
export const mockSessions = {
  /** Basic authenticated user */
  user: createMockSession(),
  /** Admin user */
  admin: createMockAdminSession(),
  /** Super admin user */
  superAdmin: createMockSuperAdminSession(),
} as const;
