import { describe, expect, it } from "vitest";
import {
  cursorBlinkAnimation,
  fadeScaleVariants,
  gestures,
  progressBarAnimation,
  scalePopVariants,
  slideDownVariants,
  slideUpVariants,
  staggerDelay,
  subtleSlideUpVariants,
  transitions,
} from "./animation-variants";

describe("animation-variants", () => {
  describe("fadeScaleVariants", () => {
    it("should have correct initial state", () => {
      expect(fadeScaleVariants["initial"]).toEqual({ opacity: 0, scale: 0.95 });
    });

    it("should have correct animate state", () => {
      expect(fadeScaleVariants["animate"]).toEqual({ opacity: 1, scale: 1 });
    });

    it("should have correct exit state", () => {
      expect(fadeScaleVariants["exit"]).toEqual({ opacity: 0, scale: 0.95 });
    });
  });

  describe("slideUpVariants", () => {
    it("should have correct initial state with y offset", () => {
      expect(slideUpVariants["initial"]).toEqual({ opacity: 0, y: 20 });
    });

    it("should animate to visible position", () => {
      expect(slideUpVariants["animate"]).toEqual({ opacity: 1, y: 0 });
    });

    it("should exit upward", () => {
      expect(slideUpVariants["exit"]).toEqual({ opacity: 0, y: -20 });
    });
  });

  describe("slideDownVariants", () => {
    it("should have correct initial state from above", () => {
      expect(slideDownVariants["initial"]).toEqual({ opacity: 0, y: -20 });
    });

    it("should animate to visible position", () => {
      expect(slideDownVariants["animate"]).toEqual({ opacity: 1, y: 0 });
    });

    it("should exit downward", () => {
      expect(slideDownVariants["exit"]).toEqual({ opacity: 0, y: 20 });
    });
  });

  describe("subtleSlideUpVariants", () => {
    it("should have smaller y offset than slideUpVariants", () => {
      expect(subtleSlideUpVariants["initial"]).toEqual({ opacity: 0, y: 10 });
    });

    it("should have smaller exit offset", () => {
      expect(subtleSlideUpVariants["exit"]).toEqual({ opacity: 0, y: -10 });
    });
  });

  describe("scalePopVariants", () => {
    it("should start with half scale", () => {
      expect(scalePopVariants["initial"]).toEqual({ opacity: 0, scale: 0.5 });
    });

    it("should animate to full scale", () => {
      expect(scalePopVariants["animate"]).toEqual({ opacity: 1, scale: 1 });
    });
  });

  describe("transitions", () => {
    it("should have standard duration of 0.3s", () => {
      expect(transitions.standard.duration).toBe(0.3);
    });

    it("should have quick duration of 0.2s", () => {
      expect(transitions.quick.duration).toBe(0.2);
    });

    it("should have slow duration of 0.5s", () => {
      expect(transitions.slow.duration).toBe(0.5);
    });

    it("should have smooth transition with easeOut", () => {
      expect(transitions.smooth).toEqual({ duration: 0.5, ease: "easeOut" });
    });

    it("should have spring configuration", () => {
      expect(transitions.spring).toEqual({
        type: "spring",
        stiffness: 300,
        damping: 20,
      });
    });
  });

  describe("gestures", () => {
    it("should have standard hover scale", () => {
      expect(gestures.hoverScale).toEqual({ scale: 1.05 });
    });

    it("should have larger hover scale variant", () => {
      expect(gestures.hoverScaleLarge).toEqual({ scale: 1.1 });
    });

    it("should have tap press effect", () => {
      expect(gestures.tap).toEqual({ scale: 0.95 });
    });

    it("should have subtle tap for small buttons", () => {
      expect(gestures.tapSubtle).toEqual({ scale: 0.98 });
    });
  });

  describe("staggerDelay", () => {
    it("should return zero delay for first item", () => {
      expect(staggerDelay(0)).toEqual({ delay: 0 });
    });

    it("should calculate correct delay with default multiplier", () => {
      expect(staggerDelay(1)).toEqual({ delay: 0.1 });
      expect(staggerDelay(2)).toEqual({ delay: 0.2 });
      expect(staggerDelay(5)).toEqual({ delay: 0.5 });
    });

    it("should use custom base delay", () => {
      expect(staggerDelay(1, 0.2)).toEqual({ delay: 0.2 });
      // Use toBeCloseTo for floating point precision
      expect(staggerDelay(3, 0.05).delay).toBeCloseTo(0.15);
    });
  });

  describe("progressBarAnimation", () => {
    it("should start with zero width", () => {
      expect(progressBarAnimation.initial).toEqual({ width: 0 });
    });

    it("should have easeOut transition", () => {
      expect(progressBarAnimation.transition).toEqual({
        duration: 1.5,
        ease: "easeOut",
      });
    });
  });

  describe("cursorBlinkAnimation", () => {
    it("should animate opacity between visible and invisible", () => {
      expect(cursorBlinkAnimation.animate).toEqual({ opacity: [1, 0] });
    });

    it("should repeat infinitely", () => {
      expect(cursorBlinkAnimation.transition).toEqual({
        duration: 0.5,
        repeat: Infinity,
      });
    });
  });
});
