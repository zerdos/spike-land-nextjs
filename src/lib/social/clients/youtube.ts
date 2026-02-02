/**
 * YouTube Data API v3 Client
 *
 * Implements ISocialClient interface for YouTube channel management
 * Uses Google OAuth 2.0 for authentication
 * API Reference: https://developers.google.com/youtube/v3
 */

import { YouTubeResumableUploader } from "../youtube/resumable-uploader";
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
// - youtube.upload: Required for uploading videos
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

export interface YouTubeComment {
  id: string;
  videoId: string;
  authorName: string;
  authorChannelId?: string;
  authorProfileImageUrl?: string;
  text: string;
  likeCount: number;
  publishedAt: Date;
  updatedAt: Date;
  parentId?: string; // Present if this is a reply
  replies?: YouTubeComment[]; // Nested replies
  totalReplyCount?: number;
}

export interface YouTubePlaylist {
  id: string;
  title: string;
  description: string;
  publishedAt: Date;
  thumbnailUrl?: string;
  privacyStatus: "public" | "private" | "unlisted";
  itemCount: number;
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
   * Upload a video to YouTube with resumable upload protocol
   *
   * @param content - Video title (required)
   * @param options - Video file, description, tags, privacy settings
   * @returns Upload result with video ID and processing status
   */
  async createPost(
    content: string,
    options?: PostOptions & {
      videoFile?: File | Buffer;
      description?: string;
      tags?: string[];
      categoryId?: string;
      privacyStatus?: "public" | "private" | "unlisted";
      scheduledPublishTime?: Date;
    },
  ): Promise<PostResult> {
    if (!options?.videoFile) {
      throw new Error(
        "YouTube requires a video file. Use videoFile option to upload a video.",
      );
    }

    const uploader = new YouTubeResumableUploader();
    const token = this.getAccessTokenOrThrow();

    // Initialize resumable upload
    const { uploadUrl, sessionId } = await uploader.initiate(
      token,
      {
        file: options.videoFile,
        title: content,
        description: options.description,
        tags: options.tags,
        categoryId: options.categoryId || "22", // Default to "People & Blogs"
        privacyStatus: options.privacyStatus || "private",
        publishAt: options.scheduledPublishTime?.toISOString(),
      },
    );

    // Upload in chunks
    const fileBuffer = options.videoFile instanceof Buffer
      ? options.videoFile
      : await this.fileToBuffer(options.videoFile);

    const chunkSize = 256 * 1024; // 256 KB
    let uploadedBytes = 0;
    let videoId: string | undefined;

    while (uploadedBytes < fileBuffer.length) {
      const chunk = fileBuffer.slice(uploadedBytes, uploadedBytes + chunkSize);
      const result = await uploader.uploadChunk(
        uploadUrl,
        chunk,
        uploadedBytes,
        fileBuffer.length,
      );

      uploadedBytes += chunk.length;

      if (result.status === "complete") {
        videoId = result.videoId;
        break;
      }
    }

    if (!videoId) {
      throw new Error("Video upload completed but no video ID returned");
    }

    return {
      platformPostId: videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      publishedAt: new Date(),
    };
  }

