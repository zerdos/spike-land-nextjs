/**
 * Tests for Scout Competitor Validation Schemas
 *
 * Resolves #871
 */

import { describe, expect, it } from "vitest";
import {
  competitorNameSchema,
  createCompetitorRequestSchema,
  legacyAddCompetitorRequestSchema,
  socialHandleSchema,
  socialHandlesSchema,
  updateCompetitorRequestSchema,
  websiteUrlSchema,
} from "./scout-competitor";

describe("Scout Competitor Validation Schemas", () => {
  describe("socialHandleSchema", () => {
    it("should accept valid handles", () => {
      expect(socialHandleSchema.parse("johndoe")).toBe("johndoe");
      expect(socialHandleSchema.parse("john_doe")).toBe("john_doe");
      expect(socialHandleSchema.parse("john.doe")).toBe("john.doe");
      expect(socialHandleSchema.parse("john123")).toBe("john123");
    });

    it("should strip leading @ symbol", () => {
      expect(socialHandleSchema.parse("@johndoe")).toBe("johndoe");
      expect(socialHandleSchema.parse("@john_doe")).toBe("john_doe");
    });

    it("should trim whitespace", () => {
      expect(socialHandleSchema.parse("  johndoe  ")).toBe("johndoe");
      expect(socialHandleSchema.parse(" @johndoe ")).toBe("johndoe");
    });

    it("should reject empty handles", () => {
      expect(() => socialHandleSchema.parse("")).toThrow();
      expect(() => socialHandleSchema.parse("   ")).toThrow();
    });

    it("should reject handles that are too long", () => {
      const longHandle = "a".repeat(101);
      expect(() => socialHandleSchema.parse(longHandle)).toThrow();
    });
  });

  describe("socialHandlesSchema", () => {
    it("should accept valid handles objects", () => {
      const result = socialHandlesSchema.parse({
        twitter: "johndoe",
      });
      expect(result.twitter).toBe("johndoe");
    });

    it("should accept multiple handles", () => {
      const result = socialHandlesSchema.parse({
        twitter: "johndoe",
        linkedin: "john-doe",
        instagram: "johndoe",
        facebook: "johndoepage",
      });
      expect(result.twitter).toBe("johndoe");
      expect(result.linkedin).toBe("john-doe");
      expect(result.instagram).toBe("johndoe");
      expect(result.facebook).toBe("johndoepage");
    });

    it("should require at least one handle", () => {
      expect(() => socialHandlesSchema.parse({})).toThrow(
        "At least one social handle must be provided",
      );
    });

    it("should allow undefined handles", () => {
      const result = socialHandlesSchema.parse({
        twitter: "johndoe",
        linkedin: undefined,
      });
      expect(result.twitter).toBe("johndoe");
      expect(result.linkedin).toBeUndefined();
    });
  });

  describe("websiteUrlSchema", () => {
    it("should accept valid URLs", () => {
      expect(websiteUrlSchema.parse("https://example.com")).toBe(
        "https://example.com",
      );
      expect(websiteUrlSchema.parse("http://www.example.com")).toBe(
        "http://www.example.com",
      );
      expect(websiteUrlSchema.parse("https://example.com/path")).toBe(
        "https://example.com/path",
      );
    });

    it("should accept undefined", () => {
      expect(websiteUrlSchema.parse(undefined)).toBeUndefined();
    });

    it("should trim whitespace", () => {
      expect(websiteUrlSchema.parse("  https://example.com  ")).toBe(
        "https://example.com",
      );
    });

    it("should reject invalid URLs", () => {
      expect(() => websiteUrlSchema.parse("not-a-url")).toThrow();
      expect(() => websiteUrlSchema.parse("example.com")).toThrow();
    });

    it("should reject URLs that are too long", () => {
      const longUrl = "https://example.com/" + "a".repeat(2000);
      expect(() => websiteUrlSchema.parse(longUrl)).toThrow();
    });
  });

  describe("competitorNameSchema", () => {
    it("should accept valid names", () => {
      expect(competitorNameSchema.parse("Acme Corp")).toBe("Acme Corp");
      expect(competitorNameSchema.parse("My Competitor")).toBe("My Competitor");
    });

    it("should trim whitespace", () => {
      expect(competitorNameSchema.parse("  Acme Corp  ")).toBe("Acme Corp");
    });

    it("should reject empty names", () => {
      expect(() => competitorNameSchema.parse("")).toThrow();
      expect(() => competitorNameSchema.parse("   ")).toThrow();
    });

    it("should reject names that are too long", () => {
      const longName = "a".repeat(201);
      expect(() => competitorNameSchema.parse(longName)).toThrow();
    });
  });

  describe("createCompetitorRequestSchema", () => {
    it("should accept valid create requests", () => {
      const result = createCompetitorRequestSchema.parse({
        name: "Acme Corp",
        socialHandles: {
          twitter: "acmecorp",
        },
      });
      expect(result.name).toBe("Acme Corp");
      expect(result.socialHandles.twitter).toBe("acmecorp");
    });

    it("should accept requests with website", () => {
      const result = createCompetitorRequestSchema.parse({
        name: "Acme Corp",
        website: "https://acme.com",
        socialHandles: {
          twitter: "acmecorp",
        },
      });
      expect(result.website).toBe("https://acme.com");
    });

    it("should reject requests without name", () => {
      expect(() =>
        createCompetitorRequestSchema.parse({
          socialHandles: {
            twitter: "acmecorp",
          },
        })
      ).toThrow();
    });

    it("should reject requests without social handles", () => {
      expect(() =>
        createCompetitorRequestSchema.parse({
          name: "Acme Corp",
        })
      ).toThrow();
    });
  });

  describe("updateCompetitorRequestSchema", () => {
    it("should accept partial updates", () => {
      const result = updateCompetitorRequestSchema.parse({
        name: "Updated Name",
      });
      expect(result.name).toBe("Updated Name");
    });

    it("should accept empty object", () => {
      const result = updateCompetitorRequestSchema.parse({});
      expect(result).toEqual({});
    });

    it("should accept isActive updates", () => {
      const result = updateCompetitorRequestSchema.parse({
        isActive: false,
      });
      expect(result.isActive).toBe(false);
    });

    it("should accept both name and isActive together", () => {
      const result = updateCompetitorRequestSchema.parse({
        name: "New Name",
        isActive: true,
      });
      expect(result.name).toBe("New Name");
      expect(result.isActive).toBe(true);
    });

    it("should reject empty name", () => {
      expect(() =>
        updateCompetitorRequestSchema.parse({
          name: "",
        })
      ).toThrow();
    });

    it("should reject whitespace-only name", () => {
      expect(() =>
        updateCompetitorRequestSchema.parse({
          name: "   ",
        })
      ).toThrow();
    });
  });

  describe("legacyAddCompetitorRequestSchema", () => {
    it("should accept valid legacy requests", () => {
      const result = legacyAddCompetitorRequestSchema.parse({
        platform: "TWITTER",
        handle: "johndoe",
      });
      expect(result.platform).toBe("TWITTER");
      expect(result.handle).toBe("johndoe");
    });

    it("should accept all valid platforms", () => {
      const platforms = [
        "TWITTER",
        "LINKEDIN",
        "FACEBOOK",
        "INSTAGRAM",
        "TIKTOK",
        "YOUTUBE",
        "DISCORD",
      ] as const;

      for (const platform of platforms) {
        const result = legacyAddCompetitorRequestSchema.parse({
          platform,
          handle: "testhandle",
        });
        expect(result.platform).toBe(platform);
      }
    });

    it("should reject invalid platforms", () => {
      expect(() =>
        legacyAddCompetitorRequestSchema.parse({
          platform: "INVALID",
          handle: "johndoe",
        })
      ).toThrow();
    });

    it("should strip @ from handle", () => {
      const result = legacyAddCompetitorRequestSchema.parse({
        platform: "TWITTER",
        handle: "@johndoe",
      });
      expect(result.handle).toBe("johndoe");
    });
  });
});
