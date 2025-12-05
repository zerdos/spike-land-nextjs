import { describe, expect, it } from "vitest";
import { calculateOptimalLayout, getCommonGridConfig } from "./layout-optimizer";

describe("calculateOptimalLayout", () => {
  it("should calculate optimal layout for single client", () => {
    const layout = calculateOptimalLayout({
      displayWidth: 1920,
      displayHeight: 1080,
      numClients: 1,
      videoAspectRatio: 16 / 9,
      minCellPadding: 8,
    });

    expect(layout.rows).toBe(1);
    expect(layout.cols).toBe(1);
    expect(layout.cellWidth).toBe(1920);
    expect(layout.cellHeight).toBe(1080);
    expect(layout.videoWidth).toBeGreaterThan(0);
    expect(layout.videoHeight).toBeGreaterThan(0);
    expect(layout.totalArea).toBeGreaterThan(0);
  });

  it("should calculate optimal layout for multiple clients", () => {
    const layout = calculateOptimalLayout({
      displayWidth: 1920,
      displayHeight: 1080,
      numClients: 4,
      videoAspectRatio: 16 / 9,
      minCellPadding: 8,
    });

    expect(layout.rows).toBeGreaterThan(0);
    expect(layout.cols).toBeGreaterThan(0);
    expect(layout.rows * layout.cols).toBeGreaterThanOrEqual(4);
    expect(layout.totalArea).toBeGreaterThan(0);
  });

  it("should return zero layout for zero clients", () => {
    const layout = calculateOptimalLayout({
      displayWidth: 1920,
      displayHeight: 1080,
      numClients: 0,
      videoAspectRatio: 16 / 9,
      minCellPadding: 8,
    });

    expect(layout.rows).toBe(0);
    expect(layout.cols).toBe(0);
    expect(layout.cellWidth).toBe(0);
    expect(layout.cellHeight).toBe(0);
    expect(layout.videoWidth).toBe(0);
    expect(layout.videoHeight).toBe(0);
    expect(layout.totalArea).toBe(0);
  });

  it("should return zero layout for negative clients", () => {
    const layout = calculateOptimalLayout({
      displayWidth: 1920,
      displayHeight: 1080,
      numClients: -5,
      videoAspectRatio: 16 / 9,
      minCellPadding: 8,
    });

    expect(layout.rows).toBe(0);
    expect(layout.cols).toBe(0);
    expect(layout.totalArea).toBe(0);
  });

  it("should use default aspect ratio when not provided", () => {
    const layout = calculateOptimalLayout({
      displayWidth: 1920,
      displayHeight: 1080,
      numClients: 1,
    });

    expect(layout.totalArea).toBeGreaterThan(0);
    expect(layout.rows).toBe(1);
    expect(layout.cols).toBe(1);
  });

  it("should use default padding when not provided", () => {
    const layout = calculateOptimalLayout({
      displayWidth: 1920,
      displayHeight: 1080,
      numClients: 1,
      videoAspectRatio: 16 / 9,
    });

    expect(layout.totalArea).toBeGreaterThan(0);
    // Video dimensions should be less than cell dimensions due to default padding
    expect(layout.videoWidth).toBeLessThan(layout.cellWidth);
  });

  it("should handle wide aspect ratio (cell wider than video)", () => {
    const layout = calculateOptimalLayout({
      displayWidth: 3840, // Very wide
      displayHeight: 1080,
      numClients: 1,
      videoAspectRatio: 16 / 9,
      minCellPadding: 8,
    });

    expect(layout.videoHeight).toBe(1080 - 8 * 2); // Constrained by height
    expect(layout.videoWidth).toBe(layout.videoHeight * (16 / 9));
  });

  it("should handle tall aspect ratio (cell taller than video)", () => {
    const layout = calculateOptimalLayout({
      displayWidth: 1080,
      displayHeight: 1920, // Very tall
      numClients: 1,
      videoAspectRatio: 16 / 9,
      minCellPadding: 8,
    });

    expect(layout.videoWidth).toBe(1080 - 8 * 2); // Constrained by width
    expect(layout.videoHeight).toBe(layout.videoWidth / (16 / 9));
  });

  it("should handle large number of clients", () => {
    const layout = calculateOptimalLayout({
      displayWidth: 1920,
      displayHeight: 1080,
      numClients: 16,
      videoAspectRatio: 16 / 9,
      minCellPadding: 8,
    });

    expect(layout.rows * layout.cols).toBeGreaterThanOrEqual(16);
    expect(layout.totalArea).toBeGreaterThan(0);
  });

  it("should handle different aspect ratios", () => {
    const layout = calculateOptimalLayout({
      displayWidth: 1920,
      displayHeight: 1080,
      numClients: 4,
      videoAspectRatio: 4 / 3, // Different aspect ratio
      minCellPadding: 8,
    });

    expect(layout.rows).toBeGreaterThan(0);
    expect(layout.cols).toBeGreaterThan(0);
    expect(layout.totalArea).toBeGreaterThan(0);
  });

  it("should skip configurations with negative usable dimensions", () => {
    const layout = calculateOptimalLayout({
      displayWidth: 100,
      displayHeight: 100,
      numClients: 100, // Many clients in small space
      videoAspectRatio: 16 / 9,
      minCellPadding: 50, // Large padding
    });

    // Should still return a valid layout (fallback or best available)
    expect(layout.rows).toBeGreaterThan(0);
    expect(layout.cols).toBeGreaterThan(0);
  });

  it("should maximize total video area", () => {
    const layout1 = calculateOptimalLayout({
      displayWidth: 1920,
      displayHeight: 1080,
      numClients: 3,
      videoAspectRatio: 16 / 9,
      minCellPadding: 8,
    });

    // For 3 clients, 1x3 should be better than 3x1 for a 16:9 display
    expect(layout1.totalArea).toBeGreaterThan(0);
  });

  it("should return fallback layout when bestLayout is null", () => {
    // This is a edge case - extremely constrained scenario
    const layout = calculateOptimalLayout({
      displayWidth: 10,
      displayHeight: 10,
      numClients: 1,
      videoAspectRatio: 16 / 9,
      minCellPadding: 100, // Padding larger than display
    });

    // Should return fallback layout
    expect(layout.rows).toBe(1);
    expect(layout.cols).toBe(1);
    expect(layout.cellWidth).toBe(10);
    expect(layout.cellHeight).toBe(10);
  });
});

