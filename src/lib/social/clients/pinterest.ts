/**
 * Pinterest API Client
 *
 * Implements ISocialClient interface for Pinterest
 * Uses Pinterest API v5
 * API Reference: https://developers.pinterest.com/docs/api/v5/
 */

import type {
  ISocialClient,
  OAuthTokenResponse,
  PinterestBoard,
  PinterestClientOptions,
  PinterestMetrics,
  PinterestPin,
  PostOptions,
  PostResult,
  SocialAccountInfo,
  SocialMetricsData,
  SocialPost,
} from "../types";

const PINTEREST_API_BASE = "https://api.pinterest.com/v5";
const PINTEREST_OAUTH_AUTHORIZE = "https://www.pinterest.com/oauth/";
const PINTEREST_TOKEN_ENDPOINT = "https://api.pinterest.com/v5/oauth/token";

// Required scopes for full Pinterest integration
const PINTEREST_SCOPES = [
  "pins:read",
  "pins:write",
  "boards:read",
  "boards:write",
  "user_accounts:read",
].join(",");

interface PinterestApiError {
  message?: string;
  code?: number;
  status?: number;
}

interface PinterestTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope?: string;
}

interface PinterestUser {
  account_type: string;
  profile_image?: string;
  website_url?: string;
  username: string;
}

export class PinterestClient implements ISocialClient {
  readonly platform = "PINTEREST" as const;

  private accessToken?: string;
  private boardId?: string; // Default board for pin creation

  constructor(options?: PinterestClientOptions) {
    this.accessToken = options?.accessToken;
    this.boardId = options?.boardId;
  }

