import { describe, expect, it, vi, beforeEach } from "vitest";

const mockGetPresignedUploadUrl = vi.hoisted(() => vi.fn());

vi.mock("@/lib/storage/r2-client", () => ({
  getPresignedUploadUrl: mockGetPresignedUploadUrl,
}));
vi.mock("@/lib/prisma", () => ({
  default: { toolInvocation: { create: vi.fn().mockResolvedValue({}) } },
}));
vi.mock("@/lib/logger", () => ({ default: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } }));

import { createMockRegistry, getText, isError } from "../__test-utils__";
import { registerStorageTools } from "./storage";

describe("storage tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createMockRegistry();
    registerStorageTools(registry, userId);
  });

  it("should register 2 tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(2);
  });

  describe("storage_get_upload_url", () => {
    it("should return presigned URL and key", async () => {
      mockGetPresignedUploadUrl.mockResolvedValue("https://r2.example.com/presigned");

      const handler = registry.handlers.get("storage_get_upload_url")!;
      const result = await handler({
        filename: "photo.jpg",
        content_type: "image/jpeg",
        purpose: "image",
      });

      const text = getText(result);
      expect(text).toContain("presigned");
      expect(text).toContain(`uploads/${userId}/image/`);
    });
  });

  describe("storage_register_upload", () => {
    it("should reject R2 keys that don't belong to the user", async () => {
      const handler = registry.handlers.get("storage_register_upload")!;
      const result = await handler({
        r2_key: "uploads/other-user/image/file.jpg",
        purpose: "image",
      });

      expect(isError(result)).toBe(true);
      expect(getText(result)).toContain("Access denied");
    });

    it("should accept R2 keys belonging to the user", async () => {
      vi.stubEnv("CLOUDFLARE_R2_PUBLIC_URL", "https://cdn.example.com");

      const handler = registry.handlers.get("storage_register_upload")!;
      const result = await handler({
        r2_key: `uploads/${userId}/image/file.jpg`,
        purpose: "image",
      });

      expect(isError(result)).toBe(false);
      expect(getText(result)).toContain(`uploads/${userId}/image/file.jpg`);

      vi.unstubAllEnvs();
    });
  });
});
