/**
 * TikTok for Developers API Client
 *
 * Implements ISocialClient interface for TikTok OAuth 2.0 and Content Posting API
 * API Reference: https://developers.tiktok.com/doc/content-posting-api-get-started
 *
 * Rate Limits (from TikTok documentation):
 * - User Info: 100 requests/day
 * - Direct Post: 4 videos/day per user
 * - Creator Posts: 100 requests/day
 * - Video Query: 100 requests/day
 *
 * Important Notes:
 * - TikTok only supports video content (no images or text-only posts)
 * - Video upload is a multi-step process: init → upload → publish
 * - Content Posting API requires app approval from TikTok
 * - Sandbox mode available for testing
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

const TIKTOK_API_BASE = "https://open.tiktokapis.com";
const TIKTOK_OAUTH_AUTHORIZE = "https://www.tiktok.com/v2/auth/authorize";
const TIKTOK_TOKEN_ENDPOINT = `${TIKTOK_API_BASE}/v2/oauth/token/`;

// Required scopes for TikTok integration
const TIKTOK_SCOPES = "user.info.basic,video.publish,video.list";

/**
 * TikTok API error response structure
 */
interface TikTokApiError {
  error?: {
    code: string;
    message: string;
    log_id?: string;
  };
  message?: string;
}

/**
 * TikTok user info response
 */
interface TikTokUserInfoResponse {
  data: {
    user: {
      open_id: string;
      union_id: string;
      avatar_url?: string;
      avatar_url_100?: string;
      avatar_large_url?: string;
      display_name: string;
      bio_description?: string;
      profile_deep_link?: string;
      is_verified: boolean;
      follower_count?: number;
      following_count?: number;
      likes_count?: number;
      video_count?: number;
    };
  };
  error?: TikTokApiError["error"];
}

/**
 * TikTok video list response
 */
interface TikTokVideoListResponse {
  data: {
    videos: Array<{
      id: string;
      title?: string;
      video_description?: string;
      create_time: number;
      cover_image_url?: string;
      share_url?: string;
      embed_link?: string;
      duration: number;
      height: number;
      width: number;
      like_count: number;
      comment_count: number;
      share_count: number;
      view_count: number;
    }>;
    cursor: number;
    has_more: boolean;
  };
  error?: TikTokApiError["error"];
}

/**
 * TikTok Client - Implements social media posting and metrics for TikTok
 *
 * Authentication: OAuth 2.0 with client credentials
 * Content: Video only (MP4 recommended)
 */
export class TikTokClient implements ISocialClient {
  readonly platform = "TIKTOK" as const;
  private accessToken?: string;

  constructor(options?: SocialClientOptions) {
    this.accessToken = options?.accessToken;
  }

  /**
   * Generate TikTok OAuth 2.0 authorization URL
   *
   * @param redirectUri - The callback URL after authorization
   * @param state - State parameter for CSRF protection
   * @returns Authorization URL to redirect the user to
   */
  getAuthUrl(redirectUri: string, state: string): string {
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
   *
   * @param code - The authorization code from OAuth callback
   * @param redirectUri - The same redirect URI used in getAuthUrl
   * @returns Token response with access and refresh tokens
   */
  async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
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
      throw new Error(
        `TikTok token exchange failed: ${
          errorData.error?.message || errorData.message || response.statusText
        }`,
      );
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      token_type: string;
      scope: string;
      open_id: string;
    };

