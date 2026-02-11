import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BaseApiClient } from "./base-client.js";

// Concrete subclass for testing the protected request method
class TestClient extends BaseApiClient {
  async testRequest<T>(
    endpoint: string,
    method?: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    return this.request<T>(endpoint, method, body);
  }
}

describe("BaseApiClient", () => {
  const originalFetch = globalThis.fetch;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch;
    delete process.env.SPIKE_LAND_BASE_URL;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("throws when API key is empty", () => {
      expect(() => new TestClient("")).toThrow("API key is required");
    });

    it("uses default base URL when none provided", () => {
      const client = new TestClient("test-key");
      expect(client["baseUrl"]).toBe("https://spike.land");
    });

    it("uses provided base URL", () => {
      const client = new TestClient("test-key", "https://custom.example.com");
      expect(client["baseUrl"]).toBe("https://custom.example.com");
    });

    it("uses SPIKE_LAND_BASE_URL env var when set", () => {
      process.env.SPIKE_LAND_BASE_URL = "https://env.example.com";
      const client = new TestClient("test-key");
      expect(client["baseUrl"]).toBe("https://env.example.com");
    });

    it("prefers explicit base URL over env var", () => {
      process.env.SPIKE_LAND_BASE_URL = "https://env.example.com";
      const client = new TestClient("test-key", "https://explicit.example.com");
      expect(client["baseUrl"]).toBe("https://explicit.example.com");
    });
  });

  describe("request", () => {
    let client: TestClient;

    beforeEach(() => {
      client = new TestClient("sk_test_123", "https://api.test.com");
    });

    it("sends GET request with auth header", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: "test" }),
      });

      const result = await client.testRequest("/api/test");

      expect(mockFetch).toHaveBeenCalledWith("https://api.test.com/api/test", {
        method: "GET",
        headers: {
          Authorization: "Bearer sk_test_123",
          "Content-Type": "application/json",
        },
      });
      expect(result).toEqual({ data: "test" });
    });

    it("sends POST request with body", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await client.testRequest("/api/create", "POST", { name: "test" });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.com/api/create",
        {
          method: "POST",
          headers: {
            Authorization: "Bearer sk_test_123",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: "test" }),
        },
      );
    });

    it("throws error with API error message on failure", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ error: "Forbidden" }),
      });

      await expect(client.testRequest("/api/secret")).rejects.toThrow(
        "Forbidden",
      );
    });

    it("throws generic error when no error message in response", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      });

      await expect(client.testRequest("/api/broken")).rejects.toThrow(
        "Request failed with status 500",
      );
    });
  });
});
