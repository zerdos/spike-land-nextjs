import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import type { ToolRegistry } from "../tool-registry";
import { registerCodeSpaceTools } from "./codespace";

function createMockRegistry(): ToolRegistry & { handlers: Map<string, (...args: unknown[]) => unknown> } {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();
  const registry = {
    register: vi.fn((def: { name: string; handler: (...args: unknown[]) => unknown }) => { handlers.set(def.name, def.handler); }),
    handlers,
  };
  return registry as unknown as ToolRegistry & { handlers: Map<string, (...args: unknown[]) => unknown> };
}

function getText(result: unknown): string {
  return (result as { content: Array<{ text: string }> }).content[0]!.text;
}

function mockJsonResponse(data: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: new Map([["content-type", "image/jpeg"]]),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
  };
}

describe("codespace tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createMockRegistry();
    registerCodeSpaceTools(registry, userId);
  });

  it("should register 6 codespace tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(6);
    expect(registry.handlers.has("codespace_update")).toBe(true);
    expect(registry.handlers.has("codespace_run")).toBe(true);
    expect(registry.handlers.has("codespace_screenshot")).toBe(true);
    expect(registry.handlers.has("codespace_get")).toBe(true);
    expect(registry.handlers.has("codespace_link_app")).toBe(true);
    expect(registry.handlers.has("codespace_list_my_apps")).toBe(true);
  });

  describe("codespace_update", () => {
    it("should update codespace", async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ codeSpace: "test-app", hash: "abc123", updated: [] }));
      const handler = registry.handlers.get("codespace_update")!;
      const result = await handler({ codespace_id: "test-app", code: "export default () => <div>Hello</div>" });
      expect(getText(result)).toContain("CodeSpace Updated");
      expect(getText(result)).toContain("test-app");
    });

    it("should return error on API failure", async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ error: "Server error" }, false, 500));
      const handler = registry.handlers.get("codespace_update")!;
      const result = await handler({ codespace_id: "test-app", code: "bad code" });
      expect(getText(result)).toContain("Error");
    });
  });

  describe("codespace_run", () => {
    it("should transpile codespace", async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ codeSpace: "test-app", hash: "abc123", transpiled: true }));
      const handler = registry.handlers.get("codespace_run")!;
      const result = await handler({ codespace_id: "test-app" });
      expect(getText(result)).toContain("Transpiled");
    });
  });

  describe("codespace_get", () => {
    it("should return codespace details", async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({
        codeSpace: "test-app", hash: "abc123",
        session: { code: "export default () => <div>Hi</div>" },
      }));
      const handler = registry.handlers.get("codespace_get")!;
      const result = await handler({ codespace_id: "test-app" });
      expect(getText(result)).toContain("CodeSpace Details");
      expect(getText(result)).toContain("Source Code");
    });
  });

  describe("codespace_link_app", () => {
    it("should link app with app_id", async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ id: "app-1", name: "My App" }));
      const handler = registry.handlers.get("codespace_link_app")!;
      const result = await handler({ codespace_id: "test-app", app_id: "app-1" });
      expect(getText(result)).toContain("Linked");
    });

    it("should create app with app_name", async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ id: "app-2", name: "New App" }));
      const handler = registry.handlers.get("codespace_link_app")!;
      const result = await handler({ codespace_id: "test-app", app_name: "New App", app_description: "Description of app" });
      expect(getText(result)).toContain("App Created");
    });

    it("should error without app_id or app_name", async () => {
      const handler = registry.handlers.get("codespace_link_app")!;
      const result = await handler({ codespace_id: "test-app" });
      expect(getText(result)).toContain("app_id or app_name required");
    });
  });

  describe("codespace_list_my_apps", () => {
    it("should list apps", async () => {
      mockFetch.mockResolvedValue(mockJsonResponse([
        { id: "app-1", name: "App 1", status: "ACTIVE", codespaceId: "cs-1" },
      ]));
      const handler = registry.handlers.get("codespace_list_my_apps")!;
      const result = await handler({});
      expect(getText(result)).toContain("My Apps");
      expect(getText(result)).toContain("App 1");
    });

    it("should show empty message", async () => {
      mockFetch.mockResolvedValue(mockJsonResponse([]));
      const handler = registry.handlers.get("codespace_list_my_apps")!;
      const result = await handler({});
      expect(getText(result)).toContain("No apps found");
    });
  });
});