    // Store access token for subsequent API calls
    this.accessToken = data.access_token;

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
   *
   * @param refreshToken - The refresh token from initial authorization
   * @returns New token response
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
      throw new Error(
        `TikTok token refresh failed: ${
          errorData.error?.message || errorData.message || response.statusText
        }`,
      );
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      token_type: string;
      scope: string;
      open_id: string;
    };

    this.accessToken = data.access_token;

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
   *
   * @returns User profile normalized to SocialAccountInfo
   */
  async getAccountInfo(): Promise<SocialAccountInfo> {
    const token = this.getAccessTokenOrThrow();

    const response = await fetch(
      `${TIKTOK_API_BASE}/v2/user/info/?fields=open_id,union_id,avatar_url,avatar_url_100,avatar_large_url,display_name,bio_description,profile_deep_link,is_verified,follower_count,following_count,likes_count,video_count`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as TikTokApiError;
      throw new Error(
        `Failed to get TikTok user info: ${
          errorData.error?.message || errorData.message || response.statusText
        }`,
      );
    }

    const result = (await response.json()) as TikTokUserInfoResponse;

    if (result.error) {
      throw new Error(
        `Failed to get TikTok user info: ${result.error.message}`,
      );
    }

    const user = result.data.user;

    return {
      platformId: user.open_id,
      username: user.display_name, // TikTok doesn't provide @username via API
      displayName: user.display_name,
      profileUrl: user.profile_deep_link,
      avatarUrl: user.avatar_large_url || user.avatar_url_100 || user.avatar_url,
      followersCount: user.follower_count,
      followingCount: user.following_count,
    };
  }

  /**
   * Create a TikTok video post
   *
   * NOTE: TikTok requires video content. The implementation here supports
   * the video upload flow, but requires the video URL to be provided in options.mediaUrls.
   *
   * Due to TikTok's multi-step upload process (init → upload → publish), this method
   * currently throws an error directing users to upload via TikTok Studio.
   *
   * TODO: Implement full video upload flow:
   * 1. Initialize upload (get upload_url and publish_id)
   * 2. Upload video file to upload_url (requires video binary data)
   * 3. Publish the video using publish_id
   *
   * @param content - Video title/description
   * @param options - Must include video file data
   * @throws Error - Video upload not yet fully implemented
   */
  async createPost(
    _content: string,
    _options?: PostOptions,
  ): Promise<PostResult> {
    throw new Error(
      "TikTok video upload requires multi-step process with video file data. " +
        "Use TikTok mobile app or TikTok Studio (https://www.tiktok.com/creator-tools) to upload videos. " +
        "Full API implementation pending.",
    );

    // Below is the structure for when we implement full video upload:
    /*
    const token = this.getAccessTokenOrThrow();

    // Step 1: Initialize video upload
    const initResponse = await fetch(
      `${TIKTOK_API_BASE}/v2/post/publish/inbox/video/init/`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source_info: {
            source: "FILE_UPLOAD",
            video_size: options?.metadata?.videoSize || 0,
            chunk_size: 10000000, // 10MB chunks
            total_chunk_count: 1,
          },
        }),
      },
    );

    const initData = await initResponse.json() as TikTokVideoInitResponse;

    // Step 2: Upload video to upload_url
    // (Requires video binary data - not available in this interface)

    // Step 3: Publish video
    const publishResponse = await fetch(
      `${TIKTOK_API_BASE}/v2/post/publish/status/fetch/`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          publish_id: initData.data.publish_id,
        }),
      },
    );

    return {
      platformPostId: initData.data.publish_id,
      url: `https://www.tiktok.com/@user/video/${initData.data.publish_id}`,
      publishedAt: new Date(),
    };
    */
  }

  /**
   * Get user's recent TikTok videos
   *
   * @param limit - Maximum number of videos to return (default: 20, max: 20 per API call)
   * @returns Array of videos formatted as SocialPost
   */
  async getPosts(limit = 20): Promise<SocialPost[]> {
    const token = this.getAccessTokenOrThrow();

    const maxResults = Math.min(Math.max(limit, 1), 20); // TikTok API max is 20

    const response = await fetch(
      `${TIKTOK_API_BASE}/v2/video/list/?fields=id,title,video_description,create_time,cover_image_url,share_url,embed_link,duration,height,width,like_count,comment_count,share_count,view_count&max_count=${maxResults}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as TikTokApiError;
      throw new Error(
        `Failed to get TikTok videos: ${
          errorData.error?.message || errorData.message || response.statusText
        }`,
      );
    }

    const result = (await response.json()) as TikTokVideoListResponse;

    if (result.error) {
      throw new Error(`Failed to get TikTok videos: ${result.error.message}`);
    }

    if (!result.data.videos || result.data.videos.length === 0) {
      return [];
    }

    return result.data.videos.map((video) => ({
      id: video.id,
      platformPostId: video.id,
      platform: "TIKTOK" as const,
      content: video.video_description || video.title || "",
      mediaUrls: video.cover_image_url ? [video.cover_image_url] : undefined,
      publishedAt: new Date(video.create_time * 1000),
      url: video.share_url || `https://www.tiktok.com/@user/video/${video.id}`,
      metrics: {
        likes: video.like_count,
        comments: video.comment_count,
        shares: video.share_count,
        impressions: video.view_count,
      },
      rawData: video as unknown as Record<string, unknown>,
    }));
  }

  /**
   * Get account-level metrics
   *
   * @returns Metrics including followers, following, video count
   */
  async getMetrics(): Promise<SocialMetricsData> {
    const token = this.getAccessTokenOrThrow();

    const response = await fetch(
      `${TIKTOK_API_BASE}/v2/user/info/?fields=follower_count,following_count,video_count,likes_count`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as TikTokApiError;
      throw new Error(
        `Failed to get TikTok metrics: ${
          errorData.error?.message || errorData.message || response.statusText
        }`,
      );
    }

    const result = (await response.json()) as TikTokUserInfoResponse;

    if (result.error) {
      throw new Error(`Failed to get TikTok metrics: ${result.error.message}`);
    }

    const user = result.data.user;

    return {
      followers: user.follower_count ?? 0,
      following: user.following_count ?? 0,
      postsCount: user.video_count ?? 0,
      // TikTok doesn't provide reach/impressions at account level via this endpoint
    };
  }

  /**
   * Set the access token for API calls
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  /**
   * Set the TikTok user ID (open_id)
   * Note: User ID is not stored on the client as it's embedded in tokens
   */
  setUserId(_userId: string): void {
    // User ID not needed for API calls as it's embedded in access token
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
