import { describe, expect, it } from "vitest";
import {
  AddToCartRequestSchema,
  AlbumPrivacySchema,
  AspectRatioSchema,
  BatchEnhanceRequestSchema,
  CheckEmailRequestSchema,
  CreateAlbumRequestSchema,
  CreateOrderRequestSchema,
  EnhanceImageRequestSchema,
  EnhancementTierSchema,
  GenerateImageRequestSchema,
  ModifyImageRequestSchema,
  RedeemVoucherRequestSchema,
  ShippingAddressSchema,
  SignUpRequestSchema,
  UpdateAlbumRequestSchema,
} from "./index";

describe("validations", () => {
  describe("EnhancementTierSchema", () => {
    it("should accept valid tiers", () => {
      expect(EnhancementTierSchema.parse("FREE")).toBe("FREE");
      expect(EnhancementTierSchema.parse("TIER_1K")).toBe("TIER_1K");
      expect(EnhancementTierSchema.parse("TIER_2K")).toBe("TIER_2K");
      expect(EnhancementTierSchema.parse("TIER_4K")).toBe("TIER_4K");
    });

    it("should reject invalid tiers", () => {
      expect(() => EnhancementTierSchema.parse("INVALID")).toThrow();
      expect(() => EnhancementTierSchema.parse("")).toThrow();
      expect(() => EnhancementTierSchema.parse(null)).toThrow();
    });
  });

  describe("EnhanceImageRequestSchema", () => {
    it("should accept valid request", () => {
      const result = EnhanceImageRequestSchema.parse({
        imageId: "img_123",
        tier: "TIER_1K",
      });
      expect(result.imageId).toBe("img_123");
      expect(result.tier).toBe("TIER_1K");
    });

    it("should accept optional fields", () => {
      const result = EnhanceImageRequestSchema.parse({
        imageId: "img_123",
        tier: "TIER_2K",
        prompt: "enhance this photo",
        pipelineId: "pipeline_456",
      });
      expect(result.prompt).toBe("enhance this photo");
      expect(result.pipelineId).toBe("pipeline_456");
    });

    it("should reject empty imageId", () => {
      expect(() =>
        EnhanceImageRequestSchema.parse({
          imageId: "",
          tier: "TIER_1K",
        })
      ).toThrow();
    });

    it("should reject missing required fields", () => {
      expect(() => EnhanceImageRequestSchema.parse({ imageId: "img_123" })).toThrow();
      expect(() => EnhanceImageRequestSchema.parse({ tier: "TIER_1K" })).toThrow();
    });
  });

  describe("BatchEnhanceRequestSchema", () => {
    it("should accept valid batch request", () => {
      const result = BatchEnhanceRequestSchema.parse({
        imageIds: ["img_1", "img_2", "img_3"],
        tier: "TIER_1K",
      });
      expect(result.imageIds).toHaveLength(3);
      expect(result.tier).toBe("TIER_1K");
    });

    it("should reject empty array", () => {
      expect(() =>
        BatchEnhanceRequestSchema.parse({
          imageIds: [],
          tier: "TIER_1K",
        })
      ).toThrow();
    });

    it("should reject too many images (max 20)", () => {
      const tooManyIds = Array.from({ length: 21 }, (_, i) => `img_${i}`);
      expect(() =>
        BatchEnhanceRequestSchema.parse({
          imageIds: tooManyIds,
          tier: "TIER_1K",
        })
      ).toThrow();
    });

    it("should accept exactly 20 images", () => {
      const maxIds = Array.from({ length: 20 }, (_, i) => `img_${i}`);
      const result = BatchEnhanceRequestSchema.parse({
        imageIds: maxIds,
        tier: "TIER_1K",
      });
      expect(result.imageIds).toHaveLength(20);
    });
  });

  describe("AspectRatioSchema", () => {
    it("should accept valid aspect ratios", () => {
      expect(AspectRatioSchema.parse("1:1")).toBe("1:1");
      expect(AspectRatioSchema.parse("16:9")).toBe("16:9");
      expect(AspectRatioSchema.parse("9:16")).toBe("9:16");
    });

    it("should reject invalid aspect ratios", () => {
      expect(() => AspectRatioSchema.parse("2:1")).toThrow();
      expect(() => AspectRatioSchema.parse("invalid")).toThrow();
    });
  });

  describe("GenerateImageRequestSchema", () => {
    it("should accept valid request with defaults", () => {
      const result = GenerateImageRequestSchema.parse({
        prompt: "A beautiful sunset",
      });
      expect(result.prompt).toBe("A beautiful sunset");
      expect(result.tier).toBe("TIER_1K"); // default
      expect(result.aspectRatio).toBe("1:1"); // default
    });

    it("should accept all optional fields", () => {
      const result = GenerateImageRequestSchema.parse({
        prompt: "A beautiful sunset",
        tier: "TIER_4K",
        aspectRatio: "16:9",
        negativePrompt: "blurry, low quality",
      });
      expect(result.tier).toBe("TIER_4K");
      expect(result.aspectRatio).toBe("16:9");
      expect(result.negativePrompt).toBe("blurry, low quality");
    });

    it("should reject empty prompt", () => {
      expect(() => GenerateImageRequestSchema.parse({ prompt: "" })).toThrow();
    });

    it("should reject prompt over 4000 characters", () => {
      const longPrompt = "a".repeat(4001);
      expect(() => GenerateImageRequestSchema.parse({ prompt: longPrompt })).toThrow();
    });

    it("should accept prompt at exactly 4000 characters", () => {
      const maxPrompt = "a".repeat(4000);
      const result = GenerateImageRequestSchema.parse({ prompt: maxPrompt });
      expect(result.prompt).toHaveLength(4000);
    });
  });

  describe("ModifyImageRequestSchema", () => {
    it("should accept valid request with image URL", () => {
      const result = ModifyImageRequestSchema.parse({
        prompt: "Make it brighter",
        imageUrl: "https://example.com/image.jpg",
      });
      expect(result.prompt).toBe("Make it brighter");
      expect(result.imageUrl).toBe("https://example.com/image.jpg");
    });

    it("should accept request with base64 image", () => {
      const result = ModifyImageRequestSchema.parse({
        prompt: "Add filters",
        imageBase64: "base64encodedstring",
      });
      expect(result.imageBase64).toBe("base64encodedstring");
    });

    it("should reject invalid URL", () => {
      expect(() =>
        ModifyImageRequestSchema.parse({
          prompt: "Test",
          imageUrl: "not-a-url",
        })
      ).toThrow();
    });
  });

  describe("AlbumPrivacySchema", () => {
    it("should accept valid privacy levels", () => {
      expect(AlbumPrivacySchema.parse("PRIVATE")).toBe("PRIVATE");
      expect(AlbumPrivacySchema.parse("UNLISTED")).toBe("UNLISTED");
      expect(AlbumPrivacySchema.parse("PUBLIC")).toBe("PUBLIC");
    });

    it("should reject invalid privacy level", () => {
      expect(() => AlbumPrivacySchema.parse("SECRET")).toThrow();
    });
  });

  describe("CreateAlbumRequestSchema", () => {
    it("should accept valid request with defaults", () => {
      const result = CreateAlbumRequestSchema.parse({
        name: "My Album",
      });
      expect(result.name).toBe("My Album");
      expect(result.privacy).toBe("PRIVATE"); // default
      expect(result.defaultTier).toBe("TIER_1K"); // default
    });

    it("should accept all fields", () => {
      const result = CreateAlbumRequestSchema.parse({
        name: "Vacation Photos",
        description: "Photos from my trip",
        privacy: "PUBLIC",
        defaultTier: "TIER_4K",
      });
      expect(result.description).toBe("Photos from my trip");
      expect(result.privacy).toBe("PUBLIC");
      expect(result.defaultTier).toBe("TIER_4K");
    });

    it("should reject empty name", () => {
      expect(() => CreateAlbumRequestSchema.parse({ name: "" })).toThrow();
    });

    it("should reject name over 100 characters", () => {
      const longName = "a".repeat(101);
      expect(() => CreateAlbumRequestSchema.parse({ name: longName })).toThrow();
    });

    it("should reject description over 500 characters", () => {
      const longDesc = "a".repeat(501);
      expect(() =>
        CreateAlbumRequestSchema.parse({
          name: "Album",
          description: longDesc,
        })
      ).toThrow();
    });
  });

  describe("UpdateAlbumRequestSchema", () => {
    it("should accept partial updates", () => {
      const result = UpdateAlbumRequestSchema.parse({
        name: "New Name",
      });
      expect(result.name).toBe("New Name");
      expect(result.description).toBeUndefined();
    });

    it("should accept all fields", () => {
      const result = UpdateAlbumRequestSchema.parse({
        name: "Updated Album",
        description: "New description",
        privacy: "UNLISTED",
        defaultTier: "TIER_2K",
        coverImageId: "img_cover",
      });
      expect(result.coverImageId).toBe("img_cover");
    });

    it("should accept empty object", () => {
      const result = UpdateAlbumRequestSchema.parse({});
      expect(result).toEqual({});
    });
  });

  describe("RedeemVoucherRequestSchema", () => {
    it("should transform code to uppercase", () => {
      const result = RedeemVoucherRequestSchema.parse({
        code: "abc123",
      });
      expect(result.code).toBe("ABC123");
    });

    it("should trim whitespace", () => {
      const result = RedeemVoucherRequestSchema.parse({
        code: "  CODE  ",
      });
      expect(result.code).toBe("CODE");
    });

    it("should reject code shorter than 4 characters", () => {
      expect(() => RedeemVoucherRequestSchema.parse({ code: "ABC" })).toThrow();
    });

    it("should reject code longer than 20 characters", () => {
      const longCode = "A".repeat(21);
      expect(() => RedeemVoucherRequestSchema.parse({ code: longCode })).toThrow();
    });
  });

  describe("AddToCartRequestSchema", () => {
    it("should accept valid request with defaults", () => {
      const result = AddToCartRequestSchema.parse({
        productId: "prod_123",
      });
      expect(result.productId).toBe("prod_123");
      expect(result.quantity).toBe(1); // default
    });

    it("should accept all optional fields", () => {
      const result = AddToCartRequestSchema.parse({
        productId: "prod_123",
        variantId: "var_456",
        imageId: "img_789",
        uploadedImageUrl: "https://example.com/image.jpg",
        quantity: 3,
        customText: "My custom text",
      });
      expect(result.variantId).toBe("var_456");
      expect(result.quantity).toBe(3);
    });

    it("should reject quantity less than 1", () => {
      expect(() =>
        AddToCartRequestSchema.parse({
          productId: "prod_123",
          quantity: 0,
        })
      ).toThrow();
    });

    it("should reject quantity greater than 10", () => {
      expect(() =>
        AddToCartRequestSchema.parse({
          productId: "prod_123",
          quantity: 11,
        })
      ).toThrow();
    });

    it("should reject invalid uploaded image URL", () => {
      expect(() =>
        AddToCartRequestSchema.parse({
          productId: "prod_123",
          uploadedImageUrl: "not-a-url",
        })
      ).toThrow();
    });
  });

  describe("ShippingAddressSchema", () => {
    it("should accept valid address", () => {
      const result = ShippingAddressSchema.parse({
        name: "John Doe",
        line1: "123 Main St",
        city: "London",
        postalCode: "SW1A 1AA",
        country: "GB",
      });
      expect(result.name).toBe("John Doe");
      expect(result.country).toBe("GB");
    });

    it("should accept optional fields", () => {
      const result = ShippingAddressSchema.parse({
        name: "John Doe",
        line1: "123 Main St",
        line2: "Apt 4B",
        city: "London",
        state: "Greater London",
        postalCode: "SW1A 1AA",
        country: "GB",
      });
      expect(result.line2).toBe("Apt 4B");
      expect(result.state).toBe("Greater London");
    });

    it("should reject invalid country code (must be 2 characters)", () => {
      expect(() =>
        ShippingAddressSchema.parse({
          name: "John Doe",
          line1: "123 Main St",
          city: "London",
          postalCode: "SW1A 1AA",
          country: "GBR", // 3 characters
        })
      ).toThrow();
    });

    it("should reject missing required fields", () => {
      expect(() =>
        ShippingAddressSchema.parse({
          name: "John Doe",
          city: "London",
        })
      ).toThrow();
    });
  });

  describe("CreateOrderRequestSchema", () => {
    const validAddress = {
      name: "John Doe",
      line1: "123 Main St",
      city: "London",
      postalCode: "SW1A 1AA",
      country: "GB",
    };

    it("should accept valid order request", () => {
      const result = CreateOrderRequestSchema.parse({
        shippingAddress: validAddress,
        email: "john@example.com",
      });
      expect(result.email).toBe("john@example.com");
    });

    it("should accept all optional fields", () => {
      const result = CreateOrderRequestSchema.parse({
        shippingAddress: validAddress,
        billingAddress: validAddress,
        email: "john@example.com",
        phone: "+44123456789",
        notes: "Please leave at door",
      });
      expect(result.billingAddress).toBeDefined();
      expect(result.phone).toBe("+44123456789");
    });

    it("should reject invalid email", () => {
      expect(() =>
        CreateOrderRequestSchema.parse({
          shippingAddress: validAddress,
          email: "not-an-email",
        })
      ).toThrow();
    });
  });

  describe("CheckEmailRequestSchema", () => {
    it("should accept valid email", () => {
      const result = CheckEmailRequestSchema.parse({
        email: "user@example.com",
      });
      expect(result.email).toBe("user@example.com");
    });

    it("should reject invalid email", () => {
      expect(() => CheckEmailRequestSchema.parse({ email: "invalid" })).toThrow();
    });
  });

  describe("SignUpRequestSchema", () => {
    it("should accept valid signup request", () => {
      const result = SignUpRequestSchema.parse({
        email: "user@example.com",
        password: "securepassword123",
      });
      expect(result.email).toBe("user@example.com");
    });

    it("should accept optional fields", () => {
      const result = SignUpRequestSchema.parse({
        email: "user@example.com",
        password: "securepassword123",
        name: "John Doe",
        referralCode: "REF123",
      });
      expect(result.name).toBe("John Doe");
      expect(result.referralCode).toBe("REF123");
    });

    it("should reject password shorter than 8 characters", () => {
      expect(() =>
        SignUpRequestSchema.parse({
          email: "user@example.com",
          password: "short",
        })
      ).toThrow();
    });

    it("should accept password at exactly 8 characters", () => {
      const result = SignUpRequestSchema.parse({
        email: "user@example.com",
        password: "exactly8",
      });
      expect(result.password).toBe("exactly8");
    });

    it("should reject password over 100 characters", () => {
      const longPassword = "a".repeat(101);
      expect(() =>
        SignUpRequestSchema.parse({
          email: "user@example.com",
          password: longPassword,
        })
      ).toThrow();
    });
  });
});
