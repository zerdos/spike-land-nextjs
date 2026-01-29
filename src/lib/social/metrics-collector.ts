/**
 * Pulse Metrics Collector
 *
 * Collects social media metrics from all active accounts
 * and stores them in the SocialMetrics table.
 *
 * Used by the pulse-metrics cron job (ORB-013).
 *
 * Resolves #646
 */

import type { SocialAccount, SocialPlatform } from "@prisma/client";

import { safeDecryptToken } from "@/lib/crypto/token-encryption";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";

import { FacebookClient } from "./clients/facebook";
import { InstagramClient } from "./clients/instagram";
import { LinkedInClient } from "./clients/linkedin";
import { TikTokClient } from "./clients/tiktok";
import { TwitterClient } from "./clients/twitter";
import { YouTubeClient } from "./clients/youtube";
import type { ISocialClient, SocialMetricsData } from "./types";

/**
 * Result of collecting metrics for a single account
 */
export interface AccountMetricsResult {
  accountId: string;
  platform: SocialPlatform;
  success: boolean;
  error?: string;
  metrics?: SocialMetricsData;
}

/**
 * Overall result of the metrics collection job
 */
export interface MetricsCollectionResult {
  totalAccounts: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
  results: AccountMetricsResult[];
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
}

/**
 * Options for the metrics collection job
 */
export interface MetricsCollectionOptions {
  /**
   * Maximum number of accounts to process in a single run.
   * Prevents timeout on large deployments.
   * @default 100
   */
  batchSize?: number;

  /**
   * Only collect metrics for accounts in these workspaces.
   * If not specified, collects for all workspaces.
   */
  workspaceIds?: string[];

  /**
   * Only collect metrics for these platforms.
   * If not specified, collects for all supported platforms.
   */
  platforms?: SocialPlatform[];
}

// Platforms that have implemented getMetrics()
const SUPPORTED_PLATFORMS: SocialPlatform[] = [
  "LINKEDIN",
  "INSTAGRAM",
  "FACEBOOK",
  "TWITTER",
  "YOUTUBE",
  "TIKTOK",
];

/**
 * Create a social client for the given platform
 */
function createSocialClient(
  platform: SocialPlatform,
  accessToken: string,
  organizationId?: string,
): ISocialClient | null {
  switch (platform) {
    case "LINKEDIN":
      return new LinkedInClient({
        accessToken,
        organizationUrn: organizationId
          ? `urn:li:organization:${organizationId}`
          : undefined,
      });
    case "INSTAGRAM":
      return new InstagramClient({ accessToken });
    case "FACEBOOK":
      return new FacebookClient({ accessToken });
    case "TWITTER":
      return new TwitterClient({ accessToken });
    case "YOUTUBE":
      return new YouTubeClient({ accessToken });
    case "TIKTOK":
      return new TikTokClient({ accessToken, accountId: organizationId });
    // Discord doesn't support account-level metrics
    default:
      return null;
  }
}

/**
 * Collect metrics for a single social account
 */
async function collectAccountMetrics(
  account: SocialAccount,
): Promise<AccountMetricsResult> {
  const { id: accountId, platform, accessTokenEncrypted } = account;

  // Decrypt the access token
  const accessToken = safeDecryptToken(accessTokenEncrypted);

  if (!accessToken) {
    return {
      accountId,
      platform,
      success: false,
      error: "Failed to decrypt access token",
    };
  }

  // Get organization ID from metadata for LinkedIn
  const organizationId = platform === "LINKEDIN"
    ? (account.metadata as { organizationId?: string; } | null)?.organizationId
    : undefined;

  // Create the appropriate client
  const client = createSocialClient(platform, accessToken, organizationId);

  if (!client) {
    return {
      accountId,
      platform,
      success: false,
      error: `Platform ${platform} not supported for metrics collection`,
    };
  }

  // Fetch metrics from the platform
  const { data: metrics, error } = await tryCatch(client.getMetrics());

  if (error) {
    return {
      accountId,
      platform,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  // Get today's date (normalized to start of day in UTC)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Calculate engagement rate as a decimal (e.g., 0.0523 for 5.23%)
  const engagementRateDecimal = metrics.engagementRate
    ? Math.min(metrics.engagementRate / 100, 9.9999) // Cap at max decimal(5,4) value
    : null;

  // Upsert the metrics (one record per account per day)
  const { error: upsertError } = await tryCatch(
    prisma.socialMetrics.upsert({
      where: {
        accountId_date: {
          accountId,
          date: today,
        },
      },
      update: {
        followers: metrics.followers,
        following: metrics.following,
        postsCount: metrics.postsCount,
        engagementRate: engagementRateDecimal,
        impressions: metrics.impressions ?? 0,
        reach: metrics.reach ?? 0,
        rawData: {
          period: metrics.period,
          collectedAt: new Date().toISOString(),
        },
        updatedAt: new Date(),
      },
      create: {
        accountId,
        date: today,
        followers: metrics.followers,
        following: metrics.following,
        postsCount: metrics.postsCount,
        engagementRate: engagementRateDecimal,
        impressions: metrics.impressions ?? 0,
        reach: metrics.reach ?? 0,
        rawData: {
          period: metrics.period,
          collectedAt: new Date().toISOString(),
        },
      },
    }),
  );

  if (upsertError) {
    return {
      accountId,
      platform,
      success: false,
      error: `Database error: ${
        upsertError instanceof Error ? upsertError.message : String(upsertError)
      }`,
      metrics,
    };
  }

  return {
    accountId,
    platform,
    success: true,
    metrics,
  };
}

/**
 * Collect metrics from all active social accounts
 *
 * @param options - Collection options
 * @returns Collection result with success/failure counts
 */
export async function collectPulseMetrics(
  options: MetricsCollectionOptions = {},
): Promise<MetricsCollectionResult> {
  const startedAt = new Date();
  const { batchSize = 100, workspaceIds, platforms } = options;

  // Build the query filter
  const platformFilter = platforms ?? SUPPORTED_PLATFORMS;

  // Fetch active accounts
  const { data: accounts, error: fetchError } = await tryCatch(
    prisma.socialAccount.findMany({
      where: {
        status: "ACTIVE",
        platform: { in: platformFilter },
        ...(workspaceIds && { workspaceId: { in: workspaceIds } }),
      },
      orderBy: { updatedAt: "asc" }, // Process oldest first
      take: batchSize,
    }),
  );

  if (fetchError || !accounts) {
    const completedAt = new Date();
    return {
      totalAccounts: 0,
      successCount: 0,
      failureCount: 0,
      skippedCount: 0,
      results: [],
      startedAt,
      completedAt,
      durationMs: completedAt.getTime() - startedAt.getTime(),
    };
  }

  // Process each account
  const results: AccountMetricsResult[] = [];
  let successCount = 0;
  let failureCount = 0;
  let skippedCount = 0;

  for (const account of accounts) {
    // Skip unsupported platforms
    if (!SUPPORTED_PLATFORMS.includes(account.platform)) {
      skippedCount++;
      continue;
    }

    const result = await collectAccountMetrics(account);
    results.push(result);

    if (result.success) {
      successCount++;
    } else {
      failureCount++;
      // Log the error but continue processing
      console.error(
        `[PulseMetrics] Failed to collect metrics for ${account.platform} account ${account.id}: ${result.error}`,
      );
    }
  }

  const completedAt = new Date();

  return {
    totalAccounts: accounts.length,
    successCount,
    failureCount,
    skippedCount,
    results,
    startedAt,
    completedAt,
    durationMs: completedAt.getTime() - startedAt.getTime(),
  };
}
