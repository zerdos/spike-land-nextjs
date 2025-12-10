import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

// Mocks
const mockSession = { user: { id: "user-123", email: "test@example.com" } };
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

vi.mock("@/lib/images/format-converter", () => ({
  isValidFormat: vi.fn(),
  getFileExtension: vi.fn(),
  convertImageFormat: vi.fn(),
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
import * as formatConverter from "@/lib/images/format-converter";
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

  const mockImageBuffer = Buffer.from("original-image-data");
  const mockConvertedBuffer = Buffer.from("converted-image-data");

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      isLimited: false,
      remaining: 99,
      resetAt: Date.now() + 60000,
    });
    vi.mocked(downloadFromR2).mockResolvedValue(mockImageBuffer);
    vi.mocked(formatConverter.isValidFormat).mockReturnValue(true);
    vi.mocked(formatConverter.getFileExtension).mockReturnValue("jpg");
    vi.mocked(formatConverter.convertImageFormat).mockResolvedValue({
      buffer: mockConvertedBuffer,
      mimeType: "image/jpeg",
      sizeBytes: mockConvertedBuffer.length,
    });
    vi.mocked(mockPrisma.imageEnhancementJob.findFirst).mockResolvedValue(mockJob as never);
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
    vi.mocked(formatConverter.isValidFormat).mockReturnValue(false);

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

  it("should return 400 if quality is out of range", async () => {
    const request = new NextRequest("http://localhost/api/images/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageId: "job-123", format: "jpeg", quality: 50 }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Quality must be between 70 and 100");
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
    expect(formatConverter.convertImageFormat).toHaveBeenCalledWith(
      mockImageBuffer,
      { format: "jpeg", quality: 90 },
    );
  });

  it("should successfully export image as PNG", async () => {
    vi.mocked(formatConverter.getFileExtension).mockReturnValue("png");
    vi.mocked(formatConverter.convertImageFormat).mockResolvedValue({
      buffer: mockConvertedBuffer,
      mimeType: "image/png",
      sizeBytes: mockConvertedBuffer.length,
    });

    const request = new NextRequest("http://localhost/api/images/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageId: "job-123", format: "png" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(formatConverter.convertImageFormat).toHaveBeenCalledWith(
      mockImageBuffer,
      { format: "png", quality: undefined },
    );
  });

  it("should successfully export image as WebP", async () => {
    vi.mocked(formatConverter.getFileExtension).mockReturnValue("webp");
    vi.mocked(formatConverter.convertImageFormat).mockResolvedValue({
      buffer: mockConvertedBuffer,
      mimeType: "image/webp",
      sizeBytes: mockConvertedBuffer.length,
    });

    const request = new NextRequest("http://localhost/api/images/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageId: "job-123", format: "webp" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/webp");
  });

  it("should handle conversion errors", async () => {
    vi.mocked(formatConverter.convertImageFormat).mockRejectedValue(
      new Error("Conversion failed"),
    );

    const request = new NextRequest("http://localhost/api/images/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageId: "job-123", format: "jpeg" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Conversion failed");
  });
});
