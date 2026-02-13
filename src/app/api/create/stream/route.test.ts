import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST, isAgentAvailable } from "./route";

// --- Mocks ---

vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "user-1" } }),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkGenerationRateLimit: vi.fn().mockResolvedValue({ allowed: true, retryAfterSeconds: 0 }),
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
}));

vi.mock("@/lib/create/content-service", () => ({
  getCreatedApp: vi.fn().mockResolvedValue(null),
  markAsGenerating: vi.fn().mockResolvedValue(undefined),
  updateAppContent: vi.fn().mockResolvedValue(undefined),
  updateAppStatus: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/create/codespace-service", () => ({
  generateCodespaceId: vi.fn().mockReturnValue("test-codespace-id"),
  updateCodespace: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/lib/create/content-generator", () => ({
  generateAppContent: vi.fn().mockResolvedValue({
    content: {
      title: "Test App",
      description: "A test application",
      code: "export default function App() { return <div>Test</div>; }",
      relatedApps: ["tools/timer"],
    },
    rawCode: "export default function App() { return <div>Test</div>; }",
    error: null,
  }),
  attemptCodeCorrection: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/logger", () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/lib/create/circuit-breaker", () => ({
  getCircuitState: vi.fn().mockResolvedValue("CLOSED"),
  recordCircuitFailure: vi.fn().mockResolvedValue(undefined),
  recordCircuitSuccess: vi.fn().mockResolvedValue(undefined),
}));

// Mock fetch globally for agent checks
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/create/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/create/stream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: agent not available (fetch rejects)
    mockFetch.mockRejectedValue(new Error("Connection refused"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 429 when rate limited", async () => {
    const { checkGenerationRateLimit } = await import("@/lib/rate-limit");
    vi.mocked(checkGenerationRateLimit).mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 60 });

    const res = await POST(makeRequest({ path: ["games", "tetris"] }));
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error).toBe("Rate limit exceeded");
  });

  it("returns 400 for invalid JSON", async () => {
    const req = new Request("http://localhost/api/create/stream", {
      method: "POST",
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid schema", async () => {
    const res = await POST(makeRequest({ wrong: "field" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for empty path", async () => {
    const res = await POST(makeRequest({ path: [] }));
    expect(res.status).toBe(400);
  });

  it("returns published app if exists", async () => {
    const { getCreatedApp } = await import("@/lib/create/content-service");
    vi.mocked(getCreatedApp).mockResolvedValueOnce({
      status: "PUBLISHED" as const,
      codespaceUrl: "/api/codespace/abc/embed",
      slug: "games/tetris",
    } as ReturnType<typeof getCreatedApp> extends Promise<infer T> ? NonNullable<T> : never);

    const res = await POST(makeRequest({ path: ["games", "tetris"] }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("PUBLISHED");
  });

  it("returns 202 if already generating", async () => {
    const { getCreatedApp } = await import("@/lib/create/content-service");
    vi.mocked(getCreatedApp).mockResolvedValueOnce({
      status: "GENERATING" as const,
      generatedAt: new Date(), // just now
    } as ReturnType<typeof getCreatedApp> extends Promise<infer T> ? NonNullable<T> : never);

    const res = await POST(makeRequest({ path: ["games", "tetris"] }));
    expect(res.status).toBe(202);
  });

  it("returns JSON with success result for direct generation", async () => {
    const res = await POST(makeRequest({ path: ["games", "tetris"] }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("application/json");

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.codeSpace).toBe("games/tetris");
    expect(data.title).toBe("Test App");
    expect(data.buildLog).toBeInstanceOf(Array);
    expect(data.buildLog.length).toBeGreaterThan(0);
  });

  it("returns JSON with error on generation failure", async () => {
    const { generateAppContent } = await import("@/lib/create/content-generator");
    vi.mocked(generateAppContent).mockResolvedValueOnce({
      content: null,
      rawCode: null,
      error: "AI service down",
    });

    const res = await POST(makeRequest({ path: ["games", "tetris"] }));
    expect(res.headers.get("Content-Type")).toContain("application/json");

    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe("AI service down");
  });

  it("includes build log messages in response", async () => {
    const res = await POST(makeRequest({ path: ["games", "tetris"] }));
    const data = await res.json();

    expect(data.buildLog).toContain("Initializing app generation...");
    expect(data.buildLog).toContain("Designing application logic...");
    expect(data.buildLog).toContain("Writing code...");
    expect(data.buildLog).toContain("Finalizing...");
  });
});

describe("isAgentAvailable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockRejectedValue(new Error("Connection refused"));
  });

  it("returns false when env vars not set", async () => {
    const result = await isAgentAvailable();
    expect(result).toBe(false);
  });

  it("returns false when fetch fails", async () => {
    const result = await isAgentAvailable();
    expect(result).toBe(false);
  });
});

describe("circuit breaker integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockRejectedValue(new Error("Connection refused"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("skips Claude and uses Gemini fallback when circuit is OPEN", async () => {
    const { getCircuitState } = await import("@/lib/create/circuit-breaker");
    vi.mocked(getCircuitState).mockResolvedValueOnce("OPEN");

    const res = await POST(makeRequest({ path: ["games", "tetris"] }));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.title).toBe("Test App");
  });

  it("records circuit success after successful Claude generation", async () => {
    const { getCircuitState, recordCircuitSuccess } = await import("@/lib/create/circuit-breaker");
    vi.mocked(getCircuitState).mockResolvedValueOnce("CLOSED");

    const res = await POST(makeRequest({ path: ["games", "tetris"] }));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);

    // recordCircuitSuccess is not called when Claude is not configured (falls through to Gemini)
    expect(vi.mocked(recordCircuitSuccess)).not.toHaveBeenCalled();
  });

  it("allows test request through when circuit is HALF_OPEN", async () => {
    const { getCircuitState } = await import("@/lib/create/circuit-breaker");
    vi.mocked(getCircuitState).mockResolvedValueOnce("HALF_OPEN");

    const res = await POST(makeRequest({ path: ["games", "tetris"] }));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
  });
});
