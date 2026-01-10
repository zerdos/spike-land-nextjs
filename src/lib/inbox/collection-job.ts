/**
 * Collection Job Orchestrator
 *
 * Orchestrates inbox collection across all connected social accounts.
 */

import type { SocialPlatform } from "@prisma/client";

import prisma from "@/lib/prisma";

import type {
  CollectableAccount,
  CollectionJobResult,
  CollectionResult,
  IPlatformCollector,
} from "./collector-types";
import { FacebookCollector } from "./collectors/facebook-collector";
import { InstagramCollector } from "./collectors/instagram-collector";
import { TwitterCollector } from "./collectors/twitter-collector";
import { upsertInboxItem } from "./inbox-manager";

/**
 * Map of platform to collector instances
 */
const collectors = new Map<SocialPlatform, IPlatformCollector>([
  ["TWITTER", new TwitterCollector() as IPlatformCollector],
  ["FACEBOOK", new FacebookCollector() as IPlatformCollector],
  ["INSTAGRAM", new InstagramCollector() as IPlatformCollector],
]);

/**
 * Get collector for a platform
 */
export function getCollector(platform: SocialPlatform): IPlatformCollector | undefined {
  return collectors.get(platform);
}

/**
 * Get all connected accounts for a workspace
 */
export async function getWorkspaceAccounts(
  workspaceId: string,
): Promise<CollectableAccount[]> {
  const accounts = await prisma.socialAccount.findMany({
    where: {
      workspaceId,
      status: "ACTIVE",
      accessTokenEncrypted: { not: "" },
    },
    select: {
      id: true,
      workspaceId: true,
      platform: true,
      accountId: true,
      accessTokenEncrypted: true,
      refreshTokenEncrypted: true,
      tokenExpiresAt: true,
    },
  });

  // Note: In production, you would decrypt tokens here
  // For now, we use the encrypted value as a placeholder
  return accounts
    .filter((acc) => acc.accessTokenEncrypted.length > 0)
    .map((acc) => ({
      id: acc.id,
      workspaceId: acc.workspaceId,
      platform: acc.platform,
      platformAccountId: acc.accountId,
      accessToken: acc.accessTokenEncrypted, // TODO: Decrypt token
      refreshToken: acc.refreshTokenEncrypted ?? undefined,
      tokenExpiresAt: acc.tokenExpiresAt ?? undefined,
    }));
}

/**
 * Process collection results and upsert inbox items
 */
async function processCollectionResult(
  result: CollectionResult,
  workspaceId: string,
  accountId: string,
): Promise<{ newCount: number; duplicateCount: number; }> {
  let newCount = 0;
  let duplicateCount = 0;

  for (const message of result.messages) {
    try {
      // Check if item already exists
      const existing = await prisma.inboxItem.findUnique({
        where: {
          workspaceId_platform_platformItemId: {
            workspaceId,
            platform: result.platform,
            platformItemId: message.platformItemId,
          },
        },
      });

      if (existing) {
        duplicateCount++;
        continue;
      }

      // Create new inbox item
      await upsertInboxItem({
        type: message.type,
        platform: result.platform,
        platformItemId: message.platformItemId,
        content: message.content,
        senderName: message.senderName,
        senderHandle: message.senderHandle,
        senderAvatarUrl: message.senderAvatarUrl,
        originalPostId: message.originalPostId,
        originalPostContent: message.originalPostContent,
        metadata: message.rawData,
        receivedAt: message.receivedAt,
        workspaceId,
        accountId,
      });

      newCount++;
    } catch (error) {
      // Log error but continue processing other messages
      console.error(`Error processing message ${message.platformItemId}:`, error);
    }
  }

  return { newCount, duplicateCount };
}

/**
 * Collect from a single account
 */
