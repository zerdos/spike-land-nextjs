/**
 * Tests for User Password Management API Route
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies before importing route
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/admin-middleware", () => ({
  requireAdminByUserId: vi.fn(),
}));

vi.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(),
  },
}));

vi.mock("@/auth.config", () => ({
  createStableUserId: vi.fn(),
}));

import { auth } from "@/auth";
import { createStableUserId } from "@/auth.config";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limiter";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { POST } from "./route";

describe("Password API Route", () => {
  const mockAuth = vi.mocked(auth);
  const mockRequireAdmin = vi.mocked(requireAdminByUserId);
  const mockPrismaUserFindUnique = vi.mocked(prisma.user.findUnique);
  const mockPrismaUserCreate = vi.mocked(prisma.user.create);
  const mockPrismaUserUpdate = vi.mocked(prisma.user.update);
  const mockBcryptHash = vi.mocked(bcrypt.hash);
  const mockCheckRateLimit = vi.mocked(checkRateLimit);
  const mockCreateStableUserId = vi.mocked(createStableUserId);

  beforeEach(() => {
    vi.clearAllMocks();

    // Default: authenticated admin user
    mockAuth.mockResolvedValue({
      user: { id: "admin-user-id", email: "admin@test.com", name: "Admin" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    // Default: admin check passes
    mockRequireAdmin.mockResolvedValue(undefined);

    // Default: not rate limited
    mockCheckRateLimit.mockResolvedValue({
      isLimited: false,
      remaining: 4,
      resetAt: Date.now() + 3600000,
    });

    // Default bcrypt hash
    mockBcryptHash.mockResolvedValue("hashed-password" as never);

    // Default stable user ID
    mockCreateStableUserId.mockReturnValue("user_stable123");
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  function createRequest(body: Record<string, unknown>): NextRequest {
    return new NextRequest("http://localhost:3000/api/admin/users/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  describe("Authentication and Authorization", () => {
    it("returns 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = createRequest({
        email: "test@example.com",
        password: "testpass",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 401 when session has no user ID", async () => {
      mockAuth.mockResolvedValue(
        {
          user: { email: "admin@test.com" },
          expires: new Date(Date.now() + 86400000).toISOString(),
        } as ReturnType<typeof auth> extends Promise<infer T> ? T : never,
      );

      const request = createRequest({
        email: "test@example.com",
        password: "testpass",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 403 when user is not admin", async () => {
      mockRequireAdmin.mockRejectedValue(
        new Error("Forbidden: Admin access required"),
      );

      const request = createRequest({
        email: "test@example.com",
        password: "testpass",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("Forbidden");
    });
  });

  describe("Rate Limiting", () => {
    it("returns 429 when rate limited", async () => {
      const resetAt = Date.now() + 3600000;
      mockCheckRateLimit.mockResolvedValue({
        isLimited: true,
        remaining: 0,
        resetAt,
      });

      const request = createRequest({
        email: "test@example.com",
        password: "testpass",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe("Too many requests. Please try again later.");
      expect(response.headers.get("Retry-After")).toBeDefined();
    });

    it("calls rate limiter with correct key", async () => {
      mockPrismaUserFindUnique.mockResolvedValue(null);

      const request = createRequest({
        email: "test@example.com",
        password: "testpass",
      });

      await POST(request);

      expect(mockCheckRateLimit).toHaveBeenCalledWith(
        "password-set:admin-user-id",
        expect.objectContaining({
          maxRequests: 5,
          windowMs: 3600000,
        }),
      );
    });
  });

  describe("Input Validation", () => {
    it("returns 400 when email is missing", async () => {
      const request = createRequest({
        password: "testpass",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Missing required fields");
    });

    it("returns 400 when password is missing", async () => {
      const request = createRequest({
        email: "test@example.com",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Missing required fields");
    });

    it("returns 400 for invalid email format", async () => {
      const request = createRequest({
        email: "invalid-email",
        password: "testpass",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid email format");
    });

    it("returns 400 for empty password", async () => {
      const request = createRequest({
        email: "test@example.com",
        password: "",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      // Empty string is falsy, so it triggers the "missing fields" check first
      expect(data.error).toBe("Missing required fields: email, password");
    });

    it("returns 400 for non-string password", async () => {
      const request = createRequest({
        email: "test@example.com",
        password: 12345, // number instead of string
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Password is required");
    });

    it("accepts any non-empty password (test/demo purposes)", async () => {
      mockPrismaUserFindUnique.mockResolvedValue(
        {
          id: "existing-user-id",
          email: "test@example.com",
          name: "Test User",
        } as ReturnType<typeof prisma.user.findUnique> extends Promise<infer T> ? T
          : never,
      );
      mockPrismaUserUpdate.mockResolvedValue({} as never);

      // Single character password should work
      const request = createRequest({
        email: "test@example.com",
        password: "a",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe("Update Existing User Password", () => {
    it("updates password for existing user", async () => {
      const existingUser = {
        id: "existing-user-id",
        email: "test@example.com",
        name: "Test User",
      };

      mockPrismaUserFindUnique.mockResolvedValue(existingUser as never);
      mockPrismaUserUpdate.mockResolvedValue({} as never);

      const request = createRequest({
        email: "test@example.com",
        password: "newpassword",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Password updated for existing user");
      expect(data.user).toEqual({
        id: "existing-user-id",
        email: "test@example.com",
        name: "Test User",
      });

      expect(mockBcryptHash).toHaveBeenCalledWith("newpassword", 10);
      expect(mockPrismaUserUpdate).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
        data: { passwordHash: "hashed-password" },
      });
    });
  });

  describe("Create New User with Password", () => {
    it("returns 404 when user not found and createIfNotExists is false", async () => {
      mockPrismaUserFindUnique.mockResolvedValue(null);

      const request = createRequest({
        email: "new@example.com",
        password: "testpass",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain("User not found");
      expect(data.error).toContain("createIfNotExists");
    });

    it("creates new user when createIfNotExists is true", async () => {
      mockPrismaUserFindUnique.mockResolvedValue(null);
      mockPrismaUserCreate.mockResolvedValue({
        id: "user_stable123",
        email: "new@example.com",
        name: "New User",
      } as never);

      const request = createRequest({
        email: "new@example.com",
        password: "testpass",
        name: "New User",
        createIfNotExists: true,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("User created with password");
      expect(data.user).toEqual({
        id: "user_stable123",
        email: "new@example.com",
        name: "New User",
      });

      expect(mockCreateStableUserId).toHaveBeenCalledWith("new@example.com");
      expect(mockPrismaUserCreate).toHaveBeenCalledWith({
        data: {
          id: "user_stable123",
          email: "new@example.com",
          name: "New User",
          passwordHash: "hashed-password",
        },
        select: { id: true, email: true, name: true },
      });
    });

    it("creates user with null name when name is not provided", async () => {
      mockPrismaUserFindUnique.mockResolvedValue(null);
      mockPrismaUserCreate.mockResolvedValue({
        id: "user_stable123",
        email: "new@example.com",
        name: null,
      } as never);

      const request = createRequest({
        email: "new@example.com",
        password: "testpass",
        createIfNotExists: true,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      expect(mockPrismaUserCreate).toHaveBeenCalledWith({
        data: {
          id: "user_stable123",
          email: "new@example.com",
          name: null,
          passwordHash: "hashed-password",
        },
        select: { id: true, email: true, name: true },
      });
    });
  });

  describe("Password Hashing", () => {
    it("hashes password with bcrypt cost factor 10", async () => {
      mockPrismaUserFindUnique.mockResolvedValue({
        id: "user-id",
        email: "test@example.com",
        name: "Test",
      } as never);
      mockPrismaUserUpdate.mockResolvedValue({} as never);

      const request = createRequest({
        email: "test@example.com",
        password: "my-secure-password",
      });

      await POST(request);

      expect(mockBcryptHash).toHaveBeenCalledWith("my-secure-password", 10);
    });
  });

  describe("Error Handling", () => {
    it("returns 500 on internal server error", async () => {
      mockPrismaUserFindUnique.mockRejectedValue(new Error("Database error"));

      const request = createRequest({
        email: "test@example.com",
        password: "testpass",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });

    it("returns 403 for Forbidden errors", async () => {
      mockPrismaUserFindUnique.mockRejectedValue(
        new Error("Forbidden: Not allowed"),
      );

      const request = createRequest({
        email: "test@example.com",
        password: "testpass",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("Forbidden");
    });
  });
});
