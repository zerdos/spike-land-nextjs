/**
 * Tests for User Enhancement History API Route
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/auth/admin-middleware", () => ({
  requireAdminByUserId: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
    imageEnhancementJob: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

const { auth } = await import("@/auth");
const { requireAdminByUserId } = await import("@/lib/auth/admin-middleware");
const { default: prisma } = await import("@/lib/prisma");

describe("GET /api/admin/users/[userId]/enhancements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (url: string) => {
    return new NextRequest(new URL(url, "http://localhost"));
  };

  const createParams = (userId: string) => {
    return Promise.resolve({ userId });
  };

  const mockUser = {
    id: "user123",
    name: "Test User",
    email: "test@example.com",
    createdAt: new Date("2025-01-01"),
  };

  const mockEnhancements = [
    {
      id: "job1",
      tier: "TIER_1K",
      status: "COMPLETED",
      tokensCost: 10,
      errorMessage: null,
      createdAt: new Date("2025-01-01"),
      processingStartedAt: new Date("2025-01-01T00:00:01"),
      processingCompletedAt: new Date("2025-01-01T00:00:30"),
      enhancedUrl: "https://example.com/result1.jpg",
      image: {
        id: "img1",
        name: "test1.jpg",
        originalUrl: "https://example.com/test1.jpg",
        originalWidth: 1920,
        originalHeight: 1080,
        originalFormat: "JPEG",
      },
    },
    {
      id: "job2",
      tier: "TIER_2K",
      status: "FAILED",
      tokensCost: 20,
      errorMessage: "Processing failed",
      createdAt: new Date("2025-01-02"),
      processingStartedAt: new Date("2025-01-02T00:00:01"),
      processingCompletedAt: null,
      enhancedUrl: null,
      image: null,
    },
  ];

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);

    const request = createRequest("http://localhost/api/admin/users/user123/enhancements");
    const response = await GET(request, { params: createParams("user123") });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 401 when user has no id", async () => {
    vi.mocked(auth).mockResolvedValueOnce({ user: {} } as never);

    const request = createRequest("http://localhost/api/admin/users/user123/enhancements");
    const response = await GET(request, { params: createParams("user123") });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 when user is not admin", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user456" },
    } as never);
    vi.mocked(requireAdminByUserId).mockRejectedValueOnce(
      new Error("Forbidden: Admin access required"),
    );

    const request = createRequest("http://localhost/api/admin/users/user123/enhancements");
    const response = await GET(request, { params: createParams("user123") });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden: Admin access required");
  });

  it("should return 400 when userId is empty", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "admin123" },
    } as never);
    vi.mocked(requireAdminByUserId).mockResolvedValueOnce(undefined);

    const request = createRequest("http://localhost/api/admin/users//enhancements");
    const response = await GET(request, { params: Promise.resolve({ userId: "" }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("User ID is required");
  });

  it("should return 400 for invalid pagination parameters", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "admin123" },
    } as never);
    vi.mocked(requireAdminByUserId).mockResolvedValueOnce(undefined);

    const request = createRequest(
      "http://localhost/api/admin/users/user123/enhancements?page=0",
    );
    const response = await GET(request, { params: createParams("user123") });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid pagination parameters");
  });

  it("should return 400 for invalid limit parameter", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "admin123" },
    } as never);
    vi.mocked(requireAdminByUserId).mockResolvedValueOnce(undefined);

    const request = createRequest(
      "http://localhost/api/admin/users/user123/enhancements?limit=-1",
    );
    const response = await GET(request, { params: createParams("user123") });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid pagination parameters");
  });

  it("should return 404 when user not found", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "admin123" },
    } as never);
    vi.mocked(requireAdminByUserId).mockResolvedValueOnce(undefined);
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

    const request = createRequest("http://localhost/api/admin/users/user123/enhancements");
    const response = await GET(request, { params: createParams("user123") });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("User not found");
  });

  it("should return user enhancement history", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "admin123" },
    } as never);
    vi.mocked(requireAdminByUserId).mockResolvedValueOnce(undefined);
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser as never);
    vi.mocked(prisma.imageEnhancementJob.count).mockResolvedValueOnce(2);
    vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValueOnce(
      mockEnhancements as never,
    );

    const request = createRequest("http://localhost/api/admin/users/user123/enhancements");
    const response = await GET(request, { params: createParams("user123") });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user.id).toBe("user123");
    expect(data.user.name).toBe("Test User");
    expect(data.user.email).toBe("test@example.com");
    expect(data.enhancements).toHaveLength(2);
    expect(data.pagination.total).toBe(2);
    expect(data.pagination.totalPages).toBe(1);
  });

  it("should format enhancement data correctly", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "admin123" },
    } as never);
    vi.mocked(requireAdminByUserId).mockResolvedValueOnce(undefined);
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser as never);
    vi.mocked(prisma.imageEnhancementJob.count).mockResolvedValueOnce(2);
    vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValueOnce(
      mockEnhancements as never,
    );

    const request = createRequest("http://localhost/api/admin/users/user123/enhancements");
    const response = await GET(request, { params: createParams("user123") });
    const data = await response.json();

    const firstEnhancement = data.enhancements[0];
    expect(firstEnhancement.id).toBe("job1");
    expect(firstEnhancement.tier).toBe("TIER_1K");
    expect(firstEnhancement.status).toBe("COMPLETED");
    expect(firstEnhancement.tokenCost).toBe(10);
    expect(firstEnhancement.resultUrl).toBe("https://example.com/result1.jpg");
    expect(firstEnhancement.image.id).toBe("img1");
    expect(firstEnhancement.image.name).toBe("test1.jpg");
    expect(firstEnhancement.image.width).toBe(1920);
    expect(firstEnhancement.image.height).toBe(1080);
    expect(firstEnhancement.image.format).toBe("JPEG");
  });

  it("should handle null image in enhancement", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "admin123" },
    } as never);
    vi.mocked(requireAdminByUserId).mockResolvedValueOnce(undefined);
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser as never);
    vi.mocked(prisma.imageEnhancementJob.count).mockResolvedValueOnce(2);
    vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValueOnce(
      mockEnhancements as never,
    );

    const request = createRequest("http://localhost/api/admin/users/user123/enhancements");
    const response = await GET(request, { params: createParams("user123") });
    const data = await response.json();

    const secondEnhancement = data.enhancements[1];
    expect(secondEnhancement.image).toBeNull();
    expect(secondEnhancement.errorMessage).toBe("Processing failed");
  });

  it("should respect pagination parameters", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "admin123" },
    } as never);
    vi.mocked(requireAdminByUserId).mockResolvedValueOnce(undefined);
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser as never);
    vi.mocked(prisma.imageEnhancementJob.count).mockResolvedValueOnce(50);
    vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValueOnce([] as never);

    const request = createRequest(
      "http://localhost/api/admin/users/user123/enhancements?page=2&limit=10",
    );
    const response = await GET(request, { params: createParams("user123") });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.pagination.page).toBe(2);
    expect(data.pagination.limit).toBe(10);
    expect(data.pagination.total).toBe(50);
    expect(data.pagination.totalPages).toBe(5);

    expect(prisma.imageEnhancementJob.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
      }),
    );
  });

  it("should limit max limit to 100", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "admin123" },
    } as never);
    vi.mocked(requireAdminByUserId).mockResolvedValueOnce(undefined);
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser as never);
    vi.mocked(prisma.imageEnhancementJob.count).mockResolvedValueOnce(200);
    vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValueOnce([] as never);

    const request = createRequest(
      "http://localhost/api/admin/users/user123/enhancements?limit=500",
    );
    const response = await GET(request, { params: createParams("user123") });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.pagination.limit).toBe(100);

    expect(prisma.imageEnhancementJob.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 100,
      }),
    );
  });

  it("should return 500 on database error", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "admin123" },
    } as never);
    vi.mocked(requireAdminByUserId).mockResolvedValueOnce(undefined);
    vi.mocked(prisma.user.findUnique).mockRejectedValueOnce(new Error("Database error"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const request = createRequest("http://localhost/api/admin/users/user123/enhancements");
    const response = await GET(request, { params: createParams("user123") });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should use default pagination values", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "admin123" },
    } as never);
    vi.mocked(requireAdminByUserId).mockResolvedValueOnce(undefined);
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser as never);
    vi.mocked(prisma.imageEnhancementJob.count).mockResolvedValueOnce(10);
    vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValueOnce([] as never);

    const request = createRequest("http://localhost/api/admin/users/user123/enhancements");
    const response = await GET(request, { params: createParams("user123") });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.pagination.page).toBe(1);
    expect(data.pagination.limit).toBe(20);
  });
});
