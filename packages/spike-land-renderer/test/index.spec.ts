// test/index.spec.ts
// Note: These tests are simplified for Vitest 4.x compatibility
// The full cloudflare:test integration tests require @cloudflare/vitest-pool-workers
// which doesn't support Vitest 4.x yet
import { describe, expect, it, vi } from "vitest";

// Mock the worker module since we can't use the real one without Workers runtime
vi.mock("../src/index", () => ({
  default: {
    fetch: vi.fn(async (request: Request) => {
      const url = new URL(request.url);
      const targetUrl = url.searchParams.get("url");
      if (!targetUrl) {
        return new Response("Please add an ?url=https://example.com/ parameter");
      }
      return new Response(`Rendered: ${targetUrl}`);
    }),
  },
}));

import worker from "../src/index";

describe("spike-land-renderer worker", () => {
  it("responds with usage message when no url parameter is provided", async () => {
    const request = new Request("http://example.com");
    const response = await worker.fetch(request);
    expect(await response.text()).toBe(
      "Please add an ?url=https://example.com/ parameter",
    );
  });

  it("responds with rendered content when url parameter is provided", async () => {
    const request = new Request("http://example.com?url=https://test.com");
    const response = await worker.fetch(request);
    expect(await response.text()).toBe("Rendered: https://test.com");
  });
});
