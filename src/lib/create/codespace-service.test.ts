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
    it("should generate consistent IDs for same input", () => {
      const id1 = generateCodespaceId("cooking/pasta");
      const id2 = generateCodespaceId("cooking/pasta");
      expect(id1).toBe(id2);
    });

    it("should generate IDs with at most 2 hyphen-separated parts", () => {
      // Backend requires codeSpace.split("-").length <= 2
      const id = generateCodespaceId("framer-motion-example");
      const parts = id.split("-");
      expect(parts.length).toBeLessThanOrEqual(2);
      expect(id).toMatch(/^c-[a-f0-9]{8}$/);
    });

    it("should generate different IDs for different inputs", () => {
      const id1 = generateCodespaceId("cooking/pasta");
      const id2 = generateCodespaceId("weather-app");
      expect(id1).not.toBe(id2);
    });

    it("should handle special characters consistently", () => {
      const id = generateCodespaceId("my application!");
      expect(id).toMatch(/^c-[a-f0-9]{8}$/);
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
