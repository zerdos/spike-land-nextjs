import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionTracker } from "./SessionTracker";

// Mock next-auth/react
const mockUseSession = vi.fn();
vi.mock("next-auth/react", () => ({
  useSession: () => mockUseSession(),
}));

// Mock next/navigation
const mockPathname = vi.fn(() => "/test-page");
const mockSearchParams = vi.fn(() => new URLSearchParams());
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
  useSearchParams: () => mockSearchParams(),
}));

// Mock fetch
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

// Mock document.referrer
Object.defineProperty(document, "referrer", {
  value: "https://google.com",
  writable: true,
});

// Mock navigator.userAgent
Object.defineProperty(navigator, "userAgent", {
  value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0 Safari/537.36",
  writable: true,
});

describe("SessionTracker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
    mockLocalStorage.clear();
    mockSessionStorage.clear();

    // Default mock implementations
    mockUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
    });
    mockPathname.mockReturnValue("/test-page");
    mockSearchParams.mockReturnValue(new URLSearchParams());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("rendering", () => {
    it("renders nothing (returns null)", () => {
      localStorageMock["cookie-consent"] = "accepted";
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sessionId: "test-session" }),
      });

      const { container } = render(<SessionTracker />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("consent checking", () => {
    it("does not create session when consent is not given", async () => {
      // No consent set
      render(<SessionTracker />);

      // Wait a bit for any async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("creates session when consent is given", async () => {
      localStorageMock["cookie-consent"] = "accepted";
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sessionId: "new-session-123" }),
      });

      render(<SessionTracker />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/tracking/session",
          expect.objectContaining({
            method: "POST",
          }),
        );
      });
    });
  });

  describe("session creation", () => {
    beforeEach(() => {
      localStorageMock["cookie-consent"] = "accepted";
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sessionId: "test-session-123" }),
      });
    });

    it("creates a visitor ID if none exists", async () => {
      render(<SessionTracker />);

      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          "spike_visitor_id",
          expect.stringMatching(/^v_[a-z0-9]+_[a-z0-9]+$/),
        );
      });
    });

    it("uses existing visitor ID if available", async () => {
      localStorageMock["spike_visitor_id"] = "existing-visitor";

      render(<SessionTracker />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.visitorId).toBe("existing-visitor");
    });

    it("stores session ID in sessionStorage", async () => {
      render(<SessionTracker />);

      await waitFor(() => {
        expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
          "spike_session_id",
          "test-session-123",
        );
      });
    });

    it("reuses existing session from sessionStorage", async () => {
      sessionStorageMock["spike_session_id"] = "existing-session";

      render(<SessionTracker />);

      // Wait a bit for any async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should not create new session when one exists
      expect(mockFetch).not.toHaveBeenCalledWith(
        "/api/tracking/session",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("includes device info in session creation", async () => {
      render(<SessionTracker />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.deviceType).toBe("desktop");
      expect(body.browser).toBe("Chrome");
      expect(body.os).toBe("macOS");
    });

    it("includes landing page and referrer", async () => {
      render(<SessionTracker />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.landingPage).toBe("/test-page");
      expect(body.referrer).toBe("https://google.com");
    });
  });

  describe("UTM parameter capture", () => {
    beforeEach(() => {
      localStorageMock["cookie-consent"] = "accepted";
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sessionId: "test-session-123" }),
      });
    });

    it("captures UTM parameters from URL", async () => {
      const searchParams = new URLSearchParams({
        utm_source: "facebook",
        utm_medium: "cpc",
        utm_campaign: "christmas_2025",
        utm_term: "photo enhancement",
        utm_content: "hero_cta",
      });
      mockSearchParams.mockReturnValue(searchParams);

      render(<SessionTracker />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.utmSource).toBe("facebook");
      expect(body.utmMedium).toBe("cpc");
      expect(body.utmCampaign).toBe("christmas_2025");
      expect(body.utmTerm).toBe("photo enhancement");
      expect(body.utmContent).toBe("hero_cta");
    });

    it("captures gclid from URL", async () => {
      const searchParams = new URLSearchParams({
        gclid: "google-click-id-123",
      });
      mockSearchParams.mockReturnValue(searchParams);

      render(<SessionTracker />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.gclid).toBe("google-click-id-123");
    });

    it("captures fbclid from URL", async () => {
      const searchParams = new URLSearchParams({
        fbclid: "facebook-click-id-456",
      });
      mockSearchParams.mockReturnValue(searchParams);

      render(<SessionTracker />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.fbclid).toBe("facebook-click-id-456");
    });

    it("marks UTM as captured to prevent re-capture on SPA navigation", async () => {
      const searchParams = new URLSearchParams({
        utm_source: "facebook",
      });
      mockSearchParams.mockReturnValue(searchParams);

      render(<SessionTracker />);

      await waitFor(() => {
        expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
          "spike_utm_captured",
          "true",
        );
      });
    });

    it("does not capture UTM params if already captured", async () => {
      sessionStorageMock["spike_utm_captured"] = "true";
      const searchParams = new URLSearchParams({
        utm_source: "should-not-be-captured",
      });
      mockSearchParams.mockReturnValue(searchParams);

      render(<SessionTracker />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.utmSource).toBeUndefined();
    });
  });

  describe("user linking", () => {
    beforeEach(() => {
      localStorageMock["cookie-consent"] = "accepted";
      // Pre-set session so linking can work immediately
      sessionStorageMock["spike_session_id"] = "existing-session-123";
      localStorageMock["spike_visitor_id"] = "existing-visitor";
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
    });

    it("attempts to link session to user when authenticated", async () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: "user-123" } },
        status: "authenticated",
      });

      render(<SessionTracker />);

      // Wait for the PATCH call to link user
      await waitFor(
        () => {
          const patchCalls = mockFetch.mock.calls.filter(
            (call) => call[1]?.method === "PATCH",
          );
          expect(patchCalls.length).toBeGreaterThan(0);
        },
        { timeout: 2000 },
      );

      // Verify the user ID was included in the request
      const patchCalls = mockFetch.mock.calls.filter(
        (call) => call[1]?.method === "PATCH",
      );
      const body = JSON.parse(patchCalls[0][1].body);
      expect(body.userId).toBe("user-123");
      expect(body.sessionId).toBe("existing-session-123");
    });
  });

  describe("error handling", () => {
    beforeEach(() => {
      localStorageMock["cookie-consent"] = "accepted";
    });

    it("handles session creation failure gracefully", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const consoleWarn = vi.spyOn(console, "warn").mockImplementation(
        () => {},
      );

      // Should not throw
      render(<SessionTracker />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // Component should still render without crashing
      consoleWarn.mockRestore();
    });

    it("handles network errors gracefully", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const consoleWarn = vi.spyOn(console, "warn").mockImplementation(
        () => {},
      );

      // Should not throw
      render(<SessionTracker />);

      await waitFor(() => {
        expect(consoleWarn).toHaveBeenCalledWith(
          "[Tracking] Failed to initialize session:",
          expect.any(Error),
        );
      });

      consoleWarn.mockRestore();
    });
  });
});
