import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTypewriter } from "./useTypewriter";

/**
 * Helper to advance fake timers in small steps, flushing React state between each.
 * This ensures setTimeout chains that depend on React re-renders work correctly.
 */
function advanceTimers(ms: number, stepMs = 10) {
  let elapsed = 0;
  while (elapsed < ms) {
    const step = Math.min(stepMs, ms - elapsed);
    act(() => {
      vi.advanceTimersByTime(step);
    });
    elapsed += step;
  }
}

describe("useTypewriter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns empty string initially", () => {
    const { result } = renderHook(() =>
      useTypewriter({ prompts: ["Hello"], enabled: true }),
    );
    expect(result.current.displayText).toBe("");
    expect(result.current.isTyping).toBe(false);
  });

  it("types characters progressively", () => {
    const { result } = renderHook(() =>
      useTypewriter({ prompts: ["Hi"], typeSpeed: 50, enabled: true }),
    );

    advanceTimers(50);
    expect(result.current.displayText).toBe("H");
    expect(result.current.isTyping).toBe(true);

    advanceTimers(50);
    expect(result.current.displayText).toBe("Hi");
  });

  it("pauses after completing a prompt and keeps text", () => {
    const { result } = renderHook(() =>
      useTypewriter({
        prompts: ["AB"],
        typeSpeed: 50,
        pauseDuration: 2000,
        enabled: true,
      }),
    );

    // Type both characters (2 x 50ms)
    advanceTimers(100);
    expect(result.current.displayText).toBe("AB");

    // During pause, text stays the same
    advanceTimers(1000);
    expect(result.current.displayText).toBe("AB");
  });

  it("deletes typed text after pause", () => {
    const { result } = renderHook(() =>
      useTypewriter({
        prompts: ["AB"],
        typeSpeed: 50,
        deleteSpeed: 30,
        pauseDuration: 100,
        enabled: true,
      }),
    );

    // Type both characters
    advanceTimers(100);
    expect(result.current.displayText).toBe("AB");

    // Advance enough time for pause + transition + all deletes
    advanceTimers(500);
    expect(result.current.displayText).toBe("");
  });

  it("cycles to next prompt after deleting", () => {
    const { result } = renderHook(() =>
      useTypewriter({
        prompts: ["A", "B"],
        typeSpeed: 50,
        deleteSpeed: 30,
        pauseDuration: 100,
        enabled: true,
      }),
    );

    // Type "A"
    advanceTimers(50);
    expect(result.current.displayText).toBe("A");

    // Advance past pause + all delete phases + next prompt delay + typing "B"
    advanceTimers(500);
    expect(result.current.displayText).toBe("B");
  });

  it("stops when enabled is set to false", () => {
    const { result, rerender } = renderHook(
      ({ enabled }) => useTypewriter({ prompts: ["Hello"], typeSpeed: 50, enabled }),
      { initialProps: { enabled: true } },
    );

    advanceTimers(50);
    expect(result.current.displayText).toBe("H");

    rerender({ enabled: false });
    expect(result.current.displayText).toBe("");
  });

  it("returns empty text when disabled from the start", () => {
    const { result } = renderHook(() =>
      useTypewriter({ prompts: ["Hello"], enabled: false }),
    );

    advanceTimers(500);
    expect(result.current.displayText).toBe("");
    expect(result.current.isTyping).toBe(false);
  });

  it("uses default prompts when none provided", () => {
    const { result } = renderHook(() =>
      useTypewriter({ typeSpeed: 10, enabled: true }),
    );

    advanceTimers(10);
    // First char of default prompt "Build a retro arcade game..."
    expect(result.current.displayText).toBe("B");
  });

  it("cleans up timers on unmount", () => {
    const { unmount } = renderHook(() =>
      useTypewriter({ prompts: ["Test"], typeSpeed: 50, enabled: true }),
    );

    advanceTimers(50);
    unmount();

    // Should not throw after unmount
    act(() => {
      vi.advanceTimersByTime(500);
    });
  });
});
