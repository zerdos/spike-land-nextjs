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

describe("settings tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => { vi.clearAllMocks(); registry = createMockRegistry(); registerSettingsTools(registry, userId); });

  it("should register 3 settings tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(3);
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
});
