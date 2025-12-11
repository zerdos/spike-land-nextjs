import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CanvasPage, { generateMetadata } from "./page";

const mockAlbumPublic = {
  id: "album-123",
  userId: "user-456",
  name: "My Photo Album",
  description: "A beautiful collection",
  coverImageId: null,
  privacy: "PUBLIC",
  shareToken: "share-token-abc",
  sortOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  albumImages: [
    {
      id: "ai-1",
      albumId: "album-123",
      imageId: "img-1",
      sortOrder: 0,
      addedAt: new Date(),
      image: {
        id: "img-1",
        userId: "user-456",
        name: "Sunset",
        description: null,
        originalUrl: "https://example.com/sunset.jpg",
        originalR2Key: "sunset-key",
        originalWidth: 1920,
        originalHeight: 1080,
        originalSizeBytes: 500000,
        originalFormat: "jpeg",
        isPublic: false,
        viewCount: 0,
        shareToken: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        enhancementJobs: [
          {
            id: "job-1",
            imageId: "img-1",
            userId: "user-456",
            tier: "TIER_2K",
            tokensCost: 5,
            status: "COMPLETED",
            enhancedUrl: "https://example.com/sunset-enhanced.jpg",
            enhancedR2Key: "sunset-enhanced-key",
            enhancedWidth: 2560,
            enhancedHeight: 1440,
            enhancedSizeBytes: 800000,
            errorMessage: null,
            retryCount: 0,
            maxRetries: 3,
            geminiPrompt: null,
            geminiModel: null,
            geminiTemp: null,
            processingStartedAt: new Date(),
            processingCompletedAt: new Date(),
            workflowRunId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      },
    },
    {
      id: "ai-2",
      albumId: "album-123",
      imageId: "img-2",
      sortOrder: 1,
      addedAt: new Date(),
      image: {
        id: "img-2",
        userId: "user-456",
        name: "Mountain",
        description: null,
        originalUrl: "https://example.com/mountain.jpg",
        originalR2Key: "mountain-key",
        originalWidth: 1920,
        originalHeight: 1080,
        originalSizeBytes: 600000,
        originalFormat: "jpeg",
        isPublic: false,
        viewCount: 0,
        shareToken: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        enhancementJobs: [], // No enhancement - should use original
      },
    },
  ],
};

const mockAlbumUnlisted = {
  ...mockAlbumPublic,
  id: "album-unlisted",
  privacy: "UNLISTED",
  shareToken: "valid-share-token",
};

const mockAlbumPrivate = {
  ...mockAlbumPublic,
  id: "album-private",
  privacy: "PRIVATE",
  shareToken: "valid-private-token",
};

const mockPrisma = {
  album: {
    findUnique: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  default: {
    album: {
      findUnique: (...args: unknown[]) => mockPrisma.album.findUnique(...args),
    },
  },
}));

vi.mock("./CanvasClient", () => ({
  CanvasClient: ({
    images,
    settings,
    albumName,
  }: {
    images: Array<{ id: string; url: string; name: string; width: number; height: number; }>;
    settings: { rotation: number; order: string; interval: number; };
    albumName: string;
  }) => (
    <div data-testid="canvas-client">
      <span data-testid="album-name">{albumName}</span>
      <span data-testid="image-count">{images.length}</span>
      <span data-testid="rotation">{settings.rotation}</span>
      <span data-testid="order">{settings.order}</span>
      <span data-testid="interval">{settings.interval}</span>
      <span data-testid="first-image-url">{images[0]?.url}</span>
      <span data-testid="first-image-width">{images[0]?.width}</span>
      <span data-testid="second-image-url">{images[1]?.url}</span>
    </div>
  ),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

describe("CanvasPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Page component", () => {
    it("renders CanvasClient with correct props for public album", async () => {
      mockPrisma.album.findUnique.mockResolvedValue(mockAlbumPublic);

      const params = Promise.resolve({ albumId: "album-123" });
      const searchParams = Promise.resolve({});
      const Page = await CanvasPage({ params, searchParams });
      render(Page);

      expect(screen.getByTestId("canvas-client")).toBeInTheDocument();
      expect(screen.getByTestId("album-name")).toHaveTextContent("My Photo Album");
      expect(screen.getByTestId("image-count")).toHaveTextContent("2");
    });

    it("uses enhanced URL when available", async () => {
      mockPrisma.album.findUnique.mockResolvedValue(mockAlbumPublic);

      const params = Promise.resolve({ albumId: "album-123" });
      const searchParams = Promise.resolve({});
      const Page = await CanvasPage({ params, searchParams });
      render(Page);

      expect(screen.getByTestId("first-image-url")).toHaveTextContent(
        "https://example.com/sunset-enhanced.jpg",
      );
      expect(screen.getByTestId("first-image-width")).toHaveTextContent("2560");
    });

    it("falls back to original URL when no enhancement exists", async () => {
      mockPrisma.album.findUnique.mockResolvedValue(mockAlbumPublic);

      const params = Promise.resolve({ albumId: "album-123" });
      const searchParams = Promise.resolve({});
      const Page = await CanvasPage({ params, searchParams });
      render(Page);

      expect(screen.getByTestId("second-image-url")).toHaveTextContent(
        "https://example.com/mountain.jpg",
      );
    });

    it("calls notFound when album does not exist", async () => {
      mockPrisma.album.findUnique.mockResolvedValue(null);

      const params = Promise.resolve({ albumId: "nonexistent" });
      const searchParams = Promise.resolve({});

      await expect(CanvasPage({ params, searchParams })).rejects.toThrow("NEXT_NOT_FOUND");
    });

    it("allows access to unlisted album with valid token", async () => {
      mockPrisma.album.findUnique.mockResolvedValue(mockAlbumUnlisted);

      const params = Promise.resolve({ albumId: "album-unlisted" });
      const searchParams = Promise.resolve({ token: "valid-share-token" });
      const Page = await CanvasPage({ params, searchParams });
      render(Page);

      expect(screen.getByTestId("canvas-client")).toBeInTheDocument();
    });

    it("calls notFound for unlisted album without token", async () => {
      mockPrisma.album.findUnique.mockResolvedValue(mockAlbumUnlisted);

      const params = Promise.resolve({ albumId: "album-unlisted" });
      const searchParams = Promise.resolve({});

      await expect(CanvasPage({ params, searchParams })).rejects.toThrow("NEXT_NOT_FOUND");
    });

    it("calls notFound for unlisted album with invalid token", async () => {
      mockPrisma.album.findUnique.mockResolvedValue(mockAlbumUnlisted);

      const params = Promise.resolve({ albumId: "album-unlisted" });
      const searchParams = Promise.resolve({ token: "wrong-token" });

      await expect(CanvasPage({ params, searchParams })).rejects.toThrow("NEXT_NOT_FOUND");
    });

    it("allows access to private album with valid token", async () => {
      mockPrisma.album.findUnique.mockResolvedValue(mockAlbumPrivate);

      const params = Promise.resolve({ albumId: "album-private" });
      const searchParams = Promise.resolve({ token: "valid-private-token" });
      const Page = await CanvasPage({ params, searchParams });
      render(Page);

      expect(screen.getByTestId("canvas-client")).toBeInTheDocument();
    });

    it("calls notFound for private album without token", async () => {
      mockPrisma.album.findUnique.mockResolvedValue(mockAlbumPrivate);

      const params = Promise.resolve({ albumId: "album-private" });
      const searchParams = Promise.resolve({});

      await expect(CanvasPage({ params, searchParams })).rejects.toThrow("NEXT_NOT_FOUND");
    });

    it("calls notFound for album with unknown privacy type", async () => {
      const mockAlbumUnknownPrivacy = {
        ...mockAlbumPublic,
        id: "album-unknown",
        privacy: "UNKNOWN" as const, // Force an invalid privacy value
      };
      mockPrisma.album.findUnique.mockResolvedValue(mockAlbumUnknownPrivacy);

      const params = Promise.resolve({ albumId: "album-unknown" });
      const searchParams = Promise.resolve({});

      await expect(CanvasPage({ params, searchParams })).rejects.toThrow("NEXT_NOT_FOUND");
    });
  });

  describe("URL params parsing", () => {
    it("uses default values when no params provided", async () => {
      mockPrisma.album.findUnique.mockResolvedValue(mockAlbumPublic);

      const params = Promise.resolve({ albumId: "album-123" });
      const searchParams = Promise.resolve({});
      const Page = await CanvasPage({ params, searchParams });
      render(Page);

      expect(screen.getByTestId("rotation")).toHaveTextContent("0");
      expect(screen.getByTestId("order")).toHaveTextContent("album");
      expect(screen.getByTestId("interval")).toHaveTextContent("10");
    });

    it("parses valid rotation value", async () => {
      mockPrisma.album.findUnique.mockResolvedValue(mockAlbumPublic);

      const params = Promise.resolve({ albumId: "album-123" });
      const searchParams = Promise.resolve({ rotation: "90" });
      const Page = await CanvasPage({ params, searchParams });
      render(Page);

      expect(screen.getByTestId("rotation")).toHaveTextContent("90");
    });

    it("defaults to 0 for invalid rotation value", async () => {
      mockPrisma.album.findUnique.mockResolvedValue(mockAlbumPublic);

      const params = Promise.resolve({ albumId: "album-123" });
      const searchParams = Promise.resolve({ rotation: "45" }); // Invalid - not 0, 90, 180, 270
      const Page = await CanvasPage({ params, searchParams });
      render(Page);

      expect(screen.getByTestId("rotation")).toHaveTextContent("0");
    });

    it("parses rotation value 180", async () => {
      mockPrisma.album.findUnique.mockResolvedValue(mockAlbumPublic);

      const params = Promise.resolve({ albumId: "album-123" });
      const searchParams = Promise.resolve({ rotation: "180" });
      const Page = await CanvasPage({ params, searchParams });
      render(Page);

      expect(screen.getByTestId("rotation")).toHaveTextContent("180");
    });

    it("parses rotation value 270", async () => {
      mockPrisma.album.findUnique.mockResolvedValue(mockAlbumPublic);

      const params = Promise.resolve({ albumId: "album-123" });
      const searchParams = Promise.resolve({ rotation: "270" });
      const Page = await CanvasPage({ params, searchParams });
      render(Page);

      expect(screen.getByTestId("rotation")).toHaveTextContent("270");
    });

    it("parses order value random", async () => {
      mockPrisma.album.findUnique.mockResolvedValue(mockAlbumPublic);

      const params = Promise.resolve({ albumId: "album-123" });
      const searchParams = Promise.resolve({ order: "random" });
      const Page = await CanvasPage({ params, searchParams });
      render(Page);

      expect(screen.getByTestId("order")).toHaveTextContent("random");
    });

    it("defaults to album for invalid order value", async () => {
      mockPrisma.album.findUnique.mockResolvedValue(mockAlbumPublic);

      const params = Promise.resolve({ albumId: "album-123" });
      const searchParams = Promise.resolve({ order: "invalid" });
      const Page = await CanvasPage({ params, searchParams });
      render(Page);

      expect(screen.getByTestId("order")).toHaveTextContent("album");
    });

    it("parses valid interval value", async () => {
      mockPrisma.album.findUnique.mockResolvedValue(mockAlbumPublic);

      const params = Promise.resolve({ albumId: "album-123" });
      const searchParams = Promise.resolve({ interval: "30" });
      const Page = await CanvasPage({ params, searchParams });
      render(Page);

      expect(screen.getByTestId("interval")).toHaveTextContent("30");
    });

    it("clamps interval to minimum 5", async () => {
      mockPrisma.album.findUnique.mockResolvedValue(mockAlbumPublic);

      const params = Promise.resolve({ albumId: "album-123" });
      const searchParams = Promise.resolve({ interval: "2" });
      const Page = await CanvasPage({ params, searchParams });
      render(Page);

      expect(screen.getByTestId("interval")).toHaveTextContent("5");
    });

    it("clamps interval to maximum 60", async () => {
      mockPrisma.album.findUnique.mockResolvedValue(mockAlbumPublic);

      const params = Promise.resolve({ albumId: "album-123" });
      const searchParams = Promise.resolve({ interval: "120" });
      const Page = await CanvasPage({ params, searchParams });
      render(Page);

      expect(screen.getByTestId("interval")).toHaveTextContent("60");
    });

    it("defaults interval for non-numeric value", async () => {
      mockPrisma.album.findUnique.mockResolvedValue(mockAlbumPublic);

      const params = Promise.resolve({ albumId: "album-123" });
      const searchParams = Promise.resolve({ interval: "abc" });
      const Page = await CanvasPage({ params, searchParams });
      render(Page);

      expect(screen.getByTestId("interval")).toHaveTextContent("5");
    });
  });

  describe("generateMetadata", () => {
    it("returns correct metadata when album exists", async () => {
      mockPrisma.album.findUnique.mockResolvedValue(mockAlbumPublic);

      const params = Promise.resolve({ albumId: "album-123" });
      const searchParams = Promise.resolve({});
      const metadata = await generateMetadata({ params, searchParams });

      expect(metadata.title).toBe("My Photo Album - Canvas Display");
      expect(metadata.description).toBe("Viewing My Photo Album on Canvas");
    });

    it("returns not found metadata when album does not exist", async () => {
      mockPrisma.album.findUnique.mockResolvedValue(null);

      const params = Promise.resolve({ albumId: "nonexistent" });
      const searchParams = Promise.resolve({});
      const metadata = await generateMetadata({ params, searchParams });

      expect(metadata.title).toBe("Album Not Found - Spike Land Canvas");
      expect(metadata.description).toBe("The requested album could not be found.");
    });
  });
});
