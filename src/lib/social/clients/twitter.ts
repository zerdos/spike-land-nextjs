/**
 * Twitter/X API v2 Client
 *
 * Implements ISocialClient interface for Twitter OAuth 2.0 with PKCE
 * API Reference: https://developer.twitter.com/en/docs/twitter-api
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
  TwitterTweet,
  TwitterUser,
} from "../types";

const TWITTER_API_BASE = "https://api.twitter.com";
const TWITTER_OAUTH_AUTHORIZE = "https://twitter.com/i/oauth2/authorize";
const TWITTER_TOKEN_ENDPOINT = `${TWITTER_API_BASE}/2/oauth2/token`;
const TWITTER_SCOPES = "tweet.read tweet.write users.read offline.access";

interface TwitterApiError {
  error?: string;
  error_description?: string;
  detail?: string;
  title?: string;
  type?: string;
  errors?: Array<{ message: string; code?: number; }>;
}

/**
 * Custom error class for Twitter API errors that includes HTTP status
 */
export class TwitterHttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly statusText: string,
  ) {
    super(message);
    this.name = "TwitterHttpError";
  }
}

interface TwitterUserResponse {
  data: TwitterUser;
}

interface TwitterTweetsResponse {
  data?: TwitterTweet[];
  meta?: {
    result_count: number;
    next_token?: string;
  };
}

interface TwitterCreateTweetResponse {
  data: {
    id: string;
    text: string;
  };
}

export class TwitterClient implements ISocialClient {
  readonly platform = "TWITTER" as const;
  private accessToken?: string;
  private twitterUserId?: string;
  private cachedUsername?: string; // Cache username to avoid repeated API calls

  constructor(options?: SocialClientOptions) {
    this.accessToken = options?.accessToken;
    this.twitterUserId = options?.accountId;
  }

