/**
 * Platform API Types for Organic-to-Ad Conversion
 * Issue: #567 (ORB-063)
 */

import type { SocialPlatform } from '@/lib/types/organic-to-ad';

export interface EngagementDataResponse {
  likes: number;
  comments: number;
  shares: number;
  impressions: number;
  reach: number;
  engagementRate: number;
}

export interface AudienceInsights {
  ageRanges: Record<string, number>;
  genders: Record<string, number>;
  locations: Record<string, number>;
  interests: string[];
}

export interface PlatformEngagementFetcher {
  platform: SocialPlatform;
  fetchEngagement(postId: string, accessToken: string): Promise<EngagementDataResponse>;
  fetchAudienceInsights(postId: string, accessToken: string): Promise<AudienceInsights>;
}

export interface FetcherError {
  code: string;
  message: string;
  platform: SocialPlatform;
  retryable: boolean;
}
