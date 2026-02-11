import { describe, expect, it } from "vitest";
import {
  MODEL_PRICING,
  calculateGenerationCost,
  calculateTokenCost,
} from "./cost-calculator";

describe("cost-calculator", () => {
  describe("MODEL_PRICING", () => {
    it("should have pricing for opus, sonnet, and haiku", () => {
      expect(MODEL_PRICING).toHaveProperty("opus");
      expect(MODEL_PRICING).toHaveProperty("sonnet");
      expect(MODEL_PRICING).toHaveProperty("haiku");
    });

    it("should have inputPer1M, outputPer1M, and cachedPer1M for each model", () => {
      for (const model of Object.values(MODEL_PRICING)) {
        expect(model).toHaveProperty("inputPer1M");
        expect(model).toHaveProperty("outputPer1M");
        expect(model).toHaveProperty("cachedPer1M");
        expect(model.inputPer1M).toBeGreaterThan(0);
        expect(model.outputPer1M).toBeGreaterThan(0);
        expect(model.cachedPer1M).toBeGreaterThan(0);
      }
    });
  });

  describe("calculateTokenCost", () => {
    it("should calculate opus pricing correctly", () => {
      const result = calculateTokenCost({
        model: "opus",
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      });
      expect(result.inputCost).toBe(15.0);
      expect(result.outputCost).toBe(75.0);
      expect(result.cachedCost).toBe(0);
      expect(result.totalCost).toBe(90.0);
    });

    it("should calculate sonnet pricing correctly", () => {
      const result = calculateTokenCost({
        model: "sonnet",
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      });
      expect(result.inputCost).toBe(3.0);
      expect(result.outputCost).toBe(15.0);
      expect(result.totalCost).toBe(18.0);
    });

    it("should calculate haiku pricing correctly", () => {
      const result = calculateTokenCost({
        model: "haiku",
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      });
      expect(result.inputCost).toBe(0.25);
      expect(result.outputCost).toBe(1.25);
      expect(result.totalCost).toBe(1.5);
    });

    it("should handle cached tokens", () => {
      const result = calculateTokenCost({
        model: "opus",
        inputTokens: 500_000,
        outputTokens: 100_000,
        cachedTokens: 200_000,
      });
      expect(result.inputCost).toBeCloseTo(7.5);
      expect(result.outputCost).toBeCloseTo(7.5);
      expect(result.cachedCost).toBeCloseTo(0.375);
      expect(result.totalCost).toBeCloseTo(15.375);
    });

    it("should return zero costs for zero tokens", () => {
      const result = calculateTokenCost({
        model: "opus",
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
      });
      expect(result.totalCost).toBe(0);
      expect(result.inputCost).toBe(0);
      expect(result.outputCost).toBe(0);
      expect(result.cachedCost).toBe(0);
    });

    it("should default cachedTokens to 0 when not provided", () => {
      const result = calculateTokenCost({
        model: "haiku",
        inputTokens: 1000,
        outputTokens: 500,
      });
      expect(result.cachedCost).toBe(0);
    });

    it("should use haiku pricing as fallback for unknown model", () => {
      const unknown = calculateTokenCost({
        model: "unknown-model",
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      });
      const haiku = calculateTokenCost({
        model: "haiku",
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      });
      expect(unknown.totalCost).toBe(haiku.totalCost);
    });

    it("should be case-insensitive for model names", () => {
      const upper = calculateTokenCost({
        model: "OPUS",
        inputTokens: 1000,
        outputTokens: 500,
      });
      const lower = calculateTokenCost({
        model: "opus",
        inputTokens: 1000,
        outputTokens: 500,
      });
      expect(upper.totalCost).toBe(lower.totalCost);
    });

    it("should calculate fractional token costs accurately", () => {
      const result = calculateTokenCost({
        model: "sonnet",
        inputTokens: 1500,
        outputTokens: 750,
      });
      // 1500/1M * 3.0 = 0.0045
      // 750/1M * 15.0 = 0.01125
      expect(result.inputCost).toBeCloseTo(0.0045);
      expect(result.outputCost).toBeCloseTo(0.01125);
      expect(result.totalCost).toBeCloseTo(0.01575);
    });
  });

  describe("calculateGenerationCost", () => {
    it("should aggregate costs from multiple model usages", () => {
      const result = calculateGenerationCost([
        { model: "opus", inputTokens: 10000, outputTokens: 5000 },
        { model: "sonnet", inputTokens: 8000, outputTokens: 3000 },
        { model: "haiku", inputTokens: 2000, outputTokens: 1000 },
      ]);
      expect(result.totalCost).toBeGreaterThan(0);
      expect(result.breakdownByModel).toHaveProperty("opus");
      expect(result.breakdownByModel).toHaveProperty("sonnet");
      expect(result.breakdownByModel).toHaveProperty("haiku");
    });

    it("should merge multiple usages of the same model", () => {
      const result = calculateGenerationCost([
        { model: "sonnet", inputTokens: 5000, outputTokens: 2000 },
        { model: "sonnet", inputTokens: 3000, outputTokens: 1000 },
      ]);
      expect(Object.keys(result.breakdownByModel)).toHaveLength(1);
      expect(result.breakdownByModel["sonnet"]).toBeDefined();

      const singleCall = calculateTokenCost({
        model: "sonnet",
        inputTokens: 8000,
        outputTokens: 3000,
      });
      expect(result.breakdownByModel["sonnet"]!.totalCost).toBeCloseTo(
        singleCall.totalCost,
      );
    });

    it("should return zero cost for empty usages array", () => {
      const result = calculateGenerationCost([]);
      expect(result.totalCost).toBe(0);
      expect(Object.keys(result.breakdownByModel)).toHaveLength(0);
    });

    it("should handle typical generation pattern (opus + sonnet fix + haiku learning)", () => {
      const result = calculateGenerationCost([
        { model: "opus", inputTokens: 50000, outputTokens: 10000 },
        { model: "sonnet", inputTokens: 20000, outputTokens: 5000 },
        { model: "haiku", inputTokens: 5000, outputTokens: 2000 },
      ]);

      // Verify each model's contribution is reasonable
      expect(result.breakdownByModel["opus"]!.totalCost).toBeGreaterThan(
        result.breakdownByModel["sonnet"]!.totalCost,
      );
      expect(result.breakdownByModel["sonnet"]!.totalCost).toBeGreaterThan(
        result.breakdownByModel["haiku"]!.totalCost,
      );
    });
  });
});
