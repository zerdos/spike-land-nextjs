import { describe, expect, it, vi } from "vitest";
import { httpRequestAction } from "./http-request";

global.fetch = vi.fn();

describe("httpRequestAction", () => {
  it("should execute a GET request", async () => {
    const mockResponse = { data: "test" };
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      text: () => Promise.resolve(JSON.stringify(mockResponse)),
    });

    const result = await httpRequestAction.execute({
      url: "https://api.example.com/data",
      method: "GET",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.example.com/data",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("should handle request failure", async () => {
    (global.fetch as any).mockRejectedValue(new Error("Network Error"));

    const result = await httpRequestAction.execute({
      url: "https://api.example.com/fail",
      method: "GET",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Network Error");
  });
});
