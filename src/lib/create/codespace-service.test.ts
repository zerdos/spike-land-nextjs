import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateCodespaceId, getCodespaceUrl, updateCodespace } from "./codespace-service";

// Mock global fetch
const fetchMock = vi.fn();

describe("codespace-service", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("generateCodespaceId", () => {
    it("should generate consistent IDs", () => {
      expect(generateCodespaceId("cooking/pasta")).toBe("create-cooking-pasta");
    });

    it("should handle special characters", () => {
      expect(generateCodespaceId("my application!")).toBe("create-my-application");
    });

    it("should handle multi-part slugs", () => {
      expect(generateCodespaceId("cooking/pasta")).toBe("create-cooking-pasta");
    });
  });

  describe("getCodespaceUrl", () => {
    it("should return correct URL", () => {
      const id = "create-test";
      expect(getCodespaceUrl(id)).toContain(`/live/${id}/`);
    });
  });

  describe("updateCodespace", () => {
    it("should call API and return success", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const result = await updateCodespace("test-id", "console.log('hi')");

      expect(result.success).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/live/test-id/api/code"),
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ code: "console.log('hi')", run: true }),
        }),
      );
    });

    it("should handle API failure", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "Error",
        statusText: "Server Error",
      });

      const result = await updateCodespace("test-id", "code");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Server Error");
    });
  });
});
