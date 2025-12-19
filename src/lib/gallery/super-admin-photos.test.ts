import prisma from "@/lib/prisma";
import { AlbumPrivacy, EnhancementTier, JobStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSuperAdminPublicPhotos } from "./super-admin-photos";

vi.mock("@/lib/prisma", () => ({
  default: {
    album: {
      findMany: vi.fn(),
    },
  },
}));

// Album ID used for landing page photos
const LANDING_PAGE_ALBUM_ID = "cmit2mns8000004k07oqi2fa3";

describe("getSuperAdminPublicPhotos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty array when landing page album does not exist or is not public", async () => {
    vi.mocked(prisma.album.findMany).mockResolvedValue([]);

    const result = await getSuperAdminPublicPhotos();

    expect(result).toEqual([]);
    expect(prisma.album.findMany).toHaveBeenCalledWith({
      where: {
        id: LANDING_PAGE_ALBUM_ID,
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
                    enhancedUrl: { not: null },
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

  it("should return empty array when albums have no completed enhancement jobs", async () => {
    vi.mocked(prisma.album.findMany).mockResolvedValue([
      {
        id: "album-1",
        userId: "super-admin-id",
        name: "Test Album",
        description: null,
        coverImageId: null,
        privacy: AlbumPrivacy.PUBLIC,
        shareToken: null,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        albumImages: [
          {
            id: "album-image-1",
            albumId: "album-1",
            imageId: "image-1",
            sortOrder: 0,
            addedAt: new Date(),
            image: {
              id: "image-1",
              userId: "super-admin-id",
              name: "Test Image",
              description: null,
              originalUrl: "https://example.com/original.jpg",
              originalR2Key: "original-key",
              originalWidth: 1920,
              originalHeight: 1080,
              originalSizeBytes: 100000,
              originalFormat: "jpg",
              isPublic: false,
              viewCount: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
              shareToken: null,
              enhancementJobs: [],
            },
          },
        ],
      },
    ]);

    const result = await getSuperAdminPublicPhotos();

    expect(result).toEqual([]);
  });

  it("should return photos with completed enhancement jobs", async () => {
    const createdAt = new Date("2024-01-01");
    const updatedAt = new Date("2024-01-02");

    vi.mocked(prisma.album.findMany).mockResolvedValue([
      {
        id: "album-1",
        userId: "super-admin-id",
        name: "Test Album",
        description: null,
        coverImageId: null,
        privacy: AlbumPrivacy.PUBLIC,
        shareToken: null,
        sortOrder: 0,
        createdAt,
        updatedAt,
        albumImages: [
          {
            id: "album-image-1",
            albumId: "album-1",
            imageId: "image-1",
            sortOrder: 0,
            addedAt: createdAt,
            image: {
              id: "image-1",
              userId: "super-admin-id",
              name: "Test Image",
              description: null,
              originalUrl: "https://example.com/original.jpg",
              originalR2Key: "original-key",
              originalWidth: 1920,
              originalHeight: 1080,
              originalSizeBytes: 100000,
              originalFormat: "jpg",
              isPublic: false,
              viewCount: 0,
              createdAt,
              updatedAt,
              shareToken: null,
              enhancementJobs: [
                {
                  id: "job-1",
                  imageId: "image-1",
                  userId: "super-admin-id",
                  tier: EnhancementTier.TIER_2K,
                  tokensCost: 5,
                  status: JobStatus.COMPLETED,
                  enhancedUrl: "https://example.com/enhanced.jpg",
                  enhancedR2Key: "enhanced-key",
                  enhancedWidth: 2048,
                  enhancedHeight: 1152,
                  enhancedSizeBytes: 200000,
                  errorMessage: null,
                  retryCount: 0,
                  maxRetries: 3,
                  geminiPrompt: null,
                  geminiModel: null,
                  geminiTemp: null,
                  processingStartedAt: createdAt,
                  processingCompletedAt: updatedAt,
                  createdAt,
                  updatedAt,
                  workflowRunId: null,
                },
              ],
            },
          },
        ],
      },
    ]);

    const result = await getSuperAdminPublicPhotos();

    expect(result).toEqual([
      {
        id: "image-1",
        title: "Test Image",
        originalUrl: "https://example.com/original.jpg",
        enhancedUrl: "https://example.com/enhanced.jpg",
        width: 2048,
        height: 1152,
        albumName: "Test Album",
        tier: EnhancementTier.TIER_2K,
      },
    ]);
  });

  it("should skip photos without enhanced dimensions", async () => {
    const createdAt = new Date("2024-01-01");
    const updatedAt = new Date("2024-01-02");

    vi.mocked(prisma.album.findMany).mockResolvedValue([
      {
        id: "album-1",
        userId: "super-admin-id",
        name: "Test Album",
        description: null,
        coverImageId: null,
        privacy: AlbumPrivacy.PUBLIC,
        shareToken: null,
        sortOrder: 0,
        createdAt,
        updatedAt,
        albumImages: [
          {
            id: "album-image-1",
            albumId: "album-1",
            imageId: "image-1",
            sortOrder: 0,
            addedAt: createdAt,
            image: {
              id: "image-1",
              userId: "super-admin-id",
              name: "Test Image",
              description: null,
              originalUrl: "https://example.com/original.jpg",
              originalR2Key: "original-key",
              originalWidth: 1920,
              originalHeight: 1080,
              originalSizeBytes: 100000,
              originalFormat: "jpg",
              isPublic: false,
              viewCount: 0,
              createdAt,
              updatedAt,
              shareToken: null,
              enhancementJobs: [
                {
                  id: "job-1",
                  imageId: "image-1",
                  userId: "super-admin-id",
                  tier: EnhancementTier.TIER_2K,
                  tokensCost: 5,
                  status: JobStatus.COMPLETED,
                  enhancedUrl: "https://example.com/enhanced.jpg",
                  enhancedR2Key: "enhanced-key",
                  enhancedWidth: null,
                  enhancedHeight: null,
                  enhancedSizeBytes: 200000,
                  errorMessage: null,
                  retryCount: 0,
                  maxRetries: 3,
                  geminiPrompt: null,
                  geminiModel: null,
                  geminiTemp: null,
                  processingStartedAt: createdAt,
                  processingCompletedAt: updatedAt,
                  createdAt,
                  updatedAt,
                  workflowRunId: null,
                },
              ],
            },
          },
        ],
      },
    ]);

    const result = await getSuperAdminPublicPhotos();

    expect(result).toEqual([]);
  });

  it("should respect limit parameter", async () => {
    const createdAt = new Date("2024-01-01");
    const updatedAt = new Date("2024-01-02");

    vi.mocked(prisma.album.findMany).mockResolvedValue([
      {
        id: "album-1",
        userId: "super-admin-id",
        name: "Test Album",
        description: null,
        coverImageId: null,
        privacy: AlbumPrivacy.PUBLIC,
        shareToken: null,
        sortOrder: 0,
        createdAt,
        updatedAt,
        albumImages: [
          {
            id: "album-image-1",
            albumId: "album-1",
            imageId: "image-1",
            sortOrder: 0,
            addedAt: createdAt,
            image: {
              id: "image-1",
              userId: "super-admin-id",
              name: "Test Image 1",
              description: null,
              originalUrl: "https://example.com/original-1.jpg",
              originalR2Key: "original-key-1",
              originalWidth: 1920,
              originalHeight: 1080,
              originalSizeBytes: 100000,
              originalFormat: "jpg",
              isPublic: false,
              viewCount: 0,
              createdAt,
              updatedAt,
              shareToken: null,
              enhancementJobs: [
                {
                  id: "job-1",
                  imageId: "image-1",
                  userId: "super-admin-id",
                  tier: EnhancementTier.TIER_2K,
                  tokensCost: 5,
                  status: JobStatus.COMPLETED,
                  enhancedUrl: "https://example.com/enhanced-1.jpg",
                  enhancedR2Key: "enhanced-key-1",
                  enhancedWidth: 2048,
                  enhancedHeight: 1152,
                  enhancedSizeBytes: 200000,
                  errorMessage: null,
                  retryCount: 0,
                  maxRetries: 3,
                  geminiPrompt: null,
                  geminiModel: null,
                  geminiTemp: null,
                  processingStartedAt: createdAt,
                  processingCompletedAt: updatedAt,
                  createdAt,
                  updatedAt,
                  workflowRunId: null,
                },
              ],
            },
          },
          {
            id: "album-image-2",
            albumId: "album-1",
            imageId: "image-2",
            sortOrder: 1,
            addedAt: createdAt,
            image: {
              id: "image-2",
              userId: "super-admin-id",
              name: "Test Image 2",
              description: null,
              originalUrl: "https://example.com/original-2.jpg",
              originalR2Key: "original-key-2",
              originalWidth: 1920,
              originalHeight: 1080,
              originalSizeBytes: 100000,
              originalFormat: "jpg",
              isPublic: false,
              viewCount: 0,
              createdAt,
              updatedAt,
              shareToken: null,
              enhancementJobs: [
                {
                  id: "job-2",
                  imageId: "image-2",
                  userId: "super-admin-id",
                  tier: EnhancementTier.TIER_4K,
                  tokensCost: 10,
                  status: JobStatus.COMPLETED,
                  enhancedUrl: "https://example.com/enhanced-2.jpg",
                  enhancedR2Key: "enhanced-key-2",
                  enhancedWidth: 4096,
                  enhancedHeight: 2304,
                  enhancedSizeBytes: 400000,
                  errorMessage: null,
                  retryCount: 0,
                  maxRetries: 3,
                  geminiPrompt: null,
                  geminiModel: null,
                  geminiTemp: null,
                  processingStartedAt: createdAt,
                  processingCompletedAt: updatedAt,
                  createdAt,
                  updatedAt,
                  workflowRunId: null,
                },
              ],
            },
          },
        ],
      },
    ]);

    const result = await getSuperAdminPublicPhotos(1);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("image-1");
  });

  it("should handle multiple albums and return photos in correct order", async () => {
    const createdAt = new Date("2024-01-01");
    const updatedAt = new Date("2024-01-02");

    vi.mocked(prisma.album.findMany).mockResolvedValue([
      {
        id: "album-1",
        userId: "super-admin-id",
        name: "Album 1",
        description: null,
        coverImageId: null,
        privacy: AlbumPrivacy.PUBLIC,
        shareToken: null,
        sortOrder: 0,
        createdAt,
        updatedAt,
        albumImages: [
          {
            id: "album-image-1",
            albumId: "album-1",
            imageId: "image-1",
            sortOrder: 0,
            addedAt: createdAt,
            image: {
              id: "image-1",
              userId: "super-admin-id",
              name: "Image 1",
              description: null,
              originalUrl: "https://example.com/original-1.jpg",
              originalR2Key: "original-key-1",
              originalWidth: 1920,
              originalHeight: 1080,
              originalSizeBytes: 100000,
              originalFormat: "jpg",
              isPublic: false,
              viewCount: 0,
              createdAt,
              updatedAt,
              shareToken: null,
              enhancementJobs: [
                {
                  id: "job-1",
                  imageId: "image-1",
                  userId: "super-admin-id",
                  tier: EnhancementTier.TIER_1K,
                  tokensCost: 2,
                  status: JobStatus.COMPLETED,
                  enhancedUrl: "https://example.com/enhanced-1.jpg",
                  enhancedR2Key: "enhanced-key-1",
                  enhancedWidth: 1024,
                  enhancedHeight: 576,
                  enhancedSizeBytes: 150000,
                  errorMessage: null,
                  retryCount: 0,
                  maxRetries: 3,
                  geminiPrompt: null,
                  geminiModel: null,
                  geminiTemp: null,
                  processingStartedAt: createdAt,
                  processingCompletedAt: updatedAt,
                  createdAt,
                  updatedAt,
                  workflowRunId: null,
                },
              ],
            },
          },
        ],
      },
      {
        id: "album-2",
        userId: "super-admin-id",
        name: "Album 2",
        description: null,
        coverImageId: null,
        privacy: AlbumPrivacy.PUBLIC,
        shareToken: null,
        sortOrder: 0,
        createdAt,
        updatedAt,
        albumImages: [
          {
            id: "album-image-2",
            albumId: "album-2",
            imageId: "image-2",
            sortOrder: 0,
            addedAt: createdAt,
            image: {
              id: "image-2",
              userId: "super-admin-id",
              name: "Image 2",
              description: null,
              originalUrl: "https://example.com/original-2.jpg",
              originalR2Key: "original-key-2",
              originalWidth: 1920,
              originalHeight: 1080,
              originalSizeBytes: 100000,
              originalFormat: "jpg",
              isPublic: false,
              viewCount: 0,
              createdAt,
              updatedAt,
              shareToken: null,
              enhancementJobs: [
                {
                  id: "job-2",
                  imageId: "image-2",
                  userId: "super-admin-id",
                  tier: EnhancementTier.TIER_2K,
                  tokensCost: 5,
                  status: JobStatus.COMPLETED,
                  enhancedUrl: "https://example.com/enhanced-2.jpg",
                  enhancedR2Key: "enhanced-key-2",
                  enhancedWidth: 2048,
                  enhancedHeight: 1152,
                  enhancedSizeBytes: 250000,
                  errorMessage: null,
                  retryCount: 0,
                  maxRetries: 3,
                  geminiPrompt: null,
                  geminiModel: null,
                  geminiTemp: null,
                  processingStartedAt: createdAt,
                  processingCompletedAt: updatedAt,
                  createdAt,
                  updatedAt,
                  workflowRunId: null,
                },
              ],
            },
          },
        ],
      },
    ]);

    const result = await getSuperAdminPublicPhotos();

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: "image-1",
      title: "Image 1",
      originalUrl: "https://example.com/original-1.jpg",
      enhancedUrl: "https://example.com/enhanced-1.jpg",
      width: 1024,
      height: 576,
      albumName: "Album 1",
      tier: EnhancementTier.TIER_1K,
    });
    expect(result[1]).toEqual({
      id: "image-2",
      title: "Image 2",
      originalUrl: "https://example.com/original-2.jpg",
      enhancedUrl: "https://example.com/enhanced-2.jpg",
      width: 2048,
      height: 1152,
      albumName: "Album 2",
      tier: EnhancementTier.TIER_2K,
    });
  });

  it("should use most recent enhancement job when multiple exist", async () => {
    const createdAt = new Date("2024-01-01");
    const updatedAt = new Date("2024-01-02");
    const _olderDate = new Date("2024-01-01T10:00:00Z");
    const newerDate = new Date("2024-01-01T12:00:00Z");

    vi.mocked(prisma.album.findMany).mockResolvedValue([
      {
        id: "album-1",
        userId: "super-admin-id",
        name: "Test Album",
        description: null,
        coverImageId: null,
        privacy: AlbumPrivacy.PUBLIC,
        shareToken: null,
        sortOrder: 0,
        createdAt,
        updatedAt,
        albumImages: [
          {
            id: "album-image-1",
            albumId: "album-1",
            imageId: "image-1",
            sortOrder: 0,
            addedAt: createdAt,
            image: {
              id: "image-1",
              userId: "super-admin-id",
              name: "Test Image",
              description: null,
              originalUrl: "https://example.com/original.jpg",
              originalR2Key: "original-key",
              originalWidth: 1920,
              originalHeight: 1080,
              originalSizeBytes: 100000,
              originalFormat: "jpg",
              isPublic: false,
              viewCount: 0,
              createdAt,
              updatedAt,
              shareToken: null,
              enhancementJobs: [
                {
                  id: "job-2",
                  imageId: "image-1",
                  userId: "super-admin-id",
                  tier: EnhancementTier.TIER_4K,
                  tokensCost: 10,
                  status: JobStatus.COMPLETED,
                  enhancedUrl: "https://example.com/enhanced-newer.jpg",
                  enhancedR2Key: "enhanced-key-newer",
                  enhancedWidth: 4096,
                  enhancedHeight: 2304,
                  enhancedSizeBytes: 400000,
                  errorMessage: null,
                  retryCount: 0,
                  maxRetries: 3,
                  geminiPrompt: null,
                  geminiModel: null,
                  geminiTemp: null,
                  processingStartedAt: newerDate,
                  processingCompletedAt: newerDate,
                  createdAt: newerDate,
                  updatedAt: newerDate,
                  workflowRunId: null,
                },
              ],
            },
          },
        ],
      },
    ]);

    const result = await getSuperAdminPublicPhotos();

    expect(result).toHaveLength(1);
    expect(result[0].enhancedUrl).toBe(
      "https://example.com/enhanced-newer.jpg",
    );
    expect(result[0].tier).toBe(EnhancementTier.TIER_4K);
  });

  it("should throw error when database query fails", async () => {
    const dbError = new Error("Database connection failed");
    vi.mocked(prisma.album.findMany).mockRejectedValue(dbError);

    await expect(getSuperAdminPublicPhotos()).rejects.toThrow(
      "Failed to fetch public albums: Database connection failed",
    );
  });
});
