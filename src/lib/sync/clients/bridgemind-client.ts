/**
 * BridgeMind MCP Client
 *
 * HTTP/JSON-RPC client for communicating with BridgeMind's MCP server.
 * Provides tool discovery, proxied tool execution, and resilience patterns
 * (retry with exponential backoff, circuit breaker).
 */

export interface BridgeMindTask {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee?: string;
  labels?: string[];
  createdAt: string;
  updatedAt: string;
  sprintId?: string;
  metadata?: Record<string, unknown>;
}

export interface BridgeMindSprint {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  goals?: string[];
}

export interface BridgeMindKnowledge {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse<T = unknown> {
  jsonrpc: "2.0";
  id: string | number;
  result?: T;
  error?: { code: number; message: string; data?: unknown };
}

interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface CircuitBreakerState {
  status: "closed" | "open" | "half-open";
  failures: number;
  lastFailure: number | null;
  openedAt: number | null;
}

const DEFAULT_CIRCUIT_BREAKER_THRESHOLD = 3;
const DEFAULT_CIRCUIT_BREAKER_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 1000;

export class BridgeMindClient {
  private baseUrl: string;
  private apiKey: string;
  private circuitBreaker: CircuitBreakerState;
  private circuitBreakerThreshold: number;
  private circuitBreakerTimeoutMs: number;
  private maxRetries: number;
  private baseDelayMs: number;
  private requestId: number;

  constructor(options?: {
    baseUrl?: string;
    apiKey?: string;
    circuitBreakerThreshold?: number;
    circuitBreakerTimeoutMs?: number;
    maxRetries?: number;
    baseDelayMs?: number;
  }) {
    this.baseUrl = options?.baseUrl ?? process.env["BRIDGEMIND_MCP_URL"] ?? "";
    this.apiKey = options?.apiKey ?? process.env["BRIDGEMIND_API_KEY"] ?? "";
    this.circuitBreakerThreshold = options?.circuitBreakerThreshold ?? DEFAULT_CIRCUIT_BREAKER_THRESHOLD;
    this.circuitBreakerTimeoutMs = options?.circuitBreakerTimeoutMs ?? DEFAULT_CIRCUIT_BREAKER_TIMEOUT_MS;
    this.maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.baseDelayMs = options?.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
    this.requestId = 0;
    this.circuitBreaker = {
      status: "closed",
      failures: 0,
      lastFailure: null,
      openedAt: null,
    };
  }

  /**
   * Check if BridgeMind is configured
   */
  isAvailable(): boolean {
    return !!(this.baseUrl && this.apiKey);
  }

  /**
   * Get current circuit breaker state (for monitoring)
   */
  getCircuitBreakerState(): CircuitBreakerState {
    return { ...this.circuitBreaker };
  }

  /**
   * Reset circuit breaker (for manual recovery)
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker = {
      status: "closed",
      failures: 0,
      lastFailure: null,
      openedAt: null,
    };
  }

  /**
   * Discover available tools from BridgeMind MCP server
   */
  async listTools(): Promise<{ data: McpToolDefinition[] | null; error: string | null }> {
    const result = await this.jsonRpcRequest<{ tools: McpToolDefinition[] }>("tools/list", {});

    if (result.error) {
      return { data: null, error: result.error };
    }

    return { data: result.data?.tools ?? [], error: null };
  }

