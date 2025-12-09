/**
 * Tests for Reorder Gallery Items API Route
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH } from "./route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  default: {
    $transaction: vi.fn(),
    featuredGalleryItem: {
      update: vi.fn(),
    },
  },
}));
vi.mock("@/lib/auth/admin-middleware", () => ({
  requireAdminByUserId: vi.fn(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const { auth } = await import("@/auth");
const prisma = (await import("@/lib/prisma")).default;
const { requireAdminByUserId } = await import("@/lib/auth/admin-middleware");

// Valid cuid format IDs for testing
const VALID_ADMIN_ID = "cadmin123000000000000000";
const VALID_USER_ID = "cuser1000000000000000000";
const VALID_ITEM1_ID = "citem1000000000000000001";
const VALID_ITEM2_ID = "citem1000000000000000002";
const VALID_ITEM3_ID = "citem1000000000000000003";

describe("Reorder Gallery Items API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("PATCH", () => {
    it("should return 401 if not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/admin/gallery/reorder",
        {
          method: "PATCH",
          body: JSON.stringify({
            items: [{ id: VALID_ITEM1_ID, sortOrder: 0 }],
          }),
        },
      );
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

      const request = new NextRequest(
        "http://localhost/api/admin/gallery/reorder",
        {
          method: "PATCH",
          body: JSON.stringify({
            items: [{ id: VALID_ITEM1_ID, sortOrder: 0 }],
          }),
        },
      );
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("Forbidden");
    });

    it("should update sort order for multiple items", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);
      vi.mocked(prisma.$transaction).mockResolvedValue([]);

      const items = [
        { id: VALID_ITEM1_ID, sortOrder: 0 },
        { id: VALID_ITEM2_ID, sortOrder: 1 },
        { id: VALID_ITEM3_ID, sortOrder: 2 },
      ];

      const request = new NextRequest(
        "http://localhost/api/admin/gallery/reorder",
        {
          method: "PATCH",
          body: JSON.stringify({ items }),
        },
      );

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.updated).toBe(3);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it("should return 400 if items array is missing", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

      const request = new NextRequest(
        "http://localhost/api/admin/gallery/reorder",
        {
          method: "PATCH",
          body: JSON.stringify({}),
        },
      );

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
    });

    it("should return 400 if items array is empty", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

      const request = new NextRequest(
        "http://localhost/api/admin/gallery/reorder",
        {
          method: "PATCH",
          body: JSON.stringify({ items: [] }),
        },
      );

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
    });

    it("should return 400 if items is not an array", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

      const request = new NextRequest(
        "http://localhost/api/admin/gallery/reorder",
        {
          method: "PATCH",
          body: JSON.stringify({ items: "not-an-array" }),
        },
      );

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
    });

    it("should return 400 if item ID exceeds max length", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

      // ID exceeds max length of 50 characters
      const request = new NextRequest(
        "http://localhost/api/admin/gallery/reorder",
        {
          method: "PATCH",
          body: JSON.stringify({
            items: [{ id: "a".repeat(51), sortOrder: 0 }],
          }),
        },
      );

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
    });

    it("should return 400 if item is missing id", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

      const request = new NextRequest(
        "http://localhost/api/admin/gallery/reorder",
        {
          method: "PATCH",
          body: JSON.stringify({
            items: [{ sortOrder: 0 }],
          }),
        },
      );

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
    });

    it("should return 400 if item is missing sortOrder", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

      const request = new NextRequest(
        "http://localhost/api/admin/gallery/reorder",
        {
          method: "PATCH",
          body: JSON.stringify({
            items: [{ id: VALID_ITEM1_ID }],
          }),
        },
      );

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
    });

    it("should return 400 if sortOrder is not a number", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

      const request = new NextRequest(
        "http://localhost/api/admin/gallery/reorder",
        {
          method: "PATCH",
          body: JSON.stringify({
            items: [{ id: VALID_ITEM1_ID, sortOrder: "not-a-number" }],
          }),
        },
      );

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
    });

    it("should handle transaction updates correctly", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

      vi.mocked(prisma.$transaction).mockImplementation(
        async (operations: any) => {
          // Verify the operations passed to transaction
          expect(Array.isArray(operations)).toBe(true);
          expect(operations).toHaveLength(2);
          return [];
        },
      );

      const items = [
        { id: VALID_ITEM1_ID, sortOrder: 5 },
        { id: VALID_ITEM2_ID, sortOrder: 10 },
      ];

      const request = new NextRequest(
        "http://localhost/api/admin/gallery/reorder",
        {
          method: "PATCH",
          body: JSON.stringify({ items }),
        },
      );

      await PATCH(request);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });
});
