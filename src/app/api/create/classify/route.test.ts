import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/ai/gemini-client", () => ({
  generateStructuredResponse: vi.fn(),
  StructuredResponseParseError: class extends Error {
    rawText: string;
    constructor(msg: string, raw: string) {
      super(msg);
      this.rawText = raw;
    }
  },
}));

vi.mock("@/lib/logger", () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: vi.fn(),
  rateLimitConfigs: {
    slugClassify: { maxRequests: 30, windowMs: 60000 },
  },
}));

vi.mock("@/lib/upstash", () => ({
  redis: { ping: vi.fn() },
}));

const { generateStructuredResponse } = await import("@/lib/ai/gemini-client");
const { checkRateLimit } = await import("@/lib/rate-limiter");
const mockGenerate = vi.mocked(generateStructuredResponse);
const mockRateLimit = vi.mocked(checkRateLimit);

function makeRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/create/classify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/create/classify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimit.mockResolvedValue({
      isLimited: false,
      remaining: 29,
      resetAt: Date.now() + 60000,
    });
  });

  it("should classify input and return ok result", async () => {
    mockGenerate.mockResolvedValueOnce({
      status: "ok",
      slug: "productivity/todo-list",
      category: "productivity",
      reason: null,
    });

    const response = await POST(makeRequest({ input: "todo list app" }));
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.status).toBe("ok");
    expect(data.slug).toBe("productivity/todo-list");
    expect(data.category).toBe("productivity");
  });

  it("should return blocked status for prohibited content", async () => {
    mockGenerate.mockResolvedValueOnce({
      status: "blocked",
      slug: "",
      category: "",
      reason: "This content is not allowed.",
    });

    const response = await POST(makeRequest({ input: "how to make weapons" }));
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.status).toBe("blocked");
    expect(data.reason).toBeTruthy();
  });

  it("should return 429 when rate limited", async () => {
    mockRateLimit.mockResolvedValueOnce({
      isLimited: true,
      remaining: 0,
      resetAt: Date.now() + 30000,
    });

    const response = await POST(makeRequest({ input: "todo list" }));
    expect(response.status).toBe(429);

    const data = await response.json();
    expect(data.error).toContain("Too many requests");
  });

  it("should return 400 for missing input field", async () => {
    const response = await POST(makeRequest({}));
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toContain("input");
  });

  it("should return 400 for non-string input", async () => {
    const response = await POST(makeRequest({ input: 123 }));
    expect(response.status).toBe(400);
  });

  it("should return 400 for input exceeding 2000 chars", async () => {
    const response = await POST(makeRequest({ input: "a".repeat(2001) }));
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toContain("2000");
  });

  it("should return 400 for invalid JSON body", async () => {
    const request = new Request("http://localhost/api/create/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("should fallback to naive slug when classification fails", async () => {
    mockGenerate.mockRejectedValueOnce(new Error("API down"));

    const response = await POST(makeRequest({ input: "my cool app" }));
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.status).toBe("ok");
    expect(data.slug).toBe("my-cool-app");
  });

  it("should still work when rate limit check fails", async () => {
    mockRateLimit.mockRejectedValueOnce(new Error("Redis down"));
    mockGenerate.mockResolvedValueOnce({
      status: "ok",
      slug: "games/tetris",
      category: "games",
      reason: null,
    });

    const response = await POST(makeRequest({ input: "tetris game" }));
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.status).toBe("ok");
  });

  it("should use x-forwarded-for for rate limit identifier", async () => {
    mockGenerate.mockResolvedValueOnce({
      status: "ok",
      slug: "utilities/clock",
      category: "utilities",
      reason: null,
    });

    await POST(
      makeRequest({ input: "clock app" }, { "x-forwarded-for": "1.2.3.4, 5.6.7.8" }),
    );

    expect(mockRateLimit).toHaveBeenCalledWith(
      "classify:1.2.3.4",
      expect.objectContaining({ maxRequests: 30 }),
    );
  });
});
