import { generateStructuredResponse, StructuredResponseParseError } from "@/lib/ai/gemini-client";
import { describe, expect, it, vi } from "vitest";
import {
  attemptCodeCorrection,
  buildSystemPrompt,
  buildUserPrompt,
  extractCodeFromRawText,
  extractKeywords,
  generateAppContent,
  getMatchedSkills,
  LUCIDE_ICONS,
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
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("content-generator", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("extractKeywords", () => {
    it("should split topic by slashes, hyphens, underscores, and spaces", () => {
      expect(extractKeywords("games/tic-tac-toe")).toEqual(["games", "tic", "tac", "toe"]);
      expect(extractKeywords("tools/calculator")).toEqual(["tools", "calculator"]);
      expect(extractKeywords("3d globe")).toEqual(["3d", "globe"]);
    });

    it("should lowercase all keywords", () => {
      expect(extractKeywords("Games/TicTacToe")).toEqual(["games", "tictactoe"]);
    });

    it("should filter out empty strings", () => {
      expect(extractKeywords("//double//slash//")).toEqual(["double", "slash"]);
    });

    it("should filter out stop words", () => {
      expect(extractKeywords("to-do-list")).toEqual(["list"]);
      expect(extractKeywords("tools/my_calculator")).toEqual(["tools", "calculator"]);
      expect(extractKeywords("a-note-for-the-day")).toEqual(["note", "day"]);
    });
  });

  describe("matchesAny", () => {
    it("should match exact keywords", () => {
      expect(matchesAny(["tictactoe"], ["game", "tictactoe"])).toBe(true);
      expect(matchesAny(["3d"], ["three", "3d"])).toBe(true);
    });

    it("should match prefix compound for 5+ char triggers", () => {
      expect(matchesAny(["charting"], ["chart"])).toBe(true);
      expect(matchesAny(["musical"], ["music"])).toBe(true);
      expect(matchesAny(["soundtrack"], ["sound"])).toBe(true);
    });

    it("should NOT match short triggers (<5 chars) as prefix", () => {
      expect(matchesAny(["gameplay"], ["game"])).toBe(false);
      expect(matchesAny(["sorting"], ["sort"])).toBe(false);
      expect(matchesAny(["drawing"], ["draw"])).toBe(false);
    });

    it("should NOT match false positives from substring matching", () => {
      expect(matchesAny(["smart"], ["art"])).toBe(false);
      expect(matchesAny(["platform"], ["form"])).toBe(false);
      expect(matchesAny(["display"], ["play"])).toBe(false);
      expect(matchesAny(["dragon"], ["drag"])).toBe(false);
      expect(matchesAny(["dashboard"], ["board"])).toBe(false);
      expect(matchesAny(["denote"], ["note"])).toBe(false);
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
      expect(prompt).toContain("Icons are decoration, not content");
      expect(prompt).toContain("Glass:");
      expect(prompt).toContain("Shadow:");
      expect(prompt).toContain("Typography:");
      expect(prompt).toContain("LAYOUT PATTERNS");
      expect(prompt).toContain("Modern Card");
      expect(prompt).toContain("Responsive Grid");
      expect(prompt).toContain("FINAL VERIFICATION CHECKLIST");
      expect(prompt).toContain("sub-components");
    });

    it("should enforce strict icon import rules in prompt", () => {
      const prompt = buildSystemPrompt("anything");
      expect(prompt).toContain("MUST have a matching import");
      expect(prompt).toContain("Maximum 5 icons per component");
      expect(prompt).toContain('import { Heart, Star, X } from "lucide-react"');
    });

    it("should list reduced icon set (4 categories, not 9)", () => {
      const prompt = buildSystemPrompt("anything");
      // New 4 categories
      expect(prompt).toContain("Core:");
      expect(prompt).toContain("Feedback:");
      expect(prompt).toContain("Actions:");
      expect(prompt).toContain("Objects:");
      // Old categories should be gone
      expect(prompt).not.toContain("Navigation:");
      expect(prompt).not.toContain("Arrows:");
      expect(prompt).not.toContain("Media:");
      expect(prompt).not.toContain("Communication:");
      expect(prompt).not.toContain("Layout:");
      expect(prompt).not.toContain("Data:");
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
      expect(prompt).toContain('import { Howl } from "howler"');
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
      expect(prompt).toContain("variant: default|outline|secondary|ghost|link");
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

    it("should NOT match 'smart-display' to DRAWING or GAME layers (regression)", () => {
      const prompt = buildSystemPrompt("smart-display");
      expect(prompt).not.toContain("DRAWING & CANVAS");
      expect(prompt).not.toContain("GAME DEVELOPMENT");
      // Should get fallback since no layers match
      expect(prompt).toContain("ADDITIONAL CDN LIBRARIES");
    });

    it("should NOT match 'platform' to FORM layer (regression)", () => {
      const prompt = buildSystemPrompt("platform");
      expect(prompt).not.toContain("FORMS & VALIDATION");
    });

    it("should NOT match 'dragon' to DND layer (regression)", () => {
      const prompt = buildSystemPrompt("dragon");
      expect(prompt).not.toContain("DRAG & DROP");
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
      (generateStructuredResponse as any).mockRejectedValueOnce(new Error("AI Error"));

      const result = await generateAppContent(["test", "app"]);

      expect(result.content).toBeNull();
      expect(result.rawCode).toBeNull();
      expect(result.error).toBe("AI Error");
    });

    it("should return error with null rawCode if keys are missing", async () => {
      // Missing code, description, relatedApps
      (generateStructuredResponse as any)
        .mockResolvedValueOnce({
          title: "Test",
        })
        .mockResolvedValueOnce({}); // Correction fails

      const result = await generateAppContent(["test"]);

      expect(result.content).toBeNull();
      expect(result.rawCode).toBeNull();
      expect(result.error).toBeTruthy();
    });

    it("should preserve rawCode when Zod validation fails but code exists", async () => {
      // Has code but missing title and description
      (generateStructuredResponse as any)
        .mockResolvedValueOnce({
          code: "export default function App() { return <div>Partial</div> }",
        })
        .mockResolvedValueOnce({}); // Correction fails

      const result = await generateAppContent(["test"]);

      expect(result.content).toBeNull();
      expect(result.rawCode).toBe("export default function App() { return <div>Partial</div> }");
      expect(result.error).toBeTruthy();
    });

    it("should clean markdown from rawCode even when validation fails", async () => {
      (generateStructuredResponse as any)
        .mockResolvedValueOnce({
          code: "```tsx\nexport default function App() { return <div>Raw</div> }\n```",
        })
        .mockResolvedValueOnce({}); // Correction fails

      const result = await generateAppContent(["test"]);

      expect(result.content).toBeNull();
      expect(result.rawCode).toBe("export default function App() { return <div>Raw</div> }");
      expect(result.error).toBeTruthy();
    });

    it("should extract code from raw text when JSON parsing fails", async () => {
      const rawJson =
        `{"title":"Test","description":"A test","code":"export default function App() { return <div>Hello</div> }","relatedApps":["a/b"]}`;
      (generateStructuredResponse as any)
        .mockRejectedValueOnce(
          new StructuredResponseParseError(
            "Failed to parse structured response: Unterminated string",
            rawJson,
          ),
        )
        // Correction also fails
        .mockRejectedValueOnce(new Error("Correction failed"));

      const result = await generateAppContent(["test"]);

      expect(result.content).toBeNull();
      expect(result.rawCode).toBe("export default function App() { return <div>Hello</div> }");
      expect(result.error).toContain("Failed to parse structured response");
    });

    it("should return null rawCode when StructuredResponseParseError has no code field", async () => {
      const rawJson = `{"title":"Test","description":"A broken response with no code field`;
      (generateStructuredResponse as any).mockRejectedValueOnce(
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

  describe("extractCodeFromRawText and cleanCode", () => {
    it("should extract code from well-formed JSON text", () => {
      const raw =
        `{"title":"Test","code":"export default function App() { return <div>Hi</div> }","relatedApps":["a"]}`;
      expect(extractCodeFromRawText(raw)).toBe(
        "export default function App() { return <div>Hi</div> }",
      );
    });

    it("should prune unused lucide-react icons", () => {
      const raw =
        `{"code":"import { Plus, X, Search } from 'lucide-react';\\nexport default function App() { return <Plus /> }"}`;
      const result = extractCodeFromRawText(raw);
      expect(result).toContain('import { Plus } from "lucide-react";');
      expect(result).not.toContain("X");
      expect(result).not.toContain("Search");
    });

    it("should remove entire lucide-react import if no icons are used", () => {
      const raw =
        `{"code":"import { Plus } from 'lucide-react';\\nexport default function App() { return <div /> }"}`;
      const result = extractCodeFromRawText(raw);
      expect(result).not.toContain("lucide-react");
      expect(result).not.toContain("Plus");
    });

    it("should preserve multiple icons if they are used", () => {
      const raw =
        `{"code":"import { Plus, X } from 'lucide-react';\\nexport default function App() { return <div><Plus /><X /></div> }"}`;
      const result = extractCodeFromRawText(raw);
      expect(result).toContain('import { Plus, X } from "lucide-react";');
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

  describe("LUCIDE_ICONS constant", () => {
    it("should contain common icons", () => {
      expect(LUCIDE_ICONS.has("Plus")).toBe(true);
      expect(LUCIDE_ICONS.has("X")).toBe(true);
      expect(LUCIDE_ICONS.has("ChevronDown")).toBe(true);
      expect(LUCIDE_ICONS.has("Heart")).toBe(true);
    });

    it("should not contain non-icon names", () => {
      expect(LUCIDE_ICONS.has("Button")).toBe(false);
      expect(LUCIDE_ICONS.has("Card")).toBe(false);
      expect(LUCIDE_ICONS.has("Dialog")).toBe(false);
    });

    it("should have reduced icon count (55 or fewer)", () => {
      expect(LUCIDE_ICONS.size).toBeLessThanOrEqual(60);
      expect(LUCIDE_ICONS.size).toBeGreaterThan(40);
    });
  });

  describe("addMissingIconImports (via cleanCode pipeline)", () => {
    it("should add missing icon imports when icon is used in JSX but not imported", () => {
      const raw =
        `{"code":"import React from 'react';\\nexport default function App() { return <Plus /> }"}`;
      const result = extractCodeFromRawText(raw);
      expect(result).toContain('import { Plus } from "lucide-react";');
      expect(result).toContain("<Plus />");
    });

    it("should merge missing icons into existing lucide-react import", () => {
      const raw =
        `{"code":"import { X } from 'lucide-react';\\nexport default function App() { return <div><X /><Plus /><Heart /></div> }"}`;
      const result = extractCodeFromRawText(raw);
      expect(result).toContain("X");
      expect(result).toContain("Heart");
      expect(result).toContain("Plus");
      expect(result).toContain("lucide-react");
    });

    it("should NOT add non-lucide components to import", () => {
      const raw =
        `{"code":"import { Button } from '@/components/ui/button';\\nexport default function App() { return <Button>Hi</Button> }"}`;
      const result = extractCodeFromRawText(raw);
      expect(result).not.toContain("lucide-react");
    });

    it("should handle code with no imports at all", () => {
      const raw = `{"code":"export default function App() { return <div><Star /><Moon /></div> }"}`;
      const result = extractCodeFromRawText(raw);
      expect(result).toContain('import { Moon, Star } from "lucide-react";');
    });

    it("should not duplicate icons already imported", () => {
      const raw =
        `{"code":"import { Plus } from 'lucide-react';\\nexport default function App() { return <Plus /> }"}`;
      const result = extractCodeFromRawText(raw);
      // Should have exactly one lucide-react import with Plus
      const matches = result!.match(/lucide-react/g);
      expect(matches).toHaveLength(1);
      expect(result).toContain('import { Plus } from "lucide-react";');
    });
  });

  describe("getMatchedSkills", () => {
    it("should return matched skills for game topics", () => {
      const skills = getMatchedSkills("games/tetris");
      expect(skills.length).toBeGreaterThan(0);
      expect(skills[0]!.categoryLabel).toBe("GAME DEVELOPMENT");
      expect(skills.every((s) => s.id && s.name && s.icon && s.description)).toBe(true);
    });

    it("should return empty array when no skills match", () => {
      const skills = getMatchedSkills("surprise");
      expect(skills).toEqual([]);
    });

    it("should not include promptContent or triggers in results", () => {
      const skills = getMatchedSkills("3d/globe");
      for (const skill of skills) {
        expect(skill).not.toHaveProperty("promptContent");
        expect(skill).not.toHaveProperty("triggers");
      }
    });

    it("should return skills for multiple matched categories", () => {
      const skills = getMatchedSkills("dashboard/analytics");
      const categories = new Set(skills.map((s) => s.categoryLabel));
      expect(categories.has("DATA VISUALIZATION")).toBe(true);
      expect(categories.has("URL PARAMETER SUPPORT")).toBe(true);
    });
  });

  describe("buildUserPrompt - few-shot examples", () => {
    it("should include example JSON responses in user prompt", () => {
      const prompt = buildUserPrompt("games/tetris");
      expect(prompt).toContain("EXAMPLE RESPONSES");
      expect(prompt).toContain("Click Counter");
      expect(prompt).toContain("Quick Tasks");
    });

    it("should include both example code snippets", () => {
      const prompt = buildUserPrompt("tools/timer");
      expect(prompt).toContain("ClickCounter");
      expect(prompt).toContain("QuickTasks");
    });

    it("should include plan field mention in the response format", () => {
      const prompt = buildUserPrompt("games/tetris");
      expect(prompt).toContain('"plan"');
      expect(prompt).toContain("architecture");
    });

    it("should show plan field usage in examples", () => {
      const prompt = buildUserPrompt("anything");
      // Both examples include a plan field
      expect(prompt).toContain('"plan": "useState for count');
      expect(prompt).toContain('"plan": "useState for tasks');
    });
  });

  describe("plan field in schema", () => {
    it("should strip plan field from successful response", async () => {
      const mockResponse = {
        plan: "Use useState for counter, Card for layout",
        title: "Counter",
        description: "A simple counter",
        code: "export default function App() { return <div>Counter</div> }",
        relatedApps: ["test/one"],
      };

      (generateStructuredResponse as any).mockResolvedValue(mockResponse);

      const result = await generateAppContent(["test", "counter"]);

      expect(result.content).toBeDefined();
      expect(result.content!.title).toBe("Counter");
      expect(result.content!.code).toBe(
        "export default function App() { return <div>Counter</div> }",
      );
      // Plan should be stripped from the public content
      expect(result.content).not.toHaveProperty("plan");
      expect(result.error).toBeNull();
    });

    it("should work when plan field is absent", async () => {
      const mockResponse = {
        title: "No Plan",
        description: "App without plan",
        code: "export default function App() { return <div>No plan</div> }",
        relatedApps: ["a/b"],
      };

      (generateStructuredResponse as any).mockResolvedValue(mockResponse);

      const result = await generateAppContent(["test"]);

      expect(result.content).toBeDefined();
      expect(result.content!.title).toBe("No Plan");
      expect(result.content).not.toHaveProperty("plan");
      expect(result.error).toBeNull();
    });
  });

  describe("attemptCodeCorrection", () => {
    it("should return corrected code on successful correction", async () => {
      const mockResponse = {
        code: "export default function App() { return <div>Fixed</div> }",
      };

      (generateStructuredResponse as any).mockResolvedValue(mockResponse);

      const result = await attemptCodeCorrection(
        "export default function App() { return <div>Broken",
        "Unexpected end of input",
        "test/app",
      );

      expect(result).toBe("export default function App() { return <div>Fixed</div> }");
      expect(generateStructuredResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          maxTokens: 16384,
          temperature: 0.2,
          thinkingBudget: 4096,
        }),
      );
    });

    it("should return null when correction API fails", async () => {
      (generateStructuredResponse as any).mockRejectedValue(new Error("API Error"));

      const result = await attemptCodeCorrection(
        "broken code",
        "Some error",
        "test/app",
      );

      expect(result).toBeNull();
    });

    it("should return null when response has no code field", async () => {
      (generateStructuredResponse as any).mockResolvedValue({});

      const result = await attemptCodeCorrection(
        "broken code",
        "Some error",
        "test/app",
      );

      expect(result).toBeNull();
    });

    it("should return null when code field is not a string", async () => {
      (generateStructuredResponse as any).mockResolvedValue({ code: 123 });

      const result = await attemptCodeCorrection(
        "broken code",
        "Some error",
        "test/app",
      );

      expect(result).toBeNull();
    });

    it("should clean corrected code through cleanCode pipeline", async () => {
      const mockResponse = {
        code:
          "```tsx\nimport { Plus } from 'lucide-react';\nexport default function App() { return <div>Fixed</div> }\n```",
      };

      (generateStructuredResponse as any).mockResolvedValue(mockResponse);

      const result = await attemptCodeCorrection(
        "broken code",
        "Some error",
        "test/app",
      );

      // Should strip markdown fences and prune unused Plus import
      expect(result).not.toContain("```");
      expect(result).not.toContain("Plus");
      expect(result).toContain("export default function App()");
    });

    it("should include error and code in correction prompt", async () => {
      const mockResponse = {
        code: "export default function App() { return <div>Fixed</div> }",
      };

      (generateStructuredResponse as any).mockResolvedValue(mockResponse);

      await attemptCodeCorrection(
        "const broken = <div>",
        "Unterminated JSX",
        "test/app",
      );

      expect(generateStructuredResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining("Unterminated JSX"),
        }),
      );
      expect(generateStructuredResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining("const broken = <div>"),
        }),
      );
    });
  });

  describe("retry logic in generateAppContent", () => {
    it("should retry with attemptCodeCorrection when validation fails", async () => {
      // 1. First call returns invalid schema (missing description) but has code
      const invalidResponse = {
        title: "Invalid App",
        // description missing
        code: "export default function App() { return <div>Bad</div> }",
        relatedApps: [],
      };

      // 2. Correction call returns fixed code
      const correctedResponse = {
        code: "export default function App() { return <div>Fixed</div> }",
      };

      (generateStructuredResponse as any)
        .mockResolvedValueOnce(invalidResponse) // Initial generation
        .mockResolvedValueOnce(correctedResponse); // Correction attempt

      const result = await generateAppContent(["test", "retry"]);

      expect(generateStructuredResponse).toHaveBeenCalledTimes(2);
      expect(result.content).toBeDefined();
      expect(result.content!.code).toBe(
        "export default function App() { return <div>Fixed</div> }",
      );
      expect(result.content!.title).toBe("Invalid App"); // Should preserve valid fields
      expect(result.error).toBeNull();
    });

    it("should retry with attemptCodeCorrection when JSON parse fails", async () => {
      // 1. First call throws parse error
      const rawText = `{"code": "export default function App() { return <div>ParseError</div>"`; // Unterminated
      (generateStructuredResponse as any).mockRejectedValueOnce(
        new StructuredResponseParseError("Parse error", rawText),
      );

      // 2. Correction call fixes it
      const correctedResponse = {
        code: "export default function App() { return <div>FixedParse</div> }",
      };
      (generateStructuredResponse as any).mockResolvedValueOnce(correctedResponse);

      const result = await generateAppContent(["test", "parse-retry"]);

      expect(generateStructuredResponse).toHaveBeenCalledTimes(2);
      expect(result.content).toBeDefined();
      expect(result.content!.code).toBe(
        "export default function App() { return <div>FixedParse</div> }",
      );
      expect(result.content!.description).toContain("Automatically corrected");
    });
  });
});
