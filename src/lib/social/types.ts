/**
 * Social Media Platform Types
 *
 * Shared TypeScript types for Twitter, Facebook, and Instagram APIs
 */

import type { SocialPlatform } from "@prisma/client";

// Re-export for convenience
export type { SocialPlatform };

/**
 * OAuth Token Response (shared across all platforms)
 */
export interface OAuthTokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  tokenType: string;
  scope?: string;
}

/**
 * Social Account Info (normalized across platforms)
 */
export interface SocialAccountInfo {
  platformId: string;
  username: string;
  displayName: string;
  profileUrl?: string;
  avatarUrl?: string;
  followersCount?: number;
  followingCount?: number;
}

/**
 * Post creation options
 */
export interface PostOptions {
  mediaUrls?: string[];
  mediaIds?: string[];
  scheduledAt?: Date;
  replyToId?: string;
  // Platform-specific options
  metadata?: Record<string, unknown>;
}

/**
 * Result of creating a post
 */
export interface PostResult {
  platformPostId: string;
  url: string;
  publishedAt: Date;
}

/**
 * A social media post (normalized)
 */
export interface SocialPost {
  id: string;
  platformPostId: string;
  platform: SocialPlatform;
  content: string;
  mediaUrls?: string[];
  publishedAt: Date;
  metrics?: PostMetrics;
  url: string;
  rawData?: Record<string, unknown>;
}

/**
 * Metrics for a single post
 */
export interface PostMetrics {
  likes: number;
  comments: number;
  shares: number;
  impressions?: number;
  reach?: number;
  engagementRate?: number;
}

/**
 * Account-level metrics (normalized)
 */
export interface SocialMetricsData {
  followers: number;
  following: number;
  postsCount: number;
  engagementRate?: number;
  impressions?: number;
  reach?: number;
  // Time period for metrics
  period?: {
    start: Date;
    end: Date;
  };
}

/**
 * API Error Response
 */
export interface SocialApiError {
  platform: SocialPlatform;
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Social Client Interface
 *
 * All platform clients implement this interface for consistent behavior
 */
export interface ISocialClient {
  platform: SocialPlatform;

  // OAuth
  getAuthUrl(redirectUri: string, state: string): string;
  exchangeCodeForTokens(
    code: string,
    redirectUri: string,
    codeVerifier?: string,
  ): Promise<OAuthTokenResponse>;
  refreshAccessToken?(refreshToken: string): Promise<OAuthTokenResponse>;

  // Account
  getAccountInfo(): Promise<SocialAccountInfo>;

  // Posts
  createPost(content: string, options?: PostOptions): Promise<PostResult>;
  getPosts(limit?: number): Promise<SocialPost[]>;
  deletePost?(postId: string): Promise<void>;

  // Metrics
  getMetrics(): Promise<SocialMetricsData>;
}

/**
 * Options for creating a social client
 */
export interface SocialClientOptions {
  accessToken?: string;
  refreshToken?: string;
  accountId?: string;
  // Platform-specific options
  pageId?: string; // Facebook page ID
  igUserId?: string; // Instagram user ID
}

/**
 * Twitter-specific types
 */
export interface TwitterUser {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
  };
}

export interface TwitterTweet {
  id: string;
  text: string;
  created_at?: string;
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
    impression_count?: number;
  };
  author_id?: string;
}

/**
 * Facebook-specific types
 */
export interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  category?: string;
  instagram_business_account?: {
    id: string;
  };
}

export interface FacebookPost {
  id: string;
  message?: string;
  created_time: string;
  permalink_url?: string;
  shares?: { count: number; };
  reactions?: { summary: { total_count: number; }; };
  comments?: { summary: { total_count: number; }; };
}

export interface FacebookPageInsights {
  page_impressions?: number;
  page_reach?: number;
  page_engaged_users?: number;
  page_fans?: number;
}

/**
 * Instagram-specific types
 */
export interface InstagramMedia {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url?: string;
  permalink: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
}

export interface InstagramInsights {
  impressions?: number;
  reach?: number;
  follower_count?: number;
  profile_views?: number;
}

/**
 * PKCE (Proof Key for Code Exchange) helper types
 * Used by Twitter OAuth 2.0
 */
export interface PKCEChallenge {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: "S256";
}