  /**
   * Get the Pinterest OAuth authorization URL
   * Pinterest uses standard OAuth 2.0 (no PKCE required)
   */
  getAuthUrl(redirectUri: string, state: string): string {
    const appId = process.env["PINTEREST_APP_ID"]?.trim();

    if (!appId) {
      throw new Error("PINTEREST_APP_ID environment variable is not set");
    }

    const params = new URLSearchParams({
      response_type: "code",
      client_id: appId,
      redirect_uri: redirectUri,
      state,
      scope: PINTEREST_SCOPES,
    });

    return `${PINTEREST_OAUTH_AUTHORIZE}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access tokens
   */
  async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
  ): Promise<OAuthTokenResponse> {
    const appId = process.env["PINTEREST_APP_ID"]?.trim();
    const appSecret = process.env["PINTEREST_APP_SECRET"]?.trim();

    if (!appId || !appSecret) {
      throw new Error(
        "PINTEREST_APP_ID and PINTEREST_APP_SECRET environment variables are required",
      );
    }

    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    });

    // Pinterest requires Basic Auth for token exchange
    const credentials = Buffer.from(`${appId}:${appSecret}`).toString("base64");

    const response = await fetch(PINTEREST_TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorData = (await response
        .json()
        .catch(() => ({}))) as PinterestApiError;
      throw new Error(
        `Pinterest token exchange failed: ${errorData.message || response.statusText}`,
      );
    }

    const data: PinterestTokenResponse = await response.json();

    // Store access token for subsequent API calls
    this.accessToken = data.access_token;

    // Pinterest access tokens expire in 365 days by default
    const expiresAt = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000)
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 365 days

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
      tokenType: data.token_type,
      scope: data.scope,
    };
  }

  /**
   * Refresh an expired access token
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse> {
    const appId = process.env["PINTEREST_APP_ID"]?.trim();
    const appSecret = process.env["PINTEREST_APP_SECRET"]?.trim();

    if (!appId || !appSecret) {
      throw new Error(
        "PINTEREST_APP_ID and PINTEREST_APP_SECRET environment variables are required",
      );
    }

    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    const credentials = Buffer.from(`${appId}:${appSecret}`).toString("base64");

    const response = await fetch(PINTEREST_TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorData = (await response
        .json()
        .catch(() => ({}))) as PinterestApiError;
      throw new Error(
        `Pinterest token refresh failed: ${errorData.message || response.statusText}`,
      );
    }

    const data: PinterestTokenResponse = await response.json();

    this.accessToken = data.access_token;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
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
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = (await response
        .json()
        .catch(() => ({}))) as PinterestApiError;
      throw new Error(
        `Failed to get Pinterest account info: ${errorData.message || response.statusText}`,
      );
    }

    const data: PinterestUser = await response.json();

    return {
      platformId: data.username,
      username: data.username,
      displayName: data.username,
      profileUrl: `https://www.pinterest.com/${data.username}`,
      avatarUrl: data.profile_image,
    };
  }

  /**
   * Create a pin on Pinterest
   * Requires a board_id and image/video URL or media_source
   */
  async createPost(
    content: string,
    options?: PostOptions,
  ): Promise<PostResult> {
    const token = this.getAccessTokenOrThrow();

    // Get board ID from options or use default
    const boardId =
      (options?.metadata?.["board_id"] as string) || this.boardId;

    if (!boardId) {
      throw new Error(
        "board_id is required to create a pin. Set it in options.metadata.board_id or constructor",
      );
    }

    // Build pin creation payload
    const payload: {
      board_id: string;
      title?: string;
      description?: string;
      link?: string;
      alt_text?: string;
      media_source: {
        source_type: "image_url" | "video_url";
        url: string;
      };
    } = {
      board_id: boardId,
      description: content,
      media_source: {
        source_type: "image_url",
        url: options?.mediaUrls?.[0] || "",
      },
    };

    // Add optional fields from metadata
    if (options?.metadata?.["title"]) {
      payload.title = options.metadata["title"] as string;
    }
    if (options?.metadata?.["link"]) {
      payload.link = options.metadata["link"] as string;
    }
    if (options?.metadata?.["alt_text"]) {
      payload.alt_text = options.metadata["alt_text"] as string;
    }

    // Validate media URL
    if (!payload.media_source.url) {
      throw new Error("Media URL is required to create a pin");
    }

    const response = await fetch(`${PINTEREST_API_BASE}/pins`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = (await response
        .json()
        .catch(() => ({}))) as PinterestApiError;
      throw new Error(
        `Failed to create Pinterest pin: ${errorData.message || response.statusText}`,
      );
    }

    const data: PinterestPin = await response.json();

    return {
      platformPostId: data.id,
      url: `https://www.pinterest.com/pin/${data.id}`,
      publishedAt: new Date(data.created_at),
    };
  }

  /**
   * Get user's pins
   */
  async getPosts(limit = 25): Promise<SocialPost[]> {
    const token = this.getAccessTokenOrThrow();

    const params = new URLSearchParams({
      page_size: Math.min(limit, 250).toString(),
    });

    const response = await fetch(
      `${PINTEREST_API_BASE}/pins?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      const errorData = (await response
        .json()
        .catch(() => ({}))) as PinterestApiError;
      throw new Error(
        `Failed to get Pinterest pins: ${errorData.message || response.statusText}`,
      );
    }

    const data: { items: PinterestPin[] } = await response.json();

    return (data.items || []).map((pin) => ({
      id: pin.id,
      platformPostId: pin.id,
      platform: "PINTEREST" as const,
      content: pin.description || pin.title || "",
      mediaUrls: pin.media.images?.original
        ? [pin.media.images.original.url]
        : undefined,
      publishedAt: new Date(pin.created_at),
      url: `https://www.pinterest.com/pin/${pin.id}`,
      rawData: pin as unknown as Record<string, unknown>,
    }));
  }

  /**
   * Delete a pin
   */
  async deletePost(postId: string): Promise<void> {
    const token = this.getAccessTokenOrThrow();

    const response = await fetch(`${PINTEREST_API_BASE}/pins/${postId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = (await response
        .json()
        .catch(() => ({}))) as PinterestApiError;
      throw new Error(
        `Failed to delete Pinterest pin: ${errorData.message || response.statusText}`,
      );
    }
  }

  /**
   * Get account-level metrics
   */
  async getMetrics(): Promise<SocialMetricsData> {
    const token = this.getAccessTokenOrThrow();

    // Get user analytics
    const response = await fetch(
      `${PINTEREST_API_BASE}/user_account/analytics`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      const errorData = (await response
        .json()
        .catch(() => ({}))) as PinterestApiError;
      throw new Error(
        `Failed to get Pinterest metrics: ${errorData.message || response.statusText}`,
      );
    }

    const data = (await response.json()) as {
      all?: {
        metrics?: {
          IMPRESSION?: number;
          SAVE?: number;
          PIN_CLICK?: number;
        };
      };
    };

    const metrics = data.all?.metrics || {};

    return {
      followers: 0, // Pinterest doesn't provide follower count in basic API
      following: 0,
      postsCount: 0, // Would need separate call to count pins
      impressions: metrics.IMPRESSION || 0,
      engagementRate: 0,
    };
  }

  /**
   * Board Management - List all boards
   */
  async listBoards(pageSize = 25): Promise<PinterestBoard[]> {
    const token = this.getAccessTokenOrThrow();

    const params = new URLSearchParams({
      page_size: Math.min(pageSize, 250).toString(),
    });

    const response = await fetch(
      `${PINTEREST_API_BASE}/boards?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      const errorData = (await response
        .json()
        .catch(() => ({}))) as PinterestApiError;
      throw new Error(
        `Failed to list Pinterest boards: ${errorData.message || response.statusText}`,
      );
    }

    const data: { items: PinterestBoard[] } = await response.json();
    return data.items || [];
  }

  /**
   * Board Management - Create a new board
   */
  async createBoard(
    name: string,
    description?: string,
    privacy: "PUBLIC" | "PROTECTED" | "SECRET" = "PUBLIC",
  ): Promise<PinterestBoard> {
    const token = this.getAccessTokenOrThrow();

    const payload = {
      name,
      description,
      privacy: privacy.toLowerCase(),
    };

    const response = await fetch(`${PINTEREST_API_BASE}/boards`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = (await response
        .json()
        .catch(() => ({}))) as PinterestApiError;
      throw new Error(
        `Failed to create Pinterest board: ${errorData.message || response.statusText}`,
      );
    }

    return response.json();
  }

  /**
   * Board Management - Update an existing board
   */
  async updateBoard(
    boardId: string,
    updates: Partial<Pick<PinterestBoard, "name" | "description" | "privacy">>,
  ): Promise<PinterestBoard> {
    const token = this.getAccessTokenOrThrow();

    const payload: {
      name?: string;
      description?: string;
      privacy?: string;
    } = {};

    if (updates.name) payload.name = updates.name;
    if (updates.description !== undefined)
      payload.description = updates.description;
    if (updates.privacy) payload.privacy = updates.privacy.toLowerCase();

    const response = await fetch(`${PINTEREST_API_BASE}/boards/${boardId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = (await response
        .json()
        .catch(() => ({}))) as PinterestApiError;
      throw new Error(
        `Failed to update Pinterest board: ${errorData.message || response.statusText}`,
      );
    }

    return response.json();
  }

  /**
   * Board Management - Delete a board
   */
  async deleteBoard(boardId: string): Promise<void> {
    const token = this.getAccessTokenOrThrow();

    const response = await fetch(`${PINTEREST_API_BASE}/boards/${boardId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = (await response
        .json()
        .catch(() => ({}))) as PinterestApiError;
      throw new Error(
        `Failed to delete Pinterest board: ${errorData.message || response.statusText}`,
      );
    }
  }

  /**
   * Move a pin to a different board
   */
  async movePinToBoard(pinId: string, boardId: string): Promise<void> {
    const token = this.getAccessTokenOrThrow();

    const payload = {
      board_id: boardId,
    };

    const response = await fetch(`${PINTEREST_API_BASE}/pins/${pinId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = (await response
        .json()
        .catch(() => ({}))) as PinterestApiError;
      throw new Error(
        `Failed to move Pinterest pin: ${errorData.message || response.statusText}`,
      );
    }
  }

  /**
   * Get analytics for a specific pin
   */
  async getPinAnalytics(pinId: string): Promise<PinterestMetrics> {
    const token = this.getAccessTokenOrThrow();

    const response = await fetch(
      `${PINTEREST_API_BASE}/pins/${pinId}/analytics`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      const errorData = (await response
        .json()
        .catch(() => ({}))) as PinterestApiError;
      throw new Error(
        `Failed to get Pinterest pin analytics: ${errorData.message || response.statusText}`,
      );
    }

    const data = (await response.json()) as {
      all?: {
        metrics?: {
          IMPRESSION?: number;
          SAVE?: number;
          PIN_CLICK?: number;
          OUTBOUND_CLICK?: number;
        };
      };
    };

    const metrics = data.all?.metrics || {};

    return {
      pin_id: pinId,
      impression: metrics.IMPRESSION || 0,
      save: metrics.SAVE || 0,
      pin_click: metrics.PIN_CLICK || 0,
      outbound_click: metrics.OUTBOUND_CLICK || 0,
    };
  }

  /**
   * Set the access token for API calls
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  /**
   * Set the default board ID for pin creation
   */
  setDefaultBoard(boardId: string): void {
    this.boardId = boardId;
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
