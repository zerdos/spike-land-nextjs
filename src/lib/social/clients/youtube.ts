/**
 * YouTube Data API v3 Client
 *
 * Implements ISocialClient interface for YouTube channel management
 * Uses Google OAuth 2.0 for authentication
 * API Reference: https://developers.google.com/youtube/v3
 */

import type {
  ISocialClient,
  OAuthTokenResponse,
  PostOptions,
  PostResult,
  SocialAccountInfo,
  SocialClientOptions,
  SocialMetricsData,
  SocialPost,
} from "../types";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
const YOUTUBE_UPLOAD_BASE = "https://www.googleapis.com/upload/youtube/v3";
const YOUTUBE_ANALYTICS_BASE = "https://youtubeanalytics.googleapis.com/v2";
const GOOGLE_OAUTH_AUTHORIZE = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

// YouTube Data API scopes
// - youtube.readonly: Read channel info, videos, playlists, analytics
// - youtube.force-ssl: Required for write operations (comments, video metadata)
// - youtube.upload: Required for video uploads
const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/youtube.force-ssl",
  "https://www.googleapis.com/auth/youtube.upload",
].join(" ");

/**
 * YouTube API error response structure
 */
interface YouTubeApiError {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    errors?: Array<{
      message: string;
      domain: string;
      reason: string;
    }>;
  };
}

/**
 * YouTube channel response from /channels endpoint
 */
interface YouTubeChannelResponse {
  kind: string;
  etag: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items?: YouTubeChannel[];
}

interface YouTubeChannel {
  kind: string;
  etag: string;
  id: string;
  snippet?: {
    title: string;
    description: string;
    customUrl?: string;
    publishedAt: string;
    thumbnails?: {
      default?: { url: string; width: number; height: number; };
      medium?: { url: string; width: number; height: number; };
      high?: { url: string; width: number; height: number; };
    };
    localized?: {
      title: string;
      description: string;
    };
    country?: string;
  };
  statistics?: {
    viewCount: string;
    subscriberCount: string;
    hiddenSubscriberCount: boolean;
    videoCount: string;
  };
  contentDetails?: {
    relatedPlaylists?: {
      uploads: string;
    };
  };
}

/**
 * YouTube video search response
 */
interface YouTubeSearchResponse {
  kind: string;
  etag: string;
  nextPageToken?: string;
  prevPageToken?: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items?: YouTubeSearchItem[];
}

interface YouTubeSearchItem {
  kind: string;
  etag: string;
  id: {
    kind: string;
    videoId?: string;
    channelId?: string;
    playlistId?: string;
  };
  snippet?: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails?: {
      default?: { url: string; width: number; height: number; };
      medium?: { url: string; width: number; height: number; };
      high?: { url: string; width: number; height: number; };
    };
    channelTitle: string;
    liveBroadcastContent: string;
  };
}

/**
 * YouTube video details response
 */
interface YouTubeVideoResponse {
  kind: string;
  etag: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items?: YouTubeVideo[];
}

interface YouTubeVideo {
  kind: string;
  etag: string;
  id: string;
  snippet?: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails?: {
      default?: { url: string; width: number; height: number; };
      medium?: { url: string; width: number; height: number; };
      high?: { url: string; width: number; height: number; };
      standard?: { url: string; width: number; height: number; };
      maxres?: { url: string; width: number; height: number; };
    };
    channelTitle: string;
    tags?: string[];
    categoryId: string;
    liveBroadcastContent: string;
    localized?: {
      title: string;
      description: string;
    };
  };
  contentDetails?: {
    duration: string;
    dimension: string;
    definition: string;
    caption: string;
    licensedContent: boolean;
    contentRating?: Record<string, unknown>;
  };
  statistics?: {
    viewCount: string;
    likeCount: string;
    dislikeCount?: string;
    favoriteCount: string;
    commentCount: string;
  };
}

/**
 * Extended types for YouTube-specific data
 */
export interface YouTubeVideoDetails {
  id: string;
  title: string;
  description: string;
  publishedAt: Date;
  thumbnailUrl?: string;
  duration?: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  url: string;
  tags?: string[];
}

export interface YouTubeChannelMetrics {
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
  hiddenSubscriberCount: boolean;
}

/**
 * Video metadata for upload
 */
export interface YouTubeVideoMetadata {
  title: string;
  description?: string;
  tags?: string[];
  categoryId?: string;
  privacyStatus?: "public" | "private" | "unlisted";
}

/**
 * Resumable upload session response
 */
export interface YouTubeUploadSession {
  uploadUrl: string;
  expiresAt: Date;
}

/**
 * Video upload chunk response
 */
export interface YouTubeUploadChunkResult {
  bytesUploaded: number;
  isComplete: boolean;
  videoId?: string;
}

/**
 * Video processing status
 */
export interface YouTubeVideoProcessingStatus {
  status: "processing" | "succeeded" | "failed";
  processingProgress?: {
    partsTotal: number;
    partsProcessed: number;
    timeLeftMs?: number;
  };
}

/**
 * YouTube comment data
 */
export interface YouTubeCommentData {
  id: string;
  authorName: string;
  authorChannelId: string;
  authorProfileImageUrl?: string;
  textDisplay: string;
  textOriginal: string;
  likeCount: number;
  publishedAt: Date;
  updatedAt: Date;
  moderationStatus: string;
  canReply: boolean;
  totalReplyCount: number;
  replies?: YouTubeCommentData[];
}

/**
 * Comments list response
 */
export interface YouTubeCommentsResponse {
  comments: YouTubeCommentData[];
  nextPageToken?: string;
  totalResults: number;
}

/**
 * Reply creation response
 */
export interface YouTubeReplyResult {
  replyId: string;
  publishedAt: Date;
}

/**
 * Bulk moderation result
 */
export interface YouTubeBulkModerateResult {
  succeeded: string[];
  failed: Array<{ id: string; error: string }>;
}

