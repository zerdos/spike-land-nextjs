/**
 * Scout Topic Monitor Tests
 *
 * Minimal test suite for the stub implementation.
 * Will be expanded when real implementation is added.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runTopicMonitoring } from "./topic-monitor";

describe("Topic Monitor", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("runTopicMonitoring (stub)", () => {
    it("should return Promise<void>", async () => {
      const result = runTopicMonitoring("ws-1");
      expect(result).toBeInstanceOf(Promise);
      await expect(result).resolves.toBeUndefined();
    });

    it("should log stub message with workspace ID", async () => {
      await runTopicMonitoring("ws-test-123");

      expect(console.log).toHaveBeenCalledWith(
        "[Stub] Running topic monitoring for workspace ws-test-123",
      );
    });

    it("should not throw errors", async () => {
      await expect(runTopicMonitoring("ws-1")).resolves.not.toThrow();
    });

    it("should handle empty workspace ID gracefully", async () => {
      await expect(runTopicMonitoring("")).resolves.toBeUndefined();
      expect(console.log).toHaveBeenCalledWith(
        "[Stub] Running topic monitoring for workspace ",
      );
    });
  });
});
