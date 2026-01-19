/**
 * App Factory Types Tests
 *
 * Tests for the utility functions and constants exported from app-factory types.
 */

import { describe, expect, it } from "vitest";
import {
  ALL_PHASES,
  getAppLiveUrl,
  getStatusColor,
  LIVE_URL_BASE,
  PHASE_CONFIG,
  PHASES_ORDERED,
  THIS_PROJECT_SOURCE,
} from "./app-factory";

describe("getStatusColor", () => {
  describe("default styling (attempts = 0)", () => {
    it("returns default border for 0 attempts", () => {
      const result = getStatusColor(0);
      expect(result.border).toBe("border-border");
      expect(result.bg).toBe("");
    });
  });

  describe("amber styling (attempts = 1-2)", () => {
    it("returns amber border for 1 attempt", () => {
      const result = getStatusColor(1);
      expect(result.border).toBe("border-amber-500");
      expect(result.bg).toBe("bg-amber-50 dark:bg-amber-900/30");
    });

    it("returns amber border for 2 attempts", () => {
      const result = getStatusColor(2);
      expect(result.border).toBe("border-amber-500");
      expect(result.bg).toBe("bg-amber-50 dark:bg-amber-900/30");
    });
  });

  describe("red styling (attempts >= 3)", () => {
    it("returns red border for 3 attempts", () => {
      const result = getStatusColor(3);
      expect(result.border).toBe("border-red-500");
      expect(result.bg).toBe("bg-red-50 dark:bg-red-900/30");
    });

    it("returns red border for high attempt counts", () => {
      const result = getStatusColor(10);
      expect(result.border).toBe("border-red-500");
      expect(result.bg).toBe("bg-red-50 dark:bg-red-900/30");
    });

    it("returns red border for very high attempt counts", () => {
      const result = getStatusColor(100);
      expect(result.border).toBe("border-red-500");
      expect(result.bg).toBe("bg-red-50 dark:bg-red-900/30");
    });
  });
});

describe("PHASE_CONFIG", () => {
  it("has configuration for all 7 phases", () => {
    const phases = Object.keys(PHASE_CONFIG);
    expect(phases).toHaveLength(7);
    expect(phases).toContain("plan");
    expect(phases).toContain("develop");
    expect(phases).toContain("test");
    expect(phases).toContain("debug");
    expect(phases).toContain("polish");
    expect(phases).toContain("complete");
    expect(phases).toContain("done");
  });

  it("each phase has required properties", () => {
    for (const [_phase, config] of Object.entries(PHASE_CONFIG)) {
      expect(config).toHaveProperty("label");
      expect(config).toHaveProperty("color");
      expect(config).toHaveProperty("bgColor");
      expect(config).toHaveProperty("emoji");
      expect(typeof config.label).toBe("string");
      expect(typeof config.color).toBe("string");
      expect(typeof config.bgColor).toBe("string");
      expect(typeof config.emoji).toBe("string");
      expect(config.label.length).toBeGreaterThan(0);
    }
  });

  it("has correct labels for each phase", () => {
    expect(PHASE_CONFIG.plan.label).toBe("Plan");
    expect(PHASE_CONFIG.develop.label).toBe("Develop");
    expect(PHASE_CONFIG.test.label).toBe("Test");
    expect(PHASE_CONFIG.debug.label).toBe("Debug");
    expect(PHASE_CONFIG.polish.label).toBe("Polish");
    expect(PHASE_CONFIG.complete.label).toBe("Complete");
    expect(PHASE_CONFIG.done.label).toBe("Done");
  });
});

describe("PHASES_ORDERED", () => {
  it("contains all 6 phases", () => {
    expect(PHASES_ORDERED).toHaveLength(6);
  });

  it("is in the correct pipeline order", () => {
    expect(PHASES_ORDERED).toEqual([
      "plan",
      "develop",
      "test",
      "debug",
      "polish",
      "complete",
    ]);
  });

  it("starts with plan and ends with complete", () => {
    expect(PHASES_ORDERED[0]).toBe("plan");
    expect(PHASES_ORDERED[PHASES_ORDERED.length - 1]).toBe("complete");
  });
});

describe("THIS_PROJECT_SOURCE", () => {
  it("matches the expected source identifier", () => {
    expect(THIS_PROJECT_SOURCE).toBe("sources/github/zerdos/spike-land-app-factory");
  });

  it("is a non-empty string", () => {
    expect(typeof THIS_PROJECT_SOURCE).toBe("string");
    expect(THIS_PROJECT_SOURCE.length).toBeGreaterThan(0);
  });
});

describe("ALL_PHASES", () => {
  it("contains all 7 phases", () => {
    expect(ALL_PHASES).toHaveLength(7);
  });

  it("is in the correct pipeline order including done", () => {
    expect(ALL_PHASES).toEqual([
      "plan",
      "develop",
      "test",
      "debug",
      "polish",
      "complete",
      "done",
    ]);
  });

  it("includes PHASES_ORDERED plus done", () => {
    expect(ALL_PHASES).toContain("done");
    for (const phase of PHASES_ORDERED) {
      expect(ALL_PHASES).toContain(phase);
    }
  });
});

describe("LIVE_URL_BASE", () => {
  it("is the correct base URL", () => {
    expect(LIVE_URL_BASE).toBe("https://testing.spike.land/live");
  });
});

describe("getAppLiveUrl", () => {
  it("constructs correct URL for app name", () => {
    expect(getAppLiveUrl("my-app")).toBe("https://testing.spike.land/live/my-app/index.ts");
  });

  it("handles app names with numbers", () => {
    expect(getAppLiveUrl("app-123")).toBe("https://testing.spike.land/live/app-123/index.ts");
  });

  it("handles simple app names", () => {
    expect(getAppLiveUrl("calculator")).toBe("https://testing.spike.land/live/calculator/index.ts");
  });
});
