import { generateStructuredResponse, StructuredResponseParseError } from "@/lib/ai/gemini-client";
import { describe, expect, it, vi } from "vitest";
import {
  buildSystemPrompt,
  buildUserPrompt,
  extractCodeFromRawText,
  extractKeywords,
  generateAppContent,
  matchesAny,
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
  describe("extractKeywords", () => {
    it("should split topic by slashes, hyphens, underscores, and spaces", () => {
      expect(extractKeywords("games/tic-tac-toe")).toEqual(["games", "tic", "tac", "toe"]);
      expect(extractKeywords("tools/my_calculator")).toEqual(["tools", "my", "calculator"]);
      expect(extractKeywords("3d globe")).toEqual(["3d", "globe"]);
    });

    it("should lowercase all keywords", () => {
      expect(extractKeywords("Games/TicTacToe")).toEqual(["games", "tictactoe"]);
    });

    it("should filter out empty strings", () => {
      expect(extractKeywords("//double//slash//")).toEqual(["double", "slash"]);
    });
  });

  describe("matchesAny", () => {
    it("should match when a keyword includes a trigger", () => {
      expect(matchesAny(["tictactoe"], ["game", "tictactoe"])).toBe(true);
    });

    it("should match when a trigger includes a keyword", () => {
      expect(matchesAny(["3d"], ["three", "3d"])).toBe(true);
    });

    it("should match partial substring inclusion", () => {
      expect(matchesAny(["dashboard"], ["board"])).toBe(true);
      expect(matchesAny(["gameplay"], ["game"])).toBe(true);
    });

    it("should return false when no match", () => {
      expect(matchesAny(["cooking", "pasta"], ["game", "play"])).toBe(false);
    });
  });

  describe("buildSystemPrompt", () => {
    it("should always include core components", () => {
      const prompt = buildSystemPrompt("anything");
      expect(prompt).toContain("@/components/ui/button");
      expect(prompt).toContain("@/components/ui/card");
      expect(prompt).toContain("@/components/ui/dialog");
      expect(prompt).toContain("@/components/ui/tabs");
      expect(prompt).toContain("@/components/ui/progress");
    });

    it("should always include pre-loaded libraries", () => {
      const prompt = buildSystemPrompt("anything");
      expect(prompt).toContain("framer-motion");
      expect(prompt).toContain("lucide-react");
      expect(prompt).toContain("date-fns");
      expect(prompt).toContain("zustand");
      expect(prompt).toContain("sonner");
    });

    it("should always include code quality rules", () => {
      const prompt = buildSystemPrompt("anything");
      expect(prompt).toContain("setTimeout");
      expect(prompt).toContain("stale");
      expect(prompt).toContain("text-foreground");
      expect(prompt).toContain("bg-background");
      expect(prompt).toContain("semantic color classes");
      expect(prompt).toContain("Do NOT invent icon names");
      expect(prompt).toContain("Limit icon imports to 6-8 icons maximum per component");
    });

    it("should include 3D layer only for 3D topics", () => {
      const prompt3d = buildSystemPrompt("3d/globe");
      expect(prompt3d).toContain("three");
      expect(prompt3d).toContain("3D RENDERING");
      expect(prompt3d).toContain("OrbitControls");

      const promptTodo = buildSystemPrompt("tools/todo");
      expect(promptTodo).not.toContain("3D RENDERING");
    });

    it("should include data viz layer for chart/dashboard topics", () => {
      const prompt = buildSystemPrompt("finance/stock-chart");
      expect(prompt).toContain("recharts");
      expect(prompt).toContain("@/components/ui/chart");
      expect(prompt).toContain("DATA VISUALIZATION");
    });

    it("should include game layer for game topics", () => {
      const prompt = buildSystemPrompt("games/tictactoe");
      expect(prompt).toContain("howler");
      expect(prompt).toContain("canvas-confetti");
      expect(prompt).toContain("GAME DEVELOPMENT");

      const promptPoem = buildSystemPrompt("writing/poem");
      expect(promptPoem).not.toContain("GAME DEVELOPMENT");
    });

    it("should include form layer for form topics", () => {
      const prompt = buildSystemPrompt("tools/calculator");
      expect(prompt).toContain("react-hook-form");
      expect(prompt).toContain("@/components/ui/form");
      expect(prompt).toContain("@/components/ui/checkbox");
      expect(prompt).toContain("FORMS & VALIDATION");
    });

    it("should include DnD layer for kanban/todo topics", () => {
      const prompt = buildSystemPrompt("tools/kanban-board");
      expect(prompt).toContain("@dnd-kit/core");
      expect(prompt).toContain("@dnd-kit/sortable");
      expect(prompt).toContain("DRAG & DROP");
    });

    it("should include drawing layer for drawing topics", () => {
      const prompt = buildSystemPrompt("tools/whiteboard");
      expect(prompt).toContain("roughjs");
      expect(prompt).toContain("DRAWING & CANVAS");
    });

    it("should include content layer for blog/wiki topics", () => {
      const prompt = buildSystemPrompt("writing/blog");
      expect(prompt).toContain("react-markdown");
      expect(prompt).toContain("@/components/ui/accordion");
      expect(prompt).toContain("@/components/ui/table");
      expect(prompt).toContain("CONTENT & MARKDOWN");
    });

    it("should include audio layer for music/audio topics", () => {
      const prompt = buildSystemPrompt("music/piano");
      expect(prompt).toContain("howler");
      expect(prompt).toContain("Web Audio API");
      expect(prompt).toContain("AUDIO & SOUND");
    });

    it("should include URL params layer for dashboard topics", () => {
      const prompt = buildSystemPrompt("tools/dashboard");
      expect(prompt).toContain("URL PARAMETER SUPPORT");
      expect(prompt).toContain("URLSearchParams(window.location.search)");
      expect(prompt).toContain("replaceState");
      expect(prompt).toContain('Do NOT use param name "room"');
    });

    it("should NOT include URL params for non-dashboard topics", () => {
      const prompt = buildSystemPrompt("games/tetris");
      expect(prompt).not.toContain("URL PARAMETER SUPPORT");
    });

    it("should include multiple layers when topic matches multiple triggers", () => {
      const prompt = buildSystemPrompt("dashboard/analytics");
      expect(prompt).toContain("DATA VISUALIZATION");
      expect(prompt).toContain("URL PARAMETER SUPPORT");
    });

    it("should include fallback when no layers match", () => {
      const prompt = buildSystemPrompt("surprise");
      expect(prompt).toContain("ADDITIONAL CDN LIBRARIES");
      expect(prompt).toContain("recharts");
      expect(prompt).toContain("howler");
      expect(prompt).toContain("three");
      // Should NOT include detailed layer content
      expect(prompt).not.toContain("3D RENDERING");
      expect(prompt).not.toContain("GAME DEVELOPMENT");
    });

    it("should NOT include fallback when at least one layer matches", () => {
      const prompt = buildSystemPrompt("games/tetris");
      expect(prompt).not.toContain("ADDITIONAL CDN LIBRARIES");
    });

    it("should not include form components in core prompt (moved to form layer)", () => {
      const prompt = buildSystemPrompt("surprise");
      expect(prompt).not.toContain("@/components/ui/checkbox");
      expect(prompt).not.toContain("@/components/ui/switch");
      expect(prompt).not.toContain("@/components/ui/radio-group");
    });

    it("should not include chart components in core prompt (moved to data viz layer)", () => {
      const prompt = buildSystemPrompt("surprise");
      // The fallback mentions "recharts" briefly but not the full chart component paths
      expect(prompt).not.toContain("@/components/ui/chart");
    });
  });

  describe("SYSTEM_PROMPT backward compatibility", () => {
    it("should be a string (result of buildSystemPrompt('general'))", () => {
      expect(typeof SYSTEM_PROMPT).toBe("string");
      expect(SYSTEM_PROMPT).toContain("@/components/ui/button");
      // "general" matches no layers → fallback
      expect(SYSTEM_PROMPT).toContain("ADDITIONAL CDN LIBRARIES");
    });
  });

  describe("buildUserPrompt", () => {
    it("should include the topic in the prompt", () => {
      const prompt = buildUserPrompt("games/tetris");
      expect(prompt).toContain('"/create/games/tetris"');
    });

    it("should include URL param instruction for dashboard topics", () => {
      const prompt = buildUserPrompt("tools/dashboard");
      expect(prompt).toContain("URL search params");
      expect(prompt).toContain("replaceState");
    });

    it("should include URL param instruction for tracker topics", () => {
      const prompt = buildUserPrompt("fitness/tracker");
      expect(prompt).toContain("URL search params");
    });

    it("should NOT include URL param instruction for non-dashboard topics", () => {
      const prompt = buildUserPrompt("games/tetris");
      expect(prompt).not.toContain("URL search params");
      expect(prompt).not.toContain("replaceState");
    });

    it("should NOT include URL param instruction for poem topics", () => {
      const prompt = buildUserPrompt("writing/poem");
      expect(prompt).not.toContain("URL search params");
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
        systemPrompt: expect.any(String),
        maxTokens: 32768,
        temperature: 0.5,
        thinkingBudget: 32768,
      }));
    });

    it("should use topic-specific system prompt", async () => {
      const mockResponse = {
        title: "Dashboard",
        description: "A dashboard",
        code: "export default function App() { return <div>Dashboard</div> }",
        relatedApps: ["test/one"],
      };

      (generateStructuredResponse as any).mockResolvedValue(mockResponse);

      await generateAppContent(["tools", "dashboard"]);

      expect(generateStructuredResponse).toHaveBeenCalledWith(expect.objectContaining({
        systemPrompt: expect.stringContaining("URL PARAMETER SUPPORT"),
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
