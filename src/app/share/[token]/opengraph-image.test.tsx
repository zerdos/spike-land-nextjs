import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Image, {
  alt,
  contentType,
  isAllowedImageUrl,
  revalidate,
  runtime,
  size,
} from "./opengraph-image";

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
  originalUrl: "https://r2.example.com/original.jpg",
  shareToken: "abc123",
  enhancementJobs: [
    {
      id: "job-1",
      status: "COMPLETED",
      enhancedUrl: "https://r2.example.com/enhanced.jpg",
      tier: "TIER_4K",
    },
  ],
};

describe("opengraph-image", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      CLOUDFLARE_R2_PUBLIC_URL: "https://r2.example.com",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
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

    it("exports revalidate for caching", () => {
      expect(revalidate).toBe(3600);
    });
  });

  describe("isAllowedImageUrl", () => {
    it("returns true for URLs starting with R2 public URL", () => {
      expect(isAllowedImageUrl("https://r2.example.com/images/test.jpg")).toBe(
        true,
      );
    });

    it("returns false for external URLs", () => {
      expect(isAllowedImageUrl("https://evil.com/malicious.jpg")).toBe(false);
    });

    it("returns false when R2 public URL is not configured", () => {
      delete process.env.CLOUDFLARE_R2_PUBLIC_URL;
      expect(isAllowedImageUrl("https://r2.example.com/images/test.jpg")).toBe(
        false,
      );
    });

    it("returns false for URLs that contain but don't start with R2 URL", () => {
      expect(
        isAllowedImageUrl(
          "https://evil.com/redirect?url=https://r2.example.com/test.jpg",
        ),
      )
        .toBe(false);
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

    it("returns fallback when URL fails SSRF validation", async () => {
      const imageWithExternalUrl = {
        ...mockImage,
        originalUrl: "https://evil.com/malicious.jpg",
        enhancementJobs: [
          {
            ...mockImage.enhancementJobs[0],
            enhancedUrl: "https://evil.com/malicious-enhanced.jpg",
          },
        ],
      };
      mockPrisma.enhancedImage.findUnique.mockResolvedValue(
        imageWithExternalUrl,
      );

      const params = Promise.resolve({ token: "abc123" });
      const result = await Image({ params });

      expect(result).toBeDefined();
      expect(result.options).toEqual({ width: 1200, height: 630 });
    });

    it("returns fallback when database query fails", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(
        () => {},
      );
      mockPrisma.enhancedImage.findUnique.mockRejectedValue(
        new Error("Database connection failed"),
      );

      const params = Promise.resolve({ token: "abc123" });
      const result = await Image({ params });

      expect(result).toBeDefined();
      expect(result.options).toEqual({ width: 1200, height: 630 });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error generating OG image:",
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });

    it("renders split comparison when both original and enhanced images exist", async () => {
      mockPrisma.enhancedImage.findUnique.mockResolvedValue(mockImage);

      const params = Promise.resolve({ token: "abc123" });
      const result = await Image({ params });

      // Verify the element structure contains the expected background
      expect(result.element).toBeDefined();
      const element = result.element as React.ReactElement;
      expect(element.props.style.background).toBe("#0a0a0a");
    });

    it("renders single image when only original URL exists", async () => {
      const imageWithOnlyOriginal = {
        ...mockImage,
        enhancementJobs: [],
      };
      mockPrisma.enhancedImage.findUnique.mockResolvedValue(
        imageWithOnlyOriginal,
      );

      const params = Promise.resolve({ token: "abc123" });
      const result = await Image({ params });

      expect(result).toBeDefined();
      expect(result.options).toEqual({ width: 1200, height: 630 });
    });

    it("renders single image when only enhanced URL exists", async () => {
      const imageWithOnlyEnhanced = {
        ...mockImage,
        originalUrl: null,
      };
      mockPrisma.enhancedImage.findUnique.mockResolvedValue(
        imageWithOnlyEnhanced,
      );

      const params = Promise.resolve({ token: "abc123" });
      const result = await Image({ params });

      expect(result).toBeDefined();
      expect(result.options).toEqual({ width: 1200, height: 630 });
    });

    it("falls back to enhanced-only view when original URL fails SSRF validation", async () => {
      const imageWithMixedUrls = {
        ...mockImage,
        originalUrl: "https://evil.com/malicious.jpg",
        // Enhanced URL is valid
      };
      mockPrisma.enhancedImage.findUnique.mockResolvedValue(imageWithMixedUrls);

      const params = Promise.resolve({ token: "abc123" });
      const result = await Image({ params });

      // Should still render (with just the enhanced image)
      expect(result).toBeDefined();
      expect(result.options).toEqual({ width: 1200, height: 630 });
    });

    it("falls back to original-only view when enhanced URL fails SSRF validation", async () => {
      const imageWithMixedUrls = {
        ...mockImage,
        enhancementJobs: [
          {
            ...mockImage.enhancementJobs[0],
            enhancedUrl: "https://evil.com/malicious.jpg",
          },
        ],
      };
      mockPrisma.enhancedImage.findUnique.mockResolvedValue(imageWithMixedUrls);

      const params = Promise.resolve({ token: "abc123" });
      const result = await Image({ params });

      // Should still render (with just the original image)
      expect(result).toBeDefined();
      expect(result.options).toEqual({ width: 1200, height: 630 });
    });
  });
});
