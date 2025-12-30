import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDowngrade } from "./useDowngrade";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("useDowngrade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts with initial state", () => {
    const { result } = renderHook(() => useDowngrade());

    expect(result.current.isScheduling).toBe(false);
    expect(result.current.isCanceling).toBe(false);
    expect(result.current.scheduledDowngrade).toBeNull();
    expect(result.current.error).toBeNull();
  });

  describe("scheduleDowngrade", () => {
    it("successfully schedules downgrade", async () => {
      const effectiveDate = new Date("2024-02-15T00:00:00Z");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            effectiveDate: effectiveDate.toISOString(),
            message: "Downgrade to FREE will take effect at your next billing cycle",
          }),
      });

      const { result } = renderHook(() => useDowngrade());

      let downgradeResult: {
        success: boolean;
        effectiveDate?: Date;
        message?: string;
      };
      await act(async () => {
        downgradeResult = await result.current.scheduleDowngrade("FREE");
      });

      expect(downgradeResult!.success).toBe(true);
      expect(downgradeResult!.effectiveDate).toEqual(effectiveDate);
      expect(downgradeResult!.message).toBe(
        "Downgrade to FREE will take effect at your next billing cycle",
      );
      expect(result.current.scheduledDowngrade).toEqual({
        targetTier: "FREE",
        effectiveDate,
      });
      expect(result.current.isScheduling).toBe(false);
    });

    it("sets isScheduling during request", async () => {
      let resolvePromise: (value: unknown) => void;
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          }),
      );

      const { result } = renderHook(() => useDowngrade());

      act(() => {
        result.current.scheduleDowngrade("BASIC");
      });

      expect(result.current.isScheduling).toBe(true);

      await act(async () => {
        resolvePromise!({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      });

      expect(result.current.isScheduling).toBe(false);
    });

    it("handles network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useDowngrade());

      let downgradeResult: { success: boolean; error?: string; };
      await act(async () => {
        downgradeResult = await result.current.scheduleDowngrade("FREE");
      });

      expect(downgradeResult!.success).toBe(false);
      expect(downgradeResult!.error).toBe("Network error");
      expect(result.current.error?.message).toBe("Network error");
    });

    it("handles unknown error type", async () => {
      mockFetch.mockRejectedValueOnce("String error");

      const { result } = renderHook(() => useDowngrade());

      let downgradeResult: { success: boolean; error?: string; };
      await act(async () => {
        downgradeResult = await result.current.scheduleDowngrade("BASIC");
      });

      expect(downgradeResult!.success).toBe(false);
      expect(downgradeResult!.error).toBe("Network error");
    });

    it("handles null response", async () => {
      mockFetch.mockResolvedValueOnce(null);

      const { result } = renderHook(() => useDowngrade());

      let downgradeResult: { success: boolean; error?: string; };
      await act(async () => {
        downgradeResult = await result.current.scheduleDowngrade("STANDARD");
      });

      expect(downgradeResult!.success).toBe(false);
      expect(downgradeResult!.error).toBe("No response from server");
    });

    it("handles JSON parse error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error("Invalid JSON")),
      });

      const { result } = renderHook(() => useDowngrade());

      let downgradeResult: { success: boolean; error?: string; };
      await act(async () => {
        downgradeResult = await result.current.scheduleDowngrade("FREE");
      });

      expect(downgradeResult!.success).toBe(false);
      expect(downgradeResult!.error).toBe("Invalid JSON");
    });

    it("handles API error response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () =>
          Promise.resolve({
            success: false,
            error: "Cannot downgrade from FREE",
          }),
      });

      const { result } = renderHook(() => useDowngrade());

      let downgradeResult: { success: boolean; error?: string; };
      await act(async () => {
        downgradeResult = await result.current.scheduleDowngrade("BASIC");
      });

      expect(downgradeResult!.success).toBe(false);
      expect(downgradeResult!.error).toBe("Cannot downgrade from FREE");
      expect(result.current.error?.message).toBe("Cannot downgrade from FREE");
    });

    it("handles API error response without message", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ success: false }),
      });

      const { result } = renderHook(() => useDowngrade());

      let downgradeResult: { success: boolean; error?: string; };
      await act(async () => {
        downgradeResult = await result.current.scheduleDowngrade("FREE");
      });

      expect(downgradeResult!.success).toBe(false);
      expect(downgradeResult!.error).toBe("Failed to schedule downgrade");
    });

    it("sends correct request body", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { result } = renderHook(() => useDowngrade());

      await act(async () => {
        await result.current.scheduleDowngrade("BASIC");
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/tiers/downgrade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ targetTier: "BASIC" }),
      });
    });

    it("clears previous error on new attempt", async () => {
      mockFetch
        .mockRejectedValueOnce(new Error("First error"))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

      const { result } = renderHook(() => useDowngrade());

      await act(async () => {
        await result.current.scheduleDowngrade("FREE");
      });

      expect(result.current.error?.message).toBe("First error");

      await act(async () => {
        await result.current.scheduleDowngrade("FREE");
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe("cancelDowngrade", () => {
    it("successfully cancels downgrade", async () => {
      // First, set up a scheduled downgrade
      const effectiveDate = new Date("2024-02-15T00:00:00Z");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            effectiveDate: effectiveDate.toISOString(),
          }),
      });

      const { result } = renderHook(() => useDowngrade());

      await act(async () => {
        await result.current.scheduleDowngrade("FREE");
      });

      expect(result.current.scheduledDowngrade).not.toBeNull();

      // Now cancel it
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            message: "Scheduled downgrade has been canceled",
          }),
      });

      let cancelResult: { success: boolean; message?: string; };
      await act(async () => {
        cancelResult = await result.current.cancelDowngrade();
      });

      expect(cancelResult!.success).toBe(true);
      expect(cancelResult!.message).toBe(
        "Scheduled downgrade has been canceled",
      );
      expect(result.current.scheduledDowngrade).toBeNull();
      expect(result.current.isCanceling).toBe(false);
    });

    it("sets isCanceling during request", async () => {
      let resolvePromise: (value: unknown) => void;
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          }),
      );

      const { result } = renderHook(() => useDowngrade());

      act(() => {
        result.current.cancelDowngrade();
      });

      expect(result.current.isCanceling).toBe(true);

      await act(async () => {
        resolvePromise!({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      });

      expect(result.current.isCanceling).toBe(false);
    });

    it("handles network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useDowngrade());

      let cancelResult: { success: boolean; error?: string; };
      await act(async () => {
        cancelResult = await result.current.cancelDowngrade();
      });

      expect(cancelResult!.success).toBe(false);
      expect(cancelResult!.error).toBe("Network error");
      expect(result.current.error?.message).toBe("Network error");
    });

    it("handles null response", async () => {
      mockFetch.mockResolvedValueOnce(null);

      const { result } = renderHook(() => useDowngrade());

      let cancelResult: { success: boolean; error?: string; };
      await act(async () => {
        cancelResult = await result.current.cancelDowngrade();
      });

      expect(cancelResult!.success).toBe(false);
      expect(cancelResult!.error).toBe("No response from server");
    });

    it("handles JSON parse error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error("Invalid JSON")),
      });

      const { result } = renderHook(() => useDowngrade());

      let cancelResult: { success: boolean; error?: string; };
      await act(async () => {
        cancelResult = await result.current.cancelDowngrade();
      });

      expect(cancelResult!.success).toBe(false);
      expect(cancelResult!.error).toBe("Invalid JSON");
    });

    it("handles API error response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () =>
          Promise.resolve({
            success: false,
            error: "No downgrade scheduled",
          }),
      });

      const { result } = renderHook(() => useDowngrade());

      let cancelResult: { success: boolean; error?: string; };
      await act(async () => {
        cancelResult = await result.current.cancelDowngrade();
      });

      expect(cancelResult!.success).toBe(false);
      expect(cancelResult!.error).toBe("No downgrade scheduled");
    });

    it("sends DELETE request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { result } = renderHook(() => useDowngrade());

      await act(async () => {
        await result.current.cancelDowngrade();
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/tiers/downgrade", {
        method: "DELETE",
      });
    });
  });

  describe("clearScheduledDowngrade", () => {
    it("clears scheduled downgrade from local state", async () => {
      const effectiveDate = new Date("2024-02-15T00:00:00Z");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            effectiveDate: effectiveDate.toISOString(),
          }),
      });

      const { result } = renderHook(() => useDowngrade());

      await act(async () => {
        await result.current.scheduleDowngrade("FREE");
      });

      expect(result.current.scheduledDowngrade).not.toBeNull();

      act(() => {
        result.current.clearScheduledDowngrade();
      });

      expect(result.current.scheduledDowngrade).toBeNull();
    });
  });

  describe("downgrade tiers", () => {
    it("supports downgrading to FREE tier", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { result } = renderHook(() => useDowngrade());

      await act(async () => {
        await result.current.scheduleDowngrade("FREE");
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/tiers/downgrade",
        expect.objectContaining({
          body: JSON.stringify({ targetTier: "FREE" }),
        }),
      );
    });

    it("supports downgrading to BASIC tier", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { result } = renderHook(() => useDowngrade());

      await act(async () => {
        await result.current.scheduleDowngrade("BASIC");
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/tiers/downgrade",
        expect.objectContaining({
          body: JSON.stringify({ targetTier: "BASIC" }),
        }),
      );
    });

    it("supports downgrading to STANDARD tier", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { result } = renderHook(() => useDowngrade());

      await act(async () => {
        await result.current.scheduleDowngrade("STANDARD");
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/tiers/downgrade",
        expect.objectContaining({
          body: JSON.stringify({ targetTier: "STANDARD" }),
        }),
      );
    });
  });
});
