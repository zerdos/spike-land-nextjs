/**
 * Engagement Fetcher Factory
 * Returns platform-specific engagement fetchers
 * Part of #567: ORB-063 - Organic-to-Ad Derivation
 */

import type { EngagementData, EngagerDemographics } from "@spike-npm-land/shared/types";
import type { SocialPlatform } from "@/lib/types/organic-to-ad";

interface IEngagementFetcher {
  fetchEngagement(postId: string, accessToken: string): Promise<EngagementData>;
  fetchAudienceInsights(postId: string, accessToken: string): Promise<EngagerDemographics>;
}

class BaseFetcher implements IEngagementFetcher {
  async fetchEngagement(postId: string, accessToken: string): Promise<EngagementData> {
    throw new Error("Not implemented");
  }
  
  async fetchAudienceInsights(postId: string, accessToken: string): Promise<EngagerDemographics> {
    throw new Error("Not implemented");
  }
}

export class EngagementFetcherFactory {
  static getFetcher(platform: SocialPlatform): IEngagementFetcher {
    // TODO: Return platform-specific fetchers
    return new BaseFetcher();
  }
}
