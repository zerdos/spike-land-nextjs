import { describe, expect, it } from "vitest";

import { detectLanguageFromHeader, resolveLanguage } from "./language-detection";

describe("language-detection", () => {
  describe("detectLanguageFromHeader", () => {
    it("returns null for null header", () => {
      expect(detectLanguageFromHeader(null)).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(detectLanguageFromHeader("")).toBeNull();
    });

    it("detects exact match language", () => {
      expect(detectLanguageFromHeader("hu")).toBe("hu");
      expect(detectLanguageFromHeader("es")).toBe("es");
      expect(detectLanguageFromHeader("de")).toBe("de");
      expect(detectLanguageFromHeader("fr")).toBe("fr");
      expect(detectLanguageFromHeader("en")).toBe("en");
    });

    it("detects language from prefix (e.g., hu-HU)", () => {
      expect(detectLanguageFromHeader("hu-HU")).toBe("hu");
      expect(detectLanguageFromHeader("es-ES")).toBe("es");
      expect(detectLanguageFromHeader("de-DE")).toBe("de");
      expect(detectLanguageFromHeader("fr-FR")).toBe("fr");
    });

    it("respects quality values", () => {
      expect(detectLanguageFromHeader("en;q=0.5, hu;q=0.9")).toBe("hu");
      expect(detectLanguageFromHeader("en;q=0.9, hu;q=0.5")).toBe("en");
    });

    it("returns highest quality supported language", () => {
      expect(detectLanguageFromHeader("ja;q=0.9, hu;q=0.8, en;q=0.7")).toBe("hu");
    });

    it("defaults quality to 1.0 when not specified", () => {
      expect(detectLanguageFromHeader("hu, en;q=0.5")).toBe("hu");
    });

    it("returns null for unsupported languages", () => {
      expect(detectLanguageFromHeader("ja, zh, ko")).toBeNull();
    });

    it("handles complex Accept-Language header", () => {
      expect(detectLanguageFromHeader("en-US,en;q=0.9,hu;q=0.8,de;q=0.7")).toBe("en");
    });

    it("handles malformed q values", () => {
      expect(detectLanguageFromHeader("hu;q=abc, en;q=0.9")).toBe("en");
    });

    it("handles whitespace in header", () => {
      expect(detectLanguageFromHeader("  hu  ,  en;q=0.5  ")).toBe("hu");
    });
  });

  describe("resolveLanguage", () => {
    it("returns 'en' by default when no options match", () => {
      expect(resolveLanguage({})).toBe("en");
    });

    it("prioritizes query param over everything", () => {
      expect(
        resolveLanguage({
          queryLang: "hu",
          cookieLang: "de",
          acceptLanguage: "fr",
        }),
      ).toBe("hu");
    });

    it("falls back to cookie when no query param", () => {
      expect(
        resolveLanguage({
          cookieLang: "de",
          acceptLanguage: "fr",
        }),
      ).toBe("de");
    });

    it("falls back to Accept-Language when no query or cookie", () => {
      expect(
        resolveLanguage({
          acceptLanguage: "fr-FR,fr;q=0.9",
        }),
      ).toBe("fr");
    });

    it("ignores invalid query param", () => {
      expect(
        resolveLanguage({
          queryLang: "invalid",
          cookieLang: "de",
        }),
      ).toBe("de");
    });

    it("ignores invalid cookie lang", () => {
      expect(
        resolveLanguage({
          cookieLang: "invalid",
          acceptLanguage: "es",
        }),
      ).toBe("es");
    });

    it("returns 'en' when all sources are invalid", () => {
      expect(
        resolveLanguage({
          queryLang: "zz",
          cookieLang: "xx",
          acceptLanguage: "ja",
        }),
      ).toBe("en");
    });

    it("handles undefined acceptLanguage", () => {
      expect(
        resolveLanguage({
          acceptLanguage: undefined,
        }),
      ).toBe("en");
    });

    it("handles null acceptLanguage", () => {
      expect(
        resolveLanguage({
          acceptLanguage: null as unknown as string,
        }),
      ).toBe("en");
    });
  });
});
