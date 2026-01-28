/**
 * Tests for Social Account Token Refresh Utility
 *
 * Tests cover:
 * - Token expiration checking
 * - Token refresh flow
 * - Database updates on refresh
 * - Account status updates on failure
 * - Edge cases (missing refresh token, platform doesn't support refresh)
 */

import type { SocialAccount, SocialPlatform } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/crypto/token-encryption", () => ({
  safeDecryptToken: vi.fn((token: string) => `decrypted_${token}`),
  safeEncryptToken: vi.fn((token: string) => `encrypted_${token}`),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    socialAccount: {
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/social", () => ({
  createSocialClient: vi.fn(),
}));

const prisma = (await import("@/lib/prisma")).default;
const { createSocialClient } = await import("@/lib/social");

// Import after mocks are set up
const { getValidAccessToken, isTokenExpired } = await import("./token-refresh");

/**
 * Helper to create a mock SocialAccount
 */
function createMockAccount(
  overrides: Partial<SocialAccount> = {},
): SocialAccount {
  return {
    id: "account-123",
    platform: "YOUTUBE" as SocialPlatform,
    accountId: "yt_channel_123",
    accountName: "Test YouTube Channel",
    accessTokenEncrypted: "encrypted_access_token",
    refreshTokenEncrypted: "encrypted_refresh_token",
    tokenExpiresAt: new Date(Date.now() + 3600000), // 1 hour from now
    connectedAt: new Date(),
    status: "ACTIVE",
    metadata: null,
    userId: "user-123",
    workspaceId: "workspace-123",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Helper to create a mock social client
 */
function createMockClient(refreshResponse?: {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}) {
  return {
    platform: "YOUTUBE",
    refreshAccessToken: refreshResponse
      ? vi.fn().mockResolvedValue(refreshResponse)
      : vi.fn().mockRejectedValue(new Error("Refresh failed")),
  };
}

describe("Token Refresh Utility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("isTokenExpired", () => {
    it("should return false when tokenExpiresAt is null", () => {
      expect(isTokenExpired(null)).toBe(false);
    });

    it("should return false when token expires in more than 5 minutes", () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
      expect(isTokenExpired(futureDate)).toBe(false);
    });

    it("should return true when token expires in less than 5 minutes", () => {
      const soonDate = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes from now
      expect(isTokenExpired(soonDate)).toBe(true);
    });

    it("should return true when token has already expired", () => {
      const pastDate = new Date(Date.now() - 1000); // 1 second ago
      expect(isTokenExpired(pastDate)).toBe(true);
    });

    it("should return true when token expires exactly at the buffer boundary", () => {
      const bufferDate = new Date(Date.now() + 5 * 60 * 1000); // Exactly 5 minutes from now
      expect(isTokenExpired(bufferDate)).toBe(true);
    });

    it("should return false when token expires just after the buffer", () => {
      const afterBufferDate = new Date(Date.now() + 5 * 60 * 1000 + 1000); // 5 mins + 1 sec
      expect(isTokenExpired(afterBufferDate)).toBe(false);
    });
  });

  describe("getValidAccessToken", () => {
    describe("when token is not expired", () => {
      it("should return existing token without refreshing", async () => {
        const account = createMockAccount({
          tokenExpiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        });

        const result = await getValidAccessToken(account);

        expect(result.accessToken).toBe("decrypted_encrypted_access_token");
        expect(result.wasRefreshed).toBe(false);
        expect(createSocialClient).not.toHaveBeenCalled();
        expect(prisma.socialAccount.update).not.toHaveBeenCalled();
      });

      it("should return existing token when tokenExpiresAt is null", async () => {
        const account = createMockAccount({
          tokenExpiresAt: null,
        });

        const result = await getValidAccessToken(account);

        expect(result.accessToken).toBe("decrypted_encrypted_access_token");
        expect(result.wasRefreshed).toBe(false);
      });
    });

    describe("when token is expired", () => {
      it("should refresh and return new token when refresh succeeds", async () => {
        const account = createMockAccount({
          tokenExpiresAt: new Date(Date.now() - 1000), // Expired
        });

        const newExpiresAt = new Date(Date.now() + 3600000);
        vi.mocked(createSocialClient).mockResolvedValue(
          createMockClient({
            accessToken: "new_access_token",
            refreshToken: "new_refresh_token",
            expiresAt: newExpiresAt,
          }) as any,
        );
        vi.mocked(prisma.socialAccount.update).mockResolvedValue(account);

        const result = await getValidAccessToken(account);

        expect(result.accessToken).toBe("new_access_token");
        expect(result.wasRefreshed).toBe(true);
        expect(createSocialClient).toHaveBeenCalledWith("YOUTUBE");
        expect(prisma.socialAccount.update).toHaveBeenCalledWith({
          where: { id: "account-123" },
          data: expect.objectContaining({
            accessTokenEncrypted: "encrypted_new_access_token",
            refreshTokenEncrypted: "encrypted_new_refresh_token",
            tokenExpiresAt: newExpiresAt,
            status: "ACTIVE",
          }),
        });
      });

      it("should keep existing refresh token if new one is not returned", async () => {
        const account = createMockAccount({
          tokenExpiresAt: new Date(Date.now() - 1000),
          refreshTokenEncrypted: "existing_refresh_token",
        });

        vi.mocked(createSocialClient).mockResolvedValue(
          createMockClient({
            accessToken: "new_access_token",
            // No refreshToken returned
          }) as any,
        );
        vi.mocked(prisma.socialAccount.update).mockResolvedValue(account);

        const result = await getValidAccessToken(account);

        expect(result.wasRefreshed).toBe(true);
        expect(prisma.socialAccount.update).toHaveBeenCalledWith({
          where: { id: "account-123" },
          data: expect.objectContaining({
            refreshTokenEncrypted: "existing_refresh_token", // Kept existing
          }),
        });
      });

      it("should log info message when token is refreshed", async () => {
        const account = createMockAccount({
          tokenExpiresAt: new Date(Date.now() - 1000),
        });

        vi.mocked(createSocialClient).mockResolvedValue(
          createMockClient({
            accessToken: "new_access_token",
          }) as any,
        );
        vi.mocked(prisma.socialAccount.update).mockResolvedValue(account);

        await getValidAccessToken(account);

        expect(console.info).toHaveBeenCalledWith(
          expect.stringContaining("Refreshed token for YOUTUBE account"),
        );
      });
    });

    describe("when token refresh fails", () => {
      it("should throw error when no refresh token is available", async () => {
        const account = createMockAccount({
          tokenExpiresAt: new Date(Date.now() - 1000),
          refreshTokenEncrypted: null,
        });

        vi.mocked(prisma.socialAccount.update).mockResolvedValue(account);

        await expect(getValidAccessToken(account)).rejects.toThrow(
          "No refresh token available",
        );

        expect(prisma.socialAccount.update).toHaveBeenCalledWith({
          where: { id: "account-123" },
          data: expect.objectContaining({
            status: "EXPIRED",
          }),
        });
      });

      it("should throw error when refresh API call fails", async () => {
        const account = createMockAccount({
          tokenExpiresAt: new Date(Date.now() - 1000),
        });

        vi.mocked(createSocialClient).mockResolvedValue({
          platform: "YOUTUBE",
          refreshAccessToken: vi.fn().mockRejectedValue(new Error("API Error")),
        } as any);
        vi.mocked(prisma.socialAccount.update).mockResolvedValue(account);

        await expect(getValidAccessToken(account)).rejects.toThrow(
          "Failed to refresh token",
        );

        // Should mark account as expired
        expect(prisma.socialAccount.update).toHaveBeenCalledWith({
          where: { id: "account-123" },
          data: expect.objectContaining({
            status: "EXPIRED",
          }),
        });
      });

      it("should throw error when platform doesn't support refresh", async () => {
        const account = createMockAccount({
          tokenExpiresAt: new Date(Date.now() - 1000),
        });

        vi.mocked(createSocialClient).mockResolvedValue({
          platform: "YOUTUBE",
          // No refreshAccessToken method
        } as any);
        vi.mocked(prisma.socialAccount.update).mockResolvedValue(account);

        await expect(getValidAccessToken(account)).rejects.toThrow(
          "does not support token refresh",
        );
      });

      it("should log warning when marking account as expired", async () => {
        const account = createMockAccount({
          tokenExpiresAt: new Date(Date.now() - 1000),
          refreshTokenEncrypted: null,
        });

        vi.mocked(prisma.socialAccount.update).mockResolvedValue(account);

        await expect(getValidAccessToken(account)).rejects.toThrow();

        expect(console.warn).toHaveBeenCalledWith(
          expect.stringContaining("Marking account account-123 as EXPIRED"),
        );
      });

      it("should log error if marking account as expired fails", async () => {
        const account = createMockAccount({
          tokenExpiresAt: new Date(Date.now() - 1000),
          refreshTokenEncrypted: null,
        });

        vi.mocked(prisma.socialAccount.update).mockRejectedValue(
          new Error("Database error"),
        );

        await expect(getValidAccessToken(account)).rejects.toThrow();

        expect(console.error).toHaveBeenCalledWith(
          expect.stringContaining("Failed to mark account"),
          expect.any(Error),
        );
      });
    });

    describe("platform-specific behavior", () => {
      it("should work with TWITTER platform", async () => {
        const account = createMockAccount({
          platform: "TWITTER" as SocialPlatform,
          tokenExpiresAt: new Date(Date.now() - 1000),
        });

        vi.mocked(createSocialClient).mockResolvedValue(
          createMockClient({
            accessToken: "new_twitter_token",
          }) as any,
        );
        vi.mocked(prisma.socialAccount.update).mockResolvedValue(account);

        const result = await getValidAccessToken(account);

        expect(result.accessToken).toBe("new_twitter_token");
        expect(createSocialClient).toHaveBeenCalledWith("TWITTER");
      });

      it("should work with LINKEDIN platform", async () => {
        const account = createMockAccount({
          platform: "LINKEDIN" as SocialPlatform,
          tokenExpiresAt: new Date(Date.now() - 1000),
        });

        vi.mocked(createSocialClient).mockResolvedValue(
          createMockClient({
            accessToken: "new_linkedin_token",
          }) as any,
        );
        vi.mocked(prisma.socialAccount.update).mockResolvedValue(account);

        const result = await getValidAccessToken(account);

        expect(result.accessToken).toBe("new_linkedin_token");
        expect(createSocialClient).toHaveBeenCalledWith("LINKEDIN");
      });
    });
  });
});
