/**
 * Tests for Public Albums Gallery API Route
 */

import prisma from "@/lib/prisma";
import { AlbumPrivacy, EnhancementTier, JobStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      findFirst: vi.fn(),
    },
    album: {
      findMany: vi.fn(),
    },
  },
}));

describe("GET /api/gallery/public-albums", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 404 if super admin user not found", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toEqual({ error: "Super admin user not found" });
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        email: "zolika84@gmail.com",
      },
      select: {
        id: true,
      },
    });
  });

  it("should return empty items array when no public albums exist", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: "super-admin-id",
    });

    vi.mocked(prisma.album.findMany).mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ items: [] });
    expect(prisma.album.findMany).toHaveBeenCalledWith({
      where: {
        userId: "super-admin-id",
        privacy: AlbumPrivacy.PUBLIC,
      },
      include: {
        albumImages: {
          include: {
            image: {
              include: {
                enhancementJobs: {
                  where: {
                    status: JobStatus.COMPLETED,
                  },
                  orderBy: {
                    createdAt: "desc",
                  },
                  take: 1,
                },
              },
            },
          },
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  });

  it("should return formatted items from public albums with completed enhancements", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: "super-admin-id",
    });

    const mockAlbums = [
      {
        id: "album-1",
        name: "Sample Album",
        description: "Test album",
        userId: "super-admin-id",
        privacy: AlbumPrivacy.PUBLIC,
        coverImageId: null,
        shareToken: "test-token",
        sortOrder: 0,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
        albumImages: [
          {
            id: "album-image-1",
            albumId: "album-1",
            imageId: "image-1",
            sortOrder: 0,
            addedAt: new Date("2025-01-01"),
            image: {
              id: "image-1",
              name: "Test Image 1",
              description: null,
              userId: "super-admin-id",
              originalUrl: "https://example.com/original1.jpg",
              originalR2Key: "original1.jpg",
              originalWidth: 1000,
              originalHeight: 800,
              originalSizeBytes: 500000,
              originalFormat: "jpg",
              isPublic: false,
              viewCount: 0,
              shareToken: null,
              createdAt: new Date("2025-01-01"),
              updatedAt: new Date("2025-01-01"),
              enhancementJobs: [
                {
                  id: "job-1",
                  imageId: "image-1",
                  userId: "super-admin-id",
                  tier: EnhancementTier.TIER_2K,
                  tokensCost: 5,
                  status: JobStatus.COMPLETED,
                  enhancedUrl: "https://example.com/enhanced1.jpg",
                  enhancedR2Key: "enhanced1.jpg",
                  enhancedWidth: 2000,
                  enhancedHeight: 1600,
                  enhancedSizeBytes: 1000000,
                  errorMessage: null,
                  retryCount: 0,
                  maxRetries: 3,
                  geminiPrompt: null,
                  geminiModel: null,
                  geminiTemp: null,
                  processingStartedAt: new Date("2025-01-01"),
                  processingCompletedAt: new Date("2025-01-01"),
                  workflowRunId: null,
                  createdAt: new Date("2025-01-01"),
                  updatedAt: new Date("2025-01-01"),
                },
              ],
            },
          },
          {
            id: "album-image-2",
            albumId: "album-1",
            imageId: "image-2",
            sortOrder: 1,
            addedAt: new Date("2025-01-02"),
            image: {
              id: "image-2",
              name: "Test Image 2",
              description: null,
              userId: "super-admin-id",
              originalUrl: "https://example.com/original2.jpg",
              originalR2Key: "original2.jpg",
              originalWidth: 1200,
              originalHeight: 900,
              originalSizeBytes: 600000,
              originalFormat: "jpg",
              isPublic: false,
              viewCount: 0,
              shareToken: null,
              createdAt: new Date("2025-01-02"),
              updatedAt: new Date("2025-01-02"),
              enhancementJobs: [
                {
                  id: "job-2",
                  imageId: "image-2",
                  userId: "super-admin-id",
                  tier: EnhancementTier.TIER_4K,
                  tokensCost: 10,
                  status: JobStatus.COMPLETED,
                  enhancedUrl: "https://example.com/enhanced2.jpg",
                  enhancedR2Key: "enhanced2.jpg",
                  enhancedWidth: 4000,
                  enhancedHeight: 3000,
                  enhancedSizeBytes: 2000000,
                  errorMessage: null,
                  retryCount: 0,
                  maxRetries: 3,
                  geminiPrompt: null,
                  geminiModel: null,
                  geminiTemp: null,
                  processingStartedAt: new Date("2025-01-02"),
                  processingCompletedAt: new Date("2025-01-02"),
                  workflowRunId: null,
                  createdAt: new Date("2025-01-02"),
                  updatedAt: new Date("2025-01-02"),
                },
              ],
            },
          },
        ],
      },
    ];

    vi.mocked(prisma.album.findMany).mockResolvedValue(mockAlbums);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.items).toHaveLength(2);
    expect(data.items[0]).toEqual({
      id: "image-1",
      title: "Test Image 1",
      originalUrl: "https://example.com/original1.jpg",
      enhancedUrl: "https://example.com/enhanced1.jpg",
      width: 2000,
      height: 1600,
      albumName: "Sample Album",
      tier: EnhancementTier.TIER_2K,
    });
    expect(data.items[1]).toEqual({
      id: "image-2",
      title: "Test Image 2",
      originalUrl: "https://example.com/original2.jpg",
      enhancedUrl: "https://example.com/enhanced2.jpg",
      width: 4000,
      height: 3000,
      albumName: "Sample Album",
      tier: EnhancementTier.TIER_4K,
    });
  });

  it("should skip images without completed enhancement jobs", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: "super-admin-id",
    });

    const mockAlbums = [
      {
        id: "album-1",
        name: "Sample Album",
        description: null,
        userId: "super-admin-id",
        privacy: AlbumPrivacy.PUBLIC,
        coverImageId: null,
        shareToken: "test-token",
        sortOrder: 0,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
        albumImages: [
          {
            id: "album-image-1",
            albumId: "album-1",
            imageId: "image-1",
            sortOrder: 0,
            addedAt: new Date("2025-01-01"),
            image: {
              id: "image-1",
              name: "Test Image 1",
              description: null,
              userId: "super-admin-id",
              originalUrl: "https://example.com/original1.jpg",
              originalR2Key: "original1.jpg",
              originalWidth: 1000,
              originalHeight: 800,
              originalSizeBytes: 500000,
              originalFormat: "jpg",
              isPublic: false,
              viewCount: 0,
              shareToken: null,
              createdAt: new Date("2025-01-01"),
              updatedAt: new Date("2025-01-01"),
              enhancementJobs: [],
            },
          },
        ],
      },
    ];

    vi.mocked(prisma.album.findMany).mockResolvedValue(mockAlbums);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.items).toHaveLength(0);
  });

  it("should skip images with incomplete enhanced data", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: "super-admin-id",
    });

    const mockAlbums = [
      {
        id: "album-1",
        name: "Sample Album",
        description: null,
        userId: "super-admin-id",
        privacy: AlbumPrivacy.PUBLIC,
        coverImageId: null,
        shareToken: "test-token",
        sortOrder: 0,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
        albumImages: [
          {
            id: "album-image-1",
            albumId: "album-1",
            imageId: "image-1",
            sortOrder: 0,
            addedAt: new Date("2025-01-01"),
            image: {
              id: "image-1",
              name: "Test Image 1",
              description: null,
              userId: "super-admin-id",
              originalUrl: "https://example.com/original1.jpg",
              originalR2Key: "original1.jpg",
              originalWidth: 1000,
              originalHeight: 800,
              originalSizeBytes: 500000,
              originalFormat: "jpg",
              isPublic: false,
              viewCount: 0,
              shareToken: null,
              createdAt: new Date("2025-01-01"),
              updatedAt: new Date("2025-01-01"),
              enhancementJobs: [
                {
                  id: "job-1",
                  imageId: "image-1",
                  userId: "super-admin-id",
                  tier: EnhancementTier.TIER_2K,
                  tokensCost: 5,
                  status: JobStatus.COMPLETED,
                  enhancedUrl: null,
                  enhancedR2Key: null,
                  enhancedWidth: null,
                  enhancedHeight: null,
                  enhancedSizeBytes: null,
                  errorMessage: null,
                  retryCount: 0,
                  maxRetries: 3,
                  geminiPrompt: null,
                  geminiModel: null,
                  geminiTemp: null,
                  processingStartedAt: new Date("2025-01-01"),
                  processingCompletedAt: null,
                  workflowRunId: null,
                  createdAt: new Date("2025-01-01"),
                  updatedAt: new Date("2025-01-01"),
                },
              ],
            },
          },
        ],
      },
    ];

    vi.mocked(prisma.album.findMany).mockResolvedValue(mockAlbums);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.items).toHaveLength(0);
  });

  it("should limit results to 12 items", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: "super-admin-id",
    });

    // Create mock data with 15 images (more than limit)
    const albumImages = Array.from({ length: 15 }, (_, i) => ({
      id: `album-image-${i}`,
      albumId: "album-1",
      imageId: `image-${i}`,
      sortOrder: i,
      addedAt: new Date(`2025-01-${String(i + 1).padStart(2, "0")}`),
      image: {
        id: `image-${i}`,
        name: `Test Image ${i}`,
        description: null,
        userId: "super-admin-id",
        originalUrl: `https://example.com/original${i}.jpg`,
        originalR2Key: `original${i}.jpg`,
        originalWidth: 1000,
        originalHeight: 800,
        originalSizeBytes: 500000,
        originalFormat: "jpg",
        isPublic: false,
        viewCount: 0,
        shareToken: null,
        createdAt: new Date(`2025-01-${String(i + 1).padStart(2, "0")}`),
        updatedAt: new Date(`2025-01-${String(i + 1).padStart(2, "0")}`),
        enhancementJobs: [
          {
            id: `job-${i}`,
            imageId: `image-${i}`,
            userId: "super-admin-id",
            tier: EnhancementTier.TIER_1K,
            tokensCost: 2,
            status: JobStatus.COMPLETED,
            enhancedUrl: `https://example.com/enhanced${i}.jpg`,
            enhancedR2Key: `enhanced${i}.jpg`,
            enhancedWidth: 1000,
            enhancedHeight: 800,
            enhancedSizeBytes: 800000,
            errorMessage: null,
            retryCount: 0,
            maxRetries: 3,
            geminiPrompt: null,
            geminiModel: null,
            geminiTemp: null,
            processingStartedAt: new Date(
              `2025-01-${String(i + 1).padStart(2, "0")}`,
            ),
            processingCompletedAt: new Date(
              `2025-01-${String(i + 1).padStart(2, "0")}`,
            ),
            workflowRunId: null,
            createdAt: new Date(`2025-01-${String(i + 1).padStart(2, "0")}`),
            updatedAt: new Date(`2025-01-${String(i + 1).padStart(2, "0")}`),
          },
        ],
      },
    }));

    const mockAlbums = [
      {
        id: "album-1",
        name: "Sample Album",
        description: null,
        userId: "super-admin-id",
        privacy: AlbumPrivacy.PUBLIC,
        coverImageId: null,
        shareToken: "test-token",
        sortOrder: 0,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
        albumImages,
      },
    ];

    vi.mocked(prisma.album.findMany).mockResolvedValue(mockAlbums);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.items).toHaveLength(12); // Should be limited to 12
  });

  it("should return 500 on database error", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(
      () => {},
    );

    vi.mocked(prisma.user.findFirst).mockRejectedValue(
      new Error("Database connection failed"),
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Internal server error" });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to fetch public album photos:",
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });

  it("should set correct cache headers", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: "super-admin-id",
    });

    vi.mocked(prisma.album.findMany).mockResolvedValue([]);

    const response = await GET();

    expect(response.headers.get("Cache-Control")).toBe(
      "public, s-maxage=300, stale-while-revalidate=600",
    );
  });
});