  /**
   * Execute a tool on BridgeMind MCP server
   */
  async callTool(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<{ data: unknown; error: string | null }> {
    return this.jsonRpcRequest("tools/call", { name: toolName, arguments: args });
  }

  /**
   * List tasks from BridgeMind board
   */
  async listTasks(options?: {
    status?: string;
    sprintId?: string;
    limit?: number;
  }): Promise<{ data: BridgeMindTask[] | null; error: string | null }> {
    return this.callTool("list_tasks", {
      status: options?.status,
      sprint_id: options?.sprintId,
      limit: options?.limit ?? 50,
    }) as Promise<{ data: BridgeMindTask[] | null; error: string | null }>;
  }

  /**
   * Create a task on BridgeMind board
   */
  async createTask(task: {
    title: string;
    description: string;
    priority?: string;
    labels?: string[];
    sprintId?: string;
  }): Promise<{ data: BridgeMindTask | null; error: string | null }> {
    return this.callTool("create_task", {
      title: task.title,
      description: task.description,
      priority: task.priority ?? "medium",
      labels: task.labels ?? [],
      sprint_id: task.sprintId,
    }) as Promise<{ data: BridgeMindTask | null; error: string | null }>;
  }

  /**
   * Update a task on BridgeMind board
   */
  async updateTask(
    taskId: string,
    updates: Record<string, unknown>,
  ): Promise<{ data: BridgeMindTask | null; error: string | null }> {
    return this.callTool("update_task", {
      task_id: taskId,
      ...updates,
    }) as Promise<{ data: BridgeMindTask | null; error: string | null }>;
  }

  /**
   * Get knowledge base entries
   */
  async getKnowledge(query: string): Promise<{ data: BridgeMindKnowledge[] | null; error: string | null }> {
    return this.callTool("get_knowledge", { query }) as Promise<{
      data: BridgeMindKnowledge[] | null;
      error: string | null;
    }>;
  }

  /**
   * Add knowledge base entry
   */
  async addKnowledge(entry: {
    title: string;
    content: string;
    tags?: string[];
  }): Promise<{ data: BridgeMindKnowledge | null; error: string | null }> {
    return this.callTool("add_knowledge", {
      title: entry.title,
      content: entry.content,
      tags: entry.tags ?? [],
    }) as Promise<{ data: BridgeMindKnowledge | null; error: string | null }>;
  }

  /**
   * List sprints
   */
  async listSprints(): Promise<{ data: BridgeMindSprint[] | null; error: string | null }> {
    return this.callTool("list_sprints", {}) as Promise<{
      data: BridgeMindSprint[] | null;
      error: string | null;
    }>;
  }

  // ========================================
  // Internal: JSON-RPC + Resilience
  // ========================================

  private async jsonRpcRequest<T>(
    method: string,
    params: Record<string, unknown>,
  ): Promise<{ data: T | null; error: string | null }> {
    // Circuit breaker check
    if (this.circuitBreaker.status === "open") {
      const now = Date.now();
      const elapsed = now - (this.circuitBreaker.openedAt ?? now);
      if (elapsed < this.circuitBreakerTimeoutMs) {
        return {
          data: null,
          error: `Circuit breaker is open. Retry after ${Math.ceil((this.circuitBreakerTimeoutMs - elapsed) / 1000)}s`,
        };
      }
      // Transition to half-open
      this.circuitBreaker.status = "half-open";
    }

    // Retry loop with exponential backoff
    let lastError = "";
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = this.baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const requestId = ++this.requestId;
      const body: JsonRpcRequest = {
        jsonrpc: "2.0",
        id: requestId,
        method,
        params,
      };

      try {
        const response = await fetch(this.baseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          lastError = `HTTP ${response.status}: ${response.statusText}`;
          continue;
        }

        const json = (await response.json()) as JsonRpcResponse<T>;

        if (json.error) {
          lastError = `JSON-RPC error ${json.error.code}: ${json.error.message}`;
          // Don't retry client errors (4xx equivalent: -32600 to -32603)
          if (json.error.code <= -32600 && json.error.code >= -32603) {
            this.recordSuccess();
            return { data: null, error: lastError };
          }
          continue;
        }

        this.recordSuccess();
        return { data: json.result ?? null, error: null };
      } catch (error) {
        lastError = error instanceof Error ? error.message : "Unknown error";
        continue;
      }
    }

    // All retries exhausted
    this.recordFailure();
    return { data: null, error: `BridgeMind request failed after ${this.maxRetries + 1} attempts: ${lastError}` };
  }

  private recordSuccess(): void {
    this.circuitBreaker = {
      status: "closed",
      failures: 0,
      lastFailure: null,
      openedAt: null,
    };
  }

  private recordFailure(): void {
    const failures = this.circuitBreaker.failures + 1;
    const now = Date.now();

    if (failures >= this.circuitBreakerThreshold) {
      this.circuitBreaker = {
        status: "open",
        failures,
        lastFailure: now,
        openedAt: now,
      };
    } else {
      this.circuitBreaker = {
        ...this.circuitBreaker,
        failures,
        lastFailure: now,
      };
    }
  }
}

/**
 * Check if BridgeMind MCP is configured
 */
export function isBridgeMindAvailable(): boolean {
  return !!(process.env["BRIDGEMIND_MCP_URL"] && process.env["BRIDGEMIND_API_KEY"]);
}
