import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";
import { POST } from "./route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    album: {
      findUnique: vi.fn(),
    },
    enhancedImage: {
      findMany: vi.fn(),
    },
    albumImage: {
      aggregate: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { auth } from "@/auth";
import prisma from "@/lib/prisma";

describe("/api/images/move-to-album", () => {
  const mockUserId = "clq1234567890userabcdefgh";
  const mockImageIds = ["clq1234567890img1abcdefgh", "clq1234567890img2abcdefgh"];
  const mockTargetAlbumId = "clq1234567890albmtgtabcde";
  const mockSourceAlbumId = "clq1234567890albmsrcabcde";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST", () => {
    it("should return 401 if user is not authenticated", async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/images/move-to-album", {
        method: "POST",
        body: JSON.stringify({
          imageIds: mockImageIds,
          targetAlbumId: mockTargetAlbumId,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should return 400 if imageIds is not an array", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: mockUserId },
      } as any);

      const request = new NextRequest("http://localhost:3000/api/images/move-to-album", {
        method: "POST",
        body: JSON.stringify({
          imageIds: "not-an-array",
          targetAlbumId: mockTargetAlbumId,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Image IDs are required" });
    });

    it("should return 400 if imageIds is empty", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: mockUserId },
      } as any);

      const request = new NextRequest("http://localhost:3000/api/images/move-to-album", {
        method: "POST",
        body: JSON.stringify({
          imageIds: [],
          targetAlbumId: mockTargetAlbumId,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Image IDs are required" });
    });

    it("should return 400 if imageIds array has more than 100 items", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: mockUserId },
      } as any);

      // Create array with 101 items
      const tooManyIds = Array.from({ length: 101 }, (_, i) => `image-${i}`);

      const request = new NextRequest("http://localhost:3000/api/images/move-to-album", {
        method: "POST",
        body: JSON.stringify({
          imageIds: tooManyIds,
          targetAlbumId: mockTargetAlbumId,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Cannot move more than 100 images at once" });
    });

    it("should return 400 if imageIds contain invalid CUID format", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: mockUserId },
      } as any);

      const request = new NextRequest("http://localhost:3000/api/images/move-to-album", {
        method: "POST",
        body: JSON.stringify({
          imageIds: ["invalid-id", "123", ""],
          targetAlbumId: mockTargetAlbumId,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid image ID format");
      expect(data.invalidIds).toEqual(["invalid-id", "123", ""]);
    });

    it("should return 400 if imageIds contain non-string values", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: mockUserId },
      } as any);

      const request = new NextRequest("http://localhost:3000/api/images/move-to-album", {
        method: "POST",
        body: JSON.stringify({
          imageIds: [123, null, undefined, {}],
          targetAlbumId: mockTargetAlbumId,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid image ID format");
      expect(data.invalidIds).toHaveLength(4);
    });

    it("should deduplicate imageIds before processing", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: mockUserId },
      } as any);

      (prisma.album.findUnique as Mock).mockResolvedValue({
        userId: mockUserId,
      } as any);

      // Return only unique images
      (prisma.enhancedImage.findMany as Mock).mockResolvedValue([
        { id: "clq1234567890abcdefghijkl" },
      ] as any);

      (prisma.albumImage.aggregate as Mock).mockResolvedValue({
        _max: { sortOrder: 5 },
      } as any);

      const now = new Date();
      (prisma.albumImage.upsert as Mock).mockResolvedValue({
        id: "album-image-1",
        albumId: mockTargetAlbumId,
        imageId: "clq1234567890abcdefghijkl",
        sortOrder: 6,
        addedAt: now,
      } as any);

      const request = new NextRequest("http://localhost:3000/api/images/move-to-album", {
        method: "POST",
        body: JSON.stringify({
          // Duplicate the same ID 3 times
          imageIds: [
            "clq1234567890abcdefghijkl",
            "clq1234567890abcdefghijkl",
            "clq1234567890abcdefghijkl",
          ],
          targetAlbumId: mockTargetAlbumId,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Should only process once due to deduplication
      expect(data.results).toHaveLength(1);
      expect(prisma.albumImage.upsert).toHaveBeenCalledTimes(1);
    });

    it("should return 400 if targetAlbumId is missing", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: mockUserId },
      } as any);

      const request = new NextRequest("http://localhost:3000/api/images/move-to-album", {
        method: "POST",
        body: JSON.stringify({
          imageIds: mockImageIds,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Target album ID is required" });
    });

    it("should return 400 if targetAlbumId is not a string", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: mockUserId },
      } as any);

      const request = new NextRequest("http://localhost:3000/api/images/move-to-album", {
        method: "POST",
        body: JSON.stringify({
          imageIds: mockImageIds,
          targetAlbumId: 123,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Target album ID is required" });
    });

    it("should return 404 if target album does not exist", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: mockUserId },
      } as any);

      (prisma.album.findUnique as Mock).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/images/move-to-album", {
        method: "POST",
        body: JSON.stringify({
          imageIds: mockImageIds,
          targetAlbumId: mockTargetAlbumId,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "Target album not found" });
    });

    it("should return 403 if target album does not belong to user", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: mockUserId },
      } as any);

      (prisma.album.findUnique as Mock).mockResolvedValue({
        userId: "other-user",
      } as any);

      const request = new NextRequest("http://localhost:3000/api/images/move-to-album", {
        method: "POST",
        body: JSON.stringify({
          imageIds: mockImageIds,
          targetAlbumId: mockTargetAlbumId,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({
        error: "You do not have permission to add images to this album",
      });
    });

    it("should return 400 if some images do not belong to user", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: mockUserId },
      } as any);

      (prisma.album.findUnique as Mock).mockResolvedValue({
        userId: mockUserId,
      } as any);

      // Only return one image instead of two
      (prisma.enhancedImage.findMany as Mock).mockResolvedValue([
        { id: "clq1234567890img1abcdefgh" },
      ] as any);

      const request = new NextRequest("http://localhost:3000/api/images/move-to-album", {
        method: "POST",
        body: JSON.stringify({
          imageIds: mockImageIds,
          targetAlbumId: mockTargetAlbumId,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: "Some images were not found or do not belong to you",
      });
    });

    it("should return 404 if source album does not exist", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: mockUserId },
      } as any);

      (prisma.album.findUnique as Mock)
        .mockResolvedValueOnce({ userId: mockUserId } as any) // Target album
        .mockResolvedValueOnce(null); // Source album

      (prisma.enhancedImage.findMany as Mock).mockResolvedValue([
        { id: "clq1234567890img1abcdefgh" },
        { id: "clq1234567890img2abcdefgh" },
      ] as any);

      const request = new NextRequest("http://localhost:3000/api/images/move-to-album", {
        method: "POST",
        body: JSON.stringify({
          imageIds: mockImageIds,
          targetAlbumId: mockTargetAlbumId,
          removeFromSourceAlbum: mockSourceAlbumId,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "Source album not found" });
    });

    it("should return 403 if source album does not belong to user", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: mockUserId },
      } as any);

      (prisma.album.findUnique as Mock)
        .mockResolvedValueOnce({ userId: mockUserId } as any) // Target album
        .mockResolvedValueOnce({ userId: "other-user" } as any); // Source album

      (prisma.enhancedImage.findMany as Mock).mockResolvedValue([
        { id: "clq1234567890img1abcdefgh" },
        { id: "clq1234567890img2abcdefgh" },
      ] as any);

      const request = new NextRequest("http://localhost:3000/api/images/move-to-album", {
        method: "POST",
        body: JSON.stringify({
          imageIds: mockImageIds,
          targetAlbumId: mockTargetAlbumId,
          removeFromSourceAlbum: mockSourceAlbumId,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({
        error: "You do not have permission to remove images from the source album",
      });
    });

    it("should successfully move images to target album", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: mockUserId },
      } as any);

      (prisma.album.findUnique as Mock).mockResolvedValue({
        userId: mockUserId,
      } as any);

      (prisma.enhancedImage.findMany as Mock).mockResolvedValue([
        { id: "clq1234567890img1abcdefgh" },
        { id: "clq1234567890img2abcdefgh" },
      ] as any);

      (prisma.albumImage.aggregate as Mock).mockResolvedValue({
        _max: { sortOrder: 5 },
      } as any);

      const now = new Date();
      (prisma.albumImage.upsert as Mock)
        .mockResolvedValueOnce({
          id: "clq1234567890albimg1abcde",
          albumId: mockTargetAlbumId,
          imageId: "clq1234567890img1abcdefgh",
          sortOrder: 6,
          addedAt: now,
        } as any)
        .mockResolvedValueOnce({
          id: "clq1234567890albimg2abcde",
          albumId: mockTargetAlbumId,
          imageId: "clq1234567890img2abcdefgh",
          sortOrder: 7,
          addedAt: now,
        } as any);

      const request = new NextRequest("http://localhost:3000/api/images/move-to-album", {
        method: "POST",
        body: JSON.stringify({
          imageIds: mockImageIds,
          targetAlbumId: mockTargetAlbumId,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.moved).toBe(2);
      expect(data.failed).toBe(0);
      expect(data.results).toHaveLength(2);
      expect(data.results[0]).toMatchObject({
        imageId: "clq1234567890img1abcdefgh",
        success: true,
        albumImageId: "clq1234567890albimg1abcde",
      });
      expect(data.results[1]).toMatchObject({
        imageId: "clq1234567890img2abcdefgh",
        success: true,
        albumImageId: "clq1234567890albimg2abcde",
      });
    });

    it("should move images and remove from source album", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: mockUserId },
      } as any);

      (prisma.album.findUnique as Mock)
        .mockResolvedValueOnce({ userId: mockUserId } as any) // Target album
        .mockResolvedValueOnce({ userId: mockUserId } as any); // Source album

      (prisma.enhancedImage.findMany as Mock).mockResolvedValue([
        { id: "clq1234567890img1abcdefgh" },
        { id: "clq1234567890img2abcdefgh" },
      ] as any);

      (prisma.albumImage.aggregate as Mock).mockResolvedValue({
        _max: { sortOrder: null },
      } as any);

      const now = new Date();
      (prisma.albumImage.upsert as Mock)
        .mockResolvedValueOnce({
          id: "clq1234567890albimg1abcde",
          albumId: mockTargetAlbumId,
          imageId: "clq1234567890img1abcdefgh",
          sortOrder: 0,
          addedAt: now,
        } as any)
        .mockResolvedValueOnce({
          id: "clq1234567890albimg2abcde",
          albumId: mockTargetAlbumId,
          imageId: "clq1234567890img2abcdefgh",
          sortOrder: 1,
          addedAt: now,
        } as any);

      (prisma.albumImage.deleteMany as Mock).mockResolvedValue({ count: 1 } as any);

      const request = new NextRequest("http://localhost:3000/api/images/move-to-album", {
        method: "POST",
        body: JSON.stringify({
          imageIds: mockImageIds,
          targetAlbumId: mockTargetAlbumId,
          removeFromSourceAlbum: mockSourceAlbumId,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.moved).toBe(2);
      expect(data.failed).toBe(0);
      expect(prisma.albumImage.deleteMany).toHaveBeenCalledTimes(2);
      expect(prisma.albumImage.deleteMany).toHaveBeenCalledWith({
        where: {
          albumId: mockSourceAlbumId,
          imageId: "clq1234567890img1abcdefgh",
        },
      });
    });

    it("should handle images already in album gracefully", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: mockUserId },
      } as any);

      (prisma.album.findUnique as Mock).mockResolvedValue({
        userId: mockUserId,
      } as any);

      (prisma.enhancedImage.findMany as Mock).mockResolvedValue([
        { id: "clq1234567890img1abcdefgh" },
      ] as any);

      (prisma.albumImage.aggregate as Mock).mockResolvedValue({
        _max: { sortOrder: 5 },
      } as any);

      // Simulate already existing image (addedAt is more than 1 second ago)
      const oldDate = new Date(Date.now() - 5000);
      (prisma.albumImage.upsert as Mock).mockResolvedValue({
        id: "clq1234567890albimg1abcde",
        albumId: mockTargetAlbumId,
        imageId: "clq1234567890img1abcdefgh",
        sortOrder: 6,
        addedAt: oldDate,
      } as any);

      const request = new NextRequest("http://localhost:3000/api/images/move-to-album", {
        method: "POST",
        body: JSON.stringify({
          imageIds: ["clq1234567890img1abcdefgh"],
          targetAlbumId: mockTargetAlbumId,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.alreadyInAlbum).toBe(1);
    });

    it("should handle partial failures gracefully", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: mockUserId },
      } as any);

      (prisma.album.findUnique as Mock).mockResolvedValue({
        userId: mockUserId,
      } as any);

      (prisma.enhancedImage.findMany as Mock).mockResolvedValue([
        { id: "clq1234567890img1abcdefgh" },
        { id: "clq1234567890img2abcdefgh" },
      ] as any);

      (prisma.albumImage.aggregate as Mock).mockResolvedValue({
        _max: { sortOrder: 5 },
      } as any);

      const now = new Date();
      (prisma.albumImage.upsert as Mock)
        .mockResolvedValueOnce({
          id: "clq1234567890albimg1abcde",
          albumId: mockTargetAlbumId,
          imageId: "clq1234567890img1abcdefgh",
          sortOrder: 6,
          addedAt: now,
        } as any)
        .mockRejectedValueOnce(new Error("Database error"));

      const request = new NextRequest("http://localhost:3000/api/images/move-to-album", {
        method: "POST",
        body: JSON.stringify({
          imageIds: mockImageIds,
          targetAlbumId: mockTargetAlbumId,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.moved).toBe(1);
      expect(data.failed).toBe(1);
      expect(data.results).toHaveLength(2);
      expect(data.results[0].success).toBe(true);
      expect(data.results[1].success).toBe(false);
      expect(data.results[1].error).toBe("Database error");
    });

    it("should handle unknown errors in image processing", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: mockUserId },
      } as any);

      (prisma.album.findUnique as Mock).mockResolvedValue({
        userId: mockUserId,
      } as any);

      (prisma.enhancedImage.findMany as Mock).mockResolvedValue([
        { id: "clq1234567890img1abcdefgh" },
      ] as any);

      (prisma.albumImage.aggregate as Mock).mockResolvedValue({
        _max: { sortOrder: 5 },
      } as any);

      (prisma.albumImage.upsert as Mock).mockRejectedValue("String error");

      const request = new NextRequest("http://localhost:3000/api/images/move-to-album", {
        method: "POST",
        body: JSON.stringify({
          imageIds: ["clq1234567890img1abcdefgh"],
          targetAlbumId: mockTargetAlbumId,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results[0].error).toBe("Unknown error");
    });

    it("should return 500 on unexpected errors", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: mockUserId },
      } as any);

      (prisma.album.findUnique as Mock).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const request = new NextRequest("http://localhost:3000/api/images/move-to-album", {
        method: "POST",
        body: JSON.stringify({
          imageIds: mockImageIds,
          targetAlbumId: mockTargetAlbumId,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Failed to move images to album" });
    });
  });
});
