import { describe, expect, it } from "vitest";
import { DeterministicRandom } from "./deterministic-random";

describe("DeterministicRandom", () => {
  it("produces same sequence for same seed", () => {
    const rng1 = new DeterministicRandom(42);
    const rng2 = new DeterministicRandom(42);

    expect(rng1.next()).toBe(rng2.next());
    expect(rng1.next()).toBe(rng2.next());
    expect(rng1.next()).toBe(rng2.next());
  });

  it("produces different sequence for different seed", () => {
    const rng1 = new DeterministicRandom(1);
    const rng2 = new DeterministicRandom(2);

    expect(rng1.next()).not.toBe(rng2.next());
  });

  it("generates integers within range", () => {
    const rng = new DeterministicRandom(100);
    for (let i = 0; i < 100; i++) {
      const val = rng.rangeInt(1, 6);
      expect(val).toBeGreaterThanOrEqual(1);
      expect(val).toBeLessThanOrEqual(6);
      expect(Number.isInteger(val)).toBe(true);
    }
  });
});
