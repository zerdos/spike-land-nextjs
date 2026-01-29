import { importMap as _importMap } from "@spike-npm-land/code";
const md5Promise = import("@spike-npm-land/code").then((m) => m.md5);
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Code } from "./chatRoom";
import { RouteHandler } from "./routeHandler";
import type { WebSocketHandler } from "./websocketHandler";

vi.mock("snakecase-keys", () => ({}));

describe("RouteHandler", () => {
  let routeHandler: RouteHandler;
  let mockCode: Partial<Code>;

  beforeEach(() => {
    // Create a mock Code object with necessary methods
    mockCode = {
      getSession: vi.fn().mockReturnValue({
        code: "mock code",
        html: "mock html",
        css: "mock css",
        transpiled: "mock transpiled code",
        codeSpace: "test-space",
        messages: [], // Added missing messages field
      }),
      getState: vi.fn().mockReturnValue({
        storage: {
          list: vi.fn().mockResolvedValue({}),
          get: vi.fn().mockResolvedValue(null),
        },
      }),
      getEnv: vi.fn().mockReturnValue({}),
      getOrigin: vi.fn().mockReturnValue("https://example.com"),
      wsHandler: {
        handleWebsocketSession: vi.fn().mockResolvedValue(undefined),
      } as unknown as WebSocketHandler,
    };

    // Create RouteHandler with mock Code
    routeHandler = new RouteHandler(mockCode as Code);
  });

  describe("handleRoute", () => {
    it("should return 404 for unknown route", async () => {
      const request = new Request("https://example.com/unknown");
      const url = new URL("https://example.com/unknown");

      const response = await routeHandler.handleRoute(request, url, [
        "unknown",
      ]);

      expect(response.status).toBe(404);
      expect(await response.text()).toBe("Not found");
    });

    it("should handle known routes", async () => {
      const request = new Request("https://example.com/code");
      const url = new URL("https://example.com/code");

      const response = await routeHandler.handleRoute(request, url, ["code"]);

      expect(response.status).toBe(200);
      expect(await response.text()).toBe("mock code");
    });
  });

  describe("Route Handlers", () => {
    describe("handleCodeRoute", () => {
      it("should return code with correct headers", async () => {
        const request = new Request("https://example.com/code");
        const url = new URL("https://example.com/code");

        const response = await routeHandler.handleRoute(request, url, ["code"]);

        expect(response.status).toBe(200);
        expect(await response.text()).toBe("mock code");
        expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
        const md5 = await md5Promise;
        expect(response.headers.get("content_hash")).toBe(md5("mock code"));
      });
    });

    describe("handleSessionRoute", () => {
      it("should return session JSON", async () => {
        const request = new Request(
          "https://example.com/session.json?room=test-space",
        );
        const url = new URL("https://example.com/session.json?room=test-space");

        const response = await routeHandler.handleRoute(request, url, [
          "session.json",
        ]);

        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Type")).toBe(
          "application/json; charset=UTF-8",
        );
      });
    });

    describe("handleWebsocketRoute", () => {
      // SKIP REASON: WebSocket upgrade (status 101) not supported in Node.js test environment
      // CATEGORY: environment
      // TRACKING: #798
      // ACTION: keep - Requires Cloudflare Workers runtime, better tested via E2E
      it.skip("should handle websocket upgrade", async () => {
        const request = new Request("https://example.com/websocket", {
          headers: new Headers({ "Upgrade": "websocket" }),
        });
        const url = new URL("https://example.com/websocket");

        const response = await routeHandler.handleRoute(request, url, [
          "websocket",
        ]);

        expect(response.status).toBe(101);
        expect(response.webSocket).toBeDefined();
        expect(response.webSocket).toHaveProperty("send");
        expect(response.webSocket).toHaveProperty("close");
        expect(mockCode.wsHandler?.handleWebsocketSession).toHaveBeenCalled();
      });
    });

    describe("handleDefaultRoute", () => {
      it("should return HTML with correct replacements", async () => {
        const request = new Request("https://example.com");
        const url = new URL("https://example.com");

        // Mock the HTML import specifically for this test
        const mockTemplateHTML = `
          <html>
            <head>
              <link rel="preload" href="/live/\${codeSpace}/index.css" as="style">
              <script type="importmap">\${JSON.stringify(importMap)}</script>
            </head>
            <body>
              <style>/* criticalCss */</style>
              <div id="embed">\${html}</div>
            </body>
          </html>`;

        vi.doMock("@spike-npm-land/code", async () => {
          const originalModule = await import("@spike-npm-land/code");
          return {
            ...originalModule,
            HTML: mockTemplateHTML,
            importMap: { imports: { "test": "test.js" } },
          };
        });

        // Re-initialize RouteHandler to use the mocked HTML
        const testRouteHandler = new RouteHandler(mockCode as Code);
        const response = await testRouteHandler.handleRoute(request, url, [""]);

        expect(response.status).toBe(200);
        const responseText = await response.text();

        // Assert that placeholders are replaced
        expect(responseText).toContain(`href="/live/test-space/index.css"`);
        expect(responseText).toContain(`mock css`); // CSS is embedded directly
        expect(responseText).toContain(`<div id="embed">mock html</div>`);
        // The import map should contain the actual imports from the module
        expect(responseText).toMatch(/\{"imports":\{.*\}\}/); // Just check for valid import map format

        // Test passes - HTML structure is correct

        vi.doUnmock("@spike-npm-land/code"); // Clean up mock
      });
    });

    describe("handleJsRoute", () => {
      it("should return transpiled JS with correct headers", async () => {
        const request = new Request("https://example.com/index.js");
        const url = new URL("https://example.com/index.js");

        const response = await routeHandler.handleRoute(request, url, [
          "index.js",
        ]);

        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Type")).toBe(
          "application/javascript; charset=UTF-8",
        );
      });
    });

    describe("handleCssRoute", () => {
      it("should return CSS with correct headers", async () => {
        const request = new Request("https://example.com/index.css");
        const url = new URL("https://example.com/index.css");

        const response = await routeHandler.handleRoute(request, url, [
          "index.css",
        ]);

        expect(response.status).toBe(200);
        expect(await response.text()).toBe("mock css");
        expect(response.headers.get("Content-Type")).toBe(
          "text/css; charset=UTF-8",
        );
      });
    });

    describe("handleVersionRoute", () => {
      it("should return 400 for missing version number", async () => {
        const request = new Request("https://example.com/version");
        const url = new URL("https://example.com/version");

        const response = await routeHandler.handleRoute(request, url, [
          "version",
        ]);

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body).toEqual({ error: "Version number required" });
      });

      it("should return 400 for invalid version number", async () => {
        const request = new Request("https://example.com/version/invalid");
        const url = new URL("https://example.com/version/invalid");

        const response = await routeHandler.handleRoute(request, url, [
          "version",
          "invalid",
        ]);

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body).toEqual({ error: "Invalid version number" });
      });

      it("should return 400 for version number less than 1", async () => {
        const request = new Request("https://example.com/version/0");
        const url = new URL("https://example.com/version/0");

        const response = await routeHandler.handleRoute(request, url, [
          "version",
          "0",
        ]);

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body).toEqual({ error: "Invalid version number" });
      });

      it("should return 404 for version not found", async () => {
        // Add getVersion mock that returns null
        (mockCode.getVersion as ReturnType<typeof vi.fn>) = vi.fn().mockResolvedValue(null);

        const request = new Request("https://example.com/version/1");
        const url = new URL("https://example.com/version/1");

        const routeHandlerWithVersionMock = new RouteHandler(mockCode as Code);
        const response = await routeHandlerWithVersionMock.handleRoute(request, url, [
          "version",
          "1",
        ]);

        expect(response.status).toBe(404);
        const body = await response.json();
        expect(body).toEqual({ error: "Version not found" });
      });

      it("should return 404 for invalid version sub-route", async () => {
        // Add getVersion mock
        (mockCode.getVersion as ReturnType<typeof vi.fn>) = vi.fn().mockResolvedValue({
          versionNumber: 1,
          code: "test code",
          transpiled: "test transpiled",
          css: "test css",
          html: "test html",
          timestamp: Date.now(),
        });

        const request = new Request("https://example.com/version/1/invalid");
        const url = new URL("https://example.com/version/1/invalid");

        const routeHandlerWithVersionMock = new RouteHandler(mockCode as Code);
        const response = await routeHandlerWithVersionMock.handleRoute(request, url, [
          "version",
          "1",
          "invalid",
        ]);

        expect(response.status).toBe(404);
      });
    });

    describe("handleVersionsRoute", () => {
      it("should return versions list", async () => {
        // Add getVersionsList and getVersionCount mocks
        (mockCode.getVersionsList as ReturnType<typeof vi.fn>) = vi.fn().mockResolvedValue([
          { versionNumber: 1, timestamp: Date.now(), codeLength: 100 },
        ]);
        (mockCode.getVersionCount as ReturnType<typeof vi.fn>) = vi.fn().mockReturnValue(1);

        const request = new Request("https://example.com/versions");
        const url = new URL("https://example.com/versions");

        const routeHandlerWithVersionsMock = new RouteHandler(mockCode as Code);
        const response = await routeHandlerWithVersionsMock.handleRoute(request, url, [
          "versions",
        ]);

        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Type")).toBe("application/json");
        const body = await response.json();
        expect(body).toHaveProperty("codeSpace", "test-space");
        expect(body).toHaveProperty("versionCount", 1);
        expect(body).toHaveProperty("versions");
        expect(body.versions).toHaveLength(1);
      });
    });
  });
});
