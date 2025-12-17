/**
 * Visitor ID Management Tests
 *
 * Tests for visitor ID generation, storage, and cookie management.
 * Includes both client-side and server-side functionality.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock next/headers cookies
const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

// Mock nanoid
vi.mock("nanoid", () => ({
  nanoid: vi.fn(() => "mocked_nanoid_12345678901"),
}));

describe("visitor-id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    // Ensure no globals are stubbed for server-side tests
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("Server-side functions", () => {
    describe("getVisitorIdFromCookie", () => {
      it("should return visitor ID from cookie", async () => {
        mockCookieStore.get.mockReturnValue({ value: "v_test_visitor_id" });

        const { getVisitorIdFromCookie } = await import("./visitor-id");
        const visitorId = await getVisitorIdFromCookie();

        expect(visitorId).toBe("v_test_visitor_id");
        expect(mockCookieStore.get).toHaveBeenCalledWith("spike_visitor_id");
      });

      it("should return null when cookie does not exist", async () => {
        mockCookieStore.get.mockReturnValue(undefined);

        const { getVisitorIdFromCookie } = await import("./visitor-id");
        const visitorId = await getVisitorIdFromCookie();

        expect(visitorId).toBeNull();
      });

      it("should return null when cookie value is undefined", async () => {
        mockCookieStore.get.mockReturnValue({ value: undefined });

        const { getVisitorIdFromCookie } = await import("./visitor-id");
        const visitorId = await getVisitorIdFromCookie();

        expect(visitorId).toBeNull();
      });
    });

    describe("setVisitorIdServerCookie", () => {
      it("should set visitor ID in cookie", async () => {
        const { setVisitorIdServerCookie } = await import("./visitor-id");
        await setVisitorIdServerCookie("v_test_123");

        expect(mockCookieStore.set).toHaveBeenCalledWith(
          "spike_visitor_id",
          "v_test_123",
          expect.objectContaining({
            maxAge: 365 * 24 * 60 * 60, // 1 year
            httpOnly: false,
            sameSite: "lax",
            path: "/",
          }),
        );
      });
    });

    describe("getOrCreateVisitorIdServer", () => {
      it("should return existing visitor ID from cookie", async () => {
        mockCookieStore.get.mockReturnValue({ value: "v_existing_id" });

        const { getOrCreateVisitorIdServer } = await import("./visitor-id");
        const visitorId = await getOrCreateVisitorIdServer();

        expect(visitorId).toBe("v_existing_id");
        expect(mockCookieStore.set).not.toHaveBeenCalled();
      });

      it("should generate and store new visitor ID if none exists", async () => {
        mockCookieStore.get.mockReturnValue(undefined);

        const { getOrCreateVisitorIdServer } = await import("./visitor-id");
        const visitorId = await getOrCreateVisitorIdServer();

        expect(visitorId).toBe("v_mocked_nanoid_12345678901");
        expect(mockCookieStore.set).toHaveBeenCalledWith(
          "spike_visitor_id",
          "v_mocked_nanoid_12345678901",
          expect.any(Object),
        );
      });
    });

    describe("clearVisitorIdCookieServer", () => {
      it("should delete the visitor ID cookie", async () => {
        const { clearVisitorIdCookieServer } = await import("./visitor-id");
        await clearVisitorIdCookieServer();

        expect(mockCookieStore.delete).toHaveBeenCalledWith("spike_visitor_id");
      });
    });

    describe("getVisitorIdFromStorage (server-side)", () => {
      it("should return null on server side", async () => {
        const { getVisitorIdFromStorage } = await import("./visitor-id");
        const result = getVisitorIdFromStorage();

        expect(result).toBeNull();
      });
    });

    describe("getVisitorId (server-side)", () => {
      it("should throw error when called on server side", async () => {
        // Simulate server-side by making window undefined
        vi.stubGlobal("window", undefined);

        const { getVisitorId } = await import("./visitor-id");

        expect(() => getVisitorId()).toThrow(
          "getVisitorId() can only be called on the client side",
        );

        vi.unstubAllGlobals();
      });
    });

    describe("setVisitorId (server-side)", () => {
      it("should throw error when called on server side", async () => {
        // Simulate server-side by making window undefined
        vi.stubGlobal("window", undefined);

        const { setVisitorId } = await import("./visitor-id");

        expect(() => setVisitorId("v_test")).toThrow(
          "setVisitorId() can only be called on the client side",
        );

        vi.unstubAllGlobals();
      });
    });

    describe("clearVisitorId (server-side)", () => {
      it("should do nothing on server side", async () => {
        const { clearVisitorId } = await import("./visitor-id");

        // Should not throw
        expect(() => clearVisitorId()).not.toThrow();
      });
    });

    describe("syncVisitorIdToCookie (server-side)", () => {
      it("should do nothing on server side", async () => {
        const { syncVisitorIdToCookie } = await import("./visitor-id");

        // Should not throw
        expect(() => syncVisitorIdToCookie()).not.toThrow();
      });
    });
  });

  describe("Client-side functions", () => {
    let mockLocalStorage: Record<string, string>;
    let mockDocumentCookie: string;
    let mockLocalStorageObj: {
      getItem: ReturnType<typeof vi.fn>;
      setItem: ReturnType<typeof vi.fn>;
      removeItem: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockLocalStorage = {};
      mockDocumentCookie = "";

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

      // Stub localStorage directly (code uses localStorage, not window.localStorage)
      vi.stubGlobal("localStorage", mockLocalStorageObj);

      // Stub sessionStorage directly
      vi.stubGlobal("sessionStorage", {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      });

      // Stub window (for typeof window !== "undefined" checks)
      vi.stubGlobal("window", {
        localStorage: mockLocalStorageObj,
        sessionStorage: {
          getItem: vi.fn(),
          setItem: vi.fn(),
          removeItem: vi.fn(),
        },
      });

      // Create a proper document mock with cookie getter/setter
      vi.stubGlobal("document", {
        get cookie() {
          return mockDocumentCookie;
        },
        set cookie(value: string) {
          mockDocumentCookie = value;
        },
      });
    });

    describe("getVisitorIdFromStorage", () => {
      it("should return visitor ID from localStorage", async () => {
        mockLocalStorage["spike_visitor_id"] = "v_stored_id";

        const { getVisitorIdFromStorage } = await import("./visitor-id");
        const visitorId = getVisitorIdFromStorage();

        expect(visitorId).toBe("v_stored_id");
      });

      it("should return null when localStorage does not have visitor ID", async () => {
        const { getVisitorIdFromStorage } = await import("./visitor-id");
        const visitorId = getVisitorIdFromStorage();

        expect(visitorId).toBeNull();
      });
    });

    describe("getVisitorId", () => {
      it("should return existing visitor ID from localStorage", async () => {
        mockLocalStorage["spike_visitor_id"] = "v_existing_client_id";
        mockLocalStorage["cookie-consent"] = "accepted";

        const { getVisitorId } = await import("./visitor-id");
        const visitorId = getVisitorId();

        expect(visitorId).toBe("v_existing_client_id");
      });

      it("should generate and store new visitor ID if none exists", async () => {
        mockLocalStorage["cookie-consent"] = "accepted";

        const { getVisitorId } = await import("./visitor-id");
        const visitorId = getVisitorId();

        expect(visitorId).toBe("v_mocked_nanoid_12345678901");
        expect(mockLocalStorageObj.setItem).toHaveBeenCalledWith(
          "spike_visitor_id",
          "v_mocked_nanoid_12345678901",
        );
      });

      it("should set cookie when consent is given", async () => {
        mockLocalStorage["cookie-consent"] = "accepted";

        const { getVisitorId } = await import("./visitor-id");
        getVisitorId();

        // Cookie should be set (via document.cookie)
        expect(mockDocumentCookie).toContain(
          "spike_visitor_id=v_mocked_nanoid_12345678901",
        );
      });

      it("should not set cookie when consent is not given", async () => {
        // No cookie consent in localStorage
        const { getVisitorId } = await import("./visitor-id");
        getVisitorId();

        // Cookie should not contain visitor ID
        expect(mockDocumentCookie).not.toContain("spike_visitor_id");
      });
    });

    describe("setVisitorId", () => {
      it("should set visitor ID in localStorage", async () => {
        mockLocalStorage["cookie-consent"] = "accepted";

        const { setVisitorId } = await import("./visitor-id");
        setVisitorId("v_new_id_12345");

        expect(mockLocalStorageObj.setItem).toHaveBeenCalledWith(
          "spike_visitor_id",
          "v_new_id_12345",
        );
      });

      it("should throw error for invalid visitor ID format", async () => {
        const { setVisitorId } = await import("./visitor-id");

        expect(() => setVisitorId("invalid_id")).toThrow(
          "Invalid visitor ID format. Must start with 'v_'",
        );
      });

      it("should set cookie when consent is given", async () => {
        mockLocalStorage["cookie-consent"] = "accepted";

        const { setVisitorId } = await import("./visitor-id");
        setVisitorId("v_new_id_12345");

        expect(mockDocumentCookie).toContain("spike_visitor_id=v_new_id_12345");
      });

      it("should not set cookie when consent is not given", async () => {
        // No cookie consent
        const { setVisitorId } = await import("./visitor-id");
        setVisitorId("v_new_id_12345");

        expect(mockDocumentCookie).not.toContain("spike_visitor_id");
      });
    });

    describe("clearVisitorId", () => {
      it("should remove visitor ID from localStorage", async () => {
        mockLocalStorage["spike_visitor_id"] = "v_to_clear";

        const { clearVisitorId } = await import("./visitor-id");
        clearVisitorId();

        expect(mockLocalStorageObj.removeItem).toHaveBeenCalledWith(
          "spike_visitor_id",
        );
      });

      it("should clear visitor ID cookie", async () => {
        mockDocumentCookie = "spike_visitor_id=v_old_id; max-age=31536000";

        const { clearVisitorId } = await import("./visitor-id");
        clearVisitorId();

        // Cookie should be cleared with max-age=0
        expect(mockDocumentCookie).toContain("max-age=0");
      });
    });

    describe("syncVisitorIdToCookie", () => {
      it("should sync visitor ID to cookie when consent given", async () => {
        mockLocalStorage["spike_visitor_id"] = "v_sync_me";
        mockLocalStorage["cookie-consent"] = "accepted";

        const { syncVisitorIdToCookie } = await import("./visitor-id");
        syncVisitorIdToCookie();

        expect(mockDocumentCookie).toContain("spike_visitor_id=v_sync_me");
      });

      it("should not sync when no visitor ID in localStorage", async () => {
        mockLocalStorage["cookie-consent"] = "accepted";

        const { syncVisitorIdToCookie } = await import("./visitor-id");
        syncVisitorIdToCookie();

        expect(mockDocumentCookie).not.toContain("spike_visitor_id");
      });

      it("should not sync when consent not given", async () => {
        mockLocalStorage["spike_visitor_id"] = "v_sync_me";

        const { syncVisitorIdToCookie } = await import("./visitor-id");
        syncVisitorIdToCookie();

        expect(mockDocumentCookie).not.toContain("spike_visitor_id");
      });
    });
  });
});