/**
 * Video analytics data
 */
export interface YouTubeVideoAnalytics {
  videoId: string;
  metrics: Record<string, number>;
  dimensionData?: Array<{
    dimension: string;
    value: string;
    metrics: Record<string, number>;
  }>;
}

/**
 * Traffic source data
 */
export interface YouTubeTrafficSource {
  source: string;
  views: number;
  watchTime: number;
}

/**
 * Audience retention data point
 */
export interface YouTubeRetentionData {
  elapsedVideoTimeRatio: number;
  audienceWatchRatio: number;
}

/**
 * Viewer demographics data
 */
export interface YouTubeViewerDemographics {
  ageGroups: Array<{ ageGroup: string; percentage: number }>;
  gender: { male: number; female: number; other: number };
  topCountries: Array<{ country: string; views: number }>;
}

/**
 * Playlist data
 */
export interface YouTubePlaylist {
  id: string;
  title: string;
  description?: string;
  itemCount: number;
  privacyStatus: string;
}

/**
 * Comment thread response from YouTube API
 */
interface YouTubeCommentThreadResponse {
  kind: string;
  etag: string;
  nextPageToken?: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items?: Array<{
    kind: string;
    etag: string;
    id: string;
    snippet: {
      topLevelComment: {
        kind: string;
        etag: string;
        id: string;
        snippet: {
          authorDisplayName: string;
          authorChannelId: {
            value: string;
          };
          authorProfileImageUrl?: string;
          textDisplay: string;
          textOriginal: string;
          likeCount: number;
          publishedAt: string;
          updatedAt: string;
          canRate: boolean;
          viewerRating: string;
        };
      };
      canReply: boolean;
      totalReplyCount: number;
      isPublic: boolean;
    };
    replies?: {
      comments: Array<{
        kind: string;
        etag: string;
        id: string;
        snippet: {
          authorDisplayName: string;
          authorChannelId: {
            value: string;
          };
          authorProfileImageUrl?: string;
          textDisplay: string;
          textOriginal: string;
          likeCount: number;
          publishedAt: string;
          updatedAt: string;
          parentId: string;
          canRate: boolean;
          viewerRating: string;
        };
      }>;
    };
  }>;
}

/**
 * YouTube Data API Client
 *
 * Note: YouTube uses the term "channel" for user accounts.
 * This client allows reading channel data and video statistics,
 * uploading videos with resumable protocol, managing comments,
 * and retrieving comprehensive analytics.
 */
export class YouTubeClient implements ISocialClient {
  readonly platform = "YOUTUBE" as const;

  private accessToken?: string;
  private channelId?: string;

  constructor(options?: SocialClientOptions) {
    this.accessToken = options?.accessToken;
    this.channelId = options?.accountId;
  }

  /**
   * Generate Google OAuth 2.0 authorization URL for YouTube access
   *
   * @param redirectUri - The callback URL after authorization
   * @param state - State parameter for CSRF protection
   * @returns Authorization URL to redirect the user to
   */
  getAuthUrl(redirectUri: string, state: string): string {
    const clientId = process.env.YOUTUBE_CLIENT_ID ||
      process.env.GOOGLE_CLIENT_ID ||
      process.env.GOOGLE_ID;

    if (!clientId) {
      throw new Error(
        "YOUTUBE_CLIENT_ID, GOOGLE_CLIENT_ID, or GOOGLE_ID environment variable is not configured",
      );
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: YOUTUBE_SCOPES,
      state,
      // access_type=offline ensures we get a refresh token
      access_type: "offline",
      // prompt=consent ensures refresh token is returned even for returning users
      prompt: "consent",
      // Include granted scopes in response
      include_granted_scopes: "true",
    });

