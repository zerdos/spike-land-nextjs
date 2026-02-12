import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/create/content-service", () => ({
  getCreatedApp: vi.fn(),
}));

vi.mock("@/lib/try-catch", () => ({
  tryCatch: vi.fn(async (promise: Promise<unknown>) => {
    try {
      const data = await promise;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }),
}));

const { getCreatedApp } = await import("@/lib/create/content-service");

// Helper to create NextRequest-like objects with slug as query param
function createRequest(slug = "test-slug") {
  const url = `http://localhost/api/create/screenshot?slug=${encodeURIComponent(slug)}`;
  return new Request(url, { method: "GET" }) as any;
}

// Helper to create NextRequest without slug param
function createRequestNoSlug() {
  return new Request("http://localhost/api/create/screenshot", { method: "GET" }) as any;
}

describe("Screenshot API Route", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("should return 400 when slug query param is missing", async () => {
    const response = await GET(createRequestNoSlug());
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Slug query parameter is required");
  });

  it("should return 404 when app is not found", async () => {
    vi.mocked(getCreatedApp).mockResolvedValue(null);

    const response = await GET(createRequest("nonexistent"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("App not found");
  });

  it("should return 404 when app has no codespaceId", async () => {
    vi.mocked(getCreatedApp).mockResolvedValue({
      slug: "test",
      codespaceId: null,
    } as any);

    const response = await GET(createRequest("test"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("App not found");
  });

  it("should return 404 when codespaceId is empty string", async () => {
    vi.mocked(getCreatedApp).mockResolvedValue({
      slug: "test",
      codespaceId: "",
    } as any);

    const response = await GET(createRequest("test"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("App not found");
  });

  it("should return screenshot as base64 when successful", async () => {
    vi.mocked(getCreatedApp).mockResolvedValue({
      slug: "test-app",
      codespaceId: "test-codespace-id",
    } as any);

    const fakeImageData = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG header bytes
    const mockResponse = new Response(fakeImageData, { status: 200 });

    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    const response = await GET(createRequest("test-app"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.base64).toBe(Buffer.from(fakeImageData).toString("base64"));
    expect(data.mimeType).toBe("image/jpeg");
  });

  it("should fetch from correct testing.spike.land URL", async () => {
    vi.mocked(getCreatedApp).mockResolvedValue({
      slug: "test-app",
      codespaceId: "my-codespace",
    } as any);

    const mockResponse = new Response(new Uint8Array([1, 2, 3]), { status: 200 });
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    await GET(createRequest("test-app"));

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://testing.spike.land/live/my-codespace/screenshot",
      expect.objectContaining({ next: { revalidate: 30 } }),
    );
  });

  it("should return 502 when fetch fails", async () => {
    vi.mocked(getCreatedApp).mockResolvedValue({
      slug: "test-app",
      codespaceId: "test-codespace-id",
    } as any);

    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const response = await GET(createRequest("test-app"));
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toBe("Screenshot unavailable");
  });

  it("should return 502 when upstream returns non-ok response", async () => {
    vi.mocked(getCreatedApp).mockResolvedValue({
      slug: "test-app",
      codespaceId: "test-codespace-id",
    } as any);

    const mockResponse = new Response("Not Found", { status: 404 });
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    const response = await GET(createRequest("test-app"));
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toBe("Screenshot unavailable");
  });

  it("should return 502 when arrayBuffer read fails", async () => {
    vi.mocked(getCreatedApp).mockResolvedValue({
      slug: "test-app",
      codespaceId: "test-codespace-id",
    } as any);

    const mockResponse = {
      ok: true,
      arrayBuffer: vi.fn().mockRejectedValue(new Error("Read error")),
    };
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    const response = await GET(createRequest("test-app"));
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toBe("Failed to read screenshot");
  });

  it("should include cache headers in successful response", async () => {
    vi.mocked(getCreatedApp).mockResolvedValue({
      slug: "test-app",
      codespaceId: "test-codespace-id",
    } as any);

    const mockResponse = new Response(new Uint8Array([1, 2, 3]), { status: 200 });
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    const response = await GET(createRequest("test-app"));

    expect(response.headers.get("Cache-Control")).toBe(
      "public, s-maxage=30, stale-while-revalidate=60",
    );
  });

  it("should handle multi-segment slugs correctly", async () => {
    vi.mocked(getCreatedApp).mockResolvedValue({
      slug: "games/tetris",
      codespaceId: "tetris-codespace",
    } as any);

    const mockResponse = new Response(new Uint8Array([1, 2, 3]), { status: 200 });
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    const response = await GET(createRequest("games/tetris"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(getCreatedApp).toHaveBeenCalledWith("games/tetris");
  });
});
