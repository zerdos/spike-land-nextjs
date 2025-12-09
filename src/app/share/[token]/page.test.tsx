import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SharePage, { generateMetadata } from "./page";

const mockImage = {
  id: "image-123",
  userId: "user-456",
  name: "Beautiful Sunset",
  description: "A stunning sunset over the mountains",
  originalUrl: "https://example.com/original.jpg",
  originalR2Key: "original-key",
  originalWidth: 1920,
  originalHeight: 1080,
  originalSizeBytes: 500000,
  originalFormat: "jpeg",
  isPublic: false,
  viewCount: 10,
  shareToken: "abc123",
  createdAt: new Date(),
  updatedAt: new Date(),
  enhancementJobs: [
    {
      id: "job-1",
      imageId: "image-123",
      userId: "user-456",
      tier: "TIER_2K",
      tokensCost: 5,
      status: "COMPLETED",
      enhancedUrl: "https://example.com/enhanced.jpg",
      enhancedR2Key: "enhanced-key",
      enhancedWidth: 2048,
      enhancedHeight: 1152,
      enhancedSizeBytes: 800000,
      errorMessage: null,
      retryCount: 0,
      maxRetries: 3,
      geminiPrompt: null,
      workflowRunId: null,
      processingStartedAt: new Date(),
      processingCompletedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
};

const mockPrisma = {
  enhancedImage: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  default: {
    enhancedImage: {
      findUnique: (...args: unknown[]) => mockPrisma.enhancedImage.findUnique(...args),
      update: (...args: unknown[]) => mockPrisma.enhancedImage.update(...args),
    },
  },
}));

vi.mock("./SharePageClient", () => ({
  SharePageClient: ({
    imageName,
    description,
    originalUrl,
    enhancedUrl,
    enhancedWidth,
    enhancedHeight,
    tier,
    shareToken,
  }: {
    imageName: string;
    description: string | null;
    originalUrl: string;
    enhancedUrl: string;
    originalWidth: number;
    originalHeight: number;
    enhancedWidth: number | null;
    enhancedHeight: number | null;
    tier: string;
    shareToken: string;
  }) => (
    <div data-testid="share-page-client">
      <span data-testid="image-name">{imageName}</span>
      <span data-testid="description">{description}</span>
      <span data-testid="original-url">{originalUrl}</span>
      <span data-testid="enhanced-url">{enhancedUrl}</span>
      <span data-testid="enhanced-width">{enhancedWidth}</span>
      <span data-testid="enhanced-height">{enhancedHeight}</span>
      <span data-testid="tier">{tier}</span>
      <span data-testid="share-token">{shareToken}</span>
    </div>
  ),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

describe("SharePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("SharePage component", () => {
    it("renders SharePageClient with correct props when image exists", async () => {
      mockPrisma.enhancedImage.findUnique.mockResolvedValue(mockImage);
      mockPrisma.enhancedImage.update.mockResolvedValue(mockImage);

      const params = Promise.resolve({ token: "abc123" });
      const Page = await SharePage({ params });
      render(Page);

      expect(screen.getByTestId("share-page-client")).toBeInTheDocument();
      expect(screen.getByTestId("image-name")).toHaveTextContent(
        "Beautiful Sunset",
      );
      expect(screen.getByTestId("description")).toHaveTextContent(
        "A stunning sunset over the mountains",
      );
      expect(screen.getByTestId("original-url")).toHaveTextContent(
        "https://example.com/original.jpg",
      );
      expect(screen.getByTestId("enhanced-url")).toHaveTextContent(
        "https://example.com/enhanced.jpg",
      );
      expect(screen.getByTestId("enhanced-width")).toHaveTextContent("2048");
      expect(screen.getByTestId("enhanced-height")).toHaveTextContent("1152");
      expect(screen.getByTestId("tier")).toHaveTextContent("TIER_2K");
      expect(screen.getByTestId("share-token")).toHaveTextContent("abc123");
    });

    it("increments view count when image is loaded", async () => {
      mockPrisma.enhancedImage.findUnique.mockResolvedValue(mockImage);
      mockPrisma.enhancedImage.update.mockResolvedValue(mockImage);

      const params = Promise.resolve({ token: "abc123" });
      const Page = await SharePage({ params });
      render(Page);

      expect(mockPrisma.enhancedImage.update).toHaveBeenCalledWith({
        where: { id: "image-123" },
        data: { viewCount: { increment: 1 } },
      });
    });

    it("calls notFound when image does not exist", async () => {
      mockPrisma.enhancedImage.findUnique.mockResolvedValue(null);

      const params = Promise.resolve({ token: "nonexistent" });

      await expect(SharePage({ params })).rejects.toThrow("NEXT_NOT_FOUND");
    });

    it("calls notFound when no completed enhancement exists", async () => {
      const imageWithoutEnhancement = {
        ...mockImage,
        enhancementJobs: [],
      };
      mockPrisma.enhancedImage.findUnique.mockResolvedValue(
        imageWithoutEnhancement,
      );

      const params = Promise.resolve({ token: "abc123" });

      await expect(SharePage({ params })).rejects.toThrow("NEXT_NOT_FOUND");
    });

    it("calls notFound when enhancement has no enhancedUrl", async () => {
      const imageWithIncompleteEnhancement = {
        ...mockImage,
        enhancementJobs: [
          {
            ...mockImage.enhancementJobs[0],
            enhancedUrl: null,
          },
        ],
      };
      mockPrisma.enhancedImage.findUnique.mockResolvedValue(
        imageWithIncompleteEnhancement,
      );

      const params = Promise.resolve({ token: "abc123" });

      await expect(SharePage({ params })).rejects.toThrow("NEXT_NOT_FOUND");
    });
  });

  describe("generateMetadata", () => {
    it("returns correct metadata when image exists", async () => {
      mockPrisma.enhancedImage.findUnique.mockResolvedValue(mockImage);

      const params = Promise.resolve({ token: "abc123" });
      const metadata = await generateMetadata({ params });

      expect(metadata.title).toBe("Beautiful Sunset - Enhanced with Pixel");
      expect(metadata.description).toBe(
        "A stunning sunset over the mountains",
      );
      expect(metadata.openGraph?.title).toBe(
        "Beautiful Sunset - Enhanced with Pixel",
      );
      expect(metadata.openGraph?.type).toBe("website");
      expect(metadata.openGraph?.siteName).toBe("Pixel - AI Image Enhancement");
      // Note: OG images are now auto-generated via opengraph-image.tsx
      expect(metadata.twitter?.card).toBe("summary_large_image");
    });

    it("returns not found metadata when image does not exist", async () => {
      mockPrisma.enhancedImage.findUnique.mockResolvedValue(null);

      const params = Promise.resolve({ token: "nonexistent" });
      const metadata = await generateMetadata({ params });

      expect(metadata.title).toBe("Image Not Found - Pixel");
      expect(metadata.description).toBe(
        "The requested image could not be found.",
      );
    });

    it("uses default description when image has no description", async () => {
      const imageWithoutDescription = {
        ...mockImage,
        description: null,
      };
      mockPrisma.enhancedImage.findUnique.mockResolvedValue(
        imageWithoutDescription,
      );

      const params = Promise.resolve({ token: "abc123" });
      const metadata = await generateMetadata({ params });

      expect(metadata.description).toBe(
        "View this AI-enhanced image created with Pixel",
      );
    });
  });
});
