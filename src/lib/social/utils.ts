/**
 * Social Media Integration Utilities
 *
 * Shared utility functions for social media OAuth and API operations
 */

/**
 * Get OAuth redirect URI for social media callbacks
 *
 * Priority:
 * 1. Platform-specific callback URL (e.g., TWITTER_CALLBACK_URL)
 * 2. Constructed from NEXTAUTH_URL or VERCEL_URL
 * 3. Falls back to http://localhost:3000 for development
 *
 * Note: Automatically detects localhost and uses HTTP instead of HTTPS
 *
 * @param callbackPath - The API callback path (e.g., '/api/social/twitter/callback')
 * @param platformCallbackEnvVar - Optional platform-specific env var (e.g., 'TWITTER_CALLBACK_URL')
 * @returns The full callback URL
 */
export function getOAuthRedirectUri(
  callbackPath: string,
  platformCallbackEnvVar?: string,
): string {
  // Check for platform-specific callback URL first
  if (platformCallbackEnvVar && process.env[platformCallbackEnvVar]) {
    return process.env[platformCallbackEnvVar]!;
  }

  // Build from base URL
  const baseUrl = process.env.NEXTAUTH_URL ||
    process.env.VERCEL_URL ||
    "http://localhost:3000";

  // Determine protocol
  let fullBaseUrl: string;
  if (baseUrl.startsWith("http://") || baseUrl.startsWith("https://")) {
    // Already has protocol
    fullBaseUrl = baseUrl;
  } else if (baseUrl.includes("localhost") || baseUrl.startsWith("127.0.0.1")) {
    // Localhost should use HTTP for development
    fullBaseUrl = `http://${baseUrl}`;
  } else {
    // Production domains should use HTTPS
    fullBaseUrl = `https://${baseUrl}`;
  }

  // Ensure callback path starts with /
  const normalizedPath = callbackPath.startsWith("/")
    ? callbackPath
    : `/${callbackPath}`;

  return `${fullBaseUrl}${normalizedPath}`;
}
