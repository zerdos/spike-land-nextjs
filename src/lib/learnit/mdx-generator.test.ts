import { describe, expect, it } from "vitest";
import { generateMdxFromResponse } from "./mdx-generator";

describe("generateMdxFromResponse", () => {
  it("generates sections with headings and content", () => {
    const result = generateMdxFromResponse({
      title: "Test Topic",
      description: "A test topic",
      sections: [
        { heading: "Introduction", content: "Hello world" },
        { heading: "Details", content: "More info here" },
      ],
      relatedTopics: [],
    });

    expect(result).toContain("## Introduction");
    expect(result).toContain("Hello world");
    expect(result).toContain("## Details");
    expect(result).toContain("More info here");
  });

  it("appends related topics with wiki-link syntax", () => {
    const result = generateMdxFromResponse({
      title: "Test",
      description: "Test",
      sections: [{ heading: "Intro", content: "Content" }],
      relatedTopics: ["React Hooks", "State Management"],
    });

    expect(result).toContain("### Detailed Related Topics");
    expect(result).toContain("- [[React Hooks]]");
    expect(result).toContain("- [[State Management]]");
  });

  it("handles empty sections array", () => {
    const result = generateMdxFromResponse({
      title: "Empty",
      description: "Empty",
      sections: [],
      relatedTopics: [],
    });

    expect(result).toBe("");
  });

  it("handles empty relatedTopics", () => {
    const result = generateMdxFromResponse({
      title: "Test",
      description: "Test",
      sections: [{ heading: "Intro", content: "Content" }],
      relatedTopics: [],
    });

    expect(result).not.toContain("Related Topics");
    expect(result).toContain("## Intro");
  });

  it("handles missing relatedTopics (undefined-like via empty array)", () => {
    const result = generateMdxFromResponse({
      title: "Test",
      description: "Test",
      sections: [{ heading: "Section", content: "Body" }],
      relatedTopics: [],
    });

    expect(result).toContain("## Section");
    expect(result).toContain("Body");
    expect(result).not.toContain("Related Topics");
  });
});
