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

    it("should return error on fetch exception", async () => {
      mockFetch.mockRejectedValue(new Error("Network timeout"));
      const handler = registry.handlers.get("codespace_update")!;
      const result = await handler({ codespace_id: "test-app", code: "export default () => <div/>" });
      expect(getText(result)).toContain("Error");
      expect(getText(result)).toContain("Network timeout");
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

  describe("codespace_screenshot", () => {
    it("should return screenshot image", async () => {
      const imageBuffer = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]).buffer;
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        arrayBuffer: () => Promise.resolve(imageBuffer),
        headers: new Map([["content-type", "image/jpeg"]]),
      });
      const handler = registry.handlers.get("codespace_screenshot")!;
      const result = await handler({ codespace_id: "test-app" });
      const content = (result as { content: Array<{ type: string; text?: string; data?: string; mimeType?: string }> }).content;
      expect(content[0]!.text).toContain("Screenshot of test-app");
      expect(content[1]!.type).toBe("image");
      expect(content[1]!.mimeType).toBe("image/jpeg");
    });

    it("should return error on screenshot failure", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        headers: new Map([["content-type", "text/plain"]]),
      });
      const handler = registry.handlers.get("codespace_screenshot")!;
      const result = await handler({ codespace_id: "test-app" });
      expect(getText(result)).toContain("Error");
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

    it("should return error when PATCH fails for app_id", async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ error: "App not found" }, false, 404));
      const handler = registry.handlers.get("codespace_link_app")!;
      const result = await handler({ codespace_id: "test-app", app_id: "bad-id" });
      expect(getText(result)).toContain("Error");
    });

    it("should return error when POST fails for app_name", async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ error: "Validation failed" }, false, 400));
      const handler = registry.handlers.get("codespace_link_app")!;
      const result = await handler({ codespace_id: "test-app", app_name: "Bad App" });
      expect(getText(result)).toContain("Error");
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

    it("should return error on fetch failure", async () => {
      mockFetch.mockRejectedValue(new Error("Service unavailable"));
      const handler = registry.handlers.get("codespace_list_my_apps")!;
      const result = await handler({});
      expect(getText(result)).toContain("Error");
      expect(getText(result)).toContain("Service unavailable");
    });
  });
});