export async function collectFromAccount(
  account: CollectableAccount,
): Promise<CollectionJobResult> {
  const startedAt = new Date();
  const collector = getCollector(account.platform);

  if (!collector) {
    return {
      status: "FAILED",
      platform: account.platform,
      accountId: account.id,
      messagesCollected: 0,
      newMessages: 0,
      duplicatesSkipped: 0,
      error: `No collector available for platform ${account.platform}`,
      startedAt,
      completedAt: new Date(),
    };
  }

  try {
    // Check if we can collect
    const canCollect = await collector.canCollect(account.accessToken);
    if (!canCollect) {
      return {
        status: "FAILED",
        platform: account.platform,
        accountId: account.id,
        messagesCollected: 0,
        newMessages: 0,
        duplicatesSkipped: 0,
        error: "Cannot collect from account - invalid or expired token",
        startedAt,
        completedAt: new Date(),
      };
    }

    let totalMessages = 0;
    let totalNew = 0;
    let totalDuplicates = 0;

    // Collect mentions
    const mentionsResult = await collector.collectMentions(
      account.accessToken,
      account.platformAccountId,
    );
    const mentionsProcessed = await processCollectionResult(
      mentionsResult,
      account.workspaceId,
      account.id,
    );
    totalMessages += mentionsResult.messages.length;
    totalNew += mentionsProcessed.newCount;
    totalDuplicates += mentionsProcessed.duplicateCount;

    // Collect DMs
    const dmsResult = await collector.collectDirectMessages(
      account.accessToken,
      account.platformAccountId,
    );
    const dmsProcessed = await processCollectionResult(
      dmsResult,
      account.workspaceId,
      account.id,
    );
    totalMessages += dmsResult.messages.length;
    totalNew += dmsProcessed.newCount;
    totalDuplicates += dmsProcessed.duplicateCount;

    // Collect comments
    const commentsResult = await collector.collectComments(
      account.accessToken,
      account.platformAccountId,
    );
    const commentsProcessed = await processCollectionResult(
      commentsResult,
      account.workspaceId,
      account.id,
    );
    totalMessages += commentsResult.messages.length;
    totalNew += commentsProcessed.newCount;
    totalDuplicates += commentsProcessed.duplicateCount;

    return {
      status: "COMPLETED",
      platform: account.platform,
      accountId: account.id,
      messagesCollected: totalMessages,
      newMessages: totalNew,
      duplicatesSkipped: totalDuplicates,
      startedAt,
      completedAt: new Date(),
      rateLimitStatus: collector.getRateLimitStatus() ?? undefined,
    };
  } catch (error) {
    const isRateLimited = error instanceof Error && error.message.includes("Rate limit");

    return {
      status: isRateLimited ? "RATE_LIMITED" : "FAILED",
      platform: account.platform,
      accountId: account.id,
      messagesCollected: 0,
      newMessages: 0,
      duplicatesSkipped: 0,
      error: error instanceof Error ? error.message : "Unknown error",
      startedAt,
      completedAt: new Date(),
      rateLimitStatus: collector.getRateLimitStatus() ?? undefined,
    };
  }
}

/**
 * Run collection job for a workspace
 */
export async function runWorkspaceCollectionJob(
  workspaceId: string,
): Promise<CollectionJobResult[]> {
  const accounts = await getWorkspaceAccounts(workspaceId);
  const results: CollectionJobResult[] = [];

  for (const account of accounts) {
    const result = await collectFromAccount(account);
    results.push(result);

    // If rate limited, pause before continuing with next account
    if (result.status === "RATE_LIMITED" && result.rateLimitStatus) {
      const waitTime = result.rateLimitStatus.resetAt.getTime() - Date.now();
      if (waitTime > 0 && waitTime < 60000) {
        // Wait up to 1 minute
        await new Promise((resolve) => setTimeout(resolve, waitTime + 1000));
      }
    }
  }

  return results;
}

/**
 * Run collection for all workspaces (for scheduled jobs)
 */
export async function runGlobalCollectionJob(): Promise<
  Map<string, CollectionJobResult[]>
> {
  // Get all workspaces with active social accounts
  const workspaces = await prisma.workspace.findMany({
    where: {
      socialAccounts: {
        some: {
          status: "ACTIVE",
          accessTokenEncrypted: { not: "" },
        },
      },
    },
    select: { id: true },
  });

  const results = new Map<string, CollectionJobResult[]>();

  for (const workspace of workspaces) {
    const workspaceResults = await runWorkspaceCollectionJob(workspace.id);
    results.set(workspace.id, workspaceResults);
  }

  return results;
}

/**
 * Get collection summary for a workspace
 */
export interface CollectionSummary {
  workspaceId: string;
  totalAccounts: number;
  successfulCollections: number;
  failedCollections: number;
  rateLimitedCollections: number;
  totalMessagesCollected: number;
  totalNewMessages: number;
  totalDuplicatesSkipped: number;
}

export function summarizeCollectionResults(
  workspaceId: string,
  results: CollectionJobResult[],
): CollectionSummary {
  return {
    workspaceId,
    totalAccounts: results.length,
    successfulCollections: results.filter((r) => r.status === "COMPLETED").length,
    failedCollections: results.filter((r) => r.status === "FAILED").length,
    rateLimitedCollections: results.filter((r) => r.status === "RATE_LIMITED")
      .length,
    totalMessagesCollected: results.reduce((sum, r) => sum + r.messagesCollected, 0),
    totalNewMessages: results.reduce((sum, r) => sum + r.newMessages, 0),
    totalDuplicatesSkipped: results.reduce((sum, r) => sum + r.duplicatesSkipped, 0),
  };
}
