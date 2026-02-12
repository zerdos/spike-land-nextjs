import { describe, expect, it, vi } from "vitest";

// Mock dependencies before importing the module under test
const { mockTranspileCode, mockUpsertSession } = vi.hoisted(() => ({
  mockTranspileCode: vi.fn(),
  mockUpsertSession: vi.fn(),
}));

vi.mock("@/lib/codespace/transpile", () => ({
  transpileCode: mockTranspileCode,
}));

vi.mock("@/lib/codespace/session-service", () => ({
  upsertSession: mockUpsertSession,
}));

vi.mock("@/lib/logger", () => ({
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { generateCodespaceId, getCodespaceUrl, updateCodespace } from "./codespace-service";

describe("codespace-service", () => {
  describe("generateCodespaceId", () => {
    it("should generate consistent IDs for same input", () => {
      const id1 = generateCodespaceId("cooking/pasta");
      const id2 = generateCodespaceId("cooking/pasta");
      expect(id1).toBe(id2);
    });

    it("should generate IDs with at most 2 hyphen-separated parts", () => {
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
      expect(getCodespaceUrl(id)).toBe(`/api/codespace/${id}/embed`);
    });
  });

  describe("updateCodespace", () => {
    it("should call API and return success", async () => {
      mockTranspileCode.mockResolvedValueOnce("transpiled-code");
      mockUpsertSession.mockResolvedValueOnce(undefined);
      const fetchSpy = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal("fetch", fetchSpy);

      const result = await updateCodespace("test-id", "console.log('hi')");

      expect(result.success).toBe(true);
      expect(mockTranspileCode).toHaveBeenCalledWith("console.log('hi')", "https://spike.land");
      expect(mockUpsertSession).toHaveBeenCalledWith({
        codeSpace: "test-id",
        code: "console.log('hi')",
        transpiled: "transpiled-code",
        html: "",
        css: "",
        messages: [],
      });
      
      // Wait for background sync
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(fetchSpy).toHaveBeenCalledWith(
        "https://testing.spike.land/api-v1/test-id/code",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ code: "console.log('hi')", run: true }),
        })
      );
      vi.unstubAllGlobals();
    });

    it("should handle API failure", async () => {
      mockTranspileCode.mockRejectedValueOnce(new Error("Transpilation failed"));

      const result = await updateCodespace("test-id", "code");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Transpilation failed");
    });
  });
});
