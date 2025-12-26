import prisma from "@/lib/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ANONYMOUS_USER_ID_CONST,
  getOrCreateAnonymousUser,
  isAnonymousUserId,
} from "./anonymous-user";

vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/lib/errors/structured-logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

const EXPECTED_ANONYMOUS_USER_ID = "anonymous-system-user";
const EXPECTED_ANONYMOUS_EMAIL = "anonymous@system.spike.land";
const EXPECTED_ANONYMOUS_NAME = "Anonymous User";

const mockUser = {
  id: EXPECTED_ANONYMOUS_USER_ID,
  email: EXPECTED_ANONYMOUS_EMAIL,
  name: EXPECTED_ANONYMOUS_NAME,
  emailVerified: null,
  image: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  stripeCustomerId: null,
  role: "USER" as const,
  referralCode: null,
  referredById: null,
  referralCount: 0,
  passwordHash: null,
};

describe("getOrCreateAnonymousUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates anonymous user when not exists and returns user ID", async () => {
    vi.mocked(prisma.user.upsert).mockResolvedValue(mockUser);

    const result = await getOrCreateAnonymousUser();

    expect(result).toBe(EXPECTED_ANONYMOUS_USER_ID);
    expect(prisma.user.upsert).toHaveBeenCalledWith({
      where: { id: EXPECTED_ANONYMOUS_USER_ID },
      update: {},
      create: {
        id: EXPECTED_ANONYMOUS_USER_ID,
        email: EXPECTED_ANONYMOUS_EMAIL,
        name: EXPECTED_ANONYMOUS_NAME,
      },
    });
  });

  it("returns existing anonymous user ID when user exists", async () => {
    vi.mocked(prisma.user.upsert).mockResolvedValue(mockUser);

    const result = await getOrCreateAnonymousUser();

    expect(result).toBe(EXPECTED_ANONYMOUS_USER_ID);
    expect(prisma.user.upsert).toHaveBeenCalledTimes(1);
  });

  it("throws error when database operation fails", async () => {
    vi.mocked(prisma.user.upsert).mockRejectedValue(
      new Error("Database connection failed"),
    );

    await expect(getOrCreateAnonymousUser()).rejects.toThrow(
      "Anonymous user initialization failed",
    );
  });

  it("logs error when database operation fails", async () => {
    const { logger } = await import("@/lib/errors/structured-logger");
    vi.mocked(prisma.user.upsert).mockRejectedValue(
      new Error("Database connection failed"),
    );

    await expect(getOrCreateAnonymousUser()).rejects.toThrow();

    expect(logger.error).toHaveBeenCalledWith(
      "Failed to get or create anonymous user",
      expect.any(Error),
    );
  });
});

describe("isAnonymousUserId", () => {
  it("returns true for anonymous user ID", () => {
    expect(isAnonymousUserId(EXPECTED_ANONYMOUS_USER_ID)).toBe(true);
  });

  it("returns false for regular user ID", () => {
    expect(isAnonymousUserId("user-123")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isAnonymousUserId("")).toBe(false);
  });

  it("returns false for similar but different ID", () => {
    expect(isAnonymousUserId("anonymous-system-user-2")).toBe(false);
    expect(isAnonymousUserId("anonymous")).toBe(false);
  });
});

describe("ANONYMOUS_USER_ID_CONST", () => {
  it("exports the correct anonymous user ID constant", () => {
    expect(ANONYMOUS_USER_ID_CONST).toBe(EXPECTED_ANONYMOUS_USER_ID);
  });

  it("matches the ID used by getOrCreateAnonymousUser", async () => {
    vi.mocked(prisma.user.upsert).mockResolvedValue(mockUser);

    const result = await getOrCreateAnonymousUser();

    expect(result).toBe(ANONYMOUS_USER_ID_CONST);
  });
});
