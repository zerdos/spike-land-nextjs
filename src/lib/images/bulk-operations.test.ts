import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  bulkDeleteImages,
  bulkAddTags,
  bulkRemoveTags,
  bulkAddToAlbum,
  getUserTags,
  renameTagGlobally,
} from "./bulk-operations";
import prisma from "@/lib/prisma";

// Mock the prisma client
vi.mock("@/lib/prisma", () => ({
  default: {
    enhancedImage: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
    },
    album: {
      findUnique: vi.fn(),
    },
    albumImage: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
  },
}));

describe("bulkDeleteImages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should delete images belonging to user", async () => {
    const imageIds = ["img1", "img2", "img3"];
    const userId = "user1";

    // Mock ownership verification
    vi.mocked(prisma.enhancedImage.findMany).mockResolvedValue([
      { id: "img1", userId: "user1" },
      { id: "img2", userId: "user1" },
      { id: "img3", userId: "user1" },
    ] as never);

    // Mock delete
    vi.mocked(prisma.enhancedImage.deleteMany).mockResolvedValue({
      count: 3,
    } as never);

    const result = await bulkDeleteImages(imageIds, userId);

    expect(result.success).toBe(true);
    expect(result.processed).toBe(3);
    expect(result.failed).toBe(0);

    expect(prisma.enhancedImage.deleteMany).toHaveBeenCalledWith({
      where: {
        id: { in: imageIds },
        userId,
      },
    });
  });

  it("should throw error if images don't belong to user", async () => {
    vi.mocked(prisma.enhancedImage.findMany).mockResolvedValue([
      { id: "img1", userId: "user1" },
      { id: "img2", userId: "other-user" }, // Wrong owner
    ] as never);

    await expect(
      bulkDeleteImages(["img1", "img2"], "user1"),
    ).rejects.toThrow("Unauthorized");
  });

  it("should throw error if bulk size exceeds limit", async () => {
    const imageIds = Array.from({ length: 101 }, (_, i) => `img${i}`);

    await expect(bulkDeleteImages(imageIds, "user1")).rejects.toThrow(
      "Bulk operation limited to 100 images at once",
    );
  });

  it("should handle empty array", async () => {
    const result = await bulkDeleteImages([], "user1");

    expect(result.success).toBe(true);
    expect(result.processed).toBe(0);
    expect(prisma.enhancedImage.deleteMany).not.toHaveBeenCalled();
  });

  it("should return failure result on database error", async () => {
    vi.mocked(prisma.enhancedImage.findMany).mockResolvedValue([
      { id: "img1", userId: "user1" },
    ] as never);

    vi.mocked(prisma.enhancedImage.deleteMany).mockRejectedValue(
      new Error("Database error"),
    );

    const result = await bulkDeleteImages(["img1"], "user1");

    expect(result.success).toBe(false);
    expect(result.failed).toBe(1);
    expect(result.errors).toHaveLength(1);
  });
});

describe("bulkAddTags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should add tags to images", async () => {
    const imageIds = ["img1", "img2"];
    const tagsToAdd = ["Nature", "Landscape"];
    const userId = "user1";

    // Mock ownership verification
    vi.mocked(prisma.enhancedImage.findMany).mockResolvedValue([
      { id: "img1", userId: "user1" },
      { id: "img2", userId: "user1" },
    ] as never);

    // Mock findUnique for each image
    vi.mocked(prisma.enhancedImage.findUnique)
      .mockResolvedValueOnce({ tags: ["photo"] } as never)
      .mockResolvedValueOnce({ tags: [] } as never);

    vi.mocked(prisma.enhancedImage.update).mockResolvedValue({} as never);

    const result = await bulkAddTags(imageIds, tagsToAdd, userId);

    expect(result.success).toBe(true);
    expect(result.processed).toBe(2);
    expect(result.failed).toBe(0);

    // Check that tags were normalized to lowercase
    expect(prisma.enhancedImage.update).toHaveBeenCalledWith({
      where: { id: "img1" },
      data: { tags: ["photo", "nature", "landscape"] },
    });

    expect(prisma.enhancedImage.update).toHaveBeenCalledWith({
      where: { id: "img2" },
      data: { tags: ["nature", "landscape"] },
    });
  });

  it("should deduplicate tags when adding", async () => {
    vi.mocked(prisma.enhancedImage.findMany).mockResolvedValue([
      { id: "img1", userId: "user1" },
    ] as never);

    vi.mocked(prisma.enhancedImage.findUnique).mockResolvedValue({
      tags: ["nature", "landscape"],
    } as never);

    vi.mocked(prisma.enhancedImage.update).mockResolvedValue({} as never);

    await bulkAddTags(["img1"], ["landscape", "sunset"], "user1");

    // Should not have duplicate "landscape"
    expect(prisma.enhancedImage.update).toHaveBeenCalledWith({
      where: { id: "img1" },
      data: { tags: ["nature", "landscape", "sunset"] },
    });
  });

  it("should handle empty tags array", async () => {
    const result = await bulkAddTags(["img1"], [], "user1");

    expect(result.success).toBe(true);
    expect(result.processed).toBe(0);
    expect(prisma.enhancedImage.findMany).not.toHaveBeenCalled();
  });
});

