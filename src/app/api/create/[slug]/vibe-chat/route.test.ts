import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock all external dependencies before importing route
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/create/content-service", () => ({
  getCreatedApp: vi.fn(),
}));

vi.mock("@/lib/codespace", () => ({
  getOrCreateSession: vi.fn(),
}));

vi.mock("@/lib/claude-agent/tools/codespace-tools", () => ({
  createCodespaceServer: vi.fn(() => ({ name: "codespace", version: "1.0.0" })),
  CODESPACE_TOOL_NAMES: [
    "mcp__codespace__read_code",
    "mcp__codespace__update_code",
    "mcp__codespace__edit_code",
    "mcp__codespace__search_and_replace",
    "mcp__codespace__find_lines",
    "mcp__codespace__validate_code",
  ],
}));

vi.mock("@/lib/claude-agent/prompts/codespace-system", () => ({
  getSystemPromptWithCode: vi.fn((code: string) => `System prompt with code: ${code.substring(0, 20)}`),
  CODESPACE_SYSTEM_PROMPT: "Base system prompt",
}));

vi.mock("@/lib/logger", () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
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

// Mock the Claude Agent SDK query function
vi.mock("@anthropic-ai/claude-agent-sdk", () => ({
  query: vi.fn(),
}));

const { auth } = await import("@/auth");
const { getCreatedApp } = await import("@/lib/create/content-service");
const { getOrCreateSession } = await import("@/lib/codespace");
const { query } = await import("@anthropic-ai/claude-agent-sdk");

// Import route handler
const { POST } = await import("./route");

// Helper to create mock NextRequest objects
function createRequest(body: Record<string, unknown>, headers?: Record<string, string>) {
  const req = new Request("http://localhost/api/create/test-slug/vibe-chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
  return req as any;
}

// Helper to create an async iterable from an array of messages
function createAsyncIterable<T>(items: T[]): AsyncIterable<T> {
  return {
    [Symbol.asyncIterator]() {
      let index = 0;
      return {
        async next() {
          if (index < items.length) {
            return { value: items[index++]!, done: false };
          }
          return { value: undefined, done: true };
        },
      };
    },
  };
}

// Helper to read SSE stream into parsed events
async function readSSEStream(response: Response): Promise<any[]> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  const events: any[] = [];
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n\n");
    // Keep the last potentially incomplete chunk
    buffer = lines.pop() || "";

    for (const line of lines) {
      const dataMatch = line.match(/^data: (.+)$/);
      if (dataMatch && dataMatch[1]) {
        events.push(JSON.parse(dataMatch[1]));
      }
    }
  }

  return events;
}

