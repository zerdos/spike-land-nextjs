import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTracking } from "./useTracking";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage and sessionStorage
const localStorageMock: Record<string, string> = {};
const sessionStorageMock: Record<string, string> = {};

const mockLocalStorage = {
  getItem: vi.fn((key: string) => localStorageMock[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageMock[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageMock[key];
  }),
  clear: vi.fn(() => {
    Object.keys(localStorageMock).forEach((key) => delete localStorageMock[key]);
  }),
};

const mockSessionStorage = {
  getItem: vi.fn((key: string) => sessionStorageMock[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    sessionStorageMock[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete sessionStorageMock[key];
  }),
  clear: vi.fn(() => {
    Object.keys(sessionStorageMock).forEach((key) => delete sessionStorageMock[key]);
  }),
};

Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
  writable: true,
});

Object.defineProperty(window, "sessionStorage", {
  value: mockSessionStorage,
  writable: true,
});

describe("useTracking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
    mockLocalStorage.clear();
    mockSessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("without consent", () => {
    it("does not track events when consent is not given", async () => {
      // No consent set (localStorage empty)
      const { result } = renderHook(() => useTracking());

      await act(async () => {
        await result.current.trackEvent("signup_started");
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("does not track conversions when consent is not given", async () => {
      const { result } = renderHook(() => useTracking());

      await act(async () => {
        await result.current.trackConversion("signup");
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("without session", () => {
    beforeEach(() => {
      localStorageMock["cookie-consent"] = "accepted";
    });

    it("does not track events when no session exists", async () => {
      const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

      const { result } = renderHook(() => useTracking());

      await act(async () => {
        await result.current.trackEvent("signup_started");
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(consoleWarn).toHaveBeenCalledWith(
        "[Tracking] No active session for event tracking",
      );

      consoleWarn.mockRestore();
    });

    it("does not track conversions when no session exists", async () => {
      const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

      const { result } = renderHook(() => useTracking());

      await act(async () => {
        await result.current.trackConversion("signup");
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(consoleWarn).toHaveBeenCalledWith(
        "[Tracking] No active session for conversion tracking",
      );

      consoleWarn.mockRestore();
    });
  });

  describe("with consent and session", () => {
    beforeEach(() => {
      localStorageMock["cookie-consent"] = "accepted";
      sessionStorageMock["spike_session_id"] = "test-session-123";
      mockFetch.mockResolvedValue({ ok: true });
    });

    it("trackEvent sends correct payload", async () => {
      const { result } = renderHook(() => useTracking());

      await act(async () => {
        await result.current.trackEvent("signup_started");
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/tracking/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "test-session-123",
          name: "signup_started",
          value: undefined,
          metadata: undefined,
        }),
      });
    });

    it("trackEvent includes value when provided", async () => {
      const { result } = renderHook(() => useTracking());

      await act(async () => {
        await result.current.trackEvent("enhancement_completed", 5);
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/tracking/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "test-session-123",
          name: "enhancement_completed",
          value: 5,
          metadata: undefined,
        }),
      });
    });

    it("trackEvent includes metadata when provided", async () => {
      const { result } = renderHook(() => useTracking());

      await act(async () => {
        await result.current.trackEvent("signup_completed", undefined, {
          method: "google",
        });
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.metadata).toEqual({ method: "google" });
    });

    it("trackConversion maps type to _completed event", async () => {
      const { result } = renderHook(() => useTracking());

      await act(async () => {
        await result.current.trackConversion("signup");
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.name).toBe("signup_completed");
      expect(body.metadata.conversionType).toBe("signup");
    });

    it("trackConversion includes value when provided", async () => {
      const { result } = renderHook(() => useTracking());

      await act(async () => {
        await result.current.trackConversion("purchase", 29.99);
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.name).toBe("purchase_completed");
      expect(body.value).toBe(29.99);
    });

    it("trackConversionStarted maps type to _started event", async () => {
      const { result } = renderHook(() => useTracking());

      await act(async () => {
        await result.current.trackConversionStarted("signup");
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.name).toBe("signup_started");
      expect(body.metadata.conversionType).toBe("signup");
    });

    it("trackConversionStarted works for all conversion types", async () => {
      const { result } = renderHook(() => useTracking());

      const types: Array<"signup" | "enhancement" | "purchase"> = [
        "signup",
        "enhancement",
        "purchase",
      ];

      for (const type of types) {
        mockFetch.mockClear();

        await act(async () => {
          await result.current.trackConversionStarted(type);
        });

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.name).toBe(`${type}_started`);
      }
    });
  });

  describe("error handling", () => {
    beforeEach(() => {
      localStorageMock["cookie-consent"] = "accepted";
      sessionStorageMock["spike_session_id"] = "test-session-123";
    });

    it("handles API errors gracefully for trackEvent", async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });
      const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

      const { result } = renderHook(() => useTracking());

      // Should not throw
      await act(async () => {
        await result.current.trackEvent("signup_started");
      });

      expect(consoleWarn).toHaveBeenCalledWith(
        "[Tracking] Failed to track event: 500",
      );

      consoleWarn.mockRestore();
    });

    it("handles network errors gracefully for trackEvent", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));
      const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

      const { result } = renderHook(() => useTracking());

      // Should not throw
      await act(async () => {
        await result.current.trackEvent("signup_started");
      });

      expect(consoleWarn).toHaveBeenCalledWith(
        "[Tracking] Error tracking event:",
        expect.any(Error),
      );

      consoleWarn.mockRestore();
    });

    it("handles API errors gracefully for trackConversion", async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });
      const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

      const { result } = renderHook(() => useTracking());

      await act(async () => {
        await result.current.trackConversion("signup");
      });

      expect(consoleWarn).toHaveBeenCalledWith(
        "[Tracking] Failed to track conversion: 500",
      );

      consoleWarn.mockRestore();
    });

    it("handles API errors gracefully for trackConversionStarted", async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });
      const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

      const { result } = renderHook(() => useTracking());

      await act(async () => {
        await result.current.trackConversionStarted("signup");
      });

      expect(consoleWarn).toHaveBeenCalledWith(
        "[Tracking] Failed to track conversion started: 500",
      );

      consoleWarn.mockRestore();
    });
  });

  describe("utility functions", () => {
    it("getSessionId returns session ID when available", () => {
      sessionStorageMock["spike_session_id"] = "test-session-456";

      const { result } = renderHook(() => useTracking());

      expect(result.current.getSessionId()).toBe("test-session-456");
    });

    it("getSessionId returns null when no session", () => {
      const { result } = renderHook(() => useTracking());

      expect(result.current.getSessionId()).toBeNull();
    });

    it("getVisitorId returns visitor ID when available", () => {
      localStorageMock["spike_visitor_id"] = "visitor-789";

      const { result } = renderHook(() => useTracking());

      expect(result.current.getVisitorId()).toBe("visitor-789");
    });

    it("getVisitorId returns null when no visitor ID", () => {
      const { result } = renderHook(() => useTracking());

      expect(result.current.getVisitorId()).toBeNull();
    });

    it("isTrackingEnabled returns true when consent and session exist", () => {
      localStorageMock["cookie-consent"] = "accepted";
      sessionStorageMock["spike_session_id"] = "test-session";

      const { result } = renderHook(() => useTracking());

      expect(result.current.isTrackingEnabled()).toBe(true);
    });

    it("isTrackingEnabled returns false when no consent", () => {
      sessionStorageMock["spike_session_id"] = "test-session";

      const { result } = renderHook(() => useTracking());

      expect(result.current.isTrackingEnabled()).toBe(false);
    });

    it("isTrackingEnabled returns false when no session", () => {
      localStorageMock["cookie-consent"] = "accepted";

      const { result } = renderHook(() => useTracking());

      expect(result.current.isTrackingEnabled()).toBe(false);
    });
  });
});
