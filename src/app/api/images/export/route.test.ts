import type { Session } from "next-auth";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

// Mocks
const mockSession = {
  user: { id: "user-123", email: "test@example.com" },
} as Session;
vi.mock("@/auth", () => ({
  auth: vi.fn(() => Promise.resolve(mockSession)),
}));

vi.mock("@/lib/storage/r2-client", () => ({
  downloadFromR2: vi.fn(),
}));

vi.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: vi.fn(),
  rateLimitConfigs: { general: {} },
}));

vi.mock("@/lib/images/image-dimensions", () => ({
  detectMimeType: vi.fn(() => "image/png"),
}));

const { mockPrisma } = vi.hoisted(() => {
  return {
    mockPrisma: {
      imageEnhancementJob: {
        findFirst: vi.fn(),
      },
    },
  };
});

vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

// Import mocked modules
import { auth } from "@/auth";
import * as rateLimiter from "@/lib/rate-limiter";
import { downloadFromR2 } from "@/lib/storage/r2-client";

describe("/api/images/export", () => {
  const mockJob = {
    id: "job-123",
    userId: "user-123",
    status: "COMPLETED",
    enhancedR2Key: "enhanced/test-image.jpg",
    tier: "TIER_2K",
    image: {
      name: "test-image.jpg",
    },
  };

  // Create a valid PNG buffer (minimal PNG header)
  const mockImageBuffer = Buffer.from([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    0x00,
    0x00,
    0x00,
    0x0d,
    0x49,
    0x48,
    0x44,
    0x52,
    0x00,
    0x00,
    0x00,
    0x10,
    0x00,
    0x00,
    0x00,
    0x10,
    0x08,
    0x06,
    0x00,
    0x00,
    0x00,
    0x1f,
    0xf3,
    0xff,
    0x61,
  ]);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      isLimited: false,
      remaining: 99,
      resetAt: Date.now() + 60000,
    });
    vi.mocked(downloadFromR2).mockResolvedValue(mockImageBuffer);
    vi.mocked(mockPrisma.imageEnhancementJob.findFirst).mockResolvedValue(
      mockJob as never,
    );
  });

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/images/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageId: "job-123", format: "jpeg" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 429 if rate limited", async () => {
    const resetAt = Date.now() + 30000;
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      isLimited: true,
      remaining: 0,
      resetAt,
    });

    const request = new NextRequest("http://localhost/api/images/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageId: "job-123", format: "jpeg" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toBe("Too many export requests");
    expect(response.headers.get("Retry-After")).toBeTruthy();
  });

  it("should return 400 if imageId is missing", async () => {
    const request = new NextRequest("http://localhost/api/images/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format: "jpeg" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Missing imageId or format");
  });

  it("should return 400 if format is missing", async () => {
    const request = new NextRequest("http://localhost/api/images/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageId: "job-123" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Missing imageId or format");
  });

  it("should return 400 if format is invalid", async () => {
    const request = new NextRequest("http://localhost/api/images/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageId: "job-123", format: "bmp" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid format. Must be png, jpeg, or webp");
  });

  it("should return 404 if job is not found", async () => {
    vi.mocked(mockPrisma.imageEnhancementJob.findFirst).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/images/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageId: "job-123", format: "jpeg" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Enhanced image not found");
  });

  it("should return 500 if download fails", async () => {
    vi.mocked(downloadFromR2).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/images/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageId: "job-123", format: "jpeg" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to download image");
  });

  it("should successfully export image as JPEG", async () => {
    const request = new NextRequest("http://localhost/api/images/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageId: "job-123", format: "jpeg", quality: 90 }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/jpeg");
    expect(response.headers.get("Content-Disposition")).toContain(
      "test-image_enhanced_tier_2k.jpg",
    );
    // Headers indicate conversion hint for client
    expect(response.headers.get("X-Original-Format")).toBe("image/png");
    expect(response.headers.get("X-Requested-Format")).toBe("image/jpeg");
  });

  it("should successfully export image as PNG", async () => {
    const request = new NextRequest("http://localhost/api/images/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageId: "job-123", format: "png" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    // For PNG, use actual detected mime type
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("Content-Disposition")).toContain(
      "test-image_enhanced_tier_2k.png",
    );
  });

  it("should successfully export image as WebP", async () => {
    const request = new NextRequest("http://localhost/api/images/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageId: "job-123", format: "webp" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/webp");
    expect(response.headers.get("Content-Disposition")).toContain(
      "test-image_enhanced_tier_2k.webp",
    );
  });

  it("should include rate limit headers", async () => {
    const request = new NextRequest("http://localhost/api/images/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageId: "job-123", format: "png" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("99");
  });
});
