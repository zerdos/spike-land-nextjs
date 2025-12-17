/**
 * UTM Parameter Capture Tests
 *
 * Tests for UTM parameter extraction, cookie storage, and platform detection.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock next/headers cookies
const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

// Import after mocking
import {
  captureAndStoreUTM,
  captureUTMParams,
  clearUTMCookie,
  getPlatformFromUTM,
  getUTMFromCookies,
  storeUTMParams,
  type UTMParams,
} from "./utm-capture";

describe("utm-capture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("captureUTMParams", () => {
    it("should extract all UTM parameters from URL", () => {
      const url = new URL(
        "https://spike.land?utm_source=google&utm_medium=cpc&utm_campaign=brand&utm_term=test&utm_content=ad1",
      );

      const params = captureUTMParams(url);

      expect(params).toEqual({
        utm_source: "google",
        utm_medium: "cpc",
        utm_campaign: "brand",
        utm_term: "test",
        utm_content: "ad1",
      });
    });

    it("should extract Google click ID (gclid)", () => {
      const url = new URL(
        "https://spike.land?gclid=CjwKCAjw_ISWBhBkEiwAdqxb9mJqBfN",
      );

      const params = captureUTMParams(url);

      expect(params).toEqual({
        gclid: "CjwKCAjw_ISWBhBkEiwAdqxb9mJqBfN",
      });
    });

    it("should extract Facebook click ID (fbclid)", () => {
      const url = new URL(
        "https://spike.land?fbclid=IwAR1234567890abcdef",
      );

      const params = captureUTMParams(url);

      expect(params).toEqual({
        fbclid: "IwAR1234567890abcdef",
      });
    });

    it("should extract both UTM and click IDs", () => {
      const url = new URL(
        "https://spike.land?utm_source=google&utm_campaign=brand&gclid=abc123",
      );

      const params = captureUTMParams(url);

      expect(params).toEqual({
        utm_source: "google",
        utm_campaign: "brand",
        gclid: "abc123",
      });
    });

    it("should return empty object for URL without parameters", () => {
      const url = new URL("https://spike.land/");

      const params = captureUTMParams(url);

      expect(params).toEqual({});
    });

    it("should ignore non-UTM parameters", () => {
      const url = new URL(
        "https://spike.land?foo=bar&utm_source=test&baz=qux",
      );

      const params = captureUTMParams(url);

      expect(params).toEqual({
        utm_source: "test",
      });
    });

    it("should handle partial UTM parameters", () => {
      const url = new URL(
        "https://spike.land?utm_source=facebook&utm_campaign=promo",
      );

      const params = captureUTMParams(url);

      expect(params).toEqual({
        utm_source: "facebook",
        utm_campaign: "promo",
      });
    });

    it("should handle empty parameter values", () => {
      const url = new URL("https://spike.land?utm_source=&utm_medium=email");

      const params = captureUTMParams(url);

      // Empty string is falsy, so utm_source should not be included
      expect(params).toEqual({
        utm_medium: "email",
      });
    });
  });

  describe("getUTMFromCookies", () => {
    it("should return null when cookie does not exist", async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const params = await getUTMFromCookies();

      expect(params).toBeNull();
    });

    it("should return null when cookie value is empty", async () => {
      mockCookieStore.get.mockReturnValue({ value: "" });

      const params = await getUTMFromCookies();

      expect(params).toBeNull();
    });

    it("should return parsed UTM params from valid cookie", async () => {
      const storedParams: UTMParams = {
        utm_source: "google",
        utm_medium: "cpc",
        utm_campaign: "test",
      };
      mockCookieStore.get.mockReturnValue({
        value: JSON.stringify(storedParams),
      });

      const params = await getUTMFromCookies();

      expect(params).toEqual(storedParams);
    });

    it("should return null for invalid JSON in cookie", async () => {
      mockCookieStore.get.mockReturnValue({
        value: "not valid json {",
      });

      const params = await getUTMFromCookies();

      expect(params).toBeNull();
    });

    it("should return null when cookie contains no valid UTM params", async () => {
      mockCookieStore.get.mockReturnValue({
        value: JSON.stringify({ foo: "bar" }),
      });

      const params = await getUTMFromCookies();

      expect(params).toBeNull();
    });

    it("should return params when at least one valid UTM param exists", async () => {
      mockCookieStore.get.mockReturnValue({
        value: JSON.stringify({ utm_source: "test", invalid: "key" }),
      });

      const params = await getUTMFromCookies();

      expect(params).toEqual({ utm_source: "test", invalid: "key" });
    });
  });

  describe("storeUTMParams", () => {
    it("should store valid UTM params in cookie", async () => {
      const params: UTMParams = {
        utm_source: "google",
        utm_campaign: "brand",
      };

      await storeUTMParams(params);

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "spike_utm_params",
        JSON.stringify(params),
        expect.objectContaining({
          maxAge: 30 * 24 * 60 * 60, // 30 days
          httpOnly: true,
          sameSite: "lax",
          path: "/",
        }),
      );
    });

    it("should not store empty params object", async () => {
      await storeUTMParams({});

      expect(mockCookieStore.set).not.toHaveBeenCalled();
    });

    it("should not store params with no valid UTM keys", async () => {
      await storeUTMParams({} as UTMParams);

      expect(mockCookieStore.set).not.toHaveBeenCalled();
    });

    it("should store params with gclid only", async () => {
      const params: UTMParams = {
        gclid: "abc123",
      };

      await storeUTMParams(params);

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "spike_utm_params",
        JSON.stringify(params),
        expect.any(Object),
      );
    });

    it("should store params with fbclid only", async () => {
      const params: UTMParams = {
        fbclid: "def456",
      };

      await storeUTMParams(params);

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "spike_utm_params",
        JSON.stringify(params),
        expect.any(Object),
      );
    });
  });

  describe("clearUTMCookie", () => {
    it("should delete the UTM cookie", async () => {
      await clearUTMCookie();

      expect(mockCookieStore.delete).toHaveBeenCalledWith("spike_utm_params");
    });
  });

  describe("captureAndStoreUTM", () => {
    it("should capture UTM params and store them", async () => {
      const url = new URL(
        "https://spike.land?utm_source=google&utm_campaign=test",
      );

      const params = await captureAndStoreUTM(url);

      expect(params).toEqual({
        utm_source: "google",
        utm_campaign: "test",
      });
      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "spike_utm_params",
        JSON.stringify(params),
        expect.any(Object),
      );
    });

    it("should return empty object and not store when no params", async () => {
      const url = new URL("https://spike.land/");

      const params = await captureAndStoreUTM(url);

      expect(params).toEqual({});
      expect(mockCookieStore.set).not.toHaveBeenCalled();
    });
  });

  describe("getPlatformFromUTM", () => {
    it("should return GOOGLE_ADS for gclid", () => {
      const params: UTMParams = { gclid: "abc123" };

      const platform = getPlatformFromUTM(params);

      expect(platform).toBe("GOOGLE_ADS");
    });

    it("should return FACEBOOK for fbclid", () => {
      const params: UTMParams = { fbclid: "xyz789" };

      const platform = getPlatformFromUTM(params);

      expect(platform).toBe("FACEBOOK");
    });

    it("should prioritize gclid over fbclid", () => {
      const params: UTMParams = { gclid: "abc123", fbclid: "xyz789" };

      const platform = getPlatformFromUTM(params);

      expect(platform).toBe("GOOGLE_ADS");
    });

    it("should return GOOGLE_ADS for google source", () => {
      const params: UTMParams = { utm_source: "google" };

      const platform = getPlatformFromUTM(params);

      expect(platform).toBe("GOOGLE_ADS");
    });

    it("should return GOOGLE_ADS for gads source", () => {
      const params: UTMParams = { utm_source: "gads" };

      const platform = getPlatformFromUTM(params);

      expect(platform).toBe("GOOGLE_ADS");
    });

    it("should return FACEBOOK for facebook source", () => {
      const params: UTMParams = { utm_source: "facebook" };

      const platform = getPlatformFromUTM(params);

      expect(platform).toBe("FACEBOOK");
    });

    it("should return FACEBOOK for fb source", () => {
      const params: UTMParams = { utm_source: "fb" };

      const platform = getPlatformFromUTM(params);

      expect(platform).toBe("FACEBOOK");
    });

    it("should return FACEBOOK for instagram source", () => {
      const params: UTMParams = { utm_source: "instagram" };

      const platform = getPlatformFromUTM(params);

      expect(platform).toBe("FACEBOOK");
    });

    it("should return FACEBOOK for meta source", () => {
      const params: UTMParams = { utm_source: "meta" };

      const platform = getPlatformFromUTM(params);

      expect(platform).toBe("FACEBOOK");
    });

    it("should return OTHER for unknown source", () => {
      const params: UTMParams = { utm_source: "newsletter" };

      const platform = getPlatformFromUTM(params);

      expect(platform).toBe("OTHER");
    });

    it("should return DIRECT for no params", () => {
      const params: UTMParams = {};

      const platform = getPlatformFromUTM(params);

      expect(platform).toBe("DIRECT");
    });

    it("should be case insensitive for source detection", () => {
      const params: UTMParams = { utm_source: "GOOGLE" };

      const platform = getPlatformFromUTM(params);

      expect(platform).toBe("GOOGLE_ADS");
    });

    it("should return FACEBOOK for Facebook (capitalized)", () => {
      const params: UTMParams = { utm_source: "Facebook" };

      const platform = getPlatformFromUTM(params);

      expect(platform).toBe("FACEBOOK");
    });
  });
});
