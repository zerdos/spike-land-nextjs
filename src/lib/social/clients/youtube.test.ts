/**
 * YouTube API Client Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { YouTubeClient } from "./youtube";

// Mock environment variables
const mockEnv = {
  YOUTUBE_CLIENT_ID: "test_client_id",
  GOOGLE_CLIENT_ID: "test_google_client_id",
  YOUTUBE_CLIENT_SECRET: "test_client_secret",
  GOOGLE_CLIENT_SECRET: "test_google_client_secret",
  YOUTUBE_CALLBACK_URL: "https://test.com/callback",
};

describe("YouTubeClient", () => {
  beforeEach(() => {
    // Set up environment variables
    vi.stubEnv("YOUTUBE_CLIENT_ID", mockEnv.YOUTUBE_CLIENT_ID);
    vi.stubEnv("GOOGLE_CLIENT_ID", mockEnv.GOOGLE_CLIENT_ID);
    vi.stubEnv("YOUTUBE_CLIENT_SECRET", mockEnv.YOUTUBE_CLIENT_SECRET);
    vi.stubEnv("GOOGLE_CLIENT_SECRET", mockEnv.GOOGLE_CLIENT_SECRET);
    vi.stubEnv("YOUTUBE_CALLBACK_URL", mockEnv.YOUTUBE_CALLBACK_URL);

    // Mock fetch
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should create client with platform YOUTUBE", () => {
      const client = new YouTubeClient();
      expect(client.platform).toBe("YOUTUBE");
    });

    it("should accept access token and channel ID in options", () => {
      const client = new YouTubeClient({
        accessToken: "test_token",
        accountId: "UC1234567890",
      });
      expect(client.platform).toBe("YOUTUBE");
    });
  });

  describe("getAuthUrl", () => {
    it("should generate valid Google OAuth URL with YouTube scopes", () => {
      const client = new YouTubeClient();
      const redirectUri = "https://app.com/callback";
      const state = "random_state";

      const authUrl = client.getAuthUrl(redirectUri, state);

      expect(authUrl).toContain("https://accounts.google.com/o/oauth2/v2/auth");
      expect(authUrl).toContain(`client_id=${mockEnv.YOUTUBE_CLIENT_ID}`);
      expect(authUrl).toContain(`redirect_uri=${encodeURIComponent(redirectUri)}`);
      expect(authUrl).toContain(`state=${state}`);
      expect(authUrl).toContain("response_type=code");
      expect(authUrl).toContain("scope=");
      expect(authUrl).toContain("youtube.readonly");
    });
  });

  describe("exchangeCodeForTokens", () => {
    it("should exchange authorization code for access token", async () => {
      const mockTokenResponse = {
        access_token: "mock_youtube_access_token",
        expires_in: 3600,
        refresh_token: "mock_refresh_token",
        token_type: "Bearer",
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      });

      const client = new YouTubeClient();
      const result = await client.exchangeCodeForTokens(
        "auth_code",
        "https://app.com/callback",
      );

      expect(result.accessToken).toBe("mock_youtube_access_token");
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.refreshToken).toBe("mock_refresh_token");
      expect(result.tokenType).toBe("Bearer");
      expect(global.fetch).toHaveBeenCalledWith(
        "https://oauth2.googleapis.com/token",
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

      const client = new YouTubeClient();
      await expect(
        client.exchangeCodeForTokens("bad_code", "https://app.com/callback"),
      ).rejects.toThrow();
    });
  });

  describe("getAccountInfo", () => {
    it("should fetch YouTube channel information", async () => {
      const mockChannelResponse = {
        items: [
          {
            id: "UC1234567890",
            snippet: {
              title: "Test Channel",
              customUrl: "@testchannel",
              thumbnails: {
                default: {
                  url: "https://yt3.ggpht.com/test-avatar.jpg",
                },
              },
            },
            statistics: {
              subscriberCount: "10000",
              videoCount: "50",
            },
          },
        ],
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockChannelResponse,
      });

      const client = new YouTubeClient({
        accessToken: "test_token",
      });

      const accountInfo = await client.getAccountInfo();

      expect(accountInfo.platformId).toBe("UC1234567890");
      expect(accountInfo.displayName).toBe("Test Channel");
      expect(accountInfo.username).toBe("@testchannel");
      expect(accountInfo.avatarUrl).toBe("https://yt3.ggpht.com/test-avatar.jpg");
      expect(accountInfo.followersCount).toBe(10000);
    });

    it("should throw error when no channel is found", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
      });

      const client = new YouTubeClient({
        accessToken: "test_token",
      });

      await expect(client.getAccountInfo()).rejects.toThrow("No YouTube channel found");
    });
  });

  describe("createPost", () => {
    it("should throw error indicating video uploads are not supported via API", async () => {
      const client = new YouTubeClient({
        accessToken: "test_token",
        accountId: "UC1234567890",
      });

      await expect(
        client.createPost("Test video"),
      ).rejects.toThrow("does not support direct post creation");
    });
  });

  describe("getPosts", () => {
    it("should fetch channel videos with statistics", async () => {
      const mockSearchResponse = {
        items: [
          {
            id: { kind: "youtube#video", videoId: "abc123" },
            snippet: {
              title: "Test Video",
              publishedAt: "2024-01-01T00:00:00Z",
              thumbnails: {
                high: {
                  url: "https://i.ytimg.com/vi/abc123/hqdefault.jpg",
                },
              },
            },
            etag: "test_etag",
          },
        ],
      };

      const mockVideoResponse = {
        items: [
          {
            id: "abc123",
            snippet: {
              title: "Test Video",
              publishedAt: "2024-01-01T00:00:00Z",
              thumbnails: {
                high: {
                  url: "https://i.ytimg.com/vi/abc123/hqdefault.jpg",
                },
              },
            },
            statistics: {
              viewCount: "1000",
              likeCount: "50",
              commentCount: "10",
            },
          },
        ],
      };

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSearchResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockVideoResponse,
        });

      const client = new YouTubeClient({
        accessToken: "test_token",
        accountId: "UC1234567890",
      });

      const posts = await client.getPosts(10);

      expect(posts).toHaveLength(1);
      const post = posts[0]!;
      expect(post.platformPostId).toBe("abc123");
      expect(post.content).toBe("Test Video");
      expect(post.platform).toBe("YOUTUBE");
      expect(post.url).toBe("https://www.youtube.com/watch?v=abc123");
      expect(post.metrics?.likes).toBe(50);
      expect(post.metrics?.impressions).toBe(1000);
    });

    it("should fallback to search results when statistics fetch fails", async () => {
      const mockSearchResponse = {
        items: [
          {
            id: { kind: "youtube#video", videoId: "abc123" },
            snippet: {
              title: "Test Video",
              publishedAt: "2024-01-01T00:00:00Z",
            },
            etag: "test_etag",
          },
        ],
      };

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSearchResponse,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        });

      const client = new YouTubeClient({
        accessToken: "test_token",
        accountId: "UC1234567890",
      });

      const posts = await client.getPosts(10);

      expect(posts).toHaveLength(1);
      const post = posts[0]!;
      expect(post.platformPostId).toBe("abc123");
      expect(post.platform).toBe("YOUTUBE");
    });
  });

  describe("getMetrics", () => {
    it("should fetch channel statistics", async () => {
      const mockChannelResponse = {
        items: [
          {
            statistics: {
              subscriberCount: "15000",
              videoCount: "75",
              viewCount: "500000",
            },
          },
        ],
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockChannelResponse,
      });

      const client = new YouTubeClient({
        accessToken: "test_token",
        accountId: "UC1234567890",
      });

      const metrics = await client.getMetrics();

      expect(metrics.followers).toBe(15000);
      expect(metrics.postsCount).toBe(75);
      expect(metrics.impressions).toBe(500000);
      expect(metrics.following).toBe(0);
    });
  });
});
