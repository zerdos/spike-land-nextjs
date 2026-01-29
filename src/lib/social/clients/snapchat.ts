/**
 * Snapchat Marketing API Client
 *
 * Implements ISocialClient interface for Snapchat OAuth and story posting
 * API Reference: https://marketingapi.snapchat.com/docs/
 */

import type {
  ISocialClient,
  MediaValidationResult,
  OAuthTokenResponse,
  PostOptions,
  PostResult,
  SnapchatAdAccount,
  SnapchatContent,
  SnapchatOrganization,
  SnapchatStory,
  SocialAccountInfo,
  SocialClientOptions,
  SocialMetricsData,
  SocialPost,
  StoryMetrics,
} from "../types";

const SNAPCHAT_API_BASE = "https://adsapi.snapchat.com/v1";
const SNAPCHAT_OAUTH_AUTHORIZE = "https://accounts.snapchat.com/accounts/oauth2/auth";
const SNAPCHAT_TOKEN_ENDPOINT = `${SNAPCHAT_API_BASE}/oauth2/token`;
const SNAPCHAT_SCOPES = "snapchat-marketing-api snapchat-audience-api snapchat-creative-api";

interface SnapchatApiError {
  error?: string;
  error_description?: string;
  request_status?: string;
  request_id?: string;
  debug_message?: string;
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

interface SnapchatOrganizationResponse {
  organizations: SnapchatOrganization[];
  paging?: {
    next_link?: string;
  };
}

interface SnapchatAdAccountsResponse {
  adaccounts: SnapchatAdAccount[];
  paging?: {
    next_link?: string;
  };
}

interface SnapchatCreativeResponse {
  creatives: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    created_at: string;
  }>;
}

interface SnapchatStatsResponse {
  total_stats: Array<{
    id: string;
    type: string;
    granularity: string;
    start_time: string;
    end_time: string;
    stats: {
      impressions?: number;
      swipes?: number;
      view_completion?: number;
      screen_time_millis?: number;
      quartile_1?: number;
      quartile_2?: number;
      quartile_3?: number;
      view_time_millis?: number;
      screenshot?: number;
    };
  }>;
}

export class SnapchatClient implements ISocialClient {
  readonly platform = "SNAPCHAT" as const;
  private accessToken?: string;
  private accountId?: string;

  constructor(options?: SocialClientOptions) {
    this.accessToken = options?.accessToken;
    this.accountId = options?.accountId;
  }

  /**
   * Generate Snapchat OAuth 2.0 authorization URL
   */
  getAuthUrl(
    redirectUri: string,
    state: string,
  ): string {
    const clientId = process.env["SNAPCHAT_CLIENT_ID"];
    if (!clientId) {
      throw new Error(
        "SNAPCHAT_CLIENT_ID environment variable is not configured",
      );
    }

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
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
          errorData.error_description || errorData.error || response.statusText
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
      scope?: string;
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
          errorData.error_description || errorData.error || response.statusText
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
      scope?: string;
    };

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
   * Get organizations associated with the account
   */
  async getOrganizations(): Promise<SnapchatOrganization[]> {
    const token = this.getAccessTokenOrThrow();

    const response = await fetch(
      `${SNAPCHAT_API_BASE}/me/organizations`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as SnapchatApiError;
      throw new SnapchatHttpError(
        `Failed to get Snapchat organizations: ${
          errorData.debug_message || errorData.error || response.statusText
        }`,
        response.status,
        response.statusText,
      );
    }

    const data = (await response.json()) as SnapchatOrganizationResponse;
    return data.organizations || [];
  }

  /**
   * Get ad accounts for an organization
   */
  async getAdAccounts(orgId: string): Promise<SnapchatAdAccount[]> {
    const token = this.getAccessTokenOrThrow();

    const response = await fetch(
      `${SNAPCHAT_API_BASE}/organizations/${orgId}/adaccounts`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as SnapchatApiError;
      throw new SnapchatHttpError(
        `Failed to get Snapchat ad accounts: ${
          errorData.debug_message || errorData.error || response.statusText
        }`,
        response.status,
        response.statusText,
      );
    }

    const data = (await response.json()) as SnapchatAdAccountsResponse;
    return data.adaccounts || [];
  }

  /**
   * Get authenticated user's account information
   */
  async getAccountInfo(): Promise<SocialAccountInfo> {
    // Get organizations first
    const orgs = await this.getOrganizations();
    if (orgs.length === 0) {
      throw new Error("No Snapchat organizations found for this account");
    }

    // Use first organization (checked above, so we know orgs[0] exists)
    const org = orgs[0]!;

    // Get profile information from organization
    return {
      platformId: org.id,
      username: org.name,
      displayName: org.name,
      profileUrl: undefined, // Snapchat doesn't provide public profile URLs for businesses
      avatarUrl: undefined,
      followersCount: undefined,
      followingCount: undefined,
    };
  }

  /**
   * Validate media meets Snapchat specifications
   */
  async validateMedia(
    file: Buffer,
    type: "IMAGE" | "VIDEO",
  ): Promise<MediaValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check file size
    const fileSize = file.length;
    const maxSize = 5 * 1024 * 1024; // 5MB for images

