import { describe, expect, it } from "vitest";

import {
  type BlogPostFrontmatter,
  LANGUAGE_NAMES,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
  blogPostFrontmatterSchema,
} from "./types";

describe("types", () => {
  describe("SUPPORTED_LANGUAGES", () => {
    it("contains expected languages", () => {
      expect(SUPPORTED_LANGUAGES).toEqual(["en", "hu", "es", "de", "fr"]);
    });

    it("is a readonly array", () => {
      // TypeScript check — ensure it's const
      const languages: readonly string[] = SUPPORTED_LANGUAGES;
      expect(languages).toHaveLength(5);
    });
  });

  describe("LANGUAGE_NAMES", () => {
    it("has a name for every supported language", () => {
      for (const lang of SUPPORTED_LANGUAGES) {
        expect(LANGUAGE_NAMES[lang]).toBeDefined();
        expect(typeof LANGUAGE_NAMES[lang]).toBe("string");
      }
    });

    it("has correct language names", () => {
      expect(LANGUAGE_NAMES.en).toBe("English");
      expect(LANGUAGE_NAMES.hu).toBe("Magyar");
      expect(LANGUAGE_NAMES.es).toBe("Español");
      expect(LANGUAGE_NAMES.de).toBe("Deutsch");
      expect(LANGUAGE_NAMES.fr).toBe("Français");
    });
  });

  describe("blogPostFrontmatterSchema", () => {
    const validFrontmatter = {
      title: "Test Post",
      slug: "test-post",
      description: "A test post",
      date: "2025-01-01",
      author: "Test Author",
      category: "Testing",
      tags: ["test"],
    };

    it("accepts valid frontmatter without language", () => {
      const result = blogPostFrontmatterSchema.safeParse(validFrontmatter);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.language).toBe("en");
      }
    });

    it("defaults language to 'en'", () => {
      const result = blogPostFrontmatterSchema.safeParse(validFrontmatter);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.language).toBe("en");
      }
    });

    it("accepts valid language codes", () => {
      for (const lang of SUPPORTED_LANGUAGES) {
        const result = blogPostFrontmatterSchema.safeParse({
          ...validFrontmatter,
          language: lang,
        });
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid language codes", () => {
      const result = blogPostFrontmatterSchema.safeParse({
        ...validFrontmatter,
        language: "invalid",
      });
      expect(result.success).toBe(false);
    });

    it("type SupportedLanguage matches SUPPORTED_LANGUAGES", () => {
      // This is a compile-time check — ensure the type works
      const lang: SupportedLanguage = "hu";
      expect(SUPPORTED_LANGUAGES).toContain(lang);
    });

    it("type BlogPostFrontmatter includes language field", () => {
      const frontmatter: BlogPostFrontmatter = {
        ...validFrontmatter,
        tags: ["test"],
        listed: true,
        language: "fr",
      };
      expect(frontmatter.language).toBe("fr");
    });
  });
});
