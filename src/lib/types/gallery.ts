import { z } from "zod";

// Constants
export const GALLERY_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MAX_TITLE_LENGTH: 200,
  MAX_DESCRIPTION_LENGTH: 1000,
} as const;

// Gallery category enum matching Prisma
export const GalleryCategoryEnum = z.enum(["PORTRAIT", "LANDSCAPE", "PRODUCT", "ARCHITECTURE"]);
export type GalleryCategory = z.infer<typeof GalleryCategoryEnum>;

// Helper to sanitize text (strip HTML tags)
export function sanitizeText(text: string): string {
  return text.replace(/<[^>]*>/g, "").trim();
}

// ID validation - accepts CUIDs and other reasonable ID formats
const idSchema = z.string().min(1).max(50);

// Zod schemas for validation
export const createGalleryItemSchema = z.object({
  title: z.string()
    .min(1, "Title is required")
    .max(GALLERY_CONSTANTS.MAX_TITLE_LENGTH)
    .transform(sanitizeText),
  description: z.string()
    .max(GALLERY_CONSTANTS.MAX_DESCRIPTION_LENGTH)
    .optional()
    .transform(val => val ? sanitizeText(val) : undefined),
  category: GalleryCategoryEnum,
  sourceImageId: idSchema,
  sourceJobId: idSchema,
  width: z.number().int().min(1).optional(),
  height: z.number().int().min(1).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateGalleryItemSchema = z.object({
  id: idSchema,
  title: z.string()
    .min(1)
    .max(GALLERY_CONSTANTS.MAX_TITLE_LENGTH)
    .transform(sanitizeText)
    .optional(),
  description: z.string()
    .max(GALLERY_CONSTANTS.MAX_DESCRIPTION_LENGTH)
    .transform(sanitizeText)
    .optional()
    .nullable(),
  category: GalleryCategoryEnum.optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const browseQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(GALLERY_CONSTANTS.MAX_PAGE_SIZE).default(
    GALLERY_CONSTANTS.DEFAULT_PAGE_SIZE,
  ),
  userId: idSchema.optional(),
  shareToken: z.string().min(1).max(50).optional(),
});

export const reorderItemsSchema = z.object({
  items: z.array(z.object({
    id: idSchema,
    sortOrder: z.number().int().min(0),
  })).min(1).max(100),
});

// Gallery item interface for frontend
export interface GalleryItem {
  id: string;
  title: string;
  description: string;
  category: "portrait" | "landscape" | "product" | "architecture";
  originalUrl: string;
  enhancedUrl: string;
  width?: number;
  height?: number;
}
