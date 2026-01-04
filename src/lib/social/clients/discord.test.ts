/**
 * Discord Bot API Client Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DiscordClient } from "./discord";

// Mock environment variables
const mockEnv = {
  DISCORD_BOT_TOKEN: "test_bot_token_12345",
  DISCORD_SERVER_ID: "987654321",
  DISCORD_ANNOUNCEMENT_CHANNEL_ID: "123456789",
};

describe("DiscordClient", () => {
  beforeEach(() => {
    // Set up environment variables
    vi.stubEnv("DISCORD_BOT_TOKEN", mockEnv.DISCORD_BOT_TOKEN);
    vi.stubEnv("DISCORD_SERVER_ID", mockEnv.DISCORD_SERVER_ID);
    vi.stubEnv("DISCORD_ANNOUNCEMENT_CHANNEL_ID", mockEnv.DISCORD_ANNOUNCEMENT_CHANNEL_ID);

    // Mock fetch
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should throw error when bot token is missing", () => {
      vi.stubEnv("DISCORD_BOT_TOKEN", "");

      expect(() => new DiscordClient()).toThrow(
        "DISCORD_BOT_TOKEN environment variable is not configured",
      );
    });

    it("should throw error when server ID is missing", () => {
      vi.stubEnv("DISCORD_SERVER_ID", "");

      expect(() => new DiscordClient()).toThrow(
        "DISCORD_SERVER_ID environment variable is not configured",
      );
    });

    it("should create client with valid bot token and server ID", () => {
      const client = new DiscordClient();
      expect(client).toBeDefined();
    });

    it("should accept bot token and guild ID in options", () => {
      const client = new DiscordClient({
        botToken: "custom_bot_token",
        guildId: "custom_guild_id",
      });
      expect(client).toBeDefined();
    });
  });

  describe("getGuildInfo", () => {
    it("should fetch Discord guild information", async () => {
      const mockGuildResponse = {
        id: "987654321",
        name: "Test Server",
        icon: "test_icon_hash",
        description: "A test Discord server",
        owner_id: "111111111",
        premium_tier: 2,
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockGuildResponse,
      });

      const client = new DiscordClient();
      const guildInfo = await client.getGuildInfo();

      expect(guildInfo.id).toBe("987654321");
      expect(guildInfo.name).toBe("Test Server");
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/guilds/987654321"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bot ${mockEnv.DISCORD_BOT_TOKEN}`,
          }),
        }),
      );
    });

    it("should throw error on failed API request", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ message: "Missing Permissions" }),
      });

      const client = new DiscordClient();
      await expect(client.getGuildInfo()).rejects.toThrow();
    });
  });

  describe("sendMessage", () => {
    it("should send a text message successfully", async () => {
      const mockMessageResponse = {
        id: "msg_12345",
        channel_id: "123456789",
        content: "Test announcement",
        timestamp: "2024-01-01T00:00:00.000Z",
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMessageResponse,
      });

      const client = new DiscordClient();
      const result = await client.sendMessage(
        "123456789",
        "Test announcement",
      );

      expect(result.id).toBe("msg_12345");
      expect(result.content).toBe("Test announcement");
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/channels/123456789/messages"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: `Bot ${mockEnv.DISCORD_BOT_TOKEN}`,
            "Content-Type": "application/json",
          }),
        }),
      );
    });

    it("should send a message with embeds", async () => {
      const mockMessageResponse = {
        id: "msg_12345",
        channel_id: "123456789",
        embeds: [
          {
            title: "Announcement",
            description: "Important update",
            color: 0x5865f2,
          },
        ],
        timestamp: "2024-01-01T00:00:00.000Z",
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMessageResponse,
      });

      const client = new DiscordClient();
      const result = await client.sendMessage("123456789", "", {
        embeds: [
          {
            title: "Announcement",
            description: "Important update",
            color: 0x5865f2,
          },
        ],
      });

      expect(result.id).toBe("msg_12345");
      expect(result.embeds).toHaveLength(1);
    });

    it("should throw error when both content and embeds are empty", async () => {
      const client = new DiscordClient();
      await expect(client.sendMessage("123456789", "")).rejects.toThrow(
        "Either content or embeds must be provided",
      );
    });
  });

  describe("getMetrics", () => {
    it("should fetch server metrics", async () => {
      const mockGuildResponse = {
        id: "987654321",
        name: "Test Server",
        approximate_member_count: 2000,
        approximate_presence_count: 750,
        icon: "test_icon",
        premium_tier: 2,
        premium_subscription_count: 10,
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockGuildResponse,
      });

      const client = new DiscordClient();
      const metrics = await client.getMetrics();

      expect(metrics.memberCount).toBe(2000);
      expect(metrics.onlineCount).toBe(750);
      expect(metrics.serverName).toBe("Test Server");
      expect(metrics.premiumTier).toBe(2);
      expect(metrics.boostCount).toBe(10);
    });
  });

  describe("error handling", () => {
    it("should handle rate limiting", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({
          "Retry-After": "5",
        }),
        json: async () => ({
          message: "You are being rate limited.",
          retry_after: 5.0,
        }),
      });

      const client = new DiscordClient();
      await expect(client.getGuildInfo()).rejects.toThrow();
    });

    it("should handle unauthorized errors", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          message: "401: Unauthorized",
        }),
      });

      const client = new DiscordClient();
      await expect(client.getGuildInfo()).rejects.toThrow();
    });
  });
});
