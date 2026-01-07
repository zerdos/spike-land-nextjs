/**
 * Tests for Public Gallery API Route
 */

import { GalleryCategory } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/prisma", () => ({
  default: {
    featuredGalleryItem: {
      findMany: vi.fn(),
    },
  },
}));

const prisma = (await import("@/lib/prisma")).default;

describe("Public Gallery API", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("GET", () => {
    it("should return active gallery items", async () => {
      const mockItems = [
        {
          id: "citem1000000000000000001",
          title: "Portrait Shot",
          description: "Beautiful portrait",
          category: GalleryCategory.PORTRAIT,
          originalUrl: "https://example.com/original1.jpg",
          enhancedUrl: "https://example.com/enhanced1.jpg",
          width: 16,
          height: 9,
          sortOrder: 0,
        },
        {
          id: "citem1000000000000000002",
          title: "Landscape View",
          description: "Scenic landscape",
          category: GalleryCategory.LANDSCAPE,
          originalUrl: "https://example.com/original2.jpg",
          enhancedUrl: "https://example.com/enhanced2.jpg",
          width: 16,
          height: 9,
          sortOrder: 1,
        },
      ];

      vi.mocked(prisma.featuredGalleryItem.findMany).mockResolvedValue(
        mockItems as any,
      );

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(2);
      expect(data.items[0].title).toBe("Portrait Shot");
      expect(data.items[1].title).toBe("Landscape View");
    });

    it("should only return isActive=true items", async () => {
      vi.mocked(prisma.featuredGalleryItem.findMany).mockResolvedValue([]);

      await GET();

      expect(prisma.featuredGalleryItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            isActive: true,
          },
        }),
      );
    });

    it("should order by sortOrder asc, then createdAt desc", async () => {
      vi.mocked(prisma.featuredGalleryItem.findMany).mockResolvedValue([]);

      await GET();

      expect(prisma.featuredGalleryItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        }),
      );
    });

    it("should not require authentication", async () => {
      vi.mocked(prisma.featuredGalleryItem.findMany).mockResolvedValue([]);

      const response = await GET();

      expect(response.status).toBe(200);
      // If auth was required, we'd expect 401 without session
    });

    it("should have cache headers", async () => {
      vi.mocked(prisma.featuredGalleryItem.findMany).mockResolvedValue([]);

      const response = await GET();

      expect(response.headers.get("Cache-Control")).toBe(
        "public, s-maxage=300, stale-while-revalidate=600",
      );
    });

    it("should only return specific fields (no sensitive data)", async () => {
      vi.mocked(prisma.featuredGalleryItem.findMany).mockResolvedValue([]);

      await GET();

      expect(prisma.featuredGalleryItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            originalUrl: true,
            enhancedUrl: true,
            width: true,
            height: true,
            sortOrder: true,
          },
        }),
      );
    });

    it("should map items correctly in response", async () => {
      const mockItems = [
        {
          id: "citem1000000000000000001",
          title: "Test",
          description: "Test description",
          category: GalleryCategory.PORTRAIT,
          originalUrl: "https://example.com/original.jpg",
          enhancedUrl: "https://example.com/enhanced.jpg",
          width: 16,
          height: 9,
          sortOrder: 5,
        },
      ];

      vi.mocked(prisma.featuredGalleryItem.findMany).mockResolvedValue(
        mockItems as any,
      );

      const response = await GET();
      const data = await response.json();

      expect(data.items[0]).toEqual({
        id: "citem1000000000000000001",
        title: "Test",
        description: "Test description",
        category: "PORTRAIT",
        originalUrl: "https://example.com/original.jpg",
        enhancedUrl: "https://example.com/enhanced.jpg",
        width: 16,
        height: 9,
        sortOrder: 5,
      });
    });

    it("should handle database errors gracefully", async () => {
      vi.mocked(prisma.featuredGalleryItem.findMany).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
      expect(console.error).toHaveBeenCalledWith(
        "Failed to fetch gallery items:",
        expect.any(Error),
      );
    });

    it("should return empty array when no items exist", async () => {
      vi.mocked(prisma.featuredGalleryItem.findMany).mockResolvedValue([]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toEqual([]);
    });

    it("should handle null descriptions", async () => {
      const mockItems = [
        {
          id: "citem1000000000000000001",
          title: "Test",
          description: null,
          category: GalleryCategory.PORTRAIT,
          originalUrl: "https://example.com/original.jpg",
          enhancedUrl: "https://example.com/enhanced.jpg",
          width: 16,
          height: 9,
          sortOrder: 0,
        },
      ];

      vi.mocked(prisma.featuredGalleryItem.findMany).mockResolvedValue(
        mockItems as any,
      );

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items[0].description).toBeNull();
    });

    it("should handle all gallery categories", async () => {
      const mockItems = [
        {
          id: "citem1000000000000000001",
          title: "Portrait",
          description: "Portrait",
          category: GalleryCategory.PORTRAIT,
          originalUrl: "https://example.com/portrait.jpg",
          enhancedUrl: "https://example.com/portrait-enhanced.jpg",
          width: 9,
          height: 16,
          sortOrder: 0,
        },
        {
          id: "citem1000000000000000002",
          title: "Landscape",
          description: "Landscape",
          category: GalleryCategory.LANDSCAPE,
          originalUrl: "https://example.com/landscape.jpg",
          enhancedUrl: "https://example.com/landscape-enhanced.jpg",
          width: 16,
          height: 9,
          sortOrder: 1,
        },
        {
          id: "citem1000000000000000003",
          title: "Product",
          description: "Product",
          category: GalleryCategory.PRODUCT,
          originalUrl: "https://example.com/product.jpg",
          enhancedUrl: "https://example.com/product-enhanced.jpg",
          width: 1,
          height: 1,
          sortOrder: 2,
        },
        {
          id: "citem1000000000000000004",
          title: "Architecture",
          description: "Architecture",
          category: GalleryCategory.ARCHITECTURE,
          originalUrl: "https://example.com/architecture.jpg",
          enhancedUrl: "https://example.com/architecture-enhanced.jpg",
          width: 16,
          height: 9,
          sortOrder: 3,
        },
      ];

      vi.mocked(prisma.featuredGalleryItem.findMany).mockResolvedValue(
        mockItems as any,
      );

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(4);
      expect(data.items[0].category).toBe("PORTRAIT");
      expect(data.items[1].category).toBe("LANDSCAPE");
      expect(data.items[2].category).toBe("PRODUCT");
      expect(data.items[3].category).toBe("ARCHITECTURE");
    });
  });
});
