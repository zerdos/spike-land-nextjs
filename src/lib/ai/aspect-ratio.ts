/**
 * Aspect Ratio Utilities for Image Generation
 *
 * Gemini-supported aspect ratios and utilities for detecting
 * the closest matching ratio from image dimensions.
 */

/**
 * Supported aspect ratios by Gemini 2.5 Flash and later models
 */
export const SUPPORTED_ASPECT_RATIOS = [
  "1:1",
  "3:2",
  "2:3",
  "3:4",
  "4:3",
  "4:5",
  "5:4",
  "9:16",
  "16:9",
  "21:9",
] as const;

export type AspectRatio = (typeof SUPPORTED_ASPECT_RATIOS)[number];

/**
 * Numeric values for each aspect ratio (width / height)
 */
const RATIO_VALUES: Record<AspectRatio, number> = {
  "1:1": 1.0,
  "3:2": 1.5,
  "2:3": 2 / 3,
  "3:4": 0.75,
  "4:3": 4 / 3,
  "4:5": 0.8,
  "5:4": 1.25,
  "9:16": 9 / 16,
  "16:9": 16 / 9,
  "21:9": 21 / 9,
};

/**
 * Detect the closest Gemini-supported aspect ratio from image dimensions
 *
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @returns The closest supported aspect ratio
 *
 * @example
 * detectAspectRatio(1920, 1080) // "16:9"
 * detectAspectRatio(1080, 1920) // "9:16"
 * detectAspectRatio(480, 600)   // "4:5"
 * detectAspectRatio(1024, 1024) // "1:1"
 */
export function detectAspectRatio(width: number, height: number): AspectRatio {
  if (width <= 0 || height <= 0) {
    return "1:1"; // Default for invalid dimensions
  }

  const imageRatio = width / height;

  let closestRatio: AspectRatio = "1:1";
  let smallestDiff = Infinity;

  for (const [ratio, value] of Object.entries(RATIO_VALUES)) {
    const diff = Math.abs(imageRatio - value);
    if (diff < smallestDiff) {
      smallestDiff = diff;
      closestRatio = ratio as AspectRatio;
    }
  }

  return closestRatio;
}

/**
 * Validate if a string is a valid Gemini-supported aspect ratio
 *
 * @param ratio - String to validate
 * @returns True if the ratio is supported
 *
 * @example
 * isValidAspectRatio("16:9") // true
 * isValidAspectRatio("5:3")  // false
 */
export function isValidAspectRatio(ratio: string): ratio is AspectRatio {
  return SUPPORTED_ASPECT_RATIOS.includes(ratio as AspectRatio);
}

/**
 * Get the numeric value of an aspect ratio
 *
 * @param ratio - A supported aspect ratio
 * @returns The numeric ratio (width / height)
 */
export function getAspectRatioValue(ratio: AspectRatio): number {
  return RATIO_VALUES[ratio];
}
