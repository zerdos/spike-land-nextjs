/**
 * Dimension Utilities for Image Enhancement Workflow
 *
 * This module provides validation and calculation helpers for image dimensions,
 * cropping regions, and padding operations used in the enhancement pipeline.
 */

/**
 * Minimum acceptable dimension for images (in pixels)
 */
export const MIN_IMAGE_DIMENSION = 1;

/**
 * Maximum acceptable dimension for images (in pixels)
 * Based on Gemini's maximum output size
 */
export const MAX_IMAGE_DIMENSION = 8192;

/**
 * Validation result with detailed error information
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates pixel dimensions to ensure they are within acceptable bounds
 *
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @param context - Optional context for error messages (e.g., "input image", "crop region")
 * @returns ValidationResult with success or detailed error message
 */
export function validatePixelDimensions(
  width: number,
  height: number,
  context: string = "image",
): ValidationResult {
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return {
      valid: false,
      error: `Invalid ${context} dimensions: width and height must be finite numbers`,
    };
  }

  if (!Number.isInteger(width) || !Number.isInteger(height)) {
    return {
      valid: false,
      error: `Invalid ${context} dimensions: width and height must be integers`,
    };
  }

  if (width < MIN_IMAGE_DIMENSION || height < MIN_IMAGE_DIMENSION) {
    return {
      valid: false,
      error:
        `Invalid ${context} dimensions: width (${width}) and height (${height}) must be at least ${MIN_IMAGE_DIMENSION}px`,
    };
  }

  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    return {
      valid: false,
      error:
        `Invalid ${context} dimensions: width (${width}) and height (${height}) must not exceed ${MAX_IMAGE_DIMENSION}px`,
    };
  }

  return { valid: true };
}

/**
 * Crop region in pixel coordinates
 */
export interface CropRegionPixels {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Validates a crop region against the source image dimensions
 *
 * @param cropRegion - The crop region to validate
 * @param sourceWidth - Source image width in pixels
 * @param sourceHeight - Source image height in pixels
 * @returns ValidationResult with success or detailed error message
 */
export function validateCropRegion(
  cropRegion: CropRegionPixels,
  sourceWidth: number,
  sourceHeight: number,
): ValidationResult {
  const { left, top, width, height } = cropRegion;

  // Validate source dimensions first
  const sourceValidation = validatePixelDimensions(
    sourceWidth,
    sourceHeight,
    "source image",
  );
  if (!sourceValidation.valid) {
    return sourceValidation;
  }

  // Validate crop region values are numbers
  if (
    !Number.isFinite(left) ||
    !Number.isFinite(top) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height)
  ) {
    return {
      valid: false,
      error: "Invalid crop region: all values must be finite numbers",
    };
  }

  // Validate non-negative positions
  if (left < 0 || top < 0) {
    return {
      valid: false,
      error: `Invalid crop region: left (${left}) and top (${top}) must be non-negative`,
    };
  }

  // Validate positive dimensions
  if (width <= 0 || height <= 0) {
    return {
      valid: false,
      error: `Invalid crop region: width (${width}) and height (${height}) must be positive`,
    };
  }

  // Validate crop region fits within source image
  if (left + width > sourceWidth) {
    return {
      valid: false,
      error:
        `Invalid crop region: left (${left}) + width (${width}) exceeds source width (${sourceWidth})`,
    };
  }

  if (top + height > sourceHeight) {
    return {
      valid: false,
      error:
        `Invalid crop region: top (${top}) + height (${height}) exceeds source height (${sourceHeight})`,
    };
  }

  return { valid: true };
}

/**
 * Padding dimensions for square padding operation
 */
export interface PaddingDimensions {
  targetSize: number;
  paddingLeft: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
}

/**
 * Calculates padding dimensions to center an image in a square canvas
 *
 * This is used to prepare images for Gemini, which expects square input.
 * The image is centered with equal padding on opposite sides.
 *
 * @param width - Source image width in pixels
 * @param height - Source image height in pixels
 * @returns PaddingDimensions with target size and padding amounts
 */
export function calculatePaddingDimensions(
  width: number,
  height: number,
): PaddingDimensions {
  // Use the larger dimension as the target square size
  const targetSize = Math.max(width, height);

  // Calculate padding to center the image
  const totalHorizontalPadding = targetSize - width;
  const totalVerticalPadding = targetSize - height;

  // Distribute padding evenly (left gets floor, right gets remainder)
  const paddingLeft = Math.floor(totalHorizontalPadding / 2);
  const paddingRight = totalHorizontalPadding - paddingLeft;
  const paddingTop = Math.floor(totalVerticalPadding / 2);
  const paddingBottom = totalVerticalPadding - paddingTop;

  return {
    targetSize,
    paddingLeft,
    paddingTop,
    paddingRight,
    paddingBottom,
  };
}

/**
 * Validates that padding dimensions are correct for the given source dimensions
 *
 * @param padding - The padding dimensions to validate
 * @param sourceWidth - Source image width in pixels
 * @param sourceHeight - Source image height in pixels
 * @returns ValidationResult with success or detailed error message
 */
export function validatePaddingDimensions(
  padding: PaddingDimensions,
  sourceWidth: number,
  sourceHeight: number,
): ValidationResult {
  const { targetSize, paddingLeft, paddingTop, paddingRight, paddingBottom } = padding;

  // Target size should be at least as large as both dimensions
  if (targetSize < sourceWidth || targetSize < sourceHeight) {
    return {
      valid: false,
      error:
        `Invalid padding: target size (${targetSize}) must be at least as large as source dimensions (${sourceWidth}x${sourceHeight})`,
    };
  }

  // Padding values should be non-negative
  if (
    paddingLeft < 0 ||
    paddingTop < 0 ||
    paddingRight < 0 ||
    paddingBottom < 0
  ) {
    return {
      valid: false,
      error: "Invalid padding: all padding values must be non-negative",
    };
  }

  // Verify horizontal padding is correct
  const expectedHorizontalPadding = targetSize - sourceWidth;
  if (paddingLeft + paddingRight !== expectedHorizontalPadding) {
    return {
      valid: false,
      error:
        `Invalid padding: horizontal padding (${paddingLeft} + ${paddingRight}) does not match expected (${expectedHorizontalPadding})`,
    };
  }

  // Verify vertical padding is correct
  const expectedVerticalPadding = targetSize - sourceHeight;
  if (paddingTop + paddingBottom !== expectedVerticalPadding) {
    return {
      valid: false,
      error:
        `Invalid padding: vertical padding (${paddingTop} + ${paddingBottom}) does not match expected (${expectedVerticalPadding})`,
    };
  }

  return { valid: true };
}

/**
 * Calculates the aspect ratio of an image
 *
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @returns Aspect ratio (width / height)
 */
export function calculateAspectRatio(width: number, height: number): number {
  if (height === 0) {
    throw new Error("Cannot calculate aspect ratio: height is zero");
  }
  return width / height;
}

/**
 * Determines if an image is landscape, portrait, or square
 *
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @returns "landscape", "portrait", or "square"
 */
export function getImageOrientation(
  width: number,
  height: number,
): "landscape" | "portrait" | "square" {
  if (width > height) {
    return "landscape";
  }
  if (height > width) {
    return "portrait";
  }
  return "square";
}
