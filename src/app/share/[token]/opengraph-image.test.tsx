import { beforeEach, describe, expect, it, vi } from "vitest";
import Image, { alt, contentType, runtime, size } from "./opengraph-image";

const mockPrisma = {
  enhancedImage: {
    findUnique: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  default: {
    enhancedImage: {
      findUnique: (...args: unknown[]) => mockPrisma.enhancedImage.findUnique(...args),
    },
  },
}));

// Mock next/og ImageResponse
vi.mock("next/og", () => ({
  ImageResponse: class MockImageResponse {
    constructor(
      public element: React.ReactNode,
      public options: { width: number; height: number; },
    ) {}
  },
}));

const mockImage = {
  id: "image-123",
  name: "Beautiful Sunset",
  originalUrl: "https://example.com/original.jpg",
  shareToken: "abc123",
  enhancementJobs: [
    {
      id: "job-1",
      status: "COMPLETED",
      enhancedUrl: "https://example.com/enhanced.jpg",
      tier: "TIER_4K",
    },
  ],
};

describe("opengraph-image", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("exports", () => {
    it("exports correct runtime", () => {
      expect(runtime).toBe("nodejs");
    });

    it("exports correct alt text", () => {
      expect(alt).toBe("Enhanced Image Preview");
    });

    it("exports correct size for OG images", () => {
      expect(size).toEqual({ width: 1200, height: 630 });
    });

    it("exports correct content type", () => {
      expect(contentType).toBe("image/png");
    });
  });

  describe("Image function", () => {
    it("returns ImageResponse with enhanced image URL when image exists", async () => {
      mockPrisma.enhancedImage.findUnique.mockResolvedValue(mockImage);

      const params = Promise.resolve({ token: "abc123" });
      const result = await Image({ params });

      expect(mockPrisma.enhancedImage.findUnique).toHaveBeenCalledWith({
        where: { shareToken: "abc123" },
        include: {
          enhancementJobs: {
            where: {
              status: "COMPLETED",
              enhancedUrl: { not: null },
            },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });

      expect(result).toBeDefined();
      expect(result.options).toEqual({ width: 1200, height: 630 });
    });

    it("returns ImageResponse with original URL when no enhancement exists", async () => {
      const imageWithoutEnhancement = {
        ...mockImage,
        enhancementJobs: [],
      };
      mockPrisma.enhancedImage.findUnique.mockResolvedValue(
        imageWithoutEnhancement,
      );

      const params = Promise.resolve({ token: "abc123" });
      const result = await Image({ params });

      expect(result).toBeDefined();
      expect(result.options).toEqual({ width: 1200, height: 630 });
    });

    it("returns fallback ImageResponse when image not found", async () => {
      mockPrisma.enhancedImage.findUnique.mockResolvedValue(null);

      const params = Promise.resolve({ token: "nonexistent" });
      const result = await Image({ params });

      expect(result).toBeDefined();
      expect(result.options).toEqual({ width: 1200, height: 630 });
    });

    it("returns fallback when image has no URLs", async () => {
      const imageWithNoUrls = {
        ...mockImage,
        originalUrl: null,
        enhancementJobs: [],
      };
      mockPrisma.enhancedImage.findUnique.mockResolvedValue(imageWithNoUrls);

      const params = Promise.resolve({ token: "abc123" });
      const result = await Image({ params });

      expect(result).toBeDefined();
      expect(result.options).toEqual({ width: 1200, height: 630 });
    });
  });
});
