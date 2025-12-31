import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCountdown } from "./useCountdown";

describe("useCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should calculate the time remaining correctly", () => {
    const now = new Date("2025-12-31T20:00:00Z");
    vi.setSystemTime(now);

    const target = new Date("2026-01-01T00:00:00Z");
    const { result } = renderHook(() => useCountdown(target));

    expect(result.current).toEqual({
      days: 0,
      hours: 4,
      minutes: 0,
      seconds: 0,
      isComplete: false,
    });
  });

  it("should update every second", () => {
    const now = new Date("2025-12-31T23:59:50Z");
    vi.setSystemTime(now);

    const target = new Date("2026-01-01T00:00:00Z");
    const { result } = renderHook(() => useCountdown(target));

    expect(result.current.seconds).toBe(10);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.seconds).toBe(9);
  });

  it("should return isComplete: true when reaching zero", () => {
    const now = new Date("2025-12-31T23:59:59Z");
    vi.setSystemTime(now);

    const target = new Date("2026-01-01T00:00:00Z");
    const { result } = renderHook(() => useCountdown(target));

    expect(result.current.isComplete).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.isComplete).toBe(true);
    expect(result.current.seconds).toBe(0);
  });

  it("should return zero values if target date is in the past", () => {
    const now = new Date("2026-01-02T00:00:00Z");
    vi.setSystemTime(now);

    const target = new Date("2026-01-01T00:00:00Z");
    const { result } = renderHook(() => useCountdown(target));

    expect(result.current).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isComplete: true,
    });
  });
});
