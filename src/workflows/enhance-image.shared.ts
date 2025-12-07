/**
 * Shared Image Enhancement Logic
 *
 * This module contains constants, types, and shared logic used by both
 * the workflow version (enhance-image.workflow.ts) and the direct version
 * (enhance-image.direct.ts) to eliminate code duplication.
 */

import { EnhancementTier } from "@prisma/client";

// Resolution constants for each enhancement tier
export const TIER_RESOLUTIONS = {
  TIER_1K: 1024,
  TIER_2K: 2048,
  TIER_4K: 4096,
} as const;

export const TIER_TO_SIZE = {
  TIER_1K: "1K" as const,
  TIER_2K: "2K" as const,
  TIER_4K: "4K" as const,
};

// Image processing constants
export const ENHANCED_JPEG_QUALITY = 95;
export const DEFAULT_IMAGE_DIMENSION = 1024;
export const PADDING_BACKGROUND = { r: 0, g: 0, b: 0, alpha: 1 };

// Types
export interface EnhanceImageInput {
  jobId: string;
  imageId: string;
  userId: string;
  originalR2Key: string;
  tier: EnhancementTier;
  tokensCost: number;
}

export interface ImageMetadata {
  width: number;
  height: number;
  mimeType: string;
  paddedBase64: string;
}

export interface EnhancedResult {
  enhancedUrl: string;
  r2Key: string;
  width: number;
  height: number;
  sizeBytes: number;
}

/**
 * Validates enhancement input parameters
 */
export function validateEnhanceImageInput(input: EnhanceImageInput): void {
  if (!input.jobId || typeof input.jobId !== "string") {
    throw new Error("Invalid jobId: must be a non-empty string");
  }

  if (!input.imageId || typeof input.imageId !== "string") {
    throw new Error("Invalid imageId: must be a non-empty string");
  }

  if (!input.userId || typeof input.userId !== "string") {
    throw new Error("Invalid userId: must be a non-empty string");
  }

  if (!input.originalR2Key || typeof input.originalR2Key !== "string") {
    throw new Error("Invalid originalR2Key: must be a non-empty string");
  }

  const validTiers: EnhancementTier[] = ["TIER_1K", "TIER_2K", "TIER_4K"];
  if (!validTiers.includes(input.tier)) {
    throw new Error(`Invalid tier: must be one of ${validTiers.join(", ")}`);
  }

  if (typeof input.tokensCost !== "number" || input.tokensCost < 0) {
    throw new Error("Invalid tokensCost: must be a non-negative number");
  }
}

/**
 * Calculate crop region to restore original aspect ratio from square Gemini output
 */
export function calculateCropRegion(
  geminiSize: number,
  originalWidth: number,
  originalHeight: number
): {
  extractLeft: number;
  extractTop: number;
  extractWidth: number;
  extractHeight: number;
} {
  const aspectRatio = originalWidth / originalHeight;

  let extractLeft = 0;
  let extractTop = 0;
  let extractWidth = geminiSize;
  let extractHeight = geminiSize;

  if (aspectRatio > 1) {
    // Landscape: content is full width, centered vertically
    extractHeight = Math.round(geminiSize / aspectRatio);
    extractTop = Math.round((geminiSize - extractHeight) / 2);
  } else {
    // Portrait/Square: content is full height, centered horizontally
    extractWidth = Math.round(geminiSize * aspectRatio);
    extractLeft = Math.round((geminiSize - extractWidth) / 2);
  }

  return { extractLeft, extractTop, extractWidth, extractHeight };
}

/**
 * Calculate target dimensions based on tier and aspect ratio
 */
export function calculateTargetDimensions(
  tier: EnhancementTier,
  originalWidth: number,
  originalHeight: number
): {
  targetWidth: number;
  targetHeight: number;
} {
  const aspectRatio = originalWidth / originalHeight;
  const tierResolution = TIER_RESOLUTIONS[tier];

  let targetWidth: number;
  let targetHeight: number;

  if (aspectRatio > 1) {
    targetWidth = tierResolution;
    targetHeight = Math.round(tierResolution / aspectRatio);
  } else {
    targetHeight = tierResolution;
    targetWidth = Math.round(tierResolution * aspectRatio);
  }

  return { targetWidth, targetHeight };
}

/**
 * Generate R2 key for enhanced image from original key
 */
export function generateEnhancedR2Key(originalR2Key: string, jobId: string): string {
  return originalR2Key
    .replace("/originals/", `/enhanced/`)
    .replace(/\.[^.]+$/, `/${jobId}.jpg`);
}
