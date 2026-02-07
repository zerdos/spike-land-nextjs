import { describe, expect, it } from "vitest";
import { extractKeywords, isCompoundMatch, matchesAny } from "./keyword-utils";

describe("keyword-utils", () => {
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

    it("should return empty array for empty input", () => {
      expect(extractKeywords("")).toEqual([]);
    });

    it("should return empty array for only stop words", () => {
      expect(extractKeywords("the-and-or")).toEqual([]);
    });
  });

  describe("isCompoundMatch", () => {
    it("should match when keyword starts with a 5+ char trigger", () => {
      expect(isCompoundMatch("charting", "chart")).toBe(true);
      expect(isCompoundMatch("musical", "music")).toBe(true);
      expect(isCompoundMatch("soundtrack", "sound")).toBe(true);
    });

    it("should NOT match for triggers shorter than 5 chars", () => {
      expect(isCompoundMatch("gameplay", "game")).toBe(false);
      expect(isCompoundMatch("sorting", "sort")).toBe(false);
      expect(isCompoundMatch("drawing", "draw")).toBe(false);
      expect(isCompoundMatch("artful", "art")).toBe(false);
    });

    it("should NOT match when keyword does not start with trigger", () => {
      expect(isCompoundMatch("smart", "chart")).toBe(false);
    });
  });

  describe("matchesAny", () => {
    it("should match exact keywords", () => {
      expect(matchesAny(["tictactoe"], ["game", "tictactoe"])).toBe(true);
      expect(matchesAny(["3d"], ["three", "3d"])).toBe(true);
    });

    it("should match prefix compound for 5+ char triggers", () => {
      expect(matchesAny(["charting"], ["chart"])).toBe(true);
    });

    it("should NOT match false positives", () => {
      expect(matchesAny(["smart"], ["art"])).toBe(false);
      expect(matchesAny(["platform"], ["form"])).toBe(false);
    });

    it("should return false when no match", () => {
      expect(matchesAny(["cooking", "pasta"], ["game", "play"])).toBe(false);
    });

    it("should handle empty arrays", () => {
      expect(matchesAny([], ["game"])).toBe(false);
      expect(matchesAny(["game"], [])).toBe(false);
      expect(matchesAny([], [])).toBe(false);
    });
  });
});
