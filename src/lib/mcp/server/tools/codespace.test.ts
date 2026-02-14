import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { createMockRegistry, getText } from "../__test-utils__";
import { registerCodeSpaceTools } from "./codespace";

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

  describe("validateCodeSpaceId", () => {
    it("should throw on invalid codespace ID", async () => {
      const handler = registry.handlers.get("codespace_update")!;
      await expect(handler({ codespace_id: "bad id!@#", code: "hello" })).rejects.toThrow("Invalid codespace ID format");
    });

    it("should throw on codespace ID with spaces", async () => {
      const handler = registry.handlers.get("codespace_run")!;
      await expect(handler({ codespace_id: "bad space" })).rejects.toThrow("Invalid codespace ID format");
    });

    it("should throw on codespace ID with special chars", async () => {
      const handler = registry.handlers.get("codespace_get")!;
      await expect(handler({ codespace_id: "../../etc/passwd" })).rejects.toThrow("Invalid codespace ID format");
    });
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

  describe("codespace_update without service token", () => {
    it("should make request without Authorization header when no service token is set", async () => {
      const origServiceToken = process.env["SPIKE_LAND_SERVICE_TOKEN"];
      const origApiKey = process.env["SPIKE_LAND_API_KEY"];
      delete process.env["SPIKE_LAND_SERVICE_TOKEN"];
      delete process.env["SPIKE_LAND_API_KEY"];

      try {
        mockFetch.mockResolvedValue(mockJsonResponse({ codeSpace: "test-app", hash: "abc", updated: [] }));
        const handler = registry.handlers.get("codespace_update")!;
        await handler({ codespace_id: "test-app", code: "export default () => <div/>" });

        const [, fetchOptions] = mockFetch.mock.calls[0] as [string, RequestInit];
        const headers = fetchOptions.headers as Record<string, string>;
        expect(headers["Authorization"]).toBeUndefined();
      } finally {
        if (origServiceToken !== undefined) process.env["SPIKE_LAND_SERVICE_TOKEN"] = origServiceToken;
        if (origApiKey !== undefined) process.env["SPIKE_LAND_API_KEY"] = origApiKey;
      }
    });
  });

  describe("registerCodeSpaceTools with env token variants", () => {
    it("should use SPIKE_LAND_SERVICE_TOKEN when set", () => {
      const origST = process.env["SPIKE_LAND_SERVICE_TOKEN"];
      const origAK = process.env["SPIKE_LAND_API_KEY"];
      process.env["SPIKE_LAND_SERVICE_TOKEN"] = "test-service-token";
      delete process.env["SPIKE_LAND_API_KEY"];

      try {
        const freshRegistry = createMockRegistry();
        registerCodeSpaceTools(freshRegistry, userId);
        expect(freshRegistry.register).toHaveBeenCalledTimes(6);
      } finally {
        if (origST !== undefined) process.env["SPIKE_LAND_SERVICE_TOKEN"] = origST;
        else delete process.env["SPIKE_LAND_SERVICE_TOKEN"];
        if (origAK !== undefined) process.env["SPIKE_LAND_API_KEY"] = origAK;
        else delete process.env["SPIKE_LAND_API_KEY"];
      }
    });

    it("should fall back to SPIKE_LAND_API_KEY when SERVICE_TOKEN is not set", () => {
      const origST = process.env["SPIKE_LAND_SERVICE_TOKEN"];
      const origAK = process.env["SPIKE_LAND_API_KEY"];
      delete process.env["SPIKE_LAND_SERVICE_TOKEN"];
      process.env["SPIKE_LAND_API_KEY"] = "test-api-key";

      try {
        const freshRegistry = createMockRegistry();
        registerCodeSpaceTools(freshRegistry, userId);
        expect(freshRegistry.register).toHaveBeenCalledTimes(6);
      } finally {
        if (origST !== undefined) process.env["SPIKE_LAND_SERVICE_TOKEN"] = origST;
        else delete process.env["SPIKE_LAND_SERVICE_TOKEN"];
        if (origAK !== undefined) process.env["SPIKE_LAND_API_KEY"] = origAK;
        else delete process.env["SPIKE_LAND_API_KEY"];
      }
    });
  });

  describe("codespaceRequest error JSON without error field", () => {
    it("should fall back to status code when error field is missing", async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ message: "bad request" }, false, 400));
      const handler = registry.handlers.get("codespace_update")!;
      const result = await handler({ codespace_id: "test-app", code: "code" });
      expect(getText(result)).toContain("Error");
      expect(getText(result)).toContain("API error: 400");
    });
  });

  describe("codespaceRequest non-Error throw", () => {
    it("should handle non-Error thrown from codespaceRequest", async () => {
      mockFetch.mockRejectedValue("raw string error");
      const handler = registry.handlers.get("codespace_run")!;
      const result = await handler({ codespace_id: "test-app" });
      expect(getText(result)).toContain("Error");
      expect(getText(result)).toContain("Unknown error");
    });
  });

  describe("codespace_run error paths", () => {
    it("should return error on API failure", async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ error: "Server error" }, false, 500));
      const handler = registry.handlers.get("codespace_run")!;
      const result = await handler({ codespace_id: "test-app" });
      expect(getText(result)).toContain("Error");
    });
  });

  describe("codespace_get error paths", () => {
    it("should return error on API failure", async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ error: "Not found" }, false, 404));
      const handler = registry.handlers.get("codespace_get")!;
      const result = await handler({ codespace_id: "test-app" });
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

    it("should list apps without codespaceId", async () => {
      mockFetch.mockResolvedValue(mockJsonResponse([
        { id: "app-1", name: "App No CS", status: "ACTIVE" },
      ]));
      const handler = registry.handlers.get("codespace_list_my_apps")!;
      const result = await handler({});
      expect(getText(result)).toContain("App No CS");
      expect(getText(result)).not.toContain("Codespace:");
    });

    it("should handle non-Error thrown from spikeLandRequest", async () => {
      mockFetch.mockRejectedValue("string error");
      const handler = registry.handlers.get("codespace_list_my_apps")!;
      const result = await handler({});
      expect(getText(result)).toContain("Error");
      expect(getText(result)).toContain("Unknown error");
    });

    it("should handle API error without error field in response", async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({}, false, 500));
      const handler = registry.handlers.get("codespace_list_my_apps")!;
      const result = await handler({});
      expect(getText(result)).toContain("Error");
      expect(getText(result)).toContain("API error: 500");
    });

    it("should handle null data by defaulting to empty array", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(null),
        text: () => Promise.resolve("null"),
      });
      const handler = registry.handlers.get("codespace_list_my_apps")!;
      const result = await handler({});
      expect(getText(result)).toContain("My Apps (0)");
      expect(getText(result)).toContain("No apps found");
    });
  });
});
