import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock prisma
const mockPrisma = {
  registeredTool: {
    count: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
  },
  subscription: {
    findUnique: vi.fn(),
  },
  vaultSecret: {
    findMany: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}));

// Mock crypto
const mockDecryptSecret = vi.fn();
vi.mock("../crypto/vault", () => ({
  decryptSecret: (...args: unknown[]) => mockDecryptSecret(...args),
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import type { ToolRegistry } from "../tool-registry";
import {
  registerToolFactoryTools,
  validateUrl,
  validateTemplate,
  resolveTemplate,
} from "./tool-factory";

function createMockRegistry(): ToolRegistry & {
  handlers: Map<string, (...args: unknown[]) => unknown>;
} {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();
  const registry = {
    register: vi.fn((def: { name: string; handler: (...args: unknown[]) => unknown }) => {
      handlers.set(def.name, def.handler);
    }),
    handlers,
  };
  return registry as unknown as ToolRegistry & {
    handlers: Map<string, (...args: unknown[]) => unknown>;
  };
}

describe("tool factory tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createMockRegistry();
    registerToolFactoryTools(registry, userId);
  });

  it("should register 5 tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(5);
    expect(registry.handlers.has("register_tool")).toBe(true);
    expect(registry.handlers.has("test_tool")).toBe(true);
    expect(registry.handlers.has("publish_tool")).toBe(true);
    expect(registry.handlers.has("list_registered_tools")).toBe(true);
    expect(registry.handlers.has("disable_tool")).toBe(true);
  });

  // ============================================================
  // Pure function tests
  // ============================================================

  describe("validateUrl", () => {
    it("should return null for valid HTTPS URLs", () => {
      expect(validateUrl("https://api.example.com/v1/data")).toBeNull();
      expect(validateUrl("https://hooks.slack.com/services/T00/B00/xxx")).toBeNull();
    });

    it("should reject non-HTTPS URLs", () => {
      expect(validateUrl("http://api.example.com")).toBe("URL must use HTTPS");
      expect(validateUrl("ftp://files.example.com")).toBe("URL must use HTTPS");
      expect(validateUrl("ws://stream.example.com")).toBe("URL must use HTTPS");
    });

    it("should reject localhost URLs (SSRF prevention)", () => {
      expect(validateUrl("https://localhost/api")).toBe(
        "URL must not target private/internal addresses",
      );
      expect(validateUrl("https://localhost:8080/api")).toBe(
        "URL must not target private/internal addresses",
      );
    });

    it("should reject 127.x.x.x addresses", () => {
      expect(validateUrl("https://127.0.0.1/api")).toBe(
        "URL must not target private/internal addresses",
      );
      expect(validateUrl("https://127.255.255.255/api")).toBe(
        "URL must not target private/internal addresses",
      );
    });

    it("should reject 0.x.x.x addresses", () => {
      expect(validateUrl("https://0.0.0.0/api")).toBe(
        "URL must not target private/internal addresses",
      );
    });

    it("should reject 10.x.x.x private addresses", () => {
      expect(validateUrl("https://10.0.0.1/api")).toBe(
        "URL must not target private/internal addresses",
      );
      expect(validateUrl("https://10.255.255.255/api")).toBe(
        "URL must not target private/internal addresses",
      );
    });

    it("should reject 172.16-31.x.x private addresses", () => {
      expect(validateUrl("https://172.16.0.1/api")).toBe(
        "URL must not target private/internal addresses",
      );
      expect(validateUrl("https://172.31.255.255/api")).toBe(
        "URL must not target private/internal addresses",
      );
    });

    it("should reject 192.168.x.x private addresses", () => {
      expect(validateUrl("https://192.168.0.1/api")).toBe(
        "URL must not target private/internal addresses",
      );
      expect(validateUrl("https://192.168.1.100/api")).toBe(
        "URL must not target private/internal addresses",
      );
    });

    it("should reject IPv6 loopback [::1]", () => {
      expect(validateUrl("https://[::1]/api")).toBe(
        "URL must not target private/internal addresses",
      );
    });

    it("should reject IPv6 link-local [fe80:]", () => {
      expect(validateUrl("https://[fe80::1]/api")).toBe(
        "URL must not target private/internal addresses",
      );
    });

    it("should reject 169.254.x.x link-local addresses", () => {
      expect(validateUrl("https://169.254.1.1/api")).toBe(
        "URL must not target private/internal addresses",
      );
    });
  });

  describe("validateTemplate", () => {
    it("should return null for templates with valid variables", () => {
      expect(validateTemplate("Bearer {{secrets.API_KEY}}")).toBeNull();
      expect(validateTemplate("https://api.example.com/{{input.path}}")).toBeNull();
      expect(
        validateTemplate("{{secrets.TOKEN}} and {{input.query}}"),
      ).toBeNull();
    });

    it("should return null for strings with no template variables", () => {
      expect(validateTemplate("plain text with no variables")).toBeNull();
      expect(validateTemplate("https://api.example.com/v1")).toBeNull();
    });

    it("should reject invalid template variable namespaces", () => {
      const result = validateTemplate("{{env.SECRET}}");
      expect(result).toContain("Invalid template variables");
      expect(result).toContain("{{env.SECRET}}");
    });

    it("should reject template variables with invalid syntax", () => {
      const result = validateTemplate("{{process.env.SECRET}}");
      expect(result).toContain("Invalid template variables");
    });

    it("should reject template injection attempts", () => {
      const result = validateTemplate("{{constructor.prototype}}");
      expect(result).toContain("Invalid template variables");
    });

    it("should reject mixed valid and invalid variables", () => {
      const result = validateTemplate(
        "{{secrets.KEY}} and {{__proto__.polluted}}",
      );
      expect(result).toContain("Invalid template variables");
      expect(result).toContain("{{__proto__.polluted}}");
    });

    it("should reject variables starting with numbers", () => {
      const result = validateTemplate("{{secrets.1KEY}}");
      expect(result).toContain("Invalid template variables");
    });
  });

  describe("resolveTemplate", () => {
    it("should resolve input variables", () => {
      const result = resolveTemplate(
        "Hello {{input.name}}!",
        { name: "World" },
        {},
      );
      expect(result).toBe("Hello World!");
    });

    it("should resolve secret variables", () => {
      const result = resolveTemplate(
        "Bearer {{secrets.TOKEN}}",
        {},
        { TOKEN: "sk-123" },
      );
      expect(result).toBe("Bearer sk-123");
    });

    it("should resolve both input and secret variables", () => {
      const result = resolveTemplate(
        "{{secrets.BASE_URL}}/{{input.endpoint}}",
        { endpoint: "users" },
        { BASE_URL: "https://api.example.com" },
      );
      expect(result).toBe("https://api.example.com/users");
    });

    it("should leave unresolved input variables as-is", () => {
      const result = resolveTemplate(
        "Hello {{input.missing}}!",
        {},
        {},
      );
      expect(result).toBe("Hello {{input.missing}}!");
    });

    it("should leave unresolved secret variables as-is", () => {
      const result = resolveTemplate(
        "Bearer {{secrets.MISSING}}",
        {},
        {},
      );
      expect(result).toBe("Bearer {{secrets.MISSING}}");
    });

    it("should convert non-string input values to strings", () => {
      const result = resolveTemplate(
        "Count: {{input.count}}",
        { count: 42 },
        {},
      );
      expect(result).toBe("Count: 42");
    });

    it("should handle undefined input values by keeping the template", () => {
      const result = resolveTemplate(
        "Val: {{input.undef}}",
        { undef: undefined },
        {},
      );
      expect(result).toBe("Val: {{input.undef}}");
    });

    it("should handle templates with no variables", () => {
      const result = resolveTemplate("no variables here", {}, {});
      expect(result).toBe("no variables here");
    });

    it("should handle multiple occurrences of the same variable", () => {
      const result = resolveTemplate(
        "{{input.x}} + {{input.x}}",
        { x: "a" },
        {},
      );
      expect(result).toBe("a + a");
    });
  });

  // ============================================================
  // register_tool
  // ============================================================

  describe("register_tool", () => {
    const validInput = {
      name: "my_api_tool",
      description: "Fetches data from an external API",
      input_schema: { query: { type: "string" } },
      handler_spec: {
        url: "https://api.example.com/search?q={{input.query}}",
        method: "GET" as const,
        headers: { Authorization: "Bearer {{secrets.API_KEY}}" },
      },
    };

    it("should register a tool successfully", async () => {
      mockPrisma.registeredTool.count.mockResolvedValue(0);
      mockPrisma.subscription.findUnique.mockResolvedValue(null);
      mockPrisma.registeredTool.upsert.mockResolvedValue({
        id: "tool-1",
        name: "my_api_tool",
        status: "DRAFT",
      });

      const handler = registry.handlers.get("register_tool")!;
      const result = await handler(validInput);

      expect(mockPrisma.registeredTool.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_name: { userId, name: "my_api_tool" } },
          create: expect.objectContaining({
            userId,
            name: "my_api_tool",
            description: "Fetches data from an external API",
            status: "DRAFT",
          }),
          update: expect.objectContaining({
            description: "Fetches data from an external API",
            status: "DRAFT",
          }),
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({
          content: expect.arrayContaining([
            expect.objectContaining({
              type: "text",
              text: expect.stringContaining("Tool Registered"),
            }),
          ]),
        }),
      );
    });

    it("should include tool ID and name in success response", async () => {
      mockPrisma.registeredTool.count.mockResolvedValue(0);
      mockPrisma.subscription.findUnique.mockResolvedValue(null);
      mockPrisma.registeredTool.upsert.mockResolvedValue({
        id: "tool-abc",
        name: "my_api_tool",
        status: "DRAFT",
      });

      const handler = registry.handlers.get("register_tool")!;
      const result = await handler(validInput);

      const text = (result as { content: Array<{ text: string }> }).content[0]!.text;
      expect(text).toContain("tool-abc");
      expect(text).toContain("my_api_tool");
      expect(text).toContain("DRAFT");
    });

    it("should enforce quota for free tier", async () => {
      mockPrisma.registeredTool.count.mockResolvedValue(5);
      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      const handler = registry.handlers.get("register_tool")!;
      const result = await handler(validInput);

      expect(result).toEqual(
        expect.objectContaining({
          isError: true,
          content: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringContaining("Tool limit reached"),
            }),
          ]),
        }),
      );
      expect(mockPrisma.registeredTool.upsert).not.toHaveBeenCalled();
    });

    it("should show limit numbers in quota error message", async () => {
      mockPrisma.registeredTool.count.mockResolvedValue(5);
      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      const handler = registry.handlers.get("register_tool")!;
      const result = await handler(validInput);

      const text = (result as { content: Array<{ text: string }> }).content[0]!.text;
      expect(text).toContain("5/5");
      expect(text).toContain("500");
    });

    it("should allow more tools for premium users", async () => {
      mockPrisma.registeredTool.count.mockResolvedValue(100);
      mockPrisma.subscription.findUnique.mockResolvedValue({
        tier: "PREMIUM",
      });
      mockPrisma.registeredTool.upsert.mockResolvedValue({
        id: "tool-101",
        name: "my_api_tool",
        status: "DRAFT",
      });

      const handler = registry.handlers.get("register_tool")!;
      const result = await handler(validInput);

      expect(result).toEqual(
        expect.objectContaining({
          content: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringContaining("Tool Registered"),
            }),
          ]),
        }),
      );
    });

    it("should enforce premium quota limit at 500", async () => {
      mockPrisma.registeredTool.count.mockResolvedValue(500);
      mockPrisma.subscription.findUnique.mockResolvedValue({
        tier: "PREMIUM",
      });

      const handler = registry.handlers.get("register_tool")!;
      const result = await handler(validInput);

      expect(result).toEqual(
        expect.objectContaining({
          isError: true,
          content: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringContaining("Tool limit reached"),
            }),
          ]),
        }),
      );
    });

    it("should reject non-HTTPS URLs (SSRF prevention)", async () => {
      mockPrisma.registeredTool.count.mockResolvedValue(0);
      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      const handler = registry.handlers.get("register_tool")!;
      const result = await handler({
        ...validInput,
        handler_spec: {
          ...validInput.handler_spec,
          url: "http://api.example.com/search",
        },
      });

      expect(result).toEqual(
        expect.objectContaining({
          isError: true,
          content: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringContaining("Invalid handler URL"),
            }),
          ]),
        }),
      );
      expect(mockPrisma.registeredTool.upsert).not.toHaveBeenCalled();
    });

    it("should reject private IP URLs (SSRF prevention)", async () => {
      mockPrisma.registeredTool.count.mockResolvedValue(0);
      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      const handler = registry.handlers.get("register_tool")!;
      const result = await handler({
        ...validInput,
        handler_spec: {
          ...validInput.handler_spec,
          url: "https://192.168.1.1/api",
        },
      });

      expect(result).toEqual(
        expect.objectContaining({
          isError: true,
          content: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringContaining("Invalid handler URL"),
            }),
          ]),
        }),
      );
    });

    it("should reject invalid template variables in URL (injection prevention)", async () => {
      mockPrisma.registeredTool.count.mockResolvedValue(0);
      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      const handler = registry.handlers.get("register_tool")!;
      const result = await handler({
        ...validInput,
        handler_spec: {
          ...validInput.handler_spec,
          url: "https://api.example.com/{{env.PATH}}",
        },
      });

      expect(result).toEqual(
        expect.objectContaining({
          isError: true,
          content: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringContaining("Template error"),
            }),
          ]),
        }),
      );
    });

    it("should reject invalid template variables in headers (injection prevention)", async () => {
      mockPrisma.registeredTool.count.mockResolvedValue(0);
      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      const handler = registry.handlers.get("register_tool")!;
      const result = await handler({
        ...validInput,
        handler_spec: {
          ...validInput.handler_spec,
          url: "https://api.example.com/data",
          headers: { Authorization: "Bearer {{process.env.TOKEN}}" },
        },
      });

      expect(result).toEqual(
        expect.objectContaining({
          isError: true,
          content: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringContaining("Template error"),
            }),
          ]),
        }),
      );
    });

    it("should reject invalid template variables in body (injection prevention)", async () => {
      mockPrisma.registeredTool.count.mockResolvedValue(0);
      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      const handler = registry.handlers.get("register_tool")!;
      const result = await handler({
        ...validInput,
        handler_spec: {
          url: "https://api.example.com/data",
          method: "POST" as const,
          headers: {},
          body: '{"key": "{{constructor.prototype}}"}',
        },
      });

      expect(result).toEqual(
        expect.objectContaining({
          isError: true,
          content: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringContaining("Template error"),
            }),
          ]),
        }),
      );
    });

    it("should handle database errors", async () => {
      mockPrisma.registeredTool.count.mockRejectedValue(
        new Error("DB connection failed"),
      );

      const handler = registry.handlers.get("register_tool")!;
      const result = await handler(validInput);

      expect(result).toEqual(
        expect.objectContaining({
          isError: true,
          content: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringContaining("DB connection failed"),
            }),
          ]),
        }),
      );
    });
  });

  // ============================================================
  // test_tool
  // ============================================================

  describe("test_tool", () => {
    const mockTool = {
      id: "tool-1",
      name: "my_api_tool",
      status: "DRAFT",
      handlerSpec: {
        url: "https://api.example.com/search?q={{input.query}}",
        method: "GET",
        headers: { Authorization: "Bearer {{secrets.API_KEY}}" },
      },
    };

    it("should execute a tool test successfully", async () => {
      mockPrisma.registeredTool.findFirst.mockResolvedValue(mockTool);
      mockPrisma.vaultSecret.findMany.mockResolvedValue([
        {
          name: "API_KEY",
          encryptedValue: "enc",
          iv: "iv",
          tag: "tag",
          status: "APPROVED",
        },
      ]);
      mockDecryptSecret.mockReturnValue("sk-real-key");
      mockFetch.mockResolvedValue({
        status: 200,
        statusText: "OK",
        text: () => Promise.resolve('{"results": [1, 2, 3]}'),
      });

      const handler = registry.handlers.get("test_tool")!;
      const result = await handler({
        tool_id: "tool-1",
        test_input: { query: "hello" },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/search?q=hello",
        expect.objectContaining({
          method: "GET",
          headers: { Authorization: "Bearer sk-real-key" },
        }),
      );

      const text = (result as { content: Array<{ text: string }> }).content[0]!.text;
      expect(text).toContain("Tool Test: my_api_tool");
      expect(text).toContain("200 OK");
      expect(text).toContain('{"results": [1, 2, 3]}');
    });

    it("should apply responseTransform json_path when configured", async () => {
      const toolWithTransform = {
        ...mockTool,
        handlerSpec: {
          ...mockTool.handlerSpec,
          headers: {},
          responseTransform: {
            type: "json_path" as const,
            path: "data.items",
          },
        },
      };
      mockPrisma.registeredTool.findFirst.mockResolvedValue(toolWithTransform);
      mockFetch.mockResolvedValue({
        status: 200,
        statusText: "OK",
        text: () =>
          Promise.resolve(
            JSON.stringify({ data: { items: ["a", "b", "c"] } }),
          ),
      });

      const handler = registry.handlers.get("test_tool")!;
      const result = await handler({
        tool_id: "tool-1",
        test_input: { query: "test" },
      });

      const text = (result as { content: Array<{ text: string }> }).content[0]!.text;
      expect(text).toContain("Transformed Result");
      expect(text).toContain('"a"');
      expect(text).toContain('"b"');
      expect(text).toContain('"c"');
    });

    it("should fall back to raw response when json_path transform fails on invalid JSON", async () => {
      const toolWithTransform = {
        ...mockTool,
        handlerSpec: {
          ...mockTool.handlerSpec,
          headers: {},
          responseTransform: {
            type: "json_path" as const,
            path: "data.items",
          },
        },
      };
      mockPrisma.registeredTool.findFirst.mockResolvedValue(toolWithTransform);
      mockFetch.mockResolvedValue({
        status: 200,
        statusText: "OK",
        text: () => Promise.resolve("not valid json"),
      });

      const handler = registry.handlers.get("test_tool")!;
      const result = await handler({
        tool_id: "tool-1",
        test_input: { query: "test" },
      });

      const text = (result as { content: Array<{ text: string }> }).content[0]!.text;
      expect(text).toContain("Response:");
      expect(text).toContain("not valid json");
    });

    it("should return error when tool is not found", async () => {
      mockPrisma.registeredTool.findFirst.mockResolvedValue(null);

      const handler = registry.handlers.get("test_tool")!;
      const result = await handler({
        tool_id: "nonexistent",
        test_input: {},
      });

      expect(result).toEqual(
        expect.objectContaining({
          isError: true,
          content: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringContaining("Tool not found or disabled"),
            }),
          ]),
        }),
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should return error when required secrets are missing", async () => {
      mockPrisma.registeredTool.findFirst.mockResolvedValue(mockTool);
      // Return empty array for vault secrets — the secret is not found/approved
      mockPrisma.vaultSecret.findMany.mockResolvedValue([]);

      const handler = registry.handlers.get("test_tool")!;
      const result = await handler({
        tool_id: "tool-1",
        test_input: { query: "hello" },
      });

      expect(result).toEqual(
        expect.objectContaining({
          isError: true,
          content: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringContaining("Missing or unapproved secret: API_KEY"),
            }),
          ]),
        }),
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should work with tools that have no secret references", async () => {
      const toolNoSecrets = {
        id: "tool-2",
        name: "simple_tool",
        status: "PUBLISHED",
        handlerSpec: {
          url: "https://api.example.com/public/{{input.id}}",
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
      };
      mockPrisma.registeredTool.findFirst.mockResolvedValue(toolNoSecrets);
      mockFetch.mockResolvedValue({
        status: 200,
        statusText: "OK",
        text: () => Promise.resolve('{"id": 42}'),
      });

      const handler = registry.handlers.get("test_tool")!;
      const result = await handler({
        tool_id: "tool-2",
        test_input: { id: "42" },
      });

      expect(mockPrisma.vaultSecret.findMany).not.toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/public/42",
        expect.objectContaining({
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({
          content: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringContaining("Tool Test: simple_tool"),
            }),
          ]),
        }),
      );
    });

    it("should resolve body templates for POST requests", async () => {
      const postTool = {
        id: "tool-3",
        name: "post_tool",
        status: "DRAFT",
        handlerSpec: {
          url: "https://api.example.com/data",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: '{"query": "{{input.query}}"}',
        },
      };
      mockPrisma.registeredTool.findFirst.mockResolvedValue(postTool);
      mockFetch.mockResolvedValue({
        status: 201,
        statusText: "Created",
        text: () => Promise.resolve('{"ok": true}'),
      });

      const handler = registry.handlers.get("test_tool")!;
      await handler({
        tool_id: "tool-3",
        test_input: { query: "test" },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/data",
        expect.objectContaining({
          method: "POST",
          body: '{"query": "test"}',
        }),
      );
    });

    it("should truncate responses larger than 1MB", async () => {
      const toolNoSecrets = {
        id: "tool-4",
        name: "big_tool",
        status: "DRAFT",
        handlerSpec: {
          url: "https://api.example.com/big",
          method: "GET",
          headers: {},
        },
      };
      mockPrisma.registeredTool.findFirst.mockResolvedValue(toolNoSecrets);

      const bigResponse = "x".repeat(1_100_000);
      mockFetch.mockResolvedValue({
        status: 200,
        statusText: "OK",
        text: () => Promise.resolve(bigResponse),
      });

      const handler = registry.handlers.get("test_tool")!;
      const result = await handler({
        tool_id: "tool-4",
        test_input: {},
      });

      const text = (result as { content: Array<{ text: string }> }).content[0]!.text;
      expect(text).toContain("...(truncated)");
    });

    it("should handle fetch errors gracefully", async () => {
      const toolNoSecrets = {
        id: "tool-5",
        name: "failing_tool",
        status: "DRAFT",
        handlerSpec: {
          url: "https://api.example.com/error",
          method: "GET",
          headers: {},
        },
      };
      mockPrisma.registeredTool.findFirst.mockResolvedValue(toolNoSecrets);
      mockFetch.mockRejectedValue(new Error("Network error"));

      const handler = registry.handlers.get("test_tool")!;
      const result = await handler({
        tool_id: "tool-5",
        test_input: {},
      });

      expect(result).toEqual(
        expect.objectContaining({
          isError: true,
          content: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringContaining("Network error"),
            }),
          ]),
        }),
      );
    });

    it("should handle database errors", async () => {
      mockPrisma.registeredTool.findFirst.mockRejectedValue(
        new Error("DB error"),
      );

      const handler = registry.handlers.get("test_tool")!;
      const result = await handler({
        tool_id: "tool-1",
        test_input: {},
      });

      expect(result).toEqual(
        expect.objectContaining({
          isError: true,
          content: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringContaining("DB error"),
            }),
          ]),
        }),
      );
    });
  });

  // ============================================================
  // publish_tool
  // ============================================================

  describe("publish_tool", () => {
    it("should publish a draft tool successfully", async () => {
      mockPrisma.registeredTool.findFirst.mockResolvedValue({
        id: "tool-1",
        name: "my_api_tool",
        status: "DRAFT",
        userId,
      });
      mockPrisma.registeredTool.update.mockResolvedValue({
        id: "tool-1",
        status: "PUBLISHED",
      });

      const handler = registry.handlers.get("publish_tool")!;
      const result = await handler({ tool_id: "tool-1" });

      expect(mockPrisma.registeredTool.update).toHaveBeenCalledWith({
        where: { id: "tool-1" },
        data: { status: "PUBLISHED" },
      });
      expect(result).toEqual(
        expect.objectContaining({
          content: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringContaining("Tool Published"),
            }),
          ]),
        }),
      );
    });

    it("should include tool name in publish success message", async () => {
      mockPrisma.registeredTool.findFirst.mockResolvedValue({
        id: "tool-1",
        name: "weather_lookup",
        status: "DRAFT",
        userId,
      });
      mockPrisma.registeredTool.update.mockResolvedValue({
        id: "tool-1",
        status: "PUBLISHED",
      });

      const handler = registry.handlers.get("publish_tool")!;
      const result = await handler({ tool_id: "tool-1" });

      const text = (result as { content: Array<{ text: string }> }).content[0]!.text;
      expect(text).toContain("weather_lookup");
      expect(text).toContain("PUBLISHED");
    });

    it("should reject publishing a non-draft tool (already published)", async () => {
      mockPrisma.registeredTool.findFirst.mockResolvedValue({
        id: "tool-1",
        name: "my_api_tool",
        status: "PUBLISHED",
        userId,
      });

      const handler = registry.handlers.get("publish_tool")!;
      const result = await handler({ tool_id: "tool-1" });

      expect(result).toEqual(
        expect.objectContaining({
          isError: true,
          content: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringContaining("not DRAFT"),
            }),
          ]),
        }),
      );
      expect(mockPrisma.registeredTool.update).not.toHaveBeenCalled();
    });

    it("should reject publishing a disabled tool", async () => {
      mockPrisma.registeredTool.findFirst.mockResolvedValue({
        id: "tool-1",
        name: "my_api_tool",
        status: "DISABLED",
        userId,
      });

      const handler = registry.handlers.get("publish_tool")!;
      const result = await handler({ tool_id: "tool-1" });

      expect(result).toEqual(
        expect.objectContaining({
          isError: true,
          content: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringContaining("DISABLED"),
            }),
          ]),
        }),
      );
    });

    it("should return error when tool is not found", async () => {
      mockPrisma.registeredTool.findFirst.mockResolvedValue(null);

      const handler = registry.handlers.get("publish_tool")!;
      const result = await handler({ tool_id: "nonexistent" });

      expect(result).toEqual(
        expect.objectContaining({
          isError: true,
          content: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringContaining("Tool not found"),
            }),
          ]),
        }),
      );
    });

    it("should handle database errors", async () => {
      mockPrisma.registeredTool.findFirst.mockRejectedValue(
        new Error("DB error"),
      );

      const handler = registry.handlers.get("publish_tool")!;
      const result = await handler({ tool_id: "tool-1" });

      expect(result).toEqual(
        expect.objectContaining({
          isError: true,
          content: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringContaining("DB error"),
            }),
          ]),
        }),
      );
    });
  });

  // ============================================================
  // list_registered_tools
  // ============================================================

  describe("list_registered_tools", () => {
    it("should list tools with details", async () => {
      const createdAt = new Date("2025-06-01T12:00:00Z");
      mockPrisma.registeredTool.findMany.mockResolvedValue([
        {
          id: "tool-1",
          name: "weather_api",
          description: "Get weather data",
          status: "PUBLISHED",
          installCount: 42,
          createdAt,
        },
        {
          id: "tool-2",
          name: "translate_api",
          description: "Translate text",
          status: "DRAFT",
          installCount: 0,
          createdAt,
        },
      ]);
      mockPrisma.registeredTool.count.mockResolvedValue(2);
      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      const handler = registry.handlers.get("list_registered_tools")!;
      const result = await handler({});

      const text = (result as { content: Array<{ text: string }> }).content[0]!.text;
      expect(text).toContain("Registered Tools (2/5)");
      expect(text).toContain("weather_api");
      expect(text).toContain("PUBLISHED");
      expect(text).toContain("translate_api");
      expect(text).toContain("DRAFT");
      expect(text).toContain("Get weather data");
      expect(text).toContain("Installs: 42");
    });

    it("should show empty list message", async () => {
      mockPrisma.registeredTool.findMany.mockResolvedValue([]);
      mockPrisma.registeredTool.count.mockResolvedValue(0);
      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      const handler = registry.handlers.get("list_registered_tools")!;
      const result = await handler({});

      expect(result).toEqual(
        expect.objectContaining({
          content: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringContaining("No tools registered"),
            }),
          ]),
        }),
      );
    });

    it("should show quota for premium users", async () => {
      mockPrisma.registeredTool.findMany.mockResolvedValue([]);
      mockPrisma.registeredTool.count.mockResolvedValue(0);
      mockPrisma.subscription.findUnique.mockResolvedValue({
        tier: "PREMIUM",
      });

      const handler = registry.handlers.get("list_registered_tools")!;
      const result = await handler({});

      const text = (result as { content: Array<{ text: string }> }).content[0]!.text;
      expect(text).toContain("0/500");
    });

    it("should handle database errors", async () => {
      mockPrisma.registeredTool.findMany.mockRejectedValue(
        new Error("DB error"),
      );

      const handler = registry.handlers.get("list_registered_tools")!;
      const result = await handler({});

      expect(result).toEqual(
        expect.objectContaining({
          isError: true,
          content: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringContaining("DB error"),
            }),
          ]),
        }),
      );
    });
  });

  // ============================================================
  // disable_tool
  // ============================================================

  describe("disable_tool", () => {
    it("should disable a published tool successfully", async () => {
      mockPrisma.registeredTool.findFirst.mockResolvedValue({
        id: "tool-1",
        name: "my_api_tool",
        status: "PUBLISHED",
        userId,
      });
      mockPrisma.registeredTool.update.mockResolvedValue({
        id: "tool-1",
        status: "DISABLED",
      });

      const handler = registry.handlers.get("disable_tool")!;
      const result = await handler({ tool_id: "tool-1" });

      expect(mockPrisma.registeredTool.update).toHaveBeenCalledWith({
        where: { id: "tool-1" },
        data: { status: "DISABLED" },
      });
      expect(result).toEqual(
        expect.objectContaining({
          content: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringContaining("Tool Disabled"),
            }),
          ]),
        }),
      );
    });

    it("should disable a draft tool successfully", async () => {
      mockPrisma.registeredTool.findFirst.mockResolvedValue({
        id: "tool-1",
        name: "my_draft_tool",
        status: "DRAFT",
        userId,
      });
      mockPrisma.registeredTool.update.mockResolvedValue({
        id: "tool-1",
        status: "DISABLED",
      });

      const handler = registry.handlers.get("disable_tool")!;
      const result = await handler({ tool_id: "tool-1" });

      expect(mockPrisma.registeredTool.update).toHaveBeenCalledWith({
        where: { id: "tool-1" },
        data: { status: "DISABLED" },
      });
      const text = (result as { content: Array<{ text: string }> }).content[0]!.text;
      expect(text).toContain("Tool Disabled");
      expect(text).toContain("my_draft_tool");
    });

    it("should handle already disabled tool without error", async () => {
      mockPrisma.registeredTool.findFirst.mockResolvedValue({
        id: "tool-1",
        name: "my_api_tool",
        status: "DISABLED",
        userId,
      });

      const handler = registry.handlers.get("disable_tool")!;
      const result = await handler({ tool_id: "tool-1" });

      expect(result).toEqual(
        expect.objectContaining({
          content: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringContaining("already disabled"),
            }),
          ]),
        }),
      );
      expect(mockPrisma.registeredTool.update).not.toHaveBeenCalled();
    });

    it("should return error when tool is not found", async () => {
      mockPrisma.registeredTool.findFirst.mockResolvedValue(null);

      const handler = registry.handlers.get("disable_tool")!;
      const result = await handler({ tool_id: "nonexistent" });

      expect(result).toEqual(
        expect.objectContaining({
          isError: true,
          content: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringContaining("Tool not found"),
            }),
          ]),
        }),
      );
    });

    it("should handle database errors", async () => {
      mockPrisma.registeredTool.findFirst.mockRejectedValue(
        new Error("DB error"),
      );

      const handler = registry.handlers.get("disable_tool")!;
      const result = await handler({ tool_id: "tool-1" });

      expect(result).toEqual(
        expect.objectContaining({
          isError: true,
          content: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringContaining("DB error"),
            }),
          ]),
        }),
      );
    });
  });
});