    if (type === "IMAGE") {
      if (fileSize > maxSize) {
        errors.push(`Image file size (${(fileSize / 1024 / 1024).toFixed(2)}MB) exceeds maximum of 5MB`);
      }

      // Note: Full image validation would require sharp or similar library
      // For now, basic validation
      return {
        valid: errors.length === 0,
        errors,
        warnings,
        metadata: {
          width: 0, // Would need sharp to get actual dimensions
          height: 0,
          fileSize,
          aspectRatio: "9:16 (recommended)",
        },
      };
    } else {
      // Video validation
      const maxVideoSize = 32 * 1024 * 1024; // 32MB for videos
      if (fileSize > maxVideoSize) {
        errors.push(`Video file size (${(fileSize / 1024 / 1024).toFixed(2)}MB) exceeds maximum of 32MB`);
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings: ["Video duration should be 60 seconds or less", "Aspect ratio should be 9:16"],
        metadata: {
          width: 0,
          height: 0,
          fileSize,
          aspectRatio: "9:16 (recommended)",
        },
      };
    }
  }

  /**
   * Create a story post
   * Note: Actual media upload and story creation requires additional Snapchat API endpoints
   * This is a simplified implementation that would need to be expanded for production use
   */
  async createPost(
    _content: string,
    _options?: PostOptions,
  ): Promise<PostResult> {
    this.getAccessTokenOrThrow();

    if (!this.accountId) {
      throw new Error("Account ID is required to create posts");
    }

    // In a real implementation, this would:
    // 1. Upload media to Snapchat's media library
    // 2. Create a creative with the media
    // 3. Create a story with the creative

    // For now, return a placeholder response
    // This would need to be implemented with actual Snapchat Content API calls

    throw new Error("Story creation not yet fully implemented - requires media upload and creative creation");
  }

  /**
   * Get stories for the account
   */
  async getStories(accountId: string): Promise<SnapchatStory[]> {
    const token = this.getAccessTokenOrThrow();

    const response = await fetch(
      `${SNAPCHAT_API_BASE}/adaccounts/${accountId}/creatives`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as SnapchatApiError;
      throw new SnapchatHttpError(
        `Failed to get stories: ${
          errorData.debug_message || errorData.error || response.statusText
        }`,
        response.status,
        response.statusText,
      );
    }

    const data = (await response.json()) as SnapchatCreativeResponse;

    // Convert creatives to stories format
    return (data.creatives || []).map(creative => ({
      id: creative.id,
      creative_id: creative.id,
      media_url: "", // Would need to fetch from creative details
      created_at: creative.created_at,
      type: "IMAGE" as const, // Would need to determine from creative
      duration: undefined,
    }));
  }

  /**
   * Get posts (stories) for the account
   */
  async getPosts(limit = 10): Promise<SocialPost[]> {
    if (!this.accountId) {
      const accountInfo = await this.getAccountInfo();
      this.accountId = accountInfo.platformId;
    }

    const stories = await this.getStories(this.accountId);

    return stories.slice(0, limit).map(story => ({
      id: story.id,
      platformPostId: story.id,
      platform: "SNAPCHAT" as const,
      content: "", // Snapchat stories don't have text content in the API
      mediaUrls: story.media_url ? [story.media_url] : undefined,
      publishedAt: new Date(story.created_at),
      url: "", // Snapchat doesn't provide public URLs for stories
      rawData: story as unknown as Record<string, unknown>,
    }));
  }

  /**
   * Get metrics for a specific story
   */
  async getStoryMetrics(storyId: string): Promise<StoryMetrics> {
    const token = this.getAccessTokenOrThrow();

    if (!this.accountId) {
      throw new Error("Account ID is required to get story metrics");
    }

    const params = new URLSearchParams({
      granularity: "TOTAL",
      fields: "impressions,swipes,view_completion,screenshot",
      start_time: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      end_time: new Date().toISOString(),
    });

    const response = await fetch(
      `${SNAPCHAT_API_BASE}/creatives/${storyId}/stats?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      // Return zero metrics if stats not available
      return {
        views: 0,
        screenshots: 0,
        replies: 0,
        completionRate: 0,
        impressions: 0,
        reach: 0,
      };
    }

    const data = (await response.json()) as SnapchatStatsResponse;
    const stats = data.total_stats?.[0]?.stats;

    if (!stats) {
      return {
        views: 0,
        screenshots: 0,
        replies: 0,
        completionRate: 0,
        impressions: 0,
        reach: 0,
      };
    }

    return {
      views: stats.impressions || 0,
      screenshots: stats.screenshot || 0,
      replies: stats.swipes || 0, // Using swipes as proxy for engagement
      completionRate: stats.view_completion || 0,
      impressions: stats.impressions || 0,
      reach: stats.impressions || 0, // Snapchat doesn't separate reach from impressions in basic stats
    };
  }

  /**
   * Get account-level metrics
   */
  async getMetrics(): Promise<SocialMetricsData> {
    // Snapchat doesn't provide follower/following counts via API
    // Metrics are primarily campaign/ad-based

    return {
      followers: 0,
      following: 0,
      postsCount: 0,
      engagementRate: 0,
      impressions: 0,
      reach: 0,
    };
  }

  /**
   * Submit content to Spotlight
   */
  async submitToSpotlight(_content: SnapchatContent): Promise<PostResult> {
    // Spotlight submission would require specific API endpoints
    // This is a placeholder for future implementation
    throw new Error("Spotlight submission not yet implemented");
  }

  /**
   * Set access token (for use after decryption)
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  /**
   * Set account ID
   */
  setAccountId(accountId: string): void {
    this.accountId = accountId;
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
