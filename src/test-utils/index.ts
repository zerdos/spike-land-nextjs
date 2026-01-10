/**
 * Test Utilities
 *
 * Common mock functions and utilities for testing.
 */

import type { UserRole } from "@prisma/client";
import type { Session } from "next-auth";

export interface MockSession extends Session {
  user: {
    id: string;
    email: string;
    name: string;
    image?: string | null;
    role: UserRole;
  };
  expires: string;
}

/**
 * Options for createMockSession - supports both top-level id/role shorthand and nested user object
 */
interface CreateMockSessionOptions {
  id?: string;
  role?: UserRole;
  user?: Partial<MockSession["user"]>;
  expires?: string;
}

/**
 * Create a minimal session object for testing.
 */
export function createMinimalSession(
  userId: string,
  role: UserRole = "USER" as UserRole,
): MockSession {
  return {
    user: {
      id: userId,
      email: `${userId}@example.com`,
      name: "Test User",
      role,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Create a mock session object for testing.
 * Supports { id: "..." } shorthand for setting user.id, or full { user: { ... } } override.
 */
export function createMockSession(overrides?: CreateMockSessionOptions): MockSession {
  // Support { id: "...", role: "..." } shorthand for backward compatibility
  const userId = overrides?.id ?? overrides?.user?.id ?? "test-user-id";
  const userRole = overrides?.role ?? overrides?.user?.role ?? ("USER" as UserRole);

  return {
    user: {
      id: userId,
      email: overrides?.user?.email ?? "test@example.com",
      name: overrides?.user?.name ?? "Test User",
      role: userRole,
      image: overrides?.user?.image,
    },
    expires: overrides?.expires ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Create a mock user object for testing (session user, not DB user).
 */
export function createMockUser(overrides?: Partial<MockSession["user"]>): MockSession["user"] {
  return {
    id: overrides?.id ?? "test-user-id",
    email: overrides?.email ?? "test@example.com",
    name: overrides?.name ?? "Test User",
    role: overrides?.role ?? ("USER" as UserRole),
    image: overrides?.image,
  };
}

/**
 * Full Prisma User type for database mocking
 */
export interface MockDbUser {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  role: UserRole;
  emailVerified: Date | null;
  createdAt: Date;
  updatedAt: Date;
  stripeCustomerId: string | null;
  tokenBalance: number;
  totalSpend: number;
  lifetimeTokensPurchased: number;
  passwordHash: string | null;
  referralCode: string | null;
  referredById: string | null;
  referralCount: number;
}

/**
 * Create a mock database user object for Prisma mocking.
 * Use this when mocking prisma.user.findUnique, etc.
 */
export function createMockDbUser(overrides?: Partial<MockDbUser>): MockDbUser {
  const now = new Date();
  return {
    id: overrides?.id ?? "test-user-id",
    email: overrides?.email ?? "test@example.com",
    name: overrides?.name ?? "Test User",
    image: overrides?.image ?? null,
    role: overrides?.role ?? ("USER" as UserRole),
    emailVerified: overrides?.emailVerified ?? null,
    createdAt: overrides?.createdAt ?? now,
    updatedAt: overrides?.updatedAt ?? now,
    stripeCustomerId: overrides?.stripeCustomerId ?? null,
    tokenBalance: overrides?.tokenBalance ?? 0,
    totalSpend: overrides?.totalSpend ?? 0,
    lifetimeTokensPurchased: overrides?.lifetimeTokensPurchased ?? 0,
    passwordHash: overrides?.passwordHash ?? null,
    referralCode: overrides?.referralCode ?? null,
    referredById: overrides?.referredById ?? null,
    referralCount: overrides?.referralCount ?? 0,
  };
}