    return `${GOOGLE_OAUTH_AUTHORIZE}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access and refresh tokens
   *
   * @param code - The authorization code from OAuth callback
   * @param redirectUri - The same redirect URI used in getAuthUrl
   * @returns Token response with access and refresh tokens
   */
  async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
  ): Promise<OAuthTokenResponse> {
    const clientId = process.env.YOUTUBE_CLIENT_ID ||
      process.env.GOOGLE_CLIENT_ID ||
      process.env.GOOGLE_ID;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET ||
      process.env.GOOGLE_CLIENT_SECRET ||
      process.env.GOOGLE_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error(
        "YouTube OAuth credentials not configured. Set YOUTUBE_CLIENT_ID/YOUTUBE_CLIENT_SECRET or GOOGLE_ID/GOOGLE_SECRET",
      );
    }

    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    });

    const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as YouTubeApiError;
      throw new Error(
        `Google token exchange failed: ${errorData.error?.message || response.statusText}`,
      );
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      token_type: string;
      scope?: string;
    };

    // Store access token for subsequent API calls
    this.accessToken = data.access_token;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
      tokenType: data.token_type,
      scope: data.scope,
    };
  }

  /**
   * Refresh an expired access token using the refresh token
   *
   * @param refreshToken - The refresh token from initial authorization
   * @returns New token response (refresh token may be unchanged)
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse> {
    const clientId = process.env.YOUTUBE_CLIENT_ID ||
      process.env.GOOGLE_CLIENT_ID ||
      process.env.GOOGLE_ID;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET ||
      process.env.GOOGLE_CLIENT_SECRET ||
      process.env.GOOGLE_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error(
        "YouTube OAuth credentials not configured. Set YOUTUBE_CLIENT_ID/YOUTUBE_CLIENT_SECRET or GOOGLE_ID/GOOGLE_SECRET",
      );
    }

    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });

    const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as YouTubeApiError;
      throw new Error(
        `Google token refresh failed: ${errorData.error?.message || response.statusText}`,
      );
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      token_type: string;
      scope?: string;
    };

    this.accessToken = data.access_token;

    return {
      accessToken: data.access_token,
      // Google may not return a new refresh token on refresh
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
      tokenType: data.token_type,
      scope: data.scope,
    };
  }

  /**
   * Get the authenticated user's YouTube channel information
   *
   * First tries mine=true for directly owned channels, then falls back to
   * managedByMe=true for Brand Account channels the user can manage.
   *
   * @returns Channel info normalized to SocialAccountInfo
   */
  async getAccountInfo(): Promise<SocialAccountInfo> {
    const token = this.getAccessTokenOrThrow();

    // First try: Get channel owned by the authenticated account
    const mineParams = new URLSearchParams({
      part: "snippet,statistics",
      mine: "true",
    });

    const mineResponse = await fetch(
      `${YOUTUBE_API_BASE}/channels?${mineParams.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (mineResponse.ok) {
      const mineData = (await mineResponse.json()) as YouTubeChannelResponse;
      if (mineData.items && mineData.items.length > 0) {
        return this.channelToAccountInfo(mineData.items[0]!);
      }
    }

    // Second try: Get channels the user can manage (Brand Accounts)
    const managedParams = new URLSearchParams({
      part: "snippet,statistics",
      managedByMe: "true",
    });

    const managedResponse = await fetch(
      `${YOUTUBE_API_BASE}/channels?${managedParams.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!managedResponse.ok) {
      const errorData = (await managedResponse.json().catch(() => ({}))) as YouTubeApiError;
      throw new Error(
        `Failed to get YouTube channel info: ${
          errorData.error?.message || managedResponse.statusText
        }`,
      );
    }

    const managedData = (await managedResponse.json()) as YouTubeChannelResponse;

    if (!managedData.items || managedData.items.length === 0) {
      throw new Error(
        "No YouTube channel found for this account. Please ensure you have a YouTube channel " +
          "associated with the Google account you selected. You can create one at " +
          "https://www.youtube.com/channel_switcher then click 'Create a channel'.",
      );
    }

    // Return the first managed channel (user can manage multiple)
    return this.channelToAccountInfo(managedData.items[0]!);
  }

  /**
   * Convert a YouTube channel response to SocialAccountInfo
   */
  private channelToAccountInfo(channel: YouTubeChannel): SocialAccountInfo {
    this.channelId = channel.id;

    const snippet = channel.snippet;
    const statistics = channel.statistics;

    return {
      platformId: channel.id,
      username: snippet?.customUrl || channel.id,
      displayName: snippet?.title || "Unknown Channel",
      profileUrl: snippet?.customUrl
        ? `https://www.youtube.com/${snippet.customUrl}`
        : `https://www.youtube.com/channel/${channel.id}`,
      avatarUrl: snippet?.thumbnails?.high?.url ||
        snippet?.thumbnails?.medium?.url ||
        snippet?.thumbnails?.default?.url,
      followersCount: statistics?.subscriberCount
        ? parseInt(statistics.subscriberCount, 10)
        : undefined,
    };
  }

  /**
   * Create a post - NOT SUPPORTED via this method
   *
   * Use the resumable upload API methods instead:
   * - initiateResumableUpload()
   * - uploadVideoChunk()
   * - getVideoProcessingStatus()
   *
   * @throws Error always - use resumable upload methods
   */
  async createPost(
    _content: string,
    _options?: PostOptions,
  ): Promise<PostResult> {
    throw new Error(
      "YouTube videos must be uploaded using the resumable upload API. " +
        "Use initiateResumableUpload() and uploadVideoChunk() methods instead.",
    );
  }

