/**
 * YouTube Data API v3 Client
 *
 * Implements ISocialClient interface for YouTube channel management
 * Uses Google OAuth 2.0 for authentication
 * API Reference: https://developers.google.com/youtube/v3
 *
 * NOTE: YouTube is NOT in the Prisma SocialPlatform enum.
 * Database storage requires a schema migration to add YOUTUBE to the enum.
 * Until then, channel info can be returned but not persisted to SocialAccount.
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
const GOOGLE_OAUTH_AUTHORIZE = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

// YouTube Data API scopes
// - youtube.readonly: Read channel info, videos, playlists
// - youtube.force-ssl: Required for write operations (updating video metadata)
const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/youtube.force-ssl",
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
 * YouTube Data API Client
 *
 * Note: YouTube uses the term "channel" for user accounts.
 * This client allows reading channel data and video statistics.
 * Video uploads must be done through YouTube Studio.
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
   * @returns Channel info normalized to SocialAccountInfo
   */
  async getAccountInfo(): Promise<SocialAccountInfo> {
    const token = this.getAccessTokenOrThrow();

    const params = new URLSearchParams({
      part: "snippet,statistics",
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
        `Failed to get YouTube channel info: ${errorData.error?.message || response.statusText}`,
      );
    }

    const data = (await response.json()) as YouTubeChannelResponse;

    if (!data.items || data.items.length === 0) {
      throw new Error("No YouTube channel found for this account");
    }

    const channel = data.items[0]!;
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
   * Create a post - NOT SUPPORTED for YouTube
   *
   * YouTube videos must be uploaded through YouTube Studio or the
   * resumable upload API (which requires video file data).
   *
   * @throws Error always - use YouTube Studio to upload videos
   */
  async createPost(
    _content: string,
    _options?: PostOptions,
  ): Promise<PostResult> {
    throw new Error(
      "YouTube does not support direct post creation. " +
        "Use YouTube Studio (https://studio.youtube.com) to upload videos.",
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
