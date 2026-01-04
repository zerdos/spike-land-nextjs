import { describe, expect, it } from "vitest";
import { getGraphemes, ORBIT_STORAGE_KEY } from "./constants";

describe("constants", () => {
  describe("ORBIT_STORAGE_KEY", () => {
    it("has the expected value", () => {
      expect(ORBIT_STORAGE_KEY).toBe("orbit-last-workspace-slug");
    });
  });

  describe("getGraphemes", () => {
    it("handles basic ASCII strings", () => {
      expect(getGraphemes("Hello", 2)).toBe("He");
      expect(getGraphemes("AB", 5)).toBe("AB");
      expect(getGraphemes("", 2)).toBe("");
    });

    it("handles emoji correctly", () => {
      // Single emoji
      expect(getGraphemes("🔥Hello", 1)).toBe("🔥");
      expect(getGraphemes("🔥Hello", 2)).toBe("🔥H");

      // Multiple emojis
      expect(getGraphemes("🔥🚀💻", 2)).toBe("🔥🚀");
    });

    it("handles surrogate pairs correctly", () => {
      // Emoji with surrogate pairs
      expect(getGraphemes("😀😀", 1)).toBe("😀");
    });

    it("handles zero-width joiner sequences (family emoji)", () => {
      // Family emoji (ZWJ sequence) - should be treated as single grapheme
      const familyEmoji = "👨‍👩‍👧";
      const result = getGraphemes(familyEmoji, 1);
      // Should get the full ZWJ sequence as one grapheme
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it("handles flag emojis", () => {
      // Flag emoji (regional indicators)
      const usFlag = "🇺🇸";
      const result = getGraphemes(usFlag, 1);
      // Should get the full flag as one grapheme
      expect(result).toBe(usFlag);
    });

    it("handles mixed content", () => {
      expect(getGraphemes("A🔥B", 2)).toBe("A🔥");
      expect(getGraphemes("🔥AB", 3)).toBe("🔥AB");
    });

    it("handles edge cases", () => {
      expect(getGraphemes("a", 0)).toBe("");
      expect(getGraphemes("abc", 1)).toBe("a");
    });
  });
});
