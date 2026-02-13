import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock fs module
vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  },
}));

// Mock gray-matter
vi.mock("gray-matter", () => ({
  default: vi.fn(),
}));

// Mock reading-time
vi.mock("reading-time", () => ({
  default: vi.fn(),
}));

import fs from "fs";
import matter from "gray-matter";
import readingTime from "reading-time";

import { getAvailableLanguages, getTranslatedPost } from "./get-translations";

describe("get-translations", () => {
  const mockFrontmatter = {
    title: "Título de Prueba",
    slug: "test-post",
    description: "Una publicación de prueba",
    date: "2025-01-01",
    author: "Test Author",
    category: "Testing",
    tags: ["test"],
    featured: false,
    listed: true,
    language: "es",
  };

  const mockContent = "Este es el contenido de la publicación de prueba.";

  beforeEach(() => {
    vi.resetAllMocks();

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      `---\ntitle: Título de Prueba\n---\n${mockContent}`,
    );
    vi.mocked(matter).mockReturnValue({
      data: mockFrontmatter,
      content: mockContent,
      matter: "",
      language: "",
      orig: Buffer.from(""),
      stringify: vi.fn(),
    });
    vi.mocked(readingTime).mockReturnValue({
      text: "1 min read",
      minutes: 1,
      time: 60000,
      words: 200,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getAvailableLanguages", () => {
    it("returns languages that have translation files", () => {
      // All translation files exist
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const languages = getAvailableLanguages("test-post");

      expect(languages).toEqual(["hu", "es", "de", "fr"]);
    });

    it("filters out languages without translation files", () => {
      vi.mocked(fs.existsSync).mockImplementation((filePath) => {
        return String(filePath).includes("/hu/") || String(filePath).includes("/fr/");
      });

      const languages = getAvailableLanguages("test-post");

      expect(languages).toEqual(["hu", "fr"]);
    });

    it("returns empty array when no translations exist", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const languages = getAvailableLanguages("test-post");

      expect(languages).toEqual([]);
    });

    it("returns empty array for invalid slug", () => {
      const languages = getAvailableLanguages("../../secret");

      expect(languages).toEqual([]);
    });

    it("does not include 'en' in results", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const languages = getAvailableLanguages("test-post");

      expect(languages).not.toContain("en");
    });
  });

  describe("getTranslatedPost", () => {
    it("returns translated post for valid slug and language", () => {
      const post = getTranslatedPost("test-post", "es");

      expect(post).toEqual({
        frontmatter: mockFrontmatter,
        content: mockContent,
        slug: "test-post",
        readingTime: "1 min read",
      });
    });

    it("returns null for English language", () => {
      const post = getTranslatedPost("test-post", "en");

      expect(post).toBeNull();
    });

    it("returns null for invalid slug", () => {
      const post = getTranslatedPost("../secret", "hu");

      expect(post).toBeNull();
    });

    it("returns null when file does not exist", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const post = getTranslatedPost("test-post", "hu");

      expect(post).toBeNull();
    });

    it("returns null when readFileSync throws", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error("Read error");
      });

      const post = getTranslatedPost("test-post", "hu");

      expect(post).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to read translation hu/test-post.mdx:",
        "Read error",
      );
      consoleErrorSpy.mockRestore();
    });

    it("returns null when gray-matter throws", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.mocked(matter).mockImplementation(() => {
        throw new Error("Parse error");
      });

      const post = getTranslatedPost("test-post", "es");

      expect(post).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to parse frontmatter in es/test-post.mdx:",
        "Parse error",
      );
      consoleErrorSpy.mockRestore();
    });

    it("returns null when reading-time throws", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.mocked(readingTime).mockImplementation(() => {
        throw new Error("Reading time error");
      });

      const post = getTranslatedPost("test-post", "de");

      expect(post).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to calculate reading time for de/test-post.mdx:",
        "Reading time error",
      );
      consoleErrorSpy.mockRestore();
    });

    it("returns null when frontmatter validation fails", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.mocked(matter).mockReturnValue({
        data: { invalidField: "invalid" },
        content: "Test content",
        matter: "",
        language: "",
        orig: Buffer.from(""),
        stringify: vi.fn(),
      });

      const post = getTranslatedPost("test-post", "fr");

      expect(post).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });
});
