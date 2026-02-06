import { generateStructuredResponse, StructuredResponseParseError } from "@/lib/ai/gemini-client";
import { describe, expect, it, vi } from "vitest";
import {
  buildUserPrompt,
  extractCodeFromRawText,
  generateAppContent,
  SYSTEM_PROMPT,
} from "./content-generator";

vi.mock("@/lib/ai/gemini-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/gemini-client")>();
  return {
    ...actual,
    generateStructuredResponse: vi.fn(),
  };
});
vi.mock("@/lib/logger", () => ({
  default: {
    error: vi.fn(),
  },
}));

describe("content-generator", () => {
  describe("SYSTEM_PROMPT", () => {
    it("should contain shadcn/ui components", () => {
      expect(SYSTEM_PROMPT).toContain("@/components/ui/button");
      expect(SYSTEM_PROMPT).toContain("@/components/ui/card");
      expect(SYSTEM_PROMPT).toContain("@/components/ui/dialog");
      expect(SYSTEM_PROMPT).toContain("@/components/ui/tabs");
      expect(SYSTEM_PROMPT).toContain("@/components/ui/chart");
    });

    it("should contain CDN-available libraries", () => {
      expect(SYSTEM_PROMPT).toContain("recharts");
      expect(SYSTEM_PROMPT).toContain("date-fns");
      expect(SYSTEM_PROMPT).toContain("zustand");
      expect(SYSTEM_PROMPT).toContain("react-hook-form");
      expect(SYSTEM_PROMPT).toContain("sonner");
      expect(SYSTEM_PROMPT).toContain("react-markdown");
      expect(SYSTEM_PROMPT).toContain("canvas-confetti");
      expect(SYSTEM_PROMPT).toContain("@dnd-kit/core");
      expect(SYSTEM_PROMPT).toContain("roughjs");
      expect(SYSTEM_PROMPT).toContain("howler");
    });

    it("should contain pre-loaded libraries", () => {
      expect(SYSTEM_PROMPT).toContain("framer-motion");
      expect(SYSTEM_PROMPT).toContain("lucide-react");
    });

    it("should warn against stale closures with setTimeout", () => {
      expect(SYSTEM_PROMPT).toContain("setTimeout");
      expect(SYSTEM_PROMPT).toContain("stale");
    });

    it("should contain dark mode guidance with semantic classes", () => {
      expect(SYSTEM_PROMPT).toContain("DARK MODE IS MANDATORY");
      expect(SYSTEM_PROMPT).toContain("text-foreground");
      expect(SYSTEM_PROMPT).toContain("bg-background");
      expect(SYSTEM_PROMPT).toContain("dark:");
    });

    it("should contain curated lucide-react icon list with hallucination guard", () => {
      expect(SYSTEM_PROMPT).toContain("ChevronDown");
      expect(SYSTEM_PROMPT).toContain("AlertCircle");
      expect(SYSTEM_PROMPT).toContain("BarChart3");
      expect(SYSTEM_PROMPT).toContain("Do NOT invent icon names");
    });

    it("should limit icon imports per component", () => {
      expect(SYSTEM_PROMPT).toContain("Limit icon imports to 6-8 icons maximum per component");
    });
  });

  describe("buildUserPrompt", () => {
    it("should include the topic in the prompt", () => {
      const prompt = buildUserPrompt("games/tetris");
      expect(prompt).toContain('"/create/games/tetris"');
    });
  });

  describe("generateAppContent", () => {
    it("should return valid content when AI responds correctly", async () => {
      const mockResponse = {
        title: "Test App",
        description: "A test app",
        code: "export default function App() { return <div>Test</div> }",
        relatedApps: ["test/one", "test/two"],
      };

      (generateStructuredResponse as any).mockResolvedValue(mockResponse);

      const result = await generateAppContent(["test", "app"]);

      expect(result.content).toEqual(mockResponse);
      expect(result.rawCode).toBe(mockResponse.code);
      expect(result.error).toBeNull();
      expect(generateStructuredResponse).toHaveBeenCalledWith(expect.objectContaining({
        prompt: expect.stringContaining('"/create/test/app"'),
        systemPrompt: SYSTEM_PROMPT,
        maxTokens: 16384,
        temperature: 0.5,
        thinkingBudget: 2048,
      }));
    });

    it("should clean up markdown code blocks", async () => {
      const mockResponse = {
        title: "Test App",
        description: "A test app",
        code: "```tsx\nexport default function App() { return <div>Test</div> }\n```",
        relatedApps: ["test/one"],
      };

      (generateStructuredResponse as any).mockResolvedValue(mockResponse);

      const result = await generateAppContent(["test", "app"]);

      expect(result.content?.code).toBe("export default function App() { return <div>Test</div> }");
      expect(result.rawCode).toBe("export default function App() { return <div>Test</div> }");
    });

    it("should return error with null content on API error", async () => {
      (generateStructuredResponse as any).mockRejectedValue(new Error("AI Error"));

      const result = await generateAppContent(["test", "app"]);

      expect(result.content).toBeNull();
      expect(result.rawCode).toBeNull();
      expect(result.error).toBe("AI Error");
    });

    it("should return error with null rawCode if keys are missing", async () => {
      // Missing code, description, relatedApps
      (generateStructuredResponse as any).mockResolvedValue({
        title: "Test",
      });

      const result = await generateAppContent(["test"]);

      expect(result.content).toBeNull();
      expect(result.rawCode).toBeNull();
      expect(result.error).toBeTruthy();
    });

    it("should preserve rawCode when Zod validation fails but code exists", async () => {
      // Has code but missing title and description
      (generateStructuredResponse as any).mockResolvedValue({
        code: "export default function App() { return <div>Partial</div> }",
      });

      const result = await generateAppContent(["test"]);

      expect(result.content).toBeNull();
      expect(result.rawCode).toBe("export default function App() { return <div>Partial</div> }");
      expect(result.error).toBeTruthy();
    });

    it("should clean markdown from rawCode even when validation fails", async () => {
      (generateStructuredResponse as any).mockResolvedValue({
        code: "```tsx\nexport default function App() { return <div>Raw</div> }\n```",
      });

      const result = await generateAppContent(["test"]);

      expect(result.content).toBeNull();
      expect(result.rawCode).toBe("export default function App() { return <div>Raw</div> }");
      expect(result.error).toBeTruthy();
    });

    it("should extract code from raw text when JSON parsing fails", async () => {
      const rawJson =
        `{"title":"Test","description":"A test","code":"export default function App() { return <div>Hello</div> }","relatedApps":["a/b"]}`;
      (generateStructuredResponse as any).mockRejectedValue(
        new StructuredResponseParseError(
          "Failed to parse structured response: Unterminated string",
          rawJson,
        ),
      );

      const result = await generateAppContent(["test"]);

      expect(result.content).toBeNull();
      expect(result.rawCode).toBe("export default function App() { return <div>Hello</div> }");
      expect(result.error).toContain("Failed to parse structured response");
    });

    it("should return null rawCode when StructuredResponseParseError has no code field", async () => {
      const rawJson = `{"title":"Test","description":"A broken response with no code field`;
      (generateStructuredResponse as any).mockRejectedValue(
        new StructuredResponseParseError(
          "Failed to parse structured response: Unterminated string",
          rawJson,
        ),
      );

      const result = await generateAppContent(["test"]);

      expect(result.content).toBeNull();
      expect(result.rawCode).toBeNull();
      expect(result.error).toContain("Failed to parse structured response");
    });

    it("should still return null rawCode for non-parse errors", async () => {
      (generateStructuredResponse as any).mockRejectedValue(new Error("Network timeout"));

      const result = await generateAppContent(["test"]);

      expect(result.content).toBeNull();
      expect(result.rawCode).toBeNull();
      expect(result.error).toBe("Network timeout");
    });
  });

  describe("extractCodeFromRawText", () => {
    it("should extract code from well-formed JSON text", () => {
      const raw =
        `{"title":"Test","code":"export default function App() { return <div>Hi</div> }","relatedApps":["a"]}`;
      expect(extractCodeFromRawText(raw)).toBe(
        "export default function App() { return <div>Hi</div> }",
      );
    });

    it("should handle JSON-escaped characters in code", () => {
      const raw = `{"code":"export default function App() {\\n  return <div>Hi</div>\\n}"}`;
      expect(extractCodeFromRawText(raw)).toBe(
        "export default function App() {\n  return <div>Hi</div>\n}",
      );
    });

    it("should handle truncated JSON where code is cut off", () => {
      const raw = `{"title":"Test","code":"export default function App() { return <div>Trun`;
      const result = extractCodeFromRawText(raw);
      expect(result).toContain("export default function App()");
      expect(result).toContain("Trun");
    });

    it("should return null when no code field exists", () => {
      expect(extractCodeFromRawText(`{"title":"Test","description":"No code here"}`)).toBeNull();
    });

    it("should return null for empty text", () => {
      expect(extractCodeFromRawText("")).toBeNull();
    });

    it("should strip markdown fences from extracted code", () => {
      const raw = `{"code":"\`\`\`tsx\\nexport default function App() { return <div/> }\\n\`\`\`"}`;
      const result = extractCodeFromRawText(raw);
      expect(result).toBe("export default function App() { return <div/> }");
    });
  });
});
