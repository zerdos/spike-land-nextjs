/**
 * TikTok Business API Client
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
} from "../types";

const TIKTOK_API_BASE = "https://open.tiktokapis.com/v2";
const TIKTOK_OAUTH_AUTHORIZE = "https://www.tiktok.com/v2/auth/authorize";
const TIKTOK_TOKEN_ENDPOINT = "https://open.tiktokapis.com/v2/oauth/token/";

// TikTok Business API scopes
// - user.info.basic: Read user profile information
// - video.list: Read user's videos
// - video.publish: Create video posts (requires TikTok review approval)
const TIKTOK_SCOPES = [
  "user.info.basic",
  "video.list",
  "video.publish",
].join(",");

/**
 * TikTok API error response structure
 */
interface TikTokApiError {
  error?: {
    code?: string;
    message?: string;
    log_id?: string;
  };
  message?: string;
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

/**
 * TikTok user profile response
 */
interface TikTokUserResponse {
  data?: {
    user?: {
      open_id: string;
      union_id: string;
      avatar_url?: string;
      avatar_url_100?: string;
      display_name: string;
      bio_description?: string;
      profile_deep_link: string;
      follower_count?: number;
      following_count?: number;
      likes_count?: number;
      video_count?: number;
    };
  };
  error?: TikTokApiError["error"];
}

/**
 * TikTok video data structure
 */
export interface TikTokVideo {
  id: string;
  create_time: number;
  cover_image_url: string;
  share_url: string;
  video_description: string;
  duration: number;
  height: number;
  width: number;
  title: string;
  embed_html: string;
  embed_link: string;
  like_count: number;
  comment_count: number;
  share_count: number;
  view_count: number;
}

/**
 * TikTok videos list response
 */
interface TikTokVideosResponse {
  data?: {
    videos?: TikTokVideo[];
    cursor?: number;
    has_more?: boolean;
  };
  error?: TikTokApiError["error"];
}

export class TikTokClient implements ISocialClient {
  readonly platform = "TIKTOK" as const;
  private accessToken?: string;
  private tiktokUserId?: string;

  constructor(options?: SocialClientOptions) {
    this.accessToken = options?.accessToken;
    this.tiktokUserId = options?.accountId;
  }

  /**
   * Generate TikTok OAuth 2.0 authorization URL
   */
  getAuthUrl(
    redirectUri: string,
    state: string,
    _codeChallenge?: string,
  ): string {
    const clientKey = process.env["TIKTOK_CLIENT_KEY"];
    if (!clientKey) {
      throw new Error(
        "TIKTOK_CLIENT_KEY environment variable is not configured",
      );
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
   * Exchange authorization code for access tokens
   */
  async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
    _codeVerifier?: string,
  ): Promise<OAuthTokenResponse> {
    const clientKey = process.env["TIKTOK_CLIENT_KEY"];
    const clientSecret = process.env["TIKTOK_CLIENT_SECRET"];

    if (!clientKey || !clientSecret) {
      throw new Error(
        "TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET environment variables are required",
      );
    }

    const params = new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    });

    const response = await fetch(TIKTOK_TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as TikTokApiError;
      throw new TikTokHttpError(
        `TikTok token exchange failed: ${
          errorData.error?.message || errorData.message || response.statusText
        }`,
        response.status,
        response.statusText,
      );
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      token_type: string;
      scope: string;
      open_id: string;
    };

