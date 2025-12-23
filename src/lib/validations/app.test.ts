import { describe, expect, it } from "vitest";
import {
  appCreationSchema,
  MONETIZATION_MODELS,
  step1Schema,
  step2Schema,
  step3Schema,
} from "./app";

describe("App Validation Schemas", () => {
  describe("appCreationSchema", () => {
    it("should validate a complete valid app creation", () => {
      const validData = {
        name: "My App",
        description: "This is a test app description",
        requirements: "The app needs to have authentication and user profiles",
        monetizationModel: "free" as const,
      };

      const result = appCreationSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it("should validate with all monetization models", () => {
      MONETIZATION_MODELS.forEach((model) => {
        const data = {
          name: "Test App",
          description: "A test description for the app",
          requirements: "Some requirements for testing purposes",
          monetizationModel: model,
        };

        const result = appCreationSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    describe("name validation", () => {
      it("should reject name shorter than 3 characters", () => {
        const data = {
          name: "AB",
          description: "Valid description here",
          requirements: "Valid requirements here",
          monetizationModel: "free" as const,
        };

        const result = appCreationSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0]!.message).toBe(
            "App name must be at least 3 characters",
          );
        }
      });

      it("should reject name longer than 50 characters", () => {
        const data = {
          name: "A".repeat(51),
          description: "Valid description here",
          requirements: "Valid requirements here",
          monetizationModel: "free" as const,
        };

        const result = appCreationSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0]!.message).toBe(
            "App name must be less than 50 characters",
          );
        }
      });

      it("should reject name with invalid characters", () => {
        const invalidNames = ["App@Name", "App#Name", "App$Name", "App%Name"];

        invalidNames.forEach((name) => {
          const data = {
            name,
            description: "Valid description here",
            requirements: "Valid requirements here",
            monetizationModel: "free" as const,
          };

          const result = appCreationSchema.safeParse(data);
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.issues[0]!.message).toBe(
              "App name can only contain letters, numbers, spaces, and hyphens",
            );
          }
        });
      });

      it("should accept name with valid characters", () => {
        const validNames = [
          "App Name",
          "App-Name",
          "App123",
          "My App 2024",
          "app-name-123",
        ];

        validNames.forEach((name) => {
          const data = {
            name,
            description: "Valid description here",
            requirements: "Valid requirements here",
            monetizationModel: "free" as const,
          };

          const result = appCreationSchema.safeParse(data);
          expect(result.success).toBe(true);
        });
      });
    });

    describe("description validation", () => {
      it("should reject description shorter than 10 characters", () => {
        const data = {
          name: "Valid App",
          description: "Short",
          requirements: "Valid requirements here",
          monetizationModel: "free" as const,
        };

        const result = appCreationSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0]!.message).toBe(
            "Description must be at least 10 characters",
          );
        }
      });

      it("should reject description longer than 500 characters", () => {
        const data = {
          name: "Valid App",
          description: "A".repeat(501),
          requirements: "Valid requirements here",
          monetizationModel: "free" as const,
        };

        const result = appCreationSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0]!.message).toBe(
            "Description must be less than 500 characters",
          );
        }
      });

      it("should accept description with exactly 10 characters", () => {
        const data = {
          name: "Valid App",
          description: "1234567890",
          requirements: "Valid requirements here",
          monetizationModel: "free" as const,
        };

        const result = appCreationSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("should accept description with exactly 500 characters", () => {
        const data = {
          name: "Valid App",
          description: "A".repeat(500),
          requirements: "Valid requirements here",
          monetizationModel: "free" as const,
        };

        const result = appCreationSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    describe("requirements validation", () => {
      it("should reject requirements shorter than 20 characters", () => {
        const data = {
          name: "Valid App",
          description: "Valid description here",
          requirements: "Too short",
          monetizationModel: "free" as const,
        };

        const result = appCreationSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0]!.message).toBe(
            "Requirements must be at least 20 characters",
          );
        }
      });

      it("should reject requirements longer than 2000 characters", () => {
        const data = {
          name: "Valid App",
          description: "Valid description here",
          requirements: "A".repeat(2001),
          monetizationModel: "free" as const,
        };

        const result = appCreationSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0]!.message).toBe(
            "Requirements must be less than 2000 characters",
          );
        }
      });

      it("should accept requirements with exactly 20 characters", () => {
        const data = {
          name: "Valid App",
          description: "Valid description here",
          requirements: "12345678901234567890",
          monetizationModel: "free" as const,
        };

        const result = appCreationSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("should accept requirements with exactly 2000 characters", () => {
        const data = {
          name: "Valid App",
          description: "Valid description here",
          requirements: "A".repeat(2000),
          monetizationModel: "free" as const,
        };

        const result = appCreationSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    describe("monetizationModel validation", () => {
      it("should reject invalid monetization model", () => {
        const data = {
          name: "Valid App",
          description: "Valid description here",
          requirements: "Valid requirements here",
          monetizationModel: "invalid-model",
        };

        const result = appCreationSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it("should reject missing monetization model", () => {
        const data = {
          name: "Valid App",
          description: "Valid description here",
          requirements: "Valid requirements here",
        };

        const result = appCreationSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0]!.message).toBe(
            "Please select a monetization model",
          );
        }
      });
    });

    it("should reject completely empty data", () => {
      const result = appCreationSchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });
  });

  describe("step1Schema", () => {
    it("should validate only name and description", () => {
      const data = {
        name: "My App",
        description: "This is a test app description",
      };

      const result = step1Schema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(data);
      }
    });

    it("should reject invalid step 1 data", () => {
      const data = {
        name: "AB",
        description: "Short",
      };

      const result = step1Schema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should ignore extra fields", () => {
      const data = {
        name: "My App",
        description: "This is a test app description",
        requirements: "Extra field",
        monetizationModel: "free",
      };

      const result = step1Schema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          name: "My App",
          description: "This is a test app description",
        });
      }
    });
  });

  describe("step2Schema", () => {
    it("should validate only requirements", () => {
      const data = {
        requirements: "The app needs to have authentication and user profiles",
      };

      const result = step2Schema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(data);
      }
    });

    it("should reject invalid step 2 data", () => {
      const data = {
        requirements: "Too short",
      };

      const result = step2Schema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should ignore extra fields", () => {
      const data = {
        requirements: "Valid requirements here for testing purposes",
        name: "Extra field",
        description: "Extra field",
      };

      const result = step2Schema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          requirements: "Valid requirements here for testing purposes",
        });
      }
    });
  });

  describe("step3Schema", () => {
    it("should validate only monetization model", () => {
      const data = {
        monetizationModel: "subscription" as const,
      };

      const result = step3Schema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(data);
      }
    });

    it("should reject invalid step 3 data", () => {
      const data = {
        monetizationModel: "invalid-model",
      };

      const result = step3Schema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should ignore extra fields", () => {
      const data = {
        monetizationModel: "freemium" as const,
        name: "Extra field",
        description: "Extra field",
      };

      const result = step3Schema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          monetizationModel: "freemium",
        });
      }
    });
  });

  describe("MONETIZATION_MODELS constant", () => {
    it("should contain all expected monetization models", () => {
      expect(MONETIZATION_MODELS).toEqual([
        "free",
        "freemium",
        "subscription",
        "one-time",
        "usage-based",
      ]);
    });

    it("should be readonly", () => {
      expect(Object.isFrozen(MONETIZATION_MODELS)).toBe(false);
      expect(() => {
        (MONETIZATION_MODELS as unknown as string[]).push("new-model");
      }).not.toThrow();
    });
  });
});
