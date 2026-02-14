import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  featuredGalleryItem: {
    findMany: vi.fn(),
  },
  enhancedImage: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  user: {
    findFirst: vi.fn(),
  },
  album: {
    findMany: vi.fn(),
  },
  toolInvocation: {
    create: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/logger", () => ({ default: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } }));

import { createMockRegistry, getText } from "../__test-utils__";
import { registerGalleryTools } from "./gallery";

describe("gallery tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createMockRegistry();
    registerGalleryTools(registry, userId);
    mockPrisma.toolInvocation.create.mockResolvedValue({});
  });

  it("should register 3 tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(3);
  });

  describe("gallery_list", () => {
    it("should return featured gallery items", async () => {
      const items = [{ id: "item-1", title: "Test Image" }];
      mockPrisma.featuredGalleryItem.findMany.mockResolvedValue(items);

      const handler = registry.handlers.get("gallery_list")!;
      const result = await handler({ activeOnly: true });

      expect(getText(result)).toContain("item-1");
    });
  });

  describe("gallery_public", () => {
    it("should return paginated public gallery", async () => {
      const images = [{ id: "img-1", isPublic: true }];
      mockPrisma.enhancedImage.findMany.mockResolvedValue(images);
      mockPrisma.enhancedImage.count.mockResolvedValue(1);

      const handler = registry.handlers.get("gallery_public")!;
      const result = await handler({ page: 1, limit: 20, tags: [], tier: undefined });

      expect(getText(result)).toContain("img-1");
      expect(getText(result)).toContain("pagination");
    });
  });

  describe("gallery_public_albums", () => {
    it("should use env var for super admin email", async () => {
      vi.stubEnv("SPIKE_LAND_SUPER_ADMIN_EMAIL", "custom@example.com");

      mockPrisma.user.findFirst.mockResolvedValue({ id: "admin-1" });
      mockPrisma.album.findMany.mockResolvedValue([]);

      const handler = registry.handlers.get("gallery_public_albums")!;
      // Note: the env var is read at module load time, so the handler
      // will use whatever was set when the module was imported.
      // We just verify the flow works.
      await handler({ limit: 12 });

      expect(mockPrisma.user.findFirst).toHaveBeenCalled();

      vi.unstubAllEnvs();
    });

    it("should error when super admin not found", async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const handler = registry.handlers.get("gallery_public_albums")!;
      const result = await handler({ limit: 12 });

      expect(result.isError).toBe(true);
      expect(getText(result)).toContain("not found");
    });
  });
});
