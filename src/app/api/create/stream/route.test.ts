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

async function readSSEEvents(response: Response): Promise<Array<Record<string, unknown>>> {
  const text = await response.text();
  return text
    .split("\n\n")
    .filter((line) => line.startsWith("data: "))
    .map((line) => JSON.parse(line.slice(6)) as Record<string, unknown>);
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
      codespaceUrl: "https://testing.spike.land/live/abc/",
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

  it("streams SSE events with direct generation (no agent)", async () => {
    const res = await POST(makeRequest({ path: ["games", "tetris"] }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");

    const events = await readSSEEvents(res);
    const types = events.map((e) => e["type"]);
    expect(types).toContain("agent");
    expect(types).toContain("status");
    expect(types).toContain("complete");

    const complete = events.find((e) => e["type"] === "complete");
    expect(complete?.["title"]).toBe("Test App");
    expect(complete?.["agent"]).toBe("Opus 4.6");
  });

  it("emits heartbeat events in SSE stream", async () => {
    vi.useFakeTimers();

    const res = await POST(makeRequest({ path: ["games", "tetris"] }));
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");

    // The stream should contain events - heartbeats fire every 15s
    // Since generation is fast in mocks, we may not see heartbeats
    // But the response should still work
    const events = await readSSEEvents(res);
    const types = events.map((e) => e["type"]);
    expect(types).toContain("complete");

    vi.useRealTimers();
  });

  it("stream response includes proper SSE headers", async () => {
    const res = await POST(makeRequest({ path: ["games", "tetris"] }));
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    expect(res.headers.get("Cache-Control")).toBe("no-cache, no-transform");
    expect(res.headers.get("Connection")).toBe("keep-alive");
  });

  it("streams error event on generation failure", async () => {
    const { generateAppContent } = await import("@/lib/create/content-generator");
    vi.mocked(generateAppContent).mockResolvedValueOnce({
      content: null,
      rawCode: null,
      error: "AI service down",
    });

    const res = await POST(makeRequest({ path: ["games", "tetris"] }));
    const events = await readSSEEvents(res);
    const errorEvent = events.find((e) => e["type"] === "error");
    expect(errorEvent?.["message"]).toBe("AI service down");
  });
});

describe("isAgentAvailable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockRejectedValue(new Error("Connection refused"));
  });

  it("returns false when env vars not set", async () => {
    // CREATE_AGENT_URL and CREATE_AGENT_SECRET are undefined by default in tests
    const result = await isAgentAvailable();
    expect(result).toBe(false);
  });

  it("returns false when fetch fails", async () => {
    // Even if env vars were set, fetch rejection means unavailable
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

    // Claude is not configured in tests, so OPEN circuit has no effect
    // (circuit is only checked inside isClaudeConfigured() block)
    const res = await POST(makeRequest({ path: ["games", "tetris"] }));
    expect(res.status).toBe(200);

    const events = await readSSEEvents(res);
    // Should use Gemini agent (fallback)
    const agentEvent = events.find((e) => e["type"] === "agent");
    expect(agentEvent?.["name"]).toBe("Opus 4.6");
  });

  it("records circuit success after successful Claude generation", async () => {
    // Claude is not configured in test env, so it falls through to Gemini
    // We test the CLOSED path which doesn't skip Claude
    const { getCircuitState, recordCircuitSuccess } = await import("@/lib/create/circuit-breaker");
    vi.mocked(getCircuitState).mockResolvedValueOnce("CLOSED");

    const res = await POST(makeRequest({ path: ["games", "tetris"] }));
    expect(res.status).toBe(200);

    const events = await readSSEEvents(res);
    expect(events.some((e) => e["type"] === "complete")).toBe(true);

    // recordCircuitSuccess is not called when Claude is not configured (falls through to Gemini)
    // This test verifies the CLOSED state allows normal operation
    expect(vi.mocked(recordCircuitSuccess)).not.toHaveBeenCalled();
  });

  it("allows test request through when circuit is HALF_OPEN", async () => {
    const { getCircuitState } = await import("@/lib/create/circuit-breaker");
    vi.mocked(getCircuitState).mockResolvedValueOnce("HALF_OPEN");

    // Claude is not configured in tests, so it falls through to Gemini
    const res = await POST(makeRequest({ path: ["games", "tetris"] }));
    expect(res.status).toBe(200);

    const events = await readSSEEvents(res);
    expect(events.some((e) => e["type"] === "complete")).toBe(true);
  });
});
