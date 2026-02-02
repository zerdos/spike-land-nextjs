import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { httpRequestAction } from "./http-request";

describe("httpRequestAction", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should make a successful GET request", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ message: "success" }),
      forEach: (cb: (value: string, key: string) => void) => {
        cb("application/json", "content-type");
      },
    });

    const result = await httpRequestAction.execute({
      url: "https://api.example.com/data",
      method: "GET",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ message: "success" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/data",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("should handle request errors", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers(),
      text: async () => "Internal Server Error",
      forEach: () => {},
    });

    try {
      await httpRequestAction.execute({
        url: "https://api.example.com/error",
        method: "GET",
      });
    } catch {
      // The action catches errors internally and returns success: false
    }

    // Actually the action implementation catches errors.
    const result = await httpRequestAction.execute({
      url: "https://api.example.com/error",
      method: "GET",
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe(0);
  });

  it("should validate input", () => {
    expect(() => {
      httpRequestAction.validate({
        url: "not-a-url",
        method: "GET",
      });
    }).toThrow();
  });
});
