import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: vi.fn(),
  rateLimitConfigs: {
    tts: { maxRequests: 20, windowMs: 60_000 },
  },
}));

vi.mock("@/lib/tts/elevenlabs-client", () => ({
  synthesizeSpeech: vi.fn(),
  MAX_TEXT_LENGTH: 5000,
}));

vi.mock("@/lib/tts/tts-cache", () => ({
  getCachedTTSUrl: vi.fn(),
  cacheTTSAudio: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

const { checkRateLimit } = await import("@/lib/rate-limiter");
const { synthesizeSpeech } = await import("@/lib/tts/elevenlabs-client");
const { getCachedTTSUrl, cacheTTSAudio } = await import(
  "@/lib/tts/tts-cache"
);
const { headers } = await import("next/headers");
const { POST } = await import("./route");

function makeHeaders(entries: Record<string, string | null> = {}): {
  get: (name: string) => string | null;
} {
  return {
    get: (name: string) => entries[name] ?? null,
  };
}

function makeRequest(body?: unknown): Request {
  if (body === undefined) {
    // Return a request whose .json() will reject (simulate invalid JSON)
    return {
      json: () => Promise.reject(new Error("Invalid JSON")),
    } as unknown as Request;
  }
  return new Request("http://localhost/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/tts", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: not rate limited
    vi.mocked(checkRateLimit).mockResolvedValue({
      isLimited: false,
      remaining: 19,
      resetAt: Date.now() + 60_000,
    });

    // Default: headers with x-forwarded-for
    vi.mocked(headers).mockResolvedValue(
      makeHeaders({ "x-forwarded-for": "1.2.3.4" }) as any,
    );
  });

  // ---------------------------------------------------------------
  // IP extraction
  // ---------------------------------------------------------------

  it("should use x-forwarded-for IP for rate limiting", async () => {
    vi.mocked(headers).mockResolvedValue(
      makeHeaders({ "x-forwarded-for": "10.0.0.1, 10.0.0.2" }) as any,
    );

    const request = makeRequest({ text: "hello" });
    vi.mocked(getCachedTTSUrl).mockResolvedValue("https://cached.url/a.mp3");

    await POST(request);

    expect(checkRateLimit).toHaveBeenCalledWith(
      "tts:10.0.0.1",
      expect.anything(),
    );
  });

  it("should use x-real-ip as fallback when x-forwarded-for is absent", async () => {
    vi.mocked(headers).mockResolvedValue(
      makeHeaders({ "x-real-ip": "192.168.1.1" }) as any,
    );

    const request = makeRequest({ text: "hello" });
    vi.mocked(getCachedTTSUrl).mockResolvedValue("https://cached.url/a.mp3");

    await POST(request);

    expect(checkRateLimit).toHaveBeenCalledWith(
      "tts:192.168.1.1",
      expect.anything(),
    );
  });

  it('should use "unknown" when no IP headers are present', async () => {
    vi.mocked(headers).mockResolvedValue(makeHeaders({}) as any);

    const request = makeRequest({ text: "hello" });
    vi.mocked(getCachedTTSUrl).mockResolvedValue("https://cached.url/a.mp3");

    await POST(request);

    expect(checkRateLimit).toHaveBeenCalledWith(
      "tts:unknown",
      expect.anything(),
    );
  });

  // ---------------------------------------------------------------
  // Rate limiting
  // ---------------------------------------------------------------

  it("should return 429 when rate limited", async () => {
    const resetAt = Date.now() + 30_000;
    vi.mocked(checkRateLimit).mockResolvedValue({
      isLimited: true,
      remaining: 0,
      resetAt,
    });

    const request = makeRequest({ text: "hello" });
    const response = await POST(request);

    expect(response.status).toBe(429);
    const data = await response.json();
    expect(data.error).toBe("Too many requests. Please try again later.");
    expect(response.headers.get("Retry-After")).toBeTruthy();
  });

  // ---------------------------------------------------------------
  // Request body validation
  // ---------------------------------------------------------------

  it("should return 400 for invalid JSON body", async () => {
    const request = makeRequest(); // .json() will reject
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Invalid JSON body");
  });

  it("should return 400 when text is missing", async () => {
    const request = makeRequest({});
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe(
      "Text is required and must be a non-empty string",
    );
  });

  it("should return 400 when text is an empty string", async () => {
    const request = makeRequest({ text: "   " });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe(
      "Text is required and must be a non-empty string",
    );
  });

  it("should return 400 when text is not a string (number)", async () => {
    const request = makeRequest({ text: 42 });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe(
      "Text is required and must be a non-empty string",
    );
  });

  it("should return 400 when text exceeds maximum length", async () => {
    const longText = "a".repeat(5001);
    const request = makeRequest({ text: longText });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe(
      "Text exceeds maximum length of 5000 characters",
    );
  });

  // ---------------------------------------------------------------
  // Cache hit
  // ---------------------------------------------------------------

  it("should return cached URL when cache hit", async () => {
    const cachedUrl = "https://r2.example.com/tts/abc123.mp3";
    vi.mocked(getCachedTTSUrl).mockResolvedValue(cachedUrl);

    const request = makeRequest({ text: "hello world" });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.url).toBe(cachedUrl);
    expect(synthesizeSpeech).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------
  // Cache miss -> synthesis -> R2 upload success
  // ---------------------------------------------------------------

  it("should synthesize and return R2 URL when cache miss and upload succeeds", async () => {
    vi.mocked(getCachedTTSUrl).mockResolvedValue(null);
    const audioBuffer = Buffer.from("fake-audio-data");
    vi.mocked(synthesizeSpeech).mockResolvedValue(audioBuffer);
    const uploadUrl = "https://r2.example.com/tts/new123.mp3";
    vi.mocked(cacheTTSAudio).mockResolvedValue(uploadUrl);

    const request = makeRequest({ text: "hello world" });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.url).toBe(uploadUrl);
    expect(synthesizeSpeech).toHaveBeenCalledWith("hello world");
    expect(cacheTTSAudio).toHaveBeenCalledWith("hello world", audioBuffer);
  });

  // ---------------------------------------------------------------
  // Synthesis failure
  // ---------------------------------------------------------------

  it("should return 500 when synthesis fails", async () => {
    vi.mocked(getCachedTTSUrl).mockResolvedValue(null);
    vi.mocked(synthesizeSpeech).mockRejectedValue(
      new Error("ElevenLabs API error"),
    );
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const request = makeRequest({ text: "hello world" });
    const response = await POST(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Failed to generate speech");
    expect(consoleSpy).toHaveBeenCalledWith(
      "[TTS] Synthesis failed:",
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });

  // ---------------------------------------------------------------
  // Synthesis success, R2 upload failure -> fallback audio buffer
  // ---------------------------------------------------------------

  it("should return audio buffer directly when R2 upload fails", async () => {
    vi.mocked(getCachedTTSUrl).mockResolvedValue(null);
    const audioBuffer = Buffer.from("raw-audio-data");
    vi.mocked(synthesizeSpeech).mockResolvedValue(audioBuffer);
    vi.mocked(cacheTTSAudio).mockRejectedValue(
      new Error("R2 upload failed"),
    );

    const request = makeRequest({ text: "hello world" });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("audio/mpeg");
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=86400",
    );

    const responseBuffer = Buffer.from(await response.arrayBuffer());
    expect(responseBuffer.toString()).toBe("raw-audio-data");
  });

  // ---------------------------------------------------------------
  // getCachedTTSUrl throws -> treated as cache miss, continues
  // ---------------------------------------------------------------

  it("should treat cache check failure as cache miss and continue", async () => {
    vi.mocked(getCachedTTSUrl).mockRejectedValue(
      new Error("R2 connection error"),
    );
    const audioBuffer = Buffer.from("audio-bytes");
    vi.mocked(synthesizeSpeech).mockResolvedValue(audioBuffer);
    const uploadUrl = "https://r2.example.com/tts/fallback.mp3";
    vi.mocked(cacheTTSAudio).mockResolvedValue(uploadUrl);

    const request = makeRequest({ text: "hello world" });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.url).toBe(uploadUrl);
  });

  // ---------------------------------------------------------------
  // cacheTTSAudio returns null (upload succeeds but returns null)
  // ---------------------------------------------------------------

  it("should return audio buffer directly when cacheTTSAudio returns null", async () => {
    vi.mocked(getCachedTTSUrl).mockResolvedValue(null);
    const audioBuffer = Buffer.from("audio-fallback");
    vi.mocked(synthesizeSpeech).mockResolvedValue(audioBuffer);
    vi.mocked(cacheTTSAudio).mockResolvedValue(null);

    const request = makeRequest({ text: "hello world" });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("audio/mpeg");
    const responseBuffer = Buffer.from(await response.arrayBuffer());
    expect(responseBuffer.toString()).toBe("audio-fallback");
  });
});
