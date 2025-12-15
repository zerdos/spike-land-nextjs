import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/mcp/api-key-manager", () => ({
  listApiKeys: vi.fn(),
  createApiKey: vi.fn(),
  countActiveApiKeys: vi.fn(),
  MAX_API_KEYS_PER_USER: 10,
}));

import { auth } from "@/auth";
import {
  countActiveApiKeys,
  createApiKey,
  listApiKeys,
  MAX_API_KEYS_PER_USER,
} from "@/lib/mcp/api-key-manager";
import { GET, POST } from "./route";

describe("API Keys Settings Route", () => {
  const testUserId = "user-123";
  const mockDate = new Date("2025-01-15T12:00:00Z");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/settings/api-keys", () => {
    it("returns 401 when user is not authenticated", async () => {
      (auth as Mock).mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 401 when session has no user id", async () => {
      (auth as Mock).mockResolvedValue({ user: {} });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns empty array when user has no API keys", async () => {
      (auth as Mock).mockResolvedValue({ user: { id: testUserId } });
      (listApiKeys as Mock).mockResolvedValue([]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.apiKeys).toEqual([]);
      expect(listApiKeys).toHaveBeenCalledWith(testUserId);
    });

    it("returns list of API keys with formatted dates", async () => {
      (auth as Mock).mockResolvedValue({ user: { id: testUserId } });
      (listApiKeys as Mock).mockResolvedValue([
        {
          id: "key-1",
          name: "Production Key",
          keyPrefix: "sk_live...****",
          lastUsedAt: mockDate,
          isActive: true,
          createdAt: mockDate,
        },
        {
          id: "key-2",
          name: "Test Key",
          keyPrefix: "sk_test...****",
          lastUsedAt: null,
          isActive: false,
          createdAt: mockDate,
        },
      ]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.apiKeys).toHaveLength(2);
      expect(data.apiKeys[0]).toEqual({
        id: "key-1",
        name: "Production Key",
        keyPrefix: "sk_live...****",
        lastUsedAt: mockDate.toISOString(),
        isActive: true,
        createdAt: mockDate.toISOString(),
      });
      expect(data.apiKeys[1].lastUsedAt).toBeNull();
    });

    it("returns 500 when listApiKeys throws", async () => {
      (auth as Mock).mockResolvedValue({ user: { id: testUserId } });
      (listApiKeys as Mock).mockRejectedValue(new Error("Database error"));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch API keys");
    });
  });

  describe("POST /api/settings/api-keys", () => {
    it("returns 401 when user is not authenticated", async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/settings/api-keys",
        {
          method: "POST",
          body: JSON.stringify({ name: "Test Key" }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 400 when name is missing", async () => {
      (auth as Mock).mockResolvedValue({ user: { id: testUserId } });

      const request = new NextRequest(
        "http://localhost:3000/api/settings/api-keys",
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("API key name is required");
    });

    it("returns 400 when name is empty string", async () => {
      (auth as Mock).mockResolvedValue({ user: { id: testUserId } });

      const request = new NextRequest(
        "http://localhost:3000/api/settings/api-keys",
        {
          method: "POST",
          body: JSON.stringify({ name: "" }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("API key name is required");
    });

    it("returns 400 when name is whitespace only", async () => {
      (auth as Mock).mockResolvedValue({ user: { id: testUserId } });

      const request = new NextRequest(
        "http://localhost:3000/api/settings/api-keys",
        {
          method: "POST",
          body: JSON.stringify({ name: "   " }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("API key name is required");
    });

    it("returns 400 when name exceeds 50 characters", async () => {
      (auth as Mock).mockResolvedValue({ user: { id: testUserId } });

      const request = new NextRequest(
        "http://localhost:3000/api/settings/api-keys",
        {
          method: "POST",
          body: JSON.stringify({ name: "a".repeat(51) }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("API key name must be 50 characters or less");
    });

    it("returns 400 when user has reached max API keys limit", async () => {
      (auth as Mock).mockResolvedValue({ user: { id: testUserId } });
      (countActiveApiKeys as Mock).mockResolvedValue(MAX_API_KEYS_PER_USER);

      const request = new NextRequest(
        "http://localhost:3000/api/settings/api-keys",
        {
          method: "POST",
          body: JSON.stringify({ name: "New Key" }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Maximum of");
      expect(data.error).toContain("API keys allowed");
    });

    it("creates API key successfully and returns full key once", async () => {
      (auth as Mock).mockResolvedValue({ user: { id: testUserId } });
      (countActiveApiKeys as Mock).mockResolvedValue(0);
      (createApiKey as Mock).mockResolvedValue({
        id: "key-new",
        name: "My New Key",
        key: "sk_test_abc123xyz789fullkey",
        keyPrefix: "sk_test...****",
        createdAt: mockDate,
      });

      const request = new NextRequest(
        "http://localhost:3000/api/settings/api-keys",
        {
          method: "POST",
          body: JSON.stringify({ name: "My New Key" }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.apiKey).toEqual({
        id: "key-new",
        name: "My New Key",
        key: "sk_test_abc123xyz789fullkey",
        keyPrefix: "sk_test...****",
        createdAt: mockDate.toISOString(),
      });
      expect(data.message).toContain("API key created successfully");
      expect(data.message).toContain("will not be shown again");
      expect(createApiKey).toHaveBeenCalledWith(testUserId, "My New Key");
    });

    it("trims whitespace from key name", async () => {
      (auth as Mock).mockResolvedValue({ user: { id: testUserId } });
      (countActiveApiKeys as Mock).mockResolvedValue(0);
      (createApiKey as Mock).mockResolvedValue({
        id: "key-new",
        name: "Trimmed Key",
        key: "sk_test_fullkey",
        keyPrefix: "sk_test...****",
        createdAt: mockDate,
      });

      const request = new NextRequest(
        "http://localhost:3000/api/settings/api-keys",
        {
          method: "POST",
          body: JSON.stringify({ name: "  Trimmed Key  " }),
        },
      );

      await POST(request);

      expect(createApiKey).toHaveBeenCalledWith(testUserId, "Trimmed Key");
    });

    it("returns 500 when createApiKey throws", async () => {
      (auth as Mock).mockResolvedValue({ user: { id: testUserId } });
      (countActiveApiKeys as Mock).mockResolvedValue(0);
      (createApiKey as Mock).mockRejectedValue(new Error("Database error"));

      const request = new NextRequest(
        "http://localhost:3000/api/settings/api-keys",
        {
          method: "POST",
          body: JSON.stringify({ name: "Test Key" }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to create API key");
    });

    it("returns 500 when countActiveApiKeys throws", async () => {
      (auth as Mock).mockResolvedValue({ user: { id: testUserId } });
      (countActiveApiKeys as Mock).mockRejectedValue(
        new Error("Database error"),
      );

      const request = new NextRequest(
        "http://localhost:3000/api/settings/api-keys",
        {
          method: "POST",
          body: JSON.stringify({ name: "Test Key" }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to create API key");
    });
  });
});