describe("getCommonGridConfig", () => {
  it("should return 1x1 for 1 client", () => {
    const config = getCommonGridConfig(1);
    expect(config.rows).toBe(1);
    expect(config.cols).toBe(1);
  });

  it("should return 1x2 for 2 clients", () => {
    const config = getCommonGridConfig(2);
    expect(config.rows).toBe(1);
    expect(config.cols).toBe(2);
  });

  it("should return 1x3 for 3 clients", () => {
    const config = getCommonGridConfig(3);
    expect(config.rows).toBe(1);
    expect(config.cols).toBe(3);
  });

  it("should return 2x2 for 4 clients", () => {
    const config = getCommonGridConfig(4);
    expect(config.rows).toBe(2);
    expect(config.cols).toBe(2);
  });

  it("should return 2x3 for 5 clients", () => {
    const config = getCommonGridConfig(5);
    expect(config.rows).toBe(2);
    expect(config.cols).toBe(3);
  });

  it("should return 2x3 for 6 clients", () => {
    const config = getCommonGridConfig(6);
    expect(config.rows).toBe(2);
    expect(config.cols).toBe(3);
  });

  it("should return 3x3 for 9 clients", () => {
    const config = getCommonGridConfig(9);
    expect(config.rows).toBe(3);
    expect(config.cols).toBe(3);
  });

  it("should return 4x4 for 16 clients", () => {
    const config = getCommonGridConfig(16);
    expect(config.rows).toBe(4);
    expect(config.cols).toBe(4);
  });

  it("should return 4x5 for 20 clients", () => {
    const config = getCommonGridConfig(20);
    expect(config.rows).toBe(4);
    expect(config.cols).toBe(5);
  });

  it("should calculate config for non-standard client count", () => {
    const config = getCommonGridConfig(11);
    // Should calculate based on square root
    expect(config.rows).toBeGreaterThan(0);
    expect(config.cols).toBeGreaterThan(0);
    expect(config.rows * config.cols).toBeGreaterThanOrEqual(11);
  });

  it("should handle edge cases", () => {
    const config = getCommonGridConfig(100);
    expect(config.rows).toBe(Math.ceil(Math.sqrt(100)));
    expect(config.cols).toBe(Math.ceil(100 / Math.ceil(Math.sqrt(100))));
  });

  it("should ensure grid can fit all clients", () => {
    for (let i = 1; i <= 25; i++) {
      const config = getCommonGridConfig(i);
      expect(config.rows * config.cols).toBeGreaterThanOrEqual(i);
    }
  });
});