describe("bulkRemoveTags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should remove tags from images", async () => {
    const imageIds = ["img1"];
    const tagsToRemove = ["Landscape"];
    const userId = "user1";

    vi.mocked(prisma.enhancedImage.findMany).mockResolvedValue([
      { id: "img1", userId: "user1" },
    ] as never);

    vi.mocked(prisma.enhancedImage.findUnique).mockResolvedValue({
      tags: ["nature", "landscape", "sunset"],
    } as never);

    vi.mocked(prisma.enhancedImage.update).mockResolvedValue({} as never);

    const result = await bulkRemoveTags(imageIds, tagsToRemove, userId);

    expect(result.success).toBe(true);
    expect(result.processed).toBe(1);

    // Should remove "landscape" (case-insensitive)
    expect(prisma.enhancedImage.update).toHaveBeenCalledWith({
      where: { id: "img1" },
      data: { tags: ["nature", "sunset"] },
    });
  });

  it("should handle case-insensitive tag removal", async () => {
    vi.mocked(prisma.enhancedImage.findMany).mockResolvedValue([
      { id: "img1", userId: "user1" },
    ] as never);

    vi.mocked(prisma.enhancedImage.findUnique).mockResolvedValue({
      tags: ["NATURE", "Landscape", "sunset"],
    } as never);

    vi.mocked(prisma.enhancedImage.update).mockResolvedValue({} as never);

    await bulkRemoveTags(["img1"], ["nature", "LANDSCAPE"], "user1");

    expect(prisma.enhancedImage.update).toHaveBeenCalledWith({
      where: { id: "img1" },
      data: { tags: ["sunset"] },
    });
  });
});

describe("bulkAddToAlbum", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should add images to album", async () => {
    const imageIds = ["img1", "img2"];
    const albumId = "album1";
    const userId = "user1";

    // Mock album ownership
    vi.mocked(prisma.album.findUnique).mockResolvedValue({
      userId: "user1",
    } as never);

    // Mock image ownership
    vi.mocked(prisma.enhancedImage.findMany).mockResolvedValue([
      { id: "img1", userId: "user1" },
      { id: "img2", userId: "user1" },
    ] as never);

    // Mock no existing relationships
    vi.mocked(prisma.albumImage.findMany).mockResolvedValue([]);

    vi.mocked(prisma.albumImage.createMany).mockResolvedValue({
      count: 2,
    } as never);

    const result = await bulkAddToAlbum(imageIds, albumId, userId);

    expect(result.success).toBe(true);
    expect(result.processed).toBe(2);

    expect(prisma.albumImage.createMany).toHaveBeenCalledWith({
      data: [
        { albumId: "album1", imageId: "img1" },
        { albumId: "album1", imageId: "img2" },
      ],
    });
  });

  it("should skip images already in album", async () => {
    vi.mocked(prisma.album.findUnique).mockResolvedValue({
      userId: "user1",
    } as never);

    vi.mocked(prisma.enhancedImage.findMany).mockResolvedValue([
      { id: "img1", userId: "user1" },
      { id: "img2", userId: "user1" },
    ] as never);

    // img1 already in album
    vi.mocked(prisma.albumImage.findMany).mockResolvedValue([
      { imageId: "img1" },
    ] as never);

    vi.mocked(prisma.albumImage.createMany).mockResolvedValue({
      count: 1,
    } as never);

    const result = await bulkAddToAlbum(["img1", "img2"], "album1", "user1");

    expect(result.processed).toBe(1); // Only img2 added
  });

  it("should throw error if album not found", async () => {
    vi.mocked(prisma.album.findUnique).mockResolvedValue(null);

    await expect(
      bulkAddToAlbum(["img1"], "album1", "user1"),
    ).rejects.toThrow("Album not found");
  });

  it("should throw error if album doesn't belong to user", async () => {
    vi.mocked(prisma.album.findUnique).mockResolvedValue({
      userId: "other-user",
    } as never);

    await expect(
      bulkAddToAlbum(["img1"], "album1", "user1"),
    ).rejects.toThrow("Unauthorized");
  });
});

