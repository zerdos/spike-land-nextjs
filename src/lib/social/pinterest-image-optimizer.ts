/**
 * Pinterest Image Optimizer
 *
 * Optimizes images for Pinterest's recommended aspect ratios
 * Pinterest recommendations:
 * - Standard pins: 2:3 ratio (1000x1500px recommended)
 * - Square pins: 1:1 (600x600px)
 * - Wide pins: 16:9 (landscape, less common)
 */

import sharp from "sharp";

export type PinterestAspectRatio = "2:3" | "1:1" | "16:9";

interface OptimizationOptions {
  targetRatio?: PinterestAspectRatio;
  minWidth?: number;
  maxWidth?: number;
  quality?: number;
}

/**
 * Optimize an image for Pinterest
 *
 * @param imageBuffer - The input image as a Buffer
 * @param options - Optimization options
 * @returns Optimized image buffer
 */
export async function optimizeForPinterest(
  imageBuffer: Buffer,
  options: OptimizationOptions = {},
): Promise<Buffer> {
  const {
    targetRatio = "2:3",
    minWidth = 600,
    maxWidth = 2000,
    quality = 85,
  } = options;

  // Get original image metadata
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("Could not determine image dimensions");
  }

  const originalWidth = metadata.width;
  const originalHeight = metadata.height;

  // Calculate target dimensions based on aspect ratio
  const { targetWidth, targetHeight } = calculateTargetDimensions(
    originalWidth,
    originalHeight,
    targetRatio,
    minWidth,
    maxWidth,
  );

  // Determine if we need to crop or resize
  const originalRatio = originalWidth / originalHeight;
  const targetRatioValue = getRatioValue(targetRatio);
  const needsCrop = Math.abs(originalRatio - targetRatioValue) > 0.01;

  let processedImage = image;

  if (needsCrop) {
    // Crop to target aspect ratio (cover mode - fills the area)
    processedImage = processedImage.resize(targetWidth, targetHeight, {
      fit: "cover",
      position: "center",
    });
  } else {
    // Just resize (maintain aspect ratio)
    processedImage = processedImage.resize(targetWidth, targetHeight, {
      fit: "inside",
    });
  }

  // Apply optimizations and convert to JPEG
  const optimized = await processedImage
    .jpeg({
      quality,
      progressive: true,
      mozjpeg: true, // Use mozjpeg for better compression
    })
    .toBuffer();

  return optimized;
}

/**
 * Calculate target dimensions based on aspect ratio and constraints
 */
function calculateTargetDimensions(
  originalWidth: number,
  originalHeight: number,
  targetRatio: PinterestAspectRatio,
  minWidth: number,
  maxWidth: number,
): { targetWidth: number; targetHeight: number } {
  const ratioValue = getRatioValue(targetRatio);

  // Start with original dimensions
  let targetWidth = originalWidth;
  let targetHeight = originalHeight;

  // Calculate dimensions for target ratio
  if (targetRatio === "2:3") {
    // Portrait: width:height = 2:3
    targetHeight = Math.round(targetWidth * 1.5);
  } else if (targetRatio === "1:1") {
    // Square
    targetHeight = targetWidth;
  } else if (targetRatio === "16:9") {
    // Landscape
    targetHeight = Math.round(targetWidth * (9 / 16));
  }

  // Constrain to min/max width
  if (targetWidth < minWidth) {
    targetWidth = minWidth;
    targetHeight = Math.round(targetWidth / ratioValue);
  } else if (targetWidth > maxWidth) {
    targetWidth = maxWidth;
    targetHeight = Math.round(targetWidth / ratioValue);
  }

  return { targetWidth, targetHeight };
}

/**
 * Get numeric ratio value from string representation
 */
function getRatioValue(ratio: PinterestAspectRatio): number {
  switch (ratio) {
    case "2:3":
      return 2 / 3;
    case "1:1":
      return 1;
    case "16:9":
      return 16 / 9;
    default:
      return 2 / 3; // Default to portrait
  }
}

/**
 * Validate if an image meets Pinterest's minimum requirements
 */
export async function validatePinterestImage(
  imageBuffer: Buffer,
): Promise<{
  valid: boolean;
  errors: string[];
  width?: number;
  height?: number;
}> {
  const errors: string[] = [];

  try {
    const metadata = await sharp(imageBuffer).metadata();

    if (!metadata.width || !metadata.height) {
      errors.push("Could not determine image dimensions");
      return { valid: false, errors };
    }

    const width = metadata.width;
    const height = metadata.height;

    // Pinterest minimum dimensions: 236px width
    if (width < 236) {
      errors.push(
        `Image width (${width}px) is below Pinterest minimum (236px)`,
      );
    }

    // Recommended minimum width: 600px
    if (width < 600) {
      errors.push(
        `Image width (${width}px) is below recommended minimum (600px)`,
      );
    }

    // Check file size (max 32MB for images)
    const sizeMB = imageBuffer.length / (1024 * 1024);
    if (sizeMB > 32) {
      errors.push(`Image size (${sizeMB.toFixed(2)}MB) exceeds Pinterest maximum (32MB)`);
    }

    return {
      valid: errors.length === 0,
      errors,
      width,
      height,
    };
  } catch (error) {
    errors.push(`Failed to process image: ${error instanceof Error ? error.message : String(error)}`);
    return { valid: false, errors };
  }
}

/**
 * Get recommended dimensions for a Pinterest pin type
 */
export function getRecommendedDimensions(
  pinType: "standard" | "square" | "wide" = "standard",
): { width: number; height: number; ratio: PinterestAspectRatio } {
  switch (pinType) {
    case "standard":
      return { width: 1000, height: 1500, ratio: "2:3" };
    case "square":
      return { width: 600, height: 600, ratio: "1:1" };
    case "wide":
      return { width: 1920, height: 1080, ratio: "16:9" };
    default:
      return { width: 1000, height: 1500, ratio: "2:3" };
  }
}
