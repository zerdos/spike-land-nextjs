/**
 * Ad Creative Generator
 *
 * Extracts content from organic posts and formats for ad platforms
 * Handles media attachments and platform-specific requirements
 *
 * Resolves #521
 */

import type { SocialPlatform, SocialPost } from "@prisma/client";

export interface AdCreative {
  headline?: string;
  description: string;
  callToAction?: string;
  imageUrls?: string[];
  videoUrls?: string[];
  destinationUrl?: string;
  displayUrl?: string;
}

/**
 * Extract headline from post content (first line or sentence)
 * @param content - Post content
 * @param maxLength - Maximum headline length
 * @returns Headline
 */
function extractHeadline(content: string, maxLength: number = 60): string {
  // Remove URLs
  const cleanContent = content.replace(/https?:\/\/[^\s]+/g, "").trim();

  // Get first sentence or line
  const firstSentence = cleanContent.split(/[.\n]/)[0]?.trim() || cleanContent;

  // Truncate if needed
  if (firstSentence.length <= maxLength) {
    return firstSentence;
  }

  return firstSentence.substring(0, maxLength - 3) + "...";
}

/**
 * Extract description from post content
 * @param content - Post content
 * @param maxLength - Maximum description length
 * @returns Description
 */
function extractDescription(content: string, maxLength: number = 300): string {
  // Remove URLs for description
  const cleanContent = content.replace(/https?:\/\/[^\s]+/g, "").trim();

  if (cleanContent.length <= maxLength) {
    return cleanContent;
  }

  return cleanContent.substring(0, maxLength - 3) + "...";
}

/**
 * Suggest a call-to-action based on content
 * @param content - Post content
 * @returns CTA text
 */
function suggestCallToAction(content: string): string {
  const contentLower = content.toLowerCase();

  // Detect intent from content
  if (
    contentLower.includes("buy") ||
    contentLower.includes("shop") ||
    contentLower.includes("purchase")
  ) {
    return "Shop Now";
  }

  if (
    contentLower.includes("learn") ||
    contentLower.includes("discover") ||
    contentLower.includes("find out")
  ) {
    return "Learn More";
  }

  if (
    contentLower.includes("sign up") ||
    contentLower.includes("register") ||
    contentLower.includes("join")
  ) {
    return "Sign Up";
  }

  if (
    contentLower.includes("download") ||
    contentLower.includes("get") ||
    contentLower.includes("free")
  ) {
    return "Download";
  }

  if (contentLower.includes("contact") || contentLower.includes("reach")) {
    return "Contact Us";
  }

  // Default CTA
  return "Learn More";
}

/**
 * Extract media URLs from post metadata
 * @param metadata - Post metadata JSON
 * @returns Image and video URLs
 */
function extractMediaUrls(metadata: Record<string, unknown> | null): {
  imageUrls: string[];
  videoUrls: string[];
} {
  if (!metadata) {
    return { imageUrls: [], videoUrls: [] };
  }

  const imageUrls: string[] = [];
  const videoUrls: string[] = [];

  // Extract from common metadata structures
  if (Array.isArray(metadata["images"])) {
    imageUrls.push(...metadata["images"].filter((url): url is string => typeof url === "string"));
  }

  if (Array.isArray(metadata["videos"])) {
    videoUrls.push(...metadata["videos"].filter((url): url is string => typeof url === "string"));
  }

  if (typeof metadata["imageUrl"] === "string") {
    imageUrls.push(metadata["imageUrl"]);
  }

  if (typeof metadata["videoUrl"] === "string") {
    videoUrls.push(metadata["videoUrl"]);
  }

  return { imageUrls, videoUrls };
}

/**
 * Generate ad creative from organic post
 * @param post - Original social post
 * @param platform - Target ad platform
 * @param destinationUrl - Where to send clicks
 * @returns Ad creative object
 */
export function generateAdCreative(
  post: SocialPost,
  platform: SocialPlatform,
  destinationUrl?: string,
): AdCreative {
  const metadata = post.metadata as Record<string, unknown> | null;
  const { imageUrls, videoUrls } = extractMediaUrls(metadata);

  // Platform-specific character limits
  const limits = {
    headline:
      platform === "GOOGLE_ADS" ? 30 : platform === "LINKEDIN" ? 70 : 60,
    description:
      platform === "GOOGLE_ADS" ? 90 : platform === "LINKEDIN" ? 150 : 300,
  };

  return {
    headline: extractHeadline(post.content, limits.headline),
    description: extractDescription(post.content, limits.description),
    callToAction: suggestCallToAction(post.content),
    imageUrls,
    videoUrls,
    destinationUrl,
    displayUrl: destinationUrl ? new URL(destinationUrl).hostname : undefined,
  };
}

/**
 * Format ad creative for platform API
 * @param creative - Ad creative
 * @param platform - Target platform
 * @returns Platform-specific creative object
 */
export function formatCreativeForPlatform(
  creative: AdCreative,
  platform: SocialPlatform,
): Record<string, unknown> {
  switch (platform) {
    case "GOOGLE_ADS":
      return {
        headlines: [
          { text: creative.headline },
          { text: creative.description.substring(0, 30) },
        ],
        descriptions: [{ text: creative.description }],
        finalUrls: creative.destinationUrl ? [creative.destinationUrl] : [],
        displayUrl: creative.displayUrl,
        images: creative.imageUrls?.map((url) => ({ asset: url })),
      };

    case "FACEBOOK":
    case "INSTAGRAM":
      return {
        name: creative.headline,
        body: creative.description,
        call_to_action: {
          type: creative.callToAction?.toUpperCase().replace(/\s/g, "_"),
          value: {
            link: creative.destinationUrl,
          },
        },
        image_url: creative.imageUrls?.[0],
        video_url: creative.videoUrls?.[0],
      };

    case "LINKEDIN":
      return {
        title: creative.headline,
        description: creative.description,
        callToAction: creative.callToAction,
        destinationUrl: creative.destinationUrl,
        imageUrl: creative.imageUrls?.[0],
        videoUrl: creative.videoUrls?.[0],
      };

    case "TWITTER":
      return {
        text: creative.description,
        media: creative.imageUrls?.[0] || creative.videoUrls?.[0],
        card: {
          type: "summary_large_image",
          title: creative.headline,
          description: creative.description,
          cta: creative.callToAction,
          website_url: creative.destinationUrl,
        },
      };

    default:
      return creative as Record<string, unknown>;
  }
}
