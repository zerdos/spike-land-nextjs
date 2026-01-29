/**
 * TikTok API v2 Client
 *
 * Implements ISocialClient interface for TikTok OAuth 2.0
 * API Reference: https://developers.tiktok.com/doc/
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
  TikTokVideo,
  TikTokTrend,
} from "../types";

const TIKTOK_API_BASE = "https://open.tiktokapis.com";
const TIKTOK_OAUTH_AUTHORIZE = "https://www.tiktok.com/v2/auth/authorize";
const TIKTOK_TOKEN_ENDPOINT = `${TIKTOK_API_BASE}/v2/oauth/token/`;
const TIKTOK_SCOPES = "user.info.basic,video.publish,video.list,video.upload";

interface TikTokApiError {
  error?: string;
  error_description?: string;
  message?: string;
  code?: number;
}

/**
 * Custom error class for TikTok API errors that includes HTTP status
 */
export class TikTokHttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly statusText: string,
  ) {
    super(message);
    this.name = "TikTokHttpError";
  }
}

interface TikTokUserResponse {
  data: {
    user: {
      open_id: string;
      union_id: string;
      avatar_url: string;
      display_name: string;
      username: string;
      follower_count: number;
      following_count: number;
      video_count: number;
      bio_description?: string;
    };
  };
  error?: TikTokApiError;
}

interface TikTokVideoListResponse {
  data: {
    videos: Array<{
      id: string;
      title: string;
      cover_image_url: string;
      create_time: number;
      duration: number;
      share_url: string;
      video_description?: string;
      like_count: number;
      comment_count: number;
      share_count: number;
      view_count: number;
    }>;
    cursor: number;
    has_more: boolean;
  };
  error?: TikTokApiError;
}

export class TikTokClient implements ISocialClient {
  readonly platform = "TIKTOK" as const;
  private accessToken?: string;

  constructor(options?: SocialClientOptions) {
    this.accessToken = options?.accessToken;
  }

  /**
   * Get TikTok OAuth authorization URL
   */
  getAuthUrl(
    redirectUri: string,
    state: string,
    _codeChallenge?: string,
  ): string {
    const clientKey = process.env["TIKTOK_CLIENT_KEY"];
    if (!clientKey) {
      throw new Error("TIKTOK_CLIENT_KEY not configured");
    }

    const params = new URLSearchParams({
      client_key: clientKey,
      scope: TIKTOK_SCOPES,
      response_type: "code",
      redirect_uri: redirectUri,
      state,
    });

    return `${TIKTOK_OAUTH_AUTHORIZE}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
    _codeVerifier?: string,
  ): Promise<OAuthTokenResponse> {
    const clientKey = process.env["TIKTOK_CLIENT_KEY"];
    const clientSecret = process.env["TIKTOK_CLIENT_SECRET"];

    if (!clientKey || !clientSecret) {
      throw new Error("TikTok credentials not configured");
    }

    const response = await fetch(TIKTOK_TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cache-Control": "no-cache",
      },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const error: TikTokApiError = await response.json();
      throw new TikTokHttpError(
        error.error_description || error.message || "Token exchange failed",
        response.status,
        response.statusText,
      );
    }

    const data: {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      token_type: string;
      scope: string;
      open_id: string;
    } = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      tokenType: data.token_type,
      scope: data.scope,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse> {
    const clientKey = process.env["TIKTOK_CLIENT_KEY"];
    const clientSecret = process.env["TIKTOK_CLIENT_SECRET"];

    if (!clientKey || !clientSecret) {
      throw new Error("TikTok credentials not configured");
    }

    const response = await fetch(TIKTOK_TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const error: TikTokApiError = await response.json();
      throw new TikTokHttpError(
        error.error_description || error.message || "Token refresh failed",
        response.status,
        response.statusText,
      );
    }

    const data: {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      token_type: string;
      scope: string;
      open_id: string;
    } = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      tokenType: data.token_type,
      scope: data.scope,
    };
  }

  /**
   * Get TikTok user account information
   */
  async getAccountInfo(): Promise<SocialAccountInfo> {
    const token = this.getAccessTokenOrThrow();

    const response = await fetch(`${TIKTOK_API_BASE}/v2/user/info/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error: TikTokApiError = await response.json();
      throw new TikTokHttpError(
        error.message || "Failed to fetch account info",
        response.status,
        response.statusText,
      );
    }

    const result: TikTokUserResponse = await response.json();

    if (result.error) {
      throw new Error(result.error.message || "Failed to fetch account info");
    }

    const user = result.data.user;

