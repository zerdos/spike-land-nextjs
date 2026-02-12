import { describe, expect, it } from "vitest";
import { slugify, stripMarkdown } from "./utils";

describe("slugify", () => {
  it("converts text to lowercase with dashes", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("removes special characters", () => {
    expect(slugify("Hello, World!")).toBe("hello-world");
  });

  it("preserves forward slashes", () => {
    expect(slugify("react/hooks")).toBe("react/hooks");
  });

  it("collapses multiple spaces into single dash", () => {
    expect(slugify("hello   world")).toBe("hello-world");
  });
});

describe("stripMarkdown", () => {
  it("strips bold syntax", () => {
    expect(stripMarkdown("This is **bold** text")).toBe("This is bold text");
  });

  it("strips italic syntax", () => {
    expect(stripMarkdown("This is *italic* text")).toBe("This is italic text");
  });

  it("strips inline code", () => {
    expect(stripMarkdown("Use `console.log()` here")).toBe(
      "Use console.log() here",
    );
  });

  it("strips code blocks", () => {
    expect(stripMarkdown("Before ```js\nconst x = 1;\n``` After")).toBe(
      "Before  After",
    );
  });

  it("strips links, keeping text", () => {
    expect(stripMarkdown("Check [React docs](https://react.dev)")).toBe(
      "Check React docs",
    );
  });

  it("strips images, keeping alt text", () => {
    expect(stripMarkdown("See ![diagram](url.png) here")).toBe(
      "See diagram here",
    );
  });

  it("strips headings", () => {
    expect(stripMarkdown("## Introduction")).toBe("Introduction");
    expect(stripMarkdown("### Sub heading")).toBe("Sub heading");
  });

  it("strips strikethrough", () => {
    expect(stripMarkdown("~~deleted~~ text")).toBe("deleted text");
  });

  it("strips blockquotes", () => {
    expect(stripMarkdown("> quoted text")).toBe("quoted text");
  });

  it("strips horizontal rules", () => {
    expect(stripMarkdown("before\n---\nafter")).toBe("before after");
  });

  it("handles combined markdown", () => {
    const input = "## Learn **React** with `hooks` and [docs](url)";
    const result = stripMarkdown(input);
    expect(result).toBe("Learn React with hooks and docs");
  });

  it("trims whitespace", () => {
    expect(stripMarkdown("  hello  ")).toBe("hello");
  });

  it("returns empty string for empty input", () => {
    expect(stripMarkdown("")).toBe("");
  });
});
