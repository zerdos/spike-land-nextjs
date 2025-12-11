/**
 * Tests for Tracked URLs Management API Route
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

describe("Tracked URLs Management API", () => {
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

    it("should return tracked URLs list for admin users", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);

      vi.mocked(prisma.trackedUrl.findMany).mockResolvedValue([
        {
          id: "url1",
          url: "https://example.com",
          label: "Example Site",
          createdAt: new Date("2025-01-01"),
          createdBy: {
            name: "Admin User",
            email: "admin@example.com",
          },
        },
        {
          id: "url2",
          url: "https://test.com",
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
      expect(data.trackedUrls).toHaveLength(2);
      expect(data.trackedUrls[0].url).toBe("https://example.com");
      expect(data.trackedUrls[0].label).toBe("Example Site");
      expect(data.trackedUrls[0].createdBy.name).toBe("Admin User");
      expect(data.trackedUrls[1].url).toBe("https://test.com");
      expect(data.trackedUrls[1].label).toBeNull();
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
        "Failed to fetch tracked URLs:",
        expect.any(Error),
      );
    });
  });

  describe("POST", () => {
    it("should create a new tracked URL", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);

      vi.mocked(prisma.trackedUrl.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.trackedUrl.create).mockResolvedValue({
        id: "url1",
        url: "https://newsite.com",
        label: "New Site",
        createdAt: new Date("2025-01-01"),
        createdBy: {
          name: "Admin User",
          email: "admin@example.com",
        },
      } as any);

      const request = new NextRequest("http://localhost/api/admin/tracked-urls", {
        method: "POST",
        body: JSON.stringify({
          url: "https://newsite.com",
          label: "New Site",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.trackedUrl.url).toBe("https://newsite.com");
      expect(data.trackedUrl.label).toBe("New Site");
      expect(data.trackedUrl.createdBy.name).toBe("Admin User");
    });

    it("should create tracked URL without label", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);

      vi.mocked(prisma.trackedUrl.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.trackedUrl.create).mockResolvedValue({
        id: "url1",
        url: "https://newsite.com",
        label: null,
        createdAt: new Date("2025-01-01"),
        createdBy: {
          name: "Admin User",
          email: "admin@example.com",
        },
      } as any);

      const request = new NextRequest("http://localhost/api/admin/tracked-urls", {
        method: "POST",
        body: JSON.stringify({
          url: "https://newsite.com",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.trackedUrl.url).toBe("https://newsite.com");
      expect(data.trackedUrl.label).toBeNull();
    });

    it("should return 400 for missing url field", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);

      const request = new NextRequest("http://localhost/api/admin/tracked-urls", {
        method: "POST",
        body: JSON.stringify({ label: "Test" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Missing required field");
    });

    it("should return 409 if URL already exists", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);

      vi.mocked(prisma.trackedUrl.findUnique).mockResolvedValue({
        id: "url1",
        url: "https://existing.com",
      } as any);

      const request = new NextRequest("http://localhost/api/admin/tracked-urls", {
        method: "POST",
        body: JSON.stringify({
          url: "https://existing.com",
          label: "Existing Site",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain("already tracked");
    });

    it("should return 401 if not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/admin/tracked-urls", {
        method: "POST",
        body: JSON.stringify({
          url: "https://newsite.com",
          label: "New Site",
        }),
      });

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

      const request = new NextRequest("http://localhost/api/admin/tracked-urls", {
        method: "POST",
        body: JSON.stringify({
          url: "https://newsite.com",
          label: "New Site",
        }),
      });

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

      const request = new NextRequest("http://localhost/api/admin/tracked-urls", {
        method: "POST",
        body: JSON.stringify({
          url: "https://newsite.com",
          label: "New Site",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
      expect(console.error).toHaveBeenCalledWith(
        "Failed to create tracked URL:",
        expect.any(Error),
      );
    });
  });

  describe("DELETE", () => {
    it("should delete a tracked URL", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);

      vi.mocked(prisma.trackedUrl.delete).mockResolvedValue({} as any);

      const request = new NextRequest(
        "http://localhost/api/admin/tracked-urls?id=url1",
        {
          method: "DELETE",
        },
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.trackedUrl.delete).toHaveBeenCalledWith({
        where: { id: "url1" },
      });
    });

    it("should return 400 if id is missing", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);

      const request = new NextRequest("http://localhost/api/admin/tracked-urls", {
        method: "DELETE",
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("required");
    });

    it("should return 401 if not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/admin/tracked-urls?id=url1",
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
        "http://localhost/api/admin/tracked-urls?id=url1",
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
        "http://localhost/api/admin/tracked-urls?id=url1",
        {
          method: "DELETE",
        },
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
      expect(console.error).toHaveBeenCalledWith(
        "Failed to delete tracked URL:",
        expect.any(Error),
      );
    });
  });
});
