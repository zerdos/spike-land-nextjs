/**
 * Tests for Public Gallery API Route
 */

import { EnhancementTier, JobStatus } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/prisma", () => ({
  default: {
    enhancedImage: {
      findMany: vi.fn(),
      count: vi.fn(),
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

  describe("GET /api/gallery/public", () => {
    it("should return public images with pagination", async () => {
      const mockImages = [
        {
          id: "img1",
          name: "Test Image 1",
          description: "A test image",
          originalUrl: "https://example.com/original1.jpg",
          tags: ["landscape", "nature"],
          createdAt: new Date("2024-01-01"),
          enhancementJobs: [
            {
              enhancedUrl: "https://example.com/enhanced1.jpg",
              enhancedWidth: 1024,
              enhancedHeight: 768,
              tier: EnhancementTier.TIER_2K,
            },
          ],
          user: {
            name: "John Doe",
          },
        },
      ];

      vi.mocked(prisma.enhancedImage.count).mockResolvedValue(1);
      vi.mocked(prisma.enhancedImage.findMany).mockResolvedValue(mockImages as any);

      const request = new Request("http://localhost/api/gallery/public?page=1&limit=20");
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(1);
      expect(data.items[0].name).toBe("Test Image 1");
      expect(data.items[0].tags).toEqual(["landscape", "nature"]);
      expect(data.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        hasMore: false,
      });
    });

    it("should filter by tags", async () => {
      const mockImages = [
        {
          id: "img1",
          name: "Mountain View",
          description: null,
          originalUrl: "https://example.com/mountain.jpg",
          tags: ["landscape", "mountain"],
          createdAt: new Date("2024-01-01"),
          enhancementJobs: [
            {
              enhancedUrl: "https://example.com/enhanced-mountain.jpg",
              enhancedWidth: 2048,
              enhancedHeight: 1024,
              tier: EnhancementTier.TIER_4K,
            },
          ],
          user: {
            name: "Jane Doe",
          },
        },
      ];

      vi.mocked(prisma.enhancedImage.count).mockResolvedValue(1);
      vi.mocked(prisma.enhancedImage.findMany).mockResolvedValue(mockImages as any);

      const request = new Request("http://localhost/api/gallery/public?tags=landscape,mountain");
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(prisma.enhancedImage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isPublic: true,
            tags: { hasSome: ["landscape", "mountain"] },
          }),
        })
      );
    });

    it("should filter by tier", async () => {
      const mockImages: any[] = [];

      vi.mocked(prisma.enhancedImage.count).mockResolvedValue(0);
      vi.mocked(prisma.enhancedImage.findMany).mockResolvedValue(mockImages);

      const request = new Request("http://localhost/api/gallery/public?tier=TIER_2K");
      const response = await GET(request as any);

      expect(response.status).toBe(200);
      expect(prisma.enhancedImage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isPublic: true,
            enhancementJobs: {
              some: {
                tier: EnhancementTier.TIER_2K,
                status: JobStatus.COMPLETED,
              },
            },
          }),
        })
      );
    });

    it("should handle pagination correctly", async () => {
      vi.mocked(prisma.enhancedImage.count).mockResolvedValue(50);
      vi.mocked(prisma.enhancedImage.findMany).mockResolvedValue([]);

      const request = new Request("http://localhost/api/gallery/public?page=2&limit=20");
      const response = await GET(request as any);
      const data = await response.json();

      expect(prisma.enhancedImage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 20,
        })
      );

      expect(data.pagination).toEqual({
        page: 2,
        limit: 20,
        total: 50,
        hasMore: true,
      });
    });

    it("should skip images without enhanced URL", async () => {
      const mockImages = [
        {
          id: "img1",
          name: "Incomplete Image",
          description: null,
          originalUrl: "https://example.com/original.jpg",
          tags: [],
          createdAt: new Date("2024-01-01"),
          enhancementJobs: [
            {
              enhancedUrl: null,
              enhancedWidth: null,
              enhancedHeight: null,
              tier: EnhancementTier.TIER_1K,
            },
          ],
          user: { name: "Test User" },
        },
      ];

      vi.mocked(prisma.enhancedImage.count).mockResolvedValue(1);
      vi.mocked(prisma.enhancedImage.findMany).mockResolvedValue(mockImages as any);

      const request = new Request("http://localhost/api/gallery/public");
      const response = await GET(request as any);
      const data = await response.json();

      expect(data.items).toHaveLength(0);
    });

    it("should return 500 on database error", async () => {
      vi.mocked(prisma.enhancedImage.count).mockRejectedValue(new Error("DB Error"));

      const request = new Request("http://localhost/api/gallery/public");
      const response = await GET(request as any);

      expect(response.status).toBe(500);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("should limit results to maximum of 100 per page", async () => {
      vi.mocked(prisma.enhancedImage.count).mockResolvedValue(200);
      vi.mocked(prisma.enhancedImage.findMany).mockResolvedValue([]);

      const request = new Request("http://localhost/api/gallery/public?limit=200");
      const response = await GET(request as any);

      expect(prisma.enhancedImage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        })
      );
    });

    it("should handle empty results", async () => {
      vi.mocked(prisma.enhancedImage.count).mockResolvedValue(0);
      vi.mocked(prisma.enhancedImage.findMany).mockResolvedValue([]);

      const request = new Request("http://localhost/api/gallery/public");
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(0);
      expect(data.pagination.total).toBe(0);
    });

    it("should include cache headers", async () => {
      vi.mocked(prisma.enhancedImage.count).mockResolvedValue(0);
      vi.mocked(prisma.enhancedImage.findMany).mockResolvedValue([]);

      const request = new Request("http://localhost/api/gallery/public");
      const response = await GET(request as any);

      expect(response.headers.get("Cache-Control")).toBe(
        "public, s-maxage=300, stale-while-revalidate=600"
      );
    });
  });
});
