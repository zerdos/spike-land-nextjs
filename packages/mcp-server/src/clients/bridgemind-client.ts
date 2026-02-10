/**
 * BridgeMind MCP Client
 *
 * Uses the MCP SDK's Client + StreamableHTTPClientTransport (with SSE fallback)
 * to communicate with BridgeMind's MCP server. Provides tool discovery, proxied
 * tool execution, and resilience patterns (retry with exponential backoff,
 * circuit breaker).
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

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
const CONNECT_TIMEOUT_MS = 10_000;

export class BridgeMindClient {
  private baseUrl: string;
  private apiKey: string;
  private circuitBreaker: CircuitBreakerState;
  private circuitBreakerThreshold: number;
  private circuitBreakerTimeoutMs: number;
  private maxRetries: number;
  private baseDelayMs: number;
  private mcpClient: Client | null = null;
  private connecting: Promise<void> | null = null;
  private connected = false;

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
    this.circuitBreaker = {
      status: "closed",
      failures: 0,
      lastFailure: null,
      openedAt: null,
    };
  }

  isAvailable(): boolean {
    return !!(this.baseUrl && this.apiKey);
  }

  getCircuitBreakerState(): CircuitBreakerState {
    return { ...this.circuitBreaker };
  }

  resetCircuitBreaker(): void {
    this.circuitBreaker = {
      status: "closed",
      failures: 0,
      lastFailure: null,
      openedAt: null,
    };
  }

  async disconnect(): Promise<void> {
    if (this.mcpClient) {
      try {
        await this.mcpClient.close();
      } catch {
        // Ignore close errors
      }
      this.mcpClient = null;
      this.connected = false;
      this.connecting = null;
    }
  }

  async listTasks(options?: {
    status?: string;
    sprintId?: string;
    limit?: number;
  }): Promise<{ data: BridgeMindTask[] | null; error: string | null }> {
    return this.callToolWrapped<BridgeMindTask[]>("list_tasks", {
      status: options?.status,
      sprint_id: options?.sprintId,
      limit: options?.limit ?? 50,
    });
  }

  async createTask(task: {
    title: string;
    description: string;
    priority?: string;
    labels?: string[];
    sprintId?: string;
  }): Promise<{ data: BridgeMindTask | null; error: string | null }> {
    return this.callToolWrapped<BridgeMindTask>("create_task", {
      title: task.title,
      description: task.description,
      priority: task.priority ?? "medium",
      labels: task.labels ?? [],
      sprint_id: task.sprintId,
    });
  }

  async updateTask(
    taskId: string,
    updates: Record<string, unknown>,
  ): Promise<{ data: BridgeMindTask | null; error: string | null }> {
    return this.callToolWrapped<BridgeMindTask>("update_task", {
      task_id: taskId,
      ...updates,
    });
  }

  async getKnowledge(query: string): Promise<{ data: BridgeMindKnowledge[] | null; error: string | null }> {
    return this.callToolWrapped<BridgeMindKnowledge[]>("get_knowledge", { query });
  }

  async addKnowledge(entry: {
    title: string;
    content: string;
    tags?: string[];
  }): Promise<{ data: BridgeMindKnowledge | null; error: string | null }> {
    return this.callToolWrapped<BridgeMindKnowledge>("add_knowledge", {
      title: entry.title,
      content: entry.content,
      tags: entry.tags ?? [],
    });
  }

  async listSprints(): Promise<{ data: BridgeMindSprint[] | null; error: string | null }> {
    return this.callToolWrapped<BridgeMindSprint[]>("list_sprints", {});
  }

  // ========================================
  // Internal: MCP SDK Connection + Resilience
  // ========================================

  private async ensureConnected(): Promise<Client> {
    if (this.mcpClient && this.connected) {
      return this.mcpClient;
    }

    // If another call is already connecting, wait for it
    if (this.connecting) {
      await this.connecting;
      if (this.mcpClient && this.connected) {
        return this.mcpClient;
      }
      throw new Error("Connection failed");
    }

    this.connecting = this.doConnect();
    try {
      await this.connecting;
    } finally {
      this.connecting = null;
    }

    if (!this.mcpClient || !this.connected) {
      throw new Error("Connection failed");
    }
    return this.mcpClient;
  }

  private async doConnect(): Promise<void> {
    const url = new URL(this.baseUrl);
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
    };

    const client = new Client(
      { name: "spike-land-bolt", version: "1.0.0" },
      { capabilities: {} },
    );

    // Try StreamableHTTP first, fall back to SSE
    let transport;
    try {
      transport = new StreamableHTTPClientTransport(url, {
        requestInit: { headers },
      });
      await this.connectWithTimeout(client, transport);
    } catch {
      // StreamableHTTP failed, try SSE
      transport = new SSEClientTransport(url, {
        requestInit: { headers },
        eventSourceInit: {
          fetch: (input: string | URL | Request, init?: RequestInit) => {
            return fetch(input, {
              ...init,
              headers: { ...(init?.headers as Record<string, string>), ...headers },
            });
          },
        },
      });
      await this.connectWithTimeout(client, transport);
    }

    this.mcpClient = client;
    this.connected = true;
  }

  private connectWithTimeout(client: Client, transport: { close?: () => Promise<void> } & Parameters<Client["connect"]>[0]): Promise<void> {
    return Promise.race([
      client.connect(transport),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Connection timeout")), CONNECT_TIMEOUT_MS),
      ),
    ]);
  }

  private async callToolWrapped<T>(
    toolName: string,
    args: Record<string, unknown>,
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
      this.circuitBreaker.status = "half-open";
    }

    // Retry loop with exponential backoff
    let lastError = "";
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = this.baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      try {
        const client = await this.ensureConnected();
        const result = await client.callTool({ name: toolName, arguments: args });

        const content = result.content as Array<{ type: string; text?: string }>;

        if (result.isError) {
          const errorText = content
            .filter((c): c is { type: "text"; text: string } => c.type === "text")
            .map((c) => c.text)
            .join("\n");
          lastError = errorText || "Tool returned an error";
          continue;
        }

        // Extract data from MCP content blocks
        const data = this.extractData<T>(content);
        this.recordSuccess();
        return { data, error: null };
      } catch (error) {
        lastError = error instanceof Error ? error.message : "Unknown error";
        // Reset connection on transport errors so next attempt reconnects
        this.mcpClient = null;
        this.connected = false;
        continue;
      }
    }

    // All retries exhausted
    this.recordFailure();
    return { data: null, error: `BridgeMind request failed after ${this.maxRetries + 1} attempts: ${lastError}` };
  }

  private extractData<T>(content: Array<{ type: string; text?: string }>): T | null {
    const textParts = content
      .filter((c): c is { type: "text"; text: string } => c.type === "text" && !!c.text)
      .map((c) => c.text);

    if (textParts.length === 0) return null;

    const joined = textParts.join("\n");
    try {
      return JSON.parse(joined) as T;
    } catch {
      return joined as unknown as T;
    }
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

// ========================================
// Singleton
// ========================================

let singletonClient: BridgeMindClient | null = null;

export function getBridgeMindClient(): BridgeMindClient {
  if (!singletonClient) {
    singletonClient = new BridgeMindClient();
  }
  return singletonClient;
}

/** Reset singleton (for testing) */
export function resetBridgeMindClient(): void {
  if (singletonClient) {
    singletonClient.disconnect().catch(() => {});
    singletonClient = null;
  }
}
