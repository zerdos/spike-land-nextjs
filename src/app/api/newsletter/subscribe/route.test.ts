import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    newsletterSubscriber: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: vi.fn(),
  rateLimitConfigs: {
    newsletterSubscribe: { maxRequests: 5, windowMs: 3600000 },
  },
}));

vi.mock("@/lib/email/client", () => ({
  getResend: vi.fn(),
}));

const prisma = (await import("@/lib/prisma")).default;
const { checkRateLimit } = await import("@/lib/rate-limiter");
const { getResend } = await import("@/lib/email/client");
const { POST } = await import("./route");

function makeRequest(body?: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/newsletter/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe("/api/newsletter/subscribe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockResolvedValue({
      isLimited: false,
      remaining: 5,
      retryAfter: 0,
    });
    vi.mocked(prisma.newsletterSubscriber.upsert).mockResolvedValue({
      id: "sub-1",
      email: "test@example.com",
      subscribedAt: new Date(),
      unsubscribed: false,
      unsubscribedAt: null,
      source: "footer",
    });
    vi.mocked(getResend).mockReturnValue({
      contacts: {
        create: vi.fn().mockResolvedValue({ data: { id: "contact-1" } }),
      },
    } as any);
  });

  it("returns 200 on valid email", async () => {
    const response = await POST(makeRequest({ email: "user@example.com" }));
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
  });

  it("upserts subscriber in database", async () => {
    await POST(makeRequest({ email: "user@example.com" }));
    expect(prisma.newsletterSubscriber.upsert).toHaveBeenCalledWith({
      where: { email: "user@example.com" },
      create: { email: "user@example.com", source: "footer" },
      update: { unsubscribed: false, unsubscribedAt: null },
    });
  });

  it("syncs to Resend contacts", async () => {
    const mockCreate = vi.fn().mockResolvedValue({ data: { id: "c-1" } });
    vi.mocked(getResend).mockReturnValue({
      contacts: { create: mockCreate },
    } as any);

    await POST(makeRequest({ email: "user@example.com" }));
    expect(mockCreate).toHaveBeenCalledWith({
      email: "user@example.com",
      audienceId: "",
    });
  });

  it("returns 400 when email is missing", async () => {
    const response = await POST(makeRequest({}));
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("Email is required");
  });

  it("returns 400 when email is not a string", async () => {
    const response = await POST(makeRequest({ email: 123 }));
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("Email is required");
  });

  it("returns 400 when email is invalid", async () => {
    const response = await POST(makeRequest({ email: "not-an-email" }));
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("Invalid email address");
  });

  it("returns 400 on invalid JSON body", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/newsletter/subscribe",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json",
      },
    );
    const response = await POST(request);
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("Invalid request body");
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      isLimited: true,
      remaining: 0,
      retryAfter: 3600,
    });

    const response = await POST(makeRequest({ email: "user@example.com" }));
    expect(response.status).toBe(429);
    const json = await response.json();
    expect(json.error).toBe("Too many requests. Please try again later.");
  });

  it("returns 500 on database error", async () => {
    vi.mocked(prisma.newsletterSubscriber.upsert).mockRejectedValue(
      new Error("DB connection failed"),
    );

    const response = await POST(makeRequest({ email: "user@example.com" }));
    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error).toBe("Failed to subscribe. Please try again.");
  });

  it("returns 200 even when Resend fails (graceful degradation)", async () => {
    vi.mocked(getResend).mockReturnValue({
      contacts: {
        create: vi.fn().mockRejectedValue(new Error("Resend API down")),
      },
    } as any);

    const response = await POST(makeRequest({ email: "user@example.com" }));
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
  });

  it("handles re-subscribe (upsert updates unsubscribed flag)", async () => {
    vi.mocked(prisma.newsletterSubscriber.upsert).mockResolvedValue({
      id: "sub-1",
      email: "returning@example.com",
      subscribedAt: new Date(),
      unsubscribed: false,
      unsubscribedAt: null,
      source: "footer",
    });

    const response = await POST(
      makeRequest({ email: "returning@example.com" }),
    );
    expect(response.status).toBe(200);
    expect(prisma.newsletterSubscriber.upsert).toHaveBeenCalledWith({
      where: { email: "returning@example.com" },
      create: { email: "returning@example.com", source: "footer" },
      update: { unsubscribed: false, unsubscribedAt: null },
    });
  });

  it("extracts client IP from x-forwarded-for header", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/newsletter/subscribe",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "203.0.113.1, 70.41.3.18",
        },
        body: JSON.stringify({ email: "user@example.com" }),
      },
    );

    await POST(request);
    expect(checkRateLimit).toHaveBeenCalledWith(
      "newsletter-subscribe:203.0.113.1",
      expect.any(Object),
    );
  });

  it("extracts client IP from x-real-ip header", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/newsletter/subscribe",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-real-ip": "198.51.100.1",
        },
        body: JSON.stringify({ email: "user@example.com" }),
      },
    );

    await POST(request);
    expect(checkRateLimit).toHaveBeenCalledWith(
      "newsletter-subscribe:198.51.100.1",
      expect.any(Object),
    );
  });

  it("uses 'unknown' when no IP headers present", async () => {
    await POST(makeRequest({ email: "user@example.com" }));
    expect(checkRateLimit).toHaveBeenCalledWith(
      "newsletter-subscribe:unknown",
      expect.any(Object),
    );
  });
});
