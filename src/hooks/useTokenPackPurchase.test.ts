import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTokenPackPurchase } from "./useTokenPackPurchase";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.location
const mockLocation = { href: "" };
Object.defineProperty(window, "location", {
  value: mockLocation,
  writable: true,
});

describe("useTokenPackPurchase", () => {
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
    const { result } = renderHook(() => useTokenPackPurchase());

    expect(result.current.isPurchasing).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("sets isPurchasing to true during purchase", async () => {
    let resolvePromise: (value: unknown) => void;
    mockFetch.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        }),
    );

    const { result } = renderHook(() => useTokenPackPurchase());

    act(() => {
      result.current.purchase("starter");
    });

    expect(result.current.isPurchasing).toBe(true);

    // Resolve the promise to complete the test
    await act(async () => {
      resolvePromise!({
        ok: true,
        json: () => Promise.resolve({ success: true, url: "https://checkout.stripe.com/test" }),
      });
    });
  });

  describe("purchase", () => {
    it("successfully initiates purchase and returns checkout URL", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            sessionId: "session_123",
            url: "https://checkout.stripe.com/test",
          }),
      });

      const { result } = renderHook(() => useTokenPackPurchase());

      let purchaseResult: { success: boolean; url?: string; error?: string; };
      await act(async () => {
        purchaseResult = await result.current.purchase("starter");
      });

      expect(purchaseResult!.success).toBe(true);
      expect(purchaseResult!.url).toBe("https://checkout.stripe.com/test");
      expect(result.current.isPurchasing).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("handles network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useTokenPackPurchase());

      let purchaseResult: { success: boolean; error?: string; };
      await act(async () => {
        purchaseResult = await result.current.purchase("basic");
      });

      expect(purchaseResult!.success).toBe(false);
      expect(purchaseResult!.error).toBe("Network error");
      expect(result.current.error?.message).toBe("Network error");
      expect(result.current.isPurchasing).toBe(false);
    });

    it("handles unknown error type", async () => {
      mockFetch.mockRejectedValueOnce("String error");

      const { result } = renderHook(() => useTokenPackPurchase());

      let purchaseResult: { success: boolean; error?: string; };
      await act(async () => {
        purchaseResult = await result.current.purchase("pro");
      });

      expect(purchaseResult!.success).toBe(false);
      expect(purchaseResult!.error).toBe("Network error");
    });

    it("handles null response", async () => {
      mockFetch.mockResolvedValueOnce(null);

      const { result } = renderHook(() => useTokenPackPurchase());

      let purchaseResult: { success: boolean; error?: string; };
      await act(async () => {
        purchaseResult = await result.current.purchase("power");
      });

      expect(purchaseResult!.success).toBe(false);
      expect(purchaseResult!.error).toBe("No response from server");
    });

    it("handles JSON parse error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error("Invalid JSON")),
      });

      const { result } = renderHook(() => useTokenPackPurchase());

      let purchaseResult: { success: boolean; error?: string; };
      await act(async () => {
        purchaseResult = await result.current.purchase("starter");
      });

      expect(purchaseResult!.success).toBe(false);
      expect(purchaseResult!.error).toBe("Invalid JSON");
    });

    it("handles API error response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () =>
          Promise.resolve({
            success: false,
            error: "Invalid package ID",
          }),
      });

      const { result } = renderHook(() => useTokenPackPurchase());

      let purchaseResult: { success: boolean; error?: string; };
      await act(async () => {
        purchaseResult = await result.current.purchase("starter");
      });

      expect(purchaseResult!.success).toBe(false);
      expect(purchaseResult!.error).toBe("Invalid package ID");
      expect(result.current.error?.message).toBe("Invalid package ID");
    });

    it("handles API error response without message", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ success: false }),
      });

      const { result } = renderHook(() => useTokenPackPurchase());

      let purchaseResult: { success: boolean; error?: string; };
      await act(async () => {
        purchaseResult = await result.current.purchase("basic");
      });

      expect(purchaseResult!.success).toBe(false);
      expect(purchaseResult!.error).toBe("Failed to initiate purchase");
    });

    it("sends correct request body", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, url: "https://checkout.stripe.com/test" }),
      });

      const { result } = renderHook(() => useTokenPackPurchase());

      await act(async () => {
        await result.current.purchase("pro");
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ packageId: "pro", mode: "payment" }),
      });
    });

    it("clears previous error on new purchase attempt", async () => {
      mockFetch
        .mockRejectedValueOnce(new Error("First error"))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, url: "https://checkout.stripe.com/test" }),
        });

      const { result } = renderHook(() => useTokenPackPurchase());

      await act(async () => {
        await result.current.purchase("starter");
      });

      expect(result.current.error?.message).toBe("First error");

      await act(async () => {
        await result.current.purchase("starter");
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe("purchaseAndRedirect", () => {
    it("redirects to checkout URL on success", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            url: "https://checkout.stripe.com/redirect-test",
          }),
      });

      const { result } = renderHook(() => useTokenPackPurchase());

      await act(async () => {
        await result.current.purchaseAndRedirect("starter");
      });

      expect(mockLocation.href).toBe("https://checkout.stripe.com/redirect-test");
    });

    it("does not redirect on failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ success: false, error: "Purchase failed" }),
      });

      const { result } = renderHook(() => useTokenPackPurchase());

      await act(async () => {
        await result.current.purchaseAndRedirect("starter");
      });

      expect(mockLocation.href).toBe("");
    });

    it("does not redirect when URL is missing", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }), // No URL
      });

      const { result } = renderHook(() => useTokenPackPurchase());

      await act(async () => {
        await result.current.purchaseAndRedirect("starter");
      });

      expect(mockLocation.href).toBe("");
    });
  });

  describe("package types", () => {
    it.each(
      [
        ["starter"],
        ["basic"],
        ["pro"],
        ["power"],
      ] as const,
    )("supports purchasing %s package", async (packageId) => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ success: true, url: `https://checkout.stripe.com/${packageId}` }),
      });

      const { result } = renderHook(() => useTokenPackPurchase());

      await act(async () => {
        await result.current.purchase(packageId);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/stripe/checkout",
        expect.objectContaining({
          body: JSON.stringify({ packageId, mode: "payment" }),
        }),
      );
    });
  });
});
