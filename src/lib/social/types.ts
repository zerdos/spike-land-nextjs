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
  getAuthUrl(
    redirectUri: string,
    state: string,
    codeChallenge?: string,
  ): string;
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

  // Comments (optional - platform-specific)
  getComments?(postId: string, limit: number): Promise<CommentPreview[]>;

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
  attachments?: {
    media_keys?: string[];
  };
}

/**
 * Twitter Media object from API includes
 */
export interface TwitterMedia {
  media_key: string;
  type: "photo" | "video" | "animated_gif";
  url?: string;
  preview_image_url?: string;
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
  full_picture?: string;
  attachments?: {
    data?: Array<{
      media?: { image?: { src: string; }; };
      media_type?: string;
      subattachments?: {
        data?: Array<{
          media?: { image?: { src: string; }; };
        }>;
      };
    }>;
  };
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

/**
 * LinkedIn-specific types
 */
export interface LinkedInOrganization {
  id: string;
  localizedName: string;
  vanityName?: string;
  logoV2?: {
    original: string;
  };
}

export interface LinkedInPost {
  id: string;
  author: string;
  commentary: string;
  created: { time: number; };
  visibility: string;
}

/**
 * YouTube-specific types
 */
export interface YouTubeChannel {
  id: string;
  title: string;
  description?: string;
  customUrl?: string;
  thumbnails?: {
    default?: { url: string; };
    medium?: { url: string; };
    high?: { url: string; };
  };
  statistics?: {
    subscriberCount: string;
    viewCount: string;
    videoCount: string;
  };
}

export interface YouTubeVideo {
  id: string;
  title: string;
  description?: string;
  publishedAt: string;
  thumbnails?: {
    default?: { url: string; };
    medium?: { url: string; };
    high?: { url: string; };
  };
  statistics?: {
    viewCount: string;
    likeCount: string;
    commentCount: string;
  };
}

/**
 * YouTube video upload options for scheduled posts
 */
export interface YouTubeVideoUploadOptions {
  title: string;
  description?: string;
  tags?: string[];
  categoryId?: string;
  privacyStatus?: "public" | "private" | "unlisted";
  videoUrl: string; // R2/S3 URL where video is stored
  videoFileSize: number;
  thumbnailUrl?: string;
  playlistIds?: string[];
}

/**
 * YouTube analytics data structure
 * Stored in YouTubeVideoAnalytics.trafficSourcesData
 */
export interface YouTubeTrafficSourceData {
  source: string; // 'YT_SEARCH', 'EXT_URL', 'RELATED_VIDEO', etc.
  views: number;
  watchTime: number; // Minutes
}

/**
 * YouTube viewer demographics data
 * Stored in YouTubeVideoAnalytics.viewerDemographics
 */
export interface YouTubeViewerDemographicsData {
  ageGroup: string;
  gender: string;
  percentage: number;
}

/**
 * YouTube geography data
 * Stored in YouTubeVideoAnalytics.topGeographies
 */
export interface YouTubeGeographyData {
  country: string;
  views: number;
}

/**
 * YouTube audience retention data
 * Stored in YouTubeVideoAnalytics.retentionData
 */
export interface YouTubeRetentionData {
  elapsedVideoTime: string; // ISO 8601 duration
  audienceWatchRatio: number; // Percentage still watching
}

/**
 * Discord-specific types
 * Note: Discord uses Bot Token auth, not OAuth
 */
export interface DiscordGuild {
  id: string;
  name: string;
  icon?: string;
  member_count?: number;
  approximate_member_count?: number;
  approximate_presence_count?: number;
  premium_tier?: number;
  premium_subscription_count?: number;
}

export interface DiscordMessage {
  id: string;
  content: string;
  channel_id: string;
  author: {
    id: string;
    username: string;
    bot?: boolean;
  };
  timestamp: string;
  embeds?: DiscordEmbed[];
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{ name: string; value: string; inline?: boolean; }>;
  thumbnail?: { url: string; };
  image?: { url: string; };
  footer?: { text: string; };
  timestamp?: string;
}

export interface DiscordMetrics {
  memberCount: number;
  onlineCount: number;
  serverName: string;
  serverIcon?: string;
  premiumTier?: number;
  boostCount?: number;
}

/**
 * Extended platform type that includes platforms not in Prisma enum
 * Use this for runtime platform identification
 */
export type ExtendedSocialPlatform = SocialPlatform | "YOUTUBE" | "DISCORD";

// =============================================================================
// Comment Preview Types
// =============================================================================

/**
 * A comment preview for display in the stream feed
 * Normalized across all platforms
 */
export interface CommentPreview {
  /** Platform-specific comment ID */
  id: string;
  /** Comment text content */
  content: string;
  /** Display name of the commenter */
  senderName: string;
  /** Avatar URL of the commenter (if available) */
  senderAvatarUrl?: string;
  /** When the comment was created */
  createdAt: Date;
}

// =============================================================================
// Stream Types (Unified Feed)
// =============================================================================

/**
 * Extended post type for the unified stream feed
 * Includes account context and engagement capabilities
 */
export interface StreamPost extends SocialPost {
  /** Reference to the SocialAccount.id in the database */
  accountId: string;
  /** Display name of the connected account */
  accountName: string;
  /** Profile picture URL of the connected account */
  accountAvatarUrl?: string;
  /** Whether this platform supports liking posts */
  canLike: boolean;
  /** Whether this platform supports replying to posts */
  canReply: boolean;
  /** Whether this platform supports sharing/retweeting posts */
  canShare: boolean;
  /** Whether the current user has liked this post (if trackable) */
  isLiked?: boolean;
  /** Preview of recent comments (2-3 most recent) */
  commentPreviews?: CommentPreview[];
}

/**
 * Sort options for the stream feed
 */
export type StreamSortBy =
  | "publishedAt"
  | "likes"
  | "comments"
  | "engagementRate";

/**
 * Sort order direction
 */
export type StreamSortOrder = "asc" | "desc";

/**
 * Filter configuration for the stream feed
 */
export interface StreamFilter {
  /** Filter by specific platforms (empty = all platforms) */
  platforms?: SocialPlatform[];
  /** Filter by date range */
  dateRange?: {
    start: Date;
    end: Date;
  };
  /** Sort field */
  sortBy: StreamSortBy;
  /** Sort direction */
  sortOrder: StreamSortOrder;
  /** Search query to filter by content */
  searchQuery?: string;
}

/**
 * Response from the streams API
 */
export interface StreamsResponse {
  /** List of posts in the feed */
  posts: StreamPost[];
  /** Connected accounts info for filtering UI */
  accounts: Array<{
    id: string;
    platform: SocialPlatform;
    accountName: string;
    avatarUrl?: string;
  }>;
  /** Cursor for pagination */
  nextCursor?: string;
  /** Whether more posts are available */
  hasMore: boolean;
  /** Any errors that occurred while fetching (per-account) */
  errors?: Array<{
    accountId: string;
    platform: SocialPlatform;
    message: string;
  }>;
}

/**
 * Query parameters for the streams API
 */
export interface StreamsQueryParams {
  workspaceId: string;
  platforms?: SocialPlatform[];
  limit?: number;
  sortBy?: StreamSortBy;
  sortOrder?: StreamSortOrder;
  startDate?: string;
  endDate?: string;
  cursor?: string;
  searchQuery?: string;
  /** Whether to include comment previews for each post */
  includeComments?: boolean;
}

/**
 * Platform engagement capabilities
 */
export const PLATFORM_CAPABILITIES: Record<
  SocialPlatform,
  { canLike: boolean; canReply: boolean; canShare: boolean; }
> = {
  TWITTER: { canLike: true, canReply: true, canShare: true },
  FACEBOOK: { canLike: true, canReply: true, canShare: false },
  INSTAGRAM: { canLike: true, canReply: true, canShare: false },
  LINKEDIN: { canLike: true, canReply: true, canShare: false },
  TIKTOK: { canLike: false, canReply: false, canShare: false }, // Not yet implemented
  YOUTUBE: { canLike: true, canReply: true, canShare: false }, // Fully implemented
  DISCORD: { canLike: false, canReply: false, canShare: false }, // Not yet implemented
};
