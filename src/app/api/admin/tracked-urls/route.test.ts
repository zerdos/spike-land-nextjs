/**
 * Tests for Tracked Paths Management API Route
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, POST } from "./route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  default: {
    trackedUrl: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));
vi.mock("@/lib/auth/admin-middleware", () => ({
  requireAdminByUserId: vi.fn(),
}));

const { auth } = await import("@/auth");
const prisma = (await import("@/lib/prisma")).default;
const { requireAdminByUserId } = await import("@/lib/auth/admin-middleware");

describe("Tracked Paths Management API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    // Reset requireAdminByUserId to resolve by default (admin access granted)
    vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);
  });

  describe("GET", () => {
    it("should return 401 if not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return tracked paths list for admin users", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);

      vi.mocked(prisma.trackedUrl.findMany).mockResolvedValue([
        {
          id: "path1",
          path: "/custom-page",
          label: "Custom Page",
          createdAt: new Date("2025-01-01"),
          createdBy: {
            name: "Admin User",
            email: "admin@example.com",
          },
        },
        {
          id: "path2",
          path: "/another-page",
          label: null,
          createdAt: new Date("2025-01-02"),
          createdBy: {
            name: "Test Admin",
            email: "test@example.com",
          },
        },
      ] as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.trackedPaths).toHaveLength(2);
      expect(data.trackedPaths[0].path).toBe("/custom-page");
      expect(data.trackedPaths[0].label).toBe("Custom Page");
      expect(data.trackedPaths[0].createdBy.name).toBe("Admin User");
      expect(data.trackedPaths[1].path).toBe("/another-page");
      expect(data.trackedPaths[1].label).toBeNull();
    });

    it("should query only active tracked paths", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);

      vi.mocked(prisma.trackedUrl.findMany).mockResolvedValue([]);

      await GET();

      expect(prisma.trackedUrl.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        }),
      );
    });

    it("should return 403 if admin check fails", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user_123" },
      } as any);

      vi.mocked(requireAdminByUserId).mockRejectedValue(
        new Error("Forbidden: Admin access required"),
      );

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("Forbidden");
    });

    it("should handle database errors", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);

      vi.mocked(prisma.trackedUrl.findMany).mockRejectedValue(
        new Error("Database error"),
      );

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
      expect(console.error).toHaveBeenCalledWith(
        "Failed to fetch tracked paths:",
        expect.any(Error),
      );
    });
  });

  describe("POST", () => {
    it("should create a new tracked path", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);

      vi.mocked(prisma.trackedUrl.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.trackedUrl.create).mockResolvedValue({
        id: "path1",
        path: "/new-page",
        label: "New Page",
        createdAt: new Date("2025-01-01"),
        createdBy: {
          name: "Admin User",
          email: "admin@example.com",
        },
      } as any);

      const request = new NextRequest(
        "http://localhost/api/admin/tracked-urls",
        {
          method: "POST",
          body: JSON.stringify({
            path: "/new-page",
            label: "New Page",
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.trackedPath.path).toBe("/new-page");
      expect(data.trackedPath.label).toBe("New Page");
      expect(data.trackedPath.createdBy.name).toBe("Admin User");
    });

    it("should create tracked path without label", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);

      vi.mocked(prisma.trackedUrl.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.trackedUrl.create).mockResolvedValue({
        id: "path1",
        path: "/new-page",
        label: null,
        createdAt: new Date("2025-01-01"),
        createdBy: {
          name: "Admin User",
          email: "admin@example.com",
        },
      } as any);

      const request = new NextRequest(
        "http://localhost/api/admin/tracked-urls",
        {
          method: "POST",
          body: JSON.stringify({
            path: "/new-page",
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.trackedPath.path).toBe("/new-page");
      expect(data.trackedPath.label).toBeNull();
    });

    it("should return 400 for missing path field", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);

      const request = new NextRequest(
        "http://localhost/api/admin/tracked-urls",
        {
          method: "POST",
          body: JSON.stringify({ label: "Test" }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Missing required field: path");
    });

    it("should return 400 if path does not start with /", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);

      const request = new NextRequest(
        "http://localhost/api/admin/tracked-urls",
        {
          method: "POST",
          body: JSON.stringify({
            path: "no-leading-slash",
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Path must start with /");
    });

    it("should return 400 if full URL is provided instead of path", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);

      const request = new NextRequest(
        "http://localhost/api/admin/tracked-urls",
        {
          method: "POST",
          body: JSON.stringify({
            path: "https://example.com/page",
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      // Full URLs don't start with /, so we get the "must start with /" error first
      expect(response.status).toBe(400);
      expect(data.error).toBe("Path must start with /");
    });

    it("should return 400 if path contains URL scheme", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);

      // Path that starts with / but contains ://
      const request = new NextRequest(
        "http://localhost/api/admin/tracked-urls",
        {
          method: "POST",
          body: JSON.stringify({
            path: "/https://example.com",
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Provide a path");
    });

    it("should return 409 if path already exists", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);

      vi.mocked(prisma.trackedUrl.findUnique).mockResolvedValue({
        id: "path1",
        path: "/existing-page",
      } as any);

      const request = new NextRequest(
        "http://localhost/api/admin/tracked-urls",
        {
          method: "POST",
          body: JSON.stringify({
            path: "/existing-page",
            label: "Existing Page",
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain("already tracked");
    });

    it("should return 401 if not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/admin/tracked-urls",
        {
          method: "POST",
          body: JSON.stringify({
            path: "/new-page",
            label: "New Page",
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 if admin check fails", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user_123" },
      } as any);

      vi.mocked(requireAdminByUserId).mockRejectedValue(
        new Error("Forbidden: Admin access required"),
      );

      const request = new NextRequest(
        "http://localhost/api/admin/tracked-urls",
        {
          method: "POST",
          body: JSON.stringify({
            path: "/new-page",
            label: "New Page",
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("Forbidden");
    });

    it("should handle database errors", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);

      vi.mocked(prisma.trackedUrl.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.trackedUrl.create).mockRejectedValue(
        new Error("Database error"),
      );

      const request = new NextRequest(
        "http://localhost/api/admin/tracked-urls",
        {
          method: "POST",
          body: JSON.stringify({
            path: "/new-page",
            label: "New Page",
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
      expect(console.error).toHaveBeenCalledWith(
        "Failed to create tracked path:",
        expect.any(Error),
      );
    });
  });

  describe("DELETE", () => {
    it("should delete a tracked path", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);

      vi.mocked(prisma.trackedUrl.delete).mockResolvedValue({} as any);

      const request = new NextRequest(
        "http://localhost/api/admin/tracked-urls?id=path1",
        {
          method: "DELETE",
        },
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.trackedUrl.delete).toHaveBeenCalledWith({
        where: { id: "path1" },
      });
    });

    it("should return 400 if id is missing", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);

      const request = new NextRequest(
        "http://localhost/api/admin/tracked-urls",
        {
          method: "DELETE",
        },
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("required");
    });

    it("should return 401 if not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/admin/tracked-urls?id=path1",
        {
          method: "DELETE",
        },
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 if admin check fails", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user_123" },
      } as any);

      vi.mocked(requireAdminByUserId).mockRejectedValue(
        new Error("Forbidden: Admin access required"),
      );

      const request = new NextRequest(
        "http://localhost/api/admin/tracked-urls?id=path1",
        {
          method: "DELETE",
        },
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("Forbidden");
    });

    it("should handle database errors", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);

      vi.mocked(prisma.trackedUrl.delete).mockRejectedValue(
        new Error("Database error"),
      );

      const request = new NextRequest(
        "http://localhost/api/admin/tracked-urls?id=path1",
        {
          method: "DELETE",
        },
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
      expect(console.error).toHaveBeenCalledWith(
        "Failed to delete tracked path:",
        expect.any(Error),
      );
    });
  });
});