  /**
   * Get the channel's recent videos
   *
   * @param limit - Maximum number of videos to return (default: 10, max: 50)
   * @returns Array of videos formatted as SocialPost
   */
  async getPosts(limit = 10): Promise<SocialPost[]> {
    const token = this.getAccessTokenOrThrow();

    // Ensure we have the channel ID
    if (!this.channelId) {
      await this.getAccountInfo();
    }

    const maxResults = Math.min(Math.max(limit, 1), 50);

    // First, search for videos from this channel
    const searchParams = new URLSearchParams({
      part: "snippet",
      forMine: "true",
      type: "video",
      maxResults: maxResults.toString(),
      order: "date",
    });

    const searchResponse = await fetch(
      `${YOUTUBE_API_BASE}/search?${searchParams.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!searchResponse.ok) {
      const errorData = (await searchResponse.json().catch(() => ({}))) as YouTubeApiError;
      throw new Error(
        `Failed to search YouTube videos: ${errorData.error?.message || searchResponse.statusText}`,
      );
    }

    const searchData = (await searchResponse.json()) as YouTubeSearchResponse;

    if (!searchData.items || searchData.items.length === 0) {
      return [];
    }

    // Get video IDs for detailed statistics
    const videoIds = searchData.items
      .map((item) => item.id.videoId)
      .filter((id): id is string => !!id);

    if (videoIds.length === 0) {
      return [];
    }

    // Fetch detailed video statistics
    const videoParams = new URLSearchParams({
      part: "snippet,statistics",
      id: videoIds.join(","),
    });

    const videoResponse = await fetch(
      `${YOUTUBE_API_BASE}/videos?${videoParams.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!videoResponse.ok) {
      // Fall back to search results without statistics
      return searchData.items.map((item) => ({
        id: item.id.videoId || item.etag,
        platformPostId: item.id.videoId || "",
        platform: "YOUTUBE" as const,
        content: item.snippet?.title || "",
        publishedAt: item.snippet?.publishedAt
          ? new Date(item.snippet.publishedAt)
          : new Date(),
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        rawData: item as unknown as Record<string, unknown>,
      }));
    }

    const videoData = (await videoResponse.json()) as YouTubeVideoResponse;

    return (videoData.items || []).map((video) => ({
      id: video.id,
      platformPostId: video.id,
      platform: "YOUTUBE" as const,
      content: video.snippet?.title || "",
      mediaUrls: video.snippet?.thumbnails?.high?.url
        ? [video.snippet.thumbnails.high.url]
        : undefined,
      publishedAt: video.snippet?.publishedAt
        ? new Date(video.snippet.publishedAt)
        : new Date(),
      url: `https://www.youtube.com/watch?v=${video.id}`,
      metrics: video.statistics
        ? {
          likes: parseInt(video.statistics.likeCount || "0", 10),
          comments: parseInt(video.statistics.commentCount || "0", 10),
          shares: 0, // YouTube doesn't expose share count
          impressions: parseInt(video.statistics.viewCount || "0", 10),
        }
        : undefined,
      rawData: video as unknown as Record<string, unknown>,
    }));
  }

  /**
   * Get channel-level metrics
   *
   * @returns Metrics including subscriber count, total views, video count
   */
  async getMetrics(): Promise<SocialMetricsData> {
    const token = this.getAccessTokenOrThrow();

    const params = new URLSearchParams({
      part: "statistics",
      mine: "true",
    });

    const response = await fetch(
      `${YOUTUBE_API_BASE}/channels?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as YouTubeApiError;
      throw new Error(
        `Failed to get YouTube metrics: ${errorData.error?.message || response.statusText}`,
      );
    }

    const data = (await response.json()) as YouTubeChannelResponse;

    if (!data.items || data.items.length === 0) {
      throw new Error("No YouTube channel found for this account");
    }

    const statistics = data.items[0]!.statistics;

    return {
      followers: statistics?.subscriberCount
        ? parseInt(statistics.subscriberCount, 10)
        : 0,
      following: 0, // YouTube channels don't "follow" others
      postsCount: statistics?.videoCount
        ? parseInt(statistics.videoCount, 10)
        : 0,
      impressions: statistics?.viewCount
        ? parseInt(statistics.viewCount, 10)
        : 0,
    };
  }

  /**
   * Get detailed information for a specific video
   *
   * @param videoId - The YouTube video ID
   * @returns Detailed video information including statistics
   */
  async getVideoDetails(videoId: string): Promise<YouTubeVideoDetails> {
    const token = this.getAccessTokenOrThrow();

    const params = new URLSearchParams({
      part: "snippet,statistics,contentDetails",
      id: videoId,
    });

    const response = await fetch(
      `${YOUTUBE_API_BASE}/videos?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as YouTubeApiError;
      throw new Error(
        `Failed to get video details: ${errorData.error?.message || response.statusText}`,
      );
    }

    const data = (await response.json()) as YouTubeVideoResponse;

    if (!data.items || data.items.length === 0) {
      throw new Error(`Video not found: ${videoId}`);
    }

    const video = data.items[0]!;

    return {
      id: video.id,
      title: video.snippet?.title || "",
      description: video.snippet?.description || "",
      publishedAt: video.snippet?.publishedAt
        ? new Date(video.snippet.publishedAt)
        : new Date(),
      thumbnailUrl: video.snippet?.thumbnails?.maxres?.url ||
        video.snippet?.thumbnails?.high?.url ||
        video.snippet?.thumbnails?.medium?.url,
      duration: video.contentDetails?.duration,
      viewCount: parseInt(video.statistics?.viewCount || "0", 10),
      likeCount: parseInt(video.statistics?.likeCount || "0", 10),
      commentCount: parseInt(video.statistics?.commentCount || "0", 10),
      url: `https://www.youtube.com/watch?v=${video.id}`,
      tags: video.snippet?.tags,
    };
  }

  /**
   * Get channel metrics in YouTube-specific format
   *
   * @returns YouTube-specific channel metrics
   */
  async getChannelMetrics(): Promise<YouTubeChannelMetrics> {
    const token = this.getAccessTokenOrThrow();

    const params = new URLSearchParams({
      part: "statistics",
      mine: "true",
    });

    const response = await fetch(
      `${YOUTUBE_API_BASE}/channels?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as YouTubeApiError;
      throw new Error(
        `Failed to get YouTube channel metrics: ${errorData.error?.message || response.statusText}`,
      );
    }

    const data = (await response.json()) as YouTubeChannelResponse;

    if (!data.items || data.items.length === 0) {
      throw new Error("No YouTube channel found for this account");
    }

    const statistics = data.items[0]!.statistics;

    return {
      subscriberCount: statistics?.subscriberCount
        ? parseInt(statistics.subscriberCount, 10)
        : 0,
      viewCount: statistics?.viewCount ? parseInt(statistics.viewCount, 10) : 0,
      videoCount: statistics?.videoCount
        ? parseInt(statistics.videoCount, 10)
        : 0,
      hiddenSubscriberCount: statistics?.hiddenSubscriberCount || false,
    };
  }

  /**
   * Set the access token for API calls
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  /**
   * Set the channel ID
   */
  setChannelId(channelId: string): void {
    this.channelId = channelId;
  }

  // =============================================================================
  // Video Upload Methods (Resumable Upload Protocol)
  // =============================================================================

  /**
   * Initiate a resumable upload session for a video
   *
   * @param videoMetadata - Video title, description, tags, etc.
   * @returns Upload session URL and expiration time
   */
  async initiateResumableUpload(
    videoMetadata: YouTubeVideoMetadata,
  ): Promise<YouTubeUploadSession> {
    const token = this.getAccessTokenOrThrow();

    const body = {
      snippet: {
        title: videoMetadata.title,
        description: videoMetadata.description || "",
        tags: videoMetadata.tags || [],
        categoryId: videoMetadata.categoryId || "22", // Default: People & Blogs
      },
      status: {
        privacyStatus: videoMetadata.privacyStatus || "private",
      },
    };

    const response = await fetch(
      `${YOUTUBE_UPLOAD_BASE}/videos?uploadType=resumable&part=snippet,status`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Upload-Content-Type": "video/*",
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as YouTubeApiError;
      throw new Error(
        `Failed to initiate video upload: ${errorData.error?.message || response.statusText}`,
      );
    }

    const uploadUrl = response.headers.get("Location");
    if (!uploadUrl) {
      throw new Error("Upload session URL not returned by YouTube API");
    }

    // Sessions expire after 24 hours
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    return {
      uploadUrl,
      expiresAt,
    };
  }

  /**
   * Upload a video chunk using resumable upload protocol
   *
   * @param uploadUrl - The upload session URL from initiateResumableUpload
   * @param videoData - Buffer or ReadableStream of video data
   * @param chunkStart - Starting byte position
   * @param chunkEnd - Ending byte position (inclusive)
   * @param totalSize - Total file size in bytes
   * @returns Upload progress and video ID when complete
   */
  async uploadVideoChunk(
    uploadUrl: string,
    videoData: Buffer | ReadableStream,
    chunkStart: number,
    chunkEnd: number,
    totalSize: number,
  ): Promise<YouTubeUploadChunkResult> {
    const chunkSize = chunkEnd - chunkStart + 1;

    const fetchOptions: RequestInit & { duplex?: "half" } = {
      method: "PUT",
      headers: {
        "Content-Length": chunkSize.toString(),
        "Content-Range": `bytes ${chunkStart}-${chunkEnd}/${totalSize}`,
      },
      // Type assertion needed because Buffer is compatible with BodyInit
      body: videoData as BodyInit,
    };

    // duplex is required for streaming but not in TypeScript types yet
    if (videoData instanceof ReadableStream) {
      fetchOptions.duplex = "half";
    }

    const response = await fetch(uploadUrl, fetchOptions);

    // 308 Resume Incomplete - Continue uploading
    if (response.status === 308) {
      const rangeHeader = response.headers.get("Range");
      const bytesUploaded = rangeHeader
        ? parseInt(rangeHeader.split("-")[1] || "0", 10) + 1
        : chunkEnd + 1;

      return {
        bytesUploaded,
        isComplete: false,
      };
    }

    // 200/201 Success - Upload complete
    if (response.ok) {
      const data = (await response.json()) as YouTubeVideo;
      return {
        bytesUploaded: totalSize,
        isComplete: true,
        videoId: data.id,
      };
    }

    // Handle errors
    const errorData = (await response.json().catch(() => ({}))) as YouTubeApiError;
    throw new Error(
      `Video chunk upload failed: ${errorData.error?.message || response.statusText}`,
    );
  }

  /**
   * Get video processing status
   *
   * @param videoId - The YouTube video ID
   * @returns Processing status and progress
   */
  async getVideoProcessingStatus(
    videoId: string,
  ): Promise<YouTubeVideoProcessingStatus> {
    const token = this.getAccessTokenOrThrow();

    const params = new URLSearchParams({
      part: "processingDetails,status",
      id: videoId,
    });

    const response = await fetch(
      `${YOUTUBE_API_BASE}/videos?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as YouTubeApiError;
      throw new Error(
        `Failed to get video processing status: ${errorData.error?.message || response.statusText}`,
      );
    }

    const data = (await response.json()) as YouTubeVideoResponse;

    if (!data.items || data.items.length === 0) {
      throw new Error(`Video not found: ${videoId}`);
    }

    const video = data.items[0] as unknown as {
      processingDetails?: {
        processingStatus: string;
        processingProgress?: {
          partsTotal: string;
          partsProcessed: string;
          timeLeftMs: string;
        };
      };
    };

    const processingDetails = video.processingDetails;
    const processingStatus = processingDetails?.processingStatus as
      | "processing"
      | "succeeded"
      | "failed"
      | undefined;

    return {
      status: processingStatus || "succeeded",
      processingProgress: processingDetails?.processingProgress
        ? {
          partsTotal: parseInt(
            processingDetails.processingProgress.partsTotal,
            10,
          ),
          partsProcessed: parseInt(
            processingDetails.processingProgress.partsProcessed,
            10,
          ),
          timeLeftMs: parseInt(
            processingDetails.processingProgress.timeLeftMs,
            10,
          ),
        }
        : undefined,
    };
  }

  /**
   * Update video metadata after upload
   *
   * @param videoId - The YouTube video ID
   * @param updates - Metadata fields to update
   */
  async updateVideoMetadata(
    videoId: string,
    updates: {
      title?: string;
      description?: string;
      tags?: string[];
      categoryId?: string;
    },
  ): Promise<void> {
    const token = this.getAccessTokenOrThrow();

    const body = {
      id: videoId,
      snippet: updates,
    };

    const response = await fetch(
      `${YOUTUBE_API_BASE}/videos?part=snippet`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as YouTubeApiError;
      throw new Error(
        `Failed to update video metadata: ${errorData.error?.message || response.statusText}`,
      );
    }
  }

  // =============================================================================
  // Comment Management Methods
  // =============================================================================

  /**
   * Get comments for a video
   *
   * @param videoId - The YouTube video ID
   * @param options - Pagination and formatting options
   * @returns Comments list with pagination info
   */
  async getVideoComments(
    videoId: string,
    options?: {
      maxResults?: number;
      pageToken?: string;
      order?: "time" | "relevance";
      textFormat?: "html" | "plainText";
    },
  ): Promise<YouTubeCommentsResponse> {
    const token = this.getAccessTokenOrThrow();

    const params = new URLSearchParams({
      part: "snippet,replies",
      videoId,
      maxResults: Math.min(options?.maxResults || 100, 100).toString(),
      order: options?.order || "time",
      textFormat: options?.textFormat || "plainText",
    });

    if (options?.pageToken) {
      params.set("pageToken", options.pageToken);
    }

    const response = await fetch(
      `${YOUTUBE_API_BASE}/commentThreads?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as YouTubeApiError;
      throw new Error(
        `Failed to get video comments: ${errorData.error?.message || response.statusText}`,
      );
    }

    const data = (await response.json()) as YouTubeCommentThreadResponse;

    const comments: YouTubeCommentData[] = (data.items || []).map((item) => {
      const topComment = item.snippet.topLevelComment.snippet;
      const comment: YouTubeCommentData = {
        id: item.snippet.topLevelComment.id,
        authorName: topComment.authorDisplayName,
        authorChannelId: topComment.authorChannelId.value,
        authorProfileImageUrl: topComment.authorProfileImageUrl,
        textDisplay: topComment.textDisplay,
        textOriginal: topComment.textOriginal,
        likeCount: topComment.likeCount,
        publishedAt: new Date(topComment.publishedAt),
        updatedAt: new Date(topComment.updatedAt),
        moderationStatus: "published",
        canReply: item.snippet.canReply,
        totalReplyCount: item.snippet.totalReplyCount,
      };

      // Add replies if present
      if (item.replies?.comments) {
        comment.replies = item.replies.comments.map((reply) => ({
          id: reply.id,
          authorName: reply.snippet.authorDisplayName,
          authorChannelId: reply.snippet.authorChannelId.value,
          authorProfileImageUrl: reply.snippet.authorProfileImageUrl,
          textDisplay: reply.snippet.textDisplay,
          textOriginal: reply.snippet.textOriginal,
          likeCount: reply.snippet.likeCount,
          publishedAt: new Date(reply.snippet.publishedAt),
          updatedAt: new Date(reply.snippet.updatedAt),
          moderationStatus: "published",
          canReply: true,
          totalReplyCount: 0,
        }));
      }

      return comment;
    });

    return {
      comments,
      nextPageToken: data.nextPageToken,
      totalResults: data.pageInfo.totalResults,
    };
  }

  /**
   * Reply to a comment
   *
   * @param commentId - The parent comment ID
   * @param replyText - Reply text
   * @returns Reply ID and publish time
   */
  async replyToComment(
    commentId: string,
    replyText: string,
  ): Promise<YouTubeReplyResult> {
    const token = this.getAccessTokenOrThrow();

    const body = {
      snippet: {
        parentId: commentId,
        textOriginal: replyText,
      },
    };

    const response = await fetch(
      `${YOUTUBE_API_BASE}/comments?part=snippet`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as YouTubeApiError;
      throw new Error(
        `Failed to reply to comment: ${errorData.error?.message || response.statusText}`,
      );
    }

    const data = (await response.json()) as {
      id: string;
      snippet: { publishedAt: string };
    };

    return {
      replyId: data.id,
      publishedAt: new Date(data.snippet.publishedAt),
    };
  }

  /**
   * Moderate a comment (set moderation status)
   *
   * @param commentId - The comment ID
   * @param moderationStatus - New moderation status
   */
  async moderateComment(
    commentId: string,
    moderationStatus: "published" | "heldForReview" | "likelySpam" | "rejected",
  ): Promise<void> {
    const token = this.getAccessTokenOrThrow();

    const body = {
      id: commentId,
      snippet: {
        moderationStatus,
      },
    };

    const response = await fetch(
      `${YOUTUBE_API_BASE}/comments?part=snippet`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as YouTubeApiError;
      throw new Error(
        `Failed to moderate comment: ${errorData.error?.message || response.statusText}`,
      );
    }
  }

  /**
   * Bulk moderate multiple comments
   *
   * @param commentIds - Array of comment IDs
   * @param action - Moderation action to apply
   * @returns Results showing succeeded and failed comments
   */
  async bulkModerateComments(
    commentIds: string[],
    action: "approve" | "reject" | "spam",
  ): Promise<YouTubeBulkModerateResult> {
    const moderationStatus =
      action === "approve"
        ? "published"
        : action === "reject"
          ? "rejected"
          : "likelySpam";

    const results: YouTubeBulkModerateResult = {
      succeeded: [],
      failed: [],
    };

    // Process in parallel with Promise.allSettled
    const promises = commentIds.map(async (commentId) => {
      try {
        await this.moderateComment(
          commentId,
          moderationStatus as "published" | "heldForReview" | "likelySpam" | "rejected",
        );
        return { success: true, commentId };
      } catch (error) {
        return {
          success: false,
          commentId,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    const settled = await Promise.allSettled(promises);

    settled.forEach((result) => {
      if (result.status === "fulfilled") {
        if (result.value.success) {
          results.succeeded.push(result.value.commentId);
        } else {
          results.failed.push({
            id: result.value.commentId,
            error: result.value.error || "Unknown error",
          });
        }
      } else {
        // Promise rejected
        results.failed.push({
          id: "unknown",
          error: result.reason instanceof Error ? result.reason.message : "Unknown error",
        });
      }
    });

    return results;
  }

  /**
   * Delete a comment
   *
   * @param commentId - The comment ID to delete
   */
  async deleteComment(commentId: string): Promise<void> {
    const token = this.getAccessTokenOrThrow();

    const params = new URLSearchParams({
      id: commentId,
    });

    const response = await fetch(
      `${YOUTUBE_API_BASE}/comments?${params.toString()}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as YouTubeApiError;
      throw new Error(
        `Failed to delete comment: ${errorData.error?.message || response.statusText}`,
      );
    }
  }

  // =============================================================================
  // Analytics Methods
  // =============================================================================

  /**
   * Get comprehensive video analytics
   *
   * @param videoId - The YouTube video ID
   * @param metrics - Array of metric names (e.g., ['views', 'likes', 'comments'])
   * @param startDate - Analytics start date
   * @param endDate - Analytics end date
   * @param dimensions - Optional dimensions for grouping (e.g., ['day', 'country'])
   * @returns Video analytics data
   */
  async getVideoAnalytics(
    videoId: string,
    metrics: string[],
    startDate: Date,
    endDate: Date,
    dimensions?: string[],
  ): Promise<YouTubeVideoAnalytics> {
    const token = this.getAccessTokenOrThrow();

    const params = new URLSearchParams({
      ids: "channel==MINE",
      startDate: startDate.toISOString().split("T")[0]!,
      endDate: endDate.toISOString().split("T")[0]!,
      metrics: metrics.join(","),
      filters: `video==${videoId}`,
    });

    if (dimensions && dimensions.length > 0) {
      params.set("dimensions", dimensions.join(","));
    }

    const response = await fetch(
      `${YOUTUBE_ANALYTICS_BASE}/reports?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as YouTubeApiError;
      throw new Error(
        `Failed to get video analytics: ${errorData.error?.message || response.statusText}`,
      );
    }

    const data = (await response.json()) as {
      columnHeaders: Array<{ name: string; dataType: string }>;
      rows?: Array<Array<string | number>>;
    };

    // Parse metrics from first row (if no dimensions)
    const metricsData: Record<string, number> = {};
    if (data.rows && data.rows.length > 0 && !dimensions) {
      data.columnHeaders.forEach((header, index) => {
        const value = data.rows![0]![index];
        metricsData[header.name] = typeof value === "number" ? value : 0;
      });
    }

    // Parse dimension data
    let dimensionData;
    if (dimensions && data.rows && data.rows.length > 0) {
      dimensionData = data.rows.map((row) => {
        const dimValues: Record<string, string> = {};
        const rowMetrics: Record<string, number> = {};

        data.columnHeaders.forEach((header, index) => {
          const value = row[index];
          if (dimensions.includes(header.name)) {
            dimValues[header.name] = String(value);
          } else {
            rowMetrics[header.name] = typeof value === "number" ? value : 0;
          }
        });

        return {
          dimension: dimensions[0]!,
          value: dimValues[dimensions[0]!] || "",
          metrics: rowMetrics,
        };
      });
    }

    return {
      videoId,
      metrics: metricsData,
      dimensionData,
    };
  }

  /**
   * Get traffic sources for a video
   *
   * @param videoId - The YouTube video ID
   * @param startDate - Analytics start date
   * @param endDate - Analytics end date
   * @returns Traffic source data
   */
  async getTrafficSources(
    videoId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<YouTubeTrafficSource[]> {
    const token = this.getAccessTokenOrThrow();

    const params = new URLSearchParams({
      ids: "channel==MINE",
      startDate: startDate.toISOString().split("T")[0]!,
      endDate: endDate.toISOString().split("T")[0]!,
      metrics: "views,estimatedMinutesWatched",
      dimensions: "insightTrafficSourceType",
      filters: `video==${videoId}`,
      sort: "-views",
    });

    const response = await fetch(
      `${YOUTUBE_ANALYTICS_BASE}/reports?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as YouTubeApiError;
      throw new Error(
        `Failed to get traffic sources: ${errorData.error?.message || response.statusText}`,
      );
    }

    const data = (await response.json()) as {
      rows?: Array<[string, number, number]>;
    };

    return (data.rows || []).map(([source, views, watchTimeMinutes]) => ({
      source: String(source),
      views: Number(views),
      watchTime: Number(watchTimeMinutes),
    }));
  }

  /**
   * Get audience retention data for a video
   *
   * Note: Retention data may not be available immediately after video publishing
   *
   * @param videoId - The YouTube video ID
   * @returns Audience retention data points
   */
  async getAudienceRetention(
    videoId: string,
  ): Promise<YouTubeRetentionData[]> {
    const token = this.getAccessTokenOrThrow();

    const params = new URLSearchParams({
      ids: "channel==MINE",
      metrics: "audienceWatchRatio,elapsedVideoTimeRatio",
      filters: `video==${videoId}`,
    });

    const response = await fetch(
      `${YOUTUBE_ANALYTICS_BASE}/reports?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as YouTubeApiError;
      throw new Error(
        `Failed to get audience retention: ${errorData.error?.message || response.statusText}`,
      );
    }

    const data = (await response.json()) as {
      rows?: Array<[number, number]>;
    };

    return (data.rows || []).map(([audienceRatio, elapsedRatio]) => ({
      audienceWatchRatio: Number(audienceRatio),
      elapsedVideoTimeRatio: Number(elapsedRatio),
    }));
  }

  /**
   * Get viewer demographics for a video
   *
   * @param videoId - The YouTube video ID
   * @param startDate - Analytics start date
   * @param endDate - Analytics end date
   * @returns Viewer demographics data
   */
  async getViewerDemographics(
    videoId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<YouTubeViewerDemographics> {
    const token = this.getAccessTokenOrThrow();

    // Get age/gender demographics
    const ageGenderParams = new URLSearchParams({
      ids: "channel==MINE",
      startDate: startDate.toISOString().split("T")[0]!,
      endDate: endDate.toISOString().split("T")[0]!,
      metrics: "viewerPercentage",
      dimensions: "ageGroup,gender",
      filters: `video==${videoId}`,
    });

    const ageGenderResponse = await fetch(
      `${YOUTUBE_ANALYTICS_BASE}/reports?${ageGenderParams.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    // Get geography data
    const geoParams = new URLSearchParams({
      ids: "channel==MINE",
      startDate: startDate.toISOString().split("T")[0]!,
      endDate: endDate.toISOString().split("T")[0]!,
      metrics: "views",
      dimensions: "country",
      filters: `video==${videoId}`,
      sort: "-views",
      maxResults: "10",
    });

    const geoResponse = await fetch(
      `${YOUTUBE_ANALYTICS_BASE}/reports?${geoParams.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const ageGenderData = ageGenderResponse.ok
      ? ((await ageGenderResponse.json()) as {
        rows?: Array<[string, string, number]>;
      })
      : { rows: [] };

    const geoData = geoResponse.ok
      ? ((await geoResponse.json()) as {
        rows?: Array<[string, number]>;
      })
      : { rows: [] };

    // Parse age groups
    const ageGroups: Record<string, number> = {};
    const genderData = { male: 0, female: 0, other: 0 };

    (ageGenderData.rows || []).forEach(([age, gender, percentage]) => {
      const ageStr = String(age);
      const genderStr = String(gender).toLowerCase();
      const pct = Number(percentage);

      if (!ageGroups[ageStr]) {
        ageGroups[ageStr] = 0;
      }
      ageGroups[ageStr] += pct;

      if (genderStr === "male") genderData.male += pct;
      else if (genderStr === "female") genderData.female += pct;
      else genderData.other += pct;
    });

    return {
      ageGroups: Object.entries(ageGroups).map(([ageGroup, percentage]) => ({
        ageGroup,
        percentage,
      })),
      gender: genderData,
      topCountries: (geoData.rows || []).map(([country, views]) => ({
        country: String(country),
        views: Number(views),
      })),
    };
  }

  /**
   * Get channel-level analytics
   *
   * @param metrics - Array of metric names
   * @param startDate - Analytics start date
   * @param endDate - Analytics end date
   * @returns Channel metrics data
   */
  async getChannelAnalytics(
    metrics: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<Record<string, number>> {
    const token = this.getAccessTokenOrThrow();

    const params = new URLSearchParams({
      ids: "channel==MINE",
      startDate: startDate.toISOString().split("T")[0]!,
      endDate: endDate.toISOString().split("T")[0]!,
      metrics: metrics.join(","),
    });

    const response = await fetch(
      `${YOUTUBE_ANALYTICS_BASE}/reports?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as YouTubeApiError;
      throw new Error(
        `Failed to get channel analytics: ${errorData.error?.message || response.statusText}`,
      );
    }

    const data = (await response.json()) as {
      columnHeaders: Array<{ name: string }>;
      rows?: Array<Array<number>>;
    };

    const metricsData: Record<string, number> = {};
    if (data.rows && data.rows.length > 0) {
      data.columnHeaders.forEach((header, index) => {
        metricsData[header.name] = data.rows![0]![index] || 0;
      });
    }

    return metricsData;
  }

  // =============================================================================
  // Playlist Management Methods (Optional)
  // =============================================================================

  /**
   * Get user's playlists
   *
   * @returns Array of playlists
   */
  async getPlaylists(): Promise<YouTubePlaylist[]> {
    const token = this.getAccessTokenOrThrow();

    const params = new URLSearchParams({
      part: "snippet,contentDetails,status",
      mine: "true",
      maxResults: "50",
    });

    const response = await fetch(
      `${YOUTUBE_API_BASE}/playlists?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as YouTubeApiError;
      throw new Error(
        `Failed to get playlists: ${errorData.error?.message || response.statusText}`,
      );
    }

    const data = (await response.json()) as {
      items?: Array<{
        id: string;
        snippet: {
          title: string;
          description?: string;
        };
        contentDetails: {
          itemCount: number;
        };
        status: {
          privacyStatus: string;
        };
      }>;
    };

    return (data.items || []).map((item) => ({
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      itemCount: item.contentDetails.itemCount,
      privacyStatus: item.status.privacyStatus,
    }));
  }

  /**
   * Create a new playlist
   *
   * @param title - Playlist title
   * @param description - Playlist description
   * @param privacyStatus - Privacy status
   * @returns Playlist ID
   */
  async createPlaylist(
    title: string,
    description?: string,
    privacyStatus: "public" | "private" | "unlisted" = "private",
  ): Promise<{ playlistId: string }> {
    const token = this.getAccessTokenOrThrow();

    const body = {
      snippet: {
        title,
        description: description || "",
      },
      status: {
        privacyStatus,
      },
    };

    const response = await fetch(
      `${YOUTUBE_API_BASE}/playlists?part=snippet,status`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as YouTubeApiError;
      throw new Error(
        `Failed to create playlist: ${errorData.error?.message || response.statusText}`,
      );
    }

    const data = (await response.json()) as { id: string };

    return {
      playlistId: data.id,
    };
  }

  /**
   * Add a video to a playlist
   *
   * @param playlistId - The playlist ID
   * @param videoId - The video ID to add
   * @param position - Optional position in playlist (0-based)
   */
  async addVideoToPlaylist(
    playlistId: string,
    videoId: string,
    position?: number,
  ): Promise<void> {
    const token = this.getAccessTokenOrThrow();

    const body: {
      snippet: {
        playlistId: string;
        resourceId: {
          kind: string;
          videoId: string;
        };
        position?: number;
      };
    } = {
      snippet: {
        playlistId,
        resourceId: {
          kind: "youtube#video",
          videoId,
        },
      },
    };

    if (position !== undefined) {
      body.snippet.position = position;
    }

    const response = await fetch(
      `${YOUTUBE_API_BASE}/playlistItems?part=snippet`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as YouTubeApiError;
      throw new Error(
        `Failed to add video to playlist: ${errorData.error?.message || response.statusText}`,
      );
    }
  }

  /**
   * Remove a video from a playlist
   *
   * @param playlistItemId - The playlist item ID (not the video ID)
   */
  async removeVideoFromPlaylist(playlistItemId: string): Promise<void> {
    const token = this.getAccessTokenOrThrow();

    const params = new URLSearchParams({
      id: playlistItemId,
    });

    const response = await fetch(
      `${YOUTUBE_API_BASE}/playlistItems?${params.toString()}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as YouTubeApiError;
      throw new Error(
        `Failed to remove video from playlist: ${errorData.error?.message || response.statusText}`,
      );
    }
  }

  /**
   * Get access token or throw if not set
   */
  private getAccessTokenOrThrow(): string {
    if (!this.accessToken) {
      throw new Error(
        "Access token is required. Call exchangeCodeForTokens first.",
      );
    }
    return this.accessToken;
  }
}
