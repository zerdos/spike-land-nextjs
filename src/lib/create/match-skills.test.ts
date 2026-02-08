import { describe, expect, it } from "vitest";
import { getMatchedSkills } from "./match-skills";

describe("match-skills", () => {
  describe("getMatchedSkills", () => {
    it("should return empty array for empty query", () => {
      expect(getMatchedSkills("")).toEqual([]);
    });

    it("should return empty array when no skills match", () => {
      expect(getMatchedSkills("cooking pasta")).toEqual([]);
    });

    it("should match 3D skills for 3D topics", () => {
      const skills = getMatchedSkills("3d/globe");
      const ids = skills.map((s) => s.id);
      expect(ids).toContain("three-js");
      expect(ids).toContain("three-perf");
      expect(skills[0]!.category).toBe("3D");
    });

    it("should match game skills for game topics", () => {
      const skills = getMatchedSkills("games/tetris");
      const ids = skills.map((s) => s.id);
      expect(ids).toContain("canvas-confetti");
      expect(ids).toContain("howler-game");
    });

    it("should match audio skills for music topics", () => {
      const skills = getMatchedSkills("music/piano");
      const ids = skills.map((s) => s.id);
      expect(ids).toContain("howler");
      expect(ids).toContain("web-audio");
    });

    it("should match data viz skills for chart topics", () => {
      const skills = getMatchedSkills("finance/stock-chart");
      const ids = skills.map((s) => s.id);
      expect(ids).toContain("recharts");
      expect(ids).toContain("chart-ui");
    });

    it("should match form skills for calculator topics", () => {
      const skills = getMatchedSkills("tools/calculator");
      const ids = skills.map((s) => s.id);
      expect(ids).toContain("react-hook-form");
      expect(ids).toContain("form-ui");
    });

    it("should match DnD skills for kanban topics", () => {
      const skills = getMatchedSkills("tools/kanban-board");
      const ids = skills.map((s) => s.id);
      expect(ids).toContain("dnd-kit");
    });

    it("should match drawing skills for whiteboard topics", () => {
      const skills = getMatchedSkills("tools/whiteboard");
      const ids = skills.map((s) => s.id);
      expect(ids).toContain("roughjs");
    });

    it("should match content skills for blog topics", () => {
      const skills = getMatchedSkills("writing/blog");
      const ids = skills.map((s) => s.id);
      expect(ids).toContain("react-markdown");
      expect(ids).toContain("content-ui");
    });

    it("should match URL params skills for dashboard topics", () => {
      const skills = getMatchedSkills("tools/dashboard");
      const ids = skills.map((s) => s.id);
      expect(ids).toContain("url-params");
    });

    it("should match multiple categories for multi-trigger topics", () => {
      const skills = getMatchedSkills("dashboard/analytics");
      const categories = new Set(skills.map((s) => s.category));
      expect(categories.has("Data Viz")).toBe(true);
      expect(categories.has("URL Params")).toBe(true);
    });

    it("should not duplicate skills", () => {
      const skills = getMatchedSkills("3d/globe");
      const ids = skills.map((s) => s.id);
      expect(ids.length).toBe(new Set(ids).size);
    });

    it("should have colorClass on all returned skills", () => {
      const skills = getMatchedSkills("games/tetris");
      for (const skill of skills) {
        expect(skill.colorClass).toBeTruthy();
      }
    });
  });
});
