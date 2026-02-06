import { generateStructuredResponse } from "@/lib/ai/gemini-client";
import { describe, expect, it, vi } from "vitest";
import { buildUserPrompt, generateAppContent, SYSTEM_PROMPT } from "./content-generator";

vi.mock("@/lib/ai/gemini-client");
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

      expect(result).toEqual(mockResponse);
      expect(generateStructuredResponse).toHaveBeenCalledWith(expect.objectContaining({
        prompt: expect.stringContaining('"/create/test/app"'),
        systemPrompt: SYSTEM_PROMPT,
        maxTokens: 16384,
        temperature: 0.5,
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

      expect(result?.code).toBe("export default function App() { return <div>Test</div> }");
    });

    it("should return null on error", async () => {
      (generateStructuredResponse as any).mockRejectedValue(new Error("AI Error"));

      const result = await generateAppContent(["test", "app"]);

      expect(result).toBeNull();
    });

    it("should return null if keys are missing", async () => {
      // Missing code
      (generateStructuredResponse as any).mockResolvedValue({
        title: "Test",
      });

      const result = await generateAppContent(["test"]);

      expect(result).toBeNull();
    });
  });
});
