/**
 * Tests for Admin Feedback API Route
 */

import { FeedbackStatus, FeedbackType } from "@prisma/client";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PATCH } from "./route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  default: {
    feedback: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));
vi.mock("@/lib/auth/admin-middleware", () => ({
  requireAdminByUserId: vi.fn(),
}));

const { auth } = await import("@/auth");
const prisma = (await import("@/lib/prisma")).default;
const { requireAdminByUserId } = await import("@/lib/auth/admin-middleware");

describe("Admin Feedback API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("GET", () => {
    it("should return 401 if not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/admin/feedback");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 if not admin", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user_123" },
      } as never);

      vi.mocked(requireAdminByUserId).mockRejectedValue(
        new Error("Forbidden: Admin access required"),
      );

      const request = new NextRequest("http://localhost/api/admin/feedback");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("Forbidden");
    });

    it("should return feedback list for admin users", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as never);

      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

      const mockFeedback = [
        {
          id: "cm123456789012345678901234",
          userId: "user_abc123def456",
          email: null,
          type: FeedbackType.BUG,
          message: "Test bug report",
          page: "/apps/pixel",
          userAgent: "Mozilla/5.0",
          status: FeedbackStatus.NEW,
          adminNote: null,
          createdAt: new Date("2024-01-15T10:00:00Z"),
          updatedAt: new Date("2024-01-15T10:00:00Z"),
          user: {
            id: "user_abc123def456",
            name: "Test User",
            email: "test@example.com",
            image: null,
          },
        },
      ];

      vi.mocked(prisma.feedback.findMany).mockResolvedValue(mockFeedback);

      const request = new NextRequest("http://localhost/api/admin/feedback");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.feedback).toHaveLength(1);
      expect(data.feedback[0].type).toBe("BUG");
      expect(data.feedback[0].user.name).toBe("Test User");
    });

    it("should filter by status when provided", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as never);

      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);
      vi.mocked(prisma.feedback.findMany).mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/admin/feedback?status=NEW",
      );
      await GET(request);

      expect(prisma.feedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: "NEW" },
        }),
      );
    });

    it("should filter by type when provided", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as never);

      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);
      vi.mocked(prisma.feedback.findMany).mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/admin/feedback?type=BUG",
      );
      await GET(request);

      expect(prisma.feedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { type: "BUG" },
        }),
      );
    });

    it("should filter by both status and type", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as never);

      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);
      vi.mocked(prisma.feedback.findMany).mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/admin/feedback?status=REVIEWED&type=IDEA",
      );
      await GET(request);

      expect(prisma.feedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: "REVIEWED", type: "IDEA" },
        }),
      );
    });

    it("should return 400 for invalid status filter", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as never);

      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

      const request = new NextRequest(
        "http://localhost/api/admin/feedback?status=INVALID",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid status");
    });

    it("should return 400 for invalid type filter", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as never);

      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

      const request = new NextRequest(
        "http://localhost/api/admin/feedback?type=INVALID",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid type");
    });

    it("should handle feedback without user", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as never);

      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

      const mockFeedback = [
        {
          id: "cm123456789012345678901234",
          userId: null,
          email: "anonymous@example.com",
          type: FeedbackType.IDEA,
          message: "Great idea",
          page: "/",
          userAgent: null,
          status: FeedbackStatus.REVIEWED,
          adminNote: "Good suggestion",
          createdAt: new Date("2024-01-16T10:00:00Z"),
          updatedAt: new Date("2024-01-16T12:00:00Z"),
          user: null,
        },
      ];

      vi.mocked(prisma.feedback.findMany).mockResolvedValue(mockFeedback);

      const request = new NextRequest("http://localhost/api/admin/feedback");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.feedback[0].user).toBeNull();
      expect(data.feedback[0].email).toBe("anonymous@example.com");
    });
  });

  describe("PATCH", () => {
    it("should return 401 if not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/admin/feedback", {
        method: "PATCH",
        body: JSON.stringify({ id: "cm123456789012345678901234", status: "REVIEWED" }),
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 if id is missing", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as never);

      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

      const request = new NextRequest("http://localhost/api/admin/feedback", {
        method: "PATCH",
        body: JSON.stringify({ status: "REVIEWED" }),
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Missing required field");
    });

    it("should return 400 for invalid id format", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as never);

      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

      const request = new NextRequest("http://localhost/api/admin/feedback", {
        method: "PATCH",
        body: JSON.stringify({ id: "invalid_id", status: "REVIEWED" }),
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid feedback ID");
    });

    it("should return 400 for invalid status", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as never);

      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

      const request = new NextRequest("http://localhost/api/admin/feedback", {
        method: "PATCH",
        body: JSON.stringify({ id: "cm12345678901234567890123", status: "INVALID" }),
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid status");
    });

    it("should return 404 if feedback not found", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as never);

      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);
      vi.mocked(prisma.feedback.findUnique).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/admin/feedback", {
        method: "PATCH",
        body: JSON.stringify({ id: "cm12345678901234567890123", status: "REVIEWED" }),
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain("Feedback not found");
    });

    it("should update feedback status", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as never);

      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);
      vi.mocked(prisma.feedback.findUnique).mockResolvedValue({
        id: "cm12345678901234567890123",
        status: FeedbackStatus.NEW,
      } as never);
      vi.mocked(prisma.feedback.update).mockResolvedValue({
        id: "cm12345678901234567890123",
        status: FeedbackStatus.REVIEWED,
        adminNote: null,
        updatedAt: new Date("2024-01-15T12:00:00Z"),
      } as never);

      const request = new NextRequest("http://localhost/api/admin/feedback", {
        method: "PATCH",
        body: JSON.stringify({ id: "cm12345678901234567890123", status: "REVIEWED" }),
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.feedback.status).toBe("REVIEWED");
      expect(prisma.feedback.update).toHaveBeenCalledWith({
        where: { id: "cm12345678901234567890123" },
        data: { status: "REVIEWED" },
      });
    });

    it("should update admin note", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as never);

      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);
      vi.mocked(prisma.feedback.findUnique).mockResolvedValue({
        id: "cm12345678901234567890123",
        status: FeedbackStatus.NEW,
      } as never);
      vi.mocked(prisma.feedback.update).mockResolvedValue({
        id: "cm12345678901234567890123",
        status: FeedbackStatus.NEW,
        adminNote: "This is a test note",
        updatedAt: new Date("2024-01-15T12:00:00Z"),
      } as never);

      const request = new NextRequest("http://localhost/api/admin/feedback", {
        method: "PATCH",
        body: JSON.stringify({
          id: "cm12345678901234567890123",
          adminNote: "This is a test note",
        }),
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.feedback.adminNote).toBe("This is a test note");
      expect(prisma.feedback.update).toHaveBeenCalledWith({
        where: { id: "cm12345678901234567890123" },
        data: { adminNote: "This is a test note" },
      });
    });

    it("should update both status and admin note", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as never);

      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);
      vi.mocked(prisma.feedback.findUnique).mockResolvedValue({
        id: "cm12345678901234567890123",
        status: FeedbackStatus.NEW,
      } as never);
      vi.mocked(prisma.feedback.update).mockResolvedValue({
        id: "cm12345678901234567890123",
        status: FeedbackStatus.RESOLVED,
        adminNote: "Fixed in v2.0",
        updatedAt: new Date("2024-01-15T12:00:00Z"),
      } as never);

      const request = new NextRequest("http://localhost/api/admin/feedback", {
        method: "PATCH",
        body: JSON.stringify({
          id: "cm12345678901234567890123",
          status: "RESOLVED",
          adminNote: "Fixed in v2.0",
        }),
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.feedback.status).toBe("RESOLVED");
      expect(data.feedback.adminNote).toBe("Fixed in v2.0");
    });

    it("should return 400 if admin note is too long", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as never);

      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

      const longNote = "a".repeat(2001);

      const request = new NextRequest("http://localhost/api/admin/feedback", {
        method: "PATCH",
        body: JSON.stringify({
          id: "cm12345678901234567890123",
          adminNote: longNote,
        }),
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Admin note too long");
    });

    it("should handle database errors gracefully", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as never);

      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);
      vi.mocked(prisma.feedback.findUnique).mockRejectedValue(
        new Error("Database error"),
      );

      const request = new NextRequest("http://localhost/api/admin/feedback", {
        method: "PATCH",
        body: JSON.stringify({ id: "cm12345678901234567890123", status: "REVIEWED" }),
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });
});