    return {
      platformId: user.open_id,
      username: user.username,
      displayName: user.display_name,
      profileUrl: `https://www.tiktok.com/@${user.username}`,
      avatarUrl: user.avatar_url,
      followersCount: user.follower_count,
      followingCount: user.following_count,
    };
  }

  /**
   * Create a post (upload video) on TikTok
   * Note: This is a simplified implementation. Full video upload requires:
   * 1. Initiate upload
   * 2. Upload video file to provided URL
   * 3. Publish video
   */
  async createPost(_content: string, _options?: PostOptions): Promise<PostResult> {
    // This is a placeholder implementation
    // In production, you would:
    // 1. Call /v2/post/publish/video/init/ to get upload URL
    // 2. Upload video file to the provided URL
    // 3. Call /v2/post/publish/status/fetch/ to check processing status

    throw new Error(
      "Video upload not yet fully implemented. Use the video upload API route instead.",
    );
  }

  /**
   * Get user's TikTok videos
   */
  async getPosts(limit = 20): Promise<SocialPost[]> {
    const token = this.getAccessTokenOrThrow();

    const response = await fetch(
      `${TIKTOK_API_BASE}/v2/video/list/?fields=id,title,cover_image_url,create_time,duration,share_url,video_description,like_count,comment_count,share_count,view_count&max_count=${limit}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const error: TikTokApiError = await response.json();
      throw new TikTokHttpError(
        error.message || "Failed to fetch videos",
        response.status,
        response.statusText,
      );
    }

    const result: TikTokVideoListResponse = await response.json();

    if (result.error) {
      throw new Error(result.error.message || "Failed to fetch videos");
    }

    return result.data.videos.map((video) => ({
      id: video.id,
      platformPostId: video.id,
      platform: "TIKTOK" as const,
      content: video.video_description || video.title,
      mediaUrls: [video.cover_image_url],
      publishedAt: new Date(video.create_time * 1000),
      url: video.share_url,
      metrics: {
        likes: video.like_count,
        comments: video.comment_count,
        shares: video.share_count,
        impressions: video.view_count,
        reach: video.view_count,
        engagementRate:
          video.view_count > 0
            ? ((video.like_count + video.comment_count + video.share_count) /
                video.view_count) *
              100
            : 0,
      },
      rawData: video,
    }));
  }

  /**
   * Delete a TikTok video
   */
  async deletePost(postId: string): Promise<void> {
    const token = this.getAccessTokenOrThrow();

    const response = await fetch(`${TIKTOK_API_BASE}/v2/post/publish/video/delete/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        video_id: postId,
      }),
    });

    if (!response.ok) {
      const error: TikTokApiError = await response.json();
      throw new TikTokHttpError(
        error.message || "Failed to delete video",
        response.status,
        response.statusText,
      );
    }
  }

  /**
   * Get account-level metrics
   */
  async getMetrics(): Promise<SocialMetricsData> {
    const accountInfo = await this.getAccountInfo();
    const posts = await this.getPosts(100);

    // Calculate aggregate metrics
    const totalEngagements = posts.reduce(
      (sum, post) =>
        sum + (post.metrics?.likes || 0) + (post.metrics?.comments || 0) + (post.metrics?.shares || 0),
      0,
    );
    const totalImpressions = posts.reduce(
      (sum, post) => sum + (post.metrics?.impressions || 0),
      0,
    );

    return {
      followers: accountInfo.followersCount || 0,
      following: accountInfo.followingCount || 0,
      postsCount: posts.length,
      engagementRate:
        totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0,
      impressions: totalImpressions,
      reach: totalImpressions,
    };
  }

  /**
   * Get video-specific analytics
   */
  async getVideoAnalytics(videoId: string): Promise<TikTokVideo | null> {
    const posts = await this.getPosts(100);
    const video = posts.find((p) => p.platformPostId === videoId);

    if (!video) {
      return null;
    }

    return {
      id: video.platformPostId,
      title: video.content.substring(0, 150),
      description: video.content,
      coverImageUrl: video.mediaUrls?.[0] || "",
      videoUrl: video.url,
      duration: 0, // Would need to be fetched from rawData
      createTime: Math.floor(video.publishedAt.getTime() / 1000),
      shareUrl: video.url,
      statistics: {
        viewCount: video.metrics?.impressions || 0,
        likeCount: video.metrics?.likes || 0,
        commentCount: video.metrics?.comments || 0,
        shareCount: video.metrics?.shares || 0,
      },
    };
  }

  /**
   * Get trending hashtags (mock implementation - TikTok doesn't provide public trends API)
   */
  async getTrendingHashtags(_limit = 20): Promise<TikTokTrend[]> {
    // Note: TikTok doesn't provide a public trends API
    // This would need to be implemented via web scraping or third-party services
    // For now, return empty array
    return [];
  }

  /**
   * Get trending sounds (mock implementation - TikTok doesn't provide public trends API)
   */
  async getTrendingSounds(_limit = 20): Promise<TikTokTrend[]> {
    // Note: TikTok doesn't provide a public trends API
    // This would need to be implemented via web scraping or third-party services
    // For now, return empty array
    return [];
  }

  /**
   * Helper to get access token or throw
   */
  private getAccessTokenOrThrow(): string {
    if (!this.accessToken) {
      throw new Error("TikTok access token not set");
    }
    return this.accessToken;
  }
}
