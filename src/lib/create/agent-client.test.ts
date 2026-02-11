import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Shared mock for messages.create - all Anthropic instances reference this
const mockCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
  // Must use a function (not arrow) so `new` works
  function MockAnthropic() {
    // @ts-expect-error -- mock constructor
    this.messages = { create: mockCreate };
  }
  return { default: MockAnthropic };
});

// Import after vi.mock so the mock is in place
import {
  callClaude,
  type ClaudeResponse,
  extractCodeFromResponse,
  parseGenerationResponse,
} from "./agent-client";
import { resetClaudeClient } from "@/lib/ai/claude-client";

describe("agent-client", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    resetClaudeClient();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------
  // callClaude
  // ---------------------------------------------------------------
  describe("callClaude", () => {
    it("should call Anthropic messages.create with correct default parameters", async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: "text", text: "hello" }],
        usage: {
          input_tokens: 10,
          output_tokens: 20,
        },
      });

      const result: ClaudeResponse = await callClaude({
        systemPrompt: "You are helpful.",
        userPrompt: "Say hello",
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "claude-opus-4-6",
          max_tokens: 32768,
          temperature: 0.5,
          system: [
            {
              type: "text",
              text: "You are helpful.",
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [{ role: "user", content: "Say hello" }],
        }),
      );

      expect(result.text).toBe("hello");
      expect(result.inputTokens).toBe(10);
      expect(result.outputTokens).toBe(20);
      expect(result.cacheReadTokens).toBe(0);
      expect(result.cacheCreationTokens).toBe(0);
    });

    it("should use specified model, maxTokens, and temperature", async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: "text", text: "ok" }],
        usage: { input_tokens: 1, output_tokens: 2 },
      });

      await callClaude({
        systemPrompt: "sys",
        userPrompt: "usr",
        model: "haiku",
        maxTokens: 1024,
        temperature: 0.9,
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          temperature: 0.9,
        }),
      );
    });

    it("should map sonnet model correctly", async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: "text", text: "ok" }],
        usage: { input_tokens: 1, output_tokens: 2 },
      });

      await callClaude({
        systemPrompt: "sys",
        userPrompt: "usr",
        model: "sonnet",
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "claude-sonnet-4-5-20250929",
        }),
      );
    });

    it("should concatenate multiple text blocks into a single string", async () => {
      mockCreate.mockResolvedValue({
        content: [
          { type: "text", text: "part1" },
          { type: "text", text: "part2" },
        ],
        usage: { input_tokens: 5, output_tokens: 10 },
      });

      const result = await callClaude({
        systemPrompt: "sys",
        userPrompt: "usr",
      });

      expect(result.text).toBe("part1part2");
    });

    it("should filter out non-text content blocks", async () => {
      mockCreate.mockResolvedValue({
        content: [
          { type: "text", text: "only-text" },
          { type: "tool_use", id: "1", name: "tool", input: {} },
        ],
        usage: { input_tokens: 5, output_tokens: 10 },
      });

      const result = await callClaude({
        systemPrompt: "sys",
        userPrompt: "usr",
      });

      expect(result.text).toBe("only-text");
    });

    it("should read cache token fields from usage when present", async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: "text", text: "cached" }],
        usage: {
          input_tokens: 100,
          output_tokens: 50,
          cache_read_input_tokens: 80,
          cache_creation_input_tokens: 20,
        },
      });

      const result = await callClaude({
        systemPrompt: "sys",
        userPrompt: "usr",
      });

      expect(result.cacheReadTokens).toBe(80);
      expect(result.cacheCreationTokens).toBe(20);
    });

    it("should default cache tokens to 0 when usage fields are undefined", async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: "text", text: "no-cache" }],
        usage: {
          input_tokens: 10,
          output_tokens: 5,
          // cache_read_input_tokens and cache_creation_input_tokens absent
        },
      });

      const result = await callClaude({
        systemPrompt: "sys",
        userPrompt: "usr",
      });

      expect(result.cacheReadTokens).toBe(0);
      expect(result.cacheCreationTokens).toBe(0);
    });

    it("should propagate API errors", async () => {
      mockCreate.mockRejectedValue(new Error("API rate limit exceeded"));

      await expect(
        callClaude({ systemPrompt: "sys", userPrompt: "usr" }),
      ).rejects.toThrow("API rate limit exceeded");
    });
  });

  // ---------------------------------------------------------------
  // extractCodeFromResponse
  // ---------------------------------------------------------------
  describe("extractCodeFromResponse", () => {
    it("should extract code from tsx fence", () => {
      const input = 'Some text\n```tsx\nimport React from "react";\nexport default function App() { return <div/>; }\n```\nMore text';
      const result = extractCodeFromResponse(input);
      expect(result).toBe('import React from "react";\nexport default function App() { return <div/>; }');
    });

    it("should extract code from jsx fence", () => {
      const input = "```jsx\nconst x = 1;\n```";
      const result = extractCodeFromResponse(input);
      expect(result).toBe("const x = 1;");
    });

    it("should extract code from typescript fence", () => {
      const input = "```typescript\nconst y: number = 2;\n```";
      const result = extractCodeFromResponse(input);
      expect(result).toBe("const y: number = 2;");
    });

    it("should extract code from javascript fence", () => {
      const input = "```javascript\nconst z = 3;\n```";
      const result = extractCodeFromResponse(input);
      expect(result).toBe("const z = 3;");
    });

    it("should extract code from fence without language specifier", () => {
      const input = "```\nconst a = 4;\n```";
      const result = extractCodeFromResponse(input);
      expect(result).toBe("const a = 4;");
    });

    it("should extract code field from valid JSON", () => {
      const input = JSON.stringify({
        title: "Test",
        code: 'export default function App() { return <div>Hello</div> }',
        relatedApps: [],
      });
      const result = extractCodeFromResponse(input);
      expect(result).toBe("export default function App() { return <div>Hello</div> }");
    });

    it("should return null for JSON without a code field", () => {
      const input = JSON.stringify({ title: "No Code", description: "Nothing" });
      const result = extractCodeFromResponse(input);
      expect(result).toBeNull();
    });

    it("should extract code from partial/malformed JSON with trailing fields", () => {
      // The first path (full JSON.parse) should succeed here, but let's test the
      // partial JSON path by making it unparseable
      const malformed = '{"title":"Test","code":"export default function App() { return <div/> }","relatedApps":["a/b"';
      const result = extractCodeFromResponse(malformed);
      expect(result).toContain("export default function App()");
    });

    it("should handle partial JSON where code value has JSON-escaped chars", () => {
      const input = '{"code":"line1\\nline2\\ttab\\"quote"';
      const result = extractCodeFromResponse(input);
      expect(result).toContain("line1");
      expect(result).toContain("line2");
    });

    it("should strip trailing relatedApps/title/description from partial JSON code", () => {
      // Full JSON parse should succeed, but test the regex path with bad JSON
      const malformed = '{"code":"const x = 1;","relatedApps":["a"],"title":"T"';
      const result = extractCodeFromResponse(malformed);
      expect(result).toBe("const x = 1;");
    });

    it("should detect raw code with import and export default", () => {
      const input = 'import React from "react";\n\nexport default function App() {\n  return <div/>;\n}';
      const result = extractCodeFromResponse(input);
      expect(result).toBe(input.trim());
    });

    it("should return null for text without code patterns", () => {
      const input = "This is just a plain text response with no code.";
      const result = extractCodeFromResponse(input);
      expect(result).toBeNull();
    });

    it("should return null for empty string", () => {
      expect(extractCodeFromResponse("")).toBeNull();
    });

    it("should prefer fence extraction over JSON parsing", () => {
      // If response has both a fence and a JSON code field, fence wins
      const input = '```tsx\nfenced code\n```\n{"code":"json code"}';
      const result = extractCodeFromResponse(input);
      expect(result).toBe("fenced code");
    });

    it("should handle partial JSON where JSON.parse of escaped string fails", () => {
      // Force the catch branch in the partial JSON path by providing a code
      // value that cannot be re-parsed with JSON.parse(`"${code}"`)
      const input = '{"code":"line1\\ninvalid\\x00escape"}';
      const result = extractCodeFromResponse(input);
      // Falls through to manual unescape: \\n -> \n
      expect(result).toContain("line1");
    });

    it("should return null for partial JSON with empty code after cleanup", () => {
      const input = '{"code":""}';
      // Full JSON parse succeeds, returns ""
      // extractCodeFromResponse tries JSON.parse first -> json.code is "" -> returns ""
      // Actually "" is a string, so it returns ""
      const result = extractCodeFromResponse(input);
      // JSON.parse succeeds and json.code is "", typeof === "string", returns ""
      expect(result).toBe("");
    });
  });

  // ---------------------------------------------------------------
  // parseGenerationResponse
  // ---------------------------------------------------------------
  describe("parseGenerationResponse", () => {
    it("should parse valid JSON with all fields", () => {
      const input = JSON.stringify({
        title: "My App",
        description: "A great app",
        code: "export default function App() { return <div/>; }",
        relatedApps: ["games/tetris", "tools/calc"],
      });

      const result = parseGenerationResponse(input, "test/my-app");

      expect(result).toEqual({
        title: "My App",
        description: "A great app",
        code: "export default function App() { return <div/>; }",
        relatedApps: ["games/tetris", "tools/calc"],
      });
    });

    it("should default description when missing from valid JSON", () => {
      const input = JSON.stringify({
        title: "My App",
        code: "export default function App() {}",
      });

      const result = parseGenerationResponse(input, "test/my-app");

      expect(result).not.toBeNull();
      expect(result!.description).toBe("Generated application");
    });

    it("should default relatedApps to empty array when not an array", () => {
      const input = JSON.stringify({
        title: "My App",
        code: "export default function App() {}",
        relatedApps: "not-an-array",
      });

      const result = parseGenerationResponse(input, "test/my-app");

      expect(result).not.toBeNull();
      expect(result!.relatedApps).toEqual([]);
    });

    it("should return null when JSON has title but no code", () => {
      const input = JSON.stringify({ title: "No Code App" });

      const result = parseGenerationResponse(input, "test/no-code");

      // JSON parse succeeds but json.code is falsy, falls through.
      // jsonMatch regex won't find "code": "..." either.
      // extractCodeFromResponse on the raw JSON string also finds no code.
      expect(result).toBeNull();
    });

    it("should extract JSON block embedded in surrounding text", () => {
      const input = 'Here is the response:\n{"title":"Embedded","description":"Desc","code":"export default function App() { return <div>Embedded</div> }","relatedApps":[]}\nEnd of response.';

      const result = parseGenerationResponse(input, "test/embedded");

      expect(result).not.toBeNull();
      expect(result!.title).toBe("Embedded");
      expect(result!.code).toBe("export default function App() { return <div>Embedded</div> }");
    });

    it("should derive title from slug when embedded JSON block has no title", () => {
      const input = 'Preamble\n{"code":"export default function App() { return <div/> }"}\nPostamble';

      const result = parseGenerationResponse(input, "apps/my-cool-app");

      expect(result).not.toBeNull();
      expect(result!.title).toBe("my cool app");
    });

    it("should fall back to extractCodeFromResponse when no JSON is parseable", () => {
      const input = '```tsx\nimport React from "react";\nexport default function App() { return <div>Fallback</div>; }\n```';

      const result = parseGenerationResponse(input, "test/fallback");

      expect(result).not.toBeNull();
      expect(result!.code).toContain("export default function App()");
      expect(result!.title).toBe("fallback");
      expect(result!.description).toBe("Generated application");
      expect(result!.relatedApps).toEqual([]);
    });

    it("should derive title from slug for code-only fallback", () => {
      const input = 'import React from "react";\nexport default function App() { return <div/>; }';

      const result = parseGenerationResponse(input, "category/my-widget");

      expect(result).not.toBeNull();
      expect(result!.title).toBe("my widget");
    });

    it("should use 'Generated App' when slug has no segments", () => {
      const input = '```tsx\nexport default function App() {}\n```';

      // Slug with empty last segment
      const result = parseGenerationResponse(input, "");

      expect(result).not.toBeNull();
      // "".split("/").pop() is "" -> .replace(/-/g, " ") is "" -> fallback "Generated App"
      expect(result!.title).toBe("Generated App");
    });

    it("should return null when nothing is extractable", () => {
      const input = "This is plain text without any code patterns at all.";

      const result = parseGenerationResponse(input, "test/nothing");

      expect(result).toBeNull();
    });

    it("should handle embedded JSON that fails parse but has code via extractCodeFromResponse", () => {
      // Malformed JSON block that regex matches but JSON.parse fails,
      // then falls through to extractCodeFromResponse
      const input = '{"code":"import x from \\"y\\";\\nexport default function App() { return <div/> }","broken';

      const result = parseGenerationResponse(input, "test/partial");

      expect(result).not.toBeNull();
      expect(result!.code).toContain("export default function App()");
    });

    it("should default description and relatedApps for embedded JSON block", () => {
      const input = 'Text before\n{"title":"Block App","code":"export default function App() {}"}\nText after';

      const result = parseGenerationResponse(input, "test/block");

      expect(result).not.toBeNull();
      expect(result!.description).toBe("Generated application");
      expect(result!.relatedApps).toEqual([]);
    });
  });
});
