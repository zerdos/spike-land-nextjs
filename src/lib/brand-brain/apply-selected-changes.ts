import type { DiffHunk } from "@/lib/validations/brand-rewrite";

/**
 * Apply selected changes from diff hunks to reconstruct the final text.
 *
 * Logic:
 * - "unchanged" hunks are always included in the result
 * - "added" hunks are included only if selected
 * - "removed" hunks are included in the result only if NOT selected
 *   (i.e., if the user wants to keep the original text)
 *
 * @param hunks - Array of diff hunks with selection state
 * @returns The reconstructed text based on selections
 */
export function applySelectedChanges(hunks: DiffHunk[]): string {
  let result = "";

  for (const hunk of hunks) {
    switch (hunk.type) {
      case "unchanged":
        // Unchanged parts are always included
        result += hunk.value;
        break;

      case "added":
        // Added parts are included only if selected
        if (hunk.selected) {
          result += hunk.value;
        }
        break;

      case "removed":
        // Removed parts are included (kept) only if NOT selected
        // This means: if user doesn't want this removal, keep the original text
        if (!hunk.selected) {
          result += hunk.value;
        }
        break;
    }
  }

  return result;
}

/**
 * Count the number of changes (additions + removals) in the hunks.
 *
 * @param hunks - Array of diff hunks
 * @returns Object with counts of added and removed hunks
 */
export function countChanges(hunks: DiffHunk[]): {
  added: number;
  removed: number;
  total: number;
} {
  let added = 0;
  let removed = 0;

  for (const hunk of hunks) {
    if (hunk.type === "added") added++;
    if (hunk.type === "removed") removed++;
  }

  return {
    added,
    removed,
    total: added + removed,
  };
}

/**
 * Count selected changes in the hunks.
 *
 * @param hunks - Array of diff hunks
 * @returns Object with counts of selected added and removed hunks
 */
export function countSelectedChanges(hunks: DiffHunk[]): {
  selectedAdded: number;
  selectedRemoved: number;
  totalSelected: number;
} {
  let selectedAdded = 0;
  let selectedRemoved = 0;

  for (const hunk of hunks) {
    if (hunk.type === "added" && hunk.selected) selectedAdded++;
    if (hunk.type === "removed" && hunk.selected) selectedRemoved++;
  }

  return {
    selectedAdded,
    selectedRemoved,
    totalSelected: selectedAdded + selectedRemoved,
  };
}

/**
 * Toggle selection state of a specific hunk.
 *
 * @param hunks - Array of diff hunks
 * @param hunkId - ID of the hunk to toggle
 * @returns New array with the hunk's selection toggled
 */
export function toggleHunkSelection(
  hunks: DiffHunk[],
  hunkId: string,
): DiffHunk[] {
  return hunks.map((hunk) => hunk.id === hunkId ? { ...hunk, selected: !hunk.selected } : hunk);
}

/**
 * Select all change hunks (added and removed).
 *
 * @param hunks - Array of diff hunks
 * @returns New array with all change hunks selected
 */
export function selectAllChanges(hunks: DiffHunk[]): DiffHunk[] {
  return hunks.map((hunk) => hunk.type === "unchanged" ? hunk : { ...hunk, selected: true });
}

/**
 * Deselect all change hunks (added and removed).
 *
 * @param hunks - Array of diff hunks
 * @returns New array with all change hunks deselected
 */
export function deselectAllChanges(hunks: DiffHunk[]): DiffHunk[] {
  return hunks.map((hunk) => hunk.type === "unchanged" ? hunk : { ...hunk, selected: false });
}

/**
 * Preview the result of applying current selections.
 *
 * @param hunks - Array of diff hunks with selection state
 * @returns Preview of the final text
 */
export function previewResult(hunks: DiffHunk[]): {
  text: string;
  characterCount: number;
} {
  const text = applySelectedChanges(hunks);
  return {
    text,
    characterCount: text.length,
  };
}
