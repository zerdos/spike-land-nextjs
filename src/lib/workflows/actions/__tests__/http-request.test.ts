import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { httpRequestAction } from "../http-request";

global.fetch = vi.fn();

describe("httpRequestAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should validate valid input", () => {
    const input = {
      url: "https://api.example.com/data",
      method: "GET" as const,
    };
    expect(() => httpRequestAction.validate(input)).not.toThrow();
  });

  it("should throw on invalid input", () => {
    const input = {
      url: "not-a-url",
      method: "GET",
    };
    expect(() => httpRequestAction.validate(input as any)).toThrow();
  });

  it("should execute a successful GET request", async () => {
    const mockResponse = { id: 1, name: "Test" };
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse,
      headers: new Headers({ "content-type": "application/json" }),
    });

    const input = {
      url: "https://api.example.com/data",
      method: "GET" as const,
    };

    const result = await httpRequestAction.execute(input);

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.example.com/data",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      })
    );
    expect(result.success).toBe(true);
    expect(result.status).toBe(200);
    expect(result.data).toEqual(mockResponse);
  });

  it("should handle request failure", async () => {
     (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "Internal Server Error" }),
      headers: new Headers(),
    });

    const input = {
      url: "https://api.example.com/error",
      method: "GET" as const,
    };

    const result = await httpRequestAction.execute(input);
    expect(result.success).toBe(false);
    expect(result.status).toBe(500);
  });
});