describe("getUserTags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return all unique tags sorted alphabetically", async () => {
    vi.mocked(prisma.enhancedImage.findMany).mockResolvedValue([
      { tags: ["sunset", "nature", "landscape"] },
      { tags: ["portrait", "nature"] },
      { tags: ["sunset", "beach"] },
    ] as never);

    const tags = await getUserTags("user1");

    expect(tags).toEqual(["beach", "landscape", "nature", "portrait", "sunset"]);
  });

  it("should handle user with no images", async () => {
    vi.mocked(prisma.enhancedImage.findMany).mockResolvedValue([]);

    const tags = await getUserTags("user1");

    expect(tags).toEqual([]);
  });

  it("should deduplicate tags", async () => {
    vi.mocked(prisma.enhancedImage.findMany).mockResolvedValue([
      { tags: ["nature", "landscape"] },
      { tags: ["nature", "landscape"] },
    ] as never);

    const tags = await getUserTags("user1");

    expect(tags).toEqual(["landscape", "nature"]);
  });
});

describe("renameTagGlobally", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should rename tag in all user images", async () => {
    vi.mocked(prisma.enhancedImage.findMany).mockResolvedValue([
      { id: "img1", tags: ["old-tag", "other"] },
      { id: "img2", tags: ["old-tag"] },
    ] as never);

    vi.mocked(prisma.enhancedImage.update).mockResolvedValue({} as never);

    const result = await renameTagGlobally("old-tag", "new-tag", "user1");

    expect(result.success).toBe(true);
    expect(result.processed).toBe(2);

    expect(prisma.enhancedImage.update).toHaveBeenCalledWith({
      where: { id: "img1" },
      data: { tags: ["new-tag", "other"] },
    });

    expect(prisma.enhancedImage.update).toHaveBeenCalledWith({
      where: { id: "img2" },
      data: { tags: ["new-tag"] },
    });
  });

  it("should handle case-insensitive renaming", async () => {
    vi.mocked(prisma.enhancedImage.findMany).mockResolvedValue([
      { id: "img1", tags: ["OLD-TAG", "other"] },
    ] as never);

    vi.mocked(prisma.enhancedImage.update).mockResolvedValue({} as never);

    await renameTagGlobally("old-tag", "new-tag", "user1");

    expect(prisma.enhancedImage.update).toHaveBeenCalledWith({
      where: { id: "img1" },
      data: { tags: ["new-tag", "other"] },
    });
  });

  it("should deduplicate if new tag already exists", async () => {
    vi.mocked(prisma.enhancedImage.findMany).mockResolvedValue([
      { id: "img1", tags: ["old-tag", "new-tag", "other"] },
    ] as never);

    vi.mocked(prisma.enhancedImage.update).mockResolvedValue({} as never);

    await renameTagGlobally("old-tag", "new-tag", "user1");

    // Should only have one "new-tag"
    expect(prisma.enhancedImage.update).toHaveBeenCalledWith({
      where: { id: "img1" },
      data: { tags: ["new-tag", "other"] },
    });
  });

  it("should throw error for empty tag names", async () => {
    await expect(renameTagGlobally("", "new-tag", "user1")).rejects.toThrow(
      "Tag names cannot be empty",
    );

    await expect(
      renameTagGlobally("old-tag", "  ", "user1"),
    ).rejects.toThrow("Tag names cannot be empty");
  });

  it("should return early if old and new tags are the same", async () => {
    const result = await renameTagGlobally("same-tag", "same-tag", "user1");

    expect(result.success).toBe(true);
    expect(result.processed).toBe(0);
    expect(prisma.enhancedImage.findMany).not.toHaveBeenCalled();
  });
});
