/**
 * Social Platform Constants
 *
 * Shared constants for social platform values that mirror the Prisma SocialPlatform enum.
 * Use these constants with Zod schemas to maintain consistency with the database schema.
 */

/**
 * Array of all supported social platform values.
 * This mirrors the SocialPlatform enum in prisma/schema.prisma.
 * When adding new platforms to Prisma, update this list as well.
 */
export const SOCIAL_PLATFORMS = [
  "TWITTER",
  "LINKEDIN",
  "FACEBOOK",
  "INSTAGRAM",
  "TIKTOK",
  "YOUTUBE",
  "DISCORD",
  "PINTEREST",
  "SNAPCHAT",
] as const;

/**
 * Type representing valid social platform strings.
 * Use this when you need a type-safe platform value.
 */
export type SocialPlatformValue = (typeof SOCIAL_PLATFORMS)[number];
