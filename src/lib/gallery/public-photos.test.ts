import prisma from "@/lib/prisma";
import { JobStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getRecentPublicPhotos } from "./public-photos";

vi.mock("@/lib/prisma", () => ({
  default: {
    enhancedImage: { findMany: vi.fn() },
  },
}));

describe("getRecentPublicPhotos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return photos with enhanced URLs", async () => {
    vi.mocked(prisma.enhancedImage.findMany).mockResolvedValue([
      {
        id: "img-1",
        name: "Photo 1",
        originalUrl: "https://example.com/original.jpg",
        originalWidth: 1920,
        originalHeight: 1080,
        enhancementJobs: [
          { enhancedUrl: "https://example.com/enhanced.jpg" },
        ],
      },
    ] as any);

    const result = await getRecentPublicPhotos();

    expect(result).toEqual([
      {
        id: "img-1",
        name: "Photo 1",
        originalUrl: "https://example.com/original.jpg",
        enhancedUrl: "https://example.com/enhanced.jpg",
        width: 1920,
        height: 1080,
      },
    ]);
  });

  it("should return null enhancedUrl when no completed jobs exist", async () => {
    vi.mocked(prisma.enhancedImage.findMany).mockResolvedValue([
      {
        id: "img-1",
        name: "Photo 1",
        originalUrl: "https://example.com/original.jpg",
        originalWidth: 800,
        originalHeight: 600,
        enhancementJobs: [],
      },
    ] as any);

    const result = await getRecentPublicPhotos();

    expect(result[0]!.enhancedUrl).toBeNull();
  });

  it("should respect the limit parameter", async () => {
    vi.mocked(prisma.enhancedImage.findMany).mockResolvedValue([]);

    await getRecentPublicPhotos(50);

    expect(prisma.enhancedImage.findMany).toHaveBeenCalledWith({
      where: { isPublic: true },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        name: true,
        originalUrl: true,
        originalWidth: true,
        originalHeight: true,
        enhancementJobs: {
          where: {
            status: JobStatus.COMPLETED,
            enhancedUrl: { not: null },
          },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { enhancedUrl: true },
        },
      },
    });
  });

  it("should return empty array on database error", async () => {
    vi.mocked(prisma.enhancedImage.findMany).mockRejectedValue(
      new Error("DB error"),
    );

    const result = await getRecentPublicPhotos();

    expect(result).toEqual([]);
  });

  it("should return empty array when no public photos exist", async () => {
    vi.mocked(prisma.enhancedImage.findMany).mockResolvedValue([]);

    const result = await getRecentPublicPhotos();

    expect(result).toEqual([]);
  });

  it("should use default limit of 100", async () => {
    vi.mocked(prisma.enhancedImage.findMany).mockResolvedValue([]);

    await getRecentPublicPhotos();

    expect(prisma.enhancedImage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 }),
    );
  });
});
