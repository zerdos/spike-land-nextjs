import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock prisma
const mockPrisma = {
  vaultSecret: {
    count: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
  },
  subscription: {
    findUnique: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

// Mock crypto
const mockEncryptSecret = vi.fn();
vi.mock("../crypto/vault", () => ({
  encryptSecret: (...args: unknown[]) => mockEncryptSecret(...args),
}));

import type { ToolRegistry } from "../tool-registry";
import { registerVaultTools } from "./vault";

function createMockRegistry(): ToolRegistry & {
  handlers: Map<string, (...args: unknown[]) => unknown>;
} {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();
  const registry = {
    register: vi.fn((def: { name: string; handler: (...args: unknown[]) => unknown }) => {
      handlers.set(def.name, def.handler);
    }),
    handlers,
  };
  return registry as unknown as ToolRegistry & {
    handlers: Map<string, (...args: unknown[]) => unknown>;
  };
}

describe("vault tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createMockRegistry();
    registerVaultTools(registry, userId);
  });

  it("should register 4 vault tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(4);
    expect(registry.handlers.has("vault_store_secret")).toBe(true);
    expect(registry.handlers.has("vault_list_secrets")).toBe(true);
    expect(registry.handlers.has("vault_delete_secret")).toBe(true);
    expect(registry.handlers.has("vault_approve_secret")).toBe(true);
  });

  describe("vault_store_secret", () => {
    it("should store an encrypted secret", async () => {
      mockPrisma.vaultSecret.count.mockResolvedValue(0);
      mockPrisma.subscription.findUnique.mockResolvedValue(null);
      mockEncryptSecret.mockReturnValue({
        encryptedValue: "enc",
        iv: "iv",
        tag: "tag",
      });
      mockPrisma.vaultSecret.upsert.mockResolvedValue({
        id: "secret-1",
        name: "MY_API_KEY",
        status: "PENDING",
      });

      const handler = registry.handlers.get("vault_store_secret")!;
      const result = await handler({
        name: "MY_API_KEY",
        value: "sk-123",
        allowed_urls: ["https://api.example.com"],
      });

      expect(mockEncryptSecret).toHaveBeenCalledWith(userId, "sk-123");
      expect(mockPrisma.vaultSecret.upsert).toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({
          content: expect.arrayContaining([
            expect.objectContaining({
              type: "text",
              text: expect.stringContaining("Secret Stored"),
            }),
          ]),
        }),
      );
    });

    it("should enforce quota for free tier", async () => {
      mockPrisma.vaultSecret.count.mockResolvedValue(5);
      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      const handler = registry.handlers.get("vault_store_secret")!;
      const result = await handler({
        name: "NEW_KEY",
        value: "val",
        allowed_urls: [],
      });

      expect(result).toEqual(
        expect.objectContaining({
          isError: true,
          content: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringContaining("limit reached"),
            }),
          ]),
        }),
      );
    });

    it("should allow more secrets for premium users", async () => {
      mockPrisma.vaultSecret.count.mockResolvedValue(50);
      mockPrisma.subscription.findUnique.mockResolvedValue({
        tier: "PREMIUM",
      });
      mockEncryptSecret.mockReturnValue({
        encryptedValue: "enc",
        iv: "iv",
        tag: "tag",
      });
      mockPrisma.vaultSecret.upsert.mockResolvedValue({
        id: "secret-51",
        name: "KEY",
        status: "PENDING",
      });

      const handler = registry.handlers.get("vault_store_secret")!;
      const result = await handler({
        name: "KEY",
        value: "val",
        allowed_urls: [],
      });

      expect(result).toEqual(
        expect.objectContaining({
          content: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringContaining("Secret Stored"),
            }),
          ]),
        }),
      );
    });

    it("should handle database errors", async () => {
      mockPrisma.vaultSecret.count.mockRejectedValue(
        new Error("DB connection failed"),
      );

      const handler = registry.handlers.get("vault_store_secret")!;
      const result = await handler({
        name: "KEY",
        value: "val",
        allowed_urls: [],
      });

      expect(result).toEqual(
        expect.objectContaining({
          isError: true,
          content: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringContaining("DB connection failed"),
            }),
          ]),
        }),
      );
    });
  });

  describe("vault_list_secrets", () => {
    it("should list secrets without values", async () => {
      mockPrisma.vaultSecret.findMany.mockResolvedValue([
        {
          id: "s1",
          name: "API_KEY",
          status: "APPROVED",
          allowedUrls: ["https://api.example.com"],
          createdAt: new Date("2025-01-01"),
        },
        {
          id: "s2",
          name: "TOKEN",
          status: "PENDING",
          allowedUrls: [],
          createdAt: new Date("2025-01-02"),
        },
      ]);
      mockPrisma.vaultSecret.count.mockResolvedValue(2);
      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      const handler = registry.handlers.get("vault_list_secrets")!;
      const result = await handler({});

      expect(result).toEqual(
        expect.objectContaining({
          content: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringContaining("API_KEY"),
            }),
          ]),
        }),
      );
      // Ensure no plaintext values in output
      const text = (result as { content: Array<{ text: string }> }).content[0]!
        .text;
      expect(text).not.toContain("sk-");
      expect(text).not.toContain("secret-value");
    });

    it("should show empty vault message", async () => {
      mockPrisma.vaultSecret.findMany.mockResolvedValue([]);
      mockPrisma.vaultSecret.count.mockResolvedValue(0);
      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      const handler = registry.handlers.get("vault_list_secrets")!;
      const result = await handler({});

      expect(result).toEqual(
        expect.objectContaining({
          content: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringContaining("No secrets stored"),
            }),
          ]),
        }),
      );
    });

    it("should handle errors", async () => {
      mockPrisma.vaultSecret.findMany.mockRejectedValue(
        new Error("DB error"),
      );

      const handler = registry.handlers.get("vault_list_secrets")!;
      const result = await handler({});

      expect(result).toEqual(
        expect.objectContaining({
          isError: true,
        }),
      );
    });
  });

  describe("vault_delete_secret", () => {
    it("should revoke an existing secret", async () => {
      mockPrisma.vaultSecret.findFirst.mockResolvedValue({
        id: "s1",
        name: "API_KEY",
        status: "APPROVED",
        userId,
      });
      mockPrisma.vaultSecret.update.mockResolvedValue({
        id: "s1",
        status: "REVOKED",
      });

      const handler = registry.handlers.get("vault_delete_secret")!;
      const result = await handler({ secret_id: "s1" });

      expect(mockPrisma.vaultSecret.update).toHaveBeenCalledWith({
        where: { id: "s1" },
        data: { status: "REVOKED" },
      });
      expect(result).toEqual(
        expect.objectContaining({
          content: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringContaining("Secret Revoked"),
            }),
          ]),
        }),
      );
    });

    it("should return error for non-existent secret", async () => {
      mockPrisma.vaultSecret.findFirst.mockResolvedValue(null);

      const handler = registry.handlers.get("vault_delete_secret")!;
      const result = await handler({ secret_id: "nonexistent" });

      expect(result).toEqual(
        expect.objectContaining({
          isError: true,
          content: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringContaining("not found"),
            }),
          ]),
        }),
      );
    });

    it("should handle already revoked secret", async () => {
      mockPrisma.vaultSecret.findFirst.mockResolvedValue({
        id: "s1",
        name: "API_KEY",
        status: "REVOKED",
        userId,
      });

      const handler = registry.handlers.get("vault_delete_secret")!;
      const result = await handler({ secret_id: "s1" });

      expect(result).toEqual(
        expect.objectContaining({
          content: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringContaining("already revoked"),
            }),
          ]),
        }),
      );
    });

    it("should handle errors", async () => {
      mockPrisma.vaultSecret.findFirst.mockRejectedValue(
        new Error("DB error"),
      );

      const handler = registry.handlers.get("vault_delete_secret")!;
      const result = await handler({ secret_id: "s1" });

      expect(result).toEqual(
        expect.objectContaining({
          isError: true,
        }),
      );
    });
  });

  describe("vault_approve_secret", () => {
    it("should approve a pending secret", async () => {
      mockPrisma.vaultSecret.findFirst.mockResolvedValue({
        id: "s1",
        name: "API_KEY",
        status: "PENDING",
        userId,
      });
      mockPrisma.vaultSecret.update.mockResolvedValue({
        id: "s1",
        status: "APPROVED",
      });

      const handler = registry.handlers.get("vault_approve_secret")!;
      const result = await handler({ secret_id: "s1" });

      expect(mockPrisma.vaultSecret.update).toHaveBeenCalledWith({
        where: { id: "s1" },
        data: { status: "APPROVED" },
      });
      expect(result).toEqual(
        expect.objectContaining({
          content: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringContaining("Secret Approved"),
            }),
          ]),
        }),
      );
    });

    it("should reject approval of non-pending secret", async () => {
      mockPrisma.vaultSecret.findFirst.mockResolvedValue({
        id: "s1",
        name: "API_KEY",
        status: "APPROVED",
        userId,
      });

      const handler = registry.handlers.get("vault_approve_secret")!;
      const result = await handler({ secret_id: "s1" });

      expect(result).toEqual(
        expect.objectContaining({
          isError: true,
          content: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringContaining("not PENDING"),
            }),
          ]),
        }),
      );
    });

    it("should return error for non-existent secret", async () => {
      mockPrisma.vaultSecret.findFirst.mockResolvedValue(null);

      const handler = registry.handlers.get("vault_approve_secret")!;
      const result = await handler({ secret_id: "nonexistent" });

      expect(result).toEqual(
        expect.objectContaining({
          isError: true,
        }),
      );
    });

    it("should handle errors", async () => {
      mockPrisma.vaultSecret.findFirst.mockRejectedValue(
        new Error("DB error"),
      );

      const handler = registry.handlers.get("vault_approve_secret")!;
      const result = await handler({ secret_id: "s1" });

      expect(result).toEqual(
        expect.objectContaining({
          isError: true,
        }),
      );
    });
  });
});
