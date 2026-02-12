import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockIsCodespaceHealthy = vi.fn();

vi.mock("@/lib/create/codespace-health", () => ({
  isCodespaceHealthy: (...args: unknown[]) => mockIsCodespaceHealthy(...args),
}));

// Import after mocks are set up
const { GET } = await import("./route");

describe("GET /api/create/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when codespaceId is missing", async () => {
    const request = new NextRequest("http://localhost:3000/api/create/health");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("codespaceId is required");
  });

  it("returns healthy: true for healthy codespace", async () => {
    mockIsCodespaceHealthy.mockResolvedValue(true);

    const request = new NextRequest(
      "http://localhost:3000/api/create/health?codespaceId=test-cs",
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.healthy).toBe(true);
    expect(mockIsCodespaceHealthy).toHaveBeenCalledWith("test-cs");
  });

  it("returns healthy: false for unhealthy codespace", async () => {
    mockIsCodespaceHealthy.mockResolvedValue(false);

    const request = new NextRequest(
      "http://localhost:3000/api/create/health?codespaceId=bad-cs",
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.healthy).toBe(false);
  });

  it("sets cache control headers", async () => {
    mockIsCodespaceHealthy.mockResolvedValue(true);

    const request = new NextRequest(
      "http://localhost:3000/api/create/health?codespaceId=test-cs",
    );
    const response = await GET(request);

    expect(response.headers.get("Cache-Control")).toBe(
      "public, s-maxage=60, stale-while-revalidate=300",
    );
  });
});
