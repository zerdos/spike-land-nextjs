/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

// Mock dependencies
vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn((body, init) => ({
      status: init?.status || 200,
      json: async () => body,
      headers: new Map(Object.entries(init?.headers || {})),
    })),
  },
  NextRequest: class {
    url: string;
    constructor(url: string) {
      this.url = url;
    }
  },
}));

vi.mock("@/lib/create/content-service", () => ({
  getCreatedApp: vi.fn(),
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("GET /api/create/screenshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return 400 if slug is missing", async () => {
    const request = new Request("http://localhost/api/create/screenshot") as any;
    const response = await GET(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Slug query parameter is required");
  });

  it("should return 404 if app not found", async () => {
    const { getCreatedApp } = await import("@/lib/create/content-service");
    vi.mocked(getCreatedApp).mockResolvedValue(null);

    const request = new Request("http://localhost/api/create/screenshot?slug=test-app") as any;
    const response = await GET(request);
    expect(response.status).toBe(404);
  });

  it("should return 502 if screenshot fetch fails", async () => {
    const { getCreatedApp } = await import("@/lib/create/content-service");
    vi.mocked(getCreatedApp).mockResolvedValue({ codespaceId: "123" } as any);

    mockFetch.mockResolvedValue({
      ok: false,
    });

    const request = new Request("http://localhost/api/create/screenshot?slug=test-app") as any;
    const response = await GET(request);
    expect(response.status).toBe(502);
  });

  it("should return 200 and base64 image if successful", async () => {
    const { getCreatedApp } = await import("@/lib/create/content-service");
    vi.mocked(getCreatedApp).mockResolvedValue({ codespaceId: "123" } as any);

    const mockBuffer = Buffer.from("fake-image");
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => mockBuffer,
    });

    const request = new Request("http://localhost/api/create/screenshot?slug=test-app") as any;
    const response = await GET(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.base64).toBe(mockBuffer.toString("base64"));
    expect(data.mimeType).toBe("image/jpeg");
  });
});