describe("Vibe Chat API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: return a published app
    vi.mocked(getCreatedApp).mockResolvedValue({
      slug: "test-slug",
      status: "PUBLISHED",
      codespaceId: "test-codespace",
    } as any);

    // Default: return session with code
    vi.mocked(getOrCreateSession).mockResolvedValue({
      code: "export default function App() { return <div>Hello</div>; }",
    } as any);

    // Default: query returns a simple response
    vi.mocked(query).mockReturnValue(
      createAsyncIterable([
        {
          type: "assistant",
          message: {
            content: [{ type: "text", text: "Here is my response" }],
          },
        },
        { type: "result", subtype: "success" },
      ]) as any,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("rate limiting", () => {
    it("should return 429 after exceeding rate limit", async () => {
      // We need to exhaust the rate limit for the test IP
      // The rate limiter uses in-memory state, so we need to send many requests
      const testIp = `test-rate-limit-${Date.now()}`;

      for (let i = 0; i < 10; i++) {
        await POST(
          createRequest({ content: "test", mode: "plan" }, { "x-forwarded-for": testIp as string }),
          { params: Promise.resolve({ slug: "test-slug" }) },
        );
      }

      // 11th request should be rate limited
      const response = await POST(
        createRequest({ content: "test", mode: "plan" }, { "x-forwarded-for": testIp as string }),
        { params: Promise.resolve({ slug: "test-slug" }) },
      );

      expect(response.status).toBe(429);
      const data = await response.json();
      expect(data.error).toBe("Too many requests");
    });
  });

  describe("input validation", () => {
    it("should return 400 for invalid JSON body", async () => {
      const req = new Request("http://localhost/api/create/test-slug/vibe-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": `validate-${Date.now()}` },
        body: "not json",
      });

      const response = await POST(req as any, {
        params: Promise.resolve({ slug: "test-slug" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid JSON body");
    });

    it("should return 400 when content is missing", async () => {
      const response = await POST(
        createRequest({ mode: "plan" }, { "x-forwarded-for": `nocontent-${Date.now()}` }),
        { params: Promise.resolve({ slug: "test-slug" }) },
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Content is required");
    });

    it("should return 400 when content is not a string", async () => {
      const response = await POST(
        createRequest({ content: 123, mode: "plan" }, { "x-forwarded-for": `badcontent-${Date.now()}` }),
        { params: Promise.resolve({ slug: "test-slug" }) },
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Content is required");
    });

    it("should return 400 when mode is missing", async () => {
      const response = await POST(
        createRequest({ content: "hello" }, { "x-forwarded-for": `nomode-${Date.now()}` }),
        { params: Promise.resolve({ slug: "test-slug" }) },
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Mode must be 'plan' or 'edit'");
    });

    it("should return 400 when mode is invalid", async () => {
      const response = await POST(
        createRequest({ content: "hello", mode: "invalid" }, { "x-forwarded-for": `badmode-${Date.now()}` }),
        { params: Promise.resolve({ slug: "test-slug" }) },
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Mode must be 'plan' or 'edit'");
    });
  });

  describe("authentication", () => {
    it("should return 401 for edit mode without auth", async () => {
      vi.mocked(auth).mockResolvedValue(null as any);

      const response = await POST(
        createRequest({ content: "hello", mode: "edit" }, { "x-forwarded-for": `auth-${Date.now()}` }),
        { params: Promise.resolve({ slug: "test-slug" }) },
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Authentication required for edit mode");
    });

    it("should not require auth for plan mode", async () => {
      const response = await POST(
        createRequest({ content: "hello", mode: "plan" }, { "x-forwarded-for": `planauth-${Date.now()}` }),
        { params: Promise.resolve({ slug: "test-slug" }) },
      );

      // Should not be 401 — should proceed to streaming
      expect(response.status).not.toBe(401);
      expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    });

    it("should allow edit mode with valid auth", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as any);

      const response = await POST(
        createRequest({ content: "hello", mode: "edit" }, { "x-forwarded-for": `editauth-${Date.now()}` }),
        { params: Promise.resolve({ slug: "test-slug" }) },
      );

      expect(response.status).not.toBe(401);
      expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    });
  });

  describe("app lookup", () => {
    it("should return 404 when app is not found", async () => {
      vi.mocked(getCreatedApp).mockResolvedValue(null);

      const response = await POST(
        createRequest({ content: "hello", mode: "plan" }, { "x-forwarded-for": `noapp-${Date.now()}` }),
        { params: Promise.resolve({ slug: "missing" }) },
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("App not found or not published");
    });

    it("should return 404 when app is not published", async () => {
      vi.mocked(getCreatedApp).mockResolvedValue({
        slug: "test",
        status: "GENERATING",
        codespaceId: "cs1",
      } as any);

      const response = await POST(
        createRequest({ content: "hello", mode: "plan" }, { "x-forwarded-for": `notpub-${Date.now()}` }),
        { params: Promise.resolve({ slug: "test" }) },
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("App not found or not published");
    });

    it("should return 404 when app has no codespaceId", async () => {
      vi.mocked(getCreatedApp).mockResolvedValue({
        slug: "test",
        status: "PUBLISHED",
        codespaceId: null,
      } as any);

      const response = await POST(
        createRequest({ content: "hello", mode: "plan" }, { "x-forwarded-for": `nocs-${Date.now()}` }),
        { params: Promise.resolve({ slug: "test" }) },
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("App not found or not published");
    });
  });

  describe("SSE streaming", () => {
    it("should return SSE response with correct headers", async () => {
      const response = await POST(
        createRequest({ content: "hello", mode: "plan" }, { "x-forwarded-for": `sse-${Date.now()}` }),
        { params: Promise.resolve({ slug: "test-slug" }) },
      );

      expect(response.headers.get("Content-Type")).toBe("text/event-stream");
      expect(response.headers.get("Cache-Control")).toBe("no-cache");
      expect(response.headers.get("Connection")).toBe("keep-alive");
    });

    it("should emit initialize stage, chunk, and complete events", async () => {
      vi.mocked(query).mockReturnValue(
        createAsyncIterable([
          {
            type: "assistant",
            message: {
              content: [{ type: "text", text: "Hello world" }],
            },
          },
          { type: "result", subtype: "success" },
        ]) as any,
      );

      const response = await POST(
        createRequest({ content: "hello", mode: "plan" }, { "x-forwarded-for": `events-${Date.now()}` }),
        { params: Promise.resolve({ slug: "test-slug" }) },
      );

      const events = await readSSEStream(response);

      expect(events[0]).toEqual({ type: "stage", stage: "initialize" });
      expect(events.find((e) => e.type === "chunk")).toEqual({
        type: "chunk",
        content: "Hello world",
      });
      expect(events[events.length - 1]).toEqual({ type: "complete" });
    });

    it("should emit tool execution stages", async () => {
      vi.mocked(query).mockReturnValue(
        createAsyncIterable([
          {
            type: "assistant",
            message: {
              content: [
                { type: "tool_use", name: "mcp__codespace__read_code" },
                { type: "text", text: "I read the code" },
              ],
            },
          },
          { type: "result", subtype: "success" },
        ]) as any,
      );

      const response = await POST(
        createRequest({ content: "read the code", mode: "plan" }, { "x-forwarded-for": `tools-${Date.now()}` }),
        { params: Promise.resolve({ slug: "test-slug" }) },
      );

      const events = await readSSEStream(response);

      const toolStage = events.find((e) => e.stage === "executing_tool");
      expect(toolStage).toBeDefined();
      expect(toolStage!.tool).toBe("mcp__codespace__read_code");
    });

    it("should emit error when query result is not success", async () => {
      vi.mocked(query).mockReturnValue(
        createAsyncIterable([
          {
            type: "result",
            subtype: "error",
            errors: ["Something went wrong"],
          },
        ]) as any,
      );

      const response = await POST(
        createRequest({ content: "hello", mode: "plan" }, { "x-forwarded-for": `qerr-${Date.now()}` }),
        { params: Promise.resolve({ slug: "test-slug" }) },
      );

      const events = await readSSEStream(response);

      const errorEvent = events.find((e) => e.type === "error");
      expect(errorEvent).toBeDefined();
      expect(errorEvent!.content).toBe("Something went wrong");
    });

    it("should handle assistant message with no content array", async () => {
      vi.mocked(query).mockReturnValue(
        createAsyncIterable([
          {
            type: "assistant",
            message: {},
          },
          { type: "result", subtype: "success" },
        ]) as any,
      );

      const response = await POST(
        createRequest({ content: "hello", mode: "plan" }, { "x-forwarded-for": `noarr-${Date.now()}` }),
        { params: Promise.resolve({ slug: "test-slug" }) },
      );

      const events = await readSSEStream(response);
      expect(events[events.length - 1]).toEqual({ type: "complete" });
      // Should not emit any chunk since there's no text content
      expect(events.find((e) => e.type === "chunk")).toBeUndefined();
    });

    it("should emit 'Unknown error' when result errors array is undefined", async () => {
      vi.mocked(query).mockReturnValue(
        createAsyncIterable([
          {
            type: "result",
            subtype: "error",
            // no errors field
          },
        ]) as any,
      );

      const response = await POST(
        createRequest({ content: "hello", mode: "plan" }, { "x-forwarded-for": `unkerr-${Date.now()}` }),
        { params: Promise.resolve({ slug: "test-slug" }) },
      );

      const events = await readSSEStream(response);
      const errorEvent = events.find((e) => e.type === "error");
      expect(errorEvent).toBeDefined();
      expect(errorEvent!.content).toBe("Unknown error");
    });

    it("should handle non-Error exceptions in stream", async () => {
      vi.mocked(query).mockReturnValue({
        [Symbol.asyncIterator]() {
          return {
            async next() {
              throw "string error";
            },
          };
        },
      } as any);

      const response = await POST(
        createRequest({ content: "hello", mode: "plan" }, { "x-forwarded-for": `strerr-${Date.now()}` }),
        { params: Promise.resolve({ slug: "test-slug" }) },
      );

      const events = await readSSEStream(response);
      const errorEvent = events.find((e) => e.type === "error");
      expect(errorEvent).toBeDefined();
      expect(errorEvent!.content).toBe("Unknown error");
    });

    it("should emit error and complete on streaming exception", async () => {
      vi.mocked(query).mockReturnValue({
        [Symbol.asyncIterator]() {
          return {
            async next() {
              throw new Error("Stream crashed");
            },
          };
        },
      } as any);

      const response = await POST(
        createRequest({ content: "hello", mode: "plan" }, { "x-forwarded-for": `crash-${Date.now()}` }),
        { params: Promise.resolve({ slug: "test-slug" }) },
      );

      const events = await readSSEStream(response);

      const errorEvent = events.find((e) => e.type === "error");
      expect(errorEvent).toBeDefined();
      expect(errorEvent!.content).toBe("Stream crashed");

      // Should still emit complete
      expect(events[events.length - 1]).toEqual({ type: "complete" });
    });
  });

  describe("image and screenshot handling", () => {
    it("should pass images as data URIs to the query", async () => {
      const dataUri = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

      const response = await POST(
        createRequest(
          { content: "check this image", mode: "plan", images: [dataUri] },
          { "x-forwarded-for": `imgs-${Date.now()}` },
        ),
        { params: Promise.resolve({ slug: "test-slug" }) },
      );

      // Ensure streaming completes without error
      const events = await readSSEStream(response);
      expect(events[events.length - 1]).toEqual({ type: "complete" });
    });

    it("should skip non-data-URI images", async () => {
      const response = await POST(
        createRequest(
          { content: "check this", mode: "plan", images: ["https://example.com/image.png", 123] },
          { "x-forwarded-for": `skipimg-${Date.now()}` },
        ),
        { params: Promise.resolve({ slug: "test-slug" }) },
      );

      const events = await readSSEStream(response);
      expect(events[events.length - 1]).toEqual({ type: "complete" });
    });

    it("should skip data URIs that don't match the expected format", async () => {
      const response = await POST(
        createRequest(
          { content: "check this", mode: "plan", images: ["data:text/plain;base64,SGVsbG8="] },
          { "x-forwarded-for": `baduri-${Date.now()}` },
        ),
        { params: Promise.resolve({ slug: "test-slug" }) },
      );

      const events = await readSSEStream(response);
      expect(events[events.length - 1]).toEqual({ type: "complete" });
    });

    it("should pass screenshotBase64 to the query", async () => {
      const response = await POST(
        createRequest(
          { content: "check screenshot", mode: "plan", screenshotBase64: "iVBORw0KGgo=" },
          { "x-forwarded-for": `screenshot-${Date.now()}` },
        ),
        { params: Promise.resolve({ slug: "test-slug" }) },
      );

      const events = await readSSEStream(response);
      expect(events[events.length - 1]).toEqual({ type: "complete" });
    });

    it("should ignore non-string screenshotBase64", async () => {
      const response = await POST(
        createRequest(
          { content: "check", mode: "plan", screenshotBase64: 12345 },
          { "x-forwarded-for": `badss-${Date.now()}` },
        ),
        { params: Promise.resolve({ slug: "test-slug" }) },
      );

      const events = await readSSEStream(response);
      expect(events[events.length - 1]).toEqual({ type: "complete" });
    });
  });

  describe("code update detection (edit mode)", () => {
    it("should emit code_updated when code changes in edit mode", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as any);

      // First call returns original code, second call returns updated code
      vi.mocked(getOrCreateSession)
        .mockResolvedValueOnce({
          code: "export default function App() { return <div>Hello</div>; }",
        } as any)
        .mockResolvedValueOnce({
          code: "export default function App() { return <div>Updated</div>; }",
        } as any);

      vi.mocked(query).mockReturnValue(
        createAsyncIterable([
          {
            type: "assistant",
            message: {
              content: [{ type: "text", text: "Updated the code" }],
            },
          },
          { type: "result", subtype: "success" },
        ]) as any,
      );

      const response = await POST(
        createRequest({ content: "change it", mode: "edit" }, { "x-forwarded-for": `codeup-${Date.now()}` }),
        { params: Promise.resolve({ slug: "test-slug" }) },
      );

      const events = await readSSEStream(response);

      const codeUpdatedEvent = events.find((e) => e.type === "code_updated");
      expect(codeUpdatedEvent).toBeDefined();
    });

    it("should not emit code_updated when code is unchanged in edit mode", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as any);

      const sameCode = "export default function App() { return <div>Hello</div>; }";
      vi.mocked(getOrCreateSession).mockResolvedValue({ code: sameCode } as any);

      const response = await POST(
        createRequest({ content: "just check", mode: "edit" }, { "x-forwarded-for": `noup-${Date.now()}` }),
        { params: Promise.resolve({ slug: "test-slug" }) },
      );

      const events = await readSSEStream(response);

      const codeUpdatedEvent = events.find((e) => e.type === "code_updated");
      expect(codeUpdatedEvent).toBeUndefined();
    });

    it("should not check for code updates in plan mode", async () => {
      const response = await POST(
        createRequest({ content: "analyze", mode: "plan" }, { "x-forwarded-for": `planno-${Date.now()}` }),
        { params: Promise.resolve({ slug: "test-slug" }) },
      );

      const events = await readSSEStream(response);

      const codeUpdatedEvent = events.find((e) => e.type === "code_updated");
      expect(codeUpdatedEvent).toBeUndefined();

      // getOrCreateSession should be called only once (for initial code fetch)
      // not twice (no verify step)
      expect(getOrCreateSession).toHaveBeenCalledTimes(1);
    });
  });

  describe("query configuration", () => {
    it("should use plan-only tools for plan mode", async () => {
      const response = await POST(
        createRequest({ content: "hello", mode: "plan" }, { "x-forwarded-for": `plantools-${Date.now()}` }),
        { params: Promise.resolve({ slug: "test-slug" }) },
      );

      // Consume the stream to ensure query was called
      await readSSEStream(response);

      expect(query).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            allowedTools: [
              "mcp__codespace__read_code",
              "mcp__codespace__find_lines",
            ],
          }),
        }),
      );
    });

    it("should use all codespace tools for edit mode", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as any);

      const response = await POST(
        createRequest({ content: "hello", mode: "edit" }, { "x-forwarded-for": `edittools-${Date.now()}` }),
        { params: Promise.resolve({ slug: "test-slug" }) },
      );

      await readSSEStream(response);

      expect(query).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            allowedTools: expect.arrayContaining([
              "mcp__codespace__read_code",
              "mcp__codespace__update_code",
              "mcp__codespace__edit_code",
            ]),
          }),
        }),
      );
    });

    it("should configure query with dontAsk permission mode", async () => {
      const response = await POST(
        createRequest({ content: "hello", mode: "plan" }, { "x-forwarded-for": `perms-${Date.now()}` }),
        { params: Promise.resolve({ slug: "test-slug" }) },
      );

      await readSSEStream(response);

      expect(query).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            permissionMode: "dontAsk",
            persistSession: false,
          }),
        }),
      );
    });
  });

  describe("edge cases", () => {
    it("should use 'unknown' IP when no forwarding headers present", async () => {
      // Request without x-forwarded-for or x-real-ip
      const req = new Request("http://localhost/api/create/test-slug/vibe-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "test", mode: "plan" }),
      });

      const response = await POST(req as any, {
        params: Promise.resolve({ slug: "test-slug" }),
      });

      // Should succeed (not crash on missing headers)
      expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    });

    it("should handle empty code from codespace session", async () => {
      vi.mocked(getOrCreateSession).mockResolvedValue({ code: "" } as any);

      const response = await POST(
        createRequest({ content: "hello", mode: "plan" }, { "x-forwarded-for": `emptycode-${Date.now()}` }),
        { params: Promise.resolve({ slug: "test-slug" }) },
      );

      const events = await readSSEStream(response);
      expect(events[events.length - 1]).toEqual({ type: "complete" });
    });

    it("should handle null code from codespace session", async () => {
      vi.mocked(getOrCreateSession).mockResolvedValue({ code: null } as any);

      const response = await POST(
        createRequest({ content: "hello", mode: "plan" }, { "x-forwarded-for": `nullcode-${Date.now()}` }),
        { params: Promise.resolve({ slug: "test-slug" }) },
      );

      const events = await readSSEStream(response);
      expect(events[events.length - 1]).toEqual({ type: "complete" });
    });

    it("should handle assistant text parts with undefined text", async () => {
      vi.mocked(query).mockReturnValue(
        createAsyncIterable([
          {
            type: "assistant",
            message: {
              content: [{ type: "text" }], // text property undefined
            },
          },
          { type: "result", subtype: "success" },
        ]) as any,
      );

      const response = await POST(
        createRequest({ content: "hello", mode: "plan" }, { "x-forwarded-for": `undeftext-${Date.now()}` }),
        { params: Promise.resolve({ slug: "test-slug" }) },
      );

      const events = await readSSEStream(response);
      expect(events[events.length - 1]).toEqual({ type: "complete" });
    });
  });

  describe("maxDuration", () => {
    it("should export maxDuration of 300 seconds", async () => {
      const mod = await import("./route");
      expect(mod.maxDuration).toBe(300);
    });
  });
});
