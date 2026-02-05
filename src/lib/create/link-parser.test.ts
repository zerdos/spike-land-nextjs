import { describe, expect, it } from "vitest";
import { parseInternalLinks } from "./link-parser";

describe("link-parser", () => {
  describe("parseInternalLinks", () => {
    it("should parse simple internal links", () => {
      const content = "Check out [[/create/cooking/pasta]] app";
      const result = parseInternalLinks(content);

      expect(result.links).toContain("cooking/pasta");
      expect(result.html).toContain('href="/create/cooking/pasta"');
    });

    it("should handle multiple links", () => {
      const content = "Try [[/create/app1]] and [[/create/app2]]";
      const result = parseInternalLinks(content);

      expect(result.links).toHaveLength(2);
      expect(result.links).toContain("app1");
      expect(result.links).toContain("app2");
    });

    it("should sanitize paths to prevent XSS", () => {
      const content = 'Bad link [[/create/" onclick="alert(1)]]';
      const result = parseInternalLinks(content);

      // The path in href should be sanitized or encoded
      expect(result.html).not.toContain('onclick="alert(1)"');
      expect(result.html).toContain("&quot;");
    });

    it("should ignores invalid format", () => {
      const content = "No link here [ /create/foo ]";
      const result = parseInternalLinks(content);

      expect(result.links).toHaveLength(0);
      expect(result.html).toBe(content);
    });
  });
});
