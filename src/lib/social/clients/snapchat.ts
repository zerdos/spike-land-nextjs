/**
 * Snapchat Marketing API Client
 *
 * Implements ISocialClient interface for Snapchat OAuth 2.0
 * API Reference: https://marketingapi.snapchat.com/docs/
 *
 * NOTE: This client focuses on the Marketing API (ads platform).
 * Consumer posting API requires special Snap Kit approval.
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
  SnapchatAdAccount,
} from "../types";

const SNAPCHAT_API_BASE = "https://adsapi.snapchat.com/v1";
const SNAPCHAT_OAUTH_AUTHORIZE = "https://accounts.snapchat.com/login/oauth2/authorize";
const SNAPCHAT_TOKEN_ENDPOINT = "https://accounts.snapchat.com/login/oauth2/access_token";

// Snapchat Marketing API scopes
const SNAPCHAT_SCOPES = "snapchat-marketing-api";

/**
 * Snapchat API error response structure
 */
interface SnapchatApiError {
  request_status?: string;
  request_id?: string;
  debug_message?: string;
  display_message?: string;
}

/**
 * Custom error class for Snapchat API errors
 */
export class SnapchatHttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly statusText: string,
  ) {
    super(message);
    this.name = "SnapchatHttpError";
  }
}

/**
 * Snapchat organization response
 */
interface SnapchatOrganizationResponse {
  organizations?: Array<{
    organization: {
      id: string;
      name: string;
      country?: string;
    };
  }>;
}

/**
 * Snapchat ad accounts response
 */
interface SnapchatAdAccountsResponse {
  adaccounts?: Array<{
    adaccount: SnapchatAdAccount;
  }>;
}

export class SnapchatClient implements ISocialClient {
  readonly platform = "SNAPCHAT" as const;
  private accessToken?: string;

  constructor(options?: SocialClientOptions) {
    this.accessToken = options?.accessToken;
  }

  /**
   * Generate Snapchat OAuth 2.0 authorization URL
   */
  getAuthUrl(
    redirectUri: string,
    state: string,
    _codeChallenge?: string,
  ): string {
    const clientId = process.env["SNAPCHAT_CLIENT_ID"];
    if (!clientId) {
      throw new Error(
        "SNAPCHAT_CLIENT_ID environment variable is not configured",
      );
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SNAPCHAT_SCOPES,
      state,
    });

    return `${SNAPCHAT_OAUTH_AUTHORIZE}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access tokens
   */
  async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
    _codeVerifier?: string,
  ): Promise<OAuthTokenResponse> {
    const clientId = process.env["SNAPCHAT_CLIENT_ID"];
    const clientSecret = process.env["SNAPCHAT_CLIENT_SECRET"];

    if (!clientId || !clientSecret) {
      throw new Error(
        "SNAPCHAT_CLIENT_ID and SNAPCHAT_CLIENT_SECRET environment variables are required",
      );
    }

    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    });

    const response = await fetch(SNAPCHAT_TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as SnapchatApiError;
      throw new SnapchatHttpError(
        `Snapchat token exchange failed: ${
          errorData.display_message || errorData.debug_message || response.statusText
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
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      tokenType: data.token_type,
    };
  }

  /**
   * Refresh an expired access token
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse> {
    const clientId = process.env["SNAPCHAT_CLIENT_ID"];
    const clientSecret = process.env["SNAPCHAT_CLIENT_SECRET"];

    if (!clientId || !clientSecret) {
      throw new Error(
        "SNAPCHAT_CLIENT_ID and SNAPCHAT_CLIENT_SECRET environment variables are required",
      );
    }

    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    });

    const response = await fetch(SNAPCHAT_TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as SnapchatApiError;
      throw new SnapchatHttpError(
        `Snapchat token refresh failed: ${
          errorData.display_message || errorData.debug_message || response.statusText
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
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      tokenType: data.token_type,
    };
  }

  /**
   * Get authenticated user's account information
   *
   * For Snapchat Marketing API, this returns the first organization
   */
  async getAccountInfo(): Promise<SocialAccountInfo> {
    const token = this.getAccessTokenOrThrow();

    const response = await fetch(`${SNAPCHAT_API_BASE}/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as SnapchatApiError;
      throw new SnapchatHttpError(
        `Failed to get Snapchat user info: ${
          errorData.display_message || errorData.debug_message || response.statusText
        }`,
        response.status,
        response.statusText,
      );
    }

    const result = (await response.json()) as SnapchatOrganizationResponse;
    const org = result.organizations?.[0]?.organization;

    if (!org) {
      throw new SnapchatHttpError(
        "No Snapchat organization found",
        404,
        "Not Found",
      );
    }

    return {
      platformId: org.id,
      username: org.name,
      displayName: org.name,
      profileUrl: `https://ads.snapchat.com/`,
    };
  }

  /**
   * Create post - NOT SUPPORTED
   *
   * Snapchat's public API is marketing-focused (ads).
   * Consumer posting requires Snap Kit approval.
   */
  async createPost(
    _content: string,
    _options?: PostOptions,
  ): Promise<PostResult> {
    throw new SnapchatHttpError(
      "Snapchat consumer posting not available via Marketing API. Requires Snap Kit approval.",
      501,
      "Not Implemented",
    );
  }

  /**
   * Get posts - NOT SUPPORTED
   *
   * Marketing API doesn't provide consumer posts.
   */
  async getPosts(_limit = 10): Promise<SocialPost[]> {
    // Return empty array - no consumer posts available via Marketing API
    return [];
  }

  /**
   * Get account-level metrics
   *
   * For Marketing API, this could return ad account metrics
   * For now, returns basic info from account
   */
  async getMetrics(): Promise<SocialMetricsData> {
    const userInfo = await this.getAccountInfo();

    return {
      platform: "SNAPCHAT",
      followersCount: 0, // Not available in Marketing API
      followingCount: 0, // Not available in Marketing API
      postsCount: 0,
      engagementRate: 0,
      reach: 0,
      impressions: 0,
    };
  }

  /**
   * Get ad accounts for this organization
   */
  async getAdAccounts(): Promise<SnapchatAdAccount[]> {
    const token = this.getAccessTokenOrThrow();

    const response = await fetch(`${SNAPCHAT_API_BASE}/me/adaccounts`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as SnapchatApiError;
      throw new SnapchatHttpError(
        `Failed to get ad accounts: ${
          errorData.display_message || errorData.debug_message || response.statusText
        }`,
        response.status,
        response.statusText,
      );
    }

    const result = (await response.json()) as SnapchatAdAccountsResponse;
    return result.adaccounts?.map((item) => item.adaccount) ?? [];
  }

  /**
   * Helper method to get access token or throw error
   */
  private getAccessTokenOrThrow(): string {
    if (!this.accessToken) {
      throw new SnapchatHttpError(
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