  private async fileToBuffer(file: File): Promise<Buffer> {
    const arrayBuffer = await file.arrayBuffer();
    return Buffer.from(arrayBuffer);
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
   * Update video metadata
   *
   * @param videoId - YouTube video ID
   * @param metadata - Fields to update
   * @returns Updated video details
   */
  async updateVideo(
    videoId: string,
    metadata: {
      title?: string;
      description?: string;
      tags?: string[];
      categoryId?: string;
      privacyStatus?: "public" | "private" | "unlisted";
      publishAt?: string;
    },
  ): Promise<YouTubeVideoDetails> {
    const token = this.getAccessTokenOrThrow();

    // First get current video to merge
    const currentResponse = await fetch(
      `${YOUTUBE_API_BASE}/videos?part=snippet,status,categoryDetails&id=${videoId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!currentResponse.ok) {
      throw new Error("Failed to fetch video for update");
    }

    const currentData = await currentResponse.json();
    const current = currentData.items?.[0];

    if (!current) {
      throw new Error(`Video not found: ${videoId}`);
    }

    const updateBody = {
      id: videoId,
      snippet: {
        title: metadata.title || current.snippet.title,
        description: metadata.description !== undefined
          ? metadata.description
          : current.snippet.description,
        tags: metadata.tags || current.snippet.tags,
        categoryId: metadata.categoryId || current.snippet.categoryId,
      },
      status: {
        privacyStatus: metadata.privacyStatus || current.status.privacyStatus,
        publishAt: metadata.publishAt || current.status.publishAt,
      },
    };

    // If setting publishAt, privacyStatus must be private
    if (metadata.publishAt) {
      updateBody.status.privacyStatus = "private";
    }

    const response = await fetch(
      `${YOUTUBE_API_BASE}/videos?part=snippet,status`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateBody),
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to update video: ${
          error.error?.message || response.statusText
        }`,
      );
    }

    // Return updated details
    return this.getVideoDetails(videoId);
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
   * Like a YouTube video
   *
   * Uses the videos.rate API endpoint to add a 'like' rating.
   * Requires youtube.force-ssl scope.
   *
   * @param videoId - The YouTube video ID to like
   */
  async likePost(videoId: string): Promise<void> {
    const token = this.getAccessTokenOrThrow();

    const params = new URLSearchParams({
      id: videoId,
      rating: "like",
    });

    const response = await fetch(
      `${YOUTUBE_API_BASE}/videos/rate?${params.toString()}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Length": "0",
        },
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as YouTubeApiError;
      throw new Error(
        `Failed to like YouTube video: ${errorData.error?.message || response.statusText}`,
      );
    }
  }

  /**
   * Unlike a YouTube video
   *
   * Uses the videos.rate API endpoint to remove the rating (set to 'none').
   * Requires youtube.force-ssl scope.
   *
   * @param videoId - The YouTube video ID to unlike
   */
  async unlikePost(videoId: string): Promise<void> {
    const token = this.getAccessTokenOrThrow();

    const params = new URLSearchParams({
      id: videoId,
      rating: "none",
    });

    const response = await fetch(
      `${YOUTUBE_API_BASE}/videos/rate?${params.toString()}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Length": "0",
        },
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as YouTubeApiError;
      throw new Error(
        `Failed to unlike YouTube video: ${errorData.error?.message || response.statusText}`,
      );
    }
  }

  /**
   * Get comment threads for a video
   *
   * @param videoId - YouTube video ID
   * @param options - Pagination and filtering options
   * @returns List of comment threads with replies
   */
  async getCommentThreads(
    videoId: string,
    options?: {
      maxResults?: number;
      pageToken?: string;
      order?: "time" | "relevance";
    },
  ): Promise<{
    comments: YouTubeComment[];
    nextPageToken?: string;
    totalResults: number;
  }> {
    const token = this.getAccessTokenOrThrow();

    const params = new URLSearchParams({
      part: "snippet,replies",
      videoId,
      maxResults: (options?.maxResults || 20).toString(),
      order: options?.order || "time",
    });

    if (options?.pageToken) {
      params.set("pageToken", options.pageToken);
    }

    const response = await fetch(
      `${YOUTUBE_API_BASE}/commentThreads?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to fetch comments: ${
          error.error?.message || response.statusText
        }`,
      );
    }

    const data = await response.json();

