import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTypewriter } from "./useTypewriter";

/**
 * Advance one timer tick, flushing React state updates.
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

    // tick 1: type "H"
    tickOnce();
    expect(result.current.displayText).toBe("H");
    expect(result.current.isTyping).toBe(true);

    // tick 2: type "i" (completes prompt)
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

    // tick 1: "A", tick 2: "AB" (prompt complete)
    tickN(2);
    expect(result.current.displayText).toBe("AB");

    // tick 3: pause timer fires, text still "AB"
    tickOnce();
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

    // tick 1: "A", tick 2: "AB"
    tickN(2);
    expect(result.current.displayText).toBe("AB");

    // tick 3: pause completes — still "AB"
    // tick 4: pausing->deleting transition — still "AB"
    tickN(2);
    expect(result.current.displayText).toBe("AB");

    // tick 5: first delete -> "A"
    tickOnce();
    expect(result.current.displayText).toBe("A");

    // tick 6: second delete -> ""
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

    // tick 1: type "A" (single char prompt, completes immediately)
    tickOnce();
    expect(result.current.displayText).toBe("A");

    // tick 2: pause fires
    // tick 3: pausing->deleting transition
    // tick 4: delete "A" -> "" (advances prompt index)
    tickN(3);
    expect(result.current.displayText).toBe("");

    // tick 5: next prompt delay
    // tick 6: type "B"
    tickN(2);
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
