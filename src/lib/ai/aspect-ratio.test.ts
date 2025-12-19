import { describe, expect, it } from "vitest";
import {
  detectAspectRatio,
  getAspectRatioValue,
  isValidAspectRatio,
  SUPPORTED_ASPECT_RATIOS,
} from "./aspect-ratio";

describe("aspect-ratio", () => {
  describe("SUPPORTED_ASPECT_RATIOS", () => {
    it("should contain all expected ratios", () => {
      expect(SUPPORTED_ASPECT_RATIOS).toEqual([
        "1:1",
        "3:2",
        "2:3",
        "3:4",
        "4:3",
        "4:5",
        "5:4",
        "9:16",
        "16:9",
        "21:9",
      ]);
    });
  });

  describe("detectAspectRatio", () => {
    it("should detect 1:1 ratio for square images", () => {
      expect(detectAspectRatio(1024, 1024)).toBe("1:1");
      expect(detectAspectRatio(500, 500)).toBe("1:1");
    });

    it("should detect 16:9 ratio for widescreen images", () => {
      expect(detectAspectRatio(1920, 1080)).toBe("16:9");
      expect(detectAspectRatio(1280, 720)).toBe("16:9");
    });

    it("should detect 9:16 ratio for portrait widescreen images", () => {
      expect(detectAspectRatio(1080, 1920)).toBe("9:16");
      expect(detectAspectRatio(720, 1280)).toBe("9:16");
    });

    it("should detect 4:3 ratio", () => {
      expect(detectAspectRatio(1600, 1200)).toBe("4:3");
      expect(detectAspectRatio(800, 600)).toBe("4:3");
    });

    it("should detect 3:4 ratio", () => {
      expect(detectAspectRatio(1200, 1600)).toBe("3:4");
      expect(detectAspectRatio(600, 800)).toBe("3:4");
    });

    it("should detect 4:5 ratio", () => {
      expect(detectAspectRatio(480, 600)).toBe("4:5");
      expect(detectAspectRatio(800, 1000)).toBe("4:5");
    });

    it("should detect 5:4 ratio", () => {
      expect(detectAspectRatio(600, 480)).toBe("5:4");
      expect(detectAspectRatio(1000, 800)).toBe("5:4");
    });

    it("should detect 3:2 ratio", () => {
      expect(detectAspectRatio(1500, 1000)).toBe("3:2");
      expect(detectAspectRatio(900, 600)).toBe("3:2");
    });

    it("should detect 2:3 ratio", () => {
      expect(detectAspectRatio(1000, 1500)).toBe("2:3");
      expect(detectAspectRatio(600, 900)).toBe("2:3");
    });

    it("should detect 21:9 ultra-wide ratio", () => {
      expect(detectAspectRatio(2520, 1080)).toBe("21:9");
      expect(detectAspectRatio(3440, 1440)).toBe("21:9");
    });

    it("should return closest ratio for non-exact matches", () => {
      // Close to 16:9 but slightly off
      expect(detectAspectRatio(1920, 1090)).toBe("16:9");
      // Close to 1:1 but slightly off
      expect(detectAspectRatio(1024, 1030)).toBe("1:1");
    });

    it("should return 1:1 for invalid dimensions", () => {
      expect(detectAspectRatio(0, 100)).toBe("1:1");
      expect(detectAspectRatio(100, 0)).toBe("1:1");
      expect(detectAspectRatio(-100, 100)).toBe("1:1");
      expect(detectAspectRatio(100, -100)).toBe("1:1");
    });
  });

  describe("isValidAspectRatio", () => {
    it("should return true for valid ratios", () => {
      expect(isValidAspectRatio("1:1")).toBe(true);
      expect(isValidAspectRatio("16:9")).toBe(true);
      expect(isValidAspectRatio("9:16")).toBe(true);
      expect(isValidAspectRatio("4:3")).toBe(true);
      expect(isValidAspectRatio("3:4")).toBe(true);
      expect(isValidAspectRatio("21:9")).toBe(true);
    });

    it("should return false for invalid ratios", () => {
      expect(isValidAspectRatio("5:3")).toBe(false);
      expect(isValidAspectRatio("invalid")).toBe(false);
      expect(isValidAspectRatio("")).toBe(false);
      expect(isValidAspectRatio("16-9")).toBe(false);
      expect(isValidAspectRatio("1.777")).toBe(false);
    });
  });

  describe("getAspectRatioValue", () => {
    it("should return correct numeric value for 1:1", () => {
      expect(getAspectRatioValue("1:1")).toBe(1.0);
    });

    it("should return correct numeric value for 16:9", () => {
      expect(getAspectRatioValue("16:9")).toBeCloseTo(16 / 9, 5);
    });

    it("should return correct numeric value for 9:16", () => {
      expect(getAspectRatioValue("9:16")).toBeCloseTo(9 / 16, 5);
    });

    it("should return correct numeric value for 4:3", () => {
      expect(getAspectRatioValue("4:3")).toBeCloseTo(4 / 3, 5);
    });

    it("should return correct numeric value for 3:2", () => {
      expect(getAspectRatioValue("3:2")).toBe(1.5);
    });

    it("should return correct numeric value for 21:9", () => {
      expect(getAspectRatioValue("21:9")).toBeCloseTo(21 / 9, 5);
    });
  });
});
