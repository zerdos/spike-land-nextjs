/**
 * Orbit module constants
 */

/**
 * localStorage key for persisting the last selected workspace slug.
 * Used to restore the user's workspace selection across sessions.
 */
export const ORBIT_STORAGE_KEY = "orbit-last-workspace-slug";

/**
 * Get the first N graphemes (user-perceived characters) from a string.
 * Handles Unicode correctly, including emojis and surrogate pairs.
 *
 * @param str - Input string
 * @param count - Number of graphemes to extract
 * @returns First N graphemes as a string
 *
 * @example
 * ```ts
 * getGraphemes("Hello", 2) // "He"
 * getGraphemes("👨‍👩‍👧", 1) // "👨‍👩‍👧"
 * getGraphemes("🇺🇸", 1) // "🇺🇸"
 * ```
 */
export function getGraphemes(str: string, count: number): string {
  // Use Intl.Segmenter for proper grapheme cluster handling
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter(undefined, {
      granularity: "grapheme",
    });
    const segments = Array.from(segmenter.segment(str));
    return segments
      .slice(0, count)
      .map((s) => s.segment)
      .join("");
  }

  // Fallback: use Array.from for basic Unicode support (handles surrogate pairs but not complex graphemes)
  return Array.from(str).slice(0, count).join("");
}
