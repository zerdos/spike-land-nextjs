import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTypewriter } from "./useTypewriter";

describe("useTypewriter debug", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("traces state through delete cycle", () => {
    const { result } = renderHook(() =>
      useTypewriter({
        prompts: ["AB"],
        typeSpeed: 50,
        deleteSpeed: 30,
        pauseDuration: 100,
        enabled: true,
      }),
    );

    const states: string[] = [];

    for (let i = 0; i < 10; i++) {
      act(() => {
        vi.runOnlyPendingTimers();
      });
      states.push(`tick ${i + 1}: "${result.current.displayText}" typing=${result.current.isTyping}`);
    }

    // Force fail to see output
    expect(states.join("\n")).toBe("SHOW_ME");
  });
});
