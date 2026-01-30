/**
 * Snapchat Marketing API Client Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SnapchatClient, SnapchatHttpError } from "./snapchat";

// Mock environment variables
const mockEnv = {
  SNAPCHAT_CLIENT_ID: "test_client_id",
  SNAPCHAT_CLIENT_SECRET: "test_client_secret",
};

describe("SnapchatClient", () => {
  beforeEach(() => {
    vi.stubEnv("SNAPCHAT_CLIENT_ID", mockEnv.SNAPCHAT_CLIENT_ID);
    vi.stubEnv("SNAPCHAT_CLIENT_SECRET", mockEnv.SNAPCHAT_CLIENT_SECRET);
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should create client with platform SNAPCHAT", () => {
      const client = new SnapchatClient();
      expect(client.platform).toBe("SNAPCHAT");
    });

    it("should accept access token and account ID in options", () => {
      const client = new SnapchatClient({
        accessToken: "test_token",
        accountId: "account123",
      });
      expect(client.platform).toBe("SNAPCHAT");
    });
  });

  describe("setAccessToken", () => {
    it("should set access token", () => {
      const client = new SnapchatClient();
      client.setAccessToken("new_token");
      expect(client.platform).toBe("SNAPCHAT");
    });
  });

  describe("setAccountId", () => {
    it("should set account ID", () => {
      const client = new SnapchatClient();
      client.setAccountId("account123");
      expect(client.platform).toBe("SNAPCHAT");
    });
  });

  describe("getAuthUrl", () => {
    it("should generate valid Snapchat OAuth URL", () => {
      const client = new SnapchatClient();
      const redirectUri = "https://app.com/callback";
      const state = "random_state";

      const authUrl = client.getAuthUrl(redirectUri, state);

      expect(authUrl).toContain("https://accounts.snapchat.com/accounts/oauth2/auth");
      expect(authUrl).toContain(`client_id=${mockEnv.SNAPCHAT_CLIENT_ID}`);
      expect(authUrl).toContain(
        `redirect_uri=${encodeURIComponent(redirectUri)}`,
      );
      expect(authUrl).toContain(`state=${state}`);
      expect(authUrl).toContain("response_type=code");
      expect(authUrl).toContain("scope=");
    });

    it("should throw error when SNAPCHAT_CLIENT_ID is not configured", () => {
      vi.stubEnv("SNAPCHAT_CLIENT_ID", "");
      const client = new SnapchatClient();

      expect(() => client.getAuthUrl("https://app.com/callback", "state")).toThrow(
        "SNAPCHAT_CLIENT_ID environment variable is not configured",
      );
    });

    it("should trim whitespace from environment variable", () => {
      vi.stubEnv("SNAPCHAT_CLIENT_ID", "  test_id_with_spaces  ");
      const client = new SnapchatClient();
      const authUrl = client.getAuthUrl("https://app.com/callback", "state");

      expect(authUrl).toContain("client_id=test_id_with_spaces");
    });
  });

  describe("exchangeCodeForTokens", () => {
    it("should exchange authorization code for access token", async () => {
      const mockTokenResponse = {
        access_token: "mock_snapchat_access_token",
        expires_in: 1800,
        refresh_token: "mock_refresh_token",
        token_type: "Bearer",
        scope: "snapchat-marketing-api",
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      });

      const client = new SnapchatClient();
      const result = await client.exchangeCodeForTokens(
        "auth_code",
        "https://app.com/callback",
      );

      expect(result.accessToken).toBe("mock_snapchat_access_token");
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.refreshToken).toBe("mock_refresh_token");
      expect(result.tokenType).toBe("Bearer");
      expect(global.fetch).toHaveBeenCalledWith(
        "https://adsapi.snapchat.com/v1/oauth2/token",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/x-www-form-urlencoded",
          }),
        }),
      );
    });

    it("should handle token response without expires_in", async () => {
      const mockTokenResponse = {
        access_token: "mock_access_token",
        token_type: "Bearer",
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      });

      const client = new SnapchatClient();
      const result = await client.exchangeCodeForTokens("auth_code", "https://app.com/callback");

      expect(result.accessToken).toBe("mock_access_token");
      expect(result.expiresAt).toBeUndefined();
    });

    it("should throw SnapchatHttpError on failed token exchange", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: async () => ({ error_description: "Invalid code" }),
      });

      const client = new SnapchatClient();
      await expect(
        client.exchangeCodeForTokens("bad_code", "https://app.com/callback"),
      ).rejects.toThrow(SnapchatHttpError);
    });

    it("should throw error when credentials not configured", async () => {
      vi.stubEnv("SNAPCHAT_CLIENT_ID", "");
      const client = new SnapchatClient();

      await expect(
        client.exchangeCodeForTokens("code", "https://app.com/callback"),
      ).rejects.toThrow(
        "SNAPCHAT_CLIENT_ID and SNAPCHAT_CLIENT_SECRET environment variables are required",
      );
    });
  });

  describe("refreshAccessToken", () => {
    it("should refresh access token", async () => {
      const mockTokenResponse = {
        access_token: "new_access_token",
        expires_in: 1800,
        refresh_token: "new_refresh_token",
        token_type: "Bearer",
        scope: "snapchat-marketing-api",
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      });

      const client = new SnapchatClient();
      const result = await client.refreshAccessToken("old_refresh_token");

      expect(result.accessToken).toBe("new_access_token");
      expect(result.refreshToken).toBe("new_refresh_token");
    });

    it("should throw SnapchatHttpError on failed refresh", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({ error_description: "Invalid refresh token" }),
      });

      const client = new SnapchatClient();
      await expect(
        client.refreshAccessToken("invalid_token"),
      ).rejects.toThrow(SnapchatHttpError);
    });
  });

  describe("getOrganizations", () => {
    it("should fetch organizations", async () => {
      const mockOrgResponse = {
        organizations: [
          {
            id: "org123",
            name: "Test Organization",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
            timezone: "America/Los_Angeles",
            currency: "USD",
          },
        ],
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrgResponse,
      });

      const client = new SnapchatClient({ accessToken: "test_token" });
      const orgs = await client.getOrganizations();

      expect(orgs).toHaveLength(1);
      expect(orgs[0]!.id).toBe("org123");
      expect(orgs[0]!.name).toBe("Test Organization");
    });

    it("should throw error when access token not set", async () => {
      const client = new SnapchatClient();
      await expect(client.getOrganizations()).rejects.toThrow(
        "Access token is required",
      );
    });

    it("should throw SnapchatHttpError on API failure", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({ debug_message: "Invalid token" }),
      });

      const client = new SnapchatClient({ accessToken: "test_token" });
      await expect(client.getOrganizations()).rejects.toThrow(SnapchatHttpError);
    });

    it("should return empty array when no organizations", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const client = new SnapchatClient({ accessToken: "test_token" });
      const orgs = await client.getOrganizations();

      expect(orgs).toEqual([]);
    });
  });

  describe("getAdAccounts", () => {
    it("should fetch ad accounts for organization", async () => {
      const mockAdAccountsResponse = {
        adaccounts: [
          {
            id: "ad_account_123",
            name: "Test Ad Account",
            organization_id: "org123",
            status: "ACTIVE",
            timezone: "America/Los_Angeles",
            currency: "USD",
            type: "PARTNER",
          },
        ],
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAdAccountsResponse,
      });

      const client = new SnapchatClient({ accessToken: "test_token" });
      const accounts = await client.getAdAccounts("org123");

      expect(accounts).toHaveLength(1);
      expect(accounts[0]!.id).toBe("ad_account_123");
      expect(accounts[0]!.name).toBe("Test Ad Account");
    });

    it("should throw SnapchatHttpError on API failure", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: async () => ({ debug_message: "Organization not found" }),
      });

      const client = new SnapchatClient({ accessToken: "test_token" });
      await expect(client.getAdAccounts("nonexistent")).rejects.toThrow(SnapchatHttpError);
    });
  });

  describe("getAccountInfo", () => {
    it("should fetch account information from first organization", async () => {
      const mockOrgResponse = {
        organizations: [
          {
            id: "org123",
            name: "Test Organization",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
            timezone: "America/Los_Angeles",
            currency: "USD",
          },
        ],
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrgResponse,
      });

      const client = new SnapchatClient({ accessToken: "test_token" });
      const accountInfo = await client.getAccountInfo();

      expect(accountInfo.platformId).toBe("org123");
      expect(accountInfo.displayName).toBe("Test Organization");
      expect(accountInfo.username).toBe("Test Organization");
    });

    it("should throw error when no organizations found", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ organizations: [] }),
      });

      const client = new SnapchatClient({ accessToken: "test_token" });
      await expect(client.getAccountInfo()).rejects.toThrow(
        "No Snapchat organizations found",
      );
    });
  });

  describe("validateMedia", () => {
    it("should validate valid image", async () => {
      const client = new SnapchatClient();
      const validImage = Buffer.alloc(1024 * 1024); // 1MB

      const result = await client.validateMedia(validImage, "IMAGE");

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.metadata.fileSize).toBe(1024 * 1024);
    });

    it("should reject image exceeding 5MB", async () => {
      const client = new SnapchatClient();
      const largeImage = Buffer.alloc(6 * 1024 * 1024); // 6MB

      const result = await client.validateMedia(largeImage, "IMAGE");

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("exceeds maximum of 5MB");
    });

    it("should validate valid video", async () => {
      const client = new SnapchatClient();
      const validVideo = Buffer.alloc(10 * 1024 * 1024); // 10MB

      const result = await client.validateMedia(validVideo, "VIDEO");

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain("Video duration should be 60 seconds or less");
    });

    it("should reject video exceeding 32MB", async () => {
      const client = new SnapchatClient();
      const largeVideo = Buffer.alloc(35 * 1024 * 1024); // 35MB

      const result = await client.validateMedia(largeVideo, "VIDEO");

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("exceeds maximum of 32MB");
    });
  });

  describe("createPost", () => {
    it("should throw error when account ID not set", async () => {
      const client = new SnapchatClient({ accessToken: "test_token" });

      await expect(client.createPost("Test content")).rejects.toThrow(
        "Account ID is required",
      );
    });

    it("should throw error indicating story creation not implemented", async () => {
      const client = new SnapchatClient({
        accessToken: "test_token",
        accountId: "account123",
      });

      await expect(client.createPost("Test content")).rejects.toThrow(
        "Story creation not yet fully implemented",
      );
    });
  });

  describe("getStories", () => {
    it("should fetch stories from creatives", async () => {
      const mockCreativesResponse = {
        creatives: [
          {
            id: "creative123",
            name: "Test Creative",
            type: "IMAGE",
            status: "ACTIVE",
            created_at: "2024-01-01T00:00:00Z",
          },
        ],
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCreativesResponse,
      });

      const client = new SnapchatClient({ accessToken: "test_token" });
      const stories = await client.getStories("account123");

      expect(stories).toHaveLength(1);
      expect(stories[0]!.id).toBe("creative123");
    });

    it("should throw SnapchatHttpError on API failure", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({ debug_message: "Server error" }),
      });

      const client = new SnapchatClient({ accessToken: "test_token" });
      await expect(client.getStories("account123")).rejects.toThrow(SnapchatHttpError);
    });
  });

  describe("getPosts", () => {
    it("should get posts by fetching stories", async () => {
      // Mock getAccountInfo via getOrganizations
      const mockOrgResponse = {
        organizations: [
          {
            id: "org123",
            name: "Test Org",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
            timezone: "UTC",
            currency: "USD",
          },
        ],
      };

      // Mock getStories
      const mockCreativesResponse = {
        creatives: [
          {
            id: "creative123",
            name: "Test Creative",
            type: "IMAGE",
            status: "ACTIVE",
            created_at: "2024-01-01T00:00:00Z",
          },
        ],
      };

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockOrgResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockCreativesResponse,
        });

      const client = new SnapchatClient({ accessToken: "test_token" });
      const posts = await client.getPosts(10);

      expect(posts).toHaveLength(1);
      expect(posts[0]!.platform).toBe("SNAPCHAT");
      expect(posts[0]!.platformPostId).toBe("creative123");
    });
  });

  describe("getStoryMetrics", () => {
    it("should fetch story metrics", async () => {
      const mockStatsResponse = {
        total_stats: [
          {
            id: "story123",
            type: "creative",
            granularity: "TOTAL",
            start_time: "2024-01-01T00:00:00Z",
            end_time: "2024-01-07T00:00:00Z",
            stats: {
              impressions: 10000,
              swipes: 500,
              view_completion: 0.75,
              screenshot: 100,
            },
          },
        ],
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatsResponse,
      });

      const client = new SnapchatClient({
        accessToken: "test_token",
        accountId: "account123",
      });
      const metrics = await client.getStoryMetrics("story123");

      expect(metrics.impressions).toBe(10000);
      expect(metrics.screenshots).toBe(100);
      expect(metrics.replies).toBe(500);
      expect(metrics.completionRate).toBe(0.75);
    });

    it("should throw error when account ID not set", async () => {
      const client = new SnapchatClient({ accessToken: "test_token" });

      await expect(client.getStoryMetrics("story123")).rejects.toThrow(
        "Account ID is required",
      );
    });

    it("should return zero metrics on API failure", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      const client = new SnapchatClient({
        accessToken: "test_token",
        accountId: "account123",
      });
      const metrics = await client.getStoryMetrics("nonexistent");

      expect(metrics.views).toBe(0);
      expect(metrics.screenshots).toBe(0);
      expect(metrics.impressions).toBe(0);
    });

    it("should return zero metrics when stats not available", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ total_stats: [] }),
      });

      const client = new SnapchatClient({
        accessToken: "test_token",
        accountId: "account123",
      });
      const metrics = await client.getStoryMetrics("story123");

      expect(metrics.views).toBe(0);
      expect(metrics.screenshots).toBe(0);
    });
  });

  describe("getMetrics", () => {
    it("should return default metrics (Snapchat limitations)", async () => {
      const client = new SnapchatClient({ accessToken: "test_token" });
      const metrics = await client.getMetrics();

      expect(metrics.followers).toBe(0);
      expect(metrics.following).toBe(0);
      expect(metrics.postsCount).toBe(0);
      expect(metrics.engagementRate).toBe(0);
    });
  });

  describe("submitToSpotlight", () => {
    it("should throw error indicating not implemented", async () => {
      const client = new SnapchatClient({ accessToken: "test_token" });

      await expect(
        client.submitToSpotlight({
          type: "SPOTLIGHT",
          media: {
            url: "https://example.com/video.mp4",
            type: "VIDEO",
          },
        }),
      ).rejects.toThrow("Spotlight submission not yet implemented");
    });
  });
});

describe("SnapchatHttpError", () => {
  it("should include status and statusText", () => {
    const error = new SnapchatHttpError("Test error", 404, "Not Found");

    expect(error.message).toBe("Test error");
    expect(error.status).toBe(404);
    expect(error.statusText).toBe("Not Found");
    expect(error.name).toBe("SnapchatHttpError");
  });
});
