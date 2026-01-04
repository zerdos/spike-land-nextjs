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
 * const twitterClient = createSocialClient("TWITTER", {
 *   accessToken: decryptedToken,
 * });
 * const posts = await twitterClient.getPosts(10);
 * ```
 */
export function createSocialClient(
  platform: SocialPlatform,
  options?: SocialClientOptions,
): ISocialClient {
  switch (platform) {
    case "TWITTER": {
      // Dynamic import to avoid loading all clients
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { TwitterClient } = require("./clients/twitter");
      return new TwitterClient(options);
    }
    case "FACEBOOK": {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { FacebookClient } = require("./clients/facebook");
      return new FacebookClient(options);
    }
    case "INSTAGRAM": {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { InstagramClient } = require("./clients/instagram");
      return new InstagramClient(options);
    }
    case "LINKEDIN":
    case "TIKTOK":
      throw new Error(`Platform ${platform} is not yet implemented`);
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}

/**
 * Get the OAuth authorization URL for a platform
 *
 * Convenience function that doesn't require an access token
 */
export function getSocialAuthUrl(
  platform: SocialPlatform,
  redirectUri: string,
  state: string,
  codeChallenge?: string,
): string {
  switch (platform) {
    case "TWITTER": {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { TwitterClient } = require("./clients/twitter");
      const client = new TwitterClient();
      return client.getAuthUrl(redirectUri, state, codeChallenge);
    }
    case "FACEBOOK":
    case "INSTAGRAM": {
      // Instagram uses Facebook OAuth
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { FacebookClient } = require("./clients/facebook");
      const client = new FacebookClient();
      return client.getAuthUrl(redirectUri, state);
    }
    case "LINKEDIN":
    case "TIKTOK":
      throw new Error(`Platform ${platform} is not yet implemented`);
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}

/**
 * Generate PKCE code verifier and challenge
 * Required for Twitter OAuth 2.0
 */
export function generatePKCE(): { codeVerifier: string; codeChallenge: string; } {
  // Generate a random code verifier (43-128 characters)
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const codeVerifier = Buffer.from(array)
    .toString("base64url")
    .slice(0, 128);

  // Generate code challenge using SHA-256
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);

  // We need to use async crypto, but this is a sync function
  // So we use the synchronous approach with Node.js crypto
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeCrypto = require("crypto");
  const hash = nodeCrypto.createHash("sha256").update(data).digest();
  const codeChallenge = Buffer.from(hash).toString("base64url");

  return { codeVerifier, codeChallenge };
}
