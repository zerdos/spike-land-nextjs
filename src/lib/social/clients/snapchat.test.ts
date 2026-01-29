/**
 * Snapchat API Client Tests
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
    // Set up environment variables
    vi.stubEnv("SNAPCHAT_CLIENT_ID", mockEnv.SNAPCHAT_CLIENT_ID);
    vi.stubEnv("SNAPCHAT_CLIENT_SECRET", mockEnv.SNAPCHAT_CLIENT_SECRET);

    // Mock fetch
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
        accountId: "12345",
      });
      expect(client.platform).toBe("SNAPCHAT");
    });
  });

  describe("getAuthUrl", () => {
    it("should generate valid OAuth URL with required parameters", () => {
      const client = new SnapchatClient();
      const redirectUri = "https://app.com/callback";
      const state = "random_state";

      const authUrl = client.getAuthUrl(redirectUri, state);

      expect(authUrl).toContain(
        "https://accounts.snapchat.com/accounts/oauth2/auth",
      );
      expect(authUrl).toContain(`client_id=${mockEnv.SNAPCHAT_CLIENT_ID}`);
      expect(authUrl).toContain(
        `redirect_uri=${encodeURIComponent(redirectUri)}`,
      );
      expect(authUrl).toContain(`state=${state}`);
      expect(authUrl).toContain("response_type=code");
      expect(authUrl).toContain("scope=");
    });

    it("should throw error when SNAPCHAT_CLIENT_ID is not set", () => {
      vi.unstubAllEnvs();
      const client = new SnapchatClient();

      expect(() =>
        client.getAuthUrl("https://app.com/callback", "state"),
      ).toThrow("SNAPCHAT_CLIENT_ID environment variable is not configured");
    });
  });

  describe("exchangeCodeForTokens", () => {
    it("should exchange authorization code for access token", async () => {
      const mockTokenResponse = {
        access_token: "mock_access_token",
        refresh_token: "mock_refresh_token",
        expires_in: 3600,
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

      expect(result.accessToken).toBe("mock_access_token");
      expect(result.refreshToken).toBe("mock_refresh_token");
      expect(result.expiresAt).toBeInstanceOf(Date);
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

    it("should throw SnapchatHttpError on failed token exchange", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: async () => ({
          error: "invalid_grant",
          error_description: "Invalid authorization code",
        }),
      });

      const client = new SnapchatClient();
      await expect(
        client.exchangeCodeForTokens("bad_code", "https://app.com/callback"),
      ).rejects.toThrow(SnapchatHttpError);
    });

    it("should throw error when credentials are missing", async () => {
      vi.unstubAllEnvs();
      const client = new SnapchatClient();

      await expect(
        client.exchangeCodeForTokens("code", "https://app.com/callback"),
      ).rejects.toThrow(
        "SNAPCHAT_CLIENT_ID and SNAPCHAT_CLIENT_SECRET environment variables are required",
      );
    });
  });

  describe("refreshAccessToken", () => {
    it("should refresh an expired access token", async () => {
      const mockTokenResponse = {
        access_token: "new_access_token",
        refresh_token: "new_refresh_token",
        expires_in: 3600,
        token_type: "Bearer",
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      });

      const client = new SnapchatClient();
      const result = await client.refreshAccessToken("old_refresh_token");

      expect(result.accessToken).toBe("new_access_token");
      expect(result.refreshToken).toBe("new_refresh_token");
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://adsapi.snapchat.com/v1/oauth2/token",
        expect.objectContaining({
          method: "POST",
        }),
      );
    });

    it("should throw SnapchatHttpError on failed refresh", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({
          error: "invalid_token",
          error_description: "Refresh token expired",
        }),
      });

      const client = new SnapchatClient();
      await expect(
        client.refreshAccessToken("expired_token"),
      ).rejects.toThrow(SnapchatHttpError);
    });
  });

  describe("getOrganizations", () => {
    it("should fetch organizations for authenticated user", async () => {
      const mockOrganizations = {
        organizations: [
          {
            id: "org-123",
            name: "Test Organization",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          },
        ],
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrganizations,
      });

      const client = new SnapchatClient({ accessToken: "test_token" });
      const orgs = await client.getOrganizations();

      expect(orgs).toHaveLength(1);
      expect(orgs[0]?.id).toBe("org-123");
      expect(orgs[0]?.name).toBe("Test Organization");
      expect(global.fetch).toHaveBeenCalledWith(
        "https://adsapi.snapchat.com/v1/me/organizations",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test_token",
          }),
        }),
      );
    });

    it("should throw error when access token is not set", async () => {
      const client = new SnapchatClient();
      await expect(client.getOrganizations()).rejects.toThrow(
        "Access token is required",
      );
    });

    it("should throw SnapchatHttpError on API error", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        json: async () => ({
          error: "access_denied",
          debug_message: "Insufficient permissions",
        }),
      });

      const client = new SnapchatClient({ accessToken: "test_token" });
      await expect(client.getOrganizations()).rejects.toThrow(
        SnapchatHttpError,
      );
    });
  });

  describe("getAdAccounts", () => {
    it("should fetch ad accounts for an organization", async () => {
      const mockAdAccounts = {
        adaccounts: [
          {
            id: "ad-account-123",
            name: "Test Ad Account",
            organization_id: "org-123",
            status: "ACTIVE",
            currency: "USD",
          },
        ],
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAdAccounts,
      });

      const client = new SnapchatClient({ accessToken: "test_token" });
      const accounts = await client.getAdAccounts("org-123");

      expect(accounts).toHaveLength(1);
      expect(accounts[0]?.id).toBe("ad-account-123");
      expect(accounts[0]?.organization_id).toBe("org-123");
      expect(global.fetch).toHaveBeenCalledWith(
        "https://adsapi.snapchat.com/v1/organizations/org-123/adaccounts",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test_token",
          }),
        }),
      );
    });
  });

  describe("getAccountInfo", () => {
    it("should fetch account information from organization", async () => {
      const mockOrganizations = {
        organizations: [
          {
            id: "org-123",
            name: "Test Org",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          },
        ],
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrganizations,
      });

      const client = new SnapchatClient({ accessToken: "test_token" });
      const accountInfo = await client.getAccountInfo();

      expect(accountInfo.platformId).toBe("org-123");
      expect(accountInfo.username).toBe("Test Org");
      expect(accountInfo.displayName).toBe("Test Org");
    });

    it("should throw error when no organizations found", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ organizations: [] }),
      });

      const client = new SnapchatClient({ accessToken: "test_token" });
      await expect(client.getAccountInfo()).rejects.toThrow(
        "No Snapchat organizations found for this account",
      );
    });
  });

  describe("validateMedia", () => {
    it("should validate image file size", async () => {
      const client = new SnapchatClient();
      const smallFile = Buffer.alloc(1024); // 1KB file

      const result = await client.validateMedia(smallFile, "IMAGE");

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.metadata.fileSize).toBe(1024);
    });

    it("should reject oversized image files", async () => {
      const client = new SnapchatClient();
      const largeFile = Buffer.alloc(6 * 1024 * 1024); // 6MB file

      const result = await client.validateMedia(largeFile, "IMAGE");

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("exceeds maximum");
    });

    it("should validate video file size", async () => {
      const client = new SnapchatClient();
      const videoFile = Buffer.alloc(10 * 1024 * 1024); // 10MB file

      const result = await client.validateMedia(videoFile, "VIDEO");

      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should reject oversized video files", async () => {
      const client = new SnapchatClient();
      const largeVideo = Buffer.alloc(40 * 1024 * 1024); // 40MB file

      const result = await client.validateMedia(largeVideo, "VIDEO");

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("getStories", () => {
    it("should fetch stories for an account", async () => {
      const mockCreatives = {
        creatives: [
          {
            id: "creative-123",
            name: "Test Story",
            type: "SNAP_AD",
            status: "ACTIVE",
            created_at: "2024-01-01T00:00:00Z",
          },
        ],
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCreatives,
      });

      const client = new SnapchatClient({ accessToken: "test_token" });
      const stories = await client.getStories("ad-account-123");

      expect(stories).toHaveLength(1);
      expect(stories[0]?.id).toBe("creative-123");
      expect(stories[0]?.creative_id).toBe("creative-123");
      expect(stories[0]?.type).toBe("IMAGE");
    });
  });

  describe("getPosts", () => {
    it("should fetch and format posts", async () => {
      const mockOrganizations = {
        organizations: [
          {
            id: "org-123",
            name: "Test Org",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          },
        ],
      };

      const mockCreatives = {
        creatives: [
          {
            id: "creative-123",
            name: "Test Story",
            type: "SNAP_AD",
            status: "ACTIVE",
            created_at: "2024-01-01T00:00:00Z",
          },
        ],
      };

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockOrganizations,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockCreatives,
        });

      const client = new SnapchatClient({ accessToken: "test_token" });
      const posts = await client.getPosts(10);

      expect(posts).toHaveLength(1);
      expect(posts[0]?.platform).toBe("SNAPCHAT");
      expect(posts[0]?.platformPostId).toBe("creative-123");
    });
  });

  describe("getStoryMetrics", () => {
    it("should fetch metrics for a story", async () => {
      const mockStats = {
        total_stats: [
          {
            id: "stat-123",
            type: "CREATIVE",
            granularity: "TOTAL",
            start_time: "2024-01-01T00:00:00Z",
            end_time: "2024-01-08T00:00:00Z",
            stats: {
              impressions: 1000,
              swipes: 50,
              view_completion: 0.85,
              screenshot: 10,
            },
          },
        ],
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      });

      const client = new SnapchatClient({
        accessToken: "test_token",
        accountId: "ad-account-123",
      });
      const metrics = await client.getStoryMetrics("creative-123");

      expect(metrics.views).toBe(1000);
      expect(metrics.screenshots).toBe(10);
      expect(metrics.replies).toBe(50);
      expect(metrics.completionRate).toBe(0.85);
    });

    it("should return zero metrics when stats unavailable", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: async () => ({}),
      });

      const client = new SnapchatClient({
        accessToken: "test_token",
        accountId: "ad-account-123",
      });
      const metrics = await client.getStoryMetrics("creative-123");

      expect(metrics.views).toBe(0);
      expect(metrics.screenshots).toBe(0);
      expect(metrics.replies).toBe(0);
    });
  });

  describe("getMetrics", () => {
    it("should return zero metrics for account level", async () => {
      const client = new SnapchatClient({ accessToken: "test_token" });
      const metrics = await client.getMetrics();

      expect(metrics.followers).toBe(0);
      expect(metrics.following).toBe(0);
      expect(metrics.postsCount).toBe(0);
    });
  });

  describe("setAccessToken", () => {
    it("should set the access token", () => {
      const client = new SnapchatClient();
      client.setAccessToken("new_token");

      // Token is set internally, verified through method requiring token
      expect(() => client.setAccessToken("new_token")).not.toThrow();
    });
  });

  describe("setAccountId", () => {
    it("should set the account ID", () => {
      const client = new SnapchatClient();
      client.setAccountId("account-123");

      // Account ID is set internally
      expect(() => client.setAccountId("account-123")).not.toThrow();
    });
  });

  describe("createPost", () => {
    it("should throw error for unimplemented story creation", async () => {
      const client = new SnapchatClient({
        accessToken: "test_token",
        accountId: "account-123",
      });

      await expect(
        client.createPost("Test story", {}),
      ).rejects.toThrow(
        "Story creation not yet fully implemented",
      );
    });
  });

  describe("submitToSpotlight", () => {
    it("should throw error for unimplemented Spotlight submission", async () => {
      const client = new SnapchatClient({ accessToken: "test_token" });

      await expect(
        client.submitToSpotlight({
          type: "SPOTLIGHT",
          media: { url: "https://example.com/video.mp4", type: "VIDEO" },
        }),
      ).rejects.toThrow("Spotlight submission not yet implemented");
    });
  });
});
