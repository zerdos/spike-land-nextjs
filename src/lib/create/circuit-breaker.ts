/**
 * Persistent Circuit Breaker via Redis
 *
 * Prevents cascading failures by short-circuiting Claude API calls
 * when consecutive failures are detected. Uses Redis for state persistence
 * across serverless invocations.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Failures exceeded threshold, requests short-circuit to fallback
 * - HALF_OPEN: Cooldown expired, allow one test request through
 */

import { redis } from "@/lib/upstash/client";
import logger from "@/lib/logger";

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

const KEY_PREFIX = "circuit_breaker:create-agent";
const KEYS = {
  state: `${KEY_PREFIX}:state`,
  failures: `${KEY_PREFIX}:failures`,
  lastFailure: `${KEY_PREFIX}:last_failure`,
} as const;

const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 60_000; // 60s before OPEN -> HALF_OPEN
const TTL_SECONDS = 300; // 5 min auto-heal

/**
 * Get the current circuit breaker state.
 * Auto-transitions OPEN -> HALF_OPEN after cooldown period.
 */
export async function getCircuitState(): Promise<CircuitState> {
  try {
    const [state, lastFailure] = await Promise.all([
      redis.get<string>(KEYS.state),
      redis.get<number>(KEYS.lastFailure),
    ]);

    if (!state || state === "CLOSED") {
      return "CLOSED";
    }

    if (state === "OPEN" && lastFailure) {
      // Auto-transition to HALF_OPEN after cooldown
      if (Date.now() - lastFailure > COOLDOWN_MS) {
        return "HALF_OPEN";
      }
      return "OPEN";
    }

    if (state === "HALF_OPEN") {
      return "HALF_OPEN";
    }

    return "CLOSED";
  } catch (error) {
    logger.warn("Circuit breaker state check failed, defaulting to CLOSED", {
      error: error instanceof Error ? error.message : String(error),
    });
    return "CLOSED";
  }
}

/**
 * Record a failure. If failures reach threshold, open the circuit.
 */
export async function recordCircuitFailure(): Promise<void> {
  try {
    const failures = await redis.incr(KEYS.failures);
    await redis.expire(KEYS.failures, TTL_SECONDS);

    if (failures >= FAILURE_THRESHOLD) {
      await Promise.all([
        redis.set(KEYS.state, "OPEN", { ex: TTL_SECONDS }),
        redis.set(KEYS.lastFailure, Date.now(), { ex: TTL_SECONDS }),
      ]);

      logger.warn("Circuit breaker OPENED after consecutive failures", {
        failures,
        threshold: FAILURE_THRESHOLD,
      });
    }
  } catch (error) {
    logger.warn("Circuit breaker failure recording failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Record a success. Reset the circuit to CLOSED.
 */
export async function recordCircuitSuccess(): Promise<void> {
  try {
    await Promise.all([
      redis.set(KEYS.state, "CLOSED", { ex: TTL_SECONDS }),
      redis.set(KEYS.failures, 0, { ex: TTL_SECONDS }),
    ]);
  } catch (error) {
    logger.warn("Circuit breaker success recording failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
