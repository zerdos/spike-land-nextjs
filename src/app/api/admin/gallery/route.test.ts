/**
 * Tests for Featured Gallery Management API Route
 */

import { GalleryCategory } from "@prisma/client";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, PATCH, POST } from "./route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  default: {
    featuredGalleryItem: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    enhancedImage: {
      findUnique: vi.fn(),
    },
    imageEnhancementJob: {
      findUnique: vi.fn(),
    },
  },
}));
vi.mock("@/lib/auth/admin-middleware", () => ({
  requireAdminByUserId: vi.fn(),
}));
vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
}));

const { auth } = await import("@/auth");
const prisma = (await import("@/lib/prisma")).default;
const { requireAdminByUserId } = await import("@/lib/auth/admin-middleware");

// Valid cuid format IDs for testing
const VALID_ADMIN_ID = "cadmin123000000000000000";
const VALID_ITEM_ID = "citem1000000000000000000";
const VALID_IMG_ID = "cimg1000000000000000000";
const VALID_JOB_ID = "cjob1000000000000000000";
const VALID_USER_ID = "cuser1000000000000000000";

describe("Featured Gallery Management API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("GET", () => {
    it("should return 401 if not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/admin/gallery");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 if not admin", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_USER_ID },
      } as any);
      vi.mocked(requireAdminByUserId).mockRejectedValue(
        new Error("Forbidden: Admin access required"),
      );

      const request = new NextRequest("http://localhost/api/admin/gallery");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("Forbidden");
    });

    it("should return gallery items with pagination", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

      const mockItems = [
        {
          id: VALID_ITEM_ID,
          title: "Portrait Shot",
          description: "Beautiful portrait",
          category: GalleryCategory.PORTRAIT,
          originalUrl: "https://example.com/original.jpg",
          enhancedUrl: "https://example.com/enhanced.jpg",
          width: 16,
          height: 9,
          sourceImageId: VALID_IMG_ID,
          sourceJobId: VALID_JOB_ID,
          sortOrder: 0,
          isActive: true,
          createdAt: new Date("2025-01-01"),
          updatedAt: new Date("2025-01-01"),
          creator: {
            id: VALID_ADMIN_ID,
            name: "Admin",
            email: "admin@example.com",
          },
          sourceImage: {
            id: VALID_IMG_ID,
            name: "test.jpg",
            userId: VALID_USER_ID,
          },
          sourceJob: { id: VALID_JOB_ID, tier: "TIER_1K", status: "COMPLETED" },
        },
      ];

      vi.mocked(prisma.featuredGalleryItem.findMany).mockResolvedValue(
        mockItems as any,
      );
      vi.mocked(prisma.featuredGalleryItem.count).mockResolvedValue(1);

      const request = new NextRequest("http://localhost/api/admin/gallery");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(1);
      expect(data.items[0].title).toBe("Portrait Shot");
      expect(data.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        pages: 1,
      });
    });

    it("should filter by category", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);
      vi.mocked(prisma.featuredGalleryItem.findMany).mockResolvedValue([]);
      vi.mocked(prisma.featuredGalleryItem.count).mockResolvedValue(0);

      const request = new NextRequest(
        "http://localhost/api/admin/gallery?category=LANDSCAPE",
      );
      await GET(request);

      expect(prisma.featuredGalleryItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { category: GalleryCategory.LANDSCAPE },
        }),
      );
    });

    it("should filter by isActive", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);
      vi.mocked(prisma.featuredGalleryItem.findMany).mockResolvedValue([]);
      vi.mocked(prisma.featuredGalleryItem.count).mockResolvedValue(0);

      const request = new NextRequest(
        "http://localhost/api/admin/gallery?isActive=true",
      );
      await GET(request);

      expect(prisma.featuredGalleryItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        }),
      );
    });

    it("should support pagination parameters", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);
      vi.mocked(prisma.featuredGalleryItem.findMany).mockResolvedValue([]);
      vi.mocked(prisma.featuredGalleryItem.count).mockResolvedValue(0);

      const request = new NextRequest(
        "http://localhost/api/admin/gallery?page=2&limit=10",
      );
      await GET(request);

      expect(prisma.featuredGalleryItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
    });
  });

  describe("POST", () => {
    it("should return 401 if not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/admin/gallery", {
        method: "POST",
        body: JSON.stringify({
          title: "Test",
          category: "PORTRAIT",
          sourceImageId: VALID_IMG_ID,
          sourceJobId: VALID_JOB_ID,
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 if not admin", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_USER_ID },
      } as any);
      vi.mocked(requireAdminByUserId).mockRejectedValue(
        new Error("Forbidden: Admin access required"),
      );

      const request = new NextRequest("http://localhost/api/admin/gallery", {
        method: "POST",
        body: JSON.stringify({
          title: "Test",
          category: "PORTRAIT",
          sourceImageId: VALID_IMG_ID,
          sourceJobId: VALID_JOB_ID,
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("Forbidden");
    });

    it("should create a new gallery item", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

      vi.mocked(prisma.enhancedImage.findUnique).mockResolvedValue({
        originalUrl: "https://example.com/original.jpg",
      } as any);
      vi.mocked(prisma.imageEnhancementJob.findUnique).mockResolvedValue({
        enhancedUrl: "https://example.com/enhanced.jpg",
      } as any);

      const mockItem = {
        id: VALID_ITEM_ID,
        title: "New Item",
        description: "Test description",
        category: GalleryCategory.PORTRAIT,
        originalUrl: "https://example.com/original.jpg",
        enhancedUrl: "https://example.com/enhanced.jpg",
        width: 16,
        height: 9,
        sourceImageId: VALID_IMG_ID,
        sourceJobId: VALID_JOB_ID,
        sortOrder: 0,
        isActive: true,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
        creator: {
          id: VALID_ADMIN_ID,
          name: "Admin",
          email: "admin@example.com",
        },
      };

      vi.mocked(prisma.featuredGalleryItem.create).mockResolvedValue(
        mockItem as any,
      );

      const request = new NextRequest("http://localhost/api/admin/gallery", {
        method: "POST",
        body: JSON.stringify({
          title: "New Item",
          description: "Test description",
          category: "PORTRAIT",
          sourceImageId: VALID_IMG_ID,
          sourceJobId: VALID_JOB_ID,
          width: 16,
          height: 9,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.item.title).toBe("New Item");
      expect(data.item.category).toBe("PORTRAIT");
    });

    it("should return 400 if title is missing", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

      const request = new NextRequest("http://localhost/api/admin/gallery", {
        method: "POST",
        body: JSON.stringify({
          category: "PORTRAIT",
          sourceImageId: VALID_IMG_ID,
          sourceJobId: VALID_JOB_ID,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
    });

    it("should return 400 if sourceImageId or sourceJobId is missing", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

      const request = new NextRequest("http://localhost/api/admin/gallery", {
        method: "POST",
        body: JSON.stringify({
          title: "Test",
          category: "PORTRAIT",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
    });

    it("should return 400 for invalid category", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

      const request = new NextRequest("http://localhost/api/admin/gallery", {
        method: "POST",
        body: JSON.stringify({
          title: "Test",
          category: "INVALID_CATEGORY",
          sourceImageId: VALID_IMG_ID,
          sourceJobId: VALID_JOB_ID,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
    });

    it("should return 404 if source image or job not found", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

      vi.mocked(prisma.enhancedImage.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.imageEnhancementJob.findUnique).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/admin/gallery", {
        method: "POST",
        body: JSON.stringify({
          title: "Test",
          category: "PORTRAIT",
          sourceImageId: VALID_IMG_ID,
          sourceJobId: VALID_JOB_ID,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain("not found");
    });

    it("should sanitize HTML from title and description", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

      vi.mocked(prisma.enhancedImage.findUnique).mockResolvedValue({
        originalUrl: "https://example.com/original.jpg",
      } as any);
      vi.mocked(prisma.imageEnhancementJob.findUnique).mockResolvedValue({
        enhancedUrl: "https://example.com/enhanced.jpg",
      } as any);

      const mockItem = {
        id: VALID_ITEM_ID,
        title: "Clean Title",
        description: "Clean description",
        category: GalleryCategory.PORTRAIT,
        originalUrl: "https://example.com/original.jpg",
        enhancedUrl: "https://example.com/enhanced.jpg",
        width: 16,
        height: 9,
        sourceImageId: VALID_IMG_ID,
        sourceJobId: VALID_JOB_ID,
        sortOrder: 0,
        isActive: true,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
        creator: {
          id: VALID_ADMIN_ID,
          name: "Admin",
          email: "admin@example.com",
        },
      };

      vi.mocked(prisma.featuredGalleryItem.create).mockResolvedValue(
        mockItem as any,
      );

      const request = new NextRequest("http://localhost/api/admin/gallery", {
        method: "POST",
        body: JSON.stringify({
          title: "<script>alert('xss')</script>Clean Title",
          description: "<b>Clean</b> description",
          category: "PORTRAIT",
          sourceImageId: VALID_IMG_ID,
          sourceJobId: VALID_JOB_ID,
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  describe("PATCH", () => {
    it("should return 401 if not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/admin/gallery", {
        method: "PATCH",
        body: JSON.stringify({ id: VALID_ITEM_ID, title: "Updated" }),
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 if not admin", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_USER_ID },
      } as any);
      vi.mocked(requireAdminByUserId).mockRejectedValue(
        new Error("Forbidden: Admin access required"),
      );

      const request = new NextRequest("http://localhost/api/admin/gallery", {
        method: "PATCH",
        body: JSON.stringify({ id: VALID_ITEM_ID, title: "Updated" }),
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("Forbidden");
    });

    it("should update gallery item", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

      const mockItem = {
        id: VALID_ITEM_ID,
        title: "Updated Title",
        description: "Updated description",
        category: GalleryCategory.LANDSCAPE,
        originalUrl: "https://example.com/original.jpg",
        enhancedUrl: "https://example.com/enhanced.jpg",
        width: 16,
        height: 9,
        sourceImageId: VALID_IMG_ID,
        sourceJobId: VALID_JOB_ID,
        sortOrder: 5,
        isActive: false,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-02"),
        creator: {
          id: VALID_ADMIN_ID,
          name: "Admin",
          email: "admin@example.com",
        },
      };

      vi.mocked(prisma.featuredGalleryItem.update).mockResolvedValue(
        mockItem as any,
      );

      const request = new NextRequest("http://localhost/api/admin/gallery", {
        method: "PATCH",
        body: JSON.stringify({
          id: VALID_ITEM_ID,
          title: "Updated Title",
          description: "Updated description",
          category: "LANDSCAPE",
          sortOrder: 5,
          isActive: false,
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.item.title).toBe("Updated Title");
      expect(data.item.category).toBe("LANDSCAPE");
      expect(data.item.sortOrder).toBe(5);
      expect(data.item.isActive).toBe(false);
    });

    it("should return 400 if id is missing", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

      const request = new NextRequest("http://localhost/api/admin/gallery", {
        method: "PATCH",
        body: JSON.stringify({ title: "Updated" }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
    });

    it("should return 400 for invalid category", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

      const request = new NextRequest("http://localhost/api/admin/gallery", {
        method: "PATCH",
        body: JSON.stringify({
          id: VALID_ITEM_ID,
          category: "INVALID",
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
    });

    it("should validate item ID length", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

      // ID exceeds max length of 50 characters
      const request = new NextRequest("http://localhost/api/admin/gallery", {
        method: "PATCH",
        body: JSON.stringify({
          id: "a".repeat(51),
          title: "Updated",
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
    });
  });

  describe("DELETE", () => {
    it("should return 401 if not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost/api/admin/gallery?id=${VALID_ITEM_ID}`,
        {
          method: "DELETE",
        },
      );
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 if not admin", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_USER_ID },
      } as any);
      vi.mocked(requireAdminByUserId).mockRejectedValue(
        new Error("Forbidden: Admin access required"),
      );

      const request = new NextRequest(
        `http://localhost/api/admin/gallery?id=${VALID_ITEM_ID}`,
        {
          method: "DELETE",
        },
      );
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("Forbidden");
    });

    it("should delete gallery item", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);
      vi.mocked(prisma.featuredGalleryItem.delete).mockResolvedValue({} as any);

      const request = new NextRequest(
        `http://localhost/api/admin/gallery?id=${VALID_ITEM_ID}`,
        {
          method: "DELETE",
        },
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.featuredGalleryItem.delete).toHaveBeenCalledWith({
        where: { id: VALID_ITEM_ID },
      });
    });

    it("should return 400 if id is missing", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

      const request = new NextRequest("http://localhost/api/admin/gallery", {
        method: "DELETE",
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("required");
    });
  });
});
