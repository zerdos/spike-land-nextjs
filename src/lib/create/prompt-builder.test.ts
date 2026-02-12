import { describe, expect, it } from "vitest";
import {
  AGENT_IDENTITY,
  buildFullSystemPrompt,
  buildSystemPrompt,
  buildUserPrompt,
  extractKeywords,
  getMatchedSkills,
  LUCIDE_ICONS,
  matchesAny,
  OUTPUT_SPEC,
  SYSTEM_PROMPT,
} from "./prompt-builder";

describe("prompt-builder", () => {
  describe("AGENT_IDENTITY", () => {
    it("should be a non-empty string mentioning spike.land", () => {
      expect(typeof AGENT_IDENTITY).toBe("string");
      expect(AGENT_IDENTITY).toContain("spike.land");
      expect(AGENT_IDENTITY).toContain("expert React developer");
    });
  });

  describe("OUTPUT_SPEC", () => {
    it("should describe JSON output format", () => {
      expect(typeof OUTPUT_SPEC).toBe("string");
      expect(OUTPUT_SPEC).toContain("## OUTPUT FORMAT");
      expect(OUTPUT_SPEC).toContain('"title"');
      expect(OUTPUT_SPEC).toContain('"code"');
      expect(OUTPUT_SPEC).toContain('"relatedApps"');
      expect(OUTPUT_SPEC).toContain("CRITICAL RULES");
    });
  });

  describe("LUCIDE_ICONS", () => {
    it("should contain core icons", () => {
      expect(LUCIDE_ICONS.has("Plus")).toBe(true);
      expect(LUCIDE_ICONS.has("X")).toBe(true);
      expect(LUCIDE_ICONS.has("Heart")).toBe(true);
      expect(LUCIDE_ICONS.has("ChevronDown")).toBe(true);
    });

    it("should not contain non-icon names", () => {
      expect(LUCIDE_ICONS.has("Button")).toBe(false);
      expect(LUCIDE_ICONS.has("Card")).toBe(false);
    });
  });

  describe("extractKeywords / matchesAny (re-exports)", () => {
    it("should split and lowercase topic keywords", () => {
      expect(extractKeywords("games/tic-tac-toe")).toEqual(["games", "tic", "tac", "toe"]);
    });

    it("should match exact keywords", () => {
      expect(matchesAny(["3d"], ["three", "3d"])).toBe(true);
    });
  });

  describe("getMatchedSkills", () => {
    it("should return game skills for game topics", () => {
      const skills = getMatchedSkills("games/tetris");
      expect(skills.length).toBeGreaterThan(0);
      expect(skills[0]!.categoryLabel).toBe("GAME DEVELOPMENT");
    });

    it("should return 3D skills for 3D topics", () => {
      const skills = getMatchedSkills("3d/globe");
      expect(skills.length).toBeGreaterThan(0);
      expect(skills.some((s) => s.category === "3d")).toBe(true);
    });

    it("should return multiple categories for dashboard/analytics", () => {
      const skills = getMatchedSkills("dashboard/analytics");
      const categories = new Set(skills.map((s) => s.category));
      expect(categories.has("data-viz")).toBe(true);
      expect(categories.has("url-params")).toBe(true);
    });

    it("should return empty array when no skills match", () => {
      expect(getMatchedSkills("surprise")).toEqual([]);
    });

    it("should not expose internal fields like triggers or promptContent", () => {
      const skills = getMatchedSkills("3d/globe");
      for (const skill of skills) {
        expect(skill).not.toHaveProperty("promptContent");
        expect(skill).not.toHaveProperty("triggers");
      }
    });
  });

  describe("buildSystemPrompt", () => {
    it("should always include core components", () => {
      const prompt = buildSystemPrompt("anything");
      expect(prompt).toContain("@/components/ui/button");
      expect(prompt).toContain("@/components/ui/card");
      expect(prompt).toContain("framer-motion");
      expect(prompt).toContain("lucide-react");
    });

    it("should include skill layers for matching topics", () => {
      const prompt = buildSystemPrompt("3d/globe");
      expect(prompt).toContain("3D RENDERING");
      expect(prompt).toContain("OrbitControls");
    });

    it("should include fallback libraries when no skills match", () => {
      const prompt = buildSystemPrompt("surprise");
      expect(prompt).toContain("ADDITIONAL CDN LIBRARIES");
    });

    it("should not include fallback when skills match", () => {
      const prompt = buildSystemPrompt("games/tetris");
      expect(prompt).not.toContain("ADDITIONAL CDN LIBRARIES");
    });
  });

  describe("SYSTEM_PROMPT", () => {
    it("should be the result of buildSystemPrompt('general')", () => {
      expect(typeof SYSTEM_PROMPT).toBe("string");
      expect(SYSTEM_PROMPT).toContain("@/components/ui/button");
      expect(SYSTEM_PROMPT).toContain("ADDITIONAL CDN LIBRARIES");
    });
  });

  describe("buildUserPrompt", () => {
    it("should include the topic", () => {
      const prompt = buildUserPrompt("games/tetris");
      expect(prompt).toContain('"/create/games/tetris"');
    });

    it("should include example JSON responses", () => {
      const prompt = buildUserPrompt("anything");
      expect(prompt).toContain("EXAMPLE RESPONSES");
      expect(prompt).toContain("Click Counter");
      expect(prompt).toContain("Quick Tasks");
    });

    it("should include URL param instruction for dashboard topics", () => {
      const prompt = buildUserPrompt("tools/dashboard");
      expect(prompt).toContain("URL search params");
      expect(prompt).toContain("replaceState");
    });

    it("should NOT include URL param instruction for non-dashboard topics", () => {
      const prompt = buildUserPrompt("games/tetris");
      expect(prompt).not.toContain("URL search params");
    });
  });

  describe("buildFullSystemPrompt", () => {
    it("should combine AGENT_IDENTITY + buildSystemPrompt + OUTPUT_SPEC", () => {
      const full = buildFullSystemPrompt("games/tetris");
      expect(full).toContain(AGENT_IDENTITY);
      expect(full).toContain(OUTPUT_SPEC);
      expect(full).toContain("GAME DEVELOPMENT");
    });

    it("should include identity at the start", () => {
      const full = buildFullSystemPrompt("tools/timer");
      expect(full.startsWith(AGENT_IDENTITY)).toBe(true);
    });

    it("should include output spec at the end", () => {
      const full = buildFullSystemPrompt("tools/timer");
      expect(full.endsWith(OUTPUT_SPEC)).toBe(true);
    });

    it("should include core prompt content in the middle", () => {
      const full = buildFullSystemPrompt("anything");
      expect(full).toContain("@/components/ui/button");
      expect(full).toContain("CODE QUALITY RULES");
      expect(full).toContain("FINAL VERIFICATION CHECKLIST");
    });
  });
});
