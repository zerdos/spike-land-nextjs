import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Use vi.hoisted so mocks are available in vi.mock factories
const mocks = vi.hoisted(() => {
  const mockConnect = vi.fn();
  const mockCallTool = vi.fn();
  const mockClose = vi.fn();
  return {
    mockConnect,
    mockCallTool,
    mockClose,
    MockStreamableHTTPTransport: vi.fn(),
    MockSSETransport: vi.fn(),
  };
});

vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: class MockClient {
    connect = mocks.mockConnect;
    callTool = mocks.mockCallTool;
    close = mocks.mockClose;
  },
}));

vi.mock("@modelcontextprotocol/sdk/client/streamableHttp.js", () => ({
  StreamableHTTPClientTransport: mocks.MockStreamableHTTPTransport,
}));

vi.mock("@modelcontextprotocol/sdk/client/sse.js", () => ({
  SSEClientTransport: mocks.MockSSETransport,
}));

const { mockConnect, mockCallTool, mockClose, MockStreamableHTTPTransport, MockSSETransport } = mocks;

import {
  BridgeMindClient,
  getBridgeMindClient,
  isBridgeMindAvailable,
  resetBridgeMindClient,
} from "./bridgemind-client.js";

describe("BridgeMindClient", () => {
  let client: BridgeMindClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConnect.mockResolvedValue(undefined);
    client = new BridgeMindClient({
      baseUrl: "https://bridgemind.example.com/mcp",
      apiKey: "test-api-key",
      maxRetries: 1,
      baseDelayMs: 10,
      circuitBreakerThreshold: 3,
      circuitBreakerTimeoutMs: 100,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("isAvailable", () => {
    it("returns true when URL and API key are set", () => {
      expect(client.isAvailable()).toBe(true);
    });

    it("returns false when URL is missing", () => {
      const noUrl = new BridgeMindClient({ baseUrl: "", apiKey: "key" });
      expect(noUrl.isAvailable()).toBe(false);
    });

    it("returns false when API key is missing", () => {
      const noKey = new BridgeMindClient({ baseUrl: "http://x", apiKey: "" });
      expect(noKey.isAvailable()).toBe(false);
    });
  });

  describe("transport fallback", () => {
    it("uses StreamableHTTP transport by default", async () => {
      mockCallTool.mockResolvedValueOnce({
        content: [{ type: "text", text: "[]" }],
        isError: false,
      });

      await client.listTasks();
      expect(MockStreamableHTTPTransport).toHaveBeenCalledTimes(1);
      expect(MockSSETransport).not.toHaveBeenCalled();
    });

    it("falls back to SSE when StreamableHTTP fails", async () => {
      // First connect call (StreamableHTTP) rejects, second (SSE) succeeds
      mockConnect
        .mockRejectedValueOnce(new Error("StreamableHTTP not supported"))
        .mockResolvedValueOnce(undefined);

      mockCallTool.mockResolvedValueOnce({
        content: [{ type: "text", text: "[]" }],
        isError: false,
      });

      await client.listTasks();
      expect(MockStreamableHTTPTransport).toHaveBeenCalledTimes(1);
      expect(MockSSETransport).toHaveBeenCalledTimes(1);
    });
  });

  describe("listTasks", () => {
    it("calls list_tasks tool with parameters", async () => {
      const tasks = [{ id: "1", title: "Task 1", status: "ready" }];
      mockCallTool.mockResolvedValueOnce({
        content: [{ type: "text", text: JSON.stringify(tasks) }],
        isError: false,
      });

      const result = await client.listTasks({ status: "ready", limit: 10 });
      expect(result.data).toEqual(tasks);
      expect(result.error).toBeNull();
      expect(mockCallTool).toHaveBeenCalledWith({
        name: "list_tasks",
        arguments: { status: "ready", sprint_id: undefined, limit: 10 },
      });
    });

    it("uses default limit of 50", async () => {
      mockCallTool.mockResolvedValueOnce({
        content: [{ type: "text", text: "[]" }],
        isError: false,
      });

      await client.listTasks();
      expect(mockCallTool).toHaveBeenCalledWith(
        expect.objectContaining({
          arguments: expect.objectContaining({ limit: 50 }),
        }),
      );
    });
  });

  describe("createTask", () => {
    it("creates a task with required fields", async () => {
      const task = { id: "new-1", title: "New Task", status: "backlog" };
      mockCallTool.mockResolvedValueOnce({
        content: [{ type: "text", text: JSON.stringify(task) }],
        isError: false,
      });

      const result = await client.createTask({
        title: "New Task",
        description: "A new task",
      });
      expect(result.data).toEqual(task);
      expect(mockCallTool).toHaveBeenCalledWith({
        name: "create_task",
        arguments: {
          title: "New Task",
          description: "A new task",
          priority: "medium",
          labels: [],
          sprint_id: undefined,
        },
      });
    });
  });

  describe("updateTask", () => {
    it("updates a task", async () => {
      const task = { id: "1", title: "Updated", status: "done" };
      mockCallTool.mockResolvedValueOnce({
        content: [{ type: "text", text: JSON.stringify(task) }],
        isError: false,
      });

      const result = await client.updateTask("1", { status: "done" });
      expect(result.data).toEqual(task);
      expect(mockCallTool).toHaveBeenCalledWith({
        name: "update_task",
        arguments: { task_id: "1", status: "done" },
      });
    });
  });

  describe("getKnowledge", () => {
    it("searches knowledge base", async () => {
      const entries = [{ id: "k1", title: "Architecture", content: "...", tags: ["arch"] }];
      mockCallTool.mockResolvedValueOnce({
        content: [{ type: "text", text: JSON.stringify(entries) }],
        isError: false,
      });

      const result = await client.getKnowledge("architecture");
      expect(result.data).toEqual(entries);
    });
  });

  describe("addKnowledge", () => {
    it("adds a knowledge entry", async () => {
      const entry = { id: "k2", title: "Patterns", content: "...", tags: ["dev"] };
      mockCallTool.mockResolvedValueOnce({
        content: [{ type: "text", text: JSON.stringify(entry) }],
        isError: false,
      });

      const result = await client.addKnowledge({
        title: "Patterns",
        content: "Design patterns",
        tags: ["dev"],
      });
      expect(result.data).toEqual(entry);
    });
  });

  describe("listSprints", () => {
    it("returns sprints", async () => {
      const sprints = [{ id: "s1", name: "Sprint 1", status: "active" }];
      mockCallTool.mockResolvedValueOnce({
        content: [{ type: "text", text: JSON.stringify(sprints) }],
        isError: false,
      });

      const result = await client.listSprints();
      expect(result.data).toEqual(sprints);
    });
  });

  describe("extractData", () => {
    it("returns null when content has no text blocks", async () => {
      mockCallTool.mockResolvedValueOnce({
        content: [{ type: "image", data: "..." }],
        isError: false,
      });

      const result = await client.listTasks();
      expect(result.data).toBeNull();
    });

    it("returns raw text when JSON parsing fails", async () => {
      mockCallTool.mockResolvedValueOnce({
        content: [{ type: "text", text: "not json" }],
        isError: false,
      });

      const result = await client.listTasks();
      expect(result.data).toBe("not json");
    });
  });

  describe("retry with exponential backoff", () => {
    it("retries on connection error and succeeds", async () => {
      // First callTool fails (connection error), causing reconnect on retry
      mockCallTool
        .mockRejectedValueOnce(new Error("Connection lost"))
        .mockResolvedValueOnce({
          content: [{ type: "text", text: '{"ok":true}' }],
          isError: false,
        });

      const result = await client.listTasks();
      expect(result.error).toBeNull();
      expect(result.data).toEqual({ ok: true });
    });

    it("retries when tool returns isError", async () => {
      mockCallTool
        .mockResolvedValueOnce({
          content: [{ type: "text", text: "Server error" }],
          isError: true,
        })
        .mockResolvedValueOnce({
          content: [{ type: "text", text: '{"ok":true}' }],
          isError: false,
        });

      const result = await client.listTasks();
      expect(result.error).toBeNull();
      expect(result.data).toEqual({ ok: true });
    });

    it("returns error after all retries exhausted", async () => {
      mockCallTool.mockRejectedValue(new Error("Persistent failure"));

      const result = await client.listTasks();
      expect(result.error).toContain("failed after 2 attempts");
    });

    it("retries when isError has no text content", async () => {
      mockCallTool
        .mockResolvedValueOnce({
          content: [{ type: "image", data: "..." }],
          isError: true,
        })
        .mockResolvedValueOnce({
          content: [{ type: "text", text: '{"ok":true}' }],
          isError: false,
        });

      const result = await client.listTasks();
      expect(result.error).toBeNull();
    });
  });

  describe("circuit breaker", () => {
    it("starts in closed state", () => {
      expect(client.getCircuitBreakerState().status).toBe("closed");
    });

    it("opens after threshold failures", async () => {
      mockCallTool.mockRejectedValue(new Error("Connection error"));

      await client.listTasks();
      expect(client.getCircuitBreakerState().status).toBe("closed");
      expect(client.getCircuitBreakerState().failures).toBe(1);

      await client.listTasks();
      expect(client.getCircuitBreakerState().failures).toBe(2);

      await client.listTasks();
      expect(client.getCircuitBreakerState().status).toBe("open");
      expect(client.getCircuitBreakerState().failures).toBe(3);
    });

    it("rejects immediately when open", async () => {
      mockCallTool.mockRejectedValue(new Error("Connection error"));
      await client.listTasks();
      await client.listTasks();
      await client.listTasks();
      expect(client.getCircuitBreakerState().status).toBe("open");

      mockCallTool.mockClear();
      const result = await client.listTasks();
      expect(result.error).toContain("Circuit breaker is open");
      expect(mockCallTool).not.toHaveBeenCalled();
    });

    it("transitions to half-open after timeout", async () => {
      mockCallTool.mockRejectedValue(new Error("Connection error"));
      await client.listTasks();
      await client.listTasks();
      await client.listTasks();

      // Wait for circuit breaker timeout (100ms in test config)
      await new Promise((r) => setTimeout(r, 150));

      // Next call should go through (half-open)
      mockCallTool.mockResolvedValueOnce({
        content: [{ type: "text", text: '{"ok":true}' }],
        isError: false,
      });
      const result = await client.listTasks();
      expect(result.error).toBeNull();
      expect(client.getCircuitBreakerState().status).toBe("closed");
    });

    it("resets circuit breaker on manual reset", async () => {
      mockCallTool.mockRejectedValue(new Error("Connection error"));
      await client.listTasks();
      await client.listTasks();
      await client.listTasks();

      client.resetCircuitBreaker();
      expect(client.getCircuitBreakerState().status).toBe("closed");
      expect(client.getCircuitBreakerState().failures).toBe(0);
    });

    it("closes on successful request after half-open", async () => {
      mockCallTool.mockRejectedValue(new Error("Connection error"));
      await client.listTasks();
      await client.listTasks();
      await client.listTasks();

      await new Promise((r) => setTimeout(r, 150));

      mockCallTool.mockResolvedValueOnce({
        content: [{ type: "text", text: '{"ok":true}' }],
        isError: false,
      });
      await client.listTasks();

      expect(client.getCircuitBreakerState().status).toBe("closed");
      expect(client.getCircuitBreakerState().failures).toBe(0);
    });
  });

  describe("connection management", () => {
    it("reuses existing connection", async () => {
      mockCallTool
        .mockResolvedValueOnce({
          content: [{ type: "text", text: "[]" }],
          isError: false,
        })
        .mockResolvedValueOnce({
          content: [{ type: "text", text: "[]" }],
          isError: false,
        });

      await client.listTasks();
      await client.listTasks();

      // Only one transport created despite two calls
      expect(MockStreamableHTTPTransport).toHaveBeenCalledTimes(1);
      expect(mockConnect).toHaveBeenCalledTimes(1);
    });

    it("reconnects after disconnect", async () => {
      mockCallTool.mockResolvedValue({
        content: [{ type: "text", text: "[]" }],
        isError: false,
      });

      await client.listTasks();
      await client.disconnect();
      await client.listTasks();

      expect(mockConnect).toHaveBeenCalledTimes(2);
    });

    it("disconnect handles close errors gracefully", async () => {
      mockCallTool.mockResolvedValueOnce({
        content: [{ type: "text", text: "[]" }],
        isError: false,
      });

      await client.listTasks();
      mockClose.mockRejectedValueOnce(new Error("Close failed"));
      await client.disconnect(); // Should not throw
    });

    it("disconnect is a no-op when not connected", async () => {
      await client.disconnect(); // Should not throw
      expect(mockClose).not.toHaveBeenCalled();
    });

    it("concurrent calls share the same connection attempt", async () => {
      // Make connect take time to resolve
      let resolveConnect: () => void;
      mockConnect.mockImplementationOnce(() => new Promise<void>((r) => { resolveConnect = r; }));
      mockCallTool.mockResolvedValue({
        content: [{ type: "text", text: "[]" }],
        isError: false,
      });

      const p1 = client.listTasks();
      const p2 = client.listTasks();

      // Resolve the connect
      resolveConnect!();

      await Promise.all([p1, p2]);
      expect(mockConnect).toHaveBeenCalledTimes(1);
    });

    it("throws when connection attempt fails for waiting calls", async () => {
      // Both connect calls fail (StreamableHTTP and SSE)
      mockConnect.mockRejectedValue(new Error("All transports failed"));

      const result = await client.listTasks();
      expect(result.error).toContain("failed after");
    });
  });
});

describe("isBridgeMindAvailable", () => {
  beforeEach(() => {
    vi.stubEnv("BRIDGEMIND_MCP_URL", "");
    vi.stubEnv("BRIDGEMIND_API_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns false when env vars are not set", () => {
    expect(isBridgeMindAvailable()).toBe(false);
  });

  it("returns true when both env vars are set", () => {
    vi.stubEnv("BRIDGEMIND_MCP_URL", "https://example.com");
    vi.stubEnv("BRIDGEMIND_API_KEY", "key");
    expect(isBridgeMindAvailable()).toBe(true);
  });

  it("returns false when only URL is set", () => {
    vi.stubEnv("BRIDGEMIND_MCP_URL", "https://example.com");
    expect(isBridgeMindAvailable()).toBe(false);
  });

  it("returns false when only key is set", () => {
    vi.stubEnv("BRIDGEMIND_API_KEY", "key");
    expect(isBridgeMindAvailable()).toBe(false);
  });
});

describe("singleton", () => {
  afterEach(() => {
    resetBridgeMindClient();
    vi.unstubAllEnvs();
  });

  it("getBridgeMindClient returns the same instance", () => {
    vi.stubEnv("BRIDGEMIND_MCP_URL", "https://example.com");
    vi.stubEnv("BRIDGEMIND_API_KEY", "key");

    const a = getBridgeMindClient();
    const b = getBridgeMindClient();
    expect(a).toBe(b);
  });

  it("resetBridgeMindClient creates fresh instance next call", () => {
    vi.stubEnv("BRIDGEMIND_MCP_URL", "https://example.com");
    vi.stubEnv("BRIDGEMIND_API_KEY", "key");

    const a = getBridgeMindClient();
    resetBridgeMindClient();
    const b = getBridgeMindClient();
    expect(a).not.toBe(b);
  });
});
