/**
 * Targeting Suggestions
 *
 * AI-powered audience targeting suggestions for boosted posts
 * Analyzes content and suggests demographics, interests, and behaviors
 *
 * Resolves #521
 */

import type { SocialPlatform } from "@prisma/client";

export interface TargetingSuggestion {
  platform: SocialPlatform;
  demographics: {
    ageRanges?: string[];
    genders?: string[];
    locations?: string[];
  };
  interests?: string[];
  behaviors?: string[];
  keywords?: string[];
  lookalike?: {
    enabled: boolean;
    sourceAudience?: string;
  };
}

/**
 * Extract keywords and topics from post content
 * @param content - Post content
 * @returns Array of keywords
 */
function extractKeywords(content: string): string[] {
  // Remove URLs
  const cleanedContent = content.replace(/https?:\/\/[^\s]+/g, "");

  // Remove special characters and split into words
  const words = cleanedContent
    .toLowerCase()
    .replace(/[^\w\s#@]/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 3);

  // Extract hashtags
  const hashtags = content.match(/#\w+/g) || [];

  // Combine and deduplicate
  return [...new Set([...words, ...hashtags.map((h) => h.slice(1))])];
}

/**
 * Generate basic targeting suggestions based on content
 * @param postContent - Content of the post
 * @param platform - Target platform
 * @returns Targeting suggestions
 */
export function generateTargetingSuggestions(
  postContent: string,
  platform: SocialPlatform,
  performanceMetrics?: {
    engagementRate: number;
    topAgeGroup?: string;
    topGender?: string;
    topLocations?: string[];
  },
): TargetingSuggestion {
  const keywords = extractKeywords(postContent);

  // Base suggestion structure
  const suggestion: TargetingSuggestion = {
    platform,
    demographics: {
      ageRanges: performanceMetrics?.topAgeGroup
        ? [performanceMetrics.topAgeGroup]
        : ["25-34", "35-44"], // Default to most engaged age groups
      genders: performanceMetrics?.topGender
        ? [performanceMetrics.topGender]
        : undefined, // All genders if unknown
      locations: performanceMetrics?.topLocations || [],
    },
    interests: [],
    behaviors: [],
    keywords,
    lookalike: {
      enabled: true,
      sourceAudience: "website_visitors",
    },
  };

  // Platform-specific suggestions
  switch (platform) {
    case "GOOGLE_ADS":
      suggestion.behaviors = [
        "tech_savvy",
        "frequent_online_shoppers",
        "early_adopters",
      ];
      break;

    case "FACEBOOK":
    case "INSTAGRAM":
      suggestion.interests = keywords.slice(0, 10); // Top 10 keywords as interests
      suggestion.behaviors = ["engaged_shoppers", "mobile_device_users"];
      break;

    case "LINKEDIN":
      suggestion.interests = keywords.filter(
        (k) =>
          k.includes("business") ||
          k.includes("professional") ||
          k.includes("tech"),
      );
      suggestion.behaviors = ["decision_makers", "professionals"];
      break;

    case "TWITTER":
      suggestion.interests = keywords.slice(0, 15);
      suggestion.behaviors = ["news_consumers", "tech_enthusiasts"];
      break;

    default:
      break;
  }

  return suggestion;
}

/**
 * Refine targeting suggestions using AI
 * In a real implementation, this would call an LLM API
 * For now, returns enhanced suggestions
 *
 * @param postContent - Post content
 * @param platform - Target platform
 * @returns Refined targeting suggestions
 */
export async function refineTargetingWithAI(
  postContent: string,
  platform: SocialPlatform,
): Promise<TargetingSuggestion> {
  // TODO: Implement actual AI refinement using LLM
  // For now, return basic suggestions
  return generateTargetingSuggestions(postContent, platform);
}

/**
 * Format targeting suggestions for platform API
 * @param suggestions - Targeting suggestions
 * @param platform - Target platform
 * @returns Platform-specific targeting object
 */
export function formatTargetingForPlatform(
  suggestions: TargetingSuggestion,
  platform: SocialPlatform,
): Record<string, unknown> {
  switch (platform) {
    case "GOOGLE_ADS":
      return {
        ageRanges: suggestions.demographics.ageRanges,
        genders: suggestions.demographics.genders,
        geoTargets: suggestions.demographics.locations,
        keywords: suggestions.keywords,
        interests: suggestions.interests,
        customAudiences: suggestions.lookalike?.enabled
          ? [suggestions.lookalike.sourceAudience]
          : [],
      };

    case "FACEBOOK":
    case "INSTAGRAM":
      return {
        age_min: 18,
        age_max: 65,
        genders: suggestions.demographics.genders,
        geo_locations: {
          countries: suggestions.demographics.locations || ["US"],
        },
        interests: suggestions.interests?.map((interest) => ({
          name: interest,
        })),
        behaviors: suggestions.behaviors?.map((behavior) => ({
          name: behavior,
        })),
        custom_audiences: suggestions.lookalike?.enabled
          ? [{ lookalike: true, source: suggestions.lookalike.sourceAudience }]
          : [],
      };

    case "LINKEDIN":
      return {
        age: {
          min: 25,
          max: 65,
        },
        locations: suggestions.demographics.locations,
        industries: suggestions.interests,
        jobFunctions: suggestions.behaviors,
      };

    case "TWITTER":
      return {
        age_ranges: suggestions.demographics.ageRanges,
        genders: suggestions.demographics.genders,
        locations: suggestions.demographics.locations,
        keywords: suggestions.keywords,
        interests: suggestions.interests,
        behaviors: suggestions.behaviors,
      };

    default:
      return {};
  }
}
