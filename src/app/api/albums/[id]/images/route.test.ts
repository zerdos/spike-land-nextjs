import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";
import { DELETE, PATCH, POST } from "./route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    album: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    albumImage: {
      create: vi.fn(),
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
      aggregate: vi.fn(),
    },
    enhancedImage: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { auth } from "@/auth";
import prisma from "@/lib/prisma";

const createParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe("Album Images API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/albums/[id]/images", () => {
    it("returns 401 when not authenticated", async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/albums/abc/images",
        {
          method: "POST",
          body: JSON.stringify({ imageIds: ["img_1"] }),
        },
      );
      const response = await POST(request, createParams("abc"));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 404 when album not found", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.album.findUnique as Mock).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/albums/abc/images",
        {
          method: "POST",
          body: JSON.stringify({ imageIds: ["img_1"] }),
        },
      );
      const response = await POST(request, createParams("abc"));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Album not found");
    });

    it("returns 403 when user is not album owner", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "other_user" },
      });
      (prisma.album.findUnique as Mock).mockResolvedValue({
        userId: "user_123",
      });

      const request = new NextRequest(
        "http://localhost:3000/api/albums/abc/images",
        {
          method: "POST",
          body: JSON.stringify({ imageIds: ["img_1"] }),
        },
      );
      const response = await POST(request, createParams("abc"));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("returns 400 when imageIds is empty", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.album.findUnique as Mock).mockResolvedValue({
        userId: "user_123",
      });

      const request = new NextRequest(
        "http://localhost:3000/api/albums/abc/images",
        {
          method: "POST",
          body: JSON.stringify({ imageIds: [] }),
        },
      );
      const response = await POST(request, createParams("abc"));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Image IDs are required");
    });

    it("returns 400 when some images do not belong to user", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.album.findUnique as Mock).mockResolvedValue({
        userId: "user_123",
      });
      (prisma.enhancedImage.findMany as Mock).mockResolvedValue([
        { id: "img_1" },
      ]);

      const request = new NextRequest(
        "http://localhost:3000/api/albums/abc/images",
        {
          method: "POST",
          body: JSON.stringify({ imageIds: ["img_1", "img_2"] }),
        },
      );
      const response = await POST(request, createParams("abc"));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        "Some images were not found or do not belong to you",
      );
    });

    it("adds images to album successfully", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.album.findUnique as Mock).mockResolvedValue({
        userId: "user_123",
      });
      (prisma.enhancedImage.findMany as Mock).mockResolvedValue([
        { id: "img_1" },
        { id: "img_2" },
      ]);
      (prisma.albumImage.aggregate as Mock).mockResolvedValue({
        _max: { sortOrder: 0 },
      });
      (prisma.albumImage.create as Mock).mockResolvedValue({
        id: "album_img_1",
      });

      const request = new NextRequest(
        "http://localhost:3000/api/albums/abc/images",
        {
          method: "POST",
          body: JSON.stringify({ imageIds: ["img_1", "img_2"] }),
        },
      );
      const response = await POST(request, createParams("abc"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.added).toBe(2);
    });
  });

  describe("DELETE /api/albums/[id]/images", () => {
    it("returns 401 when not authenticated", async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/albums/abc/images",
        {
          method: "DELETE",
          body: JSON.stringify({ imageIds: ["img_1"] }),
        },
      );
      const response = await DELETE(request, createParams("abc"));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 404 when album not found", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.album.findUnique as Mock).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/albums/abc/images",
        {
          method: "DELETE",
          body: JSON.stringify({ imageIds: ["img_1"] }),
        },
      );
      const response = await DELETE(request, createParams("abc"));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Album not found");
    });

    it("removes images from album successfully", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.album.findUnique as Mock).mockResolvedValue({
        userId: "user_123",
        coverImageId: null,
      });
      (prisma.albumImage.deleteMany as Mock).mockResolvedValue({
        count: 2,
      });

      const request = new NextRequest(
        "http://localhost:3000/api/albums/abc/images",
        {
          method: "DELETE",
          body: JSON.stringify({ imageIds: ["img_1", "img_2"] }),
        },
      );
      const response = await DELETE(request, createParams("abc"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.removed).toBe(2);
    });

    it("clears cover image when it is removed", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.album.findUnique as Mock).mockResolvedValue({
        userId: "user_123",
        coverImageId: "img_1",
      });
      (prisma.albumImage.deleteMany as Mock).mockResolvedValue({
        count: 1,
      });
      (prisma.album.update as Mock).mockResolvedValue({});

      const request = new NextRequest(
        "http://localhost:3000/api/albums/abc/images",
        {
          method: "DELETE",
          body: JSON.stringify({ imageIds: ["img_1"] }),
        },
      );
      await DELETE(request, createParams("abc"));

      expect(prisma.album.update).toHaveBeenCalledWith({
        where: { id: "abc" },
        data: { coverImageId: null },
      });
    });
  });

  describe("PATCH /api/albums/[id]/images", () => {
    it("returns 401 when not authenticated", async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/albums/abc/images",
        {
          method: "PATCH",
          body: JSON.stringify({ imageOrder: ["img_1", "img_2"] }),
        },
      );
      const response = await PATCH(request, createParams("abc"));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 400 when imageOrder is not an array", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.album.findUnique as Mock).mockResolvedValue({
        userId: "user_123",
      });

      const request = new NextRequest(
        "http://localhost:3000/api/albums/abc/images",
        {
          method: "PATCH",
          body: JSON.stringify({ imageOrder: "invalid" }),
        },
      );
      const response = await PATCH(request, createParams("abc"));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Image order array is required");
    });

    it("reorders images successfully", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.album.findUnique as Mock).mockResolvedValue({
        userId: "user_123",
      });
      (prisma.$transaction as Mock).mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost:3000/api/albums/abc/images",
        {
          method: "PATCH",
          body: JSON.stringify({ imageOrder: ["img_2", "img_1", "img_3"] }),
        },
      );
      const response = await PATCH(request, createParams("abc"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });
});
