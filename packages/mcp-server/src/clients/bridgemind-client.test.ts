import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BridgeMindClient, isBridgeMindAvailable } from "./bridgemind-client.js";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function jsonRpcSuccess<T>(result: T, id: number = 1) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id, result }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function jsonRpcError(code: number, message: string, id: number = 1) {
  return new Response(
    JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

describe("BridgeMindClient", () => {
  let client: BridgeMindClient;

  beforeEach(() => {
    vi.clearAllMocks();
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

  describe("listTools", () => {
    it("returns tools from BridgeMind MCP server", async () => {
      const tools = [
        { name: "list_tasks", description: "List tasks", inputSchema: { type: "object" } },
        { name: "create_task", description: "Create task", inputSchema: { type: "object" } },
      ];

      mockFetch.mockResolvedValueOnce(jsonRpcSuccess({ tools }));

      const result = await client.listTools();
      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].name).toBe("list_tasks");
    });

    it("returns error on HTTP failure", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response("Server Error", { status: 500 })),
      );

      const result = await client.listTools();
      expect(result.error).toContain("failed after");
      expect(result.data).toBeNull();
    });
  });

  describe("callTool", () => {
    it("sends JSON-RPC request and returns result", async () => {
      const taskData = { id: "task-1", title: "Test Task" };
      mockFetch.mockResolvedValueOnce(jsonRpcSuccess(taskData));

      const result = await client.callTool("list_tasks", { limit: 10 });
      expect(result.error).toBeNull();
      expect(result.data).toEqual(taskData);

      // Verify request body
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.jsonrpc).toBe("2.0");
      expect(body.method).toBe("tools/call");
      expect(body.params).toEqual({ name: "list_tasks", arguments: { limit: 10 } });
    });

    it("sends Authorization header", async () => {
      mockFetch.mockResolvedValueOnce(jsonRpcSuccess({}));
      await client.callTool("test", {});

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers.Authorization).toBe("Bearer test-api-key");
    });

    it("returns error on JSON-RPC error response", async () => {
      // Return fresh Response for each retry
      mockFetch.mockImplementation(() => Promise.resolve(jsonRpcError(-32000, "Task not found")));

      const result = await client.callTool("get_task", { id: "x" });
      expect(result.error).toContain("Task not found");
    });

    it("does not retry client errors (invalid request/method)", async () => {
      mockFetch.mockImplementation(() => Promise.resolve(jsonRpcError(-32600, "Invalid Request")));

      const result = await client.callTool("invalid", {});
      expect(result.error).toContain("Invalid Request");
      // Should only call once (no retry for client errors)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("listTasks", () => {
    it("calls list_tasks tool with parameters", async () => {
      const tasks = [{ id: "1", title: "Task 1", status: "ready" }];
      mockFetch.mockResolvedValueOnce(jsonRpcSuccess(tasks));

      const result = await client.listTasks({ status: "ready", limit: 10 });
      expect(result.data).toEqual(tasks);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.params.arguments.status).toBe("ready");
      expect(body.params.arguments.limit).toBe(10);
    });
  });

  describe("createTask", () => {
    it("creates a task with required fields", async () => {
      const task = { id: "new-1", title: "New Task", status: "backlog" };
      mockFetch.mockResolvedValueOnce(jsonRpcSuccess(task));

      const result = await client.createTask({
        title: "New Task",
        description: "A new task",
      });
      expect(result.data).toEqual(task);
    });
  });

  describe("updateTask", () => {
    it("updates a task", async () => {
      const task = { id: "1", title: "Updated", status: "done" };
      mockFetch.mockResolvedValueOnce(jsonRpcSuccess(task));

      const result = await client.updateTask("1", { status: "done" });
      expect(result.data).toEqual(task);
    });
  });

  describe("getKnowledge", () => {
    it("searches knowledge base", async () => {
      const entries = [{ id: "k1", title: "Architecture", content: "...", tags: ["arch"] }];
      mockFetch.mockResolvedValueOnce(jsonRpcSuccess(entries));

      const result = await client.getKnowledge("architecture");
      expect(result.data).toEqual(entries);
    });
  });

  describe("addKnowledge", () => {
    it("adds a knowledge entry", async () => {
      const entry = { id: "k2", title: "Patterns", content: "...", tags: ["dev"] };
      mockFetch.mockResolvedValueOnce(jsonRpcSuccess(entry));

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
      mockFetch.mockResolvedValueOnce(jsonRpcSuccess(sprints));

      const result = await client.listSprints();
      expect(result.data).toEqual(sprints);
    });
  });

  describe("retry with exponential backoff", () => {
    it("retries on HTTP error and succeeds", async () => {
      mockFetch
        .mockResolvedValueOnce(new Response("Error", { status: 503 }))
        .mockResolvedValueOnce(jsonRpcSuccess({ ok: true }));

      const result = await client.callTool("test", {});
      expect(result.error).toBeNull();
      expect(result.data).toEqual({ ok: true });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("retries on network error and succeeds", async () => {
      mockFetch
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce(jsonRpcSuccess({ ok: true }));

      const result = await client.callTool("test", {});
      expect(result.error).toBeNull();
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("returns error after all retries exhausted", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response("Error", { status: 500 })),
      );

      const result = await client.callTool("test", {});
      expect(result.error).toContain("failed after 2 attempts");
      expect(mockFetch).toHaveBeenCalledTimes(2); // 1 initial + 1 retry
    });
  });

  describe("circuit breaker", () => {
    it("starts in closed state", () => {
      expect(client.getCircuitBreakerState().status).toBe("closed");
    });

    it("opens after threshold failures", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response("Error", { status: 500 })),
      );

      // Exhaust retries 3 times to trigger circuit breaker
      await client.callTool("test", {});
      expect(client.getCircuitBreakerState().status).toBe("closed");
      expect(client.getCircuitBreakerState().failures).toBe(1);

      await client.callTool("test", {});
      expect(client.getCircuitBreakerState().failures).toBe(2);

      await client.callTool("test", {});
      expect(client.getCircuitBreakerState().status).toBe("open");
      expect(client.getCircuitBreakerState().failures).toBe(3);
    });

    it("rejects immediately when open", async () => {
      // Force circuit open
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response("Error", { status: 500 })),
      );
      await client.callTool("t", {});
      await client.callTool("t", {});
      await client.callTool("t", {});
      expect(client.getCircuitBreakerState().status).toBe("open");

      mockFetch.mockClear();
      const result = await client.callTool("test", {});
      expect(result.error).toContain("Circuit breaker is open");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("transitions to half-open after timeout", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response("Error", { status: 500 })),
      );
      await client.callTool("t", {});
      await client.callTool("t", {});
      await client.callTool("t", {});

      // Wait for circuit breaker timeout (100ms in test config)
      await new Promise((r) => setTimeout(r, 150));

      // Next call should go through (half-open)
      mockFetch.mockResolvedValueOnce(jsonRpcSuccess({ ok: true }));
      const result = await client.callTool("test", {});
      expect(result.error).toBeNull();
      expect(client.getCircuitBreakerState().status).toBe("closed");
    });

    it("resets circuit breaker on manual reset", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response("Error", { status: 500 })),
      );
      await client.callTool("t", {});
      await client.callTool("t", {});
      await client.callTool("t", {});

      client.resetCircuitBreaker();
      expect(client.getCircuitBreakerState().status).toBe("closed");
      expect(client.getCircuitBreakerState().failures).toBe(0);
    });

    it("closes on successful request after half-open", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response("Error", { status: 500 })),
      );
      await client.callTool("t", {});
      await client.callTool("t", {});
      await client.callTool("t", {});

      await new Promise((r) => setTimeout(r, 150));

      mockFetch.mockResolvedValueOnce(jsonRpcSuccess({ ok: true }));
      await client.callTool("test", {});

      expect(client.getCircuitBreakerState().status).toBe("closed");
      expect(client.getCircuitBreakerState().failures).toBe(0);
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
