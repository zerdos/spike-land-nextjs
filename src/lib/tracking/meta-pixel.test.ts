/**
 * Meta Pixel Event Tracking Tests
 *
 * Tests for Meta Pixel event tracking utilities.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("MetaPixel", () => {
  let mockFbq: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    mockFbq = vi.fn();
    vi.stubGlobal("window", { fbq: mockFbq });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("trackMetaEvent", () => {
    it("should call window.fbq with track method", async () => {
      const { trackMetaEvent } = await import("./MetaPixel");
      trackMetaEvent("Lead", { content_name: "Premium Plan" });

      expect(mockFbq).toHaveBeenCalledWith("track", "Lead", {
        content_name: "Premium Plan",
      });
    });

    it("should handle events without params", async () => {
      const { trackMetaEvent } = await import("./MetaPixel");
      trackMetaEvent("PageView");

      expect(mockFbq).toHaveBeenCalledWith("track", "PageView", undefined);
    });

    it("should not throw when window.fbq is undefined", async () => {
      vi.stubGlobal("window", {});

      const { trackMetaEvent } = await import("./MetaPixel");

      expect(() => trackMetaEvent("Lead")).not.toThrow();
    });

    it("should not throw on server side", async () => {
      vi.unstubAllGlobals();

      const { trackMetaEvent } = await import("./MetaPixel");

      expect(() => trackMetaEvent("Lead")).not.toThrow();
    });

    it("should track Purchase event with value", async () => {
      const { trackMetaEvent } = await import("./MetaPixel");
      trackMetaEvent("Purchase", { value: 9.99, currency: "USD" });

      expect(mockFbq).toHaveBeenCalledWith("track", "Purchase", {
        value: 9.99,
        currency: "USD",
      });
    });
  });

  describe("trackMetaCustomEvent", () => {
    it("should call window.fbq with trackCustom method", async () => {
      const { trackMetaCustomEvent } = await import("./MetaPixel");
      trackMetaCustomEvent("EnhancementCompleted", { tier: "TIER_4K" });

      expect(mockFbq).toHaveBeenCalledWith(
        "trackCustom",
        "EnhancementCompleted",
        {
          tier: "TIER_4K",
        },
      );
    });

    it("should handle events without params", async () => {
      const { trackMetaCustomEvent } = await import("./MetaPixel");
      trackMetaCustomEvent("CustomEvent");

      expect(mockFbq).toHaveBeenCalledWith(
        "trackCustom",
        "CustomEvent",
        undefined,
      );
    });

    it("should not throw when window.fbq is undefined", async () => {
      vi.stubGlobal("window", {});

      const { trackMetaCustomEvent } = await import("./MetaPixel");

      expect(() => trackMetaCustomEvent("CustomEvent")).not.toThrow();
    });

    it("should not throw on server side", async () => {
      vi.unstubAllGlobals();

      const { trackMetaCustomEvent } = await import("./MetaPixel");

      expect(() => trackMetaCustomEvent("CustomEvent")).not.toThrow();
    });
  });

  describe("fireMetaPixelEvent", () => {
    it("should fire standard event for mapped internal event", async () => {
      const { fireMetaPixelEvent } = await import("./MetaPixel");
      const result = fireMetaPixelEvent("signup_started", { plan: "free" });

      expect(result).toBe(true);
      expect(mockFbq).toHaveBeenCalledWith("track", "Lead", { plan: "free" });
    });

    it("should fire CompleteRegistration for signup_completed", async () => {
      const { fireMetaPixelEvent } = await import("./MetaPixel");
      const result = fireMetaPixelEvent("signup_completed");

      expect(result).toBe(true);
      expect(mockFbq).toHaveBeenCalledWith(
        "track",
        "CompleteRegistration",
        undefined,
      );
    });

    it("should fire InitiateCheckout for purchase_started", async () => {
      const { fireMetaPixelEvent } = await import("./MetaPixel");
      const result = fireMetaPixelEvent("purchase_started", {
        product: "tokens",
      });

      expect(result).toBe(true);
      expect(mockFbq).toHaveBeenCalledWith("track", "InitiateCheckout", {
        product: "tokens",
      });
    });

    it("should fire Purchase for purchase_completed", async () => {
      const { fireMetaPixelEvent } = await import("./MetaPixel");
      const result = fireMetaPixelEvent("purchase_completed", { value: 9.99 });

      expect(result).toBe(true);
      expect(mockFbq).toHaveBeenCalledWith("track", "Purchase", {
        value: 9.99,
      });
    });

    it("should fire custom event for enhancement_started", async () => {
      const { fireMetaPixelEvent } = await import("./MetaPixel");
      const result = fireMetaPixelEvent("enhancement_started", { tier: "4K" });

      expect(result).toBe(true);
      expect(mockFbq).toHaveBeenCalledWith(
        "trackCustom",
        "EnhancementStarted",
        {
          tier: "4K",
        },
      );
    });

    it("should fire custom event for enhancement_completed", async () => {
      const { fireMetaPixelEvent } = await import("./MetaPixel");
      const result = fireMetaPixelEvent("enhancement_completed", {
        tier: "TIER_4K",
      });

      expect(result).toBe(true);
      expect(mockFbq).toHaveBeenCalledWith(
        "trackCustom",
        "EnhancementCompleted",
        {
          tier: "TIER_4K",
        },
      );
    });

    it("should fire custom event for album_created", async () => {
      const { fireMetaPixelEvent } = await import("./MetaPixel");
      const result = fireMetaPixelEvent("album_created", { imageCount: 5 });

      expect(result).toBe(true);
      expect(mockFbq).toHaveBeenCalledWith("trackCustom", "AlbumCreated", {
        imageCount: 5,
      });
    });

    it("should fire custom event for image_uploaded", async () => {
      const { fireMetaPixelEvent } = await import("./MetaPixel");
      const result = fireMetaPixelEvent("image_uploaded");

      expect(result).toBe(true);
      expect(mockFbq).toHaveBeenCalledWith(
        "trackCustom",
        "ImageUploaded",
        undefined,
      );
    });

    it("should return false for unmapped events", async () => {
      const { fireMetaPixelEvent } = await import("./MetaPixel");
      const result = fireMetaPixelEvent("unknown_event");

      expect(result).toBe(false);
      expect(mockFbq).not.toHaveBeenCalled();
    });

    it("should not throw on server side", async () => {
      vi.unstubAllGlobals();

      const { fireMetaPixelEvent } = await import("./MetaPixel");

      expect(() => fireMetaPixelEvent("signup_started")).not.toThrow();
    });
  });

  describe("EVENT_MAPPING", () => {
    it("should have correct mappings for all events", async () => {
      const { EVENT_MAPPING } = await import("./MetaPixel");

      expect(EVENT_MAPPING.signup_started).toEqual({
        metaEvent: "Lead",
        isStandard: true,
      });
      expect(EVENT_MAPPING.signup_completed).toEqual({
        metaEvent: "CompleteRegistration",
        isStandard: true,
      });
      expect(EVENT_MAPPING.purchase_started).toEqual({
        metaEvent: "InitiateCheckout",
        isStandard: true,
      });
      expect(EVENT_MAPPING.purchase_completed).toEqual({
        metaEvent: "Purchase",
        isStandard: true,
      });
      expect(EVENT_MAPPING.enhancement_started).toEqual({
        metaEvent: "EnhancementStarted",
        isStandard: false,
      });
      expect(EVENT_MAPPING.enhancement_completed).toEqual({
        metaEvent: "EnhancementCompleted",
        isStandard: false,
      });
      expect(EVENT_MAPPING.album_created).toEqual({
        metaEvent: "AlbumCreated",
        isStandard: false,
      });
      expect(EVENT_MAPPING.image_uploaded).toEqual({
        metaEvent: "ImageUploaded",
        isStandard: false,
      });
    });
  });
});
