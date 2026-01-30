/**
 * Tests for template types
 */

import { describe, expect, it } from "vitest";
import type { Template, TemplateMetadata, TemplatePurpose } from "./types";

describe("Template Types", () => {
  describe("TemplatePurpose", () => {
    it("should accept valid purpose values", () => {
      const purposes: TemplatePurpose[] = [
        "link-in-bio",
        "campaign-landing",
        "poll",
        "contest",
      ];

      purposes.forEach((purpose) => {
        expect(typeof purpose).toBe("string");
      });
    });
  });

  describe("TemplateMetadata", () => {
    it("should have all required fields", () => {
      const metadata: TemplateMetadata = {
        id: "test-template",
        name: "Test Template",
        description: "A test template",
        purpose: "link-in-bio",
        tags: ["test", "example"],
      };

      expect(metadata.id).toBe("test-template");
      expect(metadata.name).toBe("Test Template");
      expect(metadata.description).toBe("A test template");
      expect(metadata.purpose).toBe("link-in-bio");
      expect(metadata.tags).toEqual(["test", "example"]);
    });

    it("should allow optional previewImage field", () => {
      const metadata: TemplateMetadata = {
        id: "test-template",
        name: "Test Template",
        description: "A test template",
        purpose: "poll",
        tags: ["test"],
        previewImage: "https://example.com/preview.jpg",
      };

      expect(metadata.previewImage).toBe("https://example.com/preview.jpg");
    });
  });

  describe("Template", () => {
    it("should extend TemplateMetadata with code field", () => {
      const template: Template = {
        id: "test-template",
        name: "Test Template",
        description: "A test template",
        purpose: "contest",
        tags: ["test"],
        code: "const App = () => <div>Hello</div>;",
      };

      expect(template.code).toBe("const App = () => <div>Hello</div>;");
      expect(template.id).toBe("test-template");
    });
  });
});
