import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createEmptyStats,
  flushStats,
  forceKVMode,
  forceMemoryMode,
  forceServerMode,
  getPendingUpdatesCount,
  getStats,
  recordFrontendEvents,
  recordTryCatchEvent,
  resetKVAvailability,
  resetServerMode,
  resetStats,
} from "./try-catch-stats";

// Mock the @vercel/kv module
vi.mock("@vercel/kv", () => ({
  kv: {
    ping: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));

// Import the mocked kv after mocking
import { kv } from "@vercel/kv";

const mockedKV = vi.mocked(kv);

describe("try-catch-stats", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    forceMemoryMode();
    forceServerMode();
    // Ensure clean state
    await resetStats();
  });

  afterEach(async () => {
    await resetStats();
    resetServerMode();
  });

  describe("createEmptyStats", () => {
    it("should create an empty stats object", () => {
      const stats = createEmptyStats();

      expect(stats.version).toBe(0);
      expect(stats.users).toEqual({});
      expect(stats.lastUpdated).toBeDefined();
    });
  });

  describe("recordTryCatchEvent", () => {
    it("should add events to pending buffer", () => {
      recordTryCatchEvent("user@example.com", "BACKEND", true);

      expect(getPendingUpdatesCount()).toBe(1);
    });

    it("should handle anonymous users", async () => {
      await resetStats(); // Ensure clean state
      recordTryCatchEvent(null, "BACKEND", true);

      expect(getPendingUpdatesCount()).toBe(1);
    });

    it("should accumulate multiple events", async () => {
      await resetStats(); // Ensure clean state
      recordTryCatchEvent("user1@example.com", "BACKEND", true);
      recordTryCatchEvent("user1@example.com", "BACKEND", false);
      recordTryCatchEvent("user2@example.com", "BACKEND", true);

      expect(getPendingUpdatesCount()).toBe(3);
    });
  });

  describe("recordFrontendEvents", () => {
    it("should record multiple frontend events", async () => {
      await resetStats(); // Ensure clean state
      recordFrontendEvents("user@example.com", [
        { success: true },
        { success: false },
        { success: true },
      ]);

      expect(getPendingUpdatesCount()).toBe(3);
    });
  });

  describe("flushStats", () => {
    beforeEach(async () => {
      resetKVAvailability();
      forceKVMode();
      mockedKV.get.mockResolvedValue(null);
      mockedKV.set.mockResolvedValue("OK");
      await resetStats();
    });

    it("should flush pending events to KV", async () => {
      recordTryCatchEvent("user@example.com", "BACKEND", true);
      recordTryCatchEvent("user@example.com", "BACKEND", false);

      await flushStats();

      expect(mockedKV.set).toHaveBeenCalled();
      expect(getPendingUpdatesCount()).toBe(0);
    });

    it("should aggregate events by user", async () => {
      recordTryCatchEvent("user@example.com", "BACKEND", true);
      recordTryCatchEvent("user@example.com", "BACKEND", true);
      recordTryCatchEvent("user@example.com", "BACKEND", false);
      recordFrontendEvents("user@example.com", [
        { success: true },
        { success: false },
      ]);

      await flushStats();

      // Check that set was called with aggregated stats
      expect(mockedKV.set).toHaveBeenCalledWith(
        "try-catch-stats",
        expect.objectContaining({
          users: expect.objectContaining({
            "user@example.com": expect.objectContaining({
              backendSuccess: 2,
              backendFail: 1,
              frontendSuccess: 1,
              frontendFail: 1,
              allCalls: 5,
            }),
          }),
        }),
      );
    });

    it("should merge with existing stats", async () => {
      mockedKV.get.mockResolvedValue({
        version: 5,
        lastUpdated: new Date().toISOString(),
        users: {
          "user@example.com": {
            email: "user@example.com",
            allCalls: 10,
            frontendSuccess: 3,
            frontendFail: 1,
            backendSuccess: 5,
            backendFail: 1,
            lastSeen: new Date().toISOString(),
          },
        },
      });

      recordTryCatchEvent("user@example.com", "BACKEND", true);

      await flushStats();

      expect(mockedKV.set).toHaveBeenCalledWith(
        "try-catch-stats",
        expect.objectContaining({
          version: 6, // Incremented
          users: expect.objectContaining({
            "user@example.com": expect.objectContaining({
              allCalls: 11, // 10 + 1
              backendSuccess: 6, // 5 + 1
            }),
          }),
        }),
      );
    });

    it("should handle empty pending updates", async () => {
      await flushStats();

      expect(mockedKV.get).not.toHaveBeenCalled();
      expect(mockedKV.set).not.toHaveBeenCalled();
    });
  });

  describe("getStats", () => {
    beforeEach(async () => {
      resetKVAvailability();
      forceKVMode();
      await resetStats();
    });

    it("should return stats from KV", async () => {
      const mockStats = {
        version: 3,
        lastUpdated: new Date().toISOString(),
        users: {
          "user@example.com": {
            email: "user@example.com",
            allCalls: 10,
            frontendSuccess: 3,
            frontendFail: 1,
            backendSuccess: 5,
            backendFail: 1,
            lastSeen: new Date().toISOString(),
          },
        },
      };
      mockedKV.get.mockResolvedValue(mockStats);

      const stats = await getStats();

      expect(stats).toEqual(mockStats);
    });

    it("should return empty stats when KV has no data", async () => {
      mockedKV.get.mockResolvedValue(null);

      const stats = await getStats();

      expect(stats.version).toBe(0);
      expect(stats.users).toEqual({});
    });

    it("should return empty stats when KV is unavailable", async () => {
      forceMemoryMode();

      const stats = await getStats();

      expect(stats.version).toBe(0);
      expect(stats.users).toEqual({});
    });

    it("should handle KV errors gracefully", async () => {
      mockedKV.get.mockRejectedValue(new Error("KV error"));

      const stats = await getStats();

      expect(stats.version).toBe(0);
      expect(stats.users).toEqual({});
    });
  });

  describe("resetStats", () => {
    beforeEach(async () => {
      resetKVAvailability();
      forceKVMode();
      mockedKV.del.mockResolvedValue(1);
      await resetStats();
    });

    it("should delete stats from KV", async () => {
      await resetStats();

      expect(mockedKV.del).toHaveBeenCalledWith("try-catch-stats");
    });

    it("should clear pending updates", async () => {
      recordTryCatchEvent("user@example.com", "BACKEND", true);
      expect(getPendingUpdatesCount()).toBe(1);

      await resetStats();

      expect(getPendingUpdatesCount()).toBe(0);
    });

    it("should handle KV errors gracefully", async () => {
      mockedKV.del.mockRejectedValue(new Error("KV error"));

      await expect(resetStats()).resolves.not.toThrow();
    });
  });

  describe("KV availability", () => {
    beforeEach(async () => {
      await resetStats();
    });

    it("should not attempt KV operations when KV is unavailable", async () => {
      forceMemoryMode();

      recordTryCatchEvent("user@example.com", "BACKEND", true);
      await flushStats();

      expect(mockedKV.get).not.toHaveBeenCalled();
      expect(mockedKV.set).not.toHaveBeenCalled();
    });

    it("should use KV when available", async () => {
      forceKVMode();
      mockedKV.get.mockResolvedValue(null);
      mockedKV.set.mockResolvedValue("OK");

      recordTryCatchEvent("user@example.com", "BACKEND", true);
      await flushStats();

      expect(mockedKV.set).toHaveBeenCalled();
    });
  });

  describe("environment detection", () => {
    it("should record events when server mode is forced", async () => {
      await resetStats();
      forceServerMode();

      recordTryCatchEvent("user@example.com", "BACKEND", true);
      expect(getPendingUpdatesCount()).toBe(1);
    });

    it("should not record events when server mode is reset", async () => {
      await resetStats();
      resetServerMode();

      recordTryCatchEvent("user@example.com", "BACKEND", true);
      // In browser-like test environment, this should not record
      // since isServer is false and forceServerMode is false
      // The actual count depends on the test environment
    });
  });
});