    // Store user ID for subsequent calls
    this.tiktokUserId = data.open_id;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      tokenType: data.token_type,
      scope: data.scope,
    };
  }

  /**
   * Refresh an expired access token
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse> {
    const clientKey = process.env["TIKTOK_CLIENT_KEY"];
    const clientSecret = process.env["TIKTOK_CLIENT_SECRET"];

    if (!clientKey || !clientSecret) {
      throw new Error(
        "TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET environment variables are required",
      );
    }

    const params = new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    const response = await fetch(TIKTOK_TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as TikTokApiError;
      throw new TikTokHttpError(
        `TikTok token refresh failed: ${
          errorData.error?.message || errorData.message || response.statusText
        }`,
        response.status,
        response.statusText,
      );
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      token_type: string;
      scope: string;
      open_id: string;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      tokenType: data.token_type,
      scope: data.scope,
    };
  }

  /**
   * Get authenticated user's account information
   */
  async getAccountInfo(): Promise<SocialAccountInfo> {
    const token = this.getAccessTokenOrThrow();

    const response = await fetch(`${TIKTOK_API_BASE}/user/info/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as TikTokApiError;
      throw new TikTokHttpError(
        `Failed to get TikTok user info: ${
          errorData.error?.message || errorData.message || response.statusText
        }`,
        response.status,
        response.statusText,
      );
    }

    const result = (await response.json()) as TikTokUserResponse;

    if (!result.data?.user) {
      throw new TikTokHttpError(
        "TikTok API returned no user data",
        response.status,
        response.statusText,
      );
    }

    const user = result.data.user;

    // Store user ID for subsequent calls
    this.tiktokUserId = user.open_id;

    return {
      platformId: user.open_id,
      username: user.display_name,
      displayName: user.display_name,
      profileUrl: user.profile_deep_link,
      avatarUrl: user.avatar_url_100 || user.avatar_url,
      bio: user.bio_description,
      followersCount: user.follower_count,
      followingCount: user.following_count,
    };
  }

  /**
   * Create a new TikTok video post
   *
   * Note: Video upload requires TikTok Business API approval for video.publish scope.
   * This is a placeholder implementation - actual video upload uses a multi-step process:
   * 1. Initiate upload session
   * 2. Upload video file in chunks
   * 3. Publish video with metadata
   *
   * For full implementation, see TikTok Content Posting API documentation:
   * https://developers.tiktok.com/doc/content-posting-api-get-started
   */
  async createPost(
    _content: string,
    _options?: PostOptions,
  ): Promise<PostResult> {

    // This is a simplified implementation
    // Real video upload would require file handling and chunked upload
    throw new TikTokHttpError(
      "TikTok video upload not yet implemented. Requires video.publish scope approval and file upload handling.",
      501,
      "Not Implemented",
    );

    // Placeholder for when implemented:
    // 1. POST /v2/post/publish/video/init/ - Initialize upload
    // 2. PUT to returned upload_url - Upload video chunks
    // 3. POST /v2/post/publish/video/commit/ - Finalize and publish
  }

  /**
   * Get user's recent videos
   */
  async getPosts(limit = 20): Promise<SocialPost[]> {
    const token = this.getAccessTokenOrThrow();

    // Ensure we have the user ID
    if (!this.tiktokUserId) {
      const userInfo = await this.getAccountInfo();
      this.tiktokUserId = userInfo.platformId;
    }

    const params = new URLSearchParams({
      max_count: Math.min(Math.max(limit, 1), 20).toString(), // TikTok allows 1-20
    });

    const response = await fetch(
      `${TIKTOK_API_BASE}/video/list/?${params.toString()}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as TikTokApiError;
      throw new TikTokHttpError(
        `Failed to get TikTok videos: ${
          errorData.error?.message || errorData.message || response.statusText
        }`,
        response.status,
        response.statusText,
      );
    }

    const result = (await response.json()) as TikTokVideosResponse;
    const videos = result.data?.videos ?? [];

    return videos.map((video): SocialPost => ({
      platform: "TIKTOK",
      platformPostId: video.id,
      content: video.video_description || video.title,
      url: video.share_url,
      publishedAt: new Date(video.create_time * 1000),
      metrics: {
        likes: video.like_count,
        comments: video.comment_count,
        shares: video.share_count,
        views: video.view_count,
      },
      mediaUrls: [video.cover_image_url],
    }));
  }

  /**
   * Get account-level metrics
   */
  async getMetrics(): Promise<SocialMetricsData> {
    // Ensure we have the user info
    const userInfo = await this.getAccountInfo();

    // Get recent videos for engagement metrics
    const posts = await this.getPosts(10);

    // Calculate aggregate metrics from recent videos
    const totalLikes = posts.reduce((sum, post) => sum + (post.metrics?.likes ?? 0), 0);
    const totalComments = posts.reduce((sum, post) => sum + (post.metrics?.comments ?? 0), 0);
    const totalShares = posts.reduce((sum, post) => sum + (post.metrics?.shares ?? 0), 0);
    const totalViews = posts.reduce((sum, post) => sum + (post.metrics?.views ?? 0), 0);

    const engagementCount = totalLikes + totalComments + totalShares;
    const engagementRate = totalViews > 0 ? (engagementCount / totalViews) * 100 : 0;

    return {
      platform: "TIKTOK",
      followersCount: userInfo.followersCount ?? 0,
      followingCount: userInfo.followingCount ?? 0,
      postsCount: posts.length,
      engagementRate,
      reach: totalViews,
      impressions: totalViews, // TikTok counts views as impressions
    };
  }

  /**
   * Helper method to get access token or throw error
   */
  private getAccessTokenOrThrow(): string {
    if (!this.accessToken) {
      throw new TikTokHttpError(
        "Access token is required. Please authenticate first.",
        401,
        "Unauthorized",
      );
    }
    return this.accessToken;
  }

  /**
   * Set access token for authenticated requests
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }
}
