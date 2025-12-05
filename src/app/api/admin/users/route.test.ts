/**
 * Tests for User Management API Route
 */

import { UserRole } from "@prisma/client";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PATCH } from "./route";

// Valid CUID format for tests
const VALID_ADMIN_ID = "user_abc123def456abc123def456";
const VALID_USER_ID = "user_def456abc123def456abc123";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    userTokenBalance: {
      upsert: vi.fn(),
    },
    tokenTransaction: {
      create: vi.fn(),
    },
  },
}));
vi.mock("@/lib/auth/admin-middleware", () => ({
  requireAdminByUserId: vi.fn(),
  isSuperAdmin: vi.fn(),
}));
vi.mock("@/lib/audit/logger", () => ({
  AuditLogger: {
    logRoleChange: vi.fn(),
    logTokenAdjustment: vi.fn(),
  },
}));

const { auth } = await import("@/auth");
const prisma = (await import("@/lib/prisma")).default;

describe("User Management API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("GET", () => {
    it("should return 401 if not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/admin/users");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return users list for search query", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);

      vi.mocked(prisma.user.findMany).mockResolvedValue([
        {
          id: VALID_USER_ID,
          email: "test@example.com",
          name: "Test User",
          image: null,
          role: UserRole.USER,
          tokenBalance: { balance: 100 },
          _count: { enhancedImages: 5 },
          createdAt: new Date("2025-01-01"),
        },
      ] as any);

      const request = new NextRequest("http://localhost/api/admin/users?search=test");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users).toHaveLength(1);
      expect(data.users[0].email).toBe("test@example.com");
    });

    it("should return specific user details", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: VALID_USER_ID,
        email: "test@example.com",
        name: "Test User",
        image: null,
        role: UserRole.USER,
        tokenBalance: { balance: 100 },
        tokenTransactions: [],
        enhancedImages: [{ id: "img1" }],
        accounts: [{ provider: "github" }],
        createdAt: new Date("2025-01-01"),
      } as any);

      const request = new NextRequest(`http://localhost/api/admin/users?userId=${VALID_USER_ID}`);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user.id).toBe(VALID_USER_ID);
      expect(data.user.email).toBe("test@example.com");
    });

    it("should return 400 for invalid userId format", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);

      const request = new NextRequest("http://localhost/api/admin/users?userId=invalid");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid user ID format");
    });

    it("should return 404 if user not found", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new NextRequest(`http://localhost/api/admin/users?userId=${VALID_USER_ID}`);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("User not found");
    });

    it("should return 400 for search query too long", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);

      const longSearch = "a".repeat(101);
      const request = new NextRequest(`http://localhost/api/admin/users?search=${longSearch}`);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Search query too long");
    });
  });

  describe("PATCH", () => {
    it("should update user role", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);

      // Mock user existence check
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: VALID_USER_ID,
        role: UserRole.USER,
      } as any);

      vi.mocked(prisma.user.update).mockResolvedValue({
        id: VALID_USER_ID,
        role: UserRole.ADMIN,
      } as any);

      const request = new NextRequest("http://localhost/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({
          userId: VALID_USER_ID,
          action: "setRole",
          value: "ADMIN",
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.role).toBe("ADMIN");
    });

    it("should return 400 for invalid userId format", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);

      const request = new NextRequest("http://localhost/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({
          userId: "invalid",
          action: "setRole",
          value: "ADMIN",
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid user ID format");
    });

    it("should return 404 when target user not found", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({
          userId: VALID_USER_ID,
          action: "setRole",
          value: "ADMIN",
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("User not found");
    });

    it("should return 400 when admin tries to demote themselves", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: VALID_ADMIN_ID,
        role: UserRole.ADMIN,
      } as any);

      const request = new NextRequest("http://localhost/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({
          userId: VALID_ADMIN_ID,
          action: "setRole",
          value: "USER",
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Cannot demote yourself");
    });

    it("should return 403 when non-super-admin tries to create super admin", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: VALID_USER_ID,
        role: UserRole.USER,
      } as any);

      const { isSuperAdmin } = await import("@/lib/auth/admin-middleware");
      vi.mocked(isSuperAdmin).mockResolvedValue(false);

      const request = new NextRequest("http://localhost/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({
          userId: VALID_USER_ID,
          action: "setRole",
          value: "SUPER_ADMIN",
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("super admins");
    });

    it("should return 403 when non-super-admin tries to demote super admin", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: VALID_USER_ID,
        role: UserRole.SUPER_ADMIN,
      } as any);

      const { isSuperAdmin } = await import("@/lib/auth/admin-middleware");
      vi.mocked(isSuperAdmin).mockResolvedValue(false);

      const request = new NextRequest("http://localhost/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({
          userId: VALID_USER_ID,
          action: "setRole",
          value: "ADMIN",
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("Only super admins can demote super admins");
    });

    it("should adjust user tokens", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: VALID_USER_ID,
        role: UserRole.USER,
      } as any);

      vi.mocked(prisma.userTokenBalance.upsert).mockResolvedValue({
        userId: VALID_USER_ID,
        balance: 100,
      } as any);

      vi.mocked(prisma.tokenTransaction.create).mockResolvedValue({} as any);

      const request = new NextRequest("http://localhost/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({
          userId: VALID_USER_ID,
          action: "adjustTokens",
          value: "50",
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.newBalance).toBe(150);
    });

    it("should return 400 for token adjustment exceeding max", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: VALID_USER_ID,
        role: UserRole.USER,
      } as any);

      const request = new NextRequest("http://localhost/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({
          userId: VALID_USER_ID,
          action: "adjustTokens",
          value: "15000",
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Cannot add more than");
    });

    it("should return 400 for token removal exceeding min", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: VALID_USER_ID,
        role: UserRole.USER,
      } as any);

      const request = new NextRequest("http://localhost/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({
          userId: VALID_USER_ID,
          action: "adjustTokens",
          value: "-5000",
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Cannot remove more than");
    });

    it("should return 400 for invalid action", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: VALID_USER_ID,
        role: UserRole.USER,
      } as any);

      const request = new NextRequest("http://localhost/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({
          userId: VALID_USER_ID,
          action: "invalidAction",
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid action");
    });
  });
});