    return {
      comments: (data.items || []).map((thread: any) =>
        this.parseCommentThread(thread)
      ),
      nextPageToken: data.nextPageToken,
      totalResults: data.pageInfo?.totalResults || 0,
    };
  }

  /**
   * Reply to a comment
   *
   * @param commentId - Parent comment ID
   * @param text - Reply text
   * @returns The created reply comment
   */
  async replyToComment(
    commentId: string,
    text: string,
  ): Promise<YouTubeComment> {
    const token = this.getAccessTokenOrThrow();

    const response = await fetch(
      `${YOUTUBE_API_BASE}/comments?part=snippet`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          snippet: {
            parentId: commentId,
            textOriginal: text,
          },
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to reply to comment: ${
          error.error?.message || response.statusText
        }`,
      );
    }

    const data = await response.json();
    return this.parseComment(data);
  }

  /**
   * Moderate a comment (delete or mark as spam)
   *
   * @param commentId - Comment ID to moderate
   * @param action - Moderation action
   */
  async moderateComment(
    commentId: string,
    action: "delete" | "markAsSpam" | "setModerationStatus",
  ): Promise<void> {
    const token = this.getAccessTokenOrThrow();

    if (action === "delete") {
      const response = await fetch(
        `${YOUTUBE_API_BASE}/comments?id=${commentId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to delete comment: ${response.statusText}`);
      }
    } else if (action === "markAsSpam") {
      const response = await fetch(
        `${YOUTUBE_API_BASE}/comments/markAsSpam?id=${commentId}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to mark comment as spam: ${response.statusText}`);
      }
    } else {
      const response = await fetch(
        `${YOUTUBE_API_BASE}/comments/setModerationStatus?id=${commentId}&moderationStatus=published`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.ok) {
        throw new Error(
          `Failed to set moderation status: ${response.statusText}`,
        );
      }
    }
  }

  /**
   * Bulk moderate comments
   *
   * @param commentIds - Array of comment IDs
   * @param action - Action to perform on all comments
   */
  async bulkModerateComments(
    commentIds: string[],
    action: "delete" | "markAsSpam",
  ): Promise<{ succeeded: string[]; failed: { id: string; error: string }[] }> {
    const results = {
      succeeded: [] as string[],
      failed: [] as { id: string; error: string }[],
    };

    // YouTube API doesn't support true bulk operations
    // Execute sequentially with rate limiting (5 requests/second)
    for (const commentId of commentIds) {
      try {
        await this.moderateComment(commentId, action);
        results.succeeded.push(commentId);
      } catch (error) {
        results.failed.push({
          id: commentId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }

      // Rate limiting: 5 requests per second
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    return results;
  }

  /**
   * Parse comment thread from YouTube API response
   */
  private parseCommentThread(thread: any): YouTubeComment {
    const topLevelComment = thread.snippet.topLevelComment.snippet;

    return {
      id: thread.id,
      videoId: thread.snippet.videoId,
      authorName: topLevelComment.authorDisplayName,
      authorChannelId: topLevelComment.authorChannelId?.value,
      authorProfileImageUrl: topLevelComment.authorProfileImageUrl,
      text: topLevelComment.textDisplay,
      likeCount: topLevelComment.likeCount || 0,
      publishedAt: new Date(topLevelComment.publishedAt),
      updatedAt: new Date(topLevelComment.updatedAt),
      replies: thread.replies?.comments?.map((c: any) => this.parseComment(c)) ||
        [],
      totalReplyCount: thread.snippet.totalReplyCount || 0,
    };
  }

  /**
   * Parse single comment from YouTube API response
   */
  private parseComment(comment: any): YouTubeComment {
    return {
      id: comment.id,
      videoId: comment.snippet.videoId,
      authorName: comment.snippet.authorDisplayName,
      authorChannelId: comment.snippet.authorChannelId?.value,
      authorProfileImageUrl: comment.snippet.authorProfileImageUrl,
      text: comment.snippet.textDisplay,
      likeCount: comment.snippet.likeCount || 0,
      publishedAt: new Date(comment.snippet.publishedAt),
      updatedAt: new Date(comment.snippet.updatedAt),
      parentId: comment.snippet.parentId,
    };
  }

  /**
   * List playlists for the authenticated channel
   */
  async getPlaylists(
    options?: { maxResults?: number; pageToken?: string },
  ): Promise<{
    playlists: YouTubePlaylist[];
    nextPageToken?: string;
  }> {
    const token = this.getAccessTokenOrThrow();

    const params = new URLSearchParams({
      part: "snippet,contentDetails,status",
      mine: "true",
      maxResults: (options?.maxResults || 25).toString(),
    });

    if (options?.pageToken) {
      params.set("pageToken", options.pageToken);
    }

    const response = await fetch(
      `${YOUTUBE_API_BASE}/playlists?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to fetch playlists: ${
          error.error?.message || response.statusText
        }`,
      );
    }

    const data = await response.json();

    return {
      playlists: (data.items || []).map((p: any) => this.parsePlaylist(p)),
      nextPageToken: data.nextPageToken,
    };
  }

  /**
   * Create a new playlist
   */
  async createPlaylist(
    title: string,
    description?: string,
    privacyStatus: "public" | "private" | "unlisted" = "private",
  ): Promise<YouTubePlaylist> {
    const token = this.getAccessTokenOrThrow();

    const response = await fetch(
      `${YOUTUBE_API_BASE}/playlists?part=snippet,status`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          snippet: {
            title,
            description: description || "",
          },
          status: {
            privacyStatus,
          },
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to create playlist: ${
          error.error?.message || response.statusText
        }`,
      );
    }

    const data = await response.json();
    return this.parsePlaylist(data);
  }

  /**
   * Add a video to a playlist
   */
  async addToPlaylist(
    playlistId: string,
    videoId: string,
    position?: number,
  ): Promise<void> {
    const token = this.getAccessTokenOrThrow();

    const requestBody: any = {
      snippet: {
        playlistId,
        resourceId: {
          kind: "youtube#video",
          videoId,
        },
      },
    };

    if (position !== undefined) {
      requestBody.snippet.position = position;
    }

    const response = await fetch(
      `${YOUTUBE_API_BASE}/playlistItems?part=snippet`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to add video to playlist: ${
          error.error?.message || response.statusText
        }`,
      );
    }
  }

  /**
   * Update playlist metadata
   */
  async updatePlaylist(
    playlistId: string,
    updates: {
      title?: string;
      description?: string;
      privacyStatus?: "public" | "private" | "unlisted";
    },
  ): Promise<YouTubePlaylist> {
    const token = this.getAccessTokenOrThrow();

    // First, get current playlist data
    const currentResponse = await fetch(
      `${YOUTUBE_API_BASE}/playlists?part=snippet,status&id=${playlistId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!currentResponse.ok) {
      throw new Error("Failed to fetch current playlist data");
    }

    const currentData = await currentResponse.json();
    const current = currentData.items[0];

    if (!current) {
      throw new Error(`Playlist not found: ${playlistId}`);
    }

    // Merge updates with current data
    const updateBody = {
      id: playlistId,
      snippet: {
        title: updates.title || current.snippet.title,
        description: updates.description !== undefined
          ? updates.description
          : current.snippet.description,
      },
      status: {
        privacyStatus: updates.privacyStatus || current.status.privacyStatus,
      },
    };

    const response = await fetch(
      `${YOUTUBE_API_BASE}/playlists?part=snippet,status`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateBody),
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to update playlist: ${
          error.error?.message || response.statusText
        }`,
      );
    }

    const data = await response.json();
    return this.parsePlaylist(data);
  }

  /**
   * Delete a playlist
   */
  async deletePlaylist(playlistId: string): Promise<void> {
    const token = this.getAccessTokenOrThrow();

    const response = await fetch(
      `${YOUTUBE_API_BASE}/playlists?id=${playlistId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to delete playlist: ${response.statusText}`);
    }
  }

  /**
   * Parse playlist from YouTube API response
   */
  private parsePlaylist(playlist: any): YouTubePlaylist {
    return {
      id: playlist.id,
      title: playlist.snippet.title,
      description: playlist.snippet.description,
      publishedAt: new Date(playlist.snippet.publishedAt),
      thumbnailUrl: playlist.snippet.thumbnails?.medium?.url,
      privacyStatus: playlist.status?.privacyStatus || "private",
      itemCount: playlist.contentDetails?.itemCount || 0,
    };
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
