import type { DiffHunk } from "@/lib/validations/brand-rewrite";
import { describe, expect, it } from "vitest";
import {
  applySelectedChanges,
  countChanges,
  countSelectedChanges,
  deselectAllChanges,
  previewResult,
  selectAllChanges,
  toggleHunkSelection,
} from "./apply-selected-changes";

describe("apply-selected-changes", () => {
  describe("applySelectedChanges", () => {
    it("should include all unchanged hunks in result", () => {
      const hunks: DiffHunk[] = [
        { id: "1", type: "unchanged", value: "Hello ", selected: false },
        { id: "2", type: "unchanged", value: "World", selected: false },
      ];

      const result = applySelectedChanges(hunks);

      expect(result).toBe("Hello World");
    });

    it("should include added hunks only if selected", () => {
      const hunks: DiffHunk[] = [
        { id: "1", type: "unchanged", value: "Hello ", selected: false },
        { id: "2", type: "added", value: "beautiful ", selected: true },
        { id: "3", type: "unchanged", value: "World", selected: false },
      ];

      const result = applySelectedChanges(hunks);

      expect(result).toBe("Hello beautiful World");
    });

    it("should exclude added hunks if not selected", () => {
      const hunks: DiffHunk[] = [
        { id: "1", type: "unchanged", value: "Hello ", selected: false },
        { id: "2", type: "added", value: "beautiful ", selected: false },
        { id: "3", type: "unchanged", value: "World", selected: false },
      ];

      const result = applySelectedChanges(hunks);

      expect(result).toBe("Hello World");
    });

    it("should exclude removed hunks if selected (apply removal)", () => {
      const hunks: DiffHunk[] = [
        { id: "1", type: "unchanged", value: "Hello ", selected: false },
        { id: "2", type: "removed", value: "cruel ", selected: true },
        { id: "3", type: "unchanged", value: "World", selected: false },
      ];

      const result = applySelectedChanges(hunks);

      expect(result).toBe("Hello World");
    });

    it("should include removed hunks if not selected (keep original)", () => {
      const hunks: DiffHunk[] = [
        { id: "1", type: "unchanged", value: "Hello ", selected: false },
        { id: "2", type: "removed", value: "cruel ", selected: false },
        { id: "3", type: "unchanged", value: "World", selected: false },
      ];

      const result = applySelectedChanges(hunks);

      expect(result).toBe("Hello cruel World");
    });

    it("should handle complex mixed scenarios", () => {
      const hunks: DiffHunk[] = [
        { id: "1", type: "unchanged", value: "The ", selected: false },
        { id: "2", type: "removed", value: "quick ", selected: true }, // Remove "quick "
        { id: "3", type: "added", value: "fast ", selected: true }, // Add "fast "
        { id: "4", type: "unchanged", value: "fox", selected: false },
      ];

      const result = applySelectedChanges(hunks);

      expect(result).toBe("The fast fox");
    });

    it("should handle empty hunks array", () => {
      const result = applySelectedChanges([]);

      expect(result).toBe("");
    });

    it("should handle partial change acceptance", () => {
      const hunks: DiffHunk[] = [
        { id: "1", type: "unchanged", value: "Hello ", selected: false },
        { id: "2", type: "removed", value: "old ", selected: false }, // Keep "old "
        { id: "3", type: "added", value: "new ", selected: false }, // Don't add "new "
        { id: "4", type: "unchanged", value: "World", selected: false },
      ];

      const result = applySelectedChanges(hunks);

      expect(result).toBe("Hello old World");
    });

    it("should reconstruct original when no changes selected", () => {
      const hunks: DiffHunk[] = [
        { id: "1", type: "unchanged", value: "Hello ", selected: false },
        { id: "2", type: "removed", value: "World", selected: false },
        { id: "3", type: "added", value: "Universe", selected: false },
      ];

      const result = applySelectedChanges(hunks);

      expect(result).toBe("Hello World");
    });

    it("should reconstruct rewritten when all changes selected", () => {
      const hunks: DiffHunk[] = [
        { id: "1", type: "unchanged", value: "Hello ", selected: true },
        { id: "2", type: "removed", value: "World", selected: true },
        { id: "3", type: "added", value: "Universe", selected: true },
      ];

      const result = applySelectedChanges(hunks);

      expect(result).toBe("Hello Universe");
    });
  });

  describe("countChanges", () => {
    it("should count added and removed hunks", () => {
      const hunks: DiffHunk[] = [
        { id: "1", type: "unchanged", value: "a", selected: false },
        { id: "2", type: "added", value: "b", selected: true },
        { id: "3", type: "removed", value: "c", selected: true },
        { id: "4", type: "added", value: "d", selected: false },
        { id: "5", type: "unchanged", value: "e", selected: false },
        { id: "6", type: "removed", value: "f", selected: false },
      ];

      const result = countChanges(hunks);

      expect(result).toEqual({
        added: 2,
        removed: 2,
        total: 4,
      });
    });

    it("should return zeros for empty array", () => {
      const result = countChanges([]);

      expect(result).toEqual({
        added: 0,
        removed: 0,
        total: 0,
      });
    });

    it("should return zeros when only unchanged hunks", () => {
      const hunks: DiffHunk[] = [
        { id: "1", type: "unchanged", value: "a", selected: false },
        { id: "2", type: "unchanged", value: "b", selected: false },
      ];

      const result = countChanges(hunks);

      expect(result).toEqual({
        added: 0,
        removed: 0,
        total: 0,
      });
    });

    it("should count only added hunks when no removed", () => {
      const hunks: DiffHunk[] = [
        { id: "1", type: "added", value: "a", selected: true },
        { id: "2", type: "added", value: "b", selected: true },
        { id: "3", type: "unchanged", value: "c", selected: false },
      ];

      const result = countChanges(hunks);

      expect(result).toEqual({
        added: 2,
        removed: 0,
        total: 2,
      });
    });

    it("should count only removed hunks when no added", () => {
      const hunks: DiffHunk[] = [
        { id: "1", type: "removed", value: "a", selected: true },
        { id: "2", type: "removed", value: "b", selected: true },
        { id: "3", type: "unchanged", value: "c", selected: false },
      ];

      const result = countChanges(hunks);

      expect(result).toEqual({
        added: 0,
        removed: 2,
        total: 2,
      });
    });
  });

  describe("countSelectedChanges", () => {
    it("should count only selected changes", () => {
      const hunks: DiffHunk[] = [
        { id: "1", type: "added", value: "a", selected: true },
        { id: "2", type: "added", value: "b", selected: false },
        { id: "3", type: "removed", value: "c", selected: true },
        { id: "4", type: "removed", value: "d", selected: false },
        { id: "5", type: "unchanged", value: "e", selected: true }, // Unchanged don't count
      ];

      const result = countSelectedChanges(hunks);

      expect(result).toEqual({
        selectedAdded: 1,
        selectedRemoved: 1,
        totalSelected: 2,
      });
    });

    it("should return zeros for empty array", () => {
      const result = countSelectedChanges([]);

      expect(result).toEqual({
        selectedAdded: 0,
        selectedRemoved: 0,
        totalSelected: 0,
      });
    });

    it("should return zeros when nothing selected", () => {
      const hunks: DiffHunk[] = [
        { id: "1", type: "added", value: "a", selected: false },
        { id: "2", type: "removed", value: "b", selected: false },
      ];

      const result = countSelectedChanges(hunks);

      expect(result).toEqual({
        selectedAdded: 0,
        selectedRemoved: 0,
        totalSelected: 0,
      });
    });

    it("should count all when all changes selected", () => {
      const hunks: DiffHunk[] = [
        { id: "1", type: "added", value: "a", selected: true },
        { id: "2", type: "added", value: "b", selected: true },
        { id: "3", type: "removed", value: "c", selected: true },
      ];

      const result = countSelectedChanges(hunks);

      expect(result).toEqual({
        selectedAdded: 2,
        selectedRemoved: 1,
        totalSelected: 3,
      });
    });
  });

  describe("toggleHunkSelection", () => {
    it("should toggle selected hunk to unselected", () => {
      const hunks: DiffHunk[] = [
        { id: "1", type: "added", value: "a", selected: true },
        { id: "2", type: "added", value: "b", selected: false },
      ];

      const result = toggleHunkSelection(hunks, "1");

      expect(result[0]!.selected).toBe(false);
      expect(result[1]!.selected).toBe(false);
    });

    it("should toggle unselected hunk to selected", () => {
      const hunks: DiffHunk[] = [
        { id: "1", type: "added", value: "a", selected: false },
        { id: "2", type: "added", value: "b", selected: true },
      ];

      const result = toggleHunkSelection(hunks, "1");

      expect(result[0]!.selected).toBe(true);
      expect(result[1]!.selected).toBe(true);
    });

    it("should not modify other hunks", () => {
      const hunks: DiffHunk[] = [
        { id: "1", type: "added", value: "a", selected: true },
        { id: "2", type: "removed", value: "b", selected: false },
        { id: "3", type: "unchanged", value: "c", selected: false },
      ];

      const result = toggleHunkSelection(hunks, "1");

      expect(result[1]!.selected).toBe(false);
      expect(result[2]!.selected).toBe(false);
    });

    it("should return new array without mutating original", () => {
      const hunks: DiffHunk[] = [
        { id: "1", type: "added", value: "a", selected: true },
      ];

      const result = toggleHunkSelection(hunks, "1");

      expect(result).not.toBe(hunks);
      expect(hunks[0]!.selected).toBe(true); // Original unchanged
      expect(result[0]!.selected).toBe(false); // New value
    });

    it("should handle non-existent hunk ID", () => {
      const hunks: DiffHunk[] = [
        { id: "1", type: "added", value: "a", selected: true },
      ];

      const result = toggleHunkSelection(hunks, "non-existent");

      expect(result[0]!.selected).toBe(true);
    });

    it("should handle empty array", () => {
      const result = toggleHunkSelection([], "1");

      expect(result).toEqual([]);
    });
  });

  describe("selectAllChanges", () => {
    it("should select all added and removed hunks", () => {
      const hunks: DiffHunk[] = [
        { id: "1", type: "added", value: "a", selected: false },
        { id: "2", type: "removed", value: "b", selected: false },
        { id: "3", type: "unchanged", value: "c", selected: false },
      ];

      const result = selectAllChanges(hunks);

      expect(result[0]!.selected).toBe(true);
      expect(result[1]!.selected).toBe(true);
      expect(result[2]!.selected).toBe(false); // Unchanged stays false
    });

    it("should not modify unchanged hunks", () => {
      const hunks: DiffHunk[] = [
        { id: "1", type: "unchanged", value: "a", selected: false },
        { id: "2", type: "unchanged", value: "b", selected: true },
      ];

      const result = selectAllChanges(hunks);

      expect(result[0]!.selected).toBe(false);
      expect(result[1]!.selected).toBe(true);
    });

    it("should return new array without mutating original", () => {
      const hunks: DiffHunk[] = [
        { id: "1", type: "added", value: "a", selected: false },
      ];

      const result = selectAllChanges(hunks);

      expect(result).not.toBe(hunks);
      expect(hunks[0]!.selected).toBe(false);
      expect(result[0]!.selected).toBe(true);
    });

    it("should handle empty array", () => {
      const result = selectAllChanges([]);

      expect(result).toEqual([]);
    });

    it("should work when already all selected", () => {
      const hunks: DiffHunk[] = [
        { id: "1", type: "added", value: "a", selected: true },
        { id: "2", type: "removed", value: "b", selected: true },
      ];

      const result = selectAllChanges(hunks);

      expect(result[0]!.selected).toBe(true);
      expect(result[1]!.selected).toBe(true);
    });
  });

  describe("deselectAllChanges", () => {
    it("should deselect all added and removed hunks", () => {
      const hunks: DiffHunk[] = [
        { id: "1", type: "added", value: "a", selected: true },
        { id: "2", type: "removed", value: "b", selected: true },
        { id: "3", type: "unchanged", value: "c", selected: true },
      ];

      const result = deselectAllChanges(hunks);

      expect(result[0]!.selected).toBe(false);
      expect(result[1]!.selected).toBe(false);
      expect(result[2]!.selected).toBe(true); // Unchanged keeps value
    });

    it("should not modify unchanged hunks", () => {
      const hunks: DiffHunk[] = [
        { id: "1", type: "unchanged", value: "a", selected: true },
        { id: "2", type: "unchanged", value: "b", selected: false },
      ];

      const result = deselectAllChanges(hunks);

      expect(result[0]!.selected).toBe(true);
      expect(result[1]!.selected).toBe(false);
    });

    it("should return new array without mutating original", () => {
      const hunks: DiffHunk[] = [
        { id: "1", type: "added", value: "a", selected: true },
      ];

      const result = deselectAllChanges(hunks);

      expect(result).not.toBe(hunks);
      expect(hunks[0]!.selected).toBe(true);
      expect(result[0]!.selected).toBe(false);
    });

    it("should handle empty array", () => {
      const result = deselectAllChanges([]);

      expect(result).toEqual([]);
    });

    it("should work when already all deselected", () => {
      const hunks: DiffHunk[] = [
        { id: "1", type: "added", value: "a", selected: false },
        { id: "2", type: "removed", value: "b", selected: false },
      ];

      const result = deselectAllChanges(hunks);

      expect(result[0]!.selected).toBe(false);
      expect(result[1]!.selected).toBe(false);
    });
  });

  describe("previewResult", () => {
    it("should return text and character count", () => {
      const hunks: DiffHunk[] = [
        { id: "1", type: "unchanged", value: "Hello ", selected: false },
        { id: "2", type: "added", value: "beautiful ", selected: true },
        { id: "3", type: "unchanged", value: "World", selected: false },
      ];

      const result = previewResult(hunks);

      expect(result.text).toBe("Hello beautiful World");
      expect(result.characterCount).toBe(21);
    });

    it("should handle empty result", () => {
      const hunks: DiffHunk[] = [
        { id: "1", type: "removed", value: "Hello", selected: true },
      ];

      const result = previewResult(hunks);

      expect(result.text).toBe("");
      expect(result.characterCount).toBe(0);
    });

    it("should calculate correct length for unicode", () => {
      const hunks: DiffHunk[] = [
        { id: "1", type: "unchanged", value: "Hello ", selected: false },
        { id: "2", type: "added", value: "\u{1F600}", selected: true }, // Emoji
      ];

      const result = previewResult(hunks);

      expect(result.text).toBe("Hello \u{1F600}");
      expect(result.characterCount).toBe(8); // 6 + 2 (emoji is 2 chars in JS)
    });

    it("should handle empty array", () => {
      const result = previewResult([]);

      expect(result.text).toBe("");
      expect(result.characterCount).toBe(0);
    });

    it("should accurately count whitespace", () => {
      const hunks: DiffHunk[] = [
        { id: "1", type: "unchanged", value: "  spaces  ", selected: false },
      ];

      const result = previewResult(hunks);

      expect(result.characterCount).toBe(10);
    });
  });
});
