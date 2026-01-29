/**
 * Twitter/X API v2 Client
 *
 * Implements ISocialClient interface for Twitter OAuth 2.0 with PKCE
 * API Reference: https://developer.twitter.com/en/docs/twitter-api
 */

import type {
  CommentPreview,
  ISocialClient,
  OAuthTokenResponse,
  PostOptions,
  PostResult,
  SocialAccountInfo,
  SocialClientOptions,
  SocialMetricsData,
  SocialPost,
  TwitterMedia,
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
  includes?: {
    media?: TwitterMedia[];
    users?: TwitterUser[];
  };
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
   * Search recent tweets
   */
  async search(query: string, limit = 20): Promise<TwitterTweet[]> {
    const token = this.getAccessTokenOrThrow();

    const params = new URLSearchParams({
      query,
      max_results: limit.toString(),
      expansions: "author_id",
      "tweet.fields": "id,text,created_at,public_metrics,author_id",
      "user.fields": "id,name,username,profile_image_url",
    });

    const response = await fetch(
      `${TWITTER_API_BASE}/2/tweets/search/recent?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as TwitterApiError;
      throw new TwitterHttpError(
        `Failed to search tweets: ${errorData.detail || errorData.title || response.statusText}`,
        response.status,
        response.statusText,
      );
    }

    const result = await response.json();
    const tweets = result.data ?? [];
    const users = result.includes?.users ?? [];

    // Map authors to their tweets
    return tweets.map((tweet: TwitterTweet) => ({
      ...tweet,
      author: users.find((user: TwitterUser) => user.id === tweet.author_id),
    }));
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
      "tweet.fields": "id,text,created_at,public_metrics,author_id,attachments",
      expansions: "attachments.media_keys",
      "media.fields": "url,preview_image_url,type",
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

    const { data: tweets, includes } = (await response.json()) as TwitterTweetsResponse;

    if (!tweets || tweets.length === 0) {
      return [];
    }

    // Build media map from includes for quick lookup
    const mediaMap = new Map<string, TwitterMedia>();
    if (includes?.media) {
      for (const media of includes.media) {
        mediaMap.set(media.media_key, media);
      }
    }

    // Get username for URLs with caching
    const username = await this.getUsername();

    return tweets.map((tweet) => {
      // Extract media URLs from attachments
      const mediaUrls: string[] = [];
      if (tweet.attachments?.media_keys) {
        for (const mediaKey of tweet.attachments.media_keys) {
          const media = mediaMap.get(mediaKey);
          if (media) {
            // Use url for photos, preview_image_url for videos
            const mediaUrl = media.url || media.preview_image_url;
            if (mediaUrl) {
              mediaUrls.push(mediaUrl);
            }
          }
        }
      }

      return {
        id: tweet.id,
        platformPostId: tweet.id,
        platform: "TWITTER" as const,
        content: tweet.text,
        mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
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
      };
    });
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
   * Get recent comments (replies) for a tweet
   * Uses the Search API to find replies to a specific tweet
   *
   * @param tweetId - The ID of the tweet to fetch replies for
   * @param limit - Maximum number of comments to return (default: 3)
   * @returns Array of comment previews
   *
   * @note Requests minimum 10 results from the API regardless of limit parameter.
   * This is because:
   * 1. Search API may include the original tweet in results (filtered out)
   * 2. Results may include filtered/blocked content that reduces actual count
   * 3. Self-replies from the tweet author are excluded
   * This ensures reliable results but may consume more API quota on free tier.
   */
  async getComments(tweetId: string, limit = 3): Promise<CommentPreview[]> {
    const token = this.getAccessTokenOrThrow();

    // Get username to exclude self-replies
    const username = await this.getUsername();

    // Search for replies to this tweet (conversation_id)
    // Exclude replies from the tweet author themselves
    const query = `conversation_id:${tweetId} -from:${username}`;

    const params = new URLSearchParams({
      query,
      max_results: Math.min(Math.max(limit, 10), 100).toString(), // Request more to account for filtering
      "tweet.fields": "id,text,created_at,author_id",
      expansions: "author_id",
      "user.fields": "id,name,username,profile_image_url",
    });

    const response = await fetch(
      `${TWITTER_API_BASE}/2/tweets/search/recent?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      // Search API may return 400 for various reasons (e.g., rate limits on free tier)
      // Return empty array rather than failing
      return [];
    }

    const result = await response.json() as TwitterTweetsResponse;
    const tweets = result.data ?? [];
    const users = result.includes?.users ?? [];

    // Build user map for quick lookup
    const userMap = new Map<string, TwitterUser>();
    for (const user of users) {
      userMap.set(user.id, user);
    }

    // Map tweets to CommentPreview, excluding the original tweet itself
    return tweets
      .filter((tweet) => tweet.id !== tweetId)
      .slice(0, limit)
      .map((tweet) => {
        const author = tweet.author_id ? userMap.get(tweet.author_id) : undefined;
        return {
          id: tweet.id,
          content: tweet.text,
          senderName: author?.name || author?.username || "Unknown",
          senderAvatarUrl: author?.profile_image_url,
          createdAt: tweet.created_at ? new Date(tweet.created_at) : new Date(),
        };
      });
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
    } catch (error) {
      // Fallback to Twitter's generic "i" URL format when username fetch fails
      // This can happen if the access token is expired or user info is unavailable
      console.warn(
        'Failed to fetch Twitter username, using fallback:',
        error instanceof Error ? error.message : String(error)
      );
      return "i";
    }
  }
}
