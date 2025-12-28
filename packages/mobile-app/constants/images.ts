/**
 * Image constants for the mobile app
 * These are sample/demo images used for the landing screen and other UI elements
 */

/**
 * Sample before/after comparison images for demo purposes
 * Using Unsplash images with different quality settings to simulate enhancement
 */
export const SAMPLE_COMPARISON_IMAGES = {
  // Mountain landscape
  landscape: {
    beforeUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=60",
    afterUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=95",
  },
  // Portrait photo
  portrait: {
    beforeUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=60",
    afterUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=95",
  },
  // Vintage photo style
  vintage: {
    beforeUrl: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=400&q=60",
    afterUrl: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=800&q=95",
  },
  // Nature/wildlife
  nature: {
    beforeUrl: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&q=60",
    afterUrl: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=95",
  },
} as const;

/**
 * Default comparison images used on the landing screen
 */
export const DEFAULT_COMPARISON = SAMPLE_COMPARISON_IMAGES.landscape;

/**
 * Fallback placeholder image URL
 */
export const PLACEHOLDER_IMAGE_URL = "https://via.placeholder.com/400x300?text=Photo";

/**
 * Type for comparison image pairs
 */
export interface ComparisonImagePair {
  beforeUrl: string;
  afterUrl: string;
}
