import prisma from "@/lib/prisma";

/**
 * Analysis result structure from Gemini vision API
 * This matches the structure stored in ImageEnhancementJob.analysisResult
 */
export interface AnalysisDetailedResult {
  /** Brief description of the main subject in the image */
  mainSubject: string;
  /** Detected style/type of the image */
  imageStyle: "photograph" | "sketch" | "painting" | "screenshot" | "other";
  /** Detected defects that need correction */
  defects: {
    isDark: boolean;
    isBlurry: boolean;
    hasNoise: boolean;
    hasVHSArtifacts: boolean;
    isPixelated: boolean;
    hasColorCast: boolean;
    colorCastType?: "yellow" | "blue" | "magenta" | "green";
  };
  /** Suggested crop area to improve composition */
  suggestedCrop?: {
    x: number;
    y: number;
    width: number;
    height: number;
    reason: string;
  };
  /** Main components/objects detected */
  components?: string[];
  /** Dominant colors in the image */
  dominantColors?: string[];
  /** Mood/atmosphere of the image */
  mood?: string;
}

/**
 * Alternative analysis result structure from AssetAnalysis
 */
export interface AssetAnalysisResult {
  altText: string;
  qualityScore: number;
  suggestedTags: string[];
  analysisDetails: {
    mainSubject: string;
    imageStyle: "photo" | "illustration" | "graphic" | "screenshot" | "other";
    technicalQuality: string;
    dominantColors?: string[];
  };
}

/**
 * Profanity and inappropriate content filter
 * This is a basic list - in production, use a comprehensive filtering service
 */
const PROFANITY_LIST = new Set([
  "nsfw",
  "explicit",
  "porn",
  "nude",
  "sex",
  "xxx",
  // Add more as needed
]);

/**
 * Normalizes a tag by:
 * - Converting to lowercase
 * - Trimming whitespace
 * - Removing special characters
 * - Limiting length to 50 characters
 */
function normalizeTag(tag: string): string | null {
  const normalized = tag
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 50);

  // Filter out empty strings and profanity
  if (!normalized || PROFANITY_LIST.has(normalized)) {
    return null;
  }

  return normalized;
}

/**
 * Extract tags from AnalysisDetailedResult JSON structure
 */
function extractFromDetailedAnalysis(
  analysis: AnalysisDetailedResult,
): string[] {
  const tags: string[] = [];

  // Add main subject
  if (analysis.mainSubject) {
    tags.push(analysis.mainSubject);
  }

  // Add image style
  if (analysis.imageStyle) {
    tags.push(analysis.imageStyle);
  }

  // Add components/objects
  if (analysis.components && Array.isArray(analysis.components)) {
    tags.push(...analysis.components);
  }

  // Add dominant colors
  if (analysis.dominantColors && Array.isArray(analysis.dominantColors)) {
    tags.push(...analysis.dominantColors);
  }

  // Add mood/atmosphere
  if (analysis.mood) {
    tags.push(analysis.mood);
  }

  // Add quality descriptors based on defects
  if (analysis.defects) {
    if (analysis.defects.isDark) tags.push("dark");
    if (analysis.defects.isBlurry) tags.push("blurry");
    if (analysis.defects.hasNoise) tags.push("grainy");
    if (analysis.defects.hasVHSArtifacts) tags.push("vintage");
    if (analysis.defects.isPixelated) tags.push("low-resolution");
  }

  return tags;
}

/**
 * Extract tags from AssetAnalysisResult structure
 */
function extractFromAssetAnalysis(analysis: AssetAnalysisResult): string[] {
  const tags: string[] = [];

  // Add suggested tags
  if (analysis.suggestedTags && Array.isArray(analysis.suggestedTags)) {
    tags.push(...analysis.suggestedTags);
  }

  // Add main subject
  if (analysis.analysisDetails?.mainSubject) {
    tags.push(analysis.analysisDetails.mainSubject);
  }

  // Add image style
  if (analysis.analysisDetails?.imageStyle) {
    tags.push(analysis.analysisDetails.imageStyle);
  }

  // Add dominant colors
  if (
    analysis.analysisDetails?.dominantColors &&
    Array.isArray(analysis.analysisDetails.dominantColors)
  ) {
    tags.push(...analysis.analysisDetails.dominantColors);
  }

  return tags;
}

/**
 * Extract tags from Gemini analysis result JSON
 * Handles both AnalysisDetailedResult and AssetAnalysisResult formats
 *
 * @param analysisJson - The analysis result JSON from ImageEnhancementJob.analysisResult
 * @returns Array of normalized, deduplicated tags (max 15)
 */
export function extractTagsFromAnalysis(analysisJson: unknown): string[] {
  if (!analysisJson || typeof analysisJson !== "object") {
    return [];
  }

  let tags: string[] = [];

  // Try to detect which format we have
  const analysis = analysisJson as Record<string, unknown>;

  if ("suggestedTags" in analysis && Array.isArray(analysis["suggestedTags"])) {
    // AssetAnalysisResult format
    tags = extractFromAssetAnalysis(analysis as unknown as AssetAnalysisResult);
  } else if ("mainSubject" in analysis || "imageStyle" in analysis) {
    // AnalysisDetailedResult format
    tags = extractFromDetailedAnalysis(
      analysis as unknown as AnalysisDetailedResult,
    );
  } else {
    // Unknown format, try to extract any array fields
    for (const value of Object.values(analysis)) {
      if (Array.isArray(value)) {
        tags.push(
          ...value.filter((item) => typeof item === "string").map(String),
        );
      } else if (typeof value === "string") {
        tags.push(value);
      }
    }
  }

  // Normalize all tags
  const normalizedTags = tags
    .map(normalizeTag)
    .filter((tag): tag is string => tag !== null);

  // Deduplicate using Set
  const uniqueTags = Array.from(new Set(normalizedTags));

  // Limit to top 15 tags
  return uniqueTags.slice(0, 15);
}

/**
 * Apply auto-generated tags to an image based on its latest completed enhancement job
 *
 * @param imageId - The ID of the EnhancedImage to tag
 * @returns The updated tags array, or null if no analysis available
 */
export async function applyAutoTags(
  imageId: string,
): Promise<string[] | null> {
  // Fetch latest completed job with analysis for this image
  const job = await prisma.imageEnhancementJob.findFirst({
    where: {
      imageId,
      status: "COMPLETED",
      analysisResult: {
        not: null,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      analysisResult: true,
    },
  });

  if (!job || !job.analysisResult) {
    return null;
  }

  // Extract tags from analysis
  const tags = extractTagsFromAnalysis(job.analysisResult);

  // Update the image with extracted tags
  await prisma.enhancedImage.update({
    where: { id: imageId },
    data: { tags },
  });

  return tags;
}

/**
 * Batch apply auto-tags to multiple images
 * Useful for backfilling tags on existing images
 *
 * @param imageIds - Array of image IDs to process
 * @returns Map of imageId -> tags (or null if no analysis)
 */
export async function applyAutoTagsBatch(
  imageIds: string[],
): Promise<Map<string, string[] | null>> {
  const results = new Map<string, string[] | null>();

  for (const imageId of imageIds) {
    const tags = await applyAutoTags(imageId);
    results.set(imageId, tags);
  }

  return results;
}
