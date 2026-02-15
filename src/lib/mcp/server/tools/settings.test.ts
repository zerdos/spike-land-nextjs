import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = {
  apiKey: { findMany: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

const mockCreateApiKey = vi.fn();
const mockRevokeApiKey = vi.fn();

vi.mock("@/lib/mcp/api-key-manager", () => ({
  createApiKey: mockCreateApiKey,
  revokeApiKey: mockRevokeApiKey,
}));

import { createMockRegistry, getText } from "../__test-utils__";
import { registerSettingsTools } from "./settings";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("settings tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => { vi.clearAllMocks(); registry = createMockRegistry(); registerSettingsTools(registry, userId); });

  it("should register 5 settings tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(5);
  });

  describe("settings_list_api_keys", () => {
    it("should list API keys", async () => {
      mockPrisma.apiKey.findMany.mockResolvedValue([
        {
          id: "key-1", name: "Production Key", keyPrefix: "sk_live_abc",
          isActive: true, lastUsedAt: new Date("2024-06-01"),
          createdAt: new Date("2024-01-01"),
        },
        {
          id: "key-2", name: "Dev Key", keyPrefix: "sk_dev_xyz",
          isActive: false, lastUsedAt: null,
          createdAt: new Date("2024-02-01"),
        },
      ]);
      const handler = registry.handlers.get("settings_list_api_keys")!;
      const result = await handler({});
      expect(getText(result)).toContain("API Keys (2)");
      expect(getText(result)).toContain("Production Key");
      expect(getText(result)).toContain("Active");
      expect(getText(result)).toContain("sk_live_abc");
      expect(getText(result)).toContain("Dev Key");
      expect(getText(result)).toContain("Revoked");
      expect(getText(result)).toContain("never");
    });

    it("should return empty message when no API keys", async () => {
      mockPrisma.apiKey.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("settings_list_api_keys")!;
      const result = await handler({});
      expect(getText(result)).toContain("No API keys found");
    });

    it("should show last used date when available", async () => {
      mockPrisma.apiKey.findMany.mockResolvedValue([
        {
          id: "key-1", name: "Used Key", keyPrefix: "sk_live_used",
          isActive: true, lastUsedAt: new Date("2024-06-15T12:00:00Z"),
          createdAt: new Date("2024-01-01"),
        },
      ]);
      const handler = registry.handlers.get("settings_list_api_keys")!;
      const result = await handler({});
      expect(getText(result)).toContain("2024-06-15");
    });
  });

  describe("settings_create_api_key", () => {
    it("should create API key and show full key", async () => {
      mockCreateApiKey.mockResolvedValue({
        id: "key-new",
        name: "My New Key",
        key: "sk_live_full_secret_key_12345",
        keyPrefix: "sk_live_ful",
        createdAt: new Date("2024-06-01"),
      });
      const handler = registry.handlers.get("settings_create_api_key")!;
      const result = await handler({ name: "My New Key" });
      expect(getText(result)).toContain("API Key Created");
      expect(getText(result)).toContain("key-new");
      expect(getText(result)).toContain("My New Key");
      expect(getText(result)).toContain("sk_live_full_secret_key_12345");
      expect(getText(result)).toContain("sk_live_ful");
      expect(getText(result)).toContain("IMPORTANT");
      expect(getText(result)).toContain("not be shown again");
      expect(mockCreateApiKey).toHaveBeenCalledWith(userId, "My New Key");
    });

    it("should trim whitespace from name", async () => {
      mockCreateApiKey.mockResolvedValue({
        id: "key-trimmed", name: "Trimmed Key",
        key: "sk_live_trimmed_key", keyPrefix: "sk_live_tri",
        createdAt: new Date(),
      });
      const handler = registry.handlers.get("settings_create_api_key")!;
      await handler({ name: "  Trimmed Key  " });
      expect(mockCreateApiKey).toHaveBeenCalledWith(userId, "Trimmed Key");
    });
  });

  describe("settings_revoke_api_key", () => {
    it("should revoke API key successfully", async () => {
      mockRevokeApiKey.mockResolvedValue({ success: true });
      const handler = registry.handlers.get("settings_revoke_api_key")!;
      const result = await handler({ key_id: "key-1" });
      expect(getText(result)).toContain("API Key Revoked");
      expect(getText(result)).toContain("key-1");
      expect(mockRevokeApiKey).toHaveBeenCalledWith(userId, "key-1");
    });

    it("should return NOT_FOUND when key does not exist", async () => {
      mockRevokeApiKey.mockResolvedValue({ success: false, error: "API key not found" });
      const handler = registry.handlers.get("settings_revoke_api_key")!;
      const result = await handler({ key_id: "nonexistent" });
      expect(getText(result)).toContain("NOT_FOUND");
      expect(getText(result)).toContain("API key not found");
    });

    it("should return error when key is already revoked", async () => {
      mockRevokeApiKey.mockResolvedValue({ success: false, error: "API key is already revoked" });
      const handler = registry.handlers.get("settings_revoke_api_key")!;
      const result = await handler({ key_id: "key-revoked" });
      expect(getText(result)).toContain("NOT_FOUND");
      expect(getText(result)).toContain("already revoked");
    });

    it("should use default error message when error is undefined", async () => {
      mockRevokeApiKey.mockResolvedValue({ success: false });
      const handler = registry.handlers.get("settings_revoke_api_key")!;
      const result = await handler({ key_id: "key-unknown" });
      expect(getText(result)).toContain("NOT_FOUND");
      expect(getText(result)).toContain("API key not found");
    });
  });

  describe("settings_mcp_history", () => {
    it("should list MCP job history", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            jobs: [
              {
                id: "job-1",
                type: "GENERATE",
                status: "COMPLETED",
                prompt: "A cute cat",
                tokensCost: 100,
                createdAt: "2025-01-01T00:00:00Z",
              },
            ],
            total: 1,
            hasMore: false,
          }),
      });

      const handler = registry.handlers.get("settings_mcp_history")!;
      const result = await handler({ limit: 12, offset: 0 });
      const text = getText(result);
      expect(text).toContain("MCP History");
      expect(text).toContain("1 of 1");
      expect(text).toContain("GENERATE");
      expect(text).toContain("COMPLETED");
      expect(text).toContain("100 tokens");
      expect(text).toContain("A cute cat");
      expect(text).toContain("job-1");
    });

    it("should show empty message when no jobs", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            jobs: [],
            total: 0,
            hasMore: false,
          }),
      });

      const handler = registry.handlers.get("settings_mcp_history")!;
      const result = await handler({ limit: 12, offset: 0 });
      expect(getText(result)).toContain("No jobs found");
    });

    it("should show pagination hint when hasMore is true", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            jobs: [
              {
                id: "job-1",
                type: "MODIFY",
                status: "COMPLETED",
                prompt: "Edit this image",
                tokensCost: 50,
                createdAt: "2025-01-01T00:00:00Z",
              },
            ],
            total: 25,
            hasMore: true,
          }),
      });

      const handler = registry.handlers.get("settings_mcp_history")!;
      const result = await handler({ limit: 12, offset: 0 });
      const text = getText(result);
      expect(text).toContain("More results available");
      expect(text).toContain("offset=12");
    });

    it("should filter by type when provided", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            jobs: [],
            total: 0,
            hasMore: false,
          }),
      });

      const handler = registry.handlers.get("settings_mcp_history")!;
      await handler({ type: "GENERATE", limit: 12, offset: 0 });

      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toContain("type=GENERATE");
    });

    it("should truncate long prompts", async () => {
      const longPrompt = "A".repeat(200);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            jobs: [
              {
                id: "job-long",
                type: "GENERATE",
                status: "COMPLETED",
                prompt: longPrompt,
                tokensCost: 100,
                createdAt: "2025-01-01T00:00:00Z",
              },
            ],
            total: 1,
            hasMore: false,
          }),
      });

      const handler = registry.handlers.get("settings_mcp_history")!;
      const result = await handler({ limit: 12, offset: 0 });
      const text = getText(result);
      expect(text).toContain("...");
      expect(text).not.toContain("A".repeat(200));
    });
  });

  describe("settings_mcp_job_detail", () => {
    it("should show full job detail", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "job-detail-1",
            type: "GENERATE",
            status: "COMPLETED",
            prompt: "A scenic landscape",
            tokensCost: 200,
            tier: "TIER_1",
            createdAt: "2025-01-01T00:00:00Z",
            processingCompletedAt: "2025-01-01T00:01:00Z",
            outputImageUrl: "https://example.com/image.png",
            outputWidth: 1024,
            outputHeight: 768,
            apiKeyName: "My Key",
          }),
      });

      const handler = registry.handlers.get("settings_mcp_job_detail")!;
      const result = await handler({ job_id: "job-detail-1" });
      const text = getText(result);
      expect(text).toContain("MCP Job Detail");
      expect(text).toContain("job-detail-1");
      expect(text).toContain("GENERATE");
      expect(text).toContain("COMPLETED");
      expect(text).toContain("TIER_1");
      expect(text).toContain("200");
      expect(text).toContain("A scenic landscape");
      expect(text).toContain("https://example.com/image.png");
      expect(text).toContain("1024x768");
      expect(text).toContain("Completed:");
      expect(text).toContain("My Key");
    });

    it("should handle job without optional fields", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "job-minimal",
            type: "MODIFY",
            status: "PROCESSING",
            prompt: "Fix colors",
            tokensCost: 50,
            tier: "TIER_2",
            createdAt: "2025-01-01T00:00:00Z",
          }),
      });

      const handler = registry.handlers.get("settings_mcp_job_detail")!;
      const result = await handler({ job_id: "job-minimal" });
      const text = getText(result);
      expect(text).toContain("MCP Job Detail");
      expect(text).toContain("job-minimal");
      expect(text).not.toContain("Output:");
      expect(text).not.toContain("Dimensions:");
      expect(text).not.toContain("Completed:");
      expect(text).not.toContain("API Key:");
    });
  });
});
