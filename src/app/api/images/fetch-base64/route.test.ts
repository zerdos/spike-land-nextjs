import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

// Mocks
const mockSession = { user: { id: "user-123", email: "test@example.com" } };
vi.mock("@/auth", () => ({
  auth: vi.fn(() => Promise.resolve(mockSession)),
}));

vi.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: vi.fn(),
  rateLimitConfigs: { general: {} },
}));

// Import mocked modules
import { auth } from "@/auth";
import * as rateLimiter from "@/lib/rate-limiter";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("/api/images/fetch-base64", () => {
  const allowedUrl = "https://pub-cf0adddb5752426a96ef090997e0da95.r2.dev/test-image.jpg";
  const mockImageData = new Uint8Array([0x66, 0x61, 0x6b, 0x65]).buffer; // "fake" as ArrayBuffer
  const expectedBase64 = Buffer.from(new Uint8Array(mockImageData)).toString("base64");

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      isLimited: false,
      remaining: 99,
      resetAt: Date.now() + 60000,
    });
    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "image/jpeg" }),
      arrayBuffer: () => Promise.resolve(mockImageData),
    });
  });

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/images/fetch-base64",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: allowedUrl }),
      },
    );

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

    const request = new NextRequest(
      "http://localhost/api/images/fetch-base64",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: allowedUrl }),
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toBe("Too many requests");
  });

  it("should return 400 if url is missing", async () => {
    const request = new NextRequest(
      "http://localhost/api/images/fetch-base64",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Missing or invalid url");
  });

  it("should return 400 if url domain is not allowed", async () => {
    const request = new NextRequest(
      "http://localhost/api/images/fetch-base64",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "https://evil.com/malicious.jpg" }),
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("URL domain not allowed");
  });

  it("should return 400 if url format is invalid", async () => {
    const request = new NextRequest(
      "http://localhost/api/images/fetch-base64",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "not-a-valid-url" }),
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid URL format");
  });

  it("should return base64 data for allowed R2 URL", async () => {
    const request = new NextRequest(
      "http://localhost/api/images/fetch-base64",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: allowedUrl }),
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.base64).toBe(expectedBase64);
    expect(data.mimeType).toBe("image/jpeg");
  });

  it("should return base64 data for spike.land URL", async () => {
    const spikeUrl = "https://spike.land/some-image.jpg";

    const request = new NextRequest(
      "http://localhost/api/images/fetch-base64",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: spikeUrl }),
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.base64).toBeDefined();
  });

  it("should return 502 if image fetch fails", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
    });

    const request = new NextRequest(
      "http://localhost/api/images/fetch-base64",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: allowedUrl }),
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toContain("Image fetch failed");
  });

  it("should return 500 if fetch throws error", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const request = new NextRequest(
      "http://localhost/api/images/fetch-base64",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: allowedUrl }),
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch image");
  });
});
