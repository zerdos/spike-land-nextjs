/**
 * Public Twitter API Client Tests
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicTwitterClient } from "./twitter";

// Mock global fetch
global.fetch = vi.fn();

describe("PublicTwitterClient", () => {
  let client: PublicTwitterClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new PublicTwitterClient();
  });

  describe("getAccountInfo", () => {
    it("should fetch account info successfully", async () => {
      const handle = "testuser";

      const mockRssResponse = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>TestUser (@testuser)</title>
    <link>https://nitter.net/testuser</link>
    <image>
      <url>https://example.com/avatar.jpg</url>
    </image>
  </channel>
</rss>`;

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        text: async () => mockRssResponse,
      } as Response);

      const result = await client.getAccountInfo(handle);

      expect(result).toEqual({
        handle,
        name: "TestUser",
        profileUrl: expect.stringContaining(handle),
        avatarUrl: "https://example.com/avatar.jpg",
      });
    });

    it("should return null when account not found", async () => {
      const handle = "nonexistent";

      const mockRssResponse = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
  </channel>
</rss>`;

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        text: async () => mockRssResponse,
      } as Response);

      const result = await client.getAccountInfo(handle);

      expect(result).toBeNull();
    });

    it("should retry with fallback instances on failure", async () => {
      const handle = "testuser";

      const mockRssResponse = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>TestUser (@testuser)</title>
    <link>https://nitter.net/testuser</link>
    <image>
      <url>https://example.com/avatar.jpg</url>
    </image>
  </channel>
</rss>`;

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: false,
          statusText: "Service Unavailable",
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          text: async () => mockRssResponse,
        } as Response);

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await client.getAccountInfo(handle);

      expect(result).not.toBeNull();
      expect(result?.name).toBe("TestUser");
      expect(global.fetch).toHaveBeenCalledTimes(2);

      consoleSpy.mockRestore();
    });

    it("should return null when all instances fail", async () => {
      const handle = "testuser";

      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        statusText: "Service Unavailable",
      } as Response);

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await client.getAccountInfo(handle);

      expect(result).toBeNull();

      consoleSpy.mockRestore();
    });

    it("should handle parsing errors", async () => {
      const handle = "testuser";

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        text: async () => "invalid xml",
      } as Response);

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await client.getAccountInfo(handle);

      expect(result).toBeNull();

      consoleSpy.mockRestore();
    });

    it("should handle missing avatar", async () => {
      const handle = "testuser";

      const mockRssResponse = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>TestUser (@testuser)</title>
    <link>https://nitter.net/testuser</link>
  </channel>
</rss>`;

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        text: async () => mockRssResponse,
      } as Response);

      const result = await client.getAccountInfo(handle);

      expect(result?.avatarUrl).toBe("");
    });
  });

  describe("getPosts", () => {
    it("should fetch posts successfully", async () => {
      const handle = "testuser";

      const mockRssResponse = `<?xml version="1.0"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <item>
      <link>https://nitter.net/testuser/status/123456789</link>
      <title>This is a test tweet</title>
      <description>💬 10 ♥ 100 🔁 5</description>
      <pubDate>Mon, 15 Jan 2024 10:00:00 GMT</pubDate>
      <dc:creator>@testuser</dc:creator>
    </item>
    <item>
      <link>https://nitter.net/testuser/status/987654321</link>
      <title>Another test tweet</title>
      <description>💬 20 ♥ 200 🔁 10</description>
      <pubDate>Tue, 16 Jan 2024 12:00:00 GMT</pubDate>
      <dc:creator>@testuser</dc:creator>
    </item>
  </channel>
</rss>`;

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        text: async () => mockRssResponse,
      } as Response);

      const result = await client.getPosts(handle);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: "123456789",
        content: "This is a test tweet",
        authorHandle: "testuser",
        likes: 100,
        comments: 10,
        shares: 5,
      });
      expect(result[1]).toMatchObject({
        id: "987654321",
        content: "Another test tweet",
        likes: 200,
        comments: 20,
        shares: 10,
      });
    });

    it("should return empty array when no posts found", async () => {
      const handle = "testuser";

      const mockRssResponse = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
  </channel>
</rss>`;

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        text: async () => mockRssResponse,
      } as Response);

      const result = await client.getPosts(handle);

      expect(result).toEqual([]);
    });

    it("should handle single post item", async () => {
      const handle = "testuser";

      const mockRssResponse = `<?xml version="1.0"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <item>
      <link>https://nitter.net/testuser/status/123#m</link>
      <title>Single tweet</title>
      <description>No stats here</description>
      <pubDate>Mon, 15 Jan 2024 10:00:00 GMT</pubDate>
      <dc:creator>@testuser</dc:creator>
    </item>
  </channel>
</rss>`;

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        text: async () => mockRssResponse,
      } as Response);

      const result = await client.getPosts(handle);

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe("123");
    });

    it("should handle posts without engagement stats", async () => {
      const handle = "testuser";

      const mockRssResponse = `<?xml version="1.0"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <item>
      <link>https://nitter.net/testuser/status/123</link>
      <title>Tweet without stats</title>
      <description>Just plain text</description>
      <pubDate>Mon, 15 Jan 2024 10:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        text: async () => mockRssResponse,
      } as Response);

      const result = await client.getPosts(handle);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        likes: 0,
        comments: 0,
        shares: 0,
      });
    });

    it("should handle posts with alternative heart emoji", async () => {
      const handle = "testuser";

      const mockRssResponse = `<?xml version="1.0"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <item>
      <link>https://nitter.net/testuser/status/123</link>
      <title>Test tweet</title>
      <description>♥️ 150</description>
      <pubDate>Mon, 15 Jan 2024 10:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        text: async () => mockRssResponse,
      } as Response);

      const result = await client.getPosts(handle);

      expect(result[0]?.likes).toBe(150);
    });

    it("should retry with fallback instances on failure", async () => {
      const handle = "testuser";

      const mockRssResponse = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <item>
      <link>https://nitter.net/testuser/status/123</link>
      <title>Test</title>
    </item>
  </channel>
</rss>`;

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: false,
          statusText: "Service Unavailable",
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          text: async () => mockRssResponse,
        } as Response);

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await client.getPosts(handle);

      expect(result).toHaveLength(1);
      expect(global.fetch).toHaveBeenCalledTimes(2);

      consoleSpy.mockRestore();
    });

    it("should return empty array when all instances fail", async () => {
      const handle = "testuser";

      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        statusText: "Service Unavailable",
      } as Response);

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await client.getPosts(handle);

      expect(result).toEqual([]);

      consoleSpy.mockRestore();
    });

    it("should parse counts with commas", async () => {
      const handle = "testuser";

      const mockRssResponse = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <item>
      <link>https://nitter.net/testuser/status/123</link>
      <title>Viral tweet</title>
      <description>💬 1,234 ♥ 5,678 🔁 910</description>
      <pubDate>Mon, 15 Jan 2024 10:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        text: async () => mockRssResponse,
      } as Response);

      const result = await client.getPosts(handle);

      expect(result[0]).toMatchObject({
        comments: 1234,
        likes: 5678,
        shares: 910,
      });
    });
  });

  describe("validateAccount", () => {
    it("should return true for valid account", async () => {
      const handle = "testuser";

      const mockRssResponse = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>TestUser (@testuser)</title>
    <link>https://nitter.net/testuser</link>
  </channel>
</rss>`;

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        text: async () => mockRssResponse,
      } as Response);

      const result = await client.validateAccount(handle);

      expect(result).toBe(true);
    });

    it("should return false for invalid account", async () => {
      const handle = "nonexistent";

      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        statusText: "Not Found",
      } as Response);

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await client.validateAccount(handle);

      expect(result).toBe(false);

      consoleSpy.mockRestore();
    });

    it("should return false when getAccountInfo throws", async () => {
      const handle = "testuser";

      vi.mocked(global.fetch).mockRejectedValue(new Error("Network error"));

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await client.validateAccount(handle);

      expect(result).toBe(false);

      consoleSpy.mockRestore();
    });
  });
});
