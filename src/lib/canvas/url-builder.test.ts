import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_INTERVAL, DEFAULT_ORDER, DEFAULT_ROTATION } from "./constants";
import { buildCanvasUrl } from "./url-builder";

describe("buildCanvasUrl", () => {
  const albumId = "test-album-123";
  const baseUrl = "https://spike.land";

  describe("with default settings", () => {
    it("should produce minimal URL with no query params", () => {
      const url = buildCanvasUrl(
        albumId,
        null,
        {
          rotation: DEFAULT_ROTATION,
          order: DEFAULT_ORDER,
          interval: DEFAULT_INTERVAL,
        },
        baseUrl,
      );

      expect(url).toBe(
        `${baseUrl}/canvas/${albumId}`,
      );
    });

    it("should produce minimal URL with empty settings object", () => {
      const url = buildCanvasUrl(albumId, null, {}, baseUrl);

      expect(url).toBe(
        `${baseUrl}/canvas/${albumId}`,
      );
    });
  });

  describe("with share token", () => {
    it("should include token parameter when provided", () => {
      const shareToken = "secret-token-xyz";
      const url = buildCanvasUrl(albumId, shareToken, {}, baseUrl);

      expect(url).toBe(
        `${baseUrl}/canvas/${albumId}?token=${shareToken}`,
      );
    });

    it("should not include token parameter when null", () => {
      const url = buildCanvasUrl(albumId, null, {}, baseUrl);

      expect(url).not.toContain("token=");
    });
  });

  describe("with non-default rotation", () => {
    it("should include rotation parameter for 90 degrees", () => {
      const url = buildCanvasUrl(
        albumId,
        null,
        { rotation: 90 },
        baseUrl,
      );

      expect(url).toContain("rotation=90");
    });

    it("should include rotation parameter for 180 degrees", () => {
      const url = buildCanvasUrl(
        albumId,
        null,
        { rotation: 180 },
        baseUrl,
      );

      expect(url).toContain("rotation=180");
    });

    it("should include rotation parameter for 270 degrees", () => {
      const url = buildCanvasUrl(
        albumId,
        null,
        { rotation: 270 },
        baseUrl,
      );

      expect(url).toContain("rotation=270");
    });

    it("should not include rotation parameter for default 0 degrees", () => {
      const url = buildCanvasUrl(
        albumId,
        null,
        { rotation: 0 },
        baseUrl,
      );

      expect(url).not.toContain("rotation=");
    });
  });

  describe("with non-default order", () => {
    it("should include order parameter for random", () => {
      const url = buildCanvasUrl(
        albumId,
        null,
        { order: "random" },
        baseUrl,
      );

      expect(url).toContain("order=random");
    });

    it("should not include order parameter for default album", () => {
      const url = buildCanvasUrl(
        albumId,
        null,
        { order: "album" },
        baseUrl,
      );

      expect(url).not.toContain("order=");
    });
  });

  describe("with non-default interval", () => {
    it("should include interval parameter for 5 seconds", () => {
      const url = buildCanvasUrl(
        albumId,
        null,
        { interval: 5 },
        baseUrl,
      );

      expect(url).toContain("interval=5");
    });

    it("should include interval parameter for 30 seconds", () => {
      const url = buildCanvasUrl(
        albumId,
        null,
        { interval: 30 },
        baseUrl,
      );

      expect(url).toContain("interval=30");
    });

    it("should not include interval parameter for default 10 seconds", () => {
      const url = buildCanvasUrl(
        albumId,
        null,
        { interval: 10 },
        baseUrl,
      );

      expect(url).not.toContain("interval=");
    });
  });

  describe("with multiple non-default values", () => {
    it("should include all non-default parameters", () => {
      const url = buildCanvasUrl(
        albumId,
        "token-123",
        {
          rotation: 90,
          order: "random",
          interval: 15,
        },
        baseUrl,
      );

      expect(url).toContain("token=token-123");
      expect(url).toContain("rotation=90");
      expect(url).toContain("order=random");
      expect(url).toContain("interval=15");
    });

    it("should only include non-default parameters when mixed with defaults", () => {
      const url = buildCanvasUrl(
        albumId,
        null,
        {
          rotation: 0, // default
          order: "random", // non-default
          interval: 10, // default
        },
        baseUrl,
      );

      expect(url).not.toContain("rotation=");
      expect(url).toContain("order=random");
      expect(url).not.toContain("interval=");
    });
  });

  describe("without baseUrl", () => {
    let originalWindow: typeof global.window;

    beforeEach(() => {
      originalWindow = global.window;
    });

    afterEach(() => {
      global.window = originalWindow;
    });

    it("should use window.location.origin when baseUrl is not provided", () => {
      Object.defineProperty(global, "window", {
        value: {
          location: {
            origin: "https://example.com",
          },
        },
        writable: true,
        configurable: true,
      });

      const url = buildCanvasUrl(albumId, null, {});

      expect(url).toBe(
        `https://example.com/canvas/${albumId}`,
      );
    });

    it("should use localhost when window is undefined (SSR)", () => {
      Object.defineProperty(global, "window", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const url = buildCanvasUrl(albumId, null, {});

      expect(url).toBe(`http://localhost/canvas/${albumId}`);
    });
  });

  describe("URL encoding", () => {
    it("should properly encode album ID with special characters", () => {
      const specialAlbumId = "album with spaces";
      const url = buildCanvasUrl(specialAlbumId, null, {}, baseUrl);

      expect(url).toContain("album%20with%20spaces");
    });

    it("should properly encode share token with special characters", () => {
      const specialToken = "token+with/special=chars";
      const url = buildCanvasUrl(albumId, specialToken, {}, baseUrl);

      expect(url).toContain("token=token%2Bwith%2Fspecial%3Dchars");
    });
  });
});
