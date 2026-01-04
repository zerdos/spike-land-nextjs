/**
 * LinkedIn API Client Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LinkedInClient } from "./linkedin";

// Mock environment variables
const mockEnv = {
  LINKEDIN_CLIENT_ID: "test_client_id",
  LINKEDIN_CLIENT_SECRET: "test_client_secret",
  LINKEDIN_CALLBACK_URL: "https://test.com/callback",
};

describe("LinkedInClient", () => {
  beforeEach(() => {
    // Set up environment variables
    vi.stubEnv("LINKEDIN_CLIENT_ID", mockEnv.LINKEDIN_CLIENT_ID);
    vi.stubEnv("LINKEDIN_CLIENT_SECRET", mockEnv.LINKEDIN_CLIENT_SECRET);
    vi.stubEnv("LINKEDIN_CALLBACK_URL", mockEnv.LINKEDIN_CALLBACK_URL);

    // Mock fetch
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should create client with platform LINKEDIN", () => {
      const client = new LinkedInClient();
      expect(client.platform).toBe("LINKEDIN");
    });

    it("should accept access token and organization ID in options", () => {
      const client = new LinkedInClient({
        accessToken: "test_token",
        accountId: "12345",
      });
      expect(client.platform).toBe("LINKEDIN");
    });
  });

  describe("getAuthUrl", () => {
    it("should generate valid OAuth URL with required parameters", () => {
      const client = new LinkedInClient();
      const redirectUri = "https://app.com/callback";
      const state = "random_state";

      const authUrl = client.getAuthUrl(redirectUri, state);

      expect(authUrl).toContain("https://www.linkedin.com/oauth/v2/authorization");
      expect(authUrl).toContain(`client_id=${mockEnv.LINKEDIN_CLIENT_ID}`);
      expect(authUrl).toContain(`redirect_uri=${encodeURIComponent(redirectUri)}`);
      expect(authUrl).toContain(`state=${state}`);
      expect(authUrl).toContain("response_type=code");
      expect(authUrl).toContain("scope=");
    });
  });

  describe("exchangeCodeForTokens", () => {
    it("should exchange authorization code for access token", async () => {
      const mockTokenResponse = {
        access_token: "mock_access_token",
        expires_in: 5184000,
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      });

      const client = new LinkedInClient();
      const result = await client.exchangeCodeForTokens(
        "auth_code",
        "https://app.com/callback",
      );

      expect(result.accessToken).toBe("mock_access_token");
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.tokenType).toBe("Bearer");
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("https://www.linkedin.com/oauth/v2/accessToken"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/x-www-form-urlencoded",
          }),
        }),
      );
    });

    it("should throw error on failed token exchange", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: "invalid_grant" }),
      });

      const client = new LinkedInClient();
      await expect(
        client.exchangeCodeForTokens("bad_code", "https://app.com/callback"),
      ).rejects.toThrow();
    });
  });

  describe("getAccountInfo", () => {
    it("should fetch organization profile information", async () => {
      const mockOrganization = {
        id: 12345,
        localizedName: "Test Organization",
        vanityName: "test-org",
        logoV2: {
          "cropped~": {
            elements: [
              {
                identifiers: [
                  {
                    identifier: "https://media.licdn.com/test-logo.png",
                  },
                ],
              },
            ],
          },
        },
      };

      const mockFollowersResponse = {
        elements: [
          {
            followerCounts: {
              organicFollowerCount: 1500,
              paidFollowerCount: 100,
            },
          },
        ],
      };

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockOrganization,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockFollowersResponse,
        });

      const client = new LinkedInClient({
        accessToken: "test_token",
        accountId: "12345",
      });

      const accountInfo = await client.getAccountInfo();

      expect(accountInfo.platformId).toBe("12345");
      expect(accountInfo.displayName).toBe("Test Organization");
      expect(accountInfo.username).toBe("test-org");
      expect(accountInfo.followersCount).toBe(1600); // 1500 + 100
    });
  });

  describe("createPost", () => {
    it("should create a text post successfully", async () => {
      const mockPostResponse = {
        id: "urn:li:share:12345",
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPostResponse,
      });

      const client = new LinkedInClient({
        accessToken: "test_token",
        organizationUrn: "urn:li:organization:12345",
      });

      const result = await client.createPost("Test post content");

      expect(result.platformPostId).toBe("urn:li:share:12345");
      expect(result.url).toContain("urn:li:share:12345");
      expect(result.publishedAt).toBeInstanceOf(Date);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/ugcPosts"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test_token",
            "Content-Type": "application/json",
          }),
        }),
      );
    });

    it("should throw error when organization URN is missing", async () => {
      const client = new LinkedInClient({
        accessToken: "test_token",
      });

      await expect(
        client.createPost("Test"),
      ).rejects.toThrow("Organization URN is required");
    });
  });

  describe("getPosts", () => {
    it("should fetch organization posts with statistics", async () => {
      const mockSharesResponse = {
        elements: [
          {
            id: "urn:li:share:12345",
            activity: "urn:li:activity:12345",
            created: { time: 1704384000000 },
            text: { text: "Test post" },
          },
        ],
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSharesResponse,
      });

      const client = new LinkedInClient({
        accessToken: "test_token",
        organizationUrn: "urn:li:organization:12345",
      });

      const posts = await client.getPosts(10);

      expect(posts).toHaveLength(1);
      const post = posts[0]!;
      expect(post.platformPostId).toBe("urn:li:activity:12345");
      expect(post.content).toBe("Test post");
      expect(post.platform).toBe("LINKEDIN");
    });
  });

  describe("getMetrics", () => {
    it("should fetch follower statistics", async () => {
      const mockFollowersResponse = {
        elements: [
          {
            followerCounts: {
              organicFollowerCount: 1500,
              paidFollowerCount: 100,
            },
          },
        ],
      };

      const mockStatsResponse = {
        elements: [
          {
            totalShareStatistics: {
              impressionCount: 10000,
              engagement: 0.05,
            },
          },
        ],
      };

      const mockPostsResponse = {
        paging: { total: 50 },
        elements: [],
      };

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockFollowersResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStatsResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPostsResponse,
        });

      const client = new LinkedInClient({
        accessToken: "test_token",
        organizationUrn: "urn:li:organization:12345",
      });

      const metrics = await client.getMetrics();

      expect(metrics.followers).toBe(1600); // 1500 + 100
      expect(metrics.postsCount).toBe(50);
      expect(metrics.impressions).toBe(10000);
      expect(metrics.engagementRate).toBe(0.05);
    });
  });
});
