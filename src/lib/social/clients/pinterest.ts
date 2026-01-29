/**
 * Pinterest API v5 Client
 *
 * Implements ISocialClient interface for Pinterest OAuth 2.0
 * API Reference: https://developers.pinterest.com/docs/api/v5/
 */

import type {
  ISocialClient,
  OAuthTokenResponse,
  PinterestBoard,
  PinterestPin,
  PostOptions,
  PostResult,
  SocialAccountInfo,
  SocialClientOptions,
  SocialMetricsData,
  SocialPost,
} from "../types";

const PINTEREST_API_BASE = "https://api.pinterest.com/v5";
const PINTEREST_OAUTH_AUTHORIZE = "https://www.pinterest.com/oauth/";
const PINTEREST_TOKEN_ENDPOINT = "https://api.pinterest.com/v5/oauth/token";

// Pinterest API v5 scopes
// - user_accounts:read: Read user profile information
// - pins:read: Read user's pins
// - pins:write: Create and update pins
// - boards:read: Read user's boards
const PINTEREST_SCOPES = [
  "user_accounts:read",
  "pins:read",
  "pins:write",
  "boards:read",
].join(",");

/**
 * Pinterest API error response structure
 */
interface PinterestApiError {
  code?: number;
  message?: string;
}

/**
 * Custom error class for Pinterest API errors that includes HTTP status
 */
export class PinterestHttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly statusText: string,
  ) {
    super(message);
    this.name = "PinterestHttpError";
  }
}

/**
 * Pinterest user profile response
 */
interface PinterestUserResponse {
  username: string;
  account_type?: string;
  profile_image?: string;
  website_url?: string;
  follower_count?: number;
  following_count?: number;
  board_count?: number;
  pin_count?: number;
}

/**
 * Pinterest pins list response
 */
interface PinterestPinsResponse {
  items: PinterestPin[];
  bookmark?: string;
}

/**
 * Pinterest boards list response
 */
interface PinterestBoardsResponse {
  items: PinterestBoard[];
  bookmark?: string;
}

export class PinterestClient implements ISocialClient {
  readonly platform = "PINTEREST" as const;
  private accessToken?: string;

  constructor(options?: SocialClientOptions) {
    this.accessToken = options?.accessToken;
  }