  /**
   * Generate Twitter OAuth 2.0 authorization URL with PKCE
   */
  getAuthUrl(
    redirectUri: string,
    state: string,
    codeChallenge?: string,
  ): string {
    const clientId = process.env.TWITTER_CLIENT_ID;
    if (!clientId) {
      throw new Error(
        "TWITTER_CLIENT_ID environment variable is not configured",
      );
    }

    if (!codeChallenge) {
      throw new Error(
        "codeChallenge is required for Twitter OAuth 2.0 PKCE flow",
      );
    }

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: TWITTER_SCOPES,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    return `${TWITTER_OAUTH_AUTHORIZE}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access tokens using PKCE
   */
  async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
    codeVerifier?: string,
  ): Promise<OAuthTokenResponse> {
    const clientId = process.env.TWITTER_CLIENT_ID;
    const clientSecret = process.env.TWITTER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error(
        "TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET environment variables are required",
      );
    }

    if (!codeVerifier) {
      throw new Error(
        "codeVerifier is required for Twitter OAuth 2.0 PKCE flow",
      );
    }

    // Twitter requires Basic auth with client_id:client_secret
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString(
      "base64",
    );

    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    });

    const response = await fetch(TWITTER_TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as TwitterApiError;
      throw new TwitterHttpError(
        `Twitter token exchange failed: ${
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

    // NOTE: Token is not stored on the client instance here.
    // Callers are responsible for securely handling the token (encryption, database storage)
    // and setting it on the client via setAccessToken() or passing to constructor after encryption.

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
    const clientId = process.env.TWITTER_CLIENT_ID;
    const clientSecret = process.env.TWITTER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error(
        "TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET environment variables are required",
      );
    }

    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString(
      "base64",
    );

    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    const response = await fetch(TWITTER_TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as TwitterApiError;
      throw new TwitterHttpError(
        `Twitter token refresh failed: ${
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
   * Get authenticated user's account information
   */
  async getAccountInfo(): Promise<SocialAccountInfo> {
    const token = this.getAccessTokenOrThrow();

    const response = await fetch(
      `${TWITTER_API_BASE}/2/users/me?user.fields=id,name,username,profile_image_url,public_metrics`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as TwitterApiError;
      throw new TwitterHttpError(
        `Failed to get Twitter user info: ${
          errorData.detail || errorData.title || response.statusText
        }`,
        response.status,
        response.statusText,
      );
    }

    const { data } = (await response.json()) as TwitterUserResponse;

    // Store user ID for subsequent calls
    this.twitterUserId = data.id;

    return {
      platformId: data.id,
      username: data.username,
      displayName: data.name,
      profileUrl: `https://twitter.com/${data.username}`,
      avatarUrl: data.profile_image_url,
      followersCount: data.public_metrics?.followers_count,
      followingCount: data.public_metrics?.following_count,
    };
  }

  /**
   * Create a new tweet
   */
  async createPost(
    content: string,
    options?: PostOptions,
  ): Promise<PostResult> {
    const token = this.getAccessTokenOrThrow();

    interface TweetPayload {
      text: string;
      reply?: { in_reply_to_tweet_id: string; };
      media?: { media_ids: string[]; };
    }

    const payload: TweetPayload = {
      text: content,
    };

    // Add reply context if provided
    if (options?.replyToId) {
      payload.reply = {
        in_reply_to_tweet_id: options.replyToId,
      };
    }

    // Add media if provided (media IDs must be pre-uploaded)
    if (options?.mediaIds && options.mediaIds.length > 0) {
      payload.media = {
        media_ids: options.mediaIds,
      };
    }

    const response = await fetch(`${TWITTER_API_BASE}/2/tweets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as TwitterApiError;
      const errorMessage = errorData.detail ||
        errorData.title ||
        errorData.errors?.[0]?.message ||
        response.statusText;
      throw new TwitterHttpError(
        `Failed to create tweet: ${errorMessage}`,
        response.status,
        response.statusText,
      );
    }

    const { data } = (await response.json()) as TwitterCreateTweetResponse;

    // Get username for URL with caching
    const username = await this.getUsername();

    return {
      platformPostId: data.id,
      url: `https://twitter.com/${username}/status/${data.id}`,
      publishedAt: new Date(),
    };
  }

  /**
   * Get user's recent tweets
   */
  async getPosts(limit = 10): Promise<SocialPost[]> {
    const token = this.getAccessTokenOrThrow();

    // Ensure we have the user ID
    if (!this.twitterUserId) {
      const userInfo = await this.getAccountInfo();
      this.twitterUserId = userInfo.platformId;
    }

    const params = new URLSearchParams({
      max_results: Math.min(Math.max(limit, 5), 100).toString(), // Twitter allows 5-100
      "tweet.fields": "id,text,created_at,public_metrics,author_id",
    });

    const response = await fetch(
      `${TWITTER_API_BASE}/2/users/${this.twitterUserId}/tweets?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as TwitterApiError;
      throw new TwitterHttpError(
        `Failed to get tweets: ${errorData.detail || errorData.title || response.statusText}`,
        response.status,
        response.statusText,
      );
    }

    const { data: tweets } = (await response.json()) as TwitterTweetsResponse;

    if (!tweets || tweets.length === 0) {
      return [];
    }

    // Get username for URLs with caching
    const username = await this.getUsername();

    return tweets.map((tweet) => ({
      id: tweet.id,
      platformPostId: tweet.id,
      platform: "TWITTER" as const,
      content: tweet.text,
      publishedAt: tweet.created_at ? new Date(tweet.created_at) : new Date(),
      url: `https://twitter.com/${username}/status/${tweet.id}`,
      metrics: tweet.public_metrics
        ? {
          likes: tweet.public_metrics.like_count,
          comments: tweet.public_metrics.reply_count,
          shares: tweet.public_metrics.retweet_count +
            tweet.public_metrics.quote_count,
          impressions: tweet.public_metrics.impression_count,
        }
        : undefined,
      rawData: tweet as unknown as Record<string, unknown>,
    }));
  }

  /**
   * Delete a tweet
   */
  async deletePost(postId: string): Promise<void> {
    const token = this.getAccessTokenOrThrow();

    const response = await fetch(`${TWITTER_API_BASE}/2/tweets/${postId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as TwitterApiError;
      throw new TwitterHttpError(
        `Failed to delete tweet: ${errorData.detail || errorData.title || response.statusText}`,
        response.status,
        response.statusText,
      );
    }
  }

  /**
   * Like a tweet
   */
  async likePost(postId: string): Promise<void> {
    const token = this.getAccessTokenOrThrow();

    // Ensure we have the user ID
    if (!this.twitterUserId) {
      const userInfo = await this.getAccountInfo();
      this.twitterUserId = userInfo.platformId;
    }

    const response = await fetch(
      `${TWITTER_API_BASE}/2/users/${this.twitterUserId}/likes`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tweet_id: postId }),
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as TwitterApiError;
      throw new TwitterHttpError(
        `Failed to like tweet: ${errorData.detail || errorData.title || response.statusText}`,
        response.status,
        response.statusText,
      );
    }
  }

  /**
   * Unlike a tweet
   */
  async unlikePost(postId: string): Promise<void> {
    const token = this.getAccessTokenOrThrow();

    // Ensure we have the user ID
    if (!this.twitterUserId) {
      const userInfo = await this.getAccountInfo();
      this.twitterUserId = userInfo.platformId;
    }

    const response = await fetch(
      `${TWITTER_API_BASE}/2/users/${this.twitterUserId}/likes/${postId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as TwitterApiError;
      throw new TwitterHttpError(
        `Failed to unlike tweet: ${errorData.detail || errorData.title || response.statusText}`,
        response.status,
        response.statusText,
      );
    }
  }

  /**
   * Reply to a tweet
   */
  async replyToPost(postId: string, content: string): Promise<PostResult> {
    return this.createPost(content, { replyToId: postId });
  }

  /**
   * Get account-level metrics
   */
  async getMetrics(): Promise<SocialMetricsData> {
    const token = this.getAccessTokenOrThrow();

    // Get user info with public metrics
    const response = await fetch(
      `${TWITTER_API_BASE}/2/users/me?user.fields=public_metrics`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as TwitterApiError;
      throw new TwitterHttpError(
        `Failed to get Twitter metrics: ${
          errorData.detail || errorData.title || response.statusText
        }`,
        response.status,
        response.statusText,
      );
    }

    const { data } = (await response.json()) as TwitterUserResponse;

    return {
      followers: data.public_metrics?.followers_count ?? 0,
      following: data.public_metrics?.following_count ?? 0,
      postsCount: data.public_metrics?.tweet_count ?? 0,
    };
  }

  /**
   * Set access token (for use after decryption)
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  /**
   * Set user ID (for API calls that require it)
   */
  setUserId(userId: string): void {
    this.twitterUserId = userId;
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

  /**
   * Get username with caching to avoid repeated API calls
   * Returns "i" fallback if username cannot be fetched
   */
  private async getUsername(): Promise<string> {
    if (this.cachedUsername) {
      return this.cachedUsername;
    }

    try {
      const userInfo = await this.getAccountInfo();
      this.cachedUsername = userInfo.username;
      return this.cachedUsername;
    } catch {
      // Fall back to generic "i" format
      return "i";
    }
  }
}
