/**
 * Pinterest API Client Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PinterestClient, PinterestHttpError } from "./pinterest";

// Mock environment variables
const mockEnv = {
  PINTEREST_APP_ID: "test_app_id",
  PINTEREST_APP_SECRET: "test_app_secret",
};

describe("PinterestClient", () => {
  beforeEach(() => {
    vi.stubEnv("PINTEREST_APP_ID", mockEnv.PINTEREST_APP_ID);
    vi.stubEnv("PINTEREST_APP_SECRET", mockEnv.PINTEREST_APP_SECRET);
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should create client with platform PINTEREST", () => {
      const client = new PinterestClient();
      expect(client.platform).toBe("PINTEREST");
    });

    it("should accept access token and board ID in options", () => {
      const client = new PinterestClient({
        accessToken: "test_token",
        boardId: "board123",
      });
      expect(client.platform).toBe("PINTEREST");
    });
  });

  describe("setAccessToken", () => {
    it("should set access token", () => {
      const client = new PinterestClient();
      client.setAccessToken("new_token");
      expect(client.platform).toBe("PINTEREST");
    });
  });

  describe("setDefaultBoard", () => {
    it("should set default board ID", () => {
      const client = new PinterestClient();
      client.setDefaultBoard("board123");
      expect(client.platform).toBe("PINTEREST");
    });
  });

  describe("getAuthUrl", () => {
    it("should generate valid Pinterest OAuth URL", () => {
      const client = new PinterestClient();
      const redirectUri = "https://app.com/callback";
      const state = "random_state";

      const authUrl = client.getAuthUrl(redirectUri, state);

      expect(authUrl).toContain("https://www.pinterest.com/oauth/");
      expect(authUrl).toContain(`client_id=${mockEnv.PINTEREST_APP_ID}`);
      expect(authUrl).toContain(
        `redirect_uri=${encodeURIComponent(redirectUri)}`,
      );
      expect(authUrl).toContain(`state=${state}`);
      expect(authUrl).toContain("response_type=code");
      expect(authUrl).toContain("scope=");
      expect(authUrl).toContain("pins%3Aread");
    });

    it("should throw error when PINTEREST_APP_ID is not configured", () => {
      vi.stubEnv("PINTEREST_APP_ID", "");
      const client = new PinterestClient();

      expect(() => client.getAuthUrl("https://app.com/callback", "state")).toThrow(
        "PINTEREST_APP_ID environment variable is not set",
      );
    });

    it("should trim whitespace from environment variable", () => {
      vi.stubEnv("PINTEREST_APP_ID", "  test_app_id_with_spaces  ");
      const client = new PinterestClient();
      const authUrl = client.getAuthUrl("https://app.com/callback", "state");

      expect(authUrl).toContain("client_id=test_app_id_with_spaces");
    });
  });

  describe("exchangeCodeForTokens", () => {
    it("should exchange authorization code for access token", async () => {
      const mockTokenResponse = {
        access_token: "mock_pinterest_access_token",
        expires_in: 31536000, // 365 days
        refresh_token: "mock_refresh_token",
        token_type: "bearer",
        scope: "pins:read,pins:write",
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      });

      const client = new PinterestClient();
      const result = await client.exchangeCodeForTokens(
        "auth_code",
        "https://app.com/callback",
      );

      expect(result.accessToken).toBe("mock_pinterest_access_token");
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.refreshToken).toBe("mock_refresh_token");
      expect(result.tokenType).toBe("bearer");
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.pinterest.com/v5/oauth/token",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: expect.stringContaining("Basic"),
          }),
        }),
      );
    });

    it("should use default expiry when not provided", async () => {
      const mockTokenResponse = {
        access_token: "mock_access_token",
        token_type: "bearer",
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      });

      const client = new PinterestClient();
      const result = await client.exchangeCodeForTokens("auth_code", "https://app.com/callback");

      expect(result.accessToken).toBe("mock_access_token");
      // Should default to 365 days
      const expectedDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      expect(result.expiresAt!.getTime()).toBeCloseTo(expectedDate.getTime(), -4);
    });

    it("should throw PinterestHttpError on failed token exchange", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: async () => ({ message: "Invalid code" }),
      });

      const client = new PinterestClient();
      await expect(
        client.exchangeCodeForTokens("bad_code", "https://app.com/callback"),
      ).rejects.toThrow(PinterestHttpError);
    });

    it("should throw error when credentials not configured", async () => {
      vi.stubEnv("PINTEREST_APP_ID", "");
      const client = new PinterestClient();

      await expect(
        client.exchangeCodeForTokens("code", "https://app.com/callback"),
      ).rejects.toThrow(
        "PINTEREST_APP_ID and PINTEREST_APP_SECRET environment variables are required",
      );
    });
  });

  describe("refreshAccessToken", () => {
    it("should refresh access token", async () => {
      const mockTokenResponse = {
        access_token: "new_access_token",
        expires_in: 31536000,
        refresh_token: "new_refresh_token",
        token_type: "bearer",
        scope: "pins:read",
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      });

      const client = new PinterestClient();
      const result = await client.refreshAccessToken("old_refresh_token");

      expect(result.accessToken).toBe("new_access_token");
      expect(result.refreshToken).toBe("new_refresh_token");
    });

    it("should throw PinterestHttpError on failed refresh", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({ message: "Invalid refresh token" }),
      });

      const client = new PinterestClient();
      await expect(
        client.refreshAccessToken("invalid_token"),
      ).rejects.toThrow(PinterestHttpError);
    });
  });

  describe("getAccountInfo", () => {
    it("should fetch Pinterest user information", async () => {
      const mockUserResponse = {
        username: "testuser",
        account_type: "BUSINESS",
        profile_image: "https://pinterest.com/avatar.jpg",
        website_url: "https://example.com",
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserResponse,
      });

      const client = new PinterestClient({ accessToken: "test_token" });
      const accountInfo = await client.getAccountInfo();

      expect(accountInfo.platformId).toBe("testuser");
      expect(accountInfo.username).toBe("testuser");
      expect(accountInfo.displayName).toBe("testuser");
      expect(accountInfo.avatarUrl).toBe("https://pinterest.com/avatar.jpg");
      expect(accountInfo.profileUrl).toBe("https://www.pinterest.com/testuser");
    });

    it("should throw error when access token not set", async () => {
      const client = new PinterestClient();
      await expect(client.getAccountInfo()).rejects.toThrow(
        "Access token is required",
      );
    });

    it("should throw PinterestHttpError on API failure", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({ message: "Invalid token" }),
      });

      const client = new PinterestClient({ accessToken: "test_token" });
      await expect(client.getAccountInfo()).rejects.toThrow(PinterestHttpError);
    });
  });

  describe("createPost", () => {
    it("should create a pin with board from options", async () => {
      const mockPinResponse = {
        id: "pin123",
        title: "Test Pin",
        description: "Test description",
        created_at: "2024-01-01T00:00:00Z",
        media: {
          images: {
            original: { url: "https://pinterest.com/image.jpg" },
          },
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPinResponse,
      });

      const client = new PinterestClient({ accessToken: "test_token" });
      const result = await client.createPost("Test description", {
        mediaUrls: ["https://example.com/image.jpg"],
        metadata: {
          board_id: "board123",
          title: "Test Pin",
        },
      });

      expect(result.platformPostId).toBe("pin123");
      expect(result.url).toBe("https://www.pinterest.com/pin/pin123");
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.pinterest.com/v5/pins",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("board123"),
        }),
      );
    });

    it("should use default board when not provided in options", async () => {
      const mockPinResponse = {
        id: "pin123",
        created_at: "2024-01-01T00:00:00Z",
        media: {},
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPinResponse,
      });

      const client = new PinterestClient({
        accessToken: "test_token",
        boardId: "default_board",
      });

      await client.createPost("Test", {
        mediaUrls: ["https://example.com/image.jpg"],
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining("default_board"),
        }),
      );
    });

    it("should throw error when board ID not provided", async () => {
      const client = new PinterestClient({ accessToken: "test_token" });

      await expect(
        client.createPost("Test", { mediaUrls: ["https://example.com/image.jpg"] }),
      ).rejects.toThrow("board_id is required");
    });

    it("should throw error when media URL not provided", async () => {
      const client = new PinterestClient({
        accessToken: "test_token",
        boardId: "board123",
      });

      await expect(client.createPost("Test")).rejects.toThrow(
        "Media URL is required",
      );
    });

    it("should throw PinterestHttpError on API failure", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: async () => ({ message: "Invalid image URL" }),
      });

      const client = new PinterestClient({
        accessToken: "test_token",
        boardId: "board123",
      });

      await expect(
        client.createPost("Test", { mediaUrls: ["https://example.com/bad.jpg"] }),
      ).rejects.toThrow(PinterestHttpError);
    });

    it("should include optional metadata fields", async () => {
      const mockPinResponse = {
        id: "pin123",
        created_at: "2024-01-01T00:00:00Z",
        media: {},
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPinResponse,
      });

      const client = new PinterestClient({
        accessToken: "test_token",
        boardId: "board123",
      });

      await client.createPost("Description", {
        mediaUrls: ["https://example.com/image.jpg"],
        metadata: {
          title: "Pin Title",
          link: "https://example.com",
          alt_text: "Image alt text",
        },
      });

      const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
      const body = JSON.parse(fetchCall[1].body);

      expect(body.title).toBe("Pin Title");
      expect(body.link).toBe("https://example.com");
      expect(body.alt_text).toBe("Image alt text");
    });
  });

  describe("getPosts", () => {
    it("should fetch user pins", async () => {
      const mockPinsResponse = {
        items: [
          {
            id: "pin123",
            title: "Test Pin",
            description: "Test description",
            created_at: "2024-01-01T00:00:00Z",
            media: {
              images: {
                original: { url: "https://pinterest.com/image.jpg" },
              },
            },
          },
        ],
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPinsResponse,
      });

      const client = new PinterestClient({ accessToken: "test_token" });
      const posts = await client.getPosts(10);

      expect(posts).toHaveLength(1);
      const post = posts[0]!;
      expect(post.platformPostId).toBe("pin123");
      expect(post.platform).toBe("PINTEREST");
      expect(post.content).toBe("Test description");
      expect(post.url).toBe("https://www.pinterest.com/pin/pin123");
      expect(post.mediaUrls).toEqual(["https://pinterest.com/image.jpg"]);
    });

    it("should use title as content when description is empty", async () => {
      const mockPinsResponse = {
        items: [
          {
            id: "pin123",
            title: "Pin Title",
            description: "",
            created_at: "2024-01-01T00:00:00Z",
            media: {},
          },
        ],
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPinsResponse,
      });

      const client = new PinterestClient({ accessToken: "test_token" });
      const posts = await client.getPosts();

      expect(posts[0]!.content).toBe("Pin Title");
    });

    it("should limit page size to 250", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
      });

      const client = new PinterestClient({ accessToken: "test_token" });
      await client.getPosts(500);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("page_size=250"),
        expect.anything(),
      );
    });

    it("should throw PinterestHttpError on API failure", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({ message: "Server error" }),
      });

      const client = new PinterestClient({ accessToken: "test_token" });
      await expect(client.getPosts()).rejects.toThrow(PinterestHttpError);
    });
  });

  describe("deletePost", () => {
    it("should delete a pin", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const client = new PinterestClient({ accessToken: "test_token" });
      await expect(client.deletePost("pin123")).resolves.toBeUndefined();

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.pinterest.com/v5/pins/pin123",
        expect.objectContaining({ method: "DELETE" }),
      );
    });

    it("should throw PinterestHttpError on delete failure", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: async () => ({ message: "Pin not found" }),
      });

      const client = new PinterestClient({ accessToken: "test_token" });
      await expect(client.deletePost("nonexistent")).rejects.toThrow(PinterestHttpError);
    });
  });

  describe("getMetrics", () => {
    it("should fetch account analytics", async () => {
      const mockAnalyticsResponse = {
        all: {
          metrics: {
            IMPRESSION: 10000,
            SAVE: 500,
            PIN_CLICK: 200,
          },
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalyticsResponse,
      });

      const client = new PinterestClient({ accessToken: "test_token" });
      const metrics = await client.getMetrics();

      expect(metrics.impressions).toBe(10000);
      expect(metrics.followers).toBe(0); // Pinterest doesn't provide this
    });

    it("should handle missing metrics", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const client = new PinterestClient({ accessToken: "test_token" });
      const metrics = await client.getMetrics();

      expect(metrics.impressions).toBe(0);
      expect(metrics.followers).toBe(0);
    });

    it("should throw PinterestHttpError on API failure", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        json: async () => ({ message: "Analytics access denied" }),
      });

      const client = new PinterestClient({ accessToken: "test_token" });
      await expect(client.getMetrics()).rejects.toThrow(PinterestHttpError);
    });
  });

  describe("listBoards", () => {
    it("should fetch user boards", async () => {
      const mockBoardsResponse = {
        items: [
          {
            id: "board123",
            name: "Test Board",
            description: "Test description",
            owner: { username: "testuser" },
            privacy: "PUBLIC",
            pin_count: 50,
            follower_count: 100,
            created_at: "2024-01-01T00:00:00Z",
          },
        ],
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBoardsResponse,
      });

      const client = new PinterestClient({ accessToken: "test_token" });
      const boards = await client.listBoards();

      expect(boards).toHaveLength(1);
      expect(boards[0]!.id).toBe("board123");
      expect(boards[0]!.name).toBe("Test Board");
    });

    it("should limit page size to 250", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
      });

      const client = new PinterestClient({ accessToken: "test_token" });
      await client.listBoards(500);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("page_size=250"),
        expect.anything(),
      );
    });

    it("should throw PinterestHttpError on API failure", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({ message: "Invalid token" }),
      });

      const client = new PinterestClient({ accessToken: "test_token" });
      await expect(client.listBoards()).rejects.toThrow(PinterestHttpError);
    });
  });

  describe("createBoard", () => {
    it("should create a new board", async () => {
      const mockBoardResponse = {
        id: "board123",
        name: "New Board",
        description: "Board description",
        privacy: "public",
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBoardResponse,
      });

      const client = new PinterestClient({ accessToken: "test_token" });
      const board = await client.createBoard("New Board", "Board description", "PUBLIC");

      expect(board.id).toBe("board123");
      expect(board.name).toBe("New Board");
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.pinterest.com/v5/boards",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("public"),
        }),
      );
    });

    it("should throw PinterestHttpError on API failure", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: async () => ({ message: "Board name too long" }),
      });

      const client = new PinterestClient({ accessToken: "test_token" });
      await expect(client.createBoard("x".repeat(200))).rejects.toThrow(PinterestHttpError);
    });
  });

  describe("updateBoard", () => {
    it("should update an existing board", async () => {
      const mockBoardResponse = {
        id: "board123",
        name: "Updated Board",
        description: "Updated description",
        privacy: "secret",
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBoardResponse,
      });

      const client = new PinterestClient({ accessToken: "test_token" });
      const board = await client.updateBoard("board123", {
        name: "Updated Board",
        description: "Updated description",
        privacy: "SECRET",
      });

      expect(board.name).toBe("Updated Board");
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.pinterest.com/v5/boards/board123",
        expect.objectContaining({ method: "PATCH" }),
      );
    });

    it("should throw PinterestHttpError on API failure", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: async () => ({ message: "Board not found" }),
      });

      const client = new PinterestClient({ accessToken: "test_token" });
      await expect(
        client.updateBoard("nonexistent", { name: "New Name" }),
      ).rejects.toThrow(PinterestHttpError);
    });
  });

  describe("deleteBoard", () => {
    it("should delete a board", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const client = new PinterestClient({ accessToken: "test_token" });
      await expect(client.deleteBoard("board123")).resolves.toBeUndefined();

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.pinterest.com/v5/boards/board123",
        expect.objectContaining({ method: "DELETE" }),
      );
    });

    it("should throw PinterestHttpError on delete failure", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: async () => ({ message: "Board not found" }),
      });

      const client = new PinterestClient({ accessToken: "test_token" });
      await expect(client.deleteBoard("nonexistent")).rejects.toThrow(PinterestHttpError);
    });
  });

  describe("movePinToBoard", () => {
    it("should move a pin to a different board", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const client = new PinterestClient({ accessToken: "test_token" });
      await expect(client.movePinToBoard("pin123", "board456")).resolves.toBeUndefined();

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.pinterest.com/v5/pins/pin123",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ board_id: "board456" }),
        }),
      );
    });

    it("should throw PinterestHttpError on move failure", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: async () => ({ message: "Pin or board not found" }),
      });

      const client = new PinterestClient({ accessToken: "test_token" });
      await expect(
        client.movePinToBoard("nonexistent", "board123"),
      ).rejects.toThrow(PinterestHttpError);
    });
  });

  describe("getPinAnalytics", () => {
    it("should fetch pin analytics", async () => {
      const mockAnalyticsResponse = {
        all: {
          metrics: {
            IMPRESSION: 5000,
            SAVE: 200,
            PIN_CLICK: 100,
            OUTBOUND_CLICK: 50,
          },
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalyticsResponse,
      });

      const client = new PinterestClient({ accessToken: "test_token" });
      const metrics = await client.getPinAnalytics("pin123");

      expect(metrics.pin_id).toBe("pin123");
      expect(metrics.impression).toBe(5000);
      expect(metrics.save).toBe(200);
      expect(metrics.pin_click).toBe(100);
      expect(metrics.outbound_click).toBe(50);
    });

    it("should handle missing metrics", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const client = new PinterestClient({ accessToken: "test_token" });
      const metrics = await client.getPinAnalytics("pin123");

      expect(metrics.impression).toBe(0);
      expect(metrics.save).toBe(0);
    });

    it("should throw PinterestHttpError on API failure", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: async () => ({ message: "Pin not found" }),
      });

      const client = new PinterestClient({ accessToken: "test_token" });
      await expect(client.getPinAnalytics("nonexistent")).rejects.toThrow(PinterestHttpError);
    });
  });
});

describe("PinterestHttpError", () => {
  it("should include status and statusText", () => {
    const error = new PinterestHttpError("Test error", 404, "Not Found");

    expect(error.message).toBe("Test error");
    expect(error.status).toBe(404);
    expect(error.statusText).toBe("Not Found");
    expect(error.name).toBe("PinterestHttpError");
  });
});
