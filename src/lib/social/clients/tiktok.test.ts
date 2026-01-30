/**
 * TikTok API Client Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TikTokClient, TikTokHttpError } from "./tiktok";

// Mock environment variables
const mockEnv = {
  TIKTOK_CLIENT_KEY: "test_client_key",
  TIKTOK_CLIENT_SECRET: "test_client_secret",
};

describe("TikTokClient", () => {
  beforeEach(() => {
    vi.stubEnv("TIKTOK_CLIENT_KEY", mockEnv.TIKTOK_CLIENT_KEY);
    vi.stubEnv("TIKTOK_CLIENT_SECRET", mockEnv.TIKTOK_CLIENT_SECRET);
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

    it("should accept access token in options", () => {
      const client = new TikTokClient({ accessToken: "test_token" });
      expect(client.platform).toBe("TIKTOK");
    });
  });

  describe("setAccessToken", () => {
    it("should set access token", () => {
      const client = new TikTokClient();
      client.setAccessToken("new_token");
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
    });

    it("should throw error when TIKTOK_CLIENT_KEY is not configured", () => {
      vi.stubEnv("TIKTOK_CLIENT_KEY", "");
      const client = new TikTokClient();

      expect(() => client.getAuthUrl("https://app.com/callback", "state")).toThrow(
        "TIKTOK_CLIENT_KEY not configured",
      );
    });

    it("should trim whitespace from environment variable", () => {
      vi.stubEnv("TIKTOK_CLIENT_KEY", "  test_key_with_spaces  ");
      const client = new TikTokClient();
      const authUrl = client.getAuthUrl("https://app.com/callback", "state");

      expect(authUrl).toContain("client_key=test_key_with_spaces");
    });
  });

  describe("exchangeCodeForTokens", () => {
    it("should exchange authorization code for access token", async () => {
      const mockTokenResponse = {
        access_token: "mock_tiktok_access_token",
        expires_in: 86400,
        refresh_token: "mock_refresh_token",
        token_type: "Bearer",
        scope: "user.info.basic,video.list",
        open_id: "user_open_id",
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
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.refreshToken).toBe("mock_refresh_token");
      expect(result.tokenType).toBe("Bearer");
      expect(result.scope).toBe("user.info.basic,video.list");
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

    it("should throw TikTokHttpError on failed token exchange", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: async () => ({ error_description: "Invalid code" }),
      });

      const client = new TikTokClient();
      await expect(
        client.exchangeCodeForTokens("bad_code", "https://app.com/callback"),
      ).rejects.toThrow(TikTokHttpError);
    });

    it("should throw error when credentials not configured", async () => {
      vi.stubEnv("TIKTOK_CLIENT_KEY", "");
      const client = new TikTokClient();

      await expect(
        client.exchangeCodeForTokens("code", "https://app.com/callback"),
      ).rejects.toThrow("TikTok credentials not configured");
    });
  });

  describe("refreshAccessToken", () => {
    it("should refresh access token", async () => {
      const mockTokenResponse = {
        access_token: "new_access_token",
        expires_in: 86400,
        refresh_token: "new_refresh_token",
        token_type: "Bearer",
        scope: "user.info.basic",
        open_id: "user_open_id",
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      });

      const client = new TikTokClient();
      const result = await client.refreshAccessToken("old_refresh_token");

      expect(result.accessToken).toBe("new_access_token");
      expect(result.refreshToken).toBe("new_refresh_token");
      expect(global.fetch).toHaveBeenCalledWith(
        "https://open.tiktokapis.com/v2/oauth/token/",
        expect.objectContaining({
          method: "POST",
          body: expect.any(URLSearchParams),
        }),
      );
    });

    it("should throw TikTokHttpError on failed refresh", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({ error_description: "Invalid refresh token" }),
      });

      const client = new TikTokClient();
      await expect(
        client.refreshAccessToken("invalid_token"),
      ).rejects.toThrow(TikTokHttpError);
    });
  });

  describe("getAccountInfo", () => {
    it("should fetch TikTok user information", async () => {
      const mockUserResponse = {
        data: {
          user: {
            open_id: "user123",
            union_id: "union123",
            avatar_url: "https://tiktok.com/avatar.jpg",
            display_name: "Test User",
            username: "testuser",
            follower_count: 1000,
            following_count: 500,
            video_count: 50,
          },
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserResponse,
      });

      const client = new TikTokClient({ accessToken: "test_token" });
      const accountInfo = await client.getAccountInfo();

      expect(accountInfo.platformId).toBe("user123");
      expect(accountInfo.displayName).toBe("Test User");
      expect(accountInfo.username).toBe("testuser");
      expect(accountInfo.avatarUrl).toBe("https://tiktok.com/avatar.jpg");
      expect(accountInfo.followersCount).toBe(1000);
      expect(accountInfo.followingCount).toBe(500);
    });

    it("should throw error when access token not set", async () => {
      const client = new TikTokClient();
      await expect(client.getAccountInfo()).rejects.toThrow(
        "TikTok access token not set",
      );
    });

    it("should throw TikTokHttpError on API failure", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({ message: "Invalid token" }),
      });

      const client = new TikTokClient({ accessToken: "test_token" });
      await expect(client.getAccountInfo()).rejects.toThrow(TikTokHttpError);
    });

    it("should handle error in response body", async () => {
      const mockErrorResponse = {
        data: {
          user: {
            open_id: "user123",
            username: "test",
            display_name: "Test",
            avatar_url: "",
            union_id: "",
            follower_count: 0,
            following_count: 0,
            video_count: 0,
          },
        },
        error: {
          message: "Rate limit exceeded",
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockErrorResponse,
      });

      const client = new TikTokClient({ accessToken: "test_token" });
      await expect(client.getAccountInfo()).rejects.toThrow("Rate limit exceeded");
    });
  });

  describe("createPost", () => {
    it("should throw error indicating video upload not implemented", async () => {
      const client = new TikTokClient({ accessToken: "test_token" });

      await expect(client.createPost("Test content")).rejects.toThrow(
        "Video upload not yet fully implemented",
      );
    });
  });

  describe("getPosts", () => {
    it("should fetch user videos", async () => {
      const mockVideoResponse = {
        data: {
          videos: [
            {
              id: "video123",
              title: "Test Video",
              cover_image_url: "https://tiktok.com/cover.jpg",
              create_time: 1704067200, // 2024-01-01 00:00:00
              duration: 60,
              share_url: "https://tiktok.com/@user/video/123",
              video_description: "Test description",
              like_count: 1000,
              comment_count: 50,
              share_count: 25,
              view_count: 10000,
            },
          ],
          cursor: 0,
          has_more: false,
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockVideoResponse,
      });

      const client = new TikTokClient({ accessToken: "test_token" });
      const posts = await client.getPosts(10);

      expect(posts).toHaveLength(1);
      const post = posts[0]!;
      expect(post.platformPostId).toBe("video123");
      expect(post.platform).toBe("TIKTOK");
      expect(post.content).toBe("Test description");
      expect(post.url).toBe("https://tiktok.com/@user/video/123");
      expect(post.metrics?.likes).toBe(1000);
      expect(post.metrics?.comments).toBe(50);
      expect(post.metrics?.shares).toBe(25);
      expect(post.metrics?.impressions).toBe(10000);
    });

    it("should throw TikTokHttpError on API failure", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({ message: "Server error" }),
      });

      const client = new TikTokClient({ accessToken: "test_token" });
      await expect(client.getPosts()).rejects.toThrow(TikTokHttpError);
    });

    it("should use title as content when description is empty", async () => {
      const mockVideoResponse = {
        data: {
          videos: [
            {
              id: "video123",
              title: "Video Title",
              cover_image_url: "https://tiktok.com/cover.jpg",
              create_time: 1704067200,
              duration: 60,
              share_url: "https://tiktok.com/@user/video/123",
              video_description: "",
              like_count: 100,
              comment_count: 5,
              share_count: 2,
              view_count: 1000,
            },
          ],
          cursor: 0,
          has_more: false,
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockVideoResponse,
      });

      const client = new TikTokClient({ accessToken: "test_token" });
      const posts = await client.getPosts();

      expect(posts[0]!.content).toBe("Video Title");
    });
  });

  describe("deletePost", () => {
    it("should delete a video", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const client = new TikTokClient({ accessToken: "test_token" });
      await expect(client.deletePost("video123")).resolves.toBeUndefined();

      expect(global.fetch).toHaveBeenCalledWith(
        "https://open.tiktokapis.com/v2/post/publish/video/delete/",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ video_id: "video123" }),
        }),
      );
    });

    it("should throw TikTokHttpError on delete failure", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: async () => ({ message: "Video not found" }),
      });

      const client = new TikTokClient({ accessToken: "test_token" });
      await expect(client.deletePost("nonexistent")).rejects.toThrow(TikTokHttpError);
    });
  });

  describe("getMetrics", () => {
    it("should return aggregated metrics", async () => {
      // Mock getAccountInfo
      const mockUserResponse = {
        data: {
          user: {
            open_id: "user123",
            union_id: "union123",
            avatar_url: "https://tiktok.com/avatar.jpg",
            display_name: "Test User",
            username: "testuser",
            follower_count: 1000,
            following_count: 500,
            video_count: 50,
          },
        },
      };

      // Mock getPosts
      const mockVideoResponse = {
        data: {
          videos: [
            {
              id: "video1",
              title: "Video 1",
              cover_image_url: "https://tiktok.com/cover1.jpg",
              create_time: 1704067200,
              duration: 60,
              share_url: "https://tiktok.com/@user/video/1",
              video_description: "Description 1",
              like_count: 100,
              comment_count: 10,
              share_count: 5,
              view_count: 1000,
            },
            {
              id: "video2",
              title: "Video 2",
              cover_image_url: "https://tiktok.com/cover2.jpg",
              create_time: 1704153600,
              duration: 30,
              share_url: "https://tiktok.com/@user/video/2",
              video_description: "Description 2",
              like_count: 200,
              comment_count: 20,
              share_count: 10,
              view_count: 2000,
            },
          ],
          cursor: 0,
          has_more: false,
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockVideoResponse,
        });

      const client = new TikTokClient({ accessToken: "test_token" });
      const metrics = await client.getMetrics();

      expect(metrics.followers).toBe(1000);
      expect(metrics.following).toBe(500);
      expect(metrics.postsCount).toBe(2);
      expect(metrics.impressions).toBe(3000);
    });
  });

  describe("getVideoAnalytics", () => {
    it("should return video analytics", async () => {
      const mockVideoResponse = {
        data: {
          videos: [
            {
              id: "video123",
              title: "Test Video",
              cover_image_url: "https://tiktok.com/cover.jpg",
              create_time: 1704067200,
              duration: 60,
              share_url: "https://tiktok.com/@user/video/123",
              video_description: "Test description",
              like_count: 1000,
              comment_count: 50,
              share_count: 25,
              view_count: 10000,
            },
          ],
          cursor: 0,
          has_more: false,
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockVideoResponse,
      });

      const client = new TikTokClient({ accessToken: "test_token" });
      const analytics = await client.getVideoAnalytics("video123");

      expect(analytics).not.toBeNull();
      expect(analytics?.id).toBe("video123");
      expect(analytics?.statistics.viewCount).toBe(10000);
      expect(analytics?.statistics.likeCount).toBe(1000);
    });

    it("should return null when video not found", async () => {
      const mockVideoResponse = {
        data: {
          videos: [],
          cursor: 0,
          has_more: false,
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockVideoResponse,
      });

      const client = new TikTokClient({ accessToken: "test_token" });
      const analytics = await client.getVideoAnalytics("nonexistent");

      expect(analytics).toBeNull();
    });
  });

  describe("getTrendingHashtags", () => {
    it("should return empty array (API not available)", async () => {
      const client = new TikTokClient({ accessToken: "test_token" });
      const trends = await client.getTrendingHashtags();

      expect(trends).toEqual([]);
    });
  });

  describe("getTrendingSounds", () => {
    it("should return empty array (API not available)", async () => {
      const client = new TikTokClient({ accessToken: "test_token" });
      const sounds = await client.getTrendingSounds();

      expect(sounds).toEqual([]);
    });
  });
});

describe("TikTokHttpError", () => {
  it("should include status and statusText", () => {
    const error = new TikTokHttpError("Test error", 404, "Not Found");

    expect(error.message).toBe("Test error");
    expect(error.status).toBe(404);
    expect(error.statusText).toBe("Not Found");
    expect(error.name).toBe("TikTokHttpError");
  });
});
