/**
 * Social Media Integration
 *
 * Factory functions and exports for social media platform clients
 */

import type { SocialPlatform } from "@prisma/client";

import type { ISocialClient, SocialClientOptions } from "./types";

// Re-export all types
export * from "./types";

/**
 * Create a social media client for the specified platform
 *
 * @param platform - The social media platform (TWITTER, FACEBOOK, INSTAGRAM)
 * @param options - Client configuration options including access token
 * @returns Platform-specific client implementing ISocialClient
 *
 * @example
 * ```ts
 * const twitterClient = await createSocialClient("TWITTER", {
 *   accessToken: decryptedToken,
 * });
 * const posts = await twitterClient.getPosts(10);
 * ```
 */
export async function createSocialClient(
  platform: SocialPlatform,
  options?: SocialClientOptions,
): Promise<ISocialClient> {
  switch (platform) {
    case "TWITTER": {
      // Dynamic import to avoid loading all clients
      const { TwitterClient } = await import("./clients/twitter");
      return new TwitterClient(options);
    }
    case "FACEBOOK": {
      const { FacebookClient } = await import("./clients/facebook");
      return new FacebookClient(options);
    }
    case "INSTAGRAM": {
      const { InstagramClient } = await import("./clients/instagram");
      return new InstagramClient(options);
    }
    case "LINKEDIN": {
      const { LinkedInClient } = await import("./clients/linkedin");
      return new LinkedInClient(options);
    }
    case "YOUTUBE": {
      const { YouTubeClient } = await import("./clients/youtube");
      return new YouTubeClient(options);
    }
    case "DISCORD":
      throw new Error(
        "Discord uses bot authentication, not OAuth. Configure DISCORD_BOT_TOKEN and DISCORD_SERVER_ID in environment variables.",
      );
    case "TIKTOK": {
      const { TikTokClient } = await import("./clients/tiktok");
      return new TikTokClient(options);
    }
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}

/**
 * Get the OAuth authorization URL for a platform
 *
 * Convenience function that doesn't require an access token
 */
export async function getSocialAuthUrl(
  platform: SocialPlatform,
  redirectUri: string,
  state: string,
  codeChallenge?: string,
): Promise<string> {
  switch (platform) {
    case "TWITTER": {
      const { TwitterClient } = await import("./clients/twitter");
      const client = new TwitterClient();
      return client.getAuthUrl(redirectUri, state, codeChallenge);
    }
    case "FACEBOOK":
    case "INSTAGRAM": {
      // Instagram uses Facebook OAuth
      const { FacebookClient } = await import("./clients/facebook");
      const client = new FacebookClient();
      return client.getAuthUrl(redirectUri, state);
    }
    case "LINKEDIN": {
      const { LinkedInClient } = await import("./clients/linkedin");
      const client = new LinkedInClient();
      return client.getAuthUrl(redirectUri, state);
    }
    case "YOUTUBE": {
      const { YouTubeClient } = await import("./clients/youtube");
      const client = new YouTubeClient();
      return client.getAuthUrl(redirectUri, state);
    }
    case "DISCORD":
      throw new Error(
        "Discord uses bot authentication, not OAuth. Configure DISCORD_BOT_TOKEN and DISCORD_SERVER_ID in environment variables.",
      );
    case "TIKTOK": {
      const { TikTokClient } = await import("./clients/tiktok");
      const client = new TikTokClient();
      return client.getAuthUrl(redirectUri, state);
    }
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}

/**
 * Generate PKCE code verifier and challenge
 * Required for Twitter OAuth 2.0
 */
export async function generatePKCE(): Promise<{
  codeVerifier: string;
  codeChallenge: string;
}> {
  // Generate a random code verifier (43-128 characters)
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const codeVerifier = Buffer.from(array)
    .toString("base64url")
    .slice(0, 128);

  // Generate code challenge using SHA-256
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);

  // Use Web Crypto API for SHA-256 hashing
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const codeChallenge = Buffer.from(hashBuffer).toString("base64url");

  return { codeVerifier, codeChallenge };
}
