import { NextRequest } from "next/server";
import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/mcp/api-key-manager", () => ({
  getApiKey: vi.fn(),
  revokeApiKey: vi.fn(),
}));

import { auth } from "@/auth";
import { getApiKey, revokeApiKey } from "@/lib/mcp/api-key-manager";
import { DELETE, GET } from "./route";

describe("API Key [id] Route", () => {
  const testUserId = "user-123";
  const testKeyId = "key-456";
  const mockDate = new Date("2025-01-15T12:00:00Z");

  // Helper to create route params
  function createParams(id: string) {
    return { params: Promise.resolve({ id }) };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/settings/api-keys/[id]", () => {
    it("returns 401 when user is not authenticated", async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/settings/api-keys/key-123",
      );
      const response = await GET(request, createParams(testKeyId));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 401 when session has no user id", async () => {
      (auth as Mock).mockResolvedValue({ user: {} });

      const request = new NextRequest(
        "http://localhost:3000/api/settings/api-keys/key-123",
      );
      const response = await GET(request, createParams(testKeyId));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 404 when API key is not found", async () => {
      (auth as Mock).mockResolvedValue({ user: { id: testUserId } });
      (getApiKey as Mock).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/settings/api-keys/nonexistent",
      );
      const response = await GET(request, createParams("nonexistent"));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("API key not found");
      expect(getApiKey).toHaveBeenCalledWith(testUserId, "nonexistent");
    });

    it("returns API key details successfully", async () => {
      (auth as Mock).mockResolvedValue({ user: { id: testUserId } });
      (getApiKey as Mock).mockResolvedValue({
        id: testKeyId,
        name: "Production Key",
        keyPrefix: "sk_live...****",
        lastUsedAt: mockDate,
        isActive: true,
        createdAt: mockDate,
      });

      const request = new NextRequest(
        `http://localhost:3000/api/settings/api-keys/${testKeyId}`,
      );
      const response = await GET(request, createParams(testKeyId));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.apiKey).toEqual({
        id: testKeyId,
        name: "Production Key",
        keyPrefix: "sk_live...****",
        lastUsedAt: mockDate.toISOString(),
        isActive: true,
        createdAt: mockDate.toISOString(),
      });
      expect(getApiKey).toHaveBeenCalledWith(testUserId, testKeyId);
    });

    it("returns API key with null lastUsedAt", async () => {
      (auth as Mock).mockResolvedValue({ user: { id: testUserId } });
      (getApiKey as Mock).mockResolvedValue({
        id: testKeyId,
        name: "New Key",
        keyPrefix: "sk_test...****",
        lastUsedAt: null,
        isActive: true,
        createdAt: mockDate,
      });

      const request = new NextRequest(
        `http://localhost:3000/api/settings/api-keys/${testKeyId}`,
      );
      const response = await GET(request, createParams(testKeyId));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.apiKey.lastUsedAt).toBeNull();
    });

    it("returns 500 when getApiKey throws", async () => {
      (auth as Mock).mockResolvedValue({ user: { id: testUserId } });
      (getApiKey as Mock).mockRejectedValue(new Error("Database error"));

      const request = new NextRequest(
        `http://localhost:3000/api/settings/api-keys/${testKeyId}`,
      );
      const response = await GET(request, createParams(testKeyId));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch API key");
    });
  });

  describe("DELETE /api/settings/api-keys/[id]", () => {
    it("returns 401 when user is not authenticated", async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost:3000/api/settings/api-keys/${testKeyId}`,
        {
          method: "DELETE",
        },
      );
      const response = await DELETE(request, createParams(testKeyId));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 401 when session has no user id", async () => {
      (auth as Mock).mockResolvedValue({ user: {} });

      const request = new NextRequest(
        `http://localhost:3000/api/settings/api-keys/${testKeyId}`,
        {
          method: "DELETE",
        },
      );
      const response = await DELETE(request, createParams(testKeyId));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 404 when API key is not found", async () => {
      (auth as Mock).mockResolvedValue({ user: { id: testUserId } });
      (revokeApiKey as Mock).mockResolvedValue({
        success: false,
        error: "API key not found",
      });

      const request = new NextRequest(
        `http://localhost:3000/api/settings/api-keys/nonexistent`,
        {
          method: "DELETE",
        },
      );
      const response = await DELETE(request, createParams("nonexistent"));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("API key not found");
      expect(revokeApiKey).toHaveBeenCalledWith(testUserId, "nonexistent");
    });

    it("returns 404 when API key is already revoked", async () => {
      (auth as Mock).mockResolvedValue({ user: { id: testUserId } });
      (revokeApiKey as Mock).mockResolvedValue({
        success: false,
        error: "API key is already revoked",
      });

      const request = new NextRequest(
        `http://localhost:3000/api/settings/api-keys/${testKeyId}`,
        {
          method: "DELETE",
        },
      );
      const response = await DELETE(request, createParams(testKeyId));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("API key is already revoked");
    });

    it("revokes API key successfully", async () => {
      (auth as Mock).mockResolvedValue({ user: { id: testUserId } });
      (revokeApiKey as Mock).mockResolvedValue({ success: true });

      const request = new NextRequest(
        `http://localhost:3000/api/settings/api-keys/${testKeyId}`,
        {
          method: "DELETE",
        },
      );
      const response = await DELETE(request, createParams(testKeyId));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("API key revoked successfully");
      expect(revokeApiKey).toHaveBeenCalledWith(testUserId, testKeyId);
    });

    it("returns 500 when revokeApiKey throws", async () => {
      (auth as Mock).mockResolvedValue({ user: { id: testUserId } });
      (revokeApiKey as Mock).mockRejectedValue(new Error("Database error"));

      const request = new NextRequest(
        `http://localhost:3000/api/settings/api-keys/${testKeyId}`,
        {
          method: "DELETE",
        },
      );
      const response = await DELETE(request, createParams(testKeyId));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to revoke API key");
    });
  });
});
