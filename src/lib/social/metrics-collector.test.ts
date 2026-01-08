/**
 * Tests for Pulse Metrics Collector
 *
 * Resolves #646
 */

import { safeDecryptToken } from "@/lib/crypto/token-encryption";
import prisma from "@/lib/prisma";
import type { SocialAccount, SocialPlatform } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InstagramClient } from "./clients/instagram";
import { LinkedInClient } from "./clients/linkedin";
import { TwitterClient } from "./clients/twitter";
import { collectPulseMetrics } from "./metrics-collector";

// Mock dependencies
vi.mock("@/lib/crypto/token-encryption");
vi.mock("@/lib/prisma", () => ({
  default: {
    socialAccount: {
      findMany: vi.fn(),
    },
    socialMetrics: {
      upsert: vi.fn(),
    },
  },
}));

// Mock social clients with proper class constructors
vi.mock("./clients/linkedin", () => ({
  LinkedInClient: vi.fn(),
}));
vi.mock("./clients/instagram", () => ({
  InstagramClient: vi.fn(),
}));
vi.mock("./clients/facebook", () => ({
  FacebookClient: vi.fn(),
}));
vi.mock("./clients/twitter", () => ({
  TwitterClient: vi.fn(),
}));
vi.mock("./clients/youtube", () => ({
  YouTubeClient: vi.fn(),
}));

