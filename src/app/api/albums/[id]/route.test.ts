import { NextRequest } from "next/server";
import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, PATCH } from "./route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    album: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    albumImage: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("nanoid", () => ({
  nanoid: () => "new-share-token",
}));

import { auth } from "@/auth";
import prisma from "@/lib/prisma";

const createParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe("Album Detail API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/albums/[id]", () => {
    it("returns 404 when album is not found", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.album.findUnique as Mock).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/albums/abc");
      const response = await GET(request, createParams("abc"));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Album not found");
    });

    it("returns 404 for private album not owned by user", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "other_user" },
      });
      (prisma.album.findUnique as Mock).mockResolvedValue({
        id: "album_1",
        userId: "user_123",
        privacy: "PRIVATE",
        albumImages: [],
        _count: { albumImages: 0 },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/albums/album_1",
      );
      const response = await GET(request, createParams("album_1"));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Album not found");
    });

    it("returns album for owner", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.album.findUnique as Mock).mockResolvedValue({
        id: "album_1",
        userId: "user_123",
        name: "My Album",
        description: "Description",
        privacy: "PRIVATE",
        coverImageId: null,
        shareToken: null,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
        albumImages: [],
        _count: { albumImages: 0 },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/albums/album_1",
      );
      const response = await GET(request, createParams("album_1"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.album.name).toBe("My Album");
      expect(data.album.isOwner).toBe(true);
    });

    it("returns public album for non-owner", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "other_user" },
      });
      (prisma.album.findUnique as Mock).mockResolvedValue({
        id: "album_1",
        userId: "user_123",
        name: "Public Album",
        description: null,
        privacy: "PUBLIC",
        coverImageId: null,
        shareToken: "token123",
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
        albumImages: [],
        _count: { albumImages: 0 },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/albums/album_1",
      );
      const response = await GET(request, createParams("album_1"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.album.isOwner).toBe(false);
      expect(data.album.shareToken).toBeUndefined();
    });
  });

  describe("PATCH /api/albums/[id]", () => {
    it("returns 401 when not authenticated", async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/albums/abc", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
      });
      const response = await PATCH(request, createParams("abc"));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 404 when album not found", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.album.findUnique as Mock).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/albums/abc", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
      });
      const response = await PATCH(request, createParams("abc"));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Album not found");
    });

    it("returns 403 when user is not the owner", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "other_user" },
      });
      (prisma.album.findUnique as Mock).mockResolvedValue({
        userId: "user_123",
        shareToken: null,
      });

      const request = new NextRequest("http://localhost:3000/api/albums/abc", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
      });
      const response = await PATCH(request, createParams("abc"));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("updates album name successfully", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.album.findUnique as Mock).mockResolvedValue({
        userId: "user_123",
        shareToken: null,
      });
      (prisma.album.update as Mock).mockResolvedValue({
        id: "album_1",
        name: "Updated Name",
        description: null,
        privacy: "PRIVATE",
        coverImageId: null,
        shareToken: null,
        updatedAt: new Date("2025-01-02"),
      });

      const request = new NextRequest(
        "http://localhost:3000/api/albums/album_1",
        {
          method: "PATCH",
          body: JSON.stringify({ name: "Updated Name" }),
        },
      );
      const response = await PATCH(request, createParams("album_1"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.album.name).toBe("Updated Name");
    });

    it("returns 400 for empty name", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.album.findUnique as Mock).mockResolvedValue({
        userId: "user_123",
        shareToken: null,
      });

      const request = new NextRequest(
        "http://localhost:3000/api/albums/album_1",
        {
          method: "PATCH",
          body: JSON.stringify({ name: "  " }),
        },
      );
      const response = await PATCH(request, createParams("album_1"));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Album name is required");
    });

    it("generates share token when changing to public", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.album.findUnique as Mock).mockResolvedValue({
        userId: "user_123",
        shareToken: null,
      });
      (prisma.album.update as Mock).mockResolvedValue({
        id: "album_1",
        name: "Album",
        description: null,
        privacy: "PUBLIC",
        coverImageId: null,
        shareToken: "new-share-token",
        updatedAt: new Date("2025-01-02"),
      });

      const request = new NextRequest(
        "http://localhost:3000/api/albums/album_1",
        {
          method: "PATCH",
          body: JSON.stringify({ privacy: "PUBLIC" }),
        },
      );
      const response = await PATCH(request, createParams("album_1"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.album.shareToken).toBe("new-share-token");
    });
  });

  describe("DELETE /api/albums/[id]", () => {
    it("returns 401 when not authenticated", async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/albums/abc", {
        method: "DELETE",
      });
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

      const request = new NextRequest("http://localhost:3000/api/albums/abc", {
        method: "DELETE",
      });
      const response = await DELETE(request, createParams("abc"));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Album not found");
    });

    it("returns 403 when user is not the owner", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "other_user" },
      });
      (prisma.album.findUnique as Mock).mockResolvedValue({
        userId: "user_123",
      });

      const request = new NextRequest("http://localhost:3000/api/albums/abc", {
        method: "DELETE",
      });
      const response = await DELETE(request, createParams("abc"));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("deletes album successfully", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user_123" },
      });
      (prisma.album.findUnique as Mock).mockResolvedValue({
        userId: "user_123",
      });
      (prisma.album.delete as Mock).mockResolvedValue({});

      const request = new NextRequest(
        "http://localhost:3000/api/albums/album_1",
        {
          method: "DELETE",
        },
      );
      const response = await DELETE(request, createParams("album_1"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.album.delete).toHaveBeenCalledWith({
        where: { id: "album_1" },
      });
    });
  });
});
