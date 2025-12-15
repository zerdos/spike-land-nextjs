/**
 * Tests for Admin Email Logs API Route
 */

import { EmailStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  default: {
    emailLog: {
      count: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn(),
      create: vi.fn(),
    },
  },
}));
vi.mock("@/lib/auth/admin-middleware", () => ({
  requireAdminByUserId: vi.fn(),
}));
vi.mock("@/lib/email/client", () => ({
  sendEmail: vi.fn(),
}));
vi.mock("@/lib/email/templates/welcome", () => ({
  WelcomeEmail: vi.fn(() => null),
}));

const { auth } = await import("@/auth");
const prisma = (await import("@/lib/prisma")).default;
const { requireAdminByUserId } = await import("@/lib/auth/admin-middleware");
const { sendEmail } = await import("@/lib/email/client");

describe("Admin Email Logs API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("GET", () => {
    it("should return 401 if not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/admin/emails");
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

      const request = new NextRequest("http://localhost/api/admin/emails");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("Forbidden");
    });

    it("should return email logs for admin users", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as never);
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

      const mockEmails = [
        {
          id: "cm123456789012345678901234",
          userId: "user_abc123def456",
          to: "test@example.com",
          subject: "Test Email",
          template: "WELCOME",
          status: EmailStatus.SENT,
          resendId: "resend_123",
          sentAt: new Date("2024-01-15T10:00:00Z"),
          openedAt: null,
          clickedAt: null,
          bouncedAt: null,
          metadata: null,
          user: {
            id: "user_abc123def456",
            name: "Test User",
            email: "test@example.com",
          },
        },
      ];

      vi.mocked(prisma.emailLog.count).mockResolvedValue(1);
      vi.mocked(prisma.emailLog.findMany).mockResolvedValue(mockEmails);
      vi.mocked(prisma.emailLog.groupBy).mockResolvedValue([
        { template: "WELCOME", _count: 1 },
      ] as never);

      const request = new NextRequest("http://localhost/api/admin/emails");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.emails).toHaveLength(1);
      expect(data.emails[0].to).toBe("test@example.com");
      expect(data.pagination.total).toBe(1);
      expect(data.templates).toContain("WELCOME");
    });

    it("should filter by search query", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as never);
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);
      vi.mocked(prisma.emailLog.count).mockResolvedValue(0);
      vi.mocked(prisma.emailLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.emailLog.groupBy).mockResolvedValue([] as never);

      const request = new NextRequest(
        "http://localhost/api/admin/emails?search=test@example.com",
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(prisma.emailLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { to: { contains: "test@example.com", mode: "insensitive" } },
            ]),
          }),
        }),
      );
    });

    it("should filter by status", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as never);
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);
      vi.mocked(prisma.emailLog.count).mockResolvedValue(0);
      vi.mocked(prisma.emailLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.emailLog.groupBy).mockResolvedValue([] as never);

      const request = new NextRequest(
        "http://localhost/api/admin/emails?status=SENT",
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(prisma.emailLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "SENT",
          }),
        }),
      );
    });

    it("should filter by template", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as never);
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);
      vi.mocked(prisma.emailLog.count).mockResolvedValue(0);
      vi.mocked(prisma.emailLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.emailLog.groupBy).mockResolvedValue([] as never);

      const request = new NextRequest(
        "http://localhost/api/admin/emails?template=WELCOME",
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(prisma.emailLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            template: "WELCOME",
          }),
        }),
      );
    });

    it("should reject search query that is too long", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as never);
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

      const longSearch = "a".repeat(101);
      const request = new NextRequest(
        `http://localhost/api/admin/emails?search=${longSearch}`,
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("too long");
    });

    it("should reject invalid status value", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as never);
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

      const request = new NextRequest(
        "http://localhost/api/admin/emails?status=INVALID",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid status");
    });

    it("should handle pagination", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as never);
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);
      vi.mocked(prisma.emailLog.count).mockResolvedValue(50);
      vi.mocked(prisma.emailLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.emailLog.groupBy).mockResolvedValue([] as never);

      const request = new NextRequest(
        "http://localhost/api/admin/emails?page=2&limit=10",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.page).toBe(2);
      expect(data.pagination.limit).toBe(10);
      expect(data.pagination.totalPages).toBe(5);
      expect(prisma.emailLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
    });

    it("should handle database errors gracefully", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as never);
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);
      vi.mocked(prisma.emailLog.count).mockRejectedValue(
        new Error("Database error"),
      );

      const request = new NextRequest("http://localhost/api/admin/emails");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch email logs");
    });
  });

  describe("POST", () => {
    it("should return 401 if not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/admin/emails", {
        method: "POST",
        body: JSON.stringify({
          action: "sendTestEmail",
          to: "test@example.com",
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should send test email successfully", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as never);
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);
      vi.mocked(sendEmail).mockResolvedValue({
        success: true,
        id: "resend_test_123",
      });
      vi.mocked(prisma.emailLog.create).mockResolvedValue({
        id: "log_123",
      } as never);

      const request = new NextRequest("http://localhost/api/admin/emails", {
        method: "POST",
        body: JSON.stringify({
          action: "sendTestEmail",
          to: "test@example.com",
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.emailId).toBe("resend_test_123");
      expect(prisma.emailLog.create).toHaveBeenCalled();
    });

    it("should return 400 if email address is missing", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as never);
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

      const request = new NextRequest("http://localhost/api/admin/emails", {
        method: "POST",
        body: JSON.stringify({ action: "sendTestEmail" }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Email address is required");
    });

    it("should return 400 for invalid action", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as never);
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

      const request = new NextRequest("http://localhost/api/admin/emails", {
        method: "POST",
        body: JSON.stringify({ action: "invalidAction" }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid action");
    });

    it("should handle email send failure", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as never);
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);
      vi.mocked(sendEmail).mockResolvedValue({
        success: false,
        error: "Rate limit exceeded",
      });

      const request = new NextRequest("http://localhost/api/admin/emails", {
        method: "POST",
        body: JSON.stringify({
          action: "sendTestEmail",
          to: "test@example.com",
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Rate limit exceeded");
    });
  });
});
