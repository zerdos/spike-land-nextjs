/**
 * Engagement Fetcher Factory
 * Returns platform-specific engagement fetchers
 * Part of #567: ORB-063 - Organic-to-Ad Derivation
 */

import type { SocialPlatform } from "@/lib/types/organic-to-ad";
import { FacebookEngagementFetcher } from "./facebook/engagement-fetcher";
import { LinkedInEngagementFetcher } from "./linkedin/engagement-fetcher";
import { TikTokEngagementFetcher } from "./tiktok/engagement-fetcher";
import { TwitterEngagementFetcher } from "./twitter/engagement-fetcher";
import type { PlatformEngagementFetcher } from "./types";

export class EngagementFetcherFactory {
  static getFetcher(platform: SocialPlatform): PlatformEngagementFetcher {
    switch (platform) {
      case "FACEBOOK":
      case "INSTAGRAM":
        return new FacebookEngagementFetcher();
      case "TWITTER":
        return new TwitterEngagementFetcher();
      case "LINKEDIN":
        return new LinkedInEngagementFetcher();
      case "TIKTOK":
        return new TikTokEngagementFetcher();
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }
}
