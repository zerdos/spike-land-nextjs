/**
 * Constant-time string comparison to prevent timing attacks.
 * Safe for use in both Node.js and Edge runtimes.
 *
 * This implementation avoids early returns on length mismatch and iterates
 * through the maximum length of the two strings to minimize timing side-channels.
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns true if strings are equal, false otherwise
 */
export function secureCompare(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);

  const maxLen = Math.max(aBytes.length, bBytes.length);

  // Include length difference in result to avoid early return on mismatch
  let result = aBytes.length ^ bBytes.length;

  for (let i = 0; i < maxLen; i++) {
    // Use logical OR to accumulate differences
    // Accessing out of bounds returns undefined, so we default to 0
    result |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }

  return result === 0;
}