// Helper to create mock account
function createMockAccount(
  platform: SocialPlatform,
  overrides: Partial<SocialAccount> = {},
): SocialAccount {
  return {
    id: `account-${platform.toLowerCase()}`,
    platform,
    accountId: `platform-id-${platform.toLowerCase()}`,
    accountName: `Test ${platform} Account`,
    accessTokenEncrypted: "encrypted-token",
    refreshTokenEncrypted: null,
    tokenExpiresAt: null,
    connectedAt: new Date(),
    status: "ACTIVE",
    metadata: platform === "LINKEDIN" ? { organizationId: "org-123" } : null,
    userId: "user-1",
    workspaceId: "workspace-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("collectPulseMetrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock for token decryption
    vi.mocked(safeDecryptToken).mockReturnValue("decrypted-token");

    // Default mock for successful upsert
    vi.mocked(prisma.socialMetrics.upsert).mockResolvedValue({
      id: "metrics-1",
      accountId: "account-1",
      date: new Date(),
      followers: 1000,
      following: 500,
      postsCount: 100,
      engagementRate: null,
      impressions: 0,
      reach: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      rawData: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return empty result when no accounts found", async () => {
    vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([]);

    const result = await collectPulseMetrics();

    expect(result.totalAccounts).toBe(0);
    expect(result.successCount).toBe(0);
    expect(result.failureCount).toBe(0);
    expect(result.skippedCount).toBe(0);
    expect(result.results).toHaveLength(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("should successfully collect metrics from LinkedIn account", async () => {
    const mockAccount = createMockAccount("LINKEDIN");
    vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([mockAccount]);

    const mockMetrics = {
      followers: 5000,
      following: 200,
      postsCount: 50,
      engagementRate: 5.5,
      impressions: 10000,
      reach: 8000,
    };

    const mockGetMetrics = vi.fn().mockResolvedValue(mockMetrics);
    vi.mocked(LinkedInClient).mockImplementation(
      function() {
        return {
          platform: "LINKEDIN" as SocialPlatform,
          getMetrics: mockGetMetrics,
          getAuthUrl: vi.fn(),
          exchangeCodeForTokens: vi.fn(),
          getAccountInfo: vi.fn(),
          createPost: vi.fn(),
          getPosts: vi.fn(),
        };
      } as unknown as typeof LinkedInClient,
    );

    const result = await collectPulseMetrics();

    expect(result.totalAccounts).toBe(1);
    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(0);
    expect(result.results[0]!.success).toBe(true);
    expect(result.results[0]!.platform).toBe("LINKEDIN");
    expect(result.results[0]!.metrics).toEqual(mockMetrics);

    expect(LinkedInClient).toHaveBeenCalledWith({
      accessToken: "decrypted-token",
      organizationUrn: "urn:li:organization:org-123",
    });
    expect(prisma.socialMetrics.upsert).toHaveBeenCalled();
  });

  it("should successfully collect metrics from Instagram account", async () => {
    const mockAccount = createMockAccount("INSTAGRAM");
    vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([mockAccount]);

    const mockMetrics = {
      followers: 10000,
      following: 500,
      postsCount: 200,
      engagementRate: 8.2,
    };

    vi.mocked(InstagramClient).mockImplementation(
      function() {
        return {
          platform: "INSTAGRAM" as SocialPlatform,
          getMetrics: vi.fn().mockResolvedValue(mockMetrics),
          getAuthUrl: vi.fn(),
          exchangeCodeForTokens: vi.fn(),
          getAccountInfo: vi.fn(),
          createPost: vi.fn(),
          getPosts: vi.fn(),
        };
      } as unknown as typeof InstagramClient,
    );

    const result = await collectPulseMetrics();

    expect(result.successCount).toBe(1);
    expect(result.results[0]!.success).toBe(true);
    expect(result.results[0]!.platform).toBe("INSTAGRAM");
    expect(InstagramClient).toHaveBeenCalledWith({
      accessToken: "decrypted-token",
    });
  });

  it("should handle multiple accounts from different platforms", async () => {
    const accounts = [
      createMockAccount("LINKEDIN"),
      createMockAccount("INSTAGRAM"),
      createMockAccount("TWITTER"),
    ];
    vi.mocked(prisma.socialAccount.findMany).mockResolvedValue(accounts);

    // Mock each client
    vi.mocked(LinkedInClient).mockImplementation(
      function() {
        return {
          platform: "LINKEDIN" as SocialPlatform,
          getMetrics: vi.fn().mockResolvedValue({
            followers: 1000,
            following: 100,
            postsCount: 10,
          }),
          getAuthUrl: vi.fn(),
          exchangeCodeForTokens: vi.fn(),
          getAccountInfo: vi.fn(),
          createPost: vi.fn(),
          getPosts: vi.fn(),
        };
      } as unknown as typeof LinkedInClient,
    );

    vi.mocked(InstagramClient).mockImplementation(
      function() {
        return {
          platform: "INSTAGRAM" as SocialPlatform,
          getMetrics: vi.fn().mockResolvedValue({
            followers: 2000,
            following: 200,
            postsCount: 20,
          }),
          getAuthUrl: vi.fn(),
          exchangeCodeForTokens: vi.fn(),
          getAccountInfo: vi.fn(),
          createPost: vi.fn(),
          getPosts: vi.fn(),
        };
      } as unknown as typeof InstagramClient,
    );

    vi.mocked(TwitterClient).mockImplementation(
      function() {
        return {
          platform: "TWITTER" as SocialPlatform,
          getMetrics: vi.fn().mockResolvedValue({
            followers: 3000,
            following: 300,
            postsCount: 30,
          }),
          getAuthUrl: vi.fn(),
          exchangeCodeForTokens: vi.fn(),
          getAccountInfo: vi.fn(),
          createPost: vi.fn(),
          getPosts: vi.fn(),
        };
      } as unknown as typeof TwitterClient,
    );

    const result = await collectPulseMetrics();

    expect(result.totalAccounts).toBe(3);
    expect(result.successCount).toBe(3);
    expect(result.failureCount).toBe(0);
    expect(prisma.socialMetrics.upsert).toHaveBeenCalledTimes(3);
  });

  it("should handle failed metrics fetch gracefully", async () => {
    const mockAccount = createMockAccount("LINKEDIN");
    vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([mockAccount]);

    vi.mocked(LinkedInClient).mockImplementation(
      function() {
        return {
          platform: "LINKEDIN" as SocialPlatform,
          getMetrics: vi.fn().mockRejectedValue(new Error("API rate limit exceeded")),
          getAuthUrl: vi.fn(),
          exchangeCodeForTokens: vi.fn(),
          getAccountInfo: vi.fn(),
          createPost: vi.fn(),
          getPosts: vi.fn(),
        };
      } as unknown as typeof LinkedInClient,
    );

    const result = await collectPulseMetrics();

    expect(result.totalAccounts).toBe(1);
    expect(result.successCount).toBe(0);
    expect(result.failureCount).toBe(1);
    expect(result.results[0]!.success).toBe(false);
    expect(result.results[0]!.error).toContain("API rate limit exceeded");
  });

  it("should handle failed token decryption", async () => {
    const mockAccount = createMockAccount("LINKEDIN");
    vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([mockAccount]);
    vi.mocked(safeDecryptToken).mockReturnValue("");

    const result = await collectPulseMetrics();

    expect(result.failureCount).toBe(1);
    expect(result.results[0]!.success).toBe(false);
    expect(result.results[0]!.error).toContain("decrypt access token");
  });

  it("should handle database upsert errors", async () => {
    const mockAccount = createMockAccount("LINKEDIN");
    vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([mockAccount]);

    vi.mocked(LinkedInClient).mockImplementation(
      function() {
        return {
          platform: "LINKEDIN" as SocialPlatform,
          getMetrics: vi.fn().mockResolvedValue({
            followers: 1000,
            following: 100,
            postsCount: 10,
          }),
          getAuthUrl: vi.fn(),
          exchangeCodeForTokens: vi.fn(),
          getAccountInfo: vi.fn(),
          createPost: vi.fn(),
          getPosts: vi.fn(),
        };
      } as unknown as typeof LinkedInClient,
    );

    vi.mocked(prisma.socialMetrics.upsert).mockRejectedValue(
      new Error("Unique constraint violation"),
    );

    const result = await collectPulseMetrics();

    expect(result.failureCount).toBe(1);
    expect(result.results[0]!.success).toBe(false);
    expect(result.results[0]!.error).toContain("Database error");
  });

  it("should skip unsupported platforms (TikTok)", async () => {
    const mockAccount = createMockAccount("TIKTOK");
    vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([mockAccount]);

    // Pass TikTok explicitly in platforms filter to test the skipping behavior
    const result = await collectPulseMetrics({ platforms: ["TIKTOK"] });

    // TikTok should be skipped as client returns null
    expect(result.totalAccounts).toBe(1);
    expect(result.skippedCount).toBe(1);
    expect(result.successCount).toBe(0);
    expect(result.failureCount).toBe(0);
    expect(result.results).toHaveLength(0);
  });

  it("should respect batchSize option", async () => {
    vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([]);

    await collectPulseMetrics({ batchSize: 50 });

    expect(prisma.socialAccount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 50,
      }),
    );
  });

  it("should filter by workspace IDs when specified", async () => {
    vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([]);

    await collectPulseMetrics({ workspaceIds: ["ws-1", "ws-2"] });

    expect(prisma.socialAccount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          workspaceId: { in: ["ws-1", "ws-2"] },
        }),
      }),
    );
  });

  it("should filter by platforms when specified", async () => {
    vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([]);

    await collectPulseMetrics({ platforms: ["LINKEDIN", "INSTAGRAM"] });

    expect(prisma.socialAccount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          platform: { in: ["LINKEDIN", "INSTAGRAM"] },
        }),
      }),
    );
  });

  it("should cap engagement rate at maximum decimal value", async () => {
    const mockAccount = createMockAccount("LINKEDIN");
    vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([mockAccount]);

    vi.mocked(LinkedInClient).mockImplementation(
      function() {
        return {
          platform: "LINKEDIN" as SocialPlatform,
          getMetrics: vi.fn().mockResolvedValue({
            followers: 1000,
            following: 100,
            postsCount: 10,
            engagementRate: 1500, // Very high engagement rate (100% * 15)
          }),
          getAuthUrl: vi.fn(),
          exchangeCodeForTokens: vi.fn(),
          getAccountInfo: vi.fn(),
          createPost: vi.fn(),
          getPosts: vi.fn(),
        };
      } as unknown as typeof LinkedInClient,
    );

    await collectPulseMetrics();

    expect(prisma.socialMetrics.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          engagementRate: 9.9999, // Capped at max decimal(5,4) value
        }),
      }),
    );
  });

  it("should include timing information in result", async () => {
    vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([]);

    const result = await collectPulseMetrics();

    expect(result.startedAt).toBeInstanceOf(Date);
    expect(result.completedAt).toBeInstanceOf(Date);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.completedAt.getTime()).toBeGreaterThanOrEqual(
      result.startedAt.getTime(),
    );
  });

  it("should continue processing when one account fails", async () => {
    const accounts = [
      createMockAccount("LINKEDIN", { id: "account-1" }),
      createMockAccount("INSTAGRAM", { id: "account-2" }),
    ];
    vi.mocked(prisma.socialAccount.findMany).mockResolvedValue(accounts);

    // LinkedIn fails, Instagram succeeds
    vi.mocked(LinkedInClient).mockImplementation(
      function() {
        return {
          platform: "LINKEDIN" as SocialPlatform,
          getMetrics: vi.fn().mockRejectedValue(new Error("LinkedIn API error")),
          getAuthUrl: vi.fn(),
          exchangeCodeForTokens: vi.fn(),
          getAccountInfo: vi.fn(),
          createPost: vi.fn(),
          getPosts: vi.fn(),
        };
      } as unknown as typeof LinkedInClient,
    );

    vi.mocked(InstagramClient).mockImplementation(
      function() {
        return {
          platform: "INSTAGRAM" as SocialPlatform,
          getMetrics: vi.fn().mockResolvedValue({
            followers: 2000,
            following: 200,
            postsCount: 20,
          }),
          getAuthUrl: vi.fn(),
          exchangeCodeForTokens: vi.fn(),
          getAccountInfo: vi.fn(),
          createPost: vi.fn(),
          getPosts: vi.fn(),
        };
      } as unknown as typeof InstagramClient,
    );

    const result = await collectPulseMetrics();

    expect(result.totalAccounts).toBe(2);
    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(1);
    expect(result.results).toHaveLength(2);
    expect(result.results[0]!.success).toBe(false);
    expect(result.results[1]!.success).toBe(true);
  });

  it("should handle database fetch errors", async () => {
    vi.mocked(prisma.socialAccount.findMany).mockRejectedValue(
      new Error("Database connection failed"),
    );

    const result = await collectPulseMetrics();

    expect(result.totalAccounts).toBe(0);
    expect(result.successCount).toBe(0);
    expect(result.failureCount).toBe(0);
    expect(result.skippedCount).toBe(0);
    expect(result.results).toHaveLength(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});
