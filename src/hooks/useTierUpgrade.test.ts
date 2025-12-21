import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTierUpgrade } from "./useTierUpgrade";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.location
const mockLocation = { href: "" };
Object.defineProperty(window, "location", {
  value: mockLocation,
  writable: true,
});

describe("useTierUpgrade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    global.fetch = mockFetch;
    mockLocation.href = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts with initial state", () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useTierUpgrade());

    expect(result.current.isUpgrading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("sets isUpgrading to true during upgrade", async () => {
    let resolvePromise: (value: unknown) => void;
    mockFetch.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        }),
    );

    const { result } = renderHook(() => useTierUpgrade());

    act(() => {
      result.current.upgrade("BASIC");
    });

    expect(result.current.isUpgrading).toBe(true);

    // Resolve the promise to complete the test
    await act(async () => {
      resolvePromise!({
        ok: true,
        json: () => Promise.resolve({ success: true, url: "https://checkout.stripe.com/test" }),
      });
    });
  });

  describe("upgrade", () => {
    it("successfully initiates upgrade and returns checkout URL", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            sessionId: "session_123",
            url: "https://checkout.stripe.com/test",
          }),
      });

      const { result } = renderHook(() => useTierUpgrade());

      let upgradeResult: { success: boolean; url?: string; error?: string; };
      await act(async () => {
        upgradeResult = await result.current.upgrade("BASIC");
      });

      expect(upgradeResult!.success).toBe(true);
      expect(upgradeResult!.url).toBe("https://checkout.stripe.com/test");
      expect(result.current.isUpgrading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("handles network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useTierUpgrade());

      let upgradeResult: { success: boolean; error?: string; };
      await act(async () => {
        upgradeResult = await result.current.upgrade("BASIC");
      });

      expect(upgradeResult!.success).toBe(false);
      expect(upgradeResult!.error).toBe("Network error");
      expect(result.current.error?.message).toBe("Network error");
      expect(result.current.isUpgrading).toBe(false);
    });

    it("handles unknown error type", async () => {
      mockFetch.mockRejectedValueOnce("String error");

      const { result } = renderHook(() => useTierUpgrade());

      let upgradeResult: { success: boolean; error?: string; };
      await act(async () => {
        upgradeResult = await result.current.upgrade("STANDARD");
      });

      expect(upgradeResult!.success).toBe(false);
      expect(upgradeResult!.error).toBe("Network error");
    });

    it("handles null response", async () => {
      mockFetch.mockResolvedValueOnce(null);

      const { result } = renderHook(() => useTierUpgrade());

      let upgradeResult: { success: boolean; error?: string; };
      await act(async () => {
        upgradeResult = await result.current.upgrade("PREMIUM");
      });

      expect(upgradeResult!.success).toBe(false);
      expect(upgradeResult!.error).toBe("No response from server");
    });

    it("handles JSON parse error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error("Invalid JSON")),
      });

      const { result } = renderHook(() => useTierUpgrade());

      let upgradeResult: { success: boolean; error?: string; };
      await act(async () => {
        upgradeResult = await result.current.upgrade("BASIC");
      });

      expect(upgradeResult!.success).toBe(false);
      expect(upgradeResult!.error).toBe("Invalid JSON");
    });

    it("handles API error response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () =>
          Promise.resolve({
            success: false,
            error: "Cannot upgrade from FREE to PREMIUM. Upgrades must be sequential.",
          }),
      });

      const { result } = renderHook(() => useTierUpgrade());

      let upgradeResult: { success: boolean; error?: string; };
      await act(async () => {
        upgradeResult = await result.current.upgrade("PREMIUM");
      });

      expect(upgradeResult!.success).toBe(false);
      expect(upgradeResult!.error).toBe(
        "Cannot upgrade from FREE to PREMIUM. Upgrades must be sequential.",
      );
      expect(result.current.error?.message).toBe(
        "Cannot upgrade from FREE to PREMIUM. Upgrades must be sequential.",
      );
    });

    it("handles API error response without message", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ success: false }),
      });

      const { result } = renderHook(() => useTierUpgrade());

      let upgradeResult: { success: boolean; error?: string; };
      await act(async () => {
        upgradeResult = await result.current.upgrade("BASIC");
      });

      expect(upgradeResult!.success).toBe(false);
      expect(upgradeResult!.error).toBe("Failed to initiate upgrade");
    });

    it("sends correct request body", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, url: "https://checkout.stripe.com/test" }),
      });

      const { result } = renderHook(() => useTierUpgrade());

      await act(async () => {
        await result.current.upgrade("STANDARD");
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/tiers/upgrade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ targetTier: "STANDARD" }),
      });
    });

    it("clears previous error on new upgrade attempt", async () => {
      mockFetch
        .mockRejectedValueOnce(new Error("First error"))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, url: "https://checkout.stripe.com/test" }),
        });

      const { result } = renderHook(() => useTierUpgrade());

      await act(async () => {
        await result.current.upgrade("BASIC");
      });

      expect(result.current.error?.message).toBe("First error");

      await act(async () => {
        await result.current.upgrade("BASIC");
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe("upgradeAndRedirect", () => {
    it("redirects to checkout URL on success", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            url: "https://checkout.stripe.com/redirect-test",
          }),
      });

      const { result } = renderHook(() => useTierUpgrade());

      await act(async () => {
        await result.current.upgradeAndRedirect("BASIC");
      });

      expect(mockLocation.href).toBe("https://checkout.stripe.com/redirect-test");
    });

    it("does not redirect on failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ success: false, error: "Upgrade failed" }),
      });

      const { result } = renderHook(() => useTierUpgrade());

      await act(async () => {
        await result.current.upgradeAndRedirect("BASIC");
      });

      expect(mockLocation.href).toBe("");
    });

    it("does not redirect when URL is missing", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }), // No URL
      });

      const { result } = renderHook(() => useTierUpgrade());

      await act(async () => {
        await result.current.upgradeAndRedirect("BASIC");
      });

      expect(mockLocation.href).toBe("");
    });
  });

  describe("upgrade tiers", () => {
    it("supports upgrading to BASIC tier", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, url: "https://checkout.stripe.com/basic" }),
      });

      const { result } = renderHook(() => useTierUpgrade());

      await act(async () => {
        await result.current.upgrade("BASIC");
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/tiers/upgrade",
        expect.objectContaining({
          body: JSON.stringify({ targetTier: "BASIC" }),
        }),
      );
    });

    it("supports upgrading to STANDARD tier", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, url: "https://checkout.stripe.com/standard" }),
      });

      const { result } = renderHook(() => useTierUpgrade());

      await act(async () => {
        await result.current.upgrade("STANDARD");
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/tiers/upgrade",
        expect.objectContaining({
          body: JSON.stringify({ targetTier: "STANDARD" }),
        }),
      );
    });

    it("supports upgrading to PREMIUM tier", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, url: "https://checkout.stripe.com/premium" }),
      });

      const { result } = renderHook(() => useTierUpgrade());

      await act(async () => {
        await result.current.upgrade("PREMIUM");
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/tiers/upgrade",
        expect.objectContaining({
          body: JSON.stringify({ targetTier: "PREMIUM" }),
        }),
      );
    });
  });
});
