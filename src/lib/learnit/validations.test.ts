import { describe, expect, it } from "vitest";
import { generateTopicSchema, learnItPathSchema, pathSegmentSchema } from "./validations";

describe("LearnIt Validations", () => {
  describe("pathSegmentSchema", () => {
    it("should accept valid segments", () => {
      expect(pathSegmentSchema.safeParse("react").success).toBe(true);
      expect(pathSegmentSchema.safeParse("react-hooks").success).toBe(true);
      expect(pathSegmentSchema.safeParse("101").success).toBe(true);
    });

    it("should reject invalid segments", () => {
      expect(pathSegmentSchema.safeParse("React").success).toBe(false); // Uppercase
      expect(pathSegmentSchema.safeParse("react_hooks").success).toBe(false); // Underscore
      expect(pathSegmentSchema.safeParse("a").success).toBe(false); // Too short
    });
  });

  describe("learnItPathSchema", () => {
    it("should accept valid paths", () => {
      expect(learnItPathSchema.safeParse(["programming", "javascript"]).success).toBe(true);
    });

    it("should reject excessive depth", () => {
      const longPath = Array(11).fill("test");
      expect(learnItPathSchema.safeParse(longPath).success).toBe(false);
    });
  });

  describe("generateTopicSchema", () => {
    it("should parse valid input", () => {
      const input = { path: ["programming", "react"] };
      expect(generateTopicSchema.safeParse(input).success).toBe(true);
    });
  });
});