  /**
   * Generate Pinterest OAuth 2.0 authorization URL
   */
  getAuthUrl(
    redirectUri: string,
    state: string,
    _codeChallenge?: string,
  ): string {
    const appId = process.env["PINTEREST_APP_ID"];
    if (!appId) {
      throw new Error(
        "PINTEREST_APP_ID environment variable is not configured",
      );
    }

    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: PINTEREST_SCOPES,
      state,
    });

    return `${PINTEREST_OAUTH_AUTHORIZE}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access tokens
   */
  async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
    _codeVerifier?: string,
  ): Promise<OAuthTokenResponse> {
    const appId = process.env["PINTEREST_APP_ID"];
    const appSecret = process.env["PINTEREST_APP_SECRET"];

    if (!appId || !appSecret) {
      throw new Error(
        "PINTEREST_APP_ID and PINTEREST_APP_SECRET environment variables are required",
      );
    }

    // Pinterest requires Basic auth with app_id:app_secret
    const basicAuth = Buffer.from(`${appId}:${appSecret}`).toString("base64");

    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    });

    const response = await fetch(PINTEREST_TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as PinterestApiError;
      throw new PinterestHttpError(
        `Pinterest token exchange failed: ${
          errorData.message || response.statusText
        }`,
        response.status,
        response.statusText,
      );
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      token_type: string;
      scope: string;
    };

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
   * Refresh an expired access token
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse> {
    const appId = process.env["PINTEREST_APP_ID"];
    const appSecret = process.env["PINTEREST_APP_SECRET"];

    if (!appId || !appSecret) {
      throw new Error(
        "PINTEREST_APP_ID and PINTEREST_APP_SECRET environment variables are required",
      );
    }

    const basicAuth = Buffer.from(`${appId}:${appSecret}`).toString("base64");

    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    const response = await fetch(PINTEREST_TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as PinterestApiError;
      throw new PinterestHttpError(
        `Pinterest token refresh failed: ${
          errorData.message || response.statusText
        }`,
        response.status,
        response.statusText,
      );
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      token_type: string;
      scope: string;
    };

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
   * Get authenticated user's account information
   */
  async getAccountInfo(): Promise<SocialAccountInfo> {
    const token = this.getAccessTokenOrThrow();

    const response = await fetch(`${PINTEREST_API_BASE}/user_account`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as PinterestApiError;
      throw new PinterestHttpError(
        `Failed to get Pinterest user info: ${
          errorData.message || response.statusText
        }`,
        response.status,
        response.statusText,
      );
    }

    const user = (await response.json()) as PinterestUserResponse;

    // Store username for subsequent calls
    this.pinterestUserId = user.username;

    return {
      platformId: user.username,
      username: user.username,
      displayName: user.username,
      profileUrl: `https://www.pinterest.com/${user.username}/`,
      avatarUrl: user.profile_image,
      followersCount: user.follower_count,
      followingCount: user.following_count,
    };
  }

  /**
   * Create a new Pinterest pin
   *
   * @param content - Pin description
   * @param options - Post options (must include boardId and imageUrl)
   */
  async createPost(
    content: string,
    options?: PostOptions & { boardId?: string; imageUrl?: string },
  ): Promise<PostResult> {
    const token = this.getAccessTokenOrThrow();

    if (!options?.boardId) {
      throw new PinterestHttpError(
        "boardId is required to create a Pinterest pin",
        400,
        "Bad Request",
      );
    }

    if (!options?.imageUrl) {
      throw new PinterestHttpError(
        "imageUrl is required to create a Pinterest pin",
        400,
        "Bad Request",
      );
    }

    const payload = {
      board_id: options.boardId,
      description: content,
      media_source: {
        source_type: "image_url",
        url: options.imageUrl,
      },
      link: options.link,
    };

    const response = await fetch(`${PINTEREST_API_BASE}/pins`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as PinterestApiError;
      throw new PinterestHttpError(
        `Failed to create Pinterest pin: ${
          errorData.message || response.statusText
        }`,
        response.status,
        response.statusText,
      );
    }

    const pin = (await response.json()) as PinterestPin;

    return {
      platformPostId: pin.id,
      url: `https://www.pinterest.com/pin/${pin.id}/`,
      publishedAt: new Date(pin.created_at),
    };
  }

  /**
   * Get user's recent pins
   */
  async getPosts(limit = 25): Promise<SocialPost[]> {
    const token = this.getAccessTokenOrThrow();

    const params = new URLSearchParams({
      page_size: Math.min(Math.max(limit, 1), 100).toString(), // Pinterest allows 1-100
    });

    const response = await fetch(
      `${PINTEREST_API_BASE}/pins?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as PinterestApiError;
      throw new PinterestHttpError(
        `Failed to get Pinterest pins: ${
          errorData.message || response.statusText
        }`,
        response.status,
        response.statusText,
      );
    }

    const result = (await response.json()) as PinterestPinsResponse;
    const pins = result.items ?? [];

    return pins.map((pin): SocialPost => {
      // Get the best image URL from the media object
      const images = pin.media?.images;
      const imageUrl = images?.["600x"]?.url || images?.["400x"]?.url || images?.["236x"]?.url;

      return {
        platform: "PINTEREST",
        platformPostId: pin.id,
        content: pin.description || pin.title || "",
        url: `https://www.pinterest.com/pin/${pin.id}/`,
        publishedAt: new Date(pin.created_at),
        mediaUrls: imageUrl ? [imageUrl] : [],
      };
    });
  }

  /**
   * Get user's boards
   */
  async getBoards(limit = 25): Promise<PinterestBoard[]> {
    const token = this.getAccessTokenOrThrow();

    const params = new URLSearchParams({
      page_size: Math.min(Math.max(limit, 1), 100).toString(),
    });

    const response = await fetch(
      `${PINTEREST_API_BASE}/boards?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as PinterestApiError;
      throw new PinterestHttpError(
        `Failed to get Pinterest boards: ${
          errorData.message || response.statusText
        }`,
        response.status,
        response.statusText,
      );
    }

    const result = (await response.json()) as PinterestBoardsResponse;
    return result.items ?? [];
  }

  /**
   * Get account-level metrics
   */
  async getMetrics(): Promise<SocialMetricsData> {
    // Get user info for follower counts
    const userInfo = await this.getAccountInfo();

    // Get recent pins for engagement estimation
    const posts = await this.getPosts(10);

    // Pinterest doesn't provide detailed engagement metrics via API v5
    // We can only estimate based on available data
    return {
      platform: "PINTEREST",
      followersCount: userInfo.followersCount ?? 0,
      followingCount: userInfo.followingCount ?? 0,
      postsCount: posts.length,
      engagementRate: 0, // Not available in API v5
      reach: 0, // Not available in API v5
      impressions: 0, // Not available in API v5
    };
  }

  /**
   * Helper method to get access token or throw error
   */
  private getAccessTokenOrThrow(): string {
    if (!this.accessToken) {
      throw new PinterestHttpError(
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
