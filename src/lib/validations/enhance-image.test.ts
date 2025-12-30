import { describe, expect, it } from "vitest";
import {
  enhanceImageRequestSchema,
  isValidTier,
  VALID_TIERS,
  validateBase64Size,
  validateEnhanceRequest,
} from "./enhance-image";

describe("enhanceImageRequestSchema", () => {
  describe("valid requests", () => {
    it("should accept valid request with imageId and tier", () => {
      const result = enhanceImageRequestSchema.safeParse({
        imageId: "test-image-id",
        tier: "TIER_1K",
      });
      expect(result.success).toBe(true);
    });

    it("should accept all valid tiers", () => {
      for (const tier of VALID_TIERS) {
        const result = enhanceImageRequestSchema.safeParse({
          imageId: "test-image-id",
          tier,
        });
        expect(result.success).toBe(true);
      }
    });

    it("should accept request with blend source imageId", () => {
      const result = enhanceImageRequestSchema.safeParse({
        imageId: "test-image-id",
        tier: "TIER_2K",
        blendSource: {
          imageId: "blend-source-id",
        },
      });
      expect(result.success).toBe(true);
    });

    it("should accept request with blend source base64", () => {
      const result = enhanceImageRequestSchema.safeParse({
        imageId: "test-image-id",
        tier: "TIER_4K",
        blendSource: {
          base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk",
          mimeType: "image/png",
        },
      });
      expect(result.success).toBe(true);
    });

    it("should accept FREE tier", () => {
      const result = enhanceImageRequestSchema.safeParse({
        imageId: "test-image-id",
        tier: "FREE",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("invalid requests", () => {
    it("should reject missing imageId", () => {
      const result = enhanceImageRequestSchema.safeParse({
        tier: "TIER_1K",
      });
      expect(result.success).toBe(false);
    });

    it("should reject empty imageId", () => {
      const result = enhanceImageRequestSchema.safeParse({
        imageId: "",
        tier: "TIER_1K",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing tier", () => {
      const result = enhanceImageRequestSchema.safeParse({
        imageId: "test-image-id",
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid tier", () => {
      const result = enhanceImageRequestSchema.safeParse({
        imageId: "test-image-id",
        tier: "INVALID_TIER",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("blendSource validation", () => {
    it("should reject blendSource with both imageId and base64", () => {
      const result = enhanceImageRequestSchema.safeParse({
        imageId: "test-image-id",
        tier: "TIER_1K",
        blendSource: {
          imageId: "blend-source-id",
          base64: "some-base64",
          mimeType: "image/png",
        },
      });
      expect(result.success).toBe(false);
    });

    it("should reject blendSource with base64 but no mimeType", () => {
      const result = enhanceImageRequestSchema.safeParse({
        imageId: "test-image-id",
        tier: "TIER_1K",
        blendSource: {
          base64: "some-base64",
        },
      });
      expect(result.success).toBe(false);
    });

    it("should reject blendSource with invalid mimeType", () => {
      const result = enhanceImageRequestSchema.safeParse({
        imageId: "test-image-id",
        tier: "TIER_1K",
        blendSource: {
          base64: "some-base64",
          mimeType: "text/plain",
        },
      });
      expect(result.success).toBe(false);
    });

    it("should reject empty blendSource object (neither imageId nor base64)", () => {
      const result = enhanceImageRequestSchema.safeParse({
        imageId: "test-image-id",
        tier: "TIER_1K",
        blendSource: {},
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("validateEnhanceRequest", () => {
  it("should return success for valid request", () => {
    const result = validateEnhanceRequest({
      imageId: "test-id",
      tier: "TIER_1K",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.imageId).toBe("test-id");
      expect(result.data.tier).toBe("TIER_1K");
    }
  });

  it("should return error for missing imageId", () => {
    const result = validateEnhanceRequest({
      tier: "TIER_1K",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("imageId");
      expect(result.suggestion).toBe("Please provide a valid image ID.");
    }
  });

  it("should return error for invalid tier", () => {
    const result = validateEnhanceRequest({
      imageId: "test-id",
      tier: "INVALID",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("tier");
      expect(result.suggestion).toBe(
        "Please select a valid enhancement tier (FREE, 1K, 2K, or 4K).",
      );
    }
  });

  it("should return error for invalid blendSource", () => {
    const result = validateEnhanceRequest({
      imageId: "test-id",
      tier: "TIER_1K",
      blendSource: {
        imageId: "blend-id",
        base64: "data",
      },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.suggestion).toBe(
        "Please provide either an image ID or base64 data for the blend source.",
      );
    }
  });

  it("should return generic suggestion for unknown field errors", () => {
    // Force a generic error by passing invalid data type
    const result = validateEnhanceRequest(null);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.suggestion).toBe(
        "Please check your request and try again.",
      );
    }
  });
});

describe("validateBase64Size", () => {
  it("should accept small base64 strings", () => {
    const smallBase64 = "a".repeat(1000);
    const result = validateBase64Size(smallBase64);
    expect(result.valid).toBe(true);
    expect(result.estimatedSize).toBeCloseTo(750, 0);
    expect(result.maxSize).toBe(20 * 1024 * 1024);
  });

  it("should reject base64 strings exceeding 20MB", () => {
    // Create a base64 string that would decode to > 20MB
    // Base64 adds ~33% overhead, so we need ~27MB of base64 to get > 20MB
    const largeBase64 = "a".repeat(28 * 1024 * 1024);
    const result = validateBase64Size(largeBase64);
    expect(result.valid).toBe(false);
    expect(result.estimatedSize).toBeGreaterThan(result.maxSize);
  });

  it("should accept base64 exactly at the limit", () => {
    // 20MB * 4/3 = ~26.67MB of base64
    const limitBase64 = "a".repeat(Math.floor(20 * 1024 * 1024 * (4 / 3)));
    const result = validateBase64Size(limitBase64);
    // Should be at or just under the limit
    expect(result.estimatedSize).toBeLessThanOrEqual(result.maxSize + 1);
  });
});

describe("isValidTier", () => {
  it("should return true for valid tiers", () => {
    expect(isValidTier("FREE")).toBe(true);
    expect(isValidTier("TIER_1K")).toBe(true);
    expect(isValidTier("TIER_2K")).toBe(true);
    expect(isValidTier("TIER_4K")).toBe(true);
  });

  it("should return false for invalid tiers", () => {
    expect(isValidTier("INVALID")).toBe(false);
    expect(isValidTier("1K")).toBe(false);
    expect(isValidTier("")).toBe(false);
    expect(isValidTier("tier_1k")).toBe(false);
  });
});

describe("VALID_TIERS", () => {
  it("should contain all expected tiers", () => {
    expect(VALID_TIERS).toEqual(["FREE", "TIER_1K", "TIER_2K", "TIER_4K"]);
  });
});
