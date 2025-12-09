import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const mockPrisma = {
  enhancedImage: {
    findUnique: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  default: {
    enhancedImage: {
      findUnique: (...args: unknown[]) => mockPrisma.enhancedImage.findUnique(...args),
    },
  },
}));

const mockCheckRateLimit = vi.fn(() => ({
  isLimited: false,
  remaining: 99,
  resetAt: Date.now() + 60000,
}));

vi.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  rateLimitConfigs: { general: {} },
}));

const mockImage = {
  id: "img-1",
  name: "Test Image",
  originalUrl: "https://example.com/original.jpg",
  shareToken: "test-token",
  enhancementJobs: [
    {
      id: "job-1",
      status: "COMPLETED",
      enhancedUrl: "https://example.com/enhanced.jpg",
      tier: "TIER_4K",
    },
  ],
};

// Create a mock ReadableStream for testing
function createMockStream(data: string): ReadableStream {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(data));
      controller.close();
    },
  });
}

describe("GET /api/share/[token]/download", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    mockCheckRateLimit.mockReturnValue({
      isLimited: false,
      remaining: 99,
      resetAt: Date.now() + 60000,
    });
  });

  it("should return 400 if type parameter is missing", async () => {
    const request = new NextRequest("http://localhost/api/share/test-token/download");
    const context = { params: Promise.resolve({ token: "test-token" }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid type. Must be 'original' or 'enhanced'");
  });

  it("should return 400 if type parameter is invalid", async () => {
    const request = new NextRequest("http://localhost/api/share/test-token/download?type=invalid");
    const context = { params: Promise.resolve({ token: "test-token" }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid type. Must be 'original' or 'enhanced'");
  });

  it("should return 404 if image not found", async () => {
    mockPrisma.enhancedImage.findUnique.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/share/invalid-token/download?type=original",
    );
    const context = { params: Promise.resolve({ token: "invalid-token" }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Image not found");
  });

  it("should return 404 if enhanced image not available", async () => {
    const imageWithoutEnhancement = {
      ...mockImage,
      enhancementJobs: [],
    };
    mockPrisma.enhancedImage.findUnique.mockResolvedValue(imageWithoutEnhancement);

    const request = new NextRequest("http://localhost/api/share/test-token/download?type=enhanced");
    const context = { params: Promise.resolve({ token: "test-token" }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Enhanced image not available");
  });

  it("should proxy original image download", async () => {
    mockPrisma.enhancedImage.findUnique.mockResolvedValue(mockImage);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      body: createMockStream("image-data"),
      headers: new Headers({ "Content-Type": "image/jpeg" }),
    } as Response);

    const request = new NextRequest("http://localhost/api/share/test-token/download?type=original");
    const context = { params: Promise.resolve({ token: "test-token" }) };

    const response = await GET(request, context);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/jpeg");
    expect(response.headers.get("Content-Disposition")).toContain("Test_Image_original");
    expect(global.fetch).toHaveBeenCalledWith("https://example.com/original.jpg");
  });

  it("should proxy enhanced image download", async () => {
    mockPrisma.enhancedImage.findUnique.mockResolvedValue(mockImage);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      body: createMockStream("image-data"),
      headers: new Headers({ "Content-Type": "image/jpeg" }),
    } as Response);

    const request = new NextRequest("http://localhost/api/share/test-token/download?type=enhanced");
    const context = { params: Promise.resolve({ token: "test-token" }) };

    const response = await GET(request, context);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/jpeg");
    expect(response.headers.get("Content-Disposition")).toContain("Test_Image_enhanced_4k");
    expect(global.fetch).toHaveBeenCalledWith("https://example.com/enhanced.jpg");
  });

  it("should return 502 if upstream fetch fails", async () => {
    mockPrisma.enhancedImage.findUnique.mockResolvedValue(mockImage);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    const request = new NextRequest("http://localhost/api/share/test-token/download?type=original");
    const context = { params: Promise.resolve({ token: "test-token" }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toBe("Failed to fetch image");
  });

  it("should handle different content types", async () => {
    mockPrisma.enhancedImage.findUnique.mockResolvedValue(mockImage);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      body: createMockStream("image-data"),
      headers: new Headers({ "Content-Type": "image/png" }),
    } as Response);

    const request = new NextRequest("http://localhost/api/share/test-token/download?type=original");
    const context = { params: Promise.resolve({ token: "test-token" }) };

    const response = await GET(request, context);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("Content-Disposition")).toContain(".png");
  });

  it("should sanitize filename", async () => {
    const imageWithSpecialChars = {
      ...mockImage,
      name: "Test Image!@#$%",
    };
    mockPrisma.enhancedImage.findUnique.mockResolvedValue(imageWithSpecialChars);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      body: createMockStream("image-data"),
      headers: new Headers({ "Content-Type": "image/jpeg" }),
    } as Response);

    const request = new NextRequest("http://localhost/api/share/test-token/download?type=original");
    const context = { params: Promise.resolve({ token: "test-token" }) };

    const response = await GET(request, context);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Disposition")).toContain("Test_Image______original");
  });

  it("should return 429 when rate limited", async () => {
    mockCheckRateLimit.mockReturnValue({
      isLimited: true,
      remaining: 0,
      resetAt: Date.now() + 60000,
    });

    const request = new NextRequest("http://localhost/api/share/test-token/download?type=original");
    const context = { params: Promise.resolve({ token: "test-token" }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toBe("Too many download requests");
  });

  it("should return 500 on unexpected error", async () => {
    mockPrisma.enhancedImage.findUnique.mockRejectedValue(new Error("Database error"));

    const request = new NextRequest("http://localhost/api/share/test-token/download?type=original");
    const context = { params: Promise.resolve({ token: "test-token" }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Database error");
  });
});
