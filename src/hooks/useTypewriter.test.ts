import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTypewriter } from "./useTypewriter";

/**
 * Advance timer ticks one at a time, flushing React between each.
 * Each call runs one pending timer and flushes React state.
 */
function tickOnce() {
  act(() => {
    vi.runOnlyPendingTimers();
  });
}

function tickN(n: number) {
  for (let i = 0; i < n; i++) {
    tickOnce();
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

    // Tick 1: initial useEffect fires -> types "H"
    tickOnce();
    expect(result.current.displayText).toBe("H");
    expect(result.current.isTyping).toBe(true);

    // Tick 2: types "i" -> prompt complete, transitions to pausing
    tickOnce();
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

    // Tick 1: type "A", Tick 2: type "B" (prompt complete)
    tickN(2);
    expect(result.current.displayText).toBe("AB");

    // Tick 3: pause timer fires — transitions from pausing to deleting
    tickOnce();
    // Text should still contain typed content at this point
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

    // Tick 1: type "A", Tick 2: type "B"
    tickN(2);
    expect(result.current.displayText).toBe("AB");

    // Tick 3: pause fires -> sets phase to deleting
    tickOnce();
    expect(result.current.displayText).toBe("AB");

    // Tick 4: first delete -> "A"
    tickOnce();
    expect(result.current.displayText).toBe("A");

    // Tick 5: second delete -> ""
    tickOnce();
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

    // Tick 1: type "A" (prompt complete — single char)
    tickOnce();
    expect(result.current.displayText).toBe("A");

    // Tick 2: pause fires -> sets phase to deleting
    tickOnce();

    // Tick 3: delete "A" -> "" -> advances prompt index
    tickOnce();
    expect(result.current.displayText).toBe("");

    // Tick 4: next prompt delay fires -> types "B"
    tickOnce();
    expect(result.current.displayText).toBe("B");
  });

  it("stops when enabled is set to false", () => {
    const { result, rerender } = renderHook(
      ({ enabled }) => useTypewriter({ prompts: ["Hello"], typeSpeed: 50, enabled }),
      { initialProps: { enabled: true } },
    );

    tickOnce();
    expect(result.current.displayText).toBe("H");

    rerender({ enabled: false });
    expect(result.current.displayText).toBe("");
  });

  it("returns empty text when disabled from the start", () => {
    const { result } = renderHook(() =>
      useTypewriter({ prompts: ["Hello"], enabled: false }),
    );

    // Even after ticking, nothing happens
    tickN(5);
    expect(result.current.displayText).toBe("");
    expect(result.current.isTyping).toBe(false);
  });

  it("uses default prompts when none provided", () => {
    const { result } = renderHook(() =>
      useTypewriter({ typeSpeed: 10, enabled: true }),
    );

    tickOnce();
    // First char of default prompt "Build a retro arcade game..."
    expect(result.current.displayText).toBe("B");
  });

  it("cleans up timers on unmount", () => {
    const { unmount } = renderHook(() =>
      useTypewriter({ prompts: ["Test"], typeSpeed: 50, enabled: true }),
    );

    tickOnce();
    unmount();

    // Should not throw after unmount
    act(() => {
      vi.advanceTimersByTime(500);
    });
  });
});
