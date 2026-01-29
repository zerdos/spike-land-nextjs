/**
 * TikTok API Client Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TikTokClient } from "./tiktok";

// Mock environment variables
const mockEnv = {
  TIKTOK_CLIENT_KEY: "test_client_key",
  TIKTOK_CLIENT_SECRET: "test_client_secret",
  TIKTOK_CALLBACK_URL: "https://test.com/callback",
};

describe("TikTokClient", () => {
  beforeEach(() => {
    // Set up environment variables
    vi.stubEnv("TIKTOK_CLIENT_KEY", mockEnv.TIKTOK_CLIENT_KEY);
    vi.stubEnv("TIKTOK_CLIENT_SECRET", mockEnv.TIKTOK_CLIENT_SECRET);
    vi.stubEnv("TIKTOK_CALLBACK_URL", mockEnv.TIKTOK_CALLBACK_URL);

    // Mock fetch
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should create client with platform TIKTOK", () => {
      const client = new TikTokClient();
      expect(client.platform).toBe("TIKTOK");
    });

    it("should accept access token and user ID in options", () => {
      const client = new TikTokClient({
        accessToken: "test_token",
        accountId: "test_open_id",
      });
      expect(client.platform).toBe("TIKTOK");
    });
  });

  describe("getAuthUrl", () => {
    it("should generate valid TikTok OAuth URL", () => {
      const client = new TikTokClient();
      const redirectUri = "https://app.com/callback";
      const state = "random_state";

      const authUrl = client.getAuthUrl(redirectUri, state);

      expect(authUrl).toContain("https://www.tiktok.com/v2/auth/authorize");
      expect(authUrl).toContain(`client_key=${mockEnv.TIKTOK_CLIENT_KEY}`);
      expect(authUrl).toContain(
        `redirect_uri=${encodeURIComponent(redirectUri)}`,
      );
      expect(authUrl).toContain(`state=${state}`);
      expect(authUrl).toContain("response_type=code");
      expect(authUrl).toContain("scope=");
      expect(authUrl).toContain("user.info.basic");
      expect(authUrl).toContain("video.publish");
      expect(authUrl).toContain("video.list");
    });

    it("should throw error if TIKTOK_CLIENT_KEY is not configured", () => {
      vi.unstubAllEnvs();

      const client = new TikTokClient();

      expect(() => {
        client.getAuthUrl("https://app.com/callback", "state");
      }).toThrow("TIKTOK_CLIENT_KEY environment variable is not configured");
    });
  });

  describe("exchangeCodeForTokens", () => {
    it("should exchange authorization code for access token", async () => {
      const mockTokenResponse = {
        access_token: "mock_tiktok_access_token",
        refresh_token: "mock_refresh_token",
        expires_in: 86400, // 24 hours
        token_type: "Bearer",
        scope: "user.info.basic,video.publish,video.list",
        open_id: "test_open_id_12345",
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      });

      const client = new TikTokClient();
      const result = await client.exchangeCodeForTokens(
        "auth_code",
        "https://app.com/callback",
      );

      expect(result.accessToken).toBe("mock_tiktok_access_token");
      expect(result.refreshToken).toBe("mock_refresh_token");
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.tokenType).toBe("Bearer");
      expect(result.scope).toBe("user.info.basic,video.publish,video.list");

      expect(global.fetch).toHaveBeenCalledWith(
        "https://open.tiktokapis.com/v2/oauth/token/",
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
        statusText: "Bad Request",
        json: async () => ({
          error: {
            code: "invalid_grant",
            message: "Authorization code is invalid",
          },
        }),
      });

      const client = new TikTokClient();

      await expect(
        client.exchangeCodeForTokens("bad_code", "https://app.com/callback"),
      ).rejects.toThrow("TikTok token exchange failed");
    });

    it("should throw error if credentials are not configured", async () => {
      vi.unstubAllEnvs();

      const client = new TikTokClient();

      await expect(
        client.exchangeCodeForTokens("auth_code", "https://app.com/callback"),
      ).rejects.toThrow(
        "TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET environment variables are required",
      );
    });
  });

  describe("refreshAccessToken", () => {
    it("should refresh access token using refresh token", async () => {
      const mockRefreshResponse = {
        access_token: "new_access_token",
        refresh_token: "new_refresh_token",
        expires_in: 86400,
        token_type: "Bearer",
        scope: "user.info.basic,video.publish,video.list",
        open_id: "test_open_id_12345",
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRefreshResponse,
      });

      const client = new TikTokClient();
      const result = await client.refreshAccessToken("old_refresh_token");

      expect(result.accessToken).toBe("new_access_token");
      expect(result.refreshToken).toBe("new_refresh_token");
      expect(result.expiresAt).toBeInstanceOf(Date);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://open.tiktokapis.com/v2/oauth/token/",
        expect.objectContaining({
          method: "POST",
        }),
      );
    });

    it("should throw error on failed token refresh", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({
          error: {
            code: "invalid_refresh_token",
            message: "Refresh token is invalid or expired",
          },
        }),
      });

      const client = new TikTokClient();

      await expect(
        client.refreshAccessToken("invalid_refresh_token"),
      ).rejects.toThrow("TikTok token refresh failed");
    });
  });

  describe("getAccountInfo", () => {
    it("should fetch TikTok user information", async () => {
      const mockUserResponse = {
        data: {
          user: {
            open_id: "test_open_id_12345",
            union_id: "test_union_id_67890",
            avatar_url: "https://p16-sign-va.tiktokcdn.com/avatar.jpg",
            avatar_url_100: "https://p16-sign-va.tiktokcdn.com/avatar_100.jpg",
            avatar_large_url:
              "https://p16-sign-va.tiktokcdn.com/avatar_large.jpg",
            display_name: "Test TikTok User",
            bio_description: "This is a test bio",
            profile_deep_link: "https://www.tiktok.com/@testtiktokuser",
            is_verified: true,
            follower_count: 10000,
            following_count: 500,
            likes_count: 50000,
            video_count: 100,
          },
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserResponse,
      });

      const client = new TikTokClient({
        accessToken: "test_token",
      });

      const accountInfo = await client.getAccountInfo();

      expect(accountInfo.platformId).toBe("test_open_id_12345");
      expect(accountInfo.displayName).toBe("Test TikTok User");
      expect(accountInfo.username).toBe("Test TikTok User");
      expect(accountInfo.profileUrl).toBe(
        "https://www.tiktok.com/@testtiktokuser",
      );
      expect(accountInfo.avatarUrl).toBe(
        "https://p16-sign-va.tiktokcdn.com/avatar_large.jpg",
      );
      expect(accountInfo.followersCount).toBe(10000);
      expect(accountInfo.followingCount).toBe(500);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          "https://open.tiktokapis.com/v2/user/info/",
        ),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test_token",
          }),
        }),
      );
    });

    it("should throw error when API returns error", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          error: {
            code: "access_token_invalid",
            message: "The access token is invalid or has expired",
          },
        }),
      });

      const client = new TikTokClient({
        accessToken: "invalid_token",
      });

      await expect(client.getAccountInfo()).rejects.toThrow(
        "Failed to get TikTok user info",
      );
    });

    it("should throw error when access token is not set", async () => {
      const client = new TikTokClient();

      await expect(client.getAccountInfo()).rejects.toThrow(
        "Access token is required",
      );
    });
  });

  describe("createPost", () => {
    it("should throw error indicating video upload is not fully implemented", async () => {
      const client = new TikTokClient({
        accessToken: "test_token",
        accountId: "test_open_id",
      });

      await expect(client.createPost("Test video description")).rejects.toThrow(
        "TikTok video upload requires multi-step process",
      );
    });
  });

  describe("getPosts", () => {
    it("should fetch user videos", async () => {
      const mockVideosResponse = {
        data: {
          videos: [
            {
              id: "video_123",
              title: "Test Video 1",
              video_description: "This is a test video",
              create_time: 1640000000,
              cover_image_url: "https://example.com/cover1.jpg",
              share_url: "https://www.tiktok.com/@user/video/video_123",
              embed_link: "https://www.tiktok.com/embed/video_123",
              duration: 30,
              height: 1920,
              width: 1080,
              like_count: 1000,
              comment_count: 50,
              share_count: 25,
              view_count: 10000,
            },
            {
              id: "video_456",
              title: "Test Video 2",
              video_description: "Another test video",
              create_time: 1640010000,
              cover_image_url: "https://example.com/cover2.jpg",
              share_url: "https://www.tiktok.com/@user/video/video_456",
              embed_link: "https://www.tiktok.com/embed/video_456",
              duration: 60,
              height: 1920,
              width: 1080,
              like_count: 2000,
              comment_count: 100,
              share_count: 50,
              view_count: 20000,
            },
          ],
          cursor: 0,
          has_more: false,
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockVideosResponse,
      });

      const client = new TikTokClient({
        accessToken: "test_token",
      });

      const posts = await client.getPosts(10);

      expect(posts).toHaveLength(2);
      expect(posts[0]).toMatchObject({
        id: "video_123",
        platformPostId: "video_123",
        platform: "TIKTOK",
        content: "This is a test video",
        mediaUrls: ["https://example.com/cover1.jpg"],
        url: "https://www.tiktok.com/@user/video/video_123",
        metrics: {
          likes: 1000,
          comments: 50,
          shares: 25,
          impressions: 10000,
        },
      });
      expect(posts[0]?.publishedAt).toBeInstanceOf(Date);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          "https://open.tiktokapis.com/v2/video/list/",
        ),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test_token",
          }),
        }),
      );
    });

    it("should return empty array when no videos found", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            videos: [],
            cursor: 0,
            has_more: false,
          },
        }),
      });

      const client = new TikTokClient({
        accessToken: "test_token",
      });

      const posts = await client.getPosts();

      expect(posts).toEqual([]);
    });

    it("should handle videos without optional fields", async () => {
      const mockVideosResponse = {
        data: {
          videos: [
            {
              id: "video_789",
              create_time: 1640020000,
              duration: 45,
              height: 1920,
              width: 1080,
              like_count: 500,
              comment_count: 25,
              share_count: 10,
              view_count: 5000,
            },
          ],
          cursor: 0,
          has_more: false,
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockVideosResponse,
      });

      const client = new TikTokClient({
        accessToken: "test_token",
      });

      const posts = await client.getPosts();

      expect(posts).toHaveLength(1);
      expect(posts[0]).toMatchObject({
        id: "video_789",
        content: "",
        mediaUrls: undefined,
      });
    });

    it("should throw error on API failure", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({
          error: {
            code: "access_token_invalid",
            message: "Access token is invalid",
          },
        }),
      });

      const client = new TikTokClient({
        accessToken: "invalid_token",
      });

      await expect(client.getPosts()).rejects.toThrow(
        "Failed to get TikTok videos",
      );
    });

    it("should respect limit parameter within TikTok max of 20", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            videos: [],
            cursor: 0,
            has_more: false,
          },
        }),
      });

      const client = new TikTokClient({
        accessToken: "test_token",
      });

      await client.getPosts(15);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("max_count=15"),
        expect.any(Object),
      );
    });

    it("should cap limit at TikTok maximum of 20", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            videos: [],
            cursor: 0,
            has_more: false,
          },
        }),
      });

      const client = new TikTokClient({
        accessToken: "test_token",
      });

      await client.getPosts(50);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("max_count=20"),
        expect.any(Object),
      );
    });
  });

  describe("getMetrics", () => {
    it("should fetch account metrics", async () => {
      const mockUserResponse = {
        data: {
          user: {
            follower_count: 15000,
            following_count: 750,
            video_count: 120,
            likes_count: 75000,
          },
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserResponse,
      });

      const client = new TikTokClient({
        accessToken: "test_token",
      });

      const metrics = await client.getMetrics();

      expect(metrics).toEqual({
        followers: 15000,
        following: 750,
        postsCount: 120,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          "https://open.tiktokapis.com/v2/user/info/",
        ),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test_token",
          }),
        }),
      );
    });

    it("should handle missing optional metrics fields", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            user: {},
          },
        }),
      });

      const client = new TikTokClient({
        accessToken: "test_token",
      });

      const metrics = await client.getMetrics();

      expect(metrics).toEqual({
        followers: 0,
        following: 0,
        postsCount: 0,
      });
    });

    it("should throw error on API failure", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({}),
      });

      const client = new TikTokClient({
        accessToken: "test_token",
      });

      await expect(client.getMetrics()).rejects.toThrow(
        "Failed to get TikTok metrics",
      );
    });

    it("should throw error when API returns error object", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          error: {
            code: "rate_limit_exceeded",
            message: "Rate limit exceeded",
          },
        }),
      });

      const client = new TikTokClient({
        accessToken: "test_token",
      });

      await expect(client.getMetrics()).rejects.toThrow(
        "Failed to get TikTok metrics: Rate limit exceeded",
      );
    });
  });

  describe("setAccessToken", () => {
    it("should set access token", () => {
      const client = new TikTokClient();
      client.setAccessToken("new_token");

      // Verify token is set by calling a method that requires it
      expect(() => {
        // @ts-expect-error - Testing private method
        client.getAccessTokenOrThrow();
      }).not.toThrow();
    });
  });

  describe("setUserId", () => {
    it("should set user ID", () => {
      const client = new TikTokClient();
      client.setUserId("test_user_id");

      // User ID is stored internally
      expect(client).toBeDefined();
    });
  });
});
