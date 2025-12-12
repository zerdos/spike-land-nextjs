import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Use vi.hoisted to define mocks that will be available when vi.mock is hoisted
const { mockApiKey } = vi.hoisted(() => ({
  mockApiKey: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    apiKey: mockApiKey,
  },
}));

import {
  countActiveApiKeys,
  createApiKey,
  getApiKey,
  listApiKeys,
  MAX_API_KEYS_PER_USER,
  revokeApiKey,
  validateApiKey,
} from "./api-key-manager";

describe("api-key-manager", () => {
  const testUserId = "test-user-123";
  const testApiKeyId = "api-key-456";
  const mockDate = new Date("2024-01-15T12:00:00Z");

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("createApiKey", () => {
    it("should create a new API key with correct format", async () => {
      mockApiKey.create.mockResolvedValue({
        id: testApiKeyId,
        userId: testUserId,
        name: "Test Key",
        keyHash: "somehash",
        keyPrefix: "sk_test...****",
        createdAt: mockDate,
        updatedAt: mockDate,
      });

      const result = await createApiKey(testUserId, "Test Key");

      expect(result.id).toBe(testApiKeyId);
      expect(result.name).toBe("Test Key");
      expect(result.key).toContain("sk_test_"); // Should have the test prefix
      expect(result.keyPrefix).toContain("...****"); // Should be masked
      expect(result.createdAt).toEqual(mockDate);

      expect(mockApiKey.create).toHaveBeenCalledWith({
        data: {
          userId: testUserId,
          name: "Test Key",
          keyHash: expect.any(String), // SHA256 hash
          keyPrefix: expect.stringContaining("...****"),
        },
      });
    });

    it("should generate keys with proper length", async () => {
      mockApiKey.create.mockResolvedValue({
        id: testApiKeyId,
        userId: testUserId,
        name: "Test Key",
        createdAt: mockDate,
        updatedAt: mockDate,
      });

      const result = await createApiKey(testUserId, "Test Key");

      // Key should be prefix (8 chars) + 32 bytes base64url encoded (~43 chars)
      expect(result.key.length).toBeGreaterThan(40);
      expect(result.key.startsWith("sk_test_")).toBe(true);
    });
  });

  describe("validateApiKey", () => {
    it("should reject keys with invalid format", async () => {
      const result = await validateApiKey("invalid_key");

      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Invalid API key format");
    });

    it("should reject keys without sk_live_ or sk_test_ prefix", async () => {
      const result = await validateApiKey("sk_prod_something");

      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Invalid API key format");
    });

    it("should reject development keys in production environment", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      try {
        const result = await validateApiKey("sk_test_validkey123456789012345678");

        expect(result.isValid).toBe(false);
        expect(result.error).toBe("Development keys not allowed in production");
        // Should not even attempt to query the database
        expect(mockApiKey.findUnique).not.toHaveBeenCalled();
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it("should allow production keys in production environment", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";
      mockApiKey.findUnique.mockResolvedValue(null);

      try {
        const result = await validateApiKey("sk_live_validkey123456789012345678");

        // Should continue to database lookup (key not found is fine for this test)
        expect(mockApiKey.findUnique).toHaveBeenCalled();
        expect(result.error).toBe("Invalid API key");
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it("should call database with hashed key", async () => {
      // Just verify the database is queried with a hash
      mockApiKey.findUnique.mockResolvedValue(null);

      await validateApiKey("sk_test_validkey123456789012345678");

      // findUnique should be called with a keyHash parameter
      expect(mockApiKey.findUnique).toHaveBeenCalledWith({
        where: { keyHash: expect.any(String) },
        select: expect.any(Object),
      });
    });

    it("should reject revoked keys", async () => {
      // SHA256 produces 64 hex characters
      const validHexHash = "a".repeat(64);
      const mockKeyRecord = {
        id: testApiKeyId,
        userId: testUserId,
        isActive: false,
        keyHash: validHexHash,
        lastUsedAt: null,
      };

      mockApiKey.findUnique.mockResolvedValue(mockKeyRecord);

      const result = await validateApiKey("sk_test_validkey123456789012345678");

      expect(result.isValid).toBe(false);
      expect(result.error).toBe("API key has been revoked");
    });

    it("should reject non-existent keys", async () => {
      mockApiKey.findUnique.mockResolvedValue(null);

      const result = await validateApiKey("sk_test_nonexistent");

      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Invalid API key");
    });
  });

  describe("listApiKeys", () => {
    it("should return all API keys for a user", async () => {
      const mockKeys = [
        {
          id: "key1",
          name: "Key 1",
          keyPrefix: "sk_test...****",
          lastUsedAt: mockDate,
          isActive: true,
          createdAt: mockDate,
        },
        {
          id: "key2",
          name: "Key 2",
          keyPrefix: "sk_test...****",
          lastUsedAt: null,
          isActive: false,
          createdAt: mockDate,
        },
      ];

      mockApiKey.findMany.mockResolvedValue(mockKeys);

      const result = await listApiKeys(testUserId);

      expect(result).toEqual(mockKeys);
      expect(mockApiKey.findMany).toHaveBeenCalledWith({
        where: { userId: testUserId },
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          lastUsedAt: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });
    });

    it("should return empty array for user with no keys", async () => {
      mockApiKey.findMany.mockResolvedValue([]);

      const result = await listApiKeys(testUserId);

      expect(result).toEqual([]);
    });
  });

  describe("revokeApiKey", () => {
    it("should revoke an active API key", async () => {
      const mockKey = {
        id: testApiKeyId,
        userId: testUserId,
        isActive: true,
      };

      mockApiKey.findFirst.mockResolvedValue(mockKey);
      mockApiKey.update.mockResolvedValue({ ...mockKey, isActive: false });

      const result = await revokeApiKey(testUserId, testApiKeyId);

      expect(result.success).toBe(true);
      expect(mockApiKey.update).toHaveBeenCalledWith({
        where: { id: testApiKeyId },
        data: { isActive: false },
      });
    });

    it("should return error for non-existent key", async () => {
      mockApiKey.findFirst.mockResolvedValue(null);

      const result = await revokeApiKey(testUserId, "nonexistent");

      expect(result.success).toBe(false);
      expect(result.error).toBe("API key not found");
    });

    it("should return error for already revoked key", async () => {
      const mockKey = {
        id: testApiKeyId,
        userId: testUserId,
        isActive: false,
      };

      mockApiKey.findFirst.mockResolvedValue(mockKey);

      const result = await revokeApiKey(testUserId, testApiKeyId);

      expect(result.success).toBe(false);
      expect(result.error).toBe("API key is already revoked");
    });

    it("should not allow revoking another user's key", async () => {
      mockApiKey.findFirst.mockResolvedValue(null); // Returns null because userId doesn't match

      const result = await revokeApiKey("other-user", testApiKeyId);

      expect(result.success).toBe(false);
      expect(result.error).toBe("API key not found");
    });
  });

  describe("getApiKey", () => {
    it("should return API key for valid owner", async () => {
      const mockKey = {
        id: testApiKeyId,
        name: "Test Key",
        keyPrefix: "sk_test...****",
        lastUsedAt: mockDate,
        isActive: true,
        createdAt: mockDate,
      };

      mockApiKey.findFirst.mockResolvedValue(mockKey);

      const result = await getApiKey(testUserId, testApiKeyId);

      expect(result).toEqual(mockKey);
      expect(mockApiKey.findFirst).toHaveBeenCalledWith({
        where: {
          id: testApiKeyId,
          userId: testUserId,
        },
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          lastUsedAt: true,
          isActive: true,
          createdAt: true,
        },
      });
    });

    it("should return null for non-existent key", async () => {
      mockApiKey.findFirst.mockResolvedValue(null);

      const result = await getApiKey(testUserId, "nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("countActiveApiKeys", () => {
    it("should return count of active API keys", async () => {
      mockApiKey.count.mockResolvedValue(5);

      const result = await countActiveApiKeys(testUserId);

      expect(result).toBe(5);
      expect(mockApiKey.count).toHaveBeenCalledWith({
        where: {
          userId: testUserId,
          isActive: true,
        },
      });
    });

    it("should return 0 for user with no active keys", async () => {
      mockApiKey.count.mockResolvedValue(0);

      const result = await countActiveApiKeys(testUserId);

      expect(result).toBe(0);
    });
  });

  describe("MAX_API_KEYS_PER_USER", () => {
    it("should be exported as constant", () => {
      expect(MAX_API_KEYS_PER_USER).toBe(10);
    });
  });

  describe("key masking", () => {
    it("should mask keys properly with only 7 visible characters", async () => {
      mockApiKey.create.mockResolvedValue({
        id: testApiKeyId,
        userId: testUserId,
        name: "Test Key",
        keyHash: "somehash",
        keyPrefix: "sk_test...****",
        createdAt: mockDate,
        updatedAt: mockDate,
      });

      const result = await createApiKey(testUserId, "Test Key");

      // keyPrefix should show 7 chars + "...****"
      expect(result.keyPrefix.length).toBe(14); // 7 + 3 + 4 = 14
      expect(result.keyPrefix).toMatch(/^.{7}\.{3}\*{4}$/);
    });
  });
});
