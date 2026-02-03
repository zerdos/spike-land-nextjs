import { describe, expect, it } from "vitest";
import { parseWikiLinks } from "./wiki-links";

describe("Wiki Links Parser", () => {
  it("should parse simple links", () => {
    const input = "Check out [[React Hooks]] for more info.";
    const { content, links } = parseWikiLinks(input);

    expect(links).toEqual(["react-hooks"]);
    expect(content).toContain("[React Hooks](/learnit/react-hooks)");
  });

  it("should parse links with aliases", () => {
    const input = "Read about [[React Hooks|Hooks]].";
    const { content, links } = parseWikiLinks(input);

    expect(links).toEqual(["react-hooks"]);
    expect(content).toContain("[Hooks](/learnit/react-hooks)");
  });

  it("should handle multiple links", () => {
    const input = "Compare [[React]] vs [[Vue]].";
    const { content, links } = parseWikiLinks(input);

    expect(links).toEqual(["react", "vue"]);
    expect(content).toContain("[React](/learnit/react)");
    expect(content).toContain("[Vue](/learnit/vue)");
  });

  it("should handle links with punctuation boundaries", () => {
    const input = "[[React]].";
    const { content } = parseWikiLinks(input);
    expect(content).toBe("[React](/learnit/react).");
  });
});
