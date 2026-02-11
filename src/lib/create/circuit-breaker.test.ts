import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/upstash/client", () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { redis } from "@/lib/upstash/client";
import logger from "@/lib/logger";
import {
  getCircuitState,
  recordCircuitFailure,
  recordCircuitSuccess,
} from "./circuit-breaker";

const mockRedis = redis as unknown as {
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  incr: ReturnType<typeof vi.fn>;
  expire: ReturnType<typeof vi.fn>;
};
const mockLogger = logger as unknown as {
  warn: ReturnType<typeof vi.fn>;
};

describe("circuit-breaker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue("OK");
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(1);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getCircuitState", () => {
    it("returns CLOSED when no state exists in Redis", async () => {
      mockRedis.get.mockResolvedValue(null);
      const state = await getCircuitState();
      expect(state).toBe("CLOSED");
    });

    it("returns CLOSED when state is CLOSED", async () => {
      mockRedis.get.mockResolvedValueOnce("CLOSED").mockResolvedValueOnce(null);
      const state = await getCircuitState();
      expect(state).toBe("CLOSED");
    });

    it("returns OPEN when state is OPEN and within cooldown", async () => {
      mockRedis.get
        .mockResolvedValueOnce("OPEN")
        .mockResolvedValueOnce(Date.now() - 10_000); // 10s ago, within 60s cooldown
      const state = await getCircuitState();
      expect(state).toBe("OPEN");
    });

    it("returns HALF_OPEN when state is OPEN and cooldown expired", async () => {
      mockRedis.get
        .mockResolvedValueOnce("OPEN")
        .mockResolvedValueOnce(Date.now() - 61_000); // 61s ago, past 60s cooldown
      const state = await getCircuitState();
      expect(state).toBe("HALF_OPEN");
    });

    it("returns HALF_OPEN when state is HALF_OPEN", async () => {
      mockRedis.get
        .mockResolvedValueOnce("HALF_OPEN")
        .mockResolvedValueOnce(null);
      const state = await getCircuitState();
      expect(state).toBe("HALF_OPEN");
    });

    it("returns CLOSED and logs warning when Redis fails", async () => {
      mockRedis.get.mockRejectedValue(new Error("Redis connection lost"));
      const state = await getCircuitState();
      expect(state).toBe("CLOSED");
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Circuit breaker state check failed, defaulting to CLOSED",
        expect.objectContaining({ error: "Redis connection lost" }),
      );
    });

    it("returns CLOSED for OPEN state without lastFailure timestamp", async () => {
      mockRedis.get
        .mockResolvedValueOnce("OPEN")
        .mockResolvedValueOnce(null); // no lastFailure
      const state = await getCircuitState();
      // OPEN with no lastFailure falls through to default CLOSED
      expect(state).toBe("CLOSED");
    });
  });

  describe("recordCircuitFailure", () => {
    it("increments failure count", async () => {
      mockRedis.incr.mockResolvedValue(1);
      await recordCircuitFailure();
      expect(mockRedis.incr).toHaveBeenCalledWith(
        "circuit_breaker:create-agent:failures",
      );
      expect(mockRedis.expire).toHaveBeenCalledWith(
        "circuit_breaker:create-agent:failures",
        300,
      );
    });

    it("does not open circuit below threshold", async () => {
      mockRedis.incr.mockResolvedValue(2); // Below 3
      await recordCircuitFailure();
      expect(mockRedis.set).not.toHaveBeenCalledWith(
        "circuit_breaker:create-agent:state",
        "OPEN",
        expect.any(Object),
      );
    });

    it("opens circuit at failure threshold", async () => {
      mockRedis.incr.mockResolvedValue(3); // Exactly 3
      await recordCircuitFailure();
      expect(mockRedis.set).toHaveBeenCalledWith(
        "circuit_breaker:create-agent:state",
        "OPEN",
        { ex: 300 },
      );
      expect(mockRedis.set).toHaveBeenCalledWith(
        "circuit_breaker:create-agent:last_failure",
        expect.any(Number),
        { ex: 300 },
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Circuit breaker OPENED after consecutive failures",
        expect.objectContaining({ failures: 3, threshold: 3 }),
      );
    });

    it("opens circuit above threshold", async () => {
      mockRedis.incr.mockResolvedValue(5);
      await recordCircuitFailure();
      expect(mockRedis.set).toHaveBeenCalledWith(
        "circuit_breaker:create-agent:state",
        "OPEN",
        { ex: 300 },
      );
    });

    it("swallows Redis errors gracefully", async () => {
      mockRedis.incr.mockRejectedValue(new Error("Redis timeout"));
      await recordCircuitFailure(); // Should not throw
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Circuit breaker failure recording failed",
        expect.objectContaining({ error: "Redis timeout" }),
      );
    });
  });

  describe("recordCircuitSuccess", () => {
    it("resets state to CLOSED and failures to 0", async () => {
      await recordCircuitSuccess();
      expect(mockRedis.set).toHaveBeenCalledWith(
        "circuit_breaker:create-agent:state",
        "CLOSED",
        { ex: 300 },
      );
      expect(mockRedis.set).toHaveBeenCalledWith(
        "circuit_breaker:create-agent:failures",
        0,
        { ex: 300 },
      );
    });

    it("swallows Redis errors gracefully", async () => {
      mockRedis.set.mockRejectedValue(new Error("Redis down"));
      await recordCircuitSuccess(); // Should not throw
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Circuit breaker success recording failed",
        expect.objectContaining({ error: "Redis down" }),
      );
    });
  });

  describe("state transitions", () => {
    it("CLOSED -> OPEN after 3 failures", async () => {
      // Simulate 3 sequential failures
      mockRedis.incr.mockResolvedValueOnce(1);
      await recordCircuitFailure();
      expect(mockRedis.set).not.toHaveBeenCalledWith(
        "circuit_breaker:create-agent:state",
        "OPEN",
        expect.any(Object),
      );

      vi.clearAllMocks();
      mockRedis.set.mockResolvedValue("OK");
      mockRedis.expire.mockResolvedValue(1);
      mockRedis.incr.mockResolvedValueOnce(2);
      await recordCircuitFailure();
      expect(mockRedis.set).not.toHaveBeenCalledWith(
        "circuit_breaker:create-agent:state",
        "OPEN",
        expect.any(Object),
      );

      vi.clearAllMocks();
      mockRedis.set.mockResolvedValue("OK");
      mockRedis.expire.mockResolvedValue(1);
      mockRedis.incr.mockResolvedValueOnce(3);
      await recordCircuitFailure();
      expect(mockRedis.set).toHaveBeenCalledWith(
        "circuit_breaker:create-agent:state",
        "OPEN",
        { ex: 300 },
      );
    });

    it("OPEN -> HALF_OPEN after cooldown -> CLOSED on success", async () => {
      // State is OPEN with expired cooldown
      mockRedis.get
        .mockResolvedValueOnce("OPEN")
        .mockResolvedValueOnce(Date.now() - 61_000);
      const halfOpen = await getCircuitState();
      expect(halfOpen).toBe("HALF_OPEN");

      // Success resets to CLOSED
      await recordCircuitSuccess();
      expect(mockRedis.set).toHaveBeenCalledWith(
        "circuit_breaker:create-agent:state",
        "CLOSED",
        { ex: 300 },
      );
    });
  });
});
