/**
 * Tests for Browse Images for Gallery API Route
 */

import { JobStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  default: {
    enhancedImage: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));
vi.mock("@/lib/auth/admin-middleware", () => ({
  requireAdminByUserId: vi.fn(),
}));

const { auth } = await import("@/auth");
const prisma = (await import("@/lib/prisma")).default;
const { requireAdminByUserId } = await import("@/lib/auth/admin-middleware");

// Valid cuid format IDs for testing
const VALID_ADMIN_ID = "cadmin123000000000000000";
const VALID_USER_ID = "cuser1000000000000000000";
const VALID_IMG_ID = "cimg1000000000000000000";
const VALID_JOB_ID = "cjob1000000000000000000";

describe("Browse Images for Gallery API", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("GET", () => {
    it("should return 401 if not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/admin/gallery/browse",
      );
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

      const request = new NextRequest(
        "http://localhost/api/admin/gallery/browse",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("Forbidden");
    });

    it("should return images with completed enhancement jobs", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

      const mockImages = [
        {
          id: VALID_IMG_ID,
          name: "test.jpg",
          description: "Test image",
          originalUrl: "https://example.com/original.jpg",
          originalWidth: 1920,
          originalHeight: 1080,
          isPublic: true,
          shareToken: "token123",
          createdAt: new Date("2025-01-01"),
          user: {
            id: VALID_USER_ID,
            name: "Test User",
            email: "user@example.com",
            image: "https://example.com/avatar.jpg",
          },
          enhancementJobs: [
            {
              id: VALID_JOB_ID,
              tier: "TIER_1K",
              enhancedUrl: "https://example.com/enhanced.jpg",
              enhancedWidth: 1920,
              enhancedHeight: 1080,
              status: JobStatus.COMPLETED,
              createdAt: new Date("2025-01-01"),
            },
          ],
        },
      ];

      vi.mocked(prisma.enhancedImage.findMany).mockResolvedValue(
        mockImages as any,
      );
      vi.mocked(prisma.enhancedImage.count).mockResolvedValue(1);

      const request = new NextRequest(
        "http://localhost/api/admin/gallery/browse",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.images).toHaveLength(1);
      expect(data.images[0].name).toBe("test.jpg");
      expect(data.images[0].enhancementJobs).toHaveLength(1);
      expect(data.images[0].enhancementJobs[0].status).toBe("COMPLETED");
      expect(data.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        pages: 1,
      });
    });

    it("should filter by userId", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);
      vi.mocked(prisma.enhancedImage.findMany).mockResolvedValue([]);
      vi.mocked(prisma.enhancedImage.count).mockResolvedValue(0);

      const request = new NextRequest(
        `http://localhost/api/admin/gallery/browse?userId=${VALID_USER_ID}`,
      );
      await GET(request);

      expect(prisma.enhancedImage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: VALID_USER_ID,
          }),
        }),
      );
    });

    it("should filter by shareToken", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);
      vi.mocked(prisma.enhancedImage.findMany).mockResolvedValue([]);
      vi.mocked(prisma.enhancedImage.count).mockResolvedValue(0);

      const request = new NextRequest(
        "http://localhost/api/admin/gallery/browse?shareToken=token123",
      );
      await GET(request);

      expect(prisma.enhancedImage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            shareToken: "token123",
          }),
        }),
      );
    });

    it("should support pagination", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);
      vi.mocked(prisma.enhancedImage.findMany).mockResolvedValue([]);
      vi.mocked(prisma.enhancedImage.count).mockResolvedValue(50);

      const request = new NextRequest(
        "http://localhost/api/admin/gallery/browse?page=3&limit=10",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(prisma.enhancedImage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
      expect(data.pagination).toEqual({
        page: 3,
        limit: 10,
        total: 50,
        pages: 5,
      });
    });

    it("should only include images with completed enhancement jobs", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);
      vi.mocked(prisma.enhancedImage.findMany).mockResolvedValue([]);
      vi.mocked(prisma.enhancedImage.count).mockResolvedValue(0);

      const request = new NextRequest(
        "http://localhost/api/admin/gallery/browse",
      );
      await GET(request);

      expect(prisma.enhancedImage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            enhancementJobs: {
              some: {
                status: JobStatus.COMPLETED,
              },
            },
          }),
        }),
      );
    });

    it("should combine multiple filters", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);
      vi.mocked(prisma.enhancedImage.findMany).mockResolvedValue([]);
      vi.mocked(prisma.enhancedImage.count).mockResolvedValue(0);

      const request = new NextRequest(
        `http://localhost/api/admin/gallery/browse?userId=${VALID_USER_ID}&shareToken=token123`,
      );
      await GET(request);

      expect(prisma.enhancedImage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: VALID_USER_ID,
            shareToken: "token123",
            enhancementJobs: {
              some: {
                status: JobStatus.COMPLETED,
              },
            },
          }),
        }),
      );
    });

    it("should order results by createdAt desc", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);
      vi.mocked(prisma.enhancedImage.findMany).mockResolvedValue([]);
      vi.mocked(prisma.enhancedImage.count).mockResolvedValue(0);

      const request = new NextRequest(
        "http://localhost/api/admin/gallery/browse",
      );
      await GET(request);

      expect(prisma.enhancedImage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            createdAt: "desc",
          },
        }),
      );
    });

    it("should validate query params", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

      // Test with userId that exceeds max length (51 chars)
      const tooLongId = "a".repeat(51);
      const request = new NextRequest(
        `http://localhost/api/admin/gallery/browse?userId=${tooLongId}`,
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
    });
  });
});
