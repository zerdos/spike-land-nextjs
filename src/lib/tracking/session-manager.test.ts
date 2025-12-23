/**
 * Session Manager Tests
 *
 * Tests for session creation, management, page view recording, and event tracking.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock fetch
const mockFetch = vi.fn();

describe("session-manager", () => {
  let mockSessionStorage: Record<string, string>;
  let mockLocalStorage: Record<string, string>;
  let mockSessionStorageObj: {
    getItem: ReturnType<typeof vi.fn>;
    setItem: ReturnType<typeof vi.fn>;
    removeItem: ReturnType<typeof vi.fn>;
  };
  let mockLocalStorageObj: {
    getItem: ReturnType<typeof vi.fn>;
    setItem: ReturnType<typeof vi.fn>;
    removeItem: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    mockSessionStorage = {};
    mockLocalStorage = {};

    // Create sessionStorage mock
    mockSessionStorageObj = {
      getItem: vi.fn((key: string) => mockSessionStorage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        mockSessionStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockSessionStorage[key];
      }),
    };

    // Create localStorage mock
    mockLocalStorageObj = {
      getItem: vi.fn((key: string) => mockLocalStorage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        mockLocalStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockLocalStorage[key];
      }),
    };

    // Stub sessionStorage directly (code uses sessionStorage, not window.sessionStorage)
    vi.stubGlobal("sessionStorage", mockSessionStorageObj);

    // Stub localStorage directly (code uses localStorage, not window.localStorage)
    vi.stubGlobal("localStorage", mockLocalStorageObj);

    // Stub window (for typeof window !== "undefined" checks)
    vi.stubGlobal("window", {
      sessionStorage: mockSessionStorageObj,
      localStorage: mockLocalStorageObj,
    });

    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("getActiveSession", () => {
    it("should return null when no consent", async () => {
      // No cookie-consent in localStorage
      const { getActiveSession } = await import("./session-manager");
      const session = getActiveSession();

      expect(session).toBeNull();
    });

    it("should return null when no session ID stored", async () => {
      mockLocalStorage["cookie-consent"] = "accepted";

      const { getActiveSession } = await import("./session-manager");
      const session = getActiveSession();

      expect(session).toBeNull();
    });

    it("should return session ID when valid session exists", async () => {
      mockLocalStorage["cookie-consent"] = "accepted";
      mockSessionStorage["spike_session_id"] = "session-123";
      mockSessionStorage["spike_last_activity"] = Date.now().toString();

      const { getActiveSession } = await import("./session-manager");
      const session = getActiveSession();

      expect(session).toBe("session-123");
    });

    it("should return null and clear session when timed out", async () => {
      mockLocalStorage["cookie-consent"] = "accepted";
      mockSessionStorage["spike_session_id"] = "session-123";
      // Set last activity to 31 minutes ago (timeout is 30 minutes)
      mockSessionStorage["spike_last_activity"] = (
        Date.now() - 31 * 60 * 1000
      ).toString();

      const { getActiveSession } = await import("./session-manager");
      const session = getActiveSession();

      expect(session).toBeNull();
      expect(mockSessionStorageObj.removeItem).toHaveBeenCalledWith(
        "spike_session_id",
      );
      expect(mockSessionStorageObj.removeItem).toHaveBeenCalledWith(
        "spike_last_activity",
      );
    });

    it("should return session ID when still within timeout", async () => {
      mockLocalStorage["cookie-consent"] = "accepted";
      mockSessionStorage["spike_session_id"] = "session-123";
      // Set last activity to 5 minutes ago
      mockSessionStorage["spike_last_activity"] = (
        Date.now() - 5 * 60 * 1000
      ).toString();

      const { getActiveSession } = await import("./session-manager");
      const session = getActiveSession();

      expect(session).toBe("session-123");
    });

    it("should return null on server side", async () => {
      vi.unstubAllGlobals();

      const { getActiveSession } = await import("./session-manager");
      const session = getActiveSession();

      expect(session).toBeNull();
    });
  });

  describe("setActiveSession", () => {
    it("should store session ID in sessionStorage", async () => {
      mockLocalStorage["cookie-consent"] = "accepted";

      const { setActiveSession } = await import("./session-manager");
      setActiveSession("session-456");

      expect(mockSessionStorageObj.setItem).toHaveBeenCalledWith(
        "spike_session_id",
        "session-456",
      );
    });

    it("should update last activity timestamp", async () => {
      mockLocalStorage["cookie-consent"] = "accepted";

      const { setActiveSession } = await import("./session-manager");
      setActiveSession("session-456");

      expect(mockSessionStorageObj.setItem).toHaveBeenCalledWith(
        "spike_last_activity",
        expect.any(String),
      );
    });

    it("should not store session when no consent", async () => {
      const { setActiveSession } = await import("./session-manager");
      setActiveSession("session-456");

      expect(mockSessionStorageObj.setItem).not.toHaveBeenCalledWith(
        "spike_session_id",
        expect.any(String),
      );
    });

    it("should do nothing on server side", async () => {
      vi.unstubAllGlobals();

      const { setActiveSession } = await import("./session-manager");
      setActiveSession("session-456");

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe("updateLastActivity", () => {
    it("should update last activity timestamp", async () => {
      const { updateLastActivity } = await import("./session-manager");
      updateLastActivity();

      expect(mockSessionStorageObj.setItem).toHaveBeenCalledWith(
        "spike_last_activity",
        expect.any(String),
      );
    });

    it("should do nothing on server side", async () => {
      vi.unstubAllGlobals();

      const { updateLastActivity } = await import("./session-manager");
      updateLastActivity();

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe("clearSession", () => {
    it("should remove session ID and last activity from sessionStorage", async () => {
      mockSessionStorage["spike_session_id"] = "session-123";
      mockSessionStorage["spike_last_activity"] = Date.now().toString();

      const { clearSession } = await import("./session-manager");
      clearSession();

      expect(mockSessionStorageObj.removeItem).toHaveBeenCalledWith(
        "spike_session_id",
      );
      expect(mockSessionStorageObj.removeItem).toHaveBeenCalledWith(
        "spike_last_activity",
      );
    });

    it("should do nothing on server side", async () => {
      vi.unstubAllGlobals();

      const { clearSession } = await import("./session-manager");
      clearSession();

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe("createSession", () => {
    it("should create a new session via API", async () => {
      mockLocalStorage["cookie-consent"] = "accepted";
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sessionId: "new-session-id" }),
      });

      const { createSession } = await import("./session-manager");
      const sessionId = await createSession({
        visitorId: "v_visitor-123",
        landingPage: "/",
      });

      expect(sessionId).toBe("new-session-id");
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/tracking/session",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: expect.stringContaining("visitorId"),
        }),
      );
    });

    it("should store session ID in sessionStorage", async () => {
      mockLocalStorage["cookie-consent"] = "accepted";
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sessionId: "new-session-id" }),
      });

      const { createSession } = await import("./session-manager");
      await createSession({
        visitorId: "v_visitor-123",
        landingPage: "/",
      });

      expect(mockSessionStorageObj.setItem).toHaveBeenCalledWith(
        "spike_session_id",
        "new-session-id",
      );
    });

    it("should throw error on API failure", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: "Server error" }),
      });

      const { createSession } = await import("./session-manager");

      await expect(
        createSession({
          visitorId: "v_visitor-123",
          landingPage: "/",
        }),
      ).rejects.toThrow("Server error");
    });

    it("should throw default error when API returns no message", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({}),
      });

      const { createSession } = await import("./session-manager");

      await expect(
        createSession({
          visitorId: "v_visitor-123",
          landingPage: "/",
        }),
      ).rejects.toThrow("Failed to create session");
    });

    it("should handle JSON parse error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.reject(new Error("Invalid JSON")),
      });

      const { createSession } = await import("./session-manager");

      await expect(
        createSession({
          visitorId: "v_visitor-123",
          landingPage: "/",
        }),
      ).rejects.toThrow("Failed to create session");
    });

    it("should include UTM params in request", async () => {
      mockLocalStorage["cookie-consent"] = "accepted";
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sessionId: "session-with-utm" }),
      });

      const { createSession } = await import("./session-manager");
      await createSession({
        visitorId: "v_visitor-123",
        landingPage: "/",
        utmParams: {
          utm_source: "google",
          utm_campaign: "test",
        },
      });

      const body = JSON.parse(mockFetch.mock.calls[0]![1]!.body);
      expect(body.utmParams).toEqual({
        utm_source: "google",
        utm_campaign: "test",
      });
    });
  });

  describe("updateSession", () => {
    it("should update session via API", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { updateSession } = await import("./session-manager");
      await updateSession("session-123", { exitPage: "/about" });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/tracking/session",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("update"),
        }),
      );
    });

    it("should update last activity", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { updateSession } = await import("./session-manager");
      await updateSession("session-123", { exitPage: "/about" });

      expect(mockSessionStorageObj.setItem).toHaveBeenCalledWith(
        "spike_last_activity",
        expect.any(String),
      );
    });

    it("should throw error on API failure", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: "Update failed" }),
      });

      const { updateSession } = await import("./session-manager");

      await expect(
        updateSession("session-123", { exitPage: "/about" }),
      ).rejects.toThrow("Update failed");
    });
  });

  describe("recordPageView", () => {
    it("should record page view via API", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { recordPageView } = await import("./session-manager");
      await recordPageView("session-123", "/about", "About Page");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/tracking/pageview",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            sessionId: "session-123",
            path: "/about",
            title: "About Page",
          }),
        }),
      );
    });

    it("should update last activity", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { recordPageView } = await import("./session-manager");
      await recordPageView("session-123", "/about");

      expect(mockSessionStorageObj.setItem).toHaveBeenCalledWith(
        "spike_last_activity",
        expect.any(String),
      );
    });

    it("should throw error on API failure", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: "Page view failed" }),
      });

      const { recordPageView } = await import("./session-manager");

      await expect(recordPageView("session-123", "/about")).rejects.toThrow(
        "Page view failed",
      );
    });
  });

  describe("recordEvent", () => {
    it("should record event via API", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { recordEvent } = await import("./session-manager");
      await recordEvent("session-123", {
        name: "signup_completed",
        category: "conversion",
        value: 100,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/tracking/event",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            sessionId: "session-123",
            name: "signup_completed",
            category: "conversion",
            value: 100,
          }),
        }),
      );
    });

    it("should update last activity", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { recordEvent } = await import("./session-manager");
      await recordEvent("session-123", { name: "test_event" });

      expect(mockSessionStorageObj.setItem).toHaveBeenCalledWith(
        "spike_last_activity",
        expect.any(String),
      );
    });

    it("should throw error on API failure", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: "Event recording failed" }),
      });

      const { recordEvent } = await import("./session-manager");

      await expect(
        recordEvent("session-123", { name: "test_event" }),
      ).rejects.toThrow("Event recording failed");
    });

    it("should include metadata in request", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { recordEvent } = await import("./session-manager");
      await recordEvent("session-123", {
        name: "enhancement_completed",
        metadata: { tier: "TIER_4K" },
      });

      const body = JSON.parse(mockFetch.mock.calls[0]![1]!.body);
      expect(body.metadata).toEqual({ tier: "TIER_4K" });
    });
  });

  describe("linkUserToSession", () => {
    it("should link user to session via API", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { linkUserToSession } = await import("./session-manager");
      await linkUserToSession("session-123", "user-456");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/tracking/session",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            action: "link",
            sessionId: "session-123",
            userId: "user-456",
          }),
        }),
      );
    });

    it("should throw error on API failure", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: "Link failed" }),
      });

      const { linkUserToSession } = await import("./session-manager");

      await expect(
        linkUserToSession("session-123", "user-456"),
      ).rejects.toThrow("Link failed");
    });
  });

  describe("endSession", () => {
    it("should update session with end time and clear local storage", async () => {
      mockLocalStorage["cookie-consent"] = "accepted";
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { endSession } = await import("./session-manager");
      await endSession("session-123");

      expect(mockFetch).toHaveBeenCalled();
      expect(mockSessionStorageObj.removeItem).toHaveBeenCalledWith(
        "spike_session_id",
      );
      expect(mockSessionStorageObj.removeItem).toHaveBeenCalledWith(
        "spike_last_activity",
      );
    });

    it("should clear session even if API fails", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: "End failed" }),
      });

      const { endSession } = await import("./session-manager");

      await expect(endSession("session-123")).rejects.toThrow();
      expect(mockSessionStorageObj.removeItem).toHaveBeenCalledWith(
        "spike_session_id",
      );
    });
  });

  describe("isSessionTimedOut", () => {
    it("should return false on server side", async () => {
      vi.unstubAllGlobals();

      const { isSessionTimedOut } = await import("./session-manager");
      const result = isSessionTimedOut();

      expect(result).toBe(false);
    });

    it("should return false when no last activity", async () => {
      const { isSessionTimedOut } = await import("./session-manager");
      const result = isSessionTimedOut();

      expect(result).toBe(false);
    });

    it("should return false when within timeout", async () => {
      mockSessionStorage["spike_last_activity"] = (
        Date.now() - 5 * 60 * 1000
      ).toString();

      const { isSessionTimedOut } = await import("./session-manager");
      const result = isSessionTimedOut();

      expect(result).toBe(false);
    });

    it("should return true when past timeout", async () => {
      mockSessionStorage["spike_last_activity"] = (
        Date.now() - 31 * 60 * 1000
      ).toString();

      const { isSessionTimedOut } = await import("./session-manager");
      const result = isSessionTimedOut();

      expect(result).toBe(true);
    });
  });

  describe("getSessionTimeoutMinutes", () => {
    it("should return 30 minutes", async () => {
      const { getSessionTimeoutMinutes } = await import("./session-manager");
      const timeout = getSessionTimeoutMinutes();

      expect(timeout).toBe(30);
    });
  });
});
