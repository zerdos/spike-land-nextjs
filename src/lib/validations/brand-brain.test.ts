import { describe, expect, it } from "vitest";
import {
  brandBasicsSchema,
  brandProfileSchema,
  COLOR_USAGES,
  colorPaletteItemSchema,
  DEFAULT_BRAND_PROFILE_FORM,
  DEFAULT_TONE_DESCRIPTORS,
  GUARDRAIL_SEVERITIES,
  GUARDRAIL_TYPE_LABELS,
  GUARDRAIL_TYPES,
  guardrailSchema,
  guardrailsStepSchema,
  hexColorSchema,
  toneDescriptorsSchema,
  visualIdentitySchema,
  VOCABULARY_TYPE_LABELS,
  VOCABULARY_TYPES,
  vocabularyItemSchema,
  VOICE_DIMENSION_LABELS,
  VOICE_DIMENSIONS,
  voiceToneSchema,
} from "./brand-brain";

describe("brand-brain validation schemas", () => {
  describe("hexColorSchema", () => {
    it("should accept valid 6-digit hex colors", () => {
      const result = hexColorSchema.safeParse("#FF5733");
      expect(result.success).toBe(true);
      expect(result.data).toBe("#FF5733");
    });

    it("should accept lowercase hex colors", () => {
      const result = hexColorSchema.safeParse("#ff5733");
      expect(result.success).toBe(true);
    });

    it("should accept valid 3-digit hex colors", () => {
      const result = hexColorSchema.safeParse("#F53");
      expect(result.success).toBe(true);
    });

    it("should reject invalid hex colors", () => {
      expect(hexColorSchema.safeParse("FF5733").success).toBe(false);
      expect(hexColorSchema.safeParse("#GG5733").success).toBe(false);
      expect(hexColorSchema.safeParse("#FF573").success).toBe(false);
      expect(hexColorSchema.safeParse("red").success).toBe(false);
    });

    it("should provide a helpful error message", () => {
      const result = hexColorSchema.safeParse("invalid");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]!.message).toContain("valid hex color");
      }
    });
  });

  describe("colorPaletteItemSchema", () => {
    it("should accept valid color palette item", () => {
      const result = colorPaletteItemSchema.safeParse({
        name: "Brand Blue",
        hex: "#0066FF",
        usage: "primary",
      });
      expect(result.success).toBe(true);
    });

    it("should accept color without usage", () => {
      const result = colorPaletteItemSchema.safeParse({
        name: "Accent",
        hex: "#FF00FF",
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty name", () => {
      const result = colorPaletteItemSchema.safeParse({
        name: "",
        hex: "#000000",
      });
      expect(result.success).toBe(false);
    });

    it("should reject name longer than 30 characters", () => {
      const result = colorPaletteItemSchema.safeParse({
        name: "A".repeat(31),
        hex: "#000000",
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid usage value", () => {
      const result = colorPaletteItemSchema.safeParse({
        name: "Test",
        hex: "#000000",
        usage: "invalid",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("guardrailSchema", () => {
    it("should accept valid guardrail", () => {
      const result = guardrailSchema.safeParse({
        type: "PROHIBITED_TOPIC",
        name: "No Competitors",
        description: "Do not mention competitors",
        severity: "HIGH",
      });
      expect(result.success).toBe(true);
    });

    it("should accept guardrail without optional fields", () => {
      const result = guardrailSchema.safeParse({
        type: "CONTENT_WARNING",
        name: "Sensitive Content",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.severity).toBeUndefined();
        expect(result.data.isActive).toBeUndefined();
      }
    });

    it("should reject name shorter than 2 characters", () => {
      const result = guardrailSchema.safeParse({
        type: "PROHIBITED_TOPIC",
        name: "A",
      });
      expect(result.success).toBe(false);
    });

    it("should reject name longer than 100 characters", () => {
      const result = guardrailSchema.safeParse({
        type: "PROHIBITED_TOPIC",
        name: "A".repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it("should accept all guardrail types", () => {
      for (const type of GUARDRAIL_TYPES) {
        const result = guardrailSchema.safeParse({
          type,
          name: "Test Guardrail",
        });
        expect(result.success).toBe(true);
      }
    });

    it("should accept all severity levels", () => {
      for (const severity of GUARDRAIL_SEVERITIES) {
        const result = guardrailSchema.safeParse({
          type: "PROHIBITED_TOPIC",
          name: "Test",
          severity,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe("vocabularyItemSchema", () => {
    it("should accept valid vocabulary item", () => {
      const result = vocabularyItemSchema.safeParse({
        type: "PREFERRED",
        term: "Customer Success",
        context: "Use instead of customer service",
      });
      expect(result.success).toBe(true);
    });

    it("should accept replacement type with replacement value", () => {
      const result = vocabularyItemSchema.safeParse({
        type: "REPLACEMENT",
        term: "cheap",
        replacement: "affordable",
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty term", () => {
      const result = vocabularyItemSchema.safeParse({
        type: "BANNED",
        term: "",
      });
      expect(result.success).toBe(false);
    });

    it("should accept all vocabulary types", () => {
      for (const type of VOCABULARY_TYPES) {
        const result = vocabularyItemSchema.safeParse({
          type,
          term: "Test Term",
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe("toneDescriptorsSchema", () => {
    it("should accept valid tone descriptors", () => {
      const result = toneDescriptorsSchema.safeParse({
        formalCasual: 30,
        technicalSimple: 70,
        seriousPlayful: 50,
        reservedEnthusiastic: 80,
      });
      expect(result.success).toBe(true);
    });

    it("should require all fields", () => {
      const result = toneDescriptorsSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("should reject values below 0", () => {
      const result = toneDescriptorsSchema.safeParse({
        formalCasual: -1,
      });
      expect(result.success).toBe(false);
    });

    it("should reject values above 100", () => {
      const result = toneDescriptorsSchema.safeParse({
        formalCasual: 101,
      });
      expect(result.success).toBe(false);
    });

    it("should accept boundary values", () => {
      const result = toneDescriptorsSchema.safeParse({
        formalCasual: 0,
        technicalSimple: 100,
        seriousPlayful: 0,
        reservedEnthusiastic: 100,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("brandBasicsSchema", () => {
    it("should accept valid brand basics", () => {
      const result = brandBasicsSchema.safeParse({
        name: "Acme Corp",
        mission: "To make the world a better place",
        values: ["Innovation", "Trust", "Excellence"],
      });
      expect(result.success).toBe(true);
    });

    it("should accept minimal required data", () => {
      const result = brandBasicsSchema.safeParse({
        name: "AB",
      });
      expect(result.success).toBe(true);
    });

    it("should reject name shorter than 2 characters", () => {
      const result = brandBasicsSchema.safeParse({
        name: "A",
      });
      expect(result.success).toBe(false);
    });

    it("should reject name longer than 100 characters", () => {
      const result = brandBasicsSchema.safeParse({
        name: "A".repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it("should reject mission longer than 1000 characters", () => {
      const result = brandBasicsSchema.safeParse({
        name: "Test",
        mission: "A".repeat(1001),
      });
      expect(result.success).toBe(false);
    });

    it("should reject more than 10 values", () => {
      const result = brandBasicsSchema.safeParse({
        name: "Test",
        values: Array(11).fill("Value"),
      });
      expect(result.success).toBe(false);
    });

    it("should reject values longer than 50 characters", () => {
      const result = brandBasicsSchema.safeParse({
        name: "Test",
        values: ["A".repeat(51)],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("voiceToneSchema", () => {
    it("should accept valid voice tone data", () => {
      const result = voiceToneSchema.safeParse({
        toneDescriptors: {
          formalCasual: 25,
          technicalSimple: 75,
          seriousPlayful: 40,
          reservedEnthusiastic: 60,
        },
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty tone descriptors object", () => {
      const result = voiceToneSchema.safeParse({
        toneDescriptors: {},
      });
      expect(result.success).toBe(false);
    });
  });

  describe("visualIdentitySchema", () => {
    it("should accept valid visual identity data", () => {
      const result = visualIdentitySchema.safeParse({
        logoUrl: "https://example.com/logo.png",
        logoR2Key: "brand-assets/123/logo.png",
        colorPalette: [
          { name: "Primary", hex: "#0066FF" },
          { name: "Secondary", hex: "#FF6600" },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("should accept empty optional fields", () => {
      const result = visualIdentitySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("should accept empty string for logoUrl", () => {
      const result = visualIdentitySchema.safeParse({
        logoUrl: "",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid URL for logoUrl", () => {
      const result = visualIdentitySchema.safeParse({
        logoUrl: "not-a-url",
      });
      expect(result.success).toBe(false);
    });

    it("should reject more than 10 colors", () => {
      const result = visualIdentitySchema.safeParse({
        colorPalette: Array(11)
          .fill(null)
          .map((_, i) => ({ name: `Color ${i}`, hex: "#000000" })),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("guardrailsStepSchema", () => {
    it("should accept valid guardrails and vocabulary", () => {
      const result = guardrailsStepSchema.safeParse({
        guardrails: [
          { type: "PROHIBITED_TOPIC", name: "Politics" },
          { type: "REQUIRED_DISCLOSURE", name: "Affiliate Links" },
        ],
        vocabulary: [
          { type: "PREFERRED", term: "Customer" },
          { type: "BANNED", term: "Cheap" },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("should accept empty arrays", () => {
      const result = guardrailsStepSchema.safeParse({
        guardrails: [],
        vocabulary: [],
      });
      expect(result.success).toBe(true);
    });

    it("should accept undefined fields", () => {
      const result = guardrailsStepSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe("brandProfileSchema (complete)", () => {
    it("should accept a complete valid brand profile", () => {
      const result = brandProfileSchema.safeParse({
        name: "Acme Corporation",
        mission: "To innovate for a better tomorrow",
        values: ["Innovation", "Trust"],
        toneDescriptors: {
          formalCasual: 30,
          technicalSimple: 70,
          seriousPlayful: 50,
          reservedEnthusiastic: 60,
        },
        logoUrl: "https://example.com/logo.png",
        colorPalette: [{ name: "Brand Blue", hex: "#0066FF", usage: "primary" }],
        guardrails: [{ type: "PROHIBITED_TOPIC", name: "Competitors" }],
        vocabulary: [{ type: "PREFERRED", term: "Solution" }],
      });
      expect(result.success).toBe(true);
    });

    it("should accept minimal required data", () => {
      const result = brandProfileSchema.safeParse({
        name: "Test Brand",
        toneDescriptors: {
          formalCasual: 50,
          technicalSimple: 50,
          seriousPlayful: 50,
          reservedEnthusiastic: 50,
        },
      });
      expect(result.success).toBe(true);
    });

    it("should reject missing required name field", () => {
      const result = brandProfileSchema.safeParse({
        mission: "Test mission",
        toneDescriptors: {},
      });
      expect(result.success).toBe(false);
    });
  });

  describe("constants", () => {
    it("should have correct VOICE_DIMENSIONS", () => {
      expect(VOICE_DIMENSIONS).toEqual([
        "formalCasual",
        "technicalSimple",
        "seriousPlayful",
        "reservedEnthusiastic",
      ]);
    });

    it("should have labels for all voice dimensions", () => {
      for (const dimension of VOICE_DIMENSIONS) {
        expect(VOICE_DIMENSION_LABELS[dimension]).toBeDefined();
        expect(VOICE_DIMENSION_LABELS[dimension].left).toBeDefined();
        expect(VOICE_DIMENSION_LABELS[dimension].right).toBeDefined();
      }
    });

    it("should have correct GUARDRAIL_TYPES", () => {
      expect(GUARDRAIL_TYPES).toEqual([
        "PROHIBITED_TOPIC",
        "REQUIRED_DISCLOSURE",
        "CONTENT_WARNING",
      ]);
    });

    it("should have labels for all guardrail types", () => {
      for (const type of GUARDRAIL_TYPES) {
        expect(GUARDRAIL_TYPE_LABELS[type]).toBeDefined();
      }
    });

    it("should have correct VOCABULARY_TYPES", () => {
      expect(VOCABULARY_TYPES).toEqual(["PREFERRED", "BANNED", "REPLACEMENT"]);
    });

    it("should have labels for all vocabulary types", () => {
      for (const type of VOCABULARY_TYPES) {
        expect(VOCABULARY_TYPE_LABELS[type]).toBeDefined();
      }
    });

    it("should have correct COLOR_USAGES", () => {
      expect(COLOR_USAGES).toEqual([
        "primary",
        "secondary",
        "accent",
        "background",
        "text",
      ]);
    });

    it("should have correct GUARDRAIL_SEVERITIES", () => {
      expect(GUARDRAIL_SEVERITIES).toEqual(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
    });
  });

  describe("default values", () => {
    it("should have correct DEFAULT_TONE_DESCRIPTORS", () => {
      expect(DEFAULT_TONE_DESCRIPTORS).toEqual({
        formalCasual: 50,
        technicalSimple: 50,
        seriousPlayful: 50,
        reservedEnthusiastic: 50,
      });
    });

    it("should have correct DEFAULT_BRAND_PROFILE_FORM", () => {
      expect(DEFAULT_BRAND_PROFILE_FORM).toEqual({
        name: "",
        mission: "",
        values: [],
        toneDescriptors: DEFAULT_TONE_DESCRIPTORS,
        logoUrl: "",
        logoR2Key: "",
        colorPalette: [],
        guardrails: [],
        vocabulary: [],
      });
    });
  });
});
